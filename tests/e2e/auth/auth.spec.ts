// @ts-nocheck
import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../utils/auth-helpers';
import {
  createValidUser,
  createLoginUser,
  createInvalidUser,
  createUserWithInvalidEmail,
  createUserWithWeakPassword,
  createUserWithMismatchedPasswords,
  createUserWithMissingFields,
  VALID_PASSWORD,
} from '../fixtures/users';
import type { TestUser } from '../fixtures/users';

test.describe('Autenticación - LinguaFlip', () => {
  let authHelpers: AuthHelpers;

  const registerTestUser = async (user: TestUser = createValidUser()): Promise<TestUser> => {
    await authHelpers.register(user);
    await authHelpers.waitForDashboardRedirect();
    return user;
  };

  const toCredentials = (user: TestUser) => ({ email: user.email, password: user.password });

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    // Limpiar storage antes de cada prueba
    await authHelpers.clearStorage();
  });

  test.afterEach(async () => {
    // Limpiar storage después de cada prueba
    if (authHelpers) {
      await authHelpers.clearStorage();
    }
  });

  test.describe('Registro de nuevo usuario', () => {
    test('debería permitir el registro exitoso con datos válidos', async ({ page }) => {
      const newUser = createValidUser();

      await authHelpers.register(newUser);

      // Verificar que se muestra el mensaje de éxito
      await authHelpers.waitForSuccessMessage();
      const successMessage = await authHelpers.getSuccessMessage();
      expect(successMessage).toContain('Cuenta creada exitosamente');

      // Verificar redirección al dashboard
      await authHelpers.waitForDashboardRedirect();
      expect(await authHelpers.isOnDashboard()).toBe(true);

      // Verificar que los tokens se guardaron en localStorage
      const tokens = await authHelpers.getStoredTokens();
      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
      expect(tokens.user).toBeTruthy();
    });

    test('debería mostrar error con email inválido', async () => {
      const invalidUser = createUserWithInvalidEmail();

      await authHelpers.register(invalidUser);

      // Verificar que se muestra el mensaje de error
      await authHelpers.waitForErrorMessage();
      const errorMessage = await authHelpers.getErrorMessage();
      expect(errorMessage).toContain('formato del correo electrónico no es válido');
    });

    test('debería mostrar error con contraseña débil', async () => {
      const weakPasswordUser = createUserWithWeakPassword();

      await authHelpers.register(weakPasswordUser);

      // Verificar que se muestra el mensaje de error
      await authHelpers.waitForErrorMessage();
      const errorMessage = await authHelpers.getErrorMessage();
      expect(errorMessage).toContain('contraseña debe tener al menos 8 caracteres');
    });

    test('debería mostrar error con contraseñas que no coinciden', async () => {
      const mismatchedUser = createUserWithMismatchedPasswords();

      await authHelpers.register(mismatchedUser);

      // Verificar que se muestra el mensaje de error
      await authHelpers.waitForErrorMessage();
      const errorMessage = await authHelpers.getErrorMessage();
      expect(errorMessage).toContain('Las contraseñas no coinciden');
    });

    test('debería mostrar error sin aceptar términos de servicio', async () => {
      const userWithoutTerms = createValidUser();

      await authHelpers.goToRegister();
      await authHelpers.fillRegisterForm(userWithoutTerms);

      // No marcar los términos de servicio
      await authHelpers.page.uncheck('#terms');

      await authHelpers.submitRegister();

      // Verificar que se muestra el mensaje de error
      await authHelpers.waitForErrorMessage();
      const errorMessage = await authHelpers.getErrorMessage();
      expect(errorMessage).toContain('Debes aceptar los términos de servicio');
    });

    test('debería mostrar error con campos requeridos vacíos', async () => {
      const emptyUser = createUserWithMissingFields();

      await authHelpers.goToRegister();
      await authHelpers.fillRegisterForm(emptyUser as any);
      await authHelpers.submitRegister();

      // Verificar que se muestra el mensaje de error
      await authHelpers.waitForErrorMessage();
      const errorMessage = await authHelpers.getErrorMessage();
      expect(errorMessage).toContain('Todos los campos obligatorios deben ser completados');
    });
  });

  test.describe('Login exitoso', () => {
    test('debería permitir login con credenciales válidas', async () => {
      const validUser = createLoginUser();

      // Primero registrar el usuario
      await authHelpers.register({
        ...validUser,
        username: 'testuser',
        confirmPassword: VALID_PASSWORD,
      });

      // Verificar redirección al dashboard
      await authHelpers.waitForDashboardRedirect();

      // Hacer logout para probar login
      await authHelpers.logout();
      await authHelpers.waitForLoginRedirect();

      // Ahora hacer login
      await authHelpers.fillLoginForm(validUser);
      await authHelpers.submitLogin();

      // Verificar redirección al dashboard
      await authHelpers.waitForDashboardRedirect();
      expect(await authHelpers.isOnDashboard()).toBe(true);

      // Verificar que los tokens se guardaron
      const tokens = await authHelpers.getStoredTokens();
      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
    });

    test('debería mantener la sesión después de recargar la página', async () => {
      const registeredUser = await registerTestUser();
      const credentials = toCredentials(registeredUser);

      // Hacer logout para iniciar el flujo de login
      await authHelpers.logout();
      await authHelpers.waitForLoginRedirect();

      // Login con el usuario recién creado
      await authHelpers.login(credentials);
      await authHelpers.waitForDashboardRedirect();

      // Verificar que estamos en el dashboard
      expect(await authHelpers.isOnDashboard()).toBe(true);

      // Recargar la página
      await authHelpers.reloadWithSession();

      // Verificar que aún estamos autenticados
      expect(await authHelpers.isAuthenticated()).toBe(true);
      expect(await authHelpers.isOnDashboard()).toBe(true);
    });
  });

  test.describe('Login fallido', () => {
    test('debería mostrar error con credenciales inválidas', async () => {
      const invalidUser = createInvalidUser();

      await authHelpers.login(invalidUser);

      // Verificar que se muestra el mensaje de error
      await authHelpers.waitForErrorMessage();
      const errorMessage = await authHelpers.getErrorMessage();
      expect(errorMessage).toContain('Error al iniciar sesión');
    });

    test('debería mostrar error con email vacío', async () => {
      await authHelpers.goToLogin();
      await authHelpers.fillLoginForm({ email: '', password: VALID_PASSWORD });
      await authHelpers.submitLogin();

      // Verificar que se muestra el mensaje de error
      await authHelpers.waitForErrorMessage();
      const errorMessage = await authHelpers.getErrorMessage();
      expect(errorMessage).toContain('Todos los campos obligatorios deben ser completados');
    });

    test('debería mostrar error con contraseña vacía', async () => {
      const userWithEmptyPassword = createLoginUser();

      await authHelpers.goToLogin();
      await authHelpers.fillLoginForm({ email: userWithEmptyPassword.email, password: '' });
      await authHelpers.submitLogin();

      // Verificar que se muestra el mensaje de error
      await authHelpers.waitForErrorMessage();
      const errorMessage = await authHelpers.getErrorMessage();
      expect(errorMessage).toContain('Todos los campos obligatorios deben ser completados');
    });
  });

  test.describe('Logout', () => {
    test('debería cerrar sesión correctamente', async () => {
      await registerTestUser();

      // Verificar que estamos autenticados
      expect(await authHelpers.isAuthenticated()).toBe(true);
      expect(await authHelpers.isOnDashboard()).toBe(true);

      // Hacer logout
      await authHelpers.logout();

      // Verificar redirección al login
      expect(await authHelpers.isOnLoginPage()).toBe(true);

      // Verificar que no hay tokens en localStorage
      const tokens = await authHelpers.getStoredTokens();
      expect(tokens.accessToken).toBeNull();
      expect(tokens.refreshToken).toBeNull();
      expect(tokens.user).toBeNull();
    });

    test('debería limpiar la sesión completamente', async () => {
      await registerTestUser();

      // Verificar tokens existen
      const tokensBefore = await authHelpers.getStoredTokens();
      expect(tokensBefore.accessToken).toBeTruthy();

      // Logout
      await authHelpers.logout();

      // Verificar tokens fueron eliminados
      const tokensAfter = await authHelpers.getStoredTokens();
      expect(tokensAfter.accessToken).toBeNull();
      expect(tokensAfter.refreshToken).toBeNull();
      expect(tokensAfter.user).toBeNull();
    });
  });

  test.describe('Validación de formularios', () => {
    test('debería validar formato de email en tiempo real', async ({ page }) => {
      await authHelpers.goToRegister();

      // Email inválido
      await page.fill('#email', 'invalid-email');
      await page.fill('#password', VALID_PASSWORD);
      await page.fill('#confirmPassword', VALID_PASSWORD);
      await page.check('#terms');

      await authHelpers.submitRegister();

      // Verificar error de formato de email
      await authHelpers.waitForErrorMessage();
      const errorMessage = await authHelpers.getErrorMessage();
      expect(errorMessage).toContain('formato del correo electrónico no es válido');
    });

    test('debería validar longitud de contraseña en tiempo real', async ({ page }) => {
      await authHelpers.goToRegister();

      // Contraseña muy corta
      await page.fill('#email', 'test@example.com');
      await page.fill('#password', '123');
      await page.fill('#confirmPassword', '123');
      await page.check('#terms');

      await authHelpers.submitRegister();

      // Verificar error de longitud de contraseña
      await authHelpers.waitForErrorMessage();
      const errorMessage = await authHelpers.getErrorMessage();
      expect(errorMessage).toContain('contraseña debe tener al menos 8 caracteres');
    });

    test('debería validar requisitos de contraseña en tiempo real', async ({ page }) => {
      await authHelpers.goToRegister();

      // Contraseña sin mayúscula
      await page.fill('#email', 'test@example.com');
      await page.fill('#password', 'password123');
      await page.fill('#confirmPassword', 'password123');
      await page.check('#terms');

      await authHelpers.submitRegister();

      // Verificar error de requisitos de contraseña
      await authHelpers.waitForErrorMessage();
      const errorMessage = await authHelpers.getErrorMessage();
      expect(errorMessage).toContain('Debe contener al menos una letra mayúscula');
    });
  });

  test.describe('Persistencia de sesión', () => {
    test('debería mantener la sesión después de recargar la página', async () => {
      await registerTestUser();

      // Verificar que estamos en el dashboard
      expect(await authHelpers.isOnDashboard()).toBe(true);

      // Recargar la página
      await authHelpers.reloadWithSession();

      // Verificar que aún estamos autenticados y en el dashboard
      expect(await authHelpers.isAuthenticated()).toBe(true);
      expect(await authHelpers.isOnDashboard()).toBe(true);

      // Verificar que los tokens aún existen
      const tokens = await authHelpers.getStoredTokens();
      expect(tokens.accessToken).toBeTruthy();
      expect(tokens.refreshToken).toBeTruthy();
    });

    test('debería limpiar la sesión al hacer logout', async () => {
      await registerTestUser();

      // Verificar tokens existen
      const tokensBefore = await authHelpers.getStoredTokens();
      expect(tokensBefore.accessToken).toBeTruthy();

      // Logout
      await authHelpers.logout();

      // Verificar tokens fueron eliminados
      const tokensAfter = await authHelpers.getStoredTokens();
      expect(tokensAfter.accessToken).toBeNull();
      expect(tokensAfter.refreshToken).toBeNull();
      expect(tokensAfter.user).toBeNull();
    });
  });

  test.describe('Navegación y estados de UI', () => {
    test('debería mostrar elementos de loading durante el registro', async ({ page }) => {
      const newUser = createValidUser();

      await authHelpers.goToRegister();
      await authHelpers.fillRegisterForm(newUser);
      await authHelpers.submitRegister();

      // Verificar que el botón muestra estado de loading
      const loadingSpinner = page.locator('#loadingSpinner');
      await expect(loadingSpinner).toBeVisible();

      // Verificar que el botón está deshabilitado
      const registerButton = page.locator('#registerButton');
      await expect(registerButton).toBeDisabled();

      // Esperar a que el loading termine
      await authHelpers.waitForLoadingToComplete();
    });

    test('debería mostrar elementos de loading durante el login', async ({ page }) => {
      const registeredUser = await registerTestUser();
      const credentials = toCredentials(registeredUser);

      await authHelpers.logout();
      await authHelpers.waitForLoginRedirect();

      await authHelpers.goToLogin();
      await authHelpers.fillLoginForm(credentials);
      await authHelpers.submitLogin();

      // Verificar que el botón muestra estado de loading
      const loadingSpinner = page.locator('#loadingSpinner');
      await expect(loadingSpinner).toBeVisible();

      // Verificar que el botón está deshabilitado
      const loginButton = page.locator('#loginButton');
      await expect(loginButton).toBeDisabled();

      // Esperar a que el loading termine
      await authHelpers.waitForLoadingToComplete();
    });

    test('debería alternar visibilidad de contraseña', async ({ page }) => {
      await authHelpers.goToLogin();

      // Verificar que la contraseña está oculta inicialmente
      const passwordInput = page.locator('#password');
      await expect(passwordInput).toHaveAttribute('type', 'password');

      // Hacer clic en el botón de mostrar/ocultar
      const toggleButton = page.locator('[onclick*="togglePasswordVisibility"]');
      await toggleButton.click();

      // Verificar que la contraseña ahora es visible
      await expect(passwordInput).toHaveAttribute('type', 'text');

      // Hacer clic de nuevo para ocultar
      await toggleButton.click();

      // Verificar que la contraseña está oculta nuevamente
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });
});