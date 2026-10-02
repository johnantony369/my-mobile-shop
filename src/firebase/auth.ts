import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  linkWithPopup,
  linkWithPhoneNumber,
  unlink
} from 'firebase/auth';
import { auth, googleProvider } from './config';

export function formatLoginIdToEmail(loginId: string): string {
  const trimmed = loginId.trim().toLowerCase();
  if (trimmed.includes('@')) {
    return trimmed;
  }
  const sanitized = trimmed.replace(/[^a-z0-9_.-]/g, '_');
  return `${sanitized}@mymobileshop.app`;
}

export async function loginWithPassword(loginId: string, password: string): Promise<User> {
  if (!auth) {
    throw new Error('Firebase Auth not configured');
  }
  const email = formatLoginIdToEmail(loginId);
  const result = await signInWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function registerWithPassword(loginId: string, password: string): Promise<User> {
  if (!auth) {
    throw new Error('Firebase Auth not configured');
  }
  const email = formatLoginIdToEmail(loginId);
  const result = await createUserWithEmailAndPassword(auth, email, password);
  return result.user;
}

export async function loginWithGoogle(): Promise<User> {
  if (!auth || !googleProvider) {
    throw new Error('Firebase Auth not configured');
  }
  const result = await signInWithPopup(auth, googleProvider);
  return result.user;
}

export function createRecaptchaVerifier(containerId: string): RecaptchaVerifier {
  if (!auth) {
    throw new Error('Firebase Auth not configured');
  }
  return new RecaptchaVerifier(auth, containerId, {
    size: 'invisible',
  });
}

export async function sendOtp(
  phoneNumber: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  if (!auth) {
    throw new Error('Firebase Auth not configured');
  }
  return await signInWithPhoneNumber(auth, phoneNumber, verifier);
}

export async function confirmOtp(
  confirmation: ConfirmationResult,
  code: string
): Promise<User> {
  const result = await confirmation.confirm(code);
  return result.user;
}

export async function logout(): Promise<void> {
  if (!auth) return;
  await signOut(auth);
}

export function subscribeToAuthChanges(callback: (user: User | null) => void): () => void {
  if (!auth) {
    callback(null);
    return () => {};
  }
  return onAuthStateChanged(auth, callback);
}

export async function linkGoogleAccount(user: User): Promise<User> {
  if (!auth || !googleProvider) {
    throw new Error('Firebase Auth not configured');
  }
  const result = await linkWithPopup(user, googleProvider);
  return result.user;
}

export async function sendLinkPhoneOtp(
  user: User,
  phoneNumber: string,
  verifier: RecaptchaVerifier
): Promise<ConfirmationResult> {
  if (!auth) {
    throw new Error('Firebase Auth not configured');
  }
  return await linkWithPhoneNumber(user, phoneNumber, verifier);
}

export async function confirmLinkPhoneOtp(
  confirmation: ConfirmationResult,
  code: string
): Promise<User> {
  const result = await confirmation.confirm(code);
  return result.user;
}

export async function unlinkAuthProvider(user: User, providerId: string): Promise<User> {
  return await unlink(user, providerId);
}

