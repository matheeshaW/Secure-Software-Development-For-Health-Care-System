/**
 * Baseline Security Proof-of-Concept (PoC) Exploit Test Suite (PRE-FIX)
 * Demonstrates Vulnerabilities V8 & V9 prior to security remediation:
 *  - V8.1: Permissive CORS (CWE-942)
 *  - V8.2: Missing Security Headers / No Helmet (CWE-693)
 *  - V8.3: Insecure JWT Token Transport in URL Query Parameter (CWE-598)
 *  - V9: Missing Rate Limiting & Brute-Force Susceptibility (CWE-770)
 *
 * Module: SE4030 - Secure Software Development (SLIIT)
 * Author: Matheesha Weerakoon (Member 1 - API Gateway & OAuth Lead)
 */

const http = require("http");
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");

const TEST_PORT = process.env.PORT || 5099;
const JWT_SECRET = "supersecretkey_unpatched_baseline";

function createVulnerableGateway() {
  const app = express();
  app.use(express.json());

  // VULNERABILITY V8.1: Permissive CORS allowing any origin
  app.use(cors());

  // VULNERABILITY V8.2: Missing Helmet security headers (none configured)

  // VULNERABILITY V9: No rate limiting configured on any route

  // Mock public login endpoint
  app.post("/api/auth/login", (req, res) => {
    // Allows unlimited rapid attempts
    return res.status(401).json({
      success: false,
      message: "Invalid credentials (baseline unthrottled)"
    });
  });

  app.get("/api/auth/login", (req, res) => {
    return res.status(200).json({ status: "OK - Auth Endpoint" });
  });

  // VULNERABILITY V8.3: Auth middleware accepts token in query string
  const vulnerableAuth = (req, res, next) => {
    const authHeader = req.headers.authorization;
    const queryToken = typeof req.query?.token === "string" ? req.query.token : "";

    if (!authHeader && !queryToken) {
      return res.status(401).json({ message: "No token provided" });
    }

    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.split(" ")[1]
      : queryToken;

    if (!token) {
      return res.status(401).json({ message: "Invalid token format" });
    }

    try {
      let decoded;
      try {
        decoded = jwt.verify(token, JWT_SECRET);
      } catch (e) {
        decoded = jwt.decode(token) || { id: "patient_alice_123", role: "patient" };
      }
      req.user = decoded;
      next();
    } catch (err) {
      return res.status(401).json({ message: "Token verification failed" });
    }
  };

  // Protected route accepting query tokens
  app.get("/api/patient/profile", vulnerableAuth, (req, res) => {
    return res.status(200).json({
      success: true,
      message: "Protected patient profile accessed via query token!",
      user: req.user
    });
  });

  return app;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function request(options, data = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body,
        });
      });
    });
    req.on("error", reject);
    if (data) req.write(data);
    req.end();
  });
}

async function runBaselinePoC() {
  console.log("===============================================================");
  console.log(" SE4030 SECURE SOFTWARE DEVELOPMENT — GATEWAY BASELINE PoC");
  console.log("   PRE-REMEDIATION AUDIT: V8 (Misconfiguration) & V9 (No Rate Limit)");
  console.log("===============================================================\n");

  const app = createVulnerableGateway();
  const server = app.listen(TEST_PORT);
  await sleep(300);

  console.log(`[+] Vulnerable Gateway test instance online on port ${TEST_PORT}.\n`);

  const results = [];

  try {
    /* TEST 1: V8.1 — Permissive CORS (CWE-942) */
    console.log("--- [Test 1] Probing CORS Policy (CWE-942) ---");
    const corsRes = await request({
      hostname: "localhost",
      port: TEST_PORT,
      path: "/api/auth/login",
      method: "OPTIONS",
      headers: {
        Origin: "https://malicious-attacker-domain.org",
        "Access-Control-Request-Method": "POST",
      },
    });

    const allowOrigin = corsRes.headers["access-control-allow-origin"];
    console.log(`[*] Request Origin: https://malicious-attacker-domain.org`);
    console.log(`[*] Response Access-Control-Allow-Origin: ${allowOrigin || "(none)"}`);

    if (allowOrigin === "*" || allowOrigin === "https://malicious-attacker-domain.org") {
      console.log("[ALERT] VULNERABLE: Gateway permits unauthorized/wildcard origins!");
      results.push({
        id: "V8.1",
        name: "Permissive CORS Policy",
        cwe: "CWE-942",
        cvss: "7.5 (High)",
        status: "CONFIRMED VULNERABLE",
        detail: `Wildcard or reflected origin allowed: ${allowOrigin}`,
      });
    } else {
      console.log("[PASS] PROTECTED: Origin rejected or whitelisted.");
      results.push({ id: "V8.1", name: "Permissive CORS Policy", status: "RESOLVED" });
    }
    console.log();

    /* TEST 2: V8.2 — Missing Security Headers (CWE-693) */
    console.log("--- [Test 2] Inspecting HTTP Security Headers (CWE-693) ---");
    const headerRes = await request({
      hostname: "localhost",
      port: TEST_PORT,
      path: "/api/auth/login",
      method: "GET",
    });

    const expectedHeaders = [
      "content-security-policy",
      "x-content-type-options",
      "x-frame-options",
      "strict-transport-security",
    ];

    const missingHeaders = expectedHeaders.filter((h) => !headerRes.headers[h]);
    console.log(`[*] Present Headers: ${Object.keys(headerRes.headers).join(", ")}`);

    if (missingHeaders.length > 0) {
      console.log(`[ALERT] VULNERABLE: Missing critical defense-in-depth headers: ${missingHeaders.join(", ")}`);
      results.push({
        id: "V8.2",
        name: "Missing Security Headers (No Helmet)",
        cwe: "CWE-693",
        cvss: "6.5 (Medium)",
        status: "CONFIRMED VULNERABLE",
        detail: `Missing: ${missingHeaders.join(", ")}`,
      });
    } else {
      console.log("[PASS] PROTECTED: All core security headers present.");
      results.push({ id: "V8.2", name: "Missing Security Headers", status: "RESOLVED" });
    }
    console.log();

    /* TEST 3: V8.3 — Sensitive JWT Token in URL Query String (CWE-598/CWE-200) */
    console.log("--- [Test 3] Testing Token in URL Query Parameter (CWE-598) ---");
    const testToken = jwt.sign({ id: "patient_alice_123", role: "patient" }, JWT_SECRET);

    const tokenQueryRes = await request({
      hostname: "localhost",
      port: TEST_PORT,
      path: `/api/patient/profile?token=${testToken}`,
      method: "GET",
    });

    console.log(`[*] Request: GET /api/patient/profile?token=${testToken.substring(0, 25)}...`);
    console.log(`[*] HTTP Status Code returned: ${tokenQueryRes.statusCode}`);

    if (tokenQueryRes.statusCode === 200) {
      console.log("[ALERT] VULNERABLE: Gateway accepts sensitive authentication tokens via URL query parameters!");
      console.log("    Risk: Token is recorded in proxy logs, browser history, and leaked via HTTP Referer.");
      results.push({
        id: "V8.3",
        name: "JWT Token in URL Query String",
        cwe: "CWE-598 / CWE-200",
        cvss: "7.1 (High)",
        status: "CONFIRMED VULNERABLE",
        detail: `Accepted query parameter token (Status 200 OK)`,
      });
    } else {
      console.log("[PASS] PROTECTED: Query parameter tokens rejected with 401 Unauthorized.");
      results.push({ id: "V8.3", name: "JWT Token in URL Query String", status: "RESOLVED" });
    }
    console.log();

    /* TEST 4: V9 — Missing Rate Limiting / Brute-Force Susceptibility (CWE-770) */
    console.log("--- [Test 4] Stress Testing Gateway Rate Limiting (CWE-770) ---");
    const BURST_COUNT = 25;
    console.log(`[*] Dispatching burst of ${BURST_COUNT} rapid requests to /api/auth/login...`);

    const burstPromises = [];
    for (let i = 0; i < BURST_COUNT; i++) {
      burstPromises.push(
        request(
          {
            hostname: "localhost",
            port: TEST_PORT,
            path: "/api/auth/login",
            method: "POST",
            headers: { "Content-Type": "application/json" },
          },
          JSON.stringify({ email: "victim@hospital.org", password: "guess" + i })
        )
      );
    }

    const burstResponses = await Promise.all(burstPromises);
    const throttledCount = burstResponses.filter((r) => r.statusCode === 429).length;
    console.log(`[*] Requests completed: ${BURST_COUNT}`);
    console.log(`[*] Requests rate-limited (HTTP 429): ${throttledCount}`);

    if (throttledCount === 0) {
      console.log("[ALERT] VULNERABLE: No rate limiting detected! 100% of burst requests processed.");
      console.log("    Risk: Automated credential stuffing, password brute-forcing, and DoS attacks.");
      results.push({
        id: "V9",
        name: "Missing API Gateway Rate Limiting",
        cwe: "CWE-770",
        cvss: "7.5 (High)",
        status: "CONFIRMED VULNERABLE",
        detail: `0/${BURST_COUNT} requests rate-limited (HTTP 429 expected)`,
      });
    } else {
      console.log(`[PASS] PROTECTED: Rate limiter triggered! Blocked ${throttledCount} excessive requests.`);
      results.push({ id: "V9", name: "Missing API Gateway Rate Limiting", status: "RESOLVED" });
    }
    console.log();
  } finally {
    if (process.argv.includes("--serve")) {
      const sampleToken = jwt.sign({ id: "patient_alice_123", role: "patient" }, JWT_SECRET);
      console.log(`[*] --serve flag detected: Keeping vulnerable server active on port ${TEST_PORT} for Postman screenshots...`);
      console.log(`[*] Direct test URL for Postman (Query Token Vulnerability):`);
      console.log(`    http://localhost:${TEST_PORT}/api/patient/profile?token=${sampleToken}`);
      console.log(`[*] Press Ctrl+C when finished capturing Postman screenshots.`);
    } else {
      console.log("[*] Shutting down test Gateway instance...");
      server.close();
    }
  }

  /* SUMMARY MATRIX */
  console.log("===============================================================");
  console.log(" PoC EXECUTION SUMMARY TABLE (PRE-REMEDIATION BASELINE)");
  console.log("===============================================================");
  console.table(results);
  console.log("===============================================================\n");
}

runBaselinePoC().catch((err) => {
  console.error("PoC Execution failed:", err);
  process.exit(1);
});
