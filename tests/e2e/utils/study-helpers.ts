import type { Page } from '@playwright/test';
import type {
  StudySessionData,
  StudyFlashcard,
  StudySettings,
  StudyStatistics,
} from '../fixtures/study-session';

/**
 * Utilidades para pruebas del flujo de estudio
 * Proporciona métodos para interactuar con la interfaz de estudio,
 * controles de calidad de recuerdo y estadísticas
 */

export class StudyHelpers {
  constructor(public page: Page) {}

  /**
   * Navega a la página de estudio desde el dashboard
   */
  async goToStudyPage(): Promise<void> {
    await this.page.goto('/dashboard');
    await this.page.waitForLoadState('networkidle');

    // Buscar y hacer clic en el botón de estudio
    const studyButton = this.page.locator(
      '[data-testid="study-button"], text=Study, text=Estudiar, text=Start Study'
    );
    await studyButton.click();

    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Inicia una nueva sesión de estudio
   */
  async startNewStudySession(): Promise<void> {
    await this.goToStudyPage();

    // Buscar y hacer clic en el botón de nueva sesión
    const newSessionButton = this.page.locator(
      '[data-testid="new-session-button"], text=New Session, text=Nueva Sesión'
    );
    await newSessionButton.click();

    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Configura las opciones de estudio
   */
  async configureStudySettings(settings: Partial<StudySettings>): Promise<void> {
    // Abrir modal de configuración si existe
    const settingsButton = this.page.locator(
      '[data-testid="study-settings-button"], text=Settings, text=Configuración'
    );
    if (await settingsButton.isVisible()) {
      await settingsButton.click();
    }

    // Configurar autoplay de audio
    if (settings.autoplayAudio !== undefined) {
      const autoplayToggle = this.page.locator(
        '[data-testid="autoplay-toggle"], #autoplay, [name="autoplay"]'
      );
      if (await autoplayToggle.isVisible()) {
        const isChecked = await autoplayToggle.isChecked();
        if (settings.autoplayAudio !== isChecked) {
          await autoplayToggle.click();
        }
      }
    }

    // Configurar volumen de audio
    if (settings.audioVolume !== undefined) {
      const volumeSlider = this.page.locator(
        '[data-testid="volume-slider"], #volume, [name="volume"]'
      );
      if (await volumeSlider.isVisible()) {
        await volumeSlider.fill(settings.audioVolume.toString());
      }
    }

    // Configurar modo de estudio
    if (settings.studyMode) {
      const studyModeSelect = this.page.locator(
        '[data-testid="study-mode-select"], #studyMode, [name="studyMode"]'
      );
      if (await studyModeSelect.isVisible()) {
        await studyModeSelect.selectOption(settings.studyMode);
      }
    }

    // Configurar número de tarjetas por sesión
    if (settings.cardsPerSession !== undefined) {
      const cardsPerSessionInput = this.page.locator(
        '[data-testid="cards-per-session"], #cardsPerSession, [name="cardsPerSession"]'
      );
      if (await cardsPerSessionInput.isVisible()) {
        await cardsPerSessionInput.fill(settings.cardsPerSession.toString());
      }
    }

    // Cerrar modal de configuración
    const closeButton = this.page.locator(
      '[data-testid="close-settings"], text=Close, text=Cerrar'
    );
    if (await closeButton.isVisible()) {
      await closeButton.click();
    }
  }

  /**
   * Espera a que la flashcard esté visible y lista
   */
  async waitForFlashcard(): Promise<void> {
    await this.page.waitForSelector(
      '[data-testid="study-flashcard"], .study-flashcard, .flashcard-container'
    );
  }

  /**
   * Obtiene el contenido de la flashcard actual
   */
  async getCurrentFlashcard(): Promise<StudyFlashcard | null> {
    await this.waitForFlashcard();

    const frontElement = this.page.locator(
      '[data-testid="flashcard-front"], .flashcard-front, #front-content'
    );
    const backElement = this.page.locator(
      '[data-testid="flashcard-back"], .flashcard-back, #back-content'
    );

    const front = await frontElement.isVisible()
      ? await frontElement.textContent()
      : null;
    const back = await backElement.isVisible()
      ? await backElement.textContent()
      : null;

    if (!front) return null;

    return {
      cardId: `temp_${Date.now()}`,
      front: front || '',
      back: back || '',
      difficulty: 'medium',
      category: 'test',
      sm2Data: {
        easeFactor: 2.5,
        interval: 1,
        repetitions: 0,
        nextReviewDate: new Date(),
      },
      studyData: {
        responseTime: 0,
        studiedAt: new Date(),
        correct: false,
      },
    };
  }

  /**
   * Revela la respuesta de la flashcard
   */
  async revealAnswer(): Promise<void> {
    const revealButton = this.page.locator(
      '[data-testid="reveal-answer"], text=Show Answer, text=Mostrar Respuesta'
    );
    await revealButton.click();

    // Esperar a que se muestre la respuesta
    await this.page.waitForSelector(
      '[data-testid="flashcard-back"], .flashcard-back, #back-content'
    );
  }

  /**
   * Responde con una calidad de recuerdo específica
   */
  async respondWithQuality(quality: 'again' | 'hard' | 'good' | 'easy'): Promise<void> {
    const qualityButtons = {
      again: this.page.locator('[data-testid="again-button"], text=Again, text=Nuevamente'),
      hard: this.page.locator('[data-testid="hard-button"], text=Hard, text=Difícil'),
      good: this.page.locator('[data-testid="good-button"], text=Good, text=Bien'),
      easy: this.page.locator('[data-testid="easy-button"], text=Easy, text=Fácil'),
    };

    await qualityButtons[quality].click();

    // Esperar a que se procese la respuesta
    await this.page.waitForTimeout(500);
  }

  /**
   * Navega a la siguiente flashcard
   */
  async goToNextFlashcard(): Promise<void> {
    const nextButton = this.page.locator(
      '[data-testid="next-button"], text=Next, text=Siguiente'
    );
    await nextButton.click();

    // Esperar a que se cargue la nueva flashcard
    await this.waitForFlashcard();
  }

  /**
   * Navega a la flashcard anterior
   */
  async goToPreviousFlashcard(): Promise<void> {
    const prevButton = this.page.locator(
      '[data-testid="previous-button"], text=Previous, text=Anterior'
    );
    await prevButton.click();

    // Esperar a que se cargue la flashcard anterior
    await this.waitForFlashcard();
  }

  /**
   * Salta la flashcard actual
   */
  async skipCurrentFlashcard(): Promise<void> {
    const skipButton = this.page.locator(
      '[data-testid="skip-button"], text=Skip, text=Saltar'
    );
    await skipButton.click();

    // Esperar a que se cargue la siguiente flashcard
    await this.waitForFlashcard();
  }

  /**
   * Reproduce el audio de la flashcard actual
   */
  async playAudio(): Promise<void> {
    const playButton = this.page.locator(
      '[data-testid="play-audio"], .audio-play, #play-audio'
    );
    await playButton.click();

    // Esperar a que el audio se cargue
    await this.page.waitForTimeout(1000);
  }

  /**
   * Pausa/reanuda el audio
   */
  async toggleAudioPlayback(): Promise<void> {
    const pauseButton = this.page.locator(
      '[data-testid="pause-audio"], .audio-pause, #pause-audio'
    );
    await pauseButton.click();
  }

  /**
   * Ajusta el volumen del audio
   */
  async setAudioVolume(volume: number): Promise<void> {
    const volumeControl = this.page.locator(
      '[data-testid="volume-control"], #volume-slider, [name="volume"]'
    );
    await volumeControl.fill(volume.toString());
  }

  /**
   * Pausa la sesión de estudio
   */
  async pauseStudySession(): Promise<void> {
    const pauseButton = this.page.locator(
      '[data-testid="pause-button"], text=Pause, text=Pausar'
    );
    await pauseButton.click();

    // Verificar que se muestra el estado de pausa
    await this.page.waitForSelector(
      '[data-testid="paused-state"], .paused, #study-paused'
    );
  }

  /**
   * Reanuda la sesión de estudio
   */
  async resumeStudySession(): Promise<void> {
    const resumeButton = this.page.locator(
      '[data-testid="resume-button"], text=Resume, text=Reanudar'
    );
    await resumeButton.click();

    // Verificar que se reanudó el estudio
    await this.waitForFlashcard();
  }

  /**
   * Termina la sesión de estudio
   */
  async endStudySession(): Promise<void> {
    const endButton = this.page.locator(
      '[data-testid="end-session"], text=End Session, text=Terminar Sesión'
    );
    await endButton.click();

    // Verificar que se muestra el resumen de la sesión
    await this.page.waitForSelector(
      '[data-testid="session-summary"], .session-summary, #study-results'
    );
  }

  /**
   * Obtiene las estadísticas actuales de la sesión
   */
  async getSessionStatistics(): Promise<StudyStatistics | null> {
    const statsContainer = this.page.locator(
      '[data-testid="session-stats"], .session-statistics, #study-stats'
    );

    if (!await statsContainer.isVisible()) {
      return null;
    }

    const totalCardsElement = statsContainer.locator('[data-testid="total-cards"], .total-cards');
    const correctAnswersElement = statsContainer.locator('[data-testid="correct-answers"], .correct-answers');
    const studyTimeElement = statsContainer.locator('[data-testid="study-time"], .study-time');
    const accuracyElement = statsContainer.locator('[data-testid="accuracy"], .accuracy');

    return {
      totalSessions: 1,
      totalCardsStudied: parseInt(await totalCardsElement.textContent() || '0', 10),
      totalStudyTime: parseInt(await studyTimeElement.textContent() || '0', 10),
      averageAccuracy: parseFloat(await accuracyElement.textContent() || '0'),
      streakCurrent: 0,
      streakLongest: 0,
      weeklyGoal: 100,
      weeklyProgress: 0,
      monthlyGoal: 400,
      monthlyProgress: 0,
    };
  }

  /**
   * Obtiene el progreso actual de la sesión
   */
  async getSessionProgress(): Promise<{
    current: number;
    total: number;
    percentage: number;
  } | null> {
    const progressElement = this.page.locator(
      '[data-testid="session-progress"], .session-progress, #study-progress'
    );

    if (!await progressElement.isVisible()) {
      return null;
    }

    const currentText = await progressElement.textContent() || '';
    const match = currentText.match(/(\d+)\/(\d+)/);

    if (!match) return null;

    const current = parseInt(match[1], 10);
    const total = parseInt(match[2], 10);
    const percentage = Math.round((current / total) * 100);

    return { current, total, percentage };
  }

  /**
   * Verifica si hay audio disponible para la flashcard actual
   */
  async hasAudioAvailable(): Promise<boolean> {
    const audioButton = this.page.locator(
      '[data-testid="play-audio"], .audio-play, #play-audio'
    );
    return await audioButton.isVisible();
  }

  /**
   * Verifica si la respuesta está revelada
   */
  async isAnswerRevealed(): Promise<boolean> {
    const backElement = this.page.locator(
      '[data-testid="flashcard-back"], .flashcard-back, #back-content'
    );
    return await backElement.isVisible();
  }

  /**
   * Verifica si la sesión está pausada
   */
  async isSessionPaused(): Promise<boolean> {
    const pausedState = this.page.locator(
      '[data-testid="paused-state"], .paused, #study-paused'
    );
    return await pausedState.isVisible();
  }

  /**
   * Obtiene el tiempo de respuesta actual
   */
  async getResponseTime(): Promise<number> {
    const timerElement = this.page.locator(
      '[data-testid="response-timer"], .response-timer, #study-timer'
    );

    if (!await timerElement.isVisible()) {
      return 0;
    }

    const timeText = await timerElement.textContent() || '0';
    return parseFloat(timeText);
  }

  /**
   * Espera a que se complete la transición entre flashcards
   */
  async waitForFlashcardTransition(): Promise<void> {
    await this.page.waitForTimeout(300); // Tiempo típico de transición
    await this.waitForFlashcard();
  }

  /**
   * Maneja errores de audio durante el estudio
   */
  async handleAudioError(): Promise<string | null> {
    const audioErrorElement = this.page.locator(
      '[data-testid="audio-error"], .audio-error, #audio-error'
    );

    if (await audioErrorElement.isVisible()) {
      return await audioErrorElement.textContent();
    }

    return null;
  }

  /**
   * Maneja errores de red durante el estudio
   */
  async handleNetworkError(): Promise<string | null> {
    const networkErrorElement = this.page.locator(
      '[data-testid="network-error"], .network-error, #network-error'
    );

    if (await networkErrorElement.isVisible()) {
      return await networkErrorElement.textContent();
    }

    return null;
  }

  /**
   * Toma una captura de pantalla del estado actual del estudio
   */
  async takeStudyScreenshot(name: string): Promise<void> {
    await this.page.screenshot({
      path: `test-results/screenshots/study-${name}.png`,
      fullPage: true
    });
  }

  /**
   * Simula diferentes velocidades de respuesta para pruebas
   */
  async simulateResponseDelay(delayMs: number): Promise<void> {
    await this.page.waitForTimeout(delayMs);
  }

  /**
   * Verifica que todos los controles de calidad de recuerdo estén disponibles
   */
  async verifyQualityControlsAvailable(): Promise<boolean> {
    const againButton = this.page.locator('[data-testid="again-button"]');
    const hardButton = this.page.locator('[data-testid="hard-button"]');
    const goodButton = this.page.locator('[data-testid="good-button"]');
    const easyButton = this.page.locator('[data-testid="easy-button"]');

    return (
      (await againButton.isVisible()) &&
      (await hardButton.isVisible()) &&
      (await goodButton.isVisible()) &&
      (await easyButton.isVisible())
    );
  }

  /**
   * Obtiene la distribución actual de calidades de respuesta
   */
  async getQualityDistribution(): Promise<{
    again: number;
    hard: number;
    good: number;
    easy: number;
  }> {
    const distributionElement = this.page.locator(
      '[data-testid="quality-distribution"], .quality-distribution'
    );

    if (!await distributionElement.isVisible()) {
      return { again: 0, hard: 0, good: 0, easy: 0 };
    }

    const againCount = parseInt(
      await distributionElement.locator('[data-testid="again-count"]').textContent() || '0'
    );
    const hardCount = parseInt(
      await distributionElement.locator('[data-testid="hard-count"]').textContent() || '0'
    );
    const goodCount = parseInt(
      await distributionElement.locator('[data-testid="good-count"]').textContent() || '0'
    );
    const easyCount = parseInt(
      await distributionElement.locator('[data-testid="easy-count"]').textContent() || '0'
    );

    return { again: againCount, hard: hardCount, good: goodCount, easy: easyCount };
  }
}