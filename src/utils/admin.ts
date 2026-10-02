/**
 * Superadmin authorization and utilities.
 */

export const SUPERADMIN_EMAIL = 'johnantony271@gmail.com';

/**
 * Checks if the currently authenticated Firebase user is the designated superadmin.
 */
export function isSuperAdmin(user?: { email?: string | null } | null): boolean {
  if (!user || !user.email) return false;
  return user.email.trim().toLowerCase() === SUPERADMIN_EMAIL;
}

/**
 * Determines whether the user has full unlocked access (either activated locally or superadmin).
 */
export function hasFullAccess(activated: boolean, user?: { email?: string | null } | null): boolean {
  return !!activated || isSuperAdmin(user);
}

