/**
 * Security Audit Test: V1 - Hardcoded Secrets & Cloud Credentials Scanner
 * 
 * CWE-798: Use of Hard-coded Credentials
 * OWASP Top 10 - A02:2021 Cryptographic Failures / A05:2021 Security Misconfiguration
 * 
 * This test inspects repository configuration and code files for hardcoded
 * sensitive strings, default secrets, and plaintext cloud database connection URIs.
 */

const fs = require('fs');
const path = require('path');

const REPO_ROOT = path.resolve(__dirname, '../..');

const SUSPICIOUS_PATTERNS = [
  {
    name: 'Hardcoded Weak JWT Secret',
    pattern: /supersecretkey/i,
    severity: 'HIGH',
    cwe: 'CWE-798'
  },
  {
    name: 'Hardcoded MongoDB Atlas Connection String with Credentials',
    pattern: /mongodb\+srv:\/\/[a-zA-Z0-9_-]+:[a-zA-Z0-9_-]+@/i,
    severity: 'CRITICAL',
    cwe: 'CWE-798'
  },
  {
    name: 'Exposed Gmail App Password',
    pattern: /pqcg\s+bppq\s+drkp\s+hbta/i,
    severity: 'CRITICAL',
    cwe: 'CWE-798'
  },
  {
    name: 'Hardcoded Cloud Connection in Source File',
    pattern: /mongoose\.connect\(['"`]mongodb\+srv:\/\//i,
    severity: 'HIGH',
    cwe: 'CWE-798'
  }
];

const TARGET_FILES = [
  'docker-compose.yml',
  'payment-service/src/server.js',
  'notification-service/src/server.js',
  'patient-service/server.js',
  'doctor-service/server.js',
  'appointment-service/server.js'
];

function runAudit() {
  console.log('===========================================================');
  console.log('  Running Security Audit: Detection of Hardcoded Secrets   ');
  console.log('  Target Scope: Microservices Configs & Source Files       ');
  console.log('===========================================================\n');

  let findingsCount = 0;
  const findings = [];

  for (const relativePath of TARGET_FILES) {
    const fullPath = path.join(REPO_ROOT, relativePath);
    if (!fs.existsSync(fullPath)) {
      continue;
    }

    const content = fs.readFileSync(fullPath, 'utf8');
    const lines = content.split('\n');

    for (const rule of SUSPICIOUS_PATTERNS) {
      lines.forEach((line, index) => {
        if (rule.pattern.test(line)) {
          findingsCount++;
          findings.push({
            file: relativePath,
            line: index + 1,
            rule: rule.name,
            severity: rule.severity,
            cwe: rule.cwe,
            snippet: line.trim()
          });
        }
      });
    }
  }

  if (findingsCount > 0) {
    console.error(`❌ VULNERABILITY DETECTED: Found ${findingsCount} instance(s) of hardcoded secrets!\n`);
    findings.forEach((f, idx) => {
      console.error(`[Finding #${idx + 1}] [${f.severity}] ${f.rule} (${f.cwe})`);
      console.error(`   File: ${f.file}:${f.line}`);
      console.error(`   Snippet: "${f.snippet}"\n`);
    });
    console.error('RESULT: FAILED - Secrets must be extracted to environment variables and .env templates.\n');
    return false;
  } else {
    console.log('✅ PASS: No hardcoded secrets or cloud credentials found in monitored files.');
    return true;
  }
}

const passed = runAudit();
process.exit(passed ? 0 : 1);
