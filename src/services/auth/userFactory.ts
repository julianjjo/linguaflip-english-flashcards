import type { UserDocument } from '../../types/database.ts';

interface CreateNewUserOptions {
  userId: string;
  email: string;
  username?: string;
  passwordHash: string;
  emailVerified?: boolean;
  emailVerificationToken?: string;
}

export function createNewUser({
  userId,
  email,
  username,
  passwordHash,
  emailVerified = false,
  emailVerificationToken,
}: CreateNewUserOptions): Omit<
  UserDocument,
  '_id' | 'createdAt' | 'updatedAt'
> {
  const now = new Date();

  return {
    userId,
    email,
    username,
    preferences: {
      theme: 'light',
      language: 'en',
      audioEnabled: true,
      studyReminders: true,
    },
    statistics: {
      totalCardsStudied: 0,
      totalStudyTime: 0,
      averageRecallRate: 0,
      streakDays: 0,
      lastStudyDate: undefined,
      cardsMastered: 0,
      totalSessions: 0,
    },
    authentication: {
      password: passwordHash,
      emailVerified,
      emailVerificationToken,
      emailVerifiedAt: emailVerified ? now : undefined,
      passwordChangedAt: now,
      passwordResetToken: undefined,
      passwordResetExpires: undefined,
      refreshTokens: [],
    },
    security: {
      lastLogin: undefined,
      lastLoginIP: undefined,
      loginAttempts: 0,
      accountLocked: false,
      accountLockedUntil: undefined,
      suspiciousActivity: [],
    },
    profile: {
      joinDate: now,
    },
  };
}
