import { AuthError, type UserRecord } from './types';
import { getSessionUser } from './session';

/**
 * Role-Based Access Control (RBAC) guard for Server Actions and API Route Handlers.
 *
 * Rules:
 * - Throws 401 Unauthorized if the user is not authenticated.
 * - Throws 403 Forbidden if the user's role is not within `allowedRoles`.
 * - Returns the fresh `UserRecord` if the user is authorized.
 */
export async function requireRole(
  allowedRoles: string[],
  tokenOverride?: string
): Promise<UserRecord> {
  const user = await getSessionUser(tokenOverride);

  if (!user) {
    throw new AuthError(
      'Authentication required. Please sign in to access this resource.',
      401,
      'UNAUTHENTICATED'
    );
  }

  if (!allowedRoles.includes(user.role)) {
    throw new AuthError(
      `Access forbidden. Role '${user.role}' is not authorized for this resource. Required: [${allowedRoles.join(', ')}].`,
      403,
      'FORBIDDEN'
    );
  }

  return user;
}
