/**
 * Security PoC Test Suite: V4 - Broken Object Level Authorization (BOLA / IDOR)
 * Target Endpoint: GET /api/payment/history/:patientId
 * Service: payment-service (via api-gateway on port 5000)
 *
 * Vulnerability Taxonomy:
 * - CWE-639: Authorization Bypass Through User-Controlled Key
 * - OWASP API Security Top 10 (2023): API1:2023 - Broken Object Level Authorization
 * - OWASP Top 10 (2021): A01:2021 - Broken Access Control
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
        typeof postData === "string" ? postData : JSON.stringify(postData),
      );
    }
    req.end();
  });
}

async function runTest() {
  console.log(
    "V4 SECURITY PoC TEST: Broken Object Level Authorization in Payment History",
  );

  try {
    // Authenticate as Attacker (Patient A)
    console.log("[*] Step 1: Logging in as Attacker (Patient A)...");
    const loginA = await makeRequest(
      {
        hostname: BASE_HOST,
        port: BASE_PORT,
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { email: "patient1@test.com", password: "Pass123!" },
    );

    if (!loginA.body.token) {
      throw new Error(
        "Failed to login as Patient A. Ensure patient1@test.com exists.",
      );
    }
    const tokenA = loginA.body.token;
    const attackerId = loginA.body.user?._id || "6aaf75bf827b68b6b918711e";
    console.log(`[+] Patient A Authenticated. User ID: ${attackerId}`);

    // Authenticate as Victim (Patient B) to obtain Victim's ID
    console.log("[*] Step 2: Logging in as Victim (Patient B)...");
    const loginB = await makeRequest(
      {
        hostname: BASE_HOST,
        port: BASE_PORT,
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { email: "patient2@test.com", password: "Pass123!" },
    );

    const victimId = loginB.body.user?._id || "6aaf8166827b68b6b9187122";
    console.log(`[+] Victim Patient B ID resolved: ${victimId}`);

    // Attack Simulation: Patient A requests Patient B's payment records
    console.log(
      `[*] Step 3: Sending cross-patient request: GET /api/payment/history/${victimId}`,
    );
    console.log("    Attaching Authorization: Bearer <Patient_A_Token>");

    const attackRes = await makeRequest({
      hostname: BASE_HOST,
      port: BASE_PORT,
      path: `/api/payment/history/${victimId}`,
      method: "GET",
      headers: {
        Authorization: `Bearer ${tokenA}`,
      },
    });

    console.log(`[*] Received HTTP Status: ${attackRes.status}`);

    if (attackRes.status === 200) {
      console.log(
        "\n[!] VULNERABLE [BOLA / IDOR DETECTED] (CWE-639 / OWASP API1:2023)",
      );
      console.log(
        "    Patient A was able to access Patient B's financial and payment history!",
      );
      console.log(
        "    Exposed Data Summary:",
        JSON.stringify(attackRes.body).substring(0, 180) + "...",
      );
    } else if (attackRes.status === 403) {
      console.log("\n[+] PROTECTED [BOLA DEFENSE ACTIVE]");
      console.log("    Access correctly denied with HTTP 403 Forbidden.");
      console.log(
        `    Server Response Message: "${attackRes.body.message || JSON.stringify(attackRes.body)}"`,
      );
    } else {
      console.log(
        `\n[!] Unexpected HTTP Status: ${attackRes.status}`,
        attackRes.body,
      );
    }
  } catch (err) {
    console.error("[-] Test execution failed:", err.message);
  }
}

runTest();
