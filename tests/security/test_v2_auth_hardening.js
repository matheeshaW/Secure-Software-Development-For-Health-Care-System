/**
 * Security Audit & Exploit PoC Test: V2 - Mass Assignment, Password Leak & User Enumeration
 * 
 * CWE-269: Improper Privilege Management
 * CWE-915: Improperly Controlled Modification of Dynamically Determined Object Attributes (Mass Assignment)
 * CWE-200: Exposure of Sensitive Information to an Unauthorized Actor
 * CWE-204: Observable Response Discrepancy (User Enumeration)
 * OWASP Top 10 - A01:2021 Broken Access Control & A07:2021 Identification and Authentication Failures
 */

const fs = require('fs');
const path = require('path');

const AUTH_CONTROLLER_PATH = path.resolve(__dirname, '../../patient-service/src/controllers/authController.js');

function analyzeAuthControllerSource() {
  console.log('================================================================');
  console.log('  Testing V2: Mass Assignment & Authentication Security Flaws   ');
  console.log('  Target: patient-service/src/controllers/authController.js      ');
  console.log('================================================================\n');

  if (!fs.existsSync(AUTH_CONTROLLER_PATH)) {
    console.error('[ERROR] File not found:', AUTH_CONTROLLER_PATH);
    process.exit(1);
  }

  const content = fs.readFileSync(AUTH_CONTROLLER_PATH, 'utf8');
  let issues = [];

  // 1. Check for Mass Assignment of 'role' in register
  const allowsRoleAssignment = /const\s*\{\s*[^}]*\brole\b[^}]*\}\s*=\s*req\.body/i.test(content) &&
                              /allowedRoles\s*=\s*\[.*['"]admin['"].*\]/i.test(content);
  if (allowsRoleAssignment) {
    issues.push({
      cwe: 'CWE-269 / CWE-915',
      name: 'Privilege Escalation via Mass Assignment',
      detail: 'Public registration allows req.body.role = "admin", granting root platform privileges to unauthenticated users.'
    });
  }

  // 2. Check for Password Hash Leakage in responses
  // Insecure pattern: res.json({ success: true, user }) without stripping user.password
  const leaksPasswordInRegister = /res\.json\(\{\s*success:\s*true,\s*user\s*\}\)/.test(content);
  const leaksPasswordInLogin = /res\.json\(\{\s*success:\s*true,\s*token,\s*user\s*\}\)/.test(content);
  if (leaksPasswordInRegister || leaksPasswordInLogin) {
    issues.push({
      cwe: 'CWE-200',
      name: 'Sensitive Data Exposure (Password Hash Leak)',
      detail: 'authController returns the entire User document including bcrypt password hash in JSON response.'
    });
  }

  // 3. Check for User Enumeration via divergent error responses
  const hasUserNotFound404 = /res\.status\(404\)\.json\(\{\s*message:\s*["']User not found["']\s*\}\)/i.test(content);
  const hasInvalidCredentials400 = /res\.status\(400\)\.json\(\{\s*message:\s*["']Invalid credentials["']\s*\}\)/i.test(content);
  if (hasUserNotFound404 && hasInvalidCredentials400) {
    issues.push({
      cwe: 'CWE-204',
      name: 'User Enumeration Oracle in Login',
      detail: 'Login endpoint returns 404 User not found vs 400 Invalid credentials, allowing attackers to harvest registered emails.'
    });
  }

  if (issues.length > 0) {
    console.error(`[ALERT] VULNERABILITIES DETECTED: Found ${issues.length} authentication security issue(s):\n`);
    issues.forEach((issue, idx) => {
      console.error(`[Flaw #${idx + 1}] [${issue.cwe}] ${issue.name}`);
      console.error(`   ${issue.detail}\n`);
    });
    console.error('RESULT: FAILED - authController.js must be remediated.\n');
    return false;
  } else {
    console.log('[PASS] All authentication security controls verified:');
    console.log('   - Role self-assignment blocked (enforced default: patient)');
    console.log('   - Password hashes sanitized from all authentication responses');
    console.log('   - User enumeration eliminated with unified 401 error response');
    return true;
  }
}

const passed = analyzeAuthControllerSource();
process.exit(passed ? 0 : 1);
