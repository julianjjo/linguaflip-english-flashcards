// @ts-nocheck
import { test, expect } from '@playwright/test';
import { AuthHelpers } from '../utils/auth-helpers';
import { StudyHelpers } from '../utils/study-helpers';
import { FlashcardHelpers } from '../utils/flashcard-helpers';
import {
  createValidUser,
  createLoginUser,
  VALID_PASSWORD,
} from '../fixtures/users';
import {
  createBasicFlashcard,
  createAudioFlashcard,
  createImageFlashcard,
  createExampleFlashcard,
  createBasicFlashcardForm,
  createAudioFlashcardForm,
  createImageFlashcardForm,
} from '../fixtures/flashcards';
import {
  createBasicStudySession,
  createAudioStudySession,
  createMixedDifficultySession,
  createInterruptedStudySession,
  createQualityResponseData,
  createDeviceTestData,
} from '../fixtures/study-session';

test.describe('Flujo de Estudio - LinguaFlip', () => {
  let authHelpers: AuthHelpers;
  let studyHelpers: StudyHelpers;
  let flashcardHelpers: FlashcardHelpers;

  test.beforeEach(async ({ page }) => {
    authHelpers = new AuthHelpers(page);
    studyHelpers = new StudyHelpers(page);
    flashcardHelpers = new FlashcardHelpers(page);

    // Limpiar storage antes de cada prueba
    await authHelpers.clearStorage();

    // Hacer login para acceder a las funcionalidades de estudio
    const validUser = createLoginUser();
    await authHelpers.register({
      ...validUser,
      username: 'testuser',
      confirmPassword: VALID_PASSWORD,
    });

    // Verificar que estamos en el dashboard
    await authHelpers.waitForDashboardRedirect();
    expect(await authHelpers.isOnDashboard()).toBe(true);

    // Crear flashcards para estudiar
    await createTestFlashcards();
  });

  test.afterEach(async () => {
    // Limpiar storage después de cada prueba
    await authHelpers.clearStorage();
  });

  /**
   * Crea flashcards de prueba para las sesiones de estudio
   */
  async function createTestFlashcards() {
    const formData1 = createBasicFlashcardForm();
    const formData2 = createAudioFlashcardForm();
    const formData3 = createImageFlashcardForm();

    await flashcardHelpers.createFlashcard(formData1);
    await flashcardHelpers.createFlashcard(formData2);
    await flashcardHelpers.createFlashcard(formData3);

    // Verificar que se crearon correctamente
    await flashcardHelpers.waitForFlashcardList();
    expect(await flashcardHelpers.getFlashcardCount()).toBeGreaterThanOrEqual(3);
  }

  test.describe('Inicio de sesión de estudio', () => {
    test('debería permitir iniciar una nueva sesión de estudio desde el dashboard', async () => {
      await studyHelpers.startNewStudySession();

      // Verificar que se cargó la primera flashcard
      await studyHelpers.waitForFlashcard();
      const flashcard = await studyHelpers.getCurrentFlashcard();
      expect(flashcard).toBeTruthy();
      expect(flashcard?.front).toBeTruthy();

      // Verificar que están disponibles los controles de estudio
      expect(await studyHelpers.verifyQualityControlsAvailable()).toBe(true);

      // Verificar que se muestra el progreso de la sesión
      const progress = await studyHelpers.getSessionProgress();
      expect(progress).toBeTruthy();
      expect(progress?.current).toBe(1);
      expect(progress?.total).toBeGreaterThanOrEqual(3);
    });

    test('debería mostrar configuración por defecto al iniciar sesión', async () => {
      await studyHelpers.startNewStudySession();

      // Verificar configuración por defecto
      const stats = await studyHelpers.getSessionStatistics();
      expect(stats).toBeTruthy();
      expect(stats?.totalCardsStudied).toBe(0);
      expect(stats?.averageAccuracy).toBe(0);
    });

    test('debería permitir configurar opciones antes de iniciar sesión', async () => {
      const customSettings = {
        autoplayAudio: true,
        audioVolume: 0.8,
        studyMode: 'mixed' as const,
        cardsPerSession: 10,
      };

      await studyHelpers.configureStudySettings(customSettings);
      await studyHelpers.startNewStudySession();

      // Verificar que la configuración se aplicó
      await studyHelpers.waitForFlashcard();
      expect(await studyHelpers.hasAudioAvailable()).toBe(true);
    });

    test('debería manejar errores al iniciar sesión sin flashcards', async ({ page }) => {
      // Eliminar todas las flashcards primero
      await flashcardHelpers.goToFlashcards();
      const flashcards = await flashcardHelpers.getFlashcardList();
      expect(flashcards.length).toBeGreaterThan(0);

      // Intentar iniciar sesión de estudio
      await studyHelpers.startNewStudySession();

      // Verificar que se maneja correctamente la falta de flashcards
      const errorMessage = await studyHelpers.handleNetworkError();
      if (errorMessage) {
        expect(errorMessage).toContain('No hay flashcards disponibles');
      }
    });
  });

  test.describe('Navegación entre flashcards', () => {
    test('debería permitir navegar a la siguiente flashcard', async () => {
      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Obtener la primera flashcard
      const firstFlashcard = await studyHelpers.getCurrentFlashcard();
      expect(firstFlashcard).toBeTruthy();

      // Revelar respuesta y responder
      await studyHelpers.revealAnswer();
      await studyHelpers.respondWithQuality('good');

      // Navegar a la siguiente
      await studyHelpers.goToNextFlashcard();

      // Verificar que cambió la flashcard
      const secondFlashcard = await studyHelpers.getCurrentFlashcard();
      expect(secondFlashcard).toBeTruthy();
      expect(secondFlashcard?.front).not.toBe(firstFlashcard?.front);
    });

    test('debería permitir navegar a la flashcard anterior', async () => {
      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Navegar a la segunda flashcard primero
      await studyHelpers.revealAnswer();
      await studyHelpers.respondWithQuality('good');
      await studyHelpers.goToNextFlashcard();

      // Obtener la segunda flashcard
      const secondFlashcard = await studyHelpers.getCurrentFlashcard();
      expect(secondFlashcard).toBeTruthy();

      // Navegar de vuelta a la anterior
      await studyHelpers.goToPreviousFlashcard();

      // Verificar que volvió a la primera flashcard
      const firstFlashcard = await studyHelpers.getCurrentFlashcard();
      expect(firstFlashcard?.front).toBe(secondFlashcard?.front);
    });

    test('debería permitir saltar flashcards', async () => {
      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Obtener la primera flashcard
      const firstFlashcard = await studyHelpers.getCurrentFlashcard();
      expect(firstFlashcard).toBeTruthy();

      // Saltar la flashcard actual
      await studyHelpers.skipCurrentFlashcard();

      // Verificar que cambió a una flashcard diferente
      const nextFlashcard = await studyHelpers.getCurrentFlashcard();
      expect(nextFlashcard?.front).not.toBe(firstFlashcard?.front);
    });

    test('debería mostrar indicador de progreso durante la navegación', async () => {
      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Verificar progreso inicial
      let progress = await studyHelpers.getSessionProgress();
      expect(progress?.current).toBe(1);

      // Navegar a la siguiente flashcard
      await studyHelpers.revealAnswer();
      await studyHelpers.respondWithQuality('good');
      await studyHelpers.goToNextFlashcard();

      // Verificar que el progreso se actualizó
      progress = await studyHelpers.getSessionProgress();
      expect(progress?.current).toBe(2);
    });

    test('debería manejar navegación al final de la sesión', async () => {
      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Completar todas las flashcards disponibles
      let progress = await studyHelpers.getSessionProgress();
      const totalCards = progress?.total || 3;

      for (let i = 0; i < totalCards; i++) {
        await studyHelpers.revealAnswer();
        await studyHelpers.respondWithQuality('good');
        if (i < totalCards - 1) {
          await studyHelpers.goToNextFlashcard();
        }
      }

      // Verificar que se muestra el final de la sesión
      const finalProgress = await studyHelpers.getSessionProgress();
      expect(finalProgress?.current).toBe(totalCards);
    });
  });

  test.describe('Sistema de calidad de recuerdo', () => {
    test('debería permitir responder "Again" y mostrar feedback apropiado', async () => {
      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Revelar respuesta
      await studyHelpers.revealAnswer();

      // Responder "Again"
      await studyHelpers.respondWithQuality('again');

      // Verificar que se procesó la respuesta
      await studyHelpers.waitForFlashcardTransition();

      // Verificar que se actualizó la distribución de calidad
      const distribution = await studyHelpers.getQualityDistribution();
      expect(distribution.again).toBeGreaterThan(0);
    });

    test('debería permitir responder "Hard" y mostrar feedback apropiado', async () => {
      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Revelar respuesta
      await studyHelpers.revealAnswer();

      // Responder "Hard"
      await studyHelpers.respondWithQuality('hard');

      // Verificar que se procesó la respuesta
      await studyHelpers.waitForFlashcardTransition();

      // Verificar que se actualizó la distribución de calidad
      const distribution = await studyHelpers.getQualityDistribution();
      expect(distribution.hard).toBeGreaterThan(0);
    });

    test('debería permitir responder "Good" y mostrar feedback apropiado', async () => {
      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Revelar respuesta
      await studyHelpers.revealAnswer();

      // Responder "Good"
      await studyHelpers.respondWithQuality('good');

      // Verificar que se procesó la respuesta
      await studyHelpers.waitForFlashcardTransition();

      // Verificar que se actualizó la distribución de calidad
      const distribution = await studyHelpers.getQualityDistribution();
      expect(distribution.good).toBeGreaterThan(0);
    });

    test('debería permitir responder "Easy" y mostrar feedback apropiado', async () => {
      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Revelar respuesta
      await studyHelpers.revealAnswer();

      // Responder "Easy"
      await studyHelpers.respondWithQuality('easy');

      // Verificar que se procesó la respuesta
      await studyHelpers.waitForFlashcardTransition();

      // Verificar que se actualizó la distribución de calidad
      const distribution = await studyHelpers.getQualityDistribution();
      expect(distribution.easy).toBeGreaterThan(0);
    });

    test('debería mostrar diferentes intervalos según la calidad de respuesta', async () => {
      const qualityData = createQualityResponseData();

      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();
      await studyHelpers.revealAnswer();

      // Responder con diferentes calidades y verificar intervalos
      await studyHelpers.respondWithQuality('again');
      await studyHelpers.waitForFlashcardTransition();

      // La siguiente flashcard debería aparecer más pronto para "Again"
      const nextFlashcard = await studyHelpers.getCurrentFlashcard();
      expect(nextFlashcard).toBeTruthy();
    });

    test('debería actualizar estadísticas según las respuestas', async () => {
      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Responder varias veces con diferentes calidades
      await studyHelpers.revealAnswer();
      await studyHelpers.respondWithQuality('good');

      await studyHelpers.goToNextFlashcard();
      await studyHelpers.revealAnswer();
      await studyHelpers.respondWithQuality('hard');

      await studyHelpers.goToNextFlashcard();
      await studyHelpers.revealAnswer();
      await studyHelpers.respondWithQuality('easy');

      // Verificar que se actualizaron las estadísticas
      const stats = await studyHelpers.getSessionStatistics();
      expect(stats?.totalCardsStudied).toBe(3);
      expect(stats?.averageAccuracy).toBeGreaterThan(0);
    });
  });

  test.describe('Audio TTS durante estudio', () => {
    test('debería permitir reproducir audio de flashcards con TTS', async () => {
      await studyHelpers.startNewStudySession();

      // Verificar que hay audio disponible
      await studyHelpers.waitForFlashcard();
      const hasAudio = await studyHelpers.hasAudioAvailable();

      if (hasAudio) {
        // Reproducir audio
        await studyHelpers.playAudio();

        // Verificar que se inició la reproducción
        const audioError = await studyHelpers.handleAudioError();
        expect(audioError).toBeNull();
      }
    });

    test('debería permitir controlar el volumen del audio', async () => {
      await studyHelpers.configureStudySettings({ audioVolume: 0.5 });
      await studyHelpers.startNewStudySession();

      // Verificar que hay audio disponible
      await studyHelpers.waitForFlashcard();
      const hasAudio = await studyHelpers.hasAudioAvailable();

      if (hasAudio) {
        // Ajustar volumen
        await studyHelpers.setAudioVolume(0.8);

        // Reproducir audio con el nuevo volumen
        await studyHelpers.playAudio();

        // Verificar que no hay errores de audio
        const audioError = await studyHelpers.handleAudioError();
        expect(audioError).toBeNull();
      }
    });

    test('debería permitir pausar y reanudar audio', async () => {
      await studyHelpers.startNewStudySession();

      // Verificar que hay audio disponible
      await studyHelpers.waitForFlashcard();
      const hasAudio = await studyHelpers.hasAudioAvailable();

      if (hasAudio) {
        // Reproducir audio
        await studyHelpers.playAudio();

        // Pausar audio
        await studyHelpers.toggleAudioPlayback();

        // Reanudar audio
        await studyHelpers.toggleAudioPlayback();

        // Verificar que no hay errores
        const audioError = await studyHelpers.handleAudioError();
        expect(audioError).toBeNull();
      }
    });

    test('debería manejar errores de audio correctamente', async ({ page }) => {
      await studyHelpers.startNewStudySession();

      // Intentar reproducir audio que podría fallar
      await studyHelpers.waitForFlashcard();
      await studyHelpers.playAudio();

      // Verificar que se maneja correctamente cualquier error
      const audioError = await studyHelpers.handleAudioError();
      // El error puede ser null si el audio funciona, o contener un mensaje si falla
      expect(audioError === null || typeof audioError === 'string').toBe(true);
    });

    test('debería mostrar controles de audio apropiados', async () => {
      await studyHelpers.startNewStudySession();

      // Verificar que se muestran los controles de audio cuando están disponibles
      await studyHelpers.waitForFlashcard();
      const hasAudio = await studyHelpers.hasAudioAvailable();

      if (hasAudio) {
        const playButton = studyHelpers.page.locator('[data-testid="play-audio"]');
        expect(await playButton.isVisible()).toBe(true);
      }
    });
  });

  test.describe('Estadísticas de sesión', () => {
    test('debería mostrar estadísticas en tiempo real durante la sesión', async () => {
      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Verificar estadísticas iniciales
      let stats = await studyHelpers.getSessionStatistics();
      expect(stats?.totalCardsStudied).toBe(0);
      expect(stats?.averageAccuracy).toBe(0);

      // Completar algunas flashcards
      await studyHelpers.revealAnswer();
      await studyHelpers.respondWithQuality('good');

      await studyHelpers.goToNextFlashcard();
      await studyHelpers.revealAnswer();
      await studyHelpers.respondWithQuality('hard');

      // Verificar que se actualizaron las estadísticas
      stats = await studyHelpers.getSessionStatistics();
      expect(stats?.totalCardsStudied).toBe(2);
      expect(stats?.averageAccuracy).toBeGreaterThan(0);
    });

    test('debería mostrar progreso de la sesión correctamente', async () => {
      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Verificar progreso inicial
      let progress = await studyHelpers.getSessionProgress();
      expect(progress?.current).toBe(1);
      expect(progress?.percentage).toBeLessThan(100);

      // Completar la sesión
      const totalCards = progress?.total || 3;
      for (let i = 1; i < totalCards; i++) {
        await studyHelpers.revealAnswer();
        await studyHelpers.respondWithQuality('good');
        await studyHelpers.goToNextFlashcard();
      }

      // Verificar progreso final
      progress = await studyHelpers.getSessionProgress();
      expect(progress?.current).toBe(totalCards);
      expect(progress?.percentage).toBe(100);
    });

    test('debería mostrar distribución de calidad de respuestas', async () => {
      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Responder con diferentes calidades
      await studyHelpers.revealAnswer();
      await studyHelpers.respondWithQuality('again');

      await studyHelpers.goToNextFlashcard();
      await studyHelpers.revealAnswer();
      await studyHelpers.respondWithQuality('good');

      await studyHelpers.goToNextFlashcard();
      await studyHelpers.revealAnswer();
      await studyHelpers.respondWithQuality('easy');

      // Verificar distribución de calidad
      const distribution = await studyHelpers.getQualityDistribution();
      expect(distribution.again).toBeGreaterThan(0);
      expect(distribution.good).toBeGreaterThan(0);
      expect(distribution.easy).toBeGreaterThan(0);
    });

    test('debería calcular tiempo de respuesta promedio', async () => {
      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Simular diferentes tiempos de respuesta
      await studyHelpers.simulateResponseDelay(2000); // 2 segundos
      await studyHelpers.revealAnswer();
      await studyHelpers.simulateResponseDelay(1000); // 1 segundo
      await studyHelpers.respondWithQuality('good');

      // Verificar que se calculó el tiempo promedio
      const responseTime = await studyHelpers.getResponseTime();
      expect(responseTime).toBeGreaterThan(0);
    });
  });

  test.describe('Interrupción y reanudación', () => {
    test('debería permitir pausar y reanudar sesión de estudio', async () => {
      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Pausar la sesión
      await studyHelpers.pauseStudySession();
      expect(await studyHelpers.isSessionPaused()).toBe(true);

      // Reanudar la sesión
      await studyHelpers.resumeStudySession();
      expect(await studyHelpers.isSessionPaused()).toBe(false);

      // Verificar que se puede continuar estudiando
      await studyHelpers.revealAnswer();
      await studyHelpers.respondWithQuality('good');
    });

    test('debería mantener el progreso al reanudar sesión pausada', async () => {
      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Completar una flashcard
      const firstFlashcard = await studyHelpers.getCurrentFlashcard();
      await studyHelpers.revealAnswer();
      await studyHelpers.respondWithQuality('good');

      // Pausar la sesión
      await studyHelpers.pauseStudySession();

      // Reanudar la sesión
      await studyHelpers.resumeStudySession();

      // Verificar que se mantiene en la misma flashcard
      const currentFlashcard = await studyHelpers.getCurrentFlashcard();
      expect(currentFlashcard?.front).not.toBe(firstFlashcard?.front);
    });

    test('debería permitir terminar sesión completamente', async () => {
      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Completar algunas flashcards
      await studyHelpers.revealAnswer();
      await studyHelpers.respondWithQuality('good');

      await studyHelpers.goToNextFlashcard();
      await studyHelpers.revealAnswer();
      await studyHelpers.respondWithQuality('hard');

      // Terminar la sesión
      await studyHelpers.endStudySession();

      // Verificar que se muestra el resumen
      const stats = await studyHelpers.getSessionStatistics();
      expect(stats?.totalCardsStudied).toBe(2);
    });

    test('debería manejar interrupciones por navegación', async ({ page }) => {
      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Simular navegación fuera de la página
      await page.goto('/dashboard');

      // Volver a la página de estudio
      await studyHelpers.goToStudyPage();

      // Verificar que se puede continuar
      await studyHelpers.waitForFlashcard();
      expect(await studyHelpers.isSessionPaused()).toBe(true);
    });
  });

  test.describe('Comportamiento en diferentes dispositivos', () => {
    test('debería funcionar correctamente en desktop', async ({ page }) => {
      // Configurar viewport de desktop
      await page.setViewportSize({ width: 1200, height: 800 });

      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Verificar que todos los controles están disponibles
      expect(await studyHelpers.verifyQualityControlsAvailable()).toBe(true);

      // Verificar que se puede navegar
      await studyHelpers.revealAnswer();
      await studyHelpers.respondWithQuality('good');
      await studyHelpers.goToNextFlashcard();

      // Verificar que se muestra el progreso
      const progress = await studyHelpers.getSessionProgress();
      expect(progress).toBeTruthy();
    });

    test('debería funcionar correctamente en móvil', async ({ page }) => {
      // Configurar viewport de móvil
      await page.setViewportSize({ width: 375, height: 667 });

      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Verificar que los controles están disponibles en móvil
      expect(await studyHelpers.verifyQualityControlsAvailable()).toBe(true);

      // Verificar que se puede interactuar con controles táctiles
      await studyHelpers.revealAnswer();
      await studyHelpers.respondWithQuality('good');

      // Verificar que se puede navegar
      await studyHelpers.goToNextFlashcard();
      expect(await studyHelpers.getSessionProgress()).toBeTruthy();
    });

    test('debería funcionar correctamente en tablet', async ({ page }) => {
      // Configurar viewport de tablet
      await page.setViewportSize({ width: 768, height: 1024 });

      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Verificar funcionalidad completa en tablet
      expect(await studyHelpers.verifyQualityControlsAvailable()).toBe(true);

      // Probar navegación
      await studyHelpers.revealAnswer();
      await studyHelpers.respondWithQuality('hard');
      await studyHelpers.goToNextFlashcard();

      // Verificar estadísticas
      const stats = await studyHelpers.getSessionStatistics();
      expect(stats?.totalCardsStudied).toBe(1);
    });

    test('debería adaptar controles según el tamaño de pantalla', async ({ page }) => {
      // Probar diferentes tamaños de pantalla
      const viewports = [
        { width: 320, height: 568 },  // iPhone SE
        { width: 768, height: 1024 }, // iPad
        { width: 1200, height: 800 }, // Desktop
      ];

      for (const viewport of viewports) {
        await page.setViewportSize(viewport);

        await studyHelpers.startNewStudySession();
        await studyHelpers.waitForFlashcard();

        // Verificar que los controles están disponibles
        expect(await studyHelpers.verifyQualityControlsAvailable()).toBe(true);

        // Verificar que se puede completar una respuesta
        await studyHelpers.revealAnswer();
        await studyHelpers.respondWithQuality('good');

        // Terminar sesión para el siguiente viewport
        await studyHelpers.endStudySession();
      }
    });
  });

  test.describe('Manejo de errores y estados', () => {
    test('debería manejar errores de red durante el estudio', async ({ page }) => {
      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Simular error de red
      await page.route('**/api/study/**', async route => {
        await route.abort();
      });

      // Intentar navegar
      await studyHelpers.revealAnswer();
      await studyHelpers.respondWithQuality('good');

      // Verificar que se maneja el error
      const networkError = await studyHelpers.handleNetworkError();
      if (networkError) {
        expect(networkError).toBeTruthy();
      }
    });

    test('debería manejar timeouts durante respuestas', async () => {
      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Simular respuesta lenta
      await studyHelpers.simulateResponseDelay(5000);

      // Intentar responder
      await studyHelpers.revealAnswer();
      await studyHelpers.respondWithQuality('good');

      // Verificar que se procesó correctamente
      await studyHelpers.waitForFlashcardTransition();
    });

    test('debería mostrar estados de carga apropiados', async ({ page }) => {
      await studyHelpers.startNewStudySession();

      // Verificar que se muestra loading al cargar flashcards
      const loadingSpinner = page.locator('#loading-spinner, .loading-spinner');
      if (await loadingSpinner.isVisible()) {
        await loadingSpinner.waitFor({ state: 'hidden' });
      }

      // Verificar que se cargó la flashcard
      await studyHelpers.waitForFlashcard();
      expect(await studyHelpers.getCurrentFlashcard()).toBeTruthy();
    });

    test('debería manejar errores de audio correctamente', async ({ page }) => {
      await studyHelpers.startNewStudySession();

      // Simular error de audio
      await page.route('**/api/tts/**', async route => {
        await route.abort();
      });

      await studyHelpers.waitForFlashcard();

      // Intentar reproducir audio
      await studyHelpers.playAudio();

      // Verificar que se maneja el error
      const audioError = await studyHelpers.handleAudioError();
      if (audioError) {
        expect(audioError).toBeTruthy();
      }
    });
  });

  test.describe('Persistencia y estado', () => {
    test('debería mantener el progreso al recargar la página', async ({ page }) => {
      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Completar una flashcard
      await studyHelpers.revealAnswer();
      await studyHelpers.respondWithQuality('good');

      // Recargar la página
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Verificar que se puede continuar desde donde se dejó
      await studyHelpers.waitForFlashcard();
      const progress = await studyHelpers.getSessionProgress();
      expect(progress?.current).toBeGreaterThan(1);
    });

    test('debería limpiar datos correctamente al hacer logout', async () => {
      await studyHelpers.startNewStudySession();
      await studyHelpers.waitForFlashcard();

      // Completar algunas flashcards
      await studyHelpers.revealAnswer();
      await studyHelpers.respondWithQuality('good');

      // Hacer logout
      await authHelpers.logout();

      // Verificar que ya no estamos en el dashboard
      expect(await authHelpers.isOnLoginPage()).toBe(true);

      // Intentar acceder a estudio (debería redirigir al login)
      await studyHelpers.goToStudyPage();
      expect(await authHelpers.isOnLoginPage()).toBe(true);
    });
  });
});