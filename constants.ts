import { FlashcardData } from './types';

// Base flashcard data without SRS properties. These will be added during initialization.
export const INITIAL_FLASHCARDS_DATA: Omit<FlashcardData, 'dueDate' | 'interval' | 'easinessFactor' | 'repetitions' | 'lastReviewed'>[] = [
  { id: 1, english: 'Hello', spanish: 'Hola', exampleEnglish: 'Hello, how are you?', exampleSpanish: 'Hola, ¿cómo estás?', image: 'https://picsum.photos/320/180?random=1' },
  { id: 2, english: 'Goodbye', spanish: 'Adiós', exampleEnglish: 'Goodbye, see you later.', exampleSpanish: 'Adiós, hasta luego.', image: 'https://picsum.photos/320/180?random=2' },
  { id: 3, english: 'Thank you', spanish: 'Gracias', exampleEnglish: 'Thank you for your help.', exampleSpanish: 'Gracias por tu ayuda.', image: 'https://picsum.photos/320/180?random=3' },
  { id: 4, english: 'Please', spanish: 'Por favor', exampleEnglish: 'Can you help me, please?', exampleSpanish: '¿Puedes ayudarme, por favor?', image: 'https://picsum.photos/320/180?random=4' },
  { id: 5, english: 'Yes', spanish: 'Sí', exampleEnglish: 'Yes, I understand.', exampleSpanish: 'Sí, entiendo.', image: 'https://picsum.photos/320/180?random=5' },
  { id: 6, english: 'No', spanish: 'No', exampleEnglish: 'No, I don\'t want that.', exampleSpanish: 'No, no quiero eso.', image: 'https://picsum.photos/320/180?random=6' },
  { id: 7, english: 'Water', spanish: 'Agua', exampleEnglish: 'I would like a glass of water.', exampleSpanish: 'Quisiera un vaso de agua.', image: 'https://picsum.photos/320/180?random=7' },
  { id: 8, english: 'Food', spanish: 'Comida', exampleEnglish: 'The food is delicious.', exampleSpanish: 'La comida está deliciosa.', image: 'https://picsum.photos/320/180?random=8' },
  { id: 9, english: 'House', spanish: 'Casa', exampleEnglish: 'This is my house.', exampleSpanish: 'Esta es mi casa.', image: 'https://picsum.photos/320/180?random=9' },
  { id: 10, english: 'Friend', spanish: 'Amigo/Amiga', exampleEnglish: 'He is my best friend.', exampleSpanish: 'Él es mi mejor amigo.', image: 'https://picsum.photos/320/180?random=10' },
  { id: 11, english: 'Learn', spanish: 'Aprender', exampleEnglish: 'I want to learn English.', exampleSpanish: 'Quiero aprender inglés.', image: 'https://picsum.photos/320/180?random=11' },
  { id: 12, english: 'Speak', spanish: 'Hablar', exampleEnglish: 'Can you speak Spanish?', exampleSpanish: '¿Puedes hablar español?', image: 'https://picsum.photos/320/180?random=12' },
  { id: 13, english: 'Read', spanish: 'Leer', exampleEnglish: 'I like to read books.', exampleSpanish: 'Me gusta leer libros.', image: 'https://picsum.photos/320/180?random=13' },
  { id: 14, english: 'Write', spanish: 'Escribir', exampleEnglish: 'She writes beautiful poems.', exampleSpanish: 'Ella escribe hermosos poemas.', image: 'https://picsum.photos/320/180?random=14' },
  { id: 15, english: 'Today', spanish: 'Hoy', exampleEnglish: 'Today is a sunny day.', exampleSpanish: 'Hoy es un día soleado.', image: 'https://picsum.photos/320/180?random=15' },
];

export const DEFAULT_EASINESS_FACTOR = 2.5;
export const MIN_EASINESS_FACTOR = 1.3;
export const LEARNING_STEPS_DAYS = [1, 6]; // Initial intervals for first few repetitions
