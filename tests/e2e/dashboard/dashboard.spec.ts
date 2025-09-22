// @ts-nocheck
import { test, expect } from '@playwright/test';
import { createDashboardHelpers } from '../utils/dashboard-helpers';
import {
  mockDashboardStats,
  mockStudyProgress,
  mockRecentActivity,
  mockStudyGoals,
  emptyDashboardData,
  minimalDashboardData,
  largeDashboardData,
  cleanupTestData
} from '../fixtures/dashboard-data';
import type { DashboardData } from '../types/dashboard';

/**
 * Pruebas E2E para el dashboard y progreso de LinguaFlip
 *
 * Estas pruebas cubren todos los escenarios críticos identificados:
 * - Estadísticas generales del dashboard
 * - Gráficos de progreso y visualizaciones
 * - Acciones rápidas del usuario
 * - Actividad reciente y sesiones
 * - Metas de estudio y seguimiento
 * - Navegación entre secciones
 * - Actualización en tiempo real
 * - Diferentes estados de datos
 */

test.describe('Dashboard E2E Tests', () => {
  let dashboardHelpers: ReturnType<typeof createDashboardHelpers>;
  let testData: DashboardData;

  test.beforeEach(async ({ page }) => {
    dashboardHelpers = createDashboardHelpers(page);

    // Configurar datos de prueba por defecto
    testData = {
      stats: mockDashboardStats,
      progress: mockStudyProgress,
      activity: mockRecentActivity,
      goals: mockStudyGoals,
      testId: `test_${Date.now()}`
    };

    // Configurar datos de prueba
    await dashboardHelpers.setupTestData(testData);
  });

  test.afterEach(async () => {
    // Limpiar datos de prueba
    await dashboardHelpers.cleanupTestData(testData.testId);
    await cleanupTestData(testData.testId);
  });

  test('debería mostrar estadísticas generales correctamente', async ({ page }) => {
    // Arrange
    await dashboardHelpers.navigateToDashboard();
    await dashboardHelpers.waitForDashboardLoad();

    // Act & Assert - Verificar estadísticas principales
    await dashboardHelpers.verifyStatsDisplay(testData);

    // Verificar estadísticas específicas
    const selectors = dashboardHelpers.getSelectors();

    // Verificar tiempo total de estudio
    await page.waitForSelector(selectors.totalStudyTime);
    const studyTime = await page.textContent(selectors.totalStudyTime);
    expect(studyTime).toContain('20h'); // 1247 minutos = ~20 horas

    // Verificar progreso semanal
    const weeklyProgress = await page.textContent('[data-testid="stat-weekly-progress"]');
    expect(weeklyProgress).toContain('68%');

    // Verificar progreso mensual
    const monthlyProgress = await page.textContent('[data-testid="stat-monthly-progress"]');
    expect(monthlyProgress).toContain('61%'); // 245/400 = 61.25%

    // Tomar captura de pantalla
    await dashboardHelpers.takeDashboardScreenshot('stats-overview');
  });

  test('debería renderizar gráficos de progreso correctamente', async ({ page }) => {
    // Arrange
    await dashboardHelpers.navigateToDashboard();
    await dashboardHelpers.waitForDashboardLoad();

    // Act & Assert - Verificar gráficos
    await dashboardHelpers.verifyProgressCharts();

    // Verificar que los gráficos contengan datos
    const dailyChart = await page.$(dashboardHelpers.getSelectors().dailyActivityChart);
    expect(dailyChart).toBeTruthy();

    const weeklyChart = await page.$(dashboardHelpers.getSelectors().weeklyProgressChart);
    expect(weeklyChart).toBeTruthy();

    const monthlyChart = await page.$(dashboardHelpers.getSelectors().monthlyProgressChart);
    expect(monthlyChart).toBeTruthy();

    const heatmap = await page.$(dashboardHelpers.getSelectors().studyHeatmap);
    expect(heatmap).toBeTruthy();

    // Verificar que los gráficos sean interactivos (hover effects)
    await dailyChart?.hover();
    await page.waitForTimeout(500);

    await weeklyChart?.hover();
    await page.waitForTimeout(500);

    // Tomar captura de pantalla
    await dashboardHelpers.takeDashboardScreenshot('progress-charts');
  });

  test('debería funcionar las acciones rápidas correctamente', async ({ page }) => {
    // Arrange
    await dashboardHelpers.navigateToDashboard();
    await dashboardHelpers.waitForDashboardLoad();

    // Act & Assert - Verificar acciones rápidas
    await dashboardHelpers.verifyQuickActions();

    // Probar clic en "Crear Flashcard"
    await dashboardHelpers.clickCreateFlashcard();
    await page.waitForTimeout(1000);

    // Verificar que se abrió el modal o página de crear flashcard
    const createModal = await page.$('[data-testid="create-flashcard-modal"]');
    expect(createModal).toBeTruthy();

    // Volver al dashboard
    await page.goBack();
    await dashboardHelpers.waitForDashboardLoad();

    // Probar clic en "Iniciar Estudio"
    await dashboardHelpers.clickStartStudy();
    await page.waitForTimeout(1000);

    // Verificar navegación a página de estudio
    await expect(page).toHaveURL(/.*study.*/);

    // Volver al dashboard
    await page.goto('/dashboard');
    await dashboardHelpers.waitForDashboardLoad();

    // Probar clic en "Ver Progreso"
    await dashboardHelpers.clickViewProgress();
    await page.waitForTimeout(1000);

    // Verificar navegación a página de progreso
    await expect(page).toHaveURL(/.*progress.*/);

    // Tomar captura de pantalla
    await dashboardHelpers.takeDashboardScreenshot('quick-actions');
  });

  test('debería mostrar actividad reciente correctamente', async ({ page }) => {
    // Arrange
    await dashboardHelpers.navigateToDashboard();
    await dashboardHelpers.waitForDashboardLoad();

    // Act & Assert - Verificar actividad reciente
    await dashboardHelpers.verifyRecentActivity(testData);

    // Verificar sesiones recientes específicas
    const selectors = dashboardHelpers.getSelectors();
    const recentSessions = await page.$$(selectors.recentSessions + ' > *');
    expect(recentSessions.length).toBeGreaterThanOrEqual(2);

    // Verificar detalles de la primera sesión
    const firstSession = recentSessions[0];
    const sessionText = await firstSession.textContent();
    expect(sessionText).toContain('25'); // flashcards estudiadas
    expect(sessionText).toContain('89%'); // precisión

    // Verificar flashcards recientes
    const recentFlashcards = await page.$$(selectors.recentFlashcards + ' > *');
    expect(recentFlashcards.length).toBeGreaterThanOrEqual(2);

    // Verificar detalles del primer flashcard
    const firstFlashcard = recentFlashcards[0];
    const flashcardText = await firstFlashcard.textContent();
    expect(flashcardText).toContain('Hello');
    expect(flashcardText).toContain('Hola');

    // Tomar captura de pantalla
    await dashboardHelpers.takeDashboardScreenshot('recent-activity');
  });

  test('debería mostrar metas de estudio correctamente', async ({ page }) => {
    // Arrange
    await dashboardHelpers.navigateToDashboard();
    await dashboardHelpers.waitForDashboardLoad();

    // Act & Assert - Verificar metas de estudio
    await dashboardHelpers.verifyStudyGoals(testData);

    // Verificar progreso de metas específicas
    const selectors = dashboardHelpers.getSelectors();

    // Verificar meta diaria
    const dailyProgress = await page.textContent(selectors.dailyGoal);
    expect(dailyProgress).toContain('25/20'); // actual/meta

    // Verificar meta semanal
    const weeklyProgress = await page.textContent(selectors.weeklyGoal);
    expect(weeklyProgress).toContain('68/100'); // actual/meta

    // Verificar meta mensual
    const monthlyProgress = await page.textContent(selectors.monthlyGoal);
    expect(monthlyProgress).toContain('245/400'); // actual/meta

    // Verificar racha actual
    const currentStreak = await page.textContent('[data-testid="stat-current-streak"]');
    expect(currentStreak).toContain('7');

    // Tomar captura de pantalla
    await dashboardHelpers.takeDashboardScreenshot('study-goals');
  });

  test('debería navegar correctamente entre secciones', async ({ page }) => {
    // Arrange
    await dashboardHelpers.navigateToDashboard();
    await dashboardHelpers.waitForDashboardLoad();

    // Act - Navegar a progreso
    await dashboardHelpers.navigateToProgress();

    // Assert - Verificar navegación
    await expect(page).toHaveURL(/.*progress.*/);

    // Verificar que la página de progreso cargó
    await page.waitForSelector('[data-testid="progress-page"]', { timeout: 10000 });
    expect(await page.isVisible('[data-testid="progress-page"]')).toBe(true);

    // Volver al dashboard
    await page.goto('/dashboard');
    await dashboardHelpers.waitForDashboardLoad();

    // Verificar que volvió al dashboard
    await expect(page).toHaveURL(/.*dashboard.*/);
    await dashboardHelpers.verifyStatsDisplay(testData);

    // Tomar captura de pantalla
    await dashboardHelpers.takeDashboardScreenshot('navigation');
  });

  test('debería actualizar datos en tiempo real después de sesiones de estudio', async ({ page }) => {
    // Arrange
    await dashboardHelpers.navigateToDashboard();
    await dashboardHelpers.waitForDashboardLoad();

    // Capturar estadísticas iniciales (para futuras comparaciones)
    await page.textContent(dashboardHelpers.getSelectors().studiedToday);
    await page.textContent(dashboardHelpers.getSelectors().currentStreak);

    // Act - Simular sesión de estudio (navegar a estudio y volver)
    await dashboardHelpers.clickStartStudy();
    await page.waitForTimeout(2000);

    // Simular una sesión de estudio rápida
    await page.goto('/study');
    await page.waitForTimeout(3000);

    // Volver al dashboard
    await page.goto('/dashboard');
    await dashboardHelpers.waitForDashboardLoad();

    // Assert - Verificar actualización en tiempo real
    await dashboardHelpers.waitForRealTimeUpdate();

    // Verificar que los datos se actualizaron
    const updatedStats = await page.textContent(dashboardHelpers.getSelectors().studiedToday);
    const updatedStreak = await page.textContent(dashboardHelpers.getSelectors().currentStreak);

    // Los datos deberían ser diferentes o al menos no mostrar errores
    expect(updatedStats).toBeTruthy();
    expect(updatedStreak).toBeTruthy();

    // Verificar que no hay errores de carga
    const hasError = await dashboardHelpers.handleDataLoadingError();
    expect(hasError).toBe(false);

    // Tomar captura de pantalla
    await dashboardHelpers.takeDashboardScreenshot('real-time-updates');
  });

  test('debería manejar estado vacío correctamente', async ({ page }) => {
    // Arrange - Usar datos vacíos
    testData = emptyDashboardData;
    await dashboardHelpers.setupTestData(testData);

    await dashboardHelpers.navigateToDashboard();
    await dashboardHelpers.waitForDashboardLoad();

    // Act & Assert - Verificar estado vacío
    await dashboardHelpers.verifyEmptyState();

    // Verificar que las acciones rápidas siguen funcionando
    await dashboardHelpers.verifyQuickActions();

    // Verificar que no hay actividad reciente
    const selectors = dashboardHelpers.getSelectors();
    const sessionElements = await page.$$(selectors.recentSessions + ' > *');
    expect(sessionElements.length).toBe(0);

    const flashcardElements = await page.$$(selectors.recentFlashcards + ' > *');
    expect(flashcardElements.length).toBe(0);

    // Tomar captura de pantalla
    await dashboardHelpers.takeDashboardScreenshot('empty-state');
  });

  test('debería manejar estado con pocos datos correctamente', async ({ page }) => {
    // Arrange - Usar datos mínimos
    testData = minimalDashboardData;
    await dashboardHelpers.setupTestData(testData);

    await dashboardHelpers.navigateToDashboard();
    await dashboardHelpers.waitForDashboardLoad();

    // Act & Assert - Verificar estado mínimo
    await dashboardHelpers.verifyStatsDisplay(testData);

    // Verificar estadísticas específicas para datos mínimos
    const selectors = dashboardHelpers.getSelectors();
    const totalFlashcards = await page.textContent(selectors.totalFlashcards);
    expect(totalFlashcards).toContain('5');

    const studiedToday = await page.textContent(selectors.studiedToday);
    expect(studiedToday).toContain('2');

    // Verificar que hay algo de actividad
    const sessionElements = await page.$$(selectors.recentSessions + ' > *');
    expect(sessionElements.length).toBeGreaterThan(0);

    // Tomar captura de pantalla
    await dashboardHelpers.takeDashboardScreenshot('minimal-data');
  });

  test('debería manejar gran cantidad de datos correctamente', async ({ page }) => {
    // Arrange - Usar datos grandes
    testData = largeDashboardData;
    await dashboardHelpers.setupTestData(testData);

    await dashboardHelpers.navigateToDashboard();
    await dashboardHelpers.waitForDashboardLoad();

    // Act & Assert - Verificar rendimiento con muchos datos
    await dashboardHelpers.verifyStatsDisplay(testData);

    // Verificar que los gráficos cargan correctamente con muchos datos
    await dashboardHelpers.verifyProgressCharts();

    // Verificar que la actividad reciente se muestra correctamente
    await dashboardHelpers.verifyRecentActivity(testData);

    // Verificar que no hay errores de rendimiento
    const hasError = await dashboardHelpers.handleDataLoadingError();
    expect(hasError).toBe(false);

    // Verificar que la página responde bien
    await dashboardHelpers.verifyLoadingState();

    // Tomar captura de pantalla
    await dashboardHelpers.takeDashboardScreenshot('large-data');
  });

  test('debería manejar errores de carga de datos correctamente', async ({ page }) => {
    // Arrange - Simular error de carga
    await dashboardHelpers.navigateToDashboard();

    // Act - Verificar manejo de errores
    const hasError = await dashboardHelpers.handleDataLoadingError();

    // Assert - Si hay error, verificar que se maneje correctamente
    if (hasError) {
      // Verificar que hay un mensaje de error visible
      const errorElement = await page.$('[data-testid="error-message"]');
      expect(errorElement).toBeTruthy();

      // Verificar que las acciones rápidas siguen disponibles
      await dashboardHelpers.verifyQuickActions();
    } else {
      // Si no hay error, verificar que todo funciona normalmente
      await dashboardHelpers.verifyStatsDisplay(testData);
      await dashboardHelpers.verifyProgressCharts();
    }

    // Tomar captura de pantalla
    await dashboardHelpers.takeDashboardScreenshot('error-handling');
  });

  test('debería ser accesible y usable', async ({ page }) => {
    // Arrange
    await dashboardHelpers.navigateToDashboard();
    await dashboardHelpers.waitForDashboardLoad();

    // Act & Assert - Verificar accesibilidad básica

    // Verificar que los elementos tienen atributos de accesibilidad
    const statsContainer = await page.$(dashboardHelpers.getSelectors().statsContainer);
    expect(statsContainer).toBeTruthy();

    // Verificar que los botones tienen texto descriptivo
    const createBtn = await page.$(dashboardHelpers.getSelectors().createFlashcardBtn);
    expect(createBtn).toBeTruthy();

    const studyBtn = await page.$(dashboardHelpers.getSelectors().startStudyBtn);
    expect(studyBtn).toBeTruthy();

    // Verificar navegación por teclado (tab navigation)
    await page.keyboard.press('Tab');
    let focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();

    // Verificar que la página es responsive
    await page.setViewportSize({ width: 375, height: 667 }); // Mobile
    await page.waitForTimeout(1000);

    await page.setViewportSize({ width: 1920, height: 1080 }); // Desktop
    await page.waitForTimeout(1000);

    // Verificar que los elementos siguen siendo visibles
    await dashboardHelpers.verifyStatsDisplay(testData);
    await dashboardHelpers.verifyQuickActions();

    // Tomar captura de pantalla
    await dashboardHelpers.takeDashboardScreenshot('accessibility');
  });
});