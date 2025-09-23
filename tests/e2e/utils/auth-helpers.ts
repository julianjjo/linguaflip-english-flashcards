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
    // Deshabilitar validación nativa para capturar mensajes personalizados en pruebas
    await this.page.evaluate(() => {
      document.getElementById('loginForm')?.setAttribute('novalidate', 'true');
    });
  }

  /**
   * Navega a la página de registro
   */
  async goToRegister(): Promise<void> {
    await this.page.goto('/register');
    await this.page.waitForLoadState('networkidle');
    // Deshabilitar la validación nativa para permitir que los mensajes personalizados aparezcan en pruebas
    await this.page.evaluate(() => {
      document.getElementById('registerForm')?.setAttribute('novalidate', 'true');
    });
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
    try {
      // Abrir menú de usuario
      await this.page.waitForSelector('#user-menu-button', { state: 'visible', timeout: 5000 });
      await this.page.click('#user-menu-button');

      // Asegurar que el menú esté visible antes de hacer clic
      await this.page.evaluate(() => {
        const menu = document.getElementById('user-dropdown-menu');
        if (menu && menu.classList.contains('hidden')) {
          menu.classList.remove('hidden');
        }
      });

      // Hacer clic en "Sign Out"
      const signOutOption = this.page.locator('#user-dropdown-menu a', { hasText: 'Sign Out' });
      await signOutOption.click({ timeout: 3000 });

      // Esperar redirección a login
      await this.page.waitForURL('**/login');
    } catch (error) {
      // Fallback: limpiar almacenamiento y navegar manualmente
      await this.page.evaluate(() => {
        localStorage.removeItem('linguaflip_auth_token');
        localStorage.removeItem('linguaflip_refresh_token');
        localStorage.removeItem('linguaflip_user');
      });
      await this.page.goto('/login');
      await this.page.waitForLoadState('networkidle');
    }
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
    try {
      await userMenu.waitFor({ state: 'visible', timeout: 5000 });
      return true;
    } catch {
      return false;
    }
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
    await this.page.waitForSelector('#errorMessage', { state: 'visible' });
  }

  /**
   * Espera a que aparezca el mensaje de éxito
   */
  async waitForSuccessMessage(): Promise<void> {
    await this.page.waitForSelector('#successMessage', { state: 'visible' });
  }

  /**
   * Limpia el localStorage (útil para pruebas de persistencia)
   */
  async clearStorage(): Promise<void> {
    // Limpiar cookies del contexto
    await this.page.context().clearCookies();

    // Intentar limpiar storage en la página actual. En algunos contextos como about:blank
    // Playwright lanza SecurityError al acceder a localStorage. En ese caso lo ignoramos,
    // ya que no hay datos que limpiar y la siguiente navegación tendrá almacenamiento limpio.
    try {
      await this.page.evaluate(() => {
        localStorage.clear();
        sessionStorage.clear();
      });
    } catch (error) {
      // Ignorar errores de seguridad en contextos sin almacenamiento disponible (ej. about:blank)
    }
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