import bcrypt from 'bcrypt';

import { ValidationError } from '../../types/database.ts';
import { AUTH_CONFIG } from './config.ts';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, AUTH_CONFIG.bcryptRounds);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function ensurePasswordStrength(password: string, operation = 'validate_password'): void {
  if (password.length < 8) {
    throw new ValidationError(
      'Password must be at least 8 characters long',
      operation,
      'users',
      'password'
    );
  }

  if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(password)) {
    throw new ValidationError(
      'Password must contain at least one lowercase letter, one uppercase letter, and one number',
      operation,
      'users',
      'password'
    );
  }
}
