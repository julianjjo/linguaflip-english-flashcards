/**
 * Fixtures para datos de prueba de usuarios
 * Genera datos únicos para evitar conflictos entre pruebas
 */

export interface TestUser {
  email: string;
  username?: string;
  password: string;
  confirmPassword?: string;
}

export interface UserCredentials {
  email: string;
  password: string;
}

/**
 * Genera un email único para pruebas usando timestamp
 */
export function generateUniqueEmail(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 8);
  return `testuser_${timestamp}_${random}@linguaflip.test`;
}

/**
 * Genera un username único para pruebas
 */
export function generateUniqueUsername(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 6);
  return `testuser_${timestamp}_${random}`;
}

/**
 * Contraseña válida para pruebas
 */
export const VALID_PASSWORD = 'TestPass123!';

/**
 * Usuario válido para pruebas de registro y login
 */
export function createValidUser(): TestUser {
  return {
    email: generateUniqueEmail(),
    username: generateUniqueUsername(),
    password: VALID_PASSWORD,
    confirmPassword: VALID_PASSWORD,
  };
}

/**
 * Usuario para pruebas de login exitoso
 */
export function createLoginUser(): UserCredentials {
  return {
    email: generateUniqueEmail(),
    password: VALID_PASSWORD,
  };
}

/**
 * Usuario para pruebas de login fallido
 */
export function createInvalidUser(): UserCredentials {
  return {
    email: 'invalid@test.com',
    password: 'wrongpassword',
  };
}

/**
 * Usuario con email inválido
 */
export function createUserWithInvalidEmail(): TestUser {
  return {
    email: 'invalid-email-format',
    password: VALID_PASSWORD,
    confirmPassword: VALID_PASSWORD,
  };
}

/**
 * Usuario con contraseña débil
 */
export function createUserWithWeakPassword(): TestUser {
  return {
    email: generateUniqueEmail(),
    password: '123',
    confirmPassword: '123',
  };
}

/**
 * Usuario con contraseñas que no coinciden
 */
export function createUserWithMismatchedPasswords(): TestUser {
  return {
    email: generateUniqueEmail(),
    password: VALID_PASSWORD,
    confirmPassword: 'DifferentPass123!',
  };
}

/**
 * Usuario sin campos requeridos
 */
export function createUserWithMissingFields(): Partial<TestUser> {
  return {
    email: '', // Campo requerido vacío
    password: '', // Campo requerido vacío
  };
}