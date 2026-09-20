const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

// Helper function to sanitize user object and strip sensitive password hash
const sanitizeUser = (userDoc) => {
  const user = userDoc.toObject ? userDoc.toObject() : { ...userDoc };
  const { password, ...safeUser } = user;
  return safeUser;
};

// Dummy bcrypt hash used to normalize timing during failed email lookups
const TIMING_NORMALIZATION_HASH = "$2a$10$wT8mQyFv5vQW6lXgD5iVdeL8gXQeW1zF9mYqV7uT9aP0sR2dF4k6e";

// REGISTER (Public Self-Registration - Strictly Enforces 'patient' Role)
exports.register = async (req, res) => {
  try {
    // Whitelist allowed fields from req.body; completely ignore any supplied 'role'
    const { name, email, password, phone } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required"
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long"
      });
    }

    // Security Control (CWE-269 / CWE-915): Prevent Privilege Escalation via Mass Assignment
    // Public self-registration is strictly restricted to 'patient'.
    // Elevated roles (doctor, admin) must be provisioned via admin endpoints.
    const role = "patient";

    const normalizedEmail = String(email).trim().toLowerCase();
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone ? String(phone).trim() : undefined,
      role,
    });

    // Security Control (CWE-200): Strip password hash from response
    res.status(201).json({
      success: true,
      message: "Registration successful",
      user: sanitizeUser(user)
    });
  } catch (err) {
    // Handle duplicate email error
    if (err.code === 11000 && (err.keyPattern?.email || err.keyValue?.email)) {
      return res.status(400).json({ success: false, message: "Email already exists" });
    }
    // Handle validation errors
    if (err.name === "ValidationError") {
      const messages = Object.values(err.errors).map((e) => e.message);
      return res.status(400).json({ success: false, message: messages.join(", ") });
    }
    res.status(500).json({ success: false, message: "Server error: " + err.message });
  }
};

// LOGIN (Hardened against User Enumeration & Password Hash Leak)
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: "Email and password are required"
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await User.findOne({ email: normalizedEmail });

    // Security Control (CWE-204): Mitigate User Enumeration Timing Oracle
    if (!user) {
      // Execute dummy bcrypt comparison to neutralize response timing discrepancy
      await bcrypt.compare(password, TIMING_NORMALIZATION_HASH);
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password"
      });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    // Security Control (CWE-200): Strip password hash from response
    res.status(200).json({
      success: true,
      token,
      user: sanitizeUser(user),
    });
  } catch (err) {
    res.status(500).json({ success: false, message: "Server error: " + err.message });
  }
};