const SECRET_SALT = "REPLACE_WITH_SECRET";

export function computeChecksum(payload: string, salt: string = SECRET_SALT): string {
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

export function formatActivationCode(code: string): string {
  const clean = code.replace(/[^0-9A-Za-z]/g, '').toUpperCase().slice(0, 16);
  const parts: string[] = [];
  for (let i = 0; i < clean.length; i += 4) {
    parts.push(clean.slice(i, i + 4));
  }
  return parts.join('-');
}

export function checkCode(code: string): boolean {
  if (!code) return false;
  const clean = code.replace(/[^0-9A-Za-z]/g, '').toUpperCase();
  if (clean.length !== 16) return false;
  
  const payload = clean.slice(0, 12);
  const givenChecksum = clean.slice(12);
  const calculatedChecksum = computeChecksum(payload, SECRET_SALT);
  
  return givenChecksum === calculatedChecksum;
}

export function generateValidCode(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  let payload = '';
  for (let i = 0; i < 12; i++) {
    payload += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  const checksum = computeChecksum(payload, SECRET_SALT);
  const full = payload + checksum;
  return `${full.slice(0, 4)}-${full.slice(4, 8)}-${full.slice(8, 12)}-${full.slice(12, 16)}`;
}

export const TRIAL_DURATION_DAYS = 2;

/**
 * Calculates remaining trial days given the first launch date string ('YYYY-MM-DD').
 * Allows custom duration (e.g. 7 days for partner referrals).
 */
export function getTrialDaysRemaining(firstLaunchDateStr: string, customDurationDays?: number): number {
  const duration = customDurationDays !== undefined && customDurationDays > 0 ? customDurationDays : TRIAL_DURATION_DAYS;
  if (!firstLaunchDateStr) return duration;
  const firstLaunch = new Date(firstLaunchDateStr);
  const now = new Date();
  
  // Normalize both to midnight local time for exact calendar day counting
  const d1 = new Date(firstLaunch.getFullYear(), firstLaunch.getMonth(), firstLaunch.getDate()).getTime();
  const d2 = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  
  const diffDays = Math.floor((d2 - d1) / (1000 * 60 * 60 * 24));
  const remaining = duration - diffDays;
  return Math.max(0, remaining);
}
