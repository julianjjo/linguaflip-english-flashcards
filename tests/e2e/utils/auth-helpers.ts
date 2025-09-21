import type { Page } from '@playwright/test';
import type { TestUser, UserCredentials } from '../fixtures/users';

/**
 * Utilidades para pruebas de autenticación
 * Proporciona métodos para interactuar con formularios de login y registro
 */

export class AuthHelpers {
  constructor(public page: Page) {}

  /**
   * Navega a la página de login
   */
  async goToLogin(): Promise<void> {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navega a la página de registro
   */
  async goToRegister(): Promise<void> {
    await this.page.goto('/register');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Llena el formulario de login
   */
  async fillLoginForm(credentials: UserCredentials): Promise<void> {
    await this.page.fill('#email', credentials.email);
    await this.page.fill('#password', credentials.password);
  }

  /**
   * Llena el formulario de registro
   */
  async fillRegisterForm(user: TestUser): Promise<void> {
    await this.page.fill('#email', user.email);

    if (user.username) {
      await this.page.fill('#username', user.username);
    }

    await this.page.fill('#password', user.password);

    if (user.confirmPassword) {
      await this.page.fill('#confirmPassword', user.confirmPassword);
    }

    // Aceptar términos de servicio
    await this.page.check('#terms');
  }

  /**
   * Envía el formulario de login
   */
  async submitLogin(): Promise<void> {
    await this.page.click('#loginButton');
  }

  /**
   * Envía el formulario de registro
   */
  async submitRegister(): Promise<void> {
    await this.page.click('#registerButton');
  }

  /**
   * Realiza login completo
   */
  async login(credentials: UserCredentials): Promise<void> {
    await this.goToLogin();
    await this.fillLoginForm(credentials);
    await this.submitLogin();
  }

  /**
   * Realiza registro completo
   */
  async register(user: TestUser): Promise<void> {
    await this.goToRegister();
    await this.fillRegisterForm(user);
    await this.submitRegister();
  }

  /**
   * Realiza logout desde el menú de usuario
   */
  async logout(): Promise<void> {
    // Abrir menú de usuario
    await this.page.click('#user-menu-button');

    // Hacer clic en "Sign Out"
    await this.page.click('text=Sign Out');

    // Esperar redirección a login
    await this.page.waitForURL('**/login');
  }

  /**
   * Obtiene el mensaje de error del formulario
   */
  async getErrorMessage(): Promise<string | null> {
    const errorElement = this.page.locator('#errorText');
    return await errorElement.textContent();
  }

  /**
   * Obtiene el mensaje de éxito del formulario
   */
  async getSuccessMessage(): Promise<string | null> {
    const successElement = this.page.locator('#successText');
    return await successElement.textContent();
  }

  /**
   * Verifica si el usuario está autenticado
   */
  async isAuthenticated(): Promise<boolean> {
    // Verificar si existe el menú de usuario
    const userMenu = this.page.locator('#user-menu-button');
    return await userMenu.isVisible();
  }

  /**
   * Verifica si el usuario está en el dashboard
   */
  async isOnDashboard(): Promise<boolean> {
    return this.page.url().includes('/dashboard');
  }

  /**
   * Verifica si el usuario está en la página de login
   */
  async isOnLoginPage(): Promise<boolean> {
    return this.page.url().includes('/login');
  }

  /**
   * Espera a que el botón de loading desaparezca
   */
  async waitForLoadingToComplete(): Promise<void> {
    await this.page.waitForSelector('#loadingSpinner', { state: 'hidden' });
  }

  /**
   * Espera a que aparezca el mensaje de error
   */
  async waitForErrorMessage(): Promise<void> {
    await this.page.waitForSelector('#errorMessage:not([class*="hidden"])');
  }

  /**
   * Espera a que aparezca el mensaje de éxito
   */
  async waitForSuccessMessage(): Promise<void> {
    await this.page.waitForSelector('#successMessage:not([class*="hidden"])');
  }

  /**
   * Limpia el localStorage (útil para pruebas de persistencia)
   */
  async clearStorage(): Promise<void> {
    await this.page.context().clearCookies();
    // Usar addInitScript para limpiar storage en cada página
    await this.page.addInitScript(() => {
      localStorage.clear();
      sessionStorage.clear();
    });
  }

  /**
   * Obtiene los tokens del localStorage
   */
  async getStoredTokens(): Promise<{
    accessToken: string | null;
    refreshToken: string | null;
    user: string | null;
  }> {
    return await this.page.evaluate(() => {
      try {
        return {
          accessToken: localStorage.getItem('linguaflip_auth_token'),
          refreshToken: localStorage.getItem('linguaflip_refresh_token'),
          user: localStorage.getItem('linguaflip_user'),
        };
      } catch (error) {
        // En caso de error de seguridad, retornar null
        return {
          accessToken: null,
          refreshToken: null,
          user: null,
        };
      }
    });
  }

  /**
   * Simula la recarga de la página manteniendo la sesión
   */
  async reloadWithSession(): Promise<void> {
    await this.page.reload();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Espera a que la página se redirija al dashboard
   */
  async waitForDashboardRedirect(): Promise<void> {
    await this.page.waitForURL('**/dashboard', { timeout: 10000 });
  }

  /**
   * Espera a que la página se redirija al login
   */
  async waitForLoginRedirect(): Promise<void> {
    await this.page.waitForURL('**/login', { timeout: 10000 });
  }
}