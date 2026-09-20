#!/usr/bin/env node
/**
 * Cryptographically Secure JWT Secret Generator
 * 
 * CWE-330: Use of Insufficiently Random Values
 * OWASP Top 10 - A02:2021 Cryptographic Failures
 * 
 * Uses Node.js crypto.randomBytes (CSPRNG) to generate a 256-bit (32-byte)
 * cryptographically secure random hexadecimal key suitable for HMAC-SHA256 JWT signing.
 */

const crypto = require('crypto');

function generateSecret() {
  const secret = crypto.randomBytes(32).toString('hex');
  console.log('================================================================');
  console.log('  Cryptographically Secure JWT Secret Generated (256-bit HMAC)  ');
  console.log('================================================================');
  console.log(`\nGenerated Key:  ${secret}\n`);
  console.log('Usage:');
  console.log('  1. Copy this key into your local .env file:');
  console.log(`     JWT_SECRET=${secret}`);
  console.log('  2. Never commit .env files containing real secret keys to Git.');
  console.log('================================================================\n');
}

generateSecret();
