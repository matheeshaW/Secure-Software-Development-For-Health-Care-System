const Doctor = require("../models/Doctor");

// Create a new doctor profile
exports.createDoctorProfile = async (req, res) => {
  try {
    const {
      name,
      specialization,
      experience,
      hospital,
      licenseNumber,
      phoneNumber,
    } = req.body;

    // validate required fields
    if (
      !name ||
      !specialization ||
      experience === null ||
      experience === undefined ||
      typeof experience !== "number" ||
      !hospital ||
      !licenseNumber ||
      !phoneNumber
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields.",
      });
    }

    // check license existence
    const existingDoctor = await Doctor.findOne({ licenseNumber });
    if (existingDoctor) {
      return res.status(400).json({
        success: false,
        message: "Doctor with this license number already exists",
      });
    }

    // check doctor profile existence (only active ones)
    const doctorExists = await Doctor.findOne({
      userId: req.userId,
      isActive: true, // Only check ACTIVE profiles
    });
    if (doctorExists) {
      return res.status(400).json({
        success: false,
        message: "Doctor profile already exists for this user.",
      });
    }

    // create new doctor document
    const doctor = new Doctor({
      userId: req.userId,
      name,
      specialization,
      experience,
      hospital,
      licenseNumber,
      phoneNumber,
    });

    await doctor.save();

    res.status(201).json({
      success: true,
      message:
        "Doctor profile created successfully. Awaiting admin verification.",
    });
  } catch (error) {
    console.error("Error creating doctor profile:", error);
    res.status(500).json({
      success: false,
      message: "Server error while creating doctor profile.",
    });
  }
};

// Get doctor profile by ID
exports.getDoctorProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findById(id);

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    res.status(200).json({
      success: true,
      data: doctor,
      message: "Doctor profile retrieved successfully.",
    });
  } catch (error) {
    console.error("Error fetching doctor profile:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching doctor profile.",
    });
  }
};

// Get doctor profile of current logged-in doctor
exports.getMyprofile = async (req, res) => {
  try {
    const doctor = await Doctor.findOne({ userId: req.userId, isActive: true });

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor profile not found. Please create your profile.",
      });
    }

    res.status(200).json({
      success: true,
      data: doctor,
      message: "Your profile retrieved successfully.",
    });
  } catch (error) {
    console.error("Error fetching my profile:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching profile.",
    });
  }
};

// Update doctor profile
exports.updateDoctorProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, experience, hospital, phoneNumber } = req.body;

    // find doctor
    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    // authorization check
    if (doctor.userId !== req.userId && req.userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. You can only update your own profile.",
      });
    }

    // update allowed fields
    if (name) doctor.name = name;
    if (experience !== undefined) doctor.experience = experience;
    if (hospital) doctor.hospital = hospital;
    if (phoneNumber) doctor.phoneNumber = phoneNumber;

    await doctor.save();

    res.status(200).json({
      success: true,
      data: doctor,
      message: "Doctor profile updated successfully.",
    });
  } catch (error) {
    console.error("Error updating doctor profile:", error);
    res.status(500).json({
      success: false,
      message: "Server error while updating doctor profile.",
    });
  }
};

// Search doctors by specialization (REMEDIATED: Defends against NoSQL Injection - CWE-943 / OWASP A03:2021)
exports.searchDoctors = async (req, res) => {
  try {
    // 1. Comprehensive NoSQL Injection Defense: Scan all query keys and values
    for (const [key, val] of Object.entries(req.query)) {
      if (key.includes("$") || key.includes("[") || key.includes("]")) {
        return res.status(400).json({
          success: false,
          message: "Query parameter contains disallowed operator characters.",
        });
      }
      if (typeof val === "object" && val !== null) {
        return res.status(400).json({
          success: false,
          message: "Nested object query parameters are not permitted.",
        });
      }
    }

    const { specialization, verified } = req.query;

    const filter = { isActive: true };

    if (specialization !== undefined && specialization !== null) {
      if (typeof specialization !== "string") {
        return res.status(400).json({
          success: false,
          message: "Invalid specialization parameter. Expected a string.",
        });
      }

      const trimmedSpecialization = specialization.trim();
      if (
        trimmedSpecialization.startsWith("$") ||
        /[\$\{\}]/.test(trimmedSpecialization)
      ) {
        return res.status(400).json({
          success: false,
          message:
            "Specialization query contains disallowed operator characters.",
        });
      }

      if (trimmedSpecialization.length > 0) {
        filter.specialization = trimmedSpecialization;
      }
    }

    if (verified === "true") {
      filter.verified = true;
    } else if (verified === "false") {
      filter.verified = false;
    } else if (verified === "all") {
      // Don't add verified filter - show ALL doctors
    } else {
      filter.verified = true;
    }

    const doctors = await Doctor.find(filter).sort({ rating: -1 });

    res.status(200).json({
      success: true,
      data: doctors,
      count: doctors.length,
      message: "Doctors retrieved successfully.",
    });
  } catch (error) {
    console.error("Error searching doctors:", error);
    res.status(500).json({
      success: false,
      message: "Server error while searching doctors.",
    });
  }
};

// Get all doctors (Admin only)
exports.getAllDoctors = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required",
      });
    }

    // By default show only active
    const { includeDeleted } = req.query;
    const filter = includeDeleted === "true" ? {} : { isActive: true };

    const doctors = await Doctor.find(filter).sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: doctors,
      count: doctors.length,
      message: "All doctors retrieved successfully.",
    });
  } catch (error) {
    console.error("Error fetching all doctors:", error);
    res.status(500).json({
      success: false,
      message: "Server error while fetching doctors",
    });
  }
};

// Verify doctor (Admin only)
exports.verifyDoctor = async (req, res) => {
  try {
    if (req.userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Admin access required.",
      });
    }

    const { id } = req.params;

    const doctor = await Doctor.findByIdAndUpdate(
      id,
      { verified: true },
      { new: true },
    );

    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found",
      });
    }

    res.status(200).json({
      success: true,
      data: doctor,
      message: "Doctor verified successfully.",
    });
  } catch (error) {
    console.error("Error verifying doctor:", error);
    res.status(500).json({
      success: false,
      message: "Server error while verifying doctor.",
    });
  }
};

// soft delete doctor account
exports.deleteDoctorProfile = async (req, res) => {
  try {
    const { id } = req.params;

    const doctor = await Doctor.findById(id);
    if (!doctor) {
      return res.status(404).json({
        success: false,
        message: "Doctor not found.",
      });
    }

    // authorization check
    if (doctor.userId !== req.userId && req.userRole !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Unauthorized. You can only delete your own profile.",
      });
    }

    // soft delete
    doctor.isActive = false;
    await doctor.save();

    res.status(200).json({
      success: true,
      message: "Doctor profile deleted successfully.",
    });
  } catch (error) {
    console.error("Error deleting doctor profile.", error);
    res.status(500).json({
      success: false,
      message: "Server error while deleting doctor profile.",
    });
  }
};

// Register new doctor (called from frontend during user registration)
// Does NOT require authentication - creates initial doctor profile waiting for admin verification
exports.registerDoctor = async (req, res) => {
  try {
    const {
      userId,
      name,
      specialization,
      experience,
      hospital,
      licenseNumber,
      phoneNumber,
    } = req.body;

    // Validate required fields
    if (
      !userId ||
      !name ||
      !specialization ||
      !experience ||
      !hospital ||
      !licenseNumber ||
      !phoneNumber
    ) {
      return res.status(400).json({
        success: false,
        message: "Please provide all required fields.",
      });
    }

    // Check if experience is a number
    if (typeof experience !== "number") {
      return res.status(400).json({
        success: false,
        message: "Experience must be a number.",
      });
    }

    // Check if doctor profile for this user already exists
    const existingDoctor = await Doctor.findOne({ userId });
    if (existingDoctor && existingDoctor.isActive) {
      return res.status(400).json({
        success: false,
        message: "Doctor profile already exists for this user.",
      });
    }

    // Check if license number is unique
    const licenseDuplicate = await Doctor.findOne({ licenseNumber });
    if (licenseDuplicate && licenseDuplicate.isActive) {
      return res.status(400).json({
        success: false,
        message: "Doctor with this license number already exists.",
      });
    }

    // Create new doctor profile (pending verification)
    const doctor = new Doctor({
      userId,
      name,
      specialization,
      experience,
      hospital,
      licenseNumber,
      phoneNumber,
      verified: false, // Awaiting admin verification
      isActive: true,
    });

    await doctor.save();

    res.status(201).json({
      success: true,
      message:
        "Doctor profile registered successfully. Awaiting admin verification.",
      data: doctor,
    });
  } catch (error) {
    console.error("Error registering doctor:", error);
    res.status(500).json({
      success: false,
      message: "Server error while registering doctor profile.",
    });
  }
};
