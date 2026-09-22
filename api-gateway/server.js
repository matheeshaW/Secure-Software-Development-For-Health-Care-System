const express = require("express");
const { createProxyMiddleware } = require("http-proxy-middleware");
const jwt = require("jsonwebtoken");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

dotenv.config();

const app = express();

/* ================= SECURITY HEADERS (V8.2 - CWE-693) ================= */
app.use(helmet());

/* ================= STRICT CORS POLICY (V8.1 - CWE-942) ================= */
const allowedOrigins = [
  process.env.FRONTEND_URL || "http://localhost:5173",
  "http://localhost:3000",
];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server)
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(null, false); // Reject unauthorized origin
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-user"],
  }),
);

/* ================= RATE LIMITING (V9 - CWE-770) ================= */
// Global limiter: 200 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many requests from this IP, please try again after 15 minutes.",
  },
});
app.use(globalLimiter);

// Strict Auth limiter: 15 requests per 15 minutes per IP (mitigates credential stuffing and brute force)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 15,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: "Too many authentication attempts, please try again after 15 minutes.",
  },
});
app.use("/api/auth", authLimiter);

const requiredEnvVars = [
  "PATIENT_SERVICE_URL",
  "PAYMENT_SERVICE_URL",
  "TELEMEDICINE_SERVICE_URL",
  "APPOINTMENT_SERVICE_URL",
  "DOCTOR_SERVICE_URL",
  "NOTIFICATION_SERVICE_URL",
  "JWT_SECRET",
  "PORT",
];

const missingVars = requiredEnvVars.filter((varName) => !process.env[varName]);

if (missingVars.length > 0) {
  console.error(
    `[ERROR] FATAL: Required environment variables are missing: ${missingVars.join(", ")}`,
  );
  process.exit(1);
}

/* ================= AUTH MIDDLEWARE (V8.3 - CWE-598/CWE-200) ================= */
const authenticate = (req, res, next) => {
  // Security Fix (V8.3): Disallow sensitive authentication tokens in URL query strings
  if (req.query?.token) {
    return res.status(401).json({
      message:
        "Insecure token transport: authentication tokens in URL query parameters are rejected. Pass via Authorization header.",
    });
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  if (!token) {
    return res.status(401).json({ message: "No token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.headers["x-user"] = JSON.stringify(decoded); // pass to services
    next();
  } catch {
    return res.status(403).json({ message: "Invalid token" });
  }
};

/* ================= ROUTES ================= */

// Public (no auth)
app.use(
  "/api/auth",
  createProxyMiddleware({
    target: process.env.PATIENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/api/auth${path}`,
    onError: (err, req, res) => {
      console.error(
        "Gateway Error: Patient Service is unreachable.",
        err.message,
      );
      res.status(502).json({
        success: false,
        error: "Patient Service is currently offline.",
      });
    },
  }),
);

// Protected (with auth)
app.use(
  "/api/patient",
  authenticate,
  createProxyMiddleware({
    target: process.env.PATIENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/api/patient${path}`,
    onError: (err, req, res) => {
      console.error(
        "Gateway Error: Patient Service is unreachable.",
        err.message,
      );
      res.status(502).json({
        success: false,
        error: "Patient Service is currently offline.",
      });
    },
  }),
);

app.use(
  "/api/admin",
  authenticate,
  createProxyMiddleware({
    target: process.env.PATIENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/api/admin${path}`,
    onError: (err, req, res) => {
      console.error(
        "Gateway Error: Patient Service is unreachable.",
        err.message,
      );
      res.status(502).json({
        success: false,
        error: "Patient Service is currently offline.",
      });
    },
  }),
);

app.use(
  "/api/user",
  authenticate,
  createProxyMiddleware({
    target: process.env.PATIENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/api/user${path}`,
    onError: (err, req, res) => {
      console.error(
        "Gateway Error: Patient Service is unreachable.",
        err.message,
      );
      res.status(502).json({
        success: false,
        error: "Patient Service is currently offline.",
      });
    },
  }),
);

// Payment Service Route
app.use(
  "/api/payment",
  authenticate,
  createProxyMiddleware({
    target: process.env.PAYMENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/api/payment${path}`,
    onError: (err, req, res) => {
      console.error(
        "Gateway Error: Payment Service is unreachable.",
        err.message,
      );
      res.status(502).json({
        success: false,
        error: "Payment Service is currently offline.",
      });
    },
  }),
);

// Telemedicine Service Route
app.use(
  "/api/telemedicine",
  authenticate,
  createProxyMiddleware({
    target: process.env.TELEMEDICINE_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/api/telemedicine${path}`,
    onError: (err, req, res) => {
      console.error(
        "Gateway Error: Telemedicine Service unreachable.",
        err.message,
      );
      res
        .status(502)
        .json({ success: false, error: "Telemedicine Service offline." });
    },
  }),
);

// Reports Service Route
app.use("/api/reports", authenticate, createProxyMiddleware({
  target: process.env.PATIENT_SERVICE_URL,
  changeOrigin: true,
  pathRewrite: (path) => `/api/reports${path}`
}));
app.use(
  "/api/reports",
  authenticate,
  createProxyMiddleware({
    target: process.env.PATIENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/api/reports${path}`,
  }),
);

app.use(
  "/api/appointments",
  authenticate,
  createProxyMiddleware({
    target: process.env.APPOINTMENT_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/api/appointments${path}`,
  }),
);

// Doctor Service - Public Route (no auth required)
app.use(
  "/api/doctors/register",
  createProxyMiddleware({
    target: process.env.DOCTOR_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/api/doctors/register${path}`,
    onError: (err, req, res) => {
      console.error(
        "Gateway Error: Doctor Service is unreachable.",
        err.message,
      );
      res.status(502).json({
        success: false,
        error: "Doctor Service is currently offline.",
      });
    },
  }),
);

// Doctor Service Routes (protected)
app.use(
  "/api/doctors",
  authenticate,
  createProxyMiddleware({
    target: process.env.DOCTOR_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/api/doctors${path}`,
    onError: (err, req, res) => {
      console.error(
        "Gateway Error: Doctor Service is unreachable.",
        err.message,
      );
      res.status(502).json({
        success: false,
        error: "Doctor Service is currently offline.",
      });
    },
  }),
);

// Availability Routes
app.use(
  "/api/availability",
  authenticate,
  createProxyMiddleware({
    target: process.env.DOCTOR_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/api/availability${path}`,
    onError: (err, req, res) => {
      console.error(
        "Gateway Error: Doctor Service is unreachable.",
        err.message,
      );
      res.status(502).json({
        success: false,
        error: "Doctor Service is currently offline.",
      });
    },
  }),
);

// Prescription Routes
app.use(
  "/api/prescriptions",
  authenticate,
  createProxyMiddleware({
    target: process.env.DOCTOR_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/api/prescriptions${path}`,
    onError: (err, req, res) => {
      console.error(
        "Gateway Error: Doctor Service is unreachable.",
        err.message,
      );
      res.status(502).json({
        success: false,
        error: "Doctor Service is currently offline.",
      });
    },
  }),
);

// Notification Routes
app.use(
  "/api/notifications",
  authenticate,
  createProxyMiddleware({
    target: process.env.NOTIFICATION_SERVICE_URL,
    changeOrigin: true,
    pathRewrite: (path) => `/api/notifications${path}`,
    onError: (err, req, res) => {
      console.error(
        "Gateway Error: Notification Service is unreachable.",
        err.message,
      );
      res.status(502).json({
        success: false,
        error: "Notification Service is currently offline.",
      });
    },
  }),
);

/* ================= START ================= */
app.listen(process.env.PORT, () => {
  console.log(`API Gateway running on port ${process.env.PORT}`);
});
