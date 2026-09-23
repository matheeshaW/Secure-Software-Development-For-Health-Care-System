const crypto = require("crypto");
const Payment = require("../models/Payment");
const { sendNotification } = require("../services/rabbitmqService");

// 1. STRIPE GATEWAY
exports.createCheckoutSession = async (req, res) => {
  try {
    const { appointmentId } = req.body;
    const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "lkr",
            product_data: { name: "Doctor Consultation Fee" },
            unit_amount: 250000,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      metadata: { appointmentId },
      success_url: `http://localhost:5173/appointment/my?payment=success&appointmentId=${appointmentId}`,
      cancel_url: "http://localhost:5173/appointment/my?payment=cancelled",
    });
    res.json({ url: session.url });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

// 2. PROCESS PAYMENT (Triggers RabbitMQ)
exports.processPayment = async (req, res) => {
  try {
    const { appointmentId, patientId, patientEmail, amount, doctorId } =
      req.body;
    const transactionId =
      "TXN_" + crypto.randomBytes(6).toString("hex").toUpperCase();

    const newPayment = new Payment({
      appointmentId,
      patientId,
      doctorId: doctorId || "DOC_PENDING",
      patientEmail,
      amount,
      status: "success",
      transactionId,
    });

    await newPayment.save();

    // --- NEW: SERVER-TO-SERVER COMMUNICATION ---
    // Tell your teammate's Appointment Service (Port 5000) that the payment is done!
    try {
      const appointmentServiceBaseUrl =
        process.env.APPOINTMENT_SERVICE_UPDATE_URL || "http://localhost:5000";
      const appointmentResponse = await fetch(
        `${appointmentServiceBaseUrl}/api/appointments/${appointmentId}/pay`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            // Forward the patient's JWT token so the Appointment Service accepts the request!
            Authorization: req.headers.authorization,
          },
        },
      );

      if (!appointmentResponse.ok) {
        console.error("⚠️ Failed to update Appointment Service status");
      } else {
        console.log(
          "✅ Successfully notified Appointment Service to mark as Paid!",
        );
      }
    } catch (fetchErr) {
      console.error(
        "⚠️ Could not connect to Appointment Service:",
        fetchErr.message,
      );
    }
    // -------------------------------------------

    // Trigger the Notification Service
    try {
      await sendNotification({
        patientEmail: patientEmail,
        message: `Success! Payment of Rs. ${amount} received. TXN: ${transactionId}.`,
      });
    } catch (rabbitErr) {
      console.error("RabbitMQ Notification failed");
    }

    res.status(200).json({ success: true, transactionId });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
};

// 3. GET HISTORY (REMEDIATED: Enforces Object-Level Authorization - CWE-639 / OWASP API1:2023)
exports.getPaymentHistory = async (req, res) => {
  try {
    // Support both :patientId and :id parameter naming
    const targetId = req.params.patientId || req.params.id;

    // Resolve requester identity: Gateway forwards authenticated user in 'x-user' header
    let requester = null;
    if (req.headers["x-user"]) {
      try {
        requester =
          typeof req.headers["x-user"] === "string"
            ? JSON.parse(req.headers["x-user"])
            : req.headers["x-user"];
      } catch (e) {
        requester = null;
      }
    } else if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      // Defense-in-depth: decode token payload if called internally without gateway header
      try {
        const tokenParts = req.headers.authorization.split(" ")[1].split(".");
        if (tokenParts.length === 3) {
          requester = JSON.parse(
            Buffer.from(tokenParts[1], "base64").toString("utf8"),
          );
        }
      } catch (e) {
        requester = null;
      }
    }

    if (!requester) {
      return res.status(401).json({
        success: false,
        message: "Authentication required to access payment records.",
      });
    }

    // BOLA Defense: Patients can only inspect their own payment records
    if (requester.role === "patient" && requester.id !== targetId) {
      return res.status(403).json({
        success: false,
        message: "Access denied. You can only view your own payment history.",
      });
    }

    // Use $or to find the ID in either column
    const payments = await Payment.find({
      $or: [{ patientId: targetId }, { doctorId: targetId }],
    }).sort({ createdAt: -1 });

    return res.status(200).json({ success: true, data: payments });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
};
