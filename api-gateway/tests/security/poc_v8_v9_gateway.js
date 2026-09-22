/**
 * Security Proof-of-Concept (PoC) Exploit Test Suite
 * Vulnerabilities Targeted:
 *  - V8: Gateway Security Misconfiguration (CWE-942, CWE-693, CWE-598)
 *  - V9: Missing Rate Limiting & Brute Force Susceptibility (CWE-770)
 *
 * Module: SE4030 - Secure Software Development (SLIIT)
 * Author: Matheesha Weerakoon (Member 1 - API Gateway & OAuth Lead)
 */

const http = require("http");
const { spawn } = require("child_process");
const path = require("path");
const jwt = require("jsonwebtoken");

const TEST_PORT = 5099;
const JWT_SECRET = "test_jwt_secret_key_1234567890_for_poc";

const env = {
  ...process.env,
  PORT: TEST_PORT.toString(),
  JWT_SECRET: JWT_SECRET,
  PATIENT_SERVICE_URL: "http://localhost:5991",
  DOCTOR_SERVICE_URL: "http://localhost:5992",
  APPOINTMENT_SERVICE_URL: "http://localhost:5993",
  PAYMENT_SERVICE_URL: "http://localhost:5994",
  TELEMEDICINE_SERVICE_URL: "http://localhost:5995",
  NOTIFICATION_SERVICE_URL: "http://localhost:5996",
};

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

async function runSecurityPoC() {
  console.log("===============================================================");
  console.log(" SE4030 SECURE SOFTWARE DEVELOPMENT — GATEWAY SECURITY PoC");
  console.log("   Vulnerabilities: V8 (Misconfiguration) & V9 (No Rate Limiting)");
  console.log("===============================================================\n");

  console.log("[*] Starting API Gateway test instance on port " + TEST_PORT + "...");
  const serverPath = path.join(__dirname, "../../server.js");
  const serverProcess = spawn("node", [serverPath], { env });

  serverProcess.stdout.on("data", (d) => {
    // console.log(`[Gateway Log]: ${d.toString().trim()}`);
  });

  serverProcess.stderr.on("data", (d) => {
    // console.error(`[Gateway Err]: ${d.toString().trim()}`);
  });

  // Wait for server to boot
  let booted = false;
  for (let i = 0; i < 20; i++) {
    await sleep(250);
    try {
      const res = await request({
        hostname: "localhost",
        port: TEST_PORT,
        path: "/",
        method: "GET",
      });
      if (res.statusCode) {
        booted = true;
        break;
      }
    } catch {
      // waiting
    }
  }

  if (!booted) {
    console.error("[-] Failed to start test API Gateway. Aborting.");
    serverProcess.kill();
    process.exit(1);
  }

  console.log("[+] Test Gateway online.\n");

  const results = [];

  try {
    /* -------------------------------------------------------------
     * TEST 1: V8.1 — Permissive CORS (CWE-942)
     * ------------------------------------------------------------- */
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
      console.log(" VULNERABLE: Gateway permits unauthorized/wildcard origins!");
      results.push({
        id: "V8.1",
        name: "Permissive CORS Policy",
        cwe: "CWE-942",
        cvss: "7.5 (High)",
        status: "CONFIRMED VULNERABLE",
        detail: `Wildcard or reflected origin allowed: ${allowOrigin}`,
      });
    } else {
      console.log("PROTECTED: Origin rejected or whitelisted.");
      results.push({
        id: "V8.1",
        name: "Permissive CORS Policy",
        status: "RESOLVED",
      });
    }
    console.log();

    /* -------------------------------------------------------------
     * TEST 2: V8.2 — Missing Security Headers (CWE-693)
     * ------------------------------------------------------------- */
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
      console.log(` VULNERABLE: Missing critical defense-in-depth headers: ${missingHeaders.join(", ")}`);
      results.push({
        id: "V8.2",
        name: "Missing Security Headers (No Helmet)",
        cwe: "CWE-693",
        cvss: "6.5 (Medium)",
        status: "CONFIRMED VULNERABLE",
        detail: `Missing: ${missingHeaders.join(", ")}`,
      });
    } else {
      console.log("PROTECTED: All core security headers present.");
      results.push({
        id: "V8.2",
        name: "Missing Security Headers",
        status: "RESOLVED",
      });
    }
    console.log();

    /* -------------------------------------------------------------
     * TEST 3: V8.3 — Sensitive JWT Token in URL Query String (CWE-598/CWE-200)
     * ------------------------------------------------------------- */
    console.log("--- [Test 3] Testing Token in URL Query Parameter (CWE-598) ---");
    const testToken = jwt.sign({ id: "patient123", role: "patient" }, JWT_SECRET);

    // Request protected route with token in query string instead of Authorization header
    const tokenQueryRes = await request({
      hostname: "localhost",
      port: TEST_PORT,
      path: `/api/patient/profile?token=${testToken}`,
      method: "GET",
    });

    // If status is NOT 401, it accepted the token from URL query string!
    // (It might return 502 because mock service is offline, but 502 means auth passed!)
    if (tokenQueryRes.statusCode !== 401) {
      console.log(`[*] Status Code returned: ${tokenQueryRes.statusCode}`);
      console.log(" VULNERABLE: Gateway accepts sensitive authentication tokens via URL query parameters!");
      console.log("    Risk: Token is recorded in proxy logs, browser history, and leaked via HTTP Referer.");
      results.push({
        id: "V8.3",
        name: "JWT Token in URL Query String",
        cwe: "CWE-598 / CWE-200",
        cvss: "7.1 (High)",
        status: "CONFIRMED VULNERABLE",
        detail: `Accepted query parameter token (Status ${tokenQueryRes.statusCode} instead of 401)`,
      });
    } else {
      console.log("PROTECTED: Query parameter tokens rejected with 401 Unauthorized.");
      results.push({
        id: "V8.3",
        name: "JWT Token in URL Query String",
        status: "RESOLVED",
      });
    }
    console.log();

    /* -------------------------------------------------------------
     * TEST 4: V9 — Missing Rate Limiting / Brute-Force Susceptibility (CWE-770)
     * ------------------------------------------------------------- */
    console.log("--- [Test 4] Stress Testing Gateway Rate Limiting (CWE-770) ---");
    const BURST_COUNT = 25;
    console.log(`[*] Dispatching burst of ${BURST_COUNT} rapid requests to /api/auth/login...`);

    const burstPromises = [];
    for (let i = 0; i < BURST_COUNT; i++) {
      burstPromises.push(
        request({
          hostname: "localhost",
          port: TEST_PORT,
          path: "/api/auth/login",
          method: "POST",
          headers: { "Content-Type": "application/json" },
        }, JSON.stringify({ email: "victim@hospital.org", password: "guess" + i }))
      );
    }

    const burstResponses = await Promise.all(burstPromises);
    const throttledCount = burstResponses.filter((r) => r.statusCode === 429).length;
    console.log(`[*] Requests completed: ${BURST_COUNT}`);
    console.log(`[*] Requests rate-limited (HTTP 429): ${throttledCount}`);

    if (throttledCount === 0) {
      console.log(" VULNERABLE: No rate limiting detected! 100% of burst requests processed.");
      console.log("    Risk: Automated credential stuffing, password brute-forcing, and DoS attacks.");
      results.push({
        id: "V9",
        name: "Missing API Gateway Rate Limiting",
        cwe: "CWE-770",
        cvss: "5.3 (Medium)",
        status: "CONFIRMED VULNERABLE",
        detail: `0/${BURST_COUNT} requests rate-limited (HTTP 429 expected)`,
      });
    } else {
      console.log(` PROTECTED: Rate limiter triggered! Blocked ${throttledCount} excessive requests.`);
      results.push({
        id: "V9",
        name: "Missing API Gateway Rate Limiting",
        status: "RESOLVED",
      });
    }
    console.log();

  } finally {
    console.log("[*] Shutting down test Gateway instance...");
    serverProcess.kill();
  }

  /* -------------------------------------------------------------
   * SUMMARY MATRIX
   * ------------------------------------------------------------- */
  console.log("===============================================================");
  console.log(" PoC EXECUTION SUMMARY TABLE (PRE-REMEDIATION BASELINE)");
  console.log("===============================================================");
  console.table(results);
  console.log("===============================================================\n");
}

runSecurityPoC().catch((err) => {
  console.error("PoC Execution failed:", err);
  process.exit(1);
});
