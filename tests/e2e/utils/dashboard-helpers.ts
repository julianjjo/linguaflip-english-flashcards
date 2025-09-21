import type { Page } from '@playwright/test';
import type { DashboardData, DashboardSelectors, DashboardTestContext } from '../types/dashboard';

/**
 * Utilidades para interactuar con el dashboard en pruebas E2E
 */
export class DashboardHelpers {
  constructor(private page: Page) {}

  /**
   * Selectores CSS para elementos del dashboard
   */
  getSelectors(): DashboardSelectors {
    return {
      // Estadísticas generales
      statsContainer: '[data-testid="dashboard-stats"]',
      totalFlashcards: '[data-testid="stat-total-flashcards"]',
      studiedToday: '[data-testid="stat-studied-today"]',
      currentStreak: '[data-testid="stat-current-streak"]',
      totalStudyTime: '[data-testid="stat-total-study-time"]',
      averageAccuracy: '[data-testid="stat-average-accuracy"]',

      // Gráficos de progreso
      progressCharts: '[data-testid="progress-charts"]',
      dailyActivityChart: '[data-testid="chart-daily-activity"]',
      weeklyProgressChart: '[data-testid="chart-weekly-progress"]',
      monthlyProgressChart: '[data-testid="chart-monthly-progress"]',
      studyHeatmap: '[data-testid="heatmap-study"]',

      // Acciones rápidas
      quickActions: '[data-testid="quick-actions"]',
      createFlashcardBtn: '[data-testid="btn-create-flashcard"]',
      startStudyBtn: '[data-testid="btn-start-study"]',
      viewProgressBtn: '[data-testid="btn-view-progress"]',

      // Actividad reciente
      recentActivity: '[data-testid="recent-activity"]',
      recentSessions: '[data-testid="recent-sessions"]',
      recentFlashcards: '[data-testid="recent-flashcards"]',

      // Metas de estudio
      studyGoals: '[data-testid="study-goals"]',
      dailyGoal: '[data-testid="goal-daily"]',
      weeklyGoal: '[data-testid="goal-weekly"]',
      monthlyGoal: '[data-testid="goal-monthly"]',
      progressBars: '[data-testid="progress-bars"]',

      // Navegación
      navigation: '[data-testid="navigation"]',
      dashboardNav: '[data-testid="nav-dashboard"]',
      progressNav: '[data-testid="nav-progress"]',
      settingsNav: '[data-testid="nav-settings"]'
    };
  }

  /**
   * Navega al dashboard
   */
  async navigateToDashboard(): Promise<void> {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Espera a que el dashboard cargue completamente
   */
  async waitForDashboardLoad(): Promise<void> {
    const selectors = this.getSelectors();

    // Espera a que los elementos principales estén visibles
    await this.page.waitForSelector(selectors.statsContainer, { timeout: 10000 });
    await this.page.waitForSelector(selectors.progressCharts, { timeout: 10000 });
    await this.page.waitForSelector(selectors.quickActions, { timeout: 10000 });
    await this.page.waitForSelector(selectors.recentActivity, { timeout: 10000 });
  }

  /**
   * Verifica que las estadísticas se muestren correctamente
   */
  async verifyStatsDisplay(data: DashboardData): Promise<void> {
    const selectors = this.getSelectors();

    // Verifica estadísticas principales
    await this.page.waitForSelector(selectors.totalFlashcards);
    const totalFlashcards = await this.page.textContent(selectors.totalFlashcards);
    expect(totalFlashcards).toContain(data.stats.totalFlashcards.toString());

    await this.page.waitForSelector(selectors.studiedToday);
    const studiedToday = await this.page.textContent(selectors.studiedToday);
    expect(studiedToday).toContain(data.stats.studiedToday.toString());

    await this.page.waitForSelector(selectors.currentStreak);
    const currentStreak = await this.page.textContent(selectors.currentStreak);
    expect(currentStreak).toContain(data.stats.currentStreak.toString());

    await this.page.waitForSelector(selectors.averageAccuracy);
    const averageAccuracy = await this.page.textContent(selectors.averageAccuracy);
    expect(averageAccuracy).toContain(data.stats.averageAccuracy.toString());
  }

  /**
   * Verifica que los gráficos de progreso se rendericen
   */
  async verifyProgressCharts(): Promise<void> {
    const selectors = this.getSelectors();

    // Verifica que los gráficos estén presentes
    await this.page.waitForSelector(selectors.dailyActivityChart, { timeout: 15000 });
    await this.page.waitForSelector(selectors.weeklyProgressChart, { timeout: 15000 });
    await this.page.waitForSelector(selectors.monthlyProgressChart, { timeout: 15000 });
    await this.page.waitForSelector(selectors.studyHeatmap, { timeout: 15000 });

    // Verifica que los gráficos sean visibles
    expect(await this.page.isVisible(selectors.dailyActivityChart)).toBe(true);
    expect(await this.page.isVisible(selectors.weeklyProgressChart)).toBe(true);
    expect(await this.page.isVisible(selectors.monthlyProgressChart)).toBe(true);
    expect(await this.page.isVisible(selectors.studyHeatmap)).toBe(true);
  }

  /**
   * Verifica las acciones rápidas
   */
  async verifyQuickActions(): Promise<void> {
    const selectors = this.getSelectors();

    await this.page.waitForSelector(selectors.createFlashcardBtn);
    await this.page.waitForSelector(selectors.startStudyBtn);
    await this.page.waitForSelector(selectors.viewProgressBtn);

    expect(await this.page.isVisible(selectors.createFlashcardBtn)).toBe(true);
    expect(await this.page.isVisible(selectors.startStudyBtn)).toBe(true);
    expect(await this.page.isVisible(selectors.viewProgressBtn)).toBe(true);
  }

  /**
   * Verifica la actividad reciente
   */
  async verifyRecentActivity(data: DashboardData): Promise<void> {
    const selectors = this.getSelectors();

    await this.page.waitForSelector(selectors.recentSessions);
    await this.page.waitForSelector(selectors.recentFlashcards);

    // Verifica sesiones recientes
    const sessionElements = await this.page.$$(selectors.recentSessions + ' > *');
    expect(sessionElements.length).toBeGreaterThan(0);

    // Verifica flashcards recientes
    const flashcardElements = await this.page.$$(selectors.recentFlashcards + ' > *');
    expect(flashcardElements.length).toBeGreaterThan(0);
  }

  /**
   * Verifica las metas de estudio
   */
  async verifyStudyGoals(_data: DashboardData): Promise<void> {
    const selectors = this.getSelectors();

    await this.page.waitForSelector(selectors.studyGoals);

    // Verifica que las metas estén presentes
    expect(await this.page.isVisible(selectors.dailyGoal)).toBe(true);
    expect(await this.page.isVisible(selectors.weeklyGoal)).toBe(true);
    expect(await this.page.isVisible(selectors.monthlyGoal)).toBe(true);
  }

  /**
   * Haz clic en el botón de crear flashcard
   */
  async clickCreateFlashcard(): Promise<void> {
    const selectors = this.getSelectors();
    await this.page.click(selectors.createFlashcardBtn);
  }

  /**
   * Haz clic en el botón de iniciar estudio
   */
  async clickStartStudy(): Promise<void> {
    const selectors = this.getSelectors();
    await this.page.click(selectors.startStudyBtn);
  }

  /**
   * Haz clic en el botón de ver progreso
   */
  async clickViewProgress(): Promise<void> {
    const selectors = this.getSelectors();
    await this.page.click(selectors.viewProgressBtn);
  }

  /**
   * Navega a la página de progreso
   */
  async navigateToProgress(): Promise<void> {
    const selectors = this.getSelectors();
    await this.page.click(selectors.progressNav);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Espera a que los datos se actualicen en tiempo real
   */
  async waitForRealTimeUpdate(timeout: number = 5000): Promise<void> {
    // Espera a que se complete cualquier actualización de datos
    await this.page.waitForTimeout(timeout);

    // Verifica que no haya indicadores de carga
    const loadingSelectors = [
      '[data-testid="loading-spinner"]',
      '.loading',
      '.spinner',
      '[aria-busy="true"]'
    ];

    for (const selector of loadingSelectors) {
      const element = await this.page.$(selector);
      if (element) {
        await element.waitForElementState('hidden', { timeout: 10000 });
      }
    }
  }

  /**
   * Maneja errores de carga de datos
   */
  async handleDataLoadingError(): Promise<boolean> {
    const errorSelectors = [
      '[data-testid="error-message"]',
      '.error-message',
      '.alert-error',
      '[role="alert"]'
    ];

    for (const selector of errorSelectors) {
      const errorElement = await this.page.$(selector);
      if (errorElement && await errorElement.isVisible()) {
        const errorText = await errorElement.textContent();
        console.error('Error de carga de datos detectado:', errorText);
        return true;
      }
    }

    return false;
  }

  /**
   * Toma una captura de pantalla del dashboard
   */
  async takeDashboardScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/screenshots/dashboard-${name}.png`,
      fullPage: true
    });
  }

  /**
   * Configura datos de prueba en el dashboard
   */
  async setupTestData(_data: DashboardData): Promise<void> {
    // Esta función puede usarse para configurar datos específicos de prueba
    // mediante API calls o manipulación directa si es necesario
    console.log(`Configurando datos de prueba: ${_data.testId}`);
  }

  /**
   * Limpia datos de prueba del dashboard
   */
  async cleanupTestData(testId: string): Promise<void> {
    // Esta función puede usarse para limpiar datos específicos de prueba
    console.log(`Limpiando datos de prueba: ${testId}`);
  }

  /**
   * Verifica que el dashboard esté en un estado vacío
   */
  async verifyEmptyState(): Promise<void> {
    const selectors = this.getSelectors();

    // Verifica que las estadísticas muestren valores cero
    await this.page.waitForSelector(selectors.totalFlashcards);
    const totalFlashcards = await this.page.textContent(selectors.totalFlashcards);
    expect(totalFlashcards).toContain('0');

    await this.page.waitForSelector(selectors.studiedToday);
    const studiedToday = await this.page.textContent(selectors.studiedToday);
    expect(studiedToday).toContain('0');

    // Verifica que no haya actividad reciente
    const sessionElements = await this.page.$$(selectors.recentSessions + ' > *');
    expect(sessionElements.length).toBe(0);
  }

  /**
   * Verifica que el dashboard maneje correctamente el estado de carga
   */
  async verifyLoadingState(): Promise<void> {
    // Verifica que no haya elementos de carga persistentes
    const loadingSelectors = [
      '[data-testid="loading-spinner"]',
      '.loading',
      '.spinner'
    ];

    for (const selector of loadingSelectors) {
      const elements = await this.page.$$(selector);
      for (const element of elements) {
        // Los elementos de carga deberían desaparecer después de un tiempo
        await element.waitForElementState('hidden', { timeout: 15000 });
      }
    }
  }
}

/**
 * Función helper para crear una instancia de DashboardHelpers
 */
export function createDashboardHelpers(page: Page): DashboardHelpers {
  return new DashboardHelpers(page);
}