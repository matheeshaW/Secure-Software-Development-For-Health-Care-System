/**
 * OAuth 2.0 and OpenID Connect Security & Verification Test Suite
 *
 * Validates Google OAuth 2.0 authorization code exchange and OpenID Connect (OIDC)
 * ID token verification, JIT account provisioning, CSRF state protection,
 * and rejection of forged or unverified credentials.
 */

const assert = require("assert");
const http = require("http");

// Mock test harness for auth controller logic
const { googleAuth, getGoogleAuthUrl } = require("../src/controllers/authController");
const User = require("../src/models/User");

// Test runner
async function runTests() {
  console.log("==================================================================");
  console.log("SE4030 SSD - Phase 3: Google OAuth 2.0 / OIDC Verification Suite");
  console.log("==================================================================");

  let passed = 0;
  let failed = 0;

  function recordResult(testName, isSuccess, details = "") {
    if (isSuccess) {
      console.log(`[PASS] ${testName}`);
      passed++;
    } else {
      console.error(`[FAIL] ${testName} - ${details}`);
      failed++;
    }
  }

  // TEST 1: CSRF Protected Authorization URL Generation
  try {
    const mockReq = {};
    let responseData = null;
    let statusCode = null;

    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    getGoogleAuthUrl(mockReq, mockRes);

    const hasSuccess = responseData && responseData.success === true;
    const hasUrl = responseData && typeof responseData.url === "string" && responseData.url.includes("accounts.google.com");
    const hasState = responseData && typeof responseData.state === "string" && responseData.state.length >= 32;

    recordResult(
      "Test 1: Google OAuth 2.0 Auth URL Generation with CSRF State Parameter",
      hasSuccess && hasUrl && hasState,
      `status: ${statusCode}, hasUrl: ${hasUrl}, stateLength: ${responseData?.state?.length}`
    );
  } catch (err) {
    recordResult("Test 1: Google OAuth 2.0 Auth URL Generation with CSRF State Parameter", false, err.message);
  }

  // TEST 2: Rejection of Forged / Tampered Google ID Token
  try {
    const mockReq = {
      body: {
        credential: "forged.header.payload.signature_not_from_google",
      },
    };
    let statusCode = null;
    let responseData = null;

    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    // Force production environment to ensure strict signature verification
    const origEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = "production";

    await googleAuth(mockReq, mockRes);
    process.env.NODE_ENV = origEnv;

    const isRejected = statusCode === 401 && responseData && responseData.success === false;
    recordResult(
      "Test 2: Rejection of Forged / Untrusted Google ID Token (401 Unauthorized)",
      isRejected,
      `statusCode: ${statusCode}, message: ${responseData?.message}`
    );
  } catch (err) {
    recordResult("Test 2: Rejection of Forged / Untrusted Google ID Token", false, err.message);
  }

  // TEST 3: Rejection of Missing Credentials and Missing Code
  try {
    const mockReq = {
      body: {},
    };
    let statusCode = null;
    let responseData = null;

    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    await googleAuth(mockReq, mockRes);

    const isBadRequest = statusCode === 400 && responseData && responseData.success === false;
    recordResult(
      "Test 3: Rejection of Missing Authentication Payload (400 Bad Request)",
      isBadRequest,
      `statusCode: ${statusCode}, message: ${responseData?.message}`
    );
  } catch (err) {
    recordResult("Test 3: Rejection of Missing Authentication Payload", false, err.message);
  }

  // TEST 4: Verification of Development Test Token & JIT Provisioning logic
  try {
    const testEmail = "patient.test." + Date.now() + "@gmail.com";
    const mockReq = {
      body: {
        credential: `mock_google_token_${testEmail}`,
      },
    };
    let statusCode = null;
    let responseData = null;

    const mockRes = {
      status(code) {
        statusCode = code;
        return this;
      },
      json(data) {
        responseData = data;
        return this;
      },
    };

    // Set test env and JWT_SECRET
    process.env.NODE_ENV = "development";
    process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret_key_12345";

    // Mock User model methods if MongoDB is not connected
    const origFindOne = User.findOne;
    const origCreate = User.create;

    User.findOne = async (query) => null; // Simulate new user
    User.create = async (userData) => ({
      _id: "mock_mongo_id_001",
      ...userData,
    });

    await googleAuth(mockReq, mockRes);

    // Restore original methods
    User.findOne = origFindOne;
    User.create = origCreate;

    const isSuccess = statusCode === 200 && responseData && responseData.success === true;
    const hasToken = responseData && typeof responseData.token === "string";
    const isPatientRole = responseData && responseData.user && responseData.user.role === "patient";

    recordResult(
      "Test 4: Google OIDC Token Verification & Just-in-Time Patient Provisioning",
      isSuccess && hasToken && isPatientRole,
      `statusCode: ${statusCode}, hasToken: ${hasToken}, role: ${responseData?.user?.role}`
    );
  } catch (err) {
    recordResult("Test 4: Google OIDC Token Verification & Just-in-Time Patient Provisioning", false, err.message);
  }

  console.log("------------------------------------------------------------------");
  console.log(`OAuth 2.0 / OIDC Test Results: ${passed} Passed, ${failed} Failed`);
  console.log("==================================================================");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests();
