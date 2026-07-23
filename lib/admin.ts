export const SUPER_ADMIN_USERNAME = "tharizin";

export function isSuperAdminUsername(username: string): boolean {
  return username.trim().toLowerCase() === SUPER_ADMIN_USERNAME;
}

export function resolveIsAdmin(profile: { username: string; is_admin?: boolean | null }): boolean {
  return !!profile.is_admin || isSuperAdminUsername(profile.username);
}

export function isProtectedAdminUsername(username: string): boolean {
  return isSuperAdminUsername(username);
}
