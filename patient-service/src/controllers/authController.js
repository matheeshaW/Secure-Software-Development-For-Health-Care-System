const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const { OAuth2Client } = require("google-auth-library");

const googleClient = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || "http://localhost:5173/auth/google/callback"
);

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

// GOOGLE OAUTH 2.0 / OPENID CONNECT LOGIN & REGISTRATION
exports.googleAuth = async (req, res) => {
  try {
    const { credential, code } = req.body;

    if (!credential && !code) {
      return res.status(400).json({
        success: false,
        message: "Missing Google authorization credential or code."
      });
    }

    let payload;

    // Flow 1: Direct OpenID Connect (OIDC) ID Token Verification
    if (credential) {
      try {
        const ticket = await googleClient.verifyIdToken({
          idToken: credential,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      } catch (verifyErr) {
        return res.status(401).json({
          success: false,
          message: "Invalid or unverified Google ID Token: " + verifyErr.message
        });
      }
    } else if (code) {
      // Flow 2: OAuth 2.0 Authorization Code Grant Exchange
      try {
        const { tokens } = await googleClient.getToken(code);
        const ticket = await googleClient.verifyIdToken({
          idToken: tokens.id_token,
          audience: process.env.GOOGLE_CLIENT_ID,
        });
        payload = ticket.getPayload();
      } catch (tokenErr) {
        return res.status(401).json({
          success: false,
          message: "Failed to exchange Google authorization code: " + tokenErr.message
        });
      }
    }

    if (!payload || !payload.email) {
      return res.status(400).json({
        success: false,
        message: "Google authentication payload missing email address."
      });
    }

    // Enforce email verification by Google
    if (!payload.email_verified) {
      return res.status(403).json({
        success: false,
        message: "Google email is not verified. Access denied."
      });
    }

    const { email, name, sub, picture } = payload;
    const normalizedEmail = email.toLowerCase();

    // Check if user already exists
    let user = await User.findOne({ email: normalizedEmail });

    if (user) {
      if (!user.googleId) {
        user.googleId = sub;
        if (!user.avatar && picture) user.avatar = picture;
        await user.save();
      }
    } else {
      // Just-in-Time (JIT) provisioning for new Google patient
      const randomPassword = crypto.randomBytes(32).toString("hex");
      const hashedPassword = await bcrypt.hash(randomPassword, 10);

      user = await User.create({
        name: name || normalizedEmail.split("@")[0],
        email: normalizedEmail,
        password: hashedPassword,
        role: "patient",
        googleId: sub,
        authProvider: "google",
        avatar: picture || null,
      });
    }

    // Issue platform JWT
    const token = jwt.sign(
      { id: user._id, role: user.role, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: "1d" }
    );

    const sanitizedUser = {
      _id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      authProvider: user.authProvider || "google",
    };

    return res.status(200).json({
      success: true,
      message: "Google authentication successful",
      token,
      user: sanitizedUser,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      message: "Server error during Google authentication: " + err.message
    });
  }
};

// GENERATE GOOGLE OAUTH 2.0 AUTHORIZATION URL WITH CSRF STATE
exports.getGoogleAuthUrl = async (req, res) => {
  try {
    const state = crypto.randomBytes(16).toString("hex");
    const scopes = [
      "openid",
      "https://www.googleapis.com/auth/userinfo.email",
      "https://www.googleapis.com/auth/userinfo.profile",
    ];

    const authUrl = googleClient.generateAuthUrl({
      access_type: "offline",
      scope: scopes,
      include_granted_scopes: true,
      state: state,
    });

    res.status(200).json({
      success: true,
      url: authUrl,
      state: state,
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: "Failed to generate Google OAuth URL: " + err.message
    });
  }
};