# SE4030 Secure Software Development: STRIDE Threat Model & Security Architecture

- **Subject System**: Healthcare Microservices Platform (`Healthcare-Microservices-System`)
- **Author**: Member 2 (Patient Domain Security & Threat Modeling Lead)
- **Domain**: Protected Health Information (PHI) & Distributed Clinical Microservices
- **Methodology**: Microsoft STRIDE Threat Classification Model & OWASP Top 10

---

## 1. System Scope & Architectural Decomposition

The `Healthcare-Microservices-System` is a distributed, containerized clinical management ecosystem comprising an edge API Gateway, multiple domain microservices, asynchronous message queues, and polyglot persistence stores. Because the platform processes Protected Health Information (PHI) governed by HIPAA guidelines and financial transaction data governed by PCI-DSS considerations, modeling architectural threats is paramount.

### Core Architectural Entities:
1. **External Actors**:
   - `Patient`: Authenticates, books doctor appointments, uploads/views medical records, issues consultation payments.
   - `Doctor`: Manages consultation availability slots, views patient medical history, joins telemedicine sessions.
   - `Administrator`: Provisions staff accounts, monitors platform operations, manages user lifecycles.
   - `Attacker / Unauthenticated Public`: Probing the exposed edge gateway for unauthenticated endpoints, credential stuffing, injection vectors, and broken access controls.

2. **Edge Perimeter**:
   - `API Gateway` (Port 5000): Central reverse proxy responsible for SSL/TLS termination, JWT signature validation, global rate limiting, and route dispatching.

3. **Backend Microservices (Internal Network `hms-network`)**:
   - `patient-service` (Port 5001): User profile management, demographic storage, medical report metadata.
   - `doctor-service` (Port 5002): Doctor specialization directory, consultation schedule availability.
   - `appointment-service` (Port 5003): Appointment reservation state machine, slot locking/releasing.
   - `payment-service` (Port 5005): Consultation fee charging, Stripe payment intent creation, receipt history.
   - `notification-service` (Port 5004): Asynchronous transactional notification consumer, SMTP email dispatcher.
   - `telemedicine-service` (Port 5006): Jitsi Meet WebRTC room creation and authorization.

4. **Data Stores & Message Brokers**:
   - `MongoDB Distributed Replica/Databases`: Document stores for user profiles, clinical records, and payment logs.
   - `RabbitMQ Message Broker`: AMQP message exchange distributing appointment and payment notification events.
   - `Cloudinary Object Storage`: Third-party encrypted cloud blob store for medical diagnostic files (PDFs, scans).

---

## 2. Data Flow Diagrams (DFD) & Trust Boundaries

### 2.1 DFD Level 0: Context Diagram
```
   [ Patients / Doctors / Admins ]
                 │
                 │ (HTTPS / Public Internet)
        [ TRUST BOUNDARY 1 ]
                 │
                 ▼
   ┌─────────────────────────────┐
   │         API Gateway         │
   │   (Edge Ingress / Port 5000)│
   └──────────────┬──────────────┘
                  │
        [ TRUST BOUNDARY 2 ] (Internal Docker Bridge `hms-network`)
                  │
        ┌─────────┴─────────┬───────────────────┐
        ▼                   ▼                   ▼
 ┌──────────────┐   ┌──────────────┐    ┌──────────────┐
 │ Patient Svc  │   │  Doctor Svc  │    │ Payment Svc  │ ...
 └──────┬───────┘   └──────┬───────┘    └──────┬───────┘
        │                  │                   │
        [ TRUST BOUNDARY 3 ] (Persistence & Infrastructure Tier)
        │                  │                   │
        ▼                  ▼                   ▼
   [ MongoDB ]       [ RabbitMQ ]       [ Cloud Storage ]
```

### 2.2 Trust Boundaries Defined:
- **Trust Boundary 1 (TB1: Public Internet to API Gateway)**:
  Untrusted public web traffic transitioning into the demilitarized edge zone. High risk of automated bot scanning, brute force credential guessing, DDoS, and protocol-level abuse.
- **Trust Boundary 2 (TB2: API Gateway to Internal Microservices)**:
  Traffic inside the internal Docker virtual network (`hms-network`). Requests arriving here are assumed to carry validated identity headers from the Gateway, but microservices must still enforce domain-level authorization (defense-in-depth).
- **Trust Boundary 3 (TB3: Microservices to Databases & External SaaS)**:
  Connection strings, cloud API keys (Stripe, Cloudinary, Gmail SMTP), and database read/write pipes.

---

## 3. Comprehensive STRIDE Threat Analysis Matrix

| Threat Category | Threat ID | Target Element | Vulnerability / Threat Scenario | Impact | Initial Risk | Mitigation / Security Control |
|---|---|---|---|---|---|---|
| **S - Spoofing** | T-S1 | API Gateway / Auth | Attacker submits forged or expired JWTs to masquerade as an authorized physician or admin. | Complete account takeover; unauthorized PHI access | **High** | Cryptographically strong 256-bit HMAC secret; strict JWT signature & expiration verification (`jwt.verify`). |
| **S - Spoofing** | T-S2 | Patient Service Auth | Attacker impersonates legitimate patients via credential stuffing or brute force password guessing. | Patient identity compromise | **Medium** | Rate limiting at Gateway (`express-rate-limit`); unified login error responses preventing user enumeration. |
| **T - Tampering** | T-T1 | Payment Service | Client-side price tampering: Attacker modifies `amount` in JSON payload to pay $1 instead of $100 doctor consultation fee. | Financial loss; service theft | **High** | Authoritative server-side fee validation against `doctor-service` consultation rates. |
| **T - Tampering** | T-T2 | Patient Service | Malicious modification of medical report metadata or patient clinical notes across unauthorized user IDs. | Corruption of clinical records; incorrect medical diagnosis | **Critical** | Strict Object-Level Authorization (BOLA/IDOR defense) enforcing doctor-patient relationship checks. |
| **R - Repudiation** | T-R1 | Telemedicine / Reports | A physician or patient denies downloading sensitive medical reports or attending a virtual consultation. | Inability to establish forensic audit trail for HIPAA compliance | **Medium** | Structured audit logging capturing timestamp, requester user ID, IP address, and report ID. |
| **I - Information Disclosure** | T-I1 | Repositories & Configs | Hardcoded cloud database connection strings (`admin:1234@cluster0...`) and Gmail app passwords in version control. | Direct database dump; unauthenticated breach of all platform records | **Critical** | Removal of all hardcoded credentials; parameterization via `.env`; secret rotation; `.gitignore` enforcement. |
| **I - Information Disclosure** | T-I2 | Patient Auth Controller | Response payload on registration and login returns full user document including bcrypt password hashes. | Offline dictionary/rainbow table attacks against hashed credentials | **High** | Sanitization layer (`sanitizeUser`) stripping `password` fields before emitting JSON responses. |
| **I - Information Disclosure** | T-I3 | Auth Controller Error Codes | Distinct HTTP responses (`404 User not found` vs `400 Invalid credentials`) allow email harvesting. | Reconnaissance for targeted phishing campaigns against hospital staff | **Medium** | Unified `401 Unauthorized` response with identical message and timing normalization. |
| **D - Denial of Service** | T-D1 | Report Upload Middleware | Unrestricted file uploads allow unbounded multi-gigabyte file submissions, exhausting container memory and storage quotas. | Application crash; unavailability of medical services | **High** | Multer file size limiter (5MB max) and strict MIME type / magic byte validation. |
| **D - Denial of Service** | T-D2 | Edge Gateway | High-frequency automated HTTP floods against `/api/auth/login` or query endpoints degrade platform performance. | Microservice starvation | **Medium** | Dual-tier rate limiting: global window limiter + strict authentication endpoint limiter. |
| **E - Elevation of Privilege** | T-E1 | Patient Registration | Mass assignment vulnerability allows anonymous users to pass `{ role: "admin" }` during public self-registration. | Complete platform compromise; full administrative control | **Critical** | Hardcoded role assignment (`role: "patient"`) on public registration; administrative provisioning endpoint (`POST /api/admin/users`). |
| **E - Elevation of Privilege** | T-E2 | Internal Service Calls | Unauthenticated actor on internal network bridge attempts to directly invoke backend microservice ports. | Bypass of Gateway authentication | **Medium** | Docker port mapping restrictions (exposing only Port 5000 externally; internal microservices accessible only via Docker bridge). |

---

## 4. Threat Mitigation & Verification Mapping

```
 [ STRIDE Threat Identified ] ───► [ Security Engineering Control ] ───► [ Automated Verification ]
 ─────────────────────────────────────────────────────────────────────────────────────────────────
  I-1: Hardcoded Secrets          .env parameterization + CSPRNG         test_v1_secrets.js
  E-1: Mass Assignment            Strict role: "patient" whitelisting    test_v2_auth_hardening.js
  I-2: Password Hash Leak         sanitizeUser DTO transformation        test_v2_auth_hardening.js
  I-3: User Enumeration           Unified 401 & timing normalization     test_v2_auth_hardening.js
  T-1: Price Tampering            Server-side authoritative lookup       Member 3 DAST verification
  D-1: File Upload DoS            5MB file size limit + MIME check       Member 4 Multer verification
```

---

## 5. Software Engineering Best Practices (Secure SDLC & DevSecOps)

To prevent vulnerabilities from entering production codebases in future engineering cycles, the following DevSecOps practices are mandated:

### 5.1 Shift-Left Security in CI/CD Pipelines
1. **Automated Secret Scanning**:
   - Integrate tools like `TruffleHog` or `GitGuardian` in pre-commit git hooks (`husky`) and GitHub Actions workflows to reject commits containing API keys, private keys, or credentials.
2. **Static Application Security Testing (SAST)**:
   - Run `Semgrep` and `ESLint Security Plugin` on every pull request to catch mass assignment, NoSQL injection patterns, and unsafe `eval` or deserialization calls.
3. **Software Composition Analysis (SCA)**:
   - Automated `OWASP Dependency-Check` or `npm audit` execution blocking builds on high/critical CVEs in 3rd party packages.

### 5.2 Secure Configuration Management
- Never store production credentials in `docker-compose.yml` or Kubernetes deployment manifests.
- Employ dedicated Key Management Systems (e.g., HashiCorp Vault, AWS Secrets Manager, or Doppler) with dynamic secret generation and automated credential rotation.
- Enforce strict Least Privilege Principle across database users (e.g., distinct database users per microservice rather than a shared root administrator).
