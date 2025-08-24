export interface FlashcardData {
  id: number;
  english: string;
  spanish: string;
  exampleEnglish?: string;
  exampleSpanish?: string;
  image?: string;
  // Spaced Repetition System (SRS) fields
  dueDate: string; // ISO date string (YYYY-MM-DD)
  interval: number; // Interval in days
  easinessFactor: number; // Factor to modulate interval increases
  repetitions: number; // Number of successful recalls in a row
  lastReviewed: string | null; // ISO date string of last review
}
