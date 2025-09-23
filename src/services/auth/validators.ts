import { ValidationError } from '../../types/database.ts';

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function assertValidEmail(email: string, operation: string): void {
  if (!EMAIL_REGEX.test(email)) {
    throw new ValidationError(
      'Invalid email format',
      operation,
      'users',
      'email',
      email
    );
  }
}

export function isEmailFormatValid(email: string): boolean {
  return EMAIL_REGEX.test(email);
}
