import type { UserDocument } from '../../types/database.ts';
import type { SanitizedAuthentication } from './types.ts';

export function sanitizeUserForResponse(
  user: UserDocument
): Partial<UserDocument> {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { authentication, security, ...sanitizedUser } = user;

  return {
    ...sanitizedUser,
    authentication: {
      password: '',
      emailVerified: authentication.emailVerified,
      emailVerifiedAt: authentication.emailVerifiedAt,
      passwordChangedAt: authentication.passwordChangedAt,
      refreshTokens: [],
    } as SanitizedAuthentication,
  };
}
