import { FlashcardData, StudySession } from '../types';

export interface ExportData {
  version: string;
  exportDate: string;
  flashcards: FlashcardData[];
  studySessions: StudySession[];
  metadata: {
    totalCards: number;
    totalSessions: number;
    exportType: 'full' | 'progress-only';
  };
}

export class DataExportImport {
  private static readonly EXPORT_VERSION = '1.0.0';
  private static readonly STORAGE_KEYS = {
    CARDS: 'linguaFlipCards',
    SESSIONS: 'linguaFlipStudySessions'
  };

  /**
   * Export all progress data including flashcards and study sessions
   */
  static exportAllData(): ExportData {
    const flashcards = this.loadCardsFromStorage();
    const studySessions = this.loadSessionsFromStorage();

    return {
      version: this.EXPORT_VERSION,
      exportDate: new Date().toISOString(),
      flashcards,
      studySessions,
      metadata: {
        totalCards: flashcards.length,
        totalSessions: studySessions.length,
        exportType: 'full'
      }
    };
  }

  /**
   * Export only progress data (study sessions)
   */
  static exportProgressData(): ExportData {
    const studySessions = this.loadSessionsFromStorage();

    return {
      version: this.EXPORT_VERSION,
      exportDate: new Date().toISOString(),
      flashcards: [],
      studySessions,
      metadata: {
        totalCards: 0,
        totalSessions: studySessions.length,
        exportType: 'progress-only'
      }
    };
  }

  /**
   * Download export data as JSON file
   */
  static downloadExportData(data: ExportData, filename?: string): void {
    const dataStr = JSON.stringify(data, null, 2);
    const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);

    const exportFileDefaultName = filename || `linguaflip-backup-${new Date().toISOString().split('T')[0]}.json`;

    const linkElement = document.createElement('a');
    linkElement.setAttribute('href', dataUri);
    linkElement.setAttribute('download', exportFileDefaultName);
    linkElement.click();
  }

  /**
   * Import data from JSON file
   */
  static async importData(file: File): Promise<{ success: boolean; message: string; data?: ExportData }> {
    return new Promise((resolve) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        try {
          const content = e.target?.result as string;
          const importData: ExportData = JSON.parse(content);

          // Validate import data structure
          if (!this.validateImportData(importData)) {
            resolve({
              success: false,
              message: 'Invalid file format. Please select a valid LinguaFlip export file.'
            });
            return;
          }

          // Import the data
          const result = this.processImport(importData);
          resolve(result);

        } catch (error) {
          resolve({
            success: false,
            message: 'Failed to parse the import file. Please ensure it\'s a valid JSON file.'
          });
        }
      };

      reader.onerror = () => {
        resolve({
          success: false,
          message: 'Failed to read the file. Please try again.'
        });
      };

      reader.readAsText(file);
    });
  }

  /**
   * Validate imported data structure
   */
  private static validateImportData(data: any): data is ExportData {
    return (
      data &&
      typeof data.version === 'string' &&
      typeof data.exportDate === 'string' &&
      Array.isArray(data.flashcards) &&
      Array.isArray(data.studySessions) &&
      data.metadata &&
      typeof data.metadata.totalCards === 'number' &&
      typeof data.metadata.totalSessions === 'number' &&
      (data.metadata.exportType === 'full' || data.metadata.exportType === 'progress-only')
    );
  }

  /**
   * Process the import and save data to localStorage
   */
  private static processImport(data: ExportData): { success: boolean; message: string; data: ExportData } {
    try {
      // Import flashcards if present
      if (data.flashcards.length > 0) {
        localStorage.setItem(this.STORAGE_KEYS.CARDS, JSON.stringify(data.flashcards));
      }

      // Import study sessions if present
      if (data.studySessions.length > 0) {
        localStorage.setItem(this.STORAGE_KEYS.SESSIONS, JSON.stringify(data.studySessions));
      }

      const message = data.metadata.exportType === 'full'
        ? `Successfully imported ${data.flashcards.length} cards and ${data.studySessions.length} study sessions.`
        : `Successfully imported ${data.studySessions.length} study sessions.`;

      return {
        success: true,
        message,
        data
      };

    } catch (error) {
      return {
        success: false,
        message: 'Failed to save imported data. Please try again.',
        data
      };
    }
  }

  /**
   * Load cards from localStorage
   */
  private static loadCardsFromStorage(): FlashcardData[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.CARDS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load cards from storage:', error);
      return [];
    }
  }

  /**
   * Load study sessions from localStorage
   */
  private static loadSessionsFromStorage(): StudySession[] {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEYS.SESSIONS);
      return stored ? JSON.parse(stored) : [];
    } catch (error) {
      console.error('Failed to load sessions from storage:', error);
      return [];
    }
  }

  /**
   * Clear all data (for testing purposes)
   */
  static clearAllData(): void {
    localStorage.removeItem(this.STORAGE_KEYS.CARDS);
    localStorage.removeItem(this.STORAGE_KEYS.SESSIONS);
  }

  /**
   * Get data summary for display
   */
  static getDataSummary(): { cardsCount: number; sessionsCount: number; lastBackup?: string } {
    const cards = this.loadCardsFromStorage();
    const sessions = this.loadSessionsFromStorage();

    // Find the most recent export date from sessions (as a proxy for last activity)
    const lastSession = sessions.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    const lastBackup = lastSession ? lastSession.date : undefined;

    return {
      cardsCount: cards.length,
      sessionsCount: sessions.length,
      lastBackup
    };
  }
}