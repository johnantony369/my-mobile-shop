import {
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  User,
  RecaptchaVerifier,
  signInWithPhoneNumber,
  ConfirmationResult
} from 'firebase/auth';
import { auth, googleProvider } from './config';

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
