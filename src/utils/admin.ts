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
