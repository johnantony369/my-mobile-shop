import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

const STORAGE_KEY_CODE = 'mms_partner_code';
const STORAGE_KEY_TIME = 'mms_partner_code_time';
const ATTRIBUTION_WINDOW_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

function getStorage(): Storage | null {
  if (typeof globalThis !== 'undefined' && globalThis.localStorage) {
    return globalThis.localStorage;
  }
  return null;
}

export function saveReferralCode(rawCode: string): void {
  if (!rawCode) return;
  const sanitized = rawCode.trim().toUpperCase();
  if (sanitized.length < 3 || sanitized.length > 20) return;
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.setItem(STORAGE_KEY_CODE, sanitized);
    storage.setItem(STORAGE_KEY_TIME, String(Date.now()));
  } catch (err) {
    console.warn('Could not save partner referral code:', err);
  }
}

export function getStoredReferralCode(): string | null {
  const storage = getStorage();
  if (!storage) return null;
  try {
    const code = storage.getItem(STORAGE_KEY_CODE);
    const timestampStr = storage.getItem(STORAGE_KEY_TIME);
    if (!code || !timestampStr) return null;

    const timestamp = Number(timestampStr);
    if (isNaN(timestamp) || Date.now() - timestamp > ATTRIBUTION_WINDOW_MS) {
      clearStoredReferralCode();
      return null;
    }
    return code;
  } catch {
    return null;
  }
}

export function clearStoredReferralCode(): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(STORAGE_KEY_CODE);
    storage.removeItem(STORAGE_KEY_TIME);
  } catch (err) {
    console.warn('Could not clear partner referral code:', err);
  }
}

export function useReferralCapture(): string | null {
  const [searchParams] = useSearchParams();
  const [partnerCode, setPartnerCode] = useState<string | null>(getStoredReferralCode());

  useEffect(() => {
    const paramCode = searchParams.get('ref') || searchParams.get('partner');
    if (paramCode) {
      saveReferralCode(paramCode);
      setPartnerCode(paramCode.trim().toUpperCase());
    }
  }, [searchParams]);

  return partnerCode;
}
