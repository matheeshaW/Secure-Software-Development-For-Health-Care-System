/**
 * Security PoC Test Suite: V6 - Client-Side Price Tampering & Insecure Business Logic
 * Target Endpoint: POST /api/payment/pay
 * Service: payment-service (via api-gateway on port 5000)
 *
 * Vulnerability Taxonomy:
 * - CWE-20: Improper Input Validation
 * - CWE-602: Client-Side Enforcement of Server-Side Security
 * - OWASP Top 10 (2021): A04:2021 - Insecure Design
 * - OWASP API Security Top 10 (2023): API6:2023 - Unrestricted Access to Sensitive Business Flows
 */

const http = require("http");

const BASE_HOST = "localhost";
const BASE_PORT = 5000;

function makeRequest(options, postData = null) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          resolve({ status: res.statusCode, body: JSON.parse(data) });
        } catch {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });
    req.on("error", reject);
    if (postData) {
      req.write(
        typeof postData === "string" ? postData : JSON.stringify(postData)
      );
    }
    req.end();
  });
}

async function runTest() {
  console.log("V6 SECURITY PoC TEST: Client-Side Price Tampering in Payment Processing");

  try {
    // 1. Authenticate as Patient A
    console.log("[*] Step 1: Logging in as Patient A to retrieve bearer token...");
    const loginRes = await makeRequest(
      {
        hostname: BASE_HOST,
        port: BASE_PORT,
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { email: "patient1@test.com", password: "Pass123!" }
    );

    if (!loginRes.body.token) {
      throw new Error("Failed to authenticate. Ensure patient1@test.com exists.");
    }
    const token = loginRes.body.token;
    const patientId = loginRes.body.user?._id || "6aaf75bf827b68b6b918711e";
    console.log(`[+] Patient A Authenticated. User ID: ${patientId}`);

    // 2. Dispatch tampered payment request with manipulated amount (Rs. 1 instead of Rs. 2500)
    console.log("[*] Step 2: Dispatching tampered payment request (amount: 1 LKR)...");
    const tamperedPayload = {
      appointmentId: "6aaf9999bdcda975f8ed7777",
      patientId: patientId,
      patientEmail: "patient1@test.com",
      doctorId: "69dfa69720b01cbcd16d13f9",
      amount: 1, // Manipulated price
    };

    const attackRes = await makeRequest(
      {
        hostname: BASE_HOST,
        port: BASE_PORT,
        path: "/api/payment/pay",
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      },
      tamperedPayload
    );

    console.log(`[*] Received HTTP Status: ${attackRes.status}`);

    if (attackRes.status === 200 && attackRes.body?.success) {
      console.log("\n[!] VULNERABLE [CLIENT-SIDE PRICE TAMPERING DETECTED] (CWE-20 / OWASP A04:2021)");
      console.log("    Payment of Rs. 1 was processed and marked successful by the server!");
      console.log(`    Generated Transaction ID: ${attackRes.body.transactionId}`);
    } else if (attackRes.status === 400) {
      console.log("\n[+] PROTECTED [PRICE TAMPERING DEFENSE ACTIVE]");
      console.log("    Tampered price rejected with HTTP 400 Bad Request.");
      console.log(`    Server Response Message: "${attackRes.body.message || JSON.stringify(attackRes.body)}"`);
    } else {
      console.log(`\n[!] Unexpected HTTP Status: ${attackRes.status}`, attackRes.body);
    }
  } catch (err) {
    console.error("[-] Test execution failed:", err.message);
  }
}

runTest();
