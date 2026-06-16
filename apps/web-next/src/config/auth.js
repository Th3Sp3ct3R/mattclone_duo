export const AUTH_COOKIE_NAME = 'base.auth';

export function getJwtSecret() {
  return process.env.JWT_SECRET || '';
}
