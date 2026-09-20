const bcrypt = require("bcryptjs");
const User = require("../models/User");
const PatientProfile = require("../models/PatientProfile");
const MedicalReport = require("../models/MedicalReport");

exports.getAllUsers = async (req, res) => {
  const users = await User.find().select("-password");
  res.json({ success: true, data: users });
};

/**
 * Admin-Only User Creation Endpoint
 * Allows authenticated administrators to provision accounts with specific roles (doctor, admin, patient).
 * Enforces role whitelisting and password complexity.
 */
exports.createUser = async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({
        success: false,
        message: "name, email, password, and role are required",
      });
    }

    const allowedRoles = ["doctor", "admin", "patient"];
    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        success: false,
        message: `Invalid role. Allowed roles: ${allowedRoles.join(", ")}`,
      });
    }

    if (password.length < 8) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 8 characters long",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already exists",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = await User.create({
      name: String(name).trim(),
      email: normalizedEmail,
      password: hashedPassword,
      phone: phone ? String(phone).trim() : undefined,
      role,
    });

    const userObj = newUser.toObject ? newUser.toObject() : { ...newUser };
    delete userObj.password;

    res.status(201).json({
      success: true,
      message: `User created successfully with role: ${role}`,
      data: userObj,
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Server error while creating user: " + error.message,
    });
  }
};

exports.deleteUser = async (req, res) => {
  try {
    const { userId } = req.params;

    if (req.user.id === userId) {
      return res.status(400).json({
        success: false,
        message: "You cannot delete your own account from the admin panel.",
      });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    await User.findByIdAndDelete(userId);

    if (user.role === "patient") {
      await PatientProfile.findOneAndDelete({ userId });
      await MedicalReport.deleteMany({ patientId: userId });
    }

    res.status(200).json({
      success: true,
      message: "User account deleted successfully",
    });
  } catch (error) {
    res.status(500).json({ success: false, message: "Server error while deleting user" });
  }
};