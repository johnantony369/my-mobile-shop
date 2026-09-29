#!/usr/bin/env node

/**
 * CLI utility to generate valid activation codes for My Mobile Shop.
 * Usage: node scripts/gen-code.js [count]
 */

const SECRET_SALT = "REPLACE_WITH_SECRET";

function computeChecksum(payload, salt = SECRET_SALT) {
  let h1 = 0x811c9dc5;
  let h2 = 0x55555555;
  const str = payload + "::" + salt;
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    h1 ^= code;
    h1 = Math.imul(h1, 0x01000193);
    h2 ^= (code << (i % 4));
    h2 = Math.imul(h2, 0x45d9f3b);
  }
  const combined = Math.abs(h1 ^ h2) % 1679616; // 36^4
  return combined.toString(36).toUpperCase().padStart(4, '0');
}

function generateCode() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let payload = '';
  for (let i = 0; i < 12; i++) {
    payload += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const checksum = computeChecksum(payload);
  const full = payload + checksum;
  return `${full.slice(0, 4)}-${full.slice(4, 8)}-${full.slice(8, 12)}-${full.slice(12, 16)}`;
}

const count = parseInt(process.argv[2], 10) || 5;

console.log(`\n========================================`);
console.log(`My Mobile Shop — Activation Code Generator`);
console.log(`Generating ${count} valid activation code(s)...`);
console.log(`========================================\n`);

for (let i = 1; i <= count; i++) {
  const code = generateCode();
  console.log(`  [${i.toString().padStart(2, '0')}]  ${code}`);
}

console.log(`\n========================================\n`);
