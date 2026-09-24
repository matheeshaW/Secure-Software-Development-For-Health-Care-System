/**
 * Security PoC Test Suite: V5 - NoSQL Injection in Doctor Search
 * Target Endpoint: GET /api/doctors/search
 * Service: doctor-service (via api-gateway on port 5000)
 *
 * Vulnerability Taxonomy:
 * - CWE-943: Improper Neutralization of Special Elements in Data Query Logic ('NoSQL Injection')
 * - OWASP Top 10 (2021): A03:2021 - Injection
 * - OWASP API Security Top 10 (2023): API8:2023 - Security Misconfiguration
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
  console.log("V5 SECURITY PoC TEST: NoSQL Injection in Doctor Search");

  try {
    // Authenticate as Patient to obtain valid Bearer token
    console.log("[*] Step 1: Authenticating to obtain JWT session token...");
    const loginRes = await makeRequest(
      {
        hostname: BASE_HOST,
        port: BASE_PORT,
        path: "/api/auth/login",
        method: "POST",
        headers: { "Content-Type": "application/json" },
      },
      { email: "patient1@test.com", password: "Pass123!" },
    );

    if (!loginRes.body.token) {
      throw new Error(
        "Failed to authenticate. Ensure patient1@test.com exists.",
      );
    }
    const token = loginRes.body.token;
    console.log("[+] Authenticated successfully.");

    // Baseline Test: Legitimate search by specialization
    console.log(
      "[*] Step 2: Executing baseline benign search for Cardiology...",
    );
    const baselineRes = await makeRequest({
      hostname: BASE_HOST,
      port: BASE_PORT,
      path: "/api/doctors/search?specialization=Cardiology",
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    const baselineCount =
      baselineRes.body?.count ||
      (Array.isArray(baselineRes.body?.data)
        ? baselineRes.body.data.length
        : 0);
    console.log(
      `[+] Baseline search returned ${baselineCount} doctor(s) (Status ${baselineRes.status})`,
    );

    // Attack Simulation: Inject MongoDB operator ($ne) to dump all doctors
    console.log(
      "[*] Step 3: Dispatching NoSQL injection attack: specialization[$ne]=null...",
    );
    const attackRes = await makeRequest({
      hostname: BASE_HOST,
      port: BASE_PORT,
      path: "/api/doctors/search?specialization[$ne]=null",
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    console.log(`[*] Received HTTP Status: ${attackRes.status}`);

    if (attackRes.status === 200) {
      const injectedCount =
        attackRes.body?.count ||
        (Array.isArray(attackRes.body?.data) ? attackRes.body.data.length : 0);
      console.log(
        "\n[!] VULNERABLE [NoSQL INJECTION DETECTED] (CWE-943 / OWASP A03:2021)",
      );
      console.log(
        `    The $ne operator bypassed query filtering, returning ${injectedCount} doctor records across all specializations!`,
      );
      if (Array.isArray(attackRes.body?.data)) {
        const specializations = [
          ...new Set(attackRes.body.data.map((d) => d.specialization)),
        ];
        console.log(
          `    Disclosed Specializations in single query: ${specializations.join(", ")}`,
        );
      }
    } else if (attackRes.status === 400) {
      console.log("\n[+] PROTECTED [NoSQL INJECTION DEFENSE ACTIVE]");
      console.log("    Injection attempt rejected with HTTP 400 Bad Request.");
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
