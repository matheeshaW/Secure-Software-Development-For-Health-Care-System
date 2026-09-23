const MedicalReport = require("../models/MedicalReport");
const cloudinary = require("../config/cloudinary");

// Upload report
exports.uploadReport = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: "File is required" });
    }

    const { name, category, notes } = req.body;

    const report = await MedicalReport.create({
      patientId: req.user.id,
      name: name?.trim() || req.file.originalname,
      fileUrl: req.file.path, // Cloudinary URL
      publicId: req.file.filename, // Cloudinary ID
      originalName: req.file.originalname,
      fileType: req.file.mimetype,
      sizeBytes: req.file.size,
      category,
      notes,
    });

    res.json({
      success: true,
      data: report,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get reports
exports.getReports = async (req, res) => {
  try {
    const reports = await MedicalReport.find({
      patientId: req.user.id,
    });

    res.json({
      success: true,
      data: reports,
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get reports for a specific patient (enforcing strict object-level authorization)
exports.getPatientReports = async (req, res) => {
  try {
    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({
        success: false,
        message: "Patient ID is required",
      });
    }

    //  OBJECT-LEVEL AUTHORIZATION CHECK (Fix for V3 BOLA/IDOR)
    // If requester is a patient, they are strictly restricted to their own records
    if (req.user.role === "patient" && req.user.id !== patientId) {
      return res.status(403).json({
        success: false,
        message:
          "Access denied. Patients can only access their own medical reports.",
      });
    }

    // Only allow legitimate medical roles (patient, doctor, admin)
    const authorizedRoles = ["patient", "doctor", "admin"];
    if (!authorizedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: "Access denied. Unauthorized role.",
      });
    }

    const reports = await MedicalReport.find({
      patientId: patientId,
    });

    res.json({
      success: true,
      data: reports,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message,
    });
  }
};

// Delete report

// DELETE report
exports.deleteReport = async (req, res) => {
  try {
    const report = await MedicalReport.findById(req.params.id);

    if (!report) {
      return res.status(404).json({ message: "Report not found" });
    }

    // Security: ensure owner
    if (report.patientId.toString() !== req.user.id) {
      return res.status(403).json({ message: "Unauthorized" });
    }

    // Delete from Cloudinary
    await cloudinary.uploader.destroy(report.publicId);

    // Delete from DB
    await report.deleteOne();

    res.json({
      success: true,
      message: "Report deleted",
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
