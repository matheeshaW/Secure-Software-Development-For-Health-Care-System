# Security Verification Report: V2 - Mass Assignment, Privilege Escalation & Authentication Hardening

- **Vulnerabilities**:
  1. Mass Assignment & Privilege Escalation (CWE-269 / CWE-915)
  2. Sensitive Data Exposure / Password Hash Leak (CWE-200)
  3. User Enumeration Observable Response Discrepancy (CWE-204)
- **OWASP Categories**:
  - A01:2021 – Broken Access Control
  - A07:2021 – Identification and Authentication Failures
- **CVSS v3.1 Scores**:
  - Privilege Escalation: 8.8 (High) `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H`
  - Sensitive Data Exposure: 7.5 (High) `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:N/A:N`
  - User Enumeration: 5.3 (Medium) `CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:L/I:N/A:N`
- **Owner**: Member 2 (Patient Domain Security & Threat Modeling Lead)
- **Status**: [STATUS: REMEDIATED & VERIFIED]

---

## 1. Vulnerability Analysis & Root Causes

### 1.1 Mass Assignment Privilege Escalation (CWE-269 / CWE-915)
- **Root Cause**: `patient-service/src/controllers/authController.js` destructured `role` directly from `req.body` during public self-registration (`exports.register`). It permitted `admin` or `doctor` in `allowedRoles`, allowing unauthenticated malicious actors to register arbitrary accounts with full administrative privileges:
  ```javascript
  // Insecure Code:
  const { name, email, password, role } = req.body;
  const allowedRoles = ["patient", "doctor", "admin"];
  if (role && !allowedRoles.includes(role)) return res.status(400)...;
  const user = await User.create({ name, email, password: hashedPassword, role });
  ```

### 1.2 Sensitive Data Exposure (Password Hash Leak, CWE-200)
- **Root Cause**: Both `register` and `login` returned the full Mongoose user document directly in JSON responses (`res.json({ success: true, user })`), which contained the bcrypt password hash string (`$2a$10$...`). While hashed, exposure enables offline dictionary and rainbow table cracking.

### 1.3 User Enumeration Oracle (CWE-204)
- **Root Cause**: The login handler returned distinct HTTP status codes and error messages based on whether an account existed:
  - Account does not exist: `404 Not Found` (`"User not found"`)
  - Account exists, wrong password: `400 Bad Request` (`"Invalid credentials"`)
  Attackers could leverage this response oracle to enumerate valid patient and physician email addresses across the platform.

---

## 2. Remediation Strategy & Implementation

### 2.1 Role Whitelisting & Admin Provisioning
- In `authController.register`, `role` is hardcoded to `'patient'` for public self-registration; client-provided role fields are completely ignored.
- Provisioning of elevated privileges (`doctor`, `admin`) has been migrated to an authenticated, role-protected admin endpoint: `POST /api/admin/users` (guarded by `authenticate` and `authorize('admin')`).

### 2.2 Response Sanitization
- Implemented `sanitizeUser(userDoc)` helper which removes the `password` field from all JSON payloads before transmission.

### 2.3 Unified Authentication Error Responses & Timing Normalization
- Login responses now return a uniform `401 Unauthorized` with `{ success: false, message: "Invalid email or password" }` for all authentication failures.
- If an email does not exist in the database, a dummy bcrypt comparison is executed against a constant hash to normalize processing time and mitigate timing side-channel attacks.

---

## 3. Automated Verification Scan Results

### Pre-Fix Verification:
```text
================================================================
  Testing V2: Mass Assignment & Authentication Security Flaws   
  Target: patient-service/src/controllers/authController.js      
================================================================

[ALERT] VULNERABILITIES DETECTED: Found 3 authentication security issue(s):

[Flaw #1] [CWE-269 / CWE-915] Privilege Escalation via Mass Assignment
   Public registration allows req.body.role = "admin", granting root platform privileges to unauthenticated users.

[Flaw #2] [CWE-200] Sensitive Data Exposure (Password Hash Leak)
   authController returns the entire User document including bcrypt password hash in JSON response.

[Flaw #3] [CWE-204] User Enumeration Oracle in Login
   Login endpoint returns 404 User not found vs 400 Invalid credentials, allowing attackers to harvest registered emails.

RESULT: FAILED - authController.js must be remediated.
```

### Post-Fix Verification:
```text
================================================================
  Testing V2: Mass Assignment & Authentication Security Flaws   
  Target: patient-service/src/controllers/authController.js      
================================================================

[PASS] All authentication security controls verified:
   - Role self-assignment blocked (enforced default: patient)
   - Password hashes sanitized from all authentication responses
   - User enumeration eliminated with unified 401 error response
```

---

## 4. Conclusion
The authentication workflow has been comprehensively hardened. Privileges are now strictly enforced by policy and architecture, user enumeration vectors are eliminated, and sensitive cryptographic hashes are protected from exposure.
