import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import LoadingSpinner from './LoadingSpinner';
import { flashcardsActions } from '../stores/flashcards';

interface CreateFlashcardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (flashcard: any) => void;
}

interface FormData {
  english: string;
  spanish: string;
  exampleEnglish: string;
  exampleSpanish: string;
  category: string;
  image: string;
  tags: string;
}

const CreateFlashcardModal: React.FC<CreateFlashcardModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { user, isAuthenticated } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState<FormData>({
    english: 'Hello',
    spanish: 'Hola',
    exampleEnglish: 'Hello, how are you today?',
    exampleSpanish: 'Hola, ¿cómo estás hoy?',
    category: 'general',
    image: '',
    tags: 'básico, saludo, común',
  });

  const resetForm = () => {
    setFormData({
      english: 'Hello',
      spanish: 'Hola',
      exampleEnglish: 'Hello, how are you today?',
      exampleSpanish: 'Hola, ¿cómo estás hoy?',
      category: 'general',
      image: '',
      tags: 'básico, saludo, común',
    });
    setError(null);
  };

  const handleInputChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!isAuthenticated || !user?.userId) {
      setError('Debes iniciar sesión para crear flashcards');
      return;
    }

    if (!formData.english.trim() || !formData.spanish.trim()) {
      setError('El texto en inglés y español son obligatorios');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create flashcard via API
      const response = await fetch('/api/flashcards/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
        body: JSON.stringify({
          english: formData.english.trim(),
          spanish: formData.spanish.trim(),
          exampleEnglish: formData.exampleEnglish.trim() || undefined,
          exampleSpanish: formData.exampleSpanish.trim() || undefined,
          category: formData.category,
          image: formData.image.trim() || null,
          tags: formData.tags
            .split(',')
            .map((tag) => tag.trim())
            .filter(Boolean),
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Error al crear la flashcard');
      }

      // Convert to local format and update store
      const newFlashcard = {
        id: parseInt(data.data.cardId), // Convert string ID to number for FlashcardData compatibility
        english: formData.english.trim(),
        spanish: formData.spanish.trim(),
        exampleEnglish: formData.exampleEnglish.trim(),
        exampleSpanish: formData.exampleSpanish.trim(),
        image: formData.image.trim() || undefined,
        category: formData.category,
        difficulty: 1,
        dueDate: new Date().toISOString(),
        interval: 1,
        easinessFactor: 2.5,
        repetitions: 0,
        lastReviewed: null,
        reviewCount: 0,
      };

      // Update local store
      await flashcardsActions.saveFlashcard(newFlashcard, user.userId);

      // Call success callback
      onSuccess?.(newFlashcard);

      // Emit global event for other components to listen to
      window.dispatchEvent(
        new CustomEvent('flashcard-created', {
          detail: { flashcard: newFlashcard },
        })
      );

      // Reset form and close modal
      resetForm();
      onClose();
    } catch (error) {
      console.error('Failed to create flashcard:', error);
      setError(
        error instanceof Error ? error.message : 'Error al crear la flashcard'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const generateWithAI = async () => {
    if (!formData.english.trim()) {
      setError('Escribe una palabra en inglés para generar ejemplos con IA');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // This would integrate with your AI service (Gemini)
      // For now, we'll create a simple example
      const word = formData.english.trim();
      const exampleEnglish = `I love ${word} very much.`;
      const exampleSpanish = formData.spanish.trim()
        ? `Me encanta ${formData.spanish.trim()} mucho.`
        : `Me encanta esta palabra mucho.`;

      setFormData((prev) => ({
        ...prev,
        exampleEnglish,
        exampleSpanish,
      }));
    } catch (error) {
      console.error('AI generation failed:', error);
      setError('Error al generar ejemplos con IA');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl dark:bg-gray-800">
        {/* Header */}
        <div className="border-b border-gray-200 p-6 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Crear Nueva Flashcard
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 transition-colors hover:text-gray-600 dark:hover:text-gray-200"
              aria-label="Cerrar modal"
            >
              <svg
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Crea una nueva tarjeta de vocabulario para tu colección
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Error Display */}
          {error && (
            <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-700 dark:bg-red-900/50">
              <p className="text-sm text-red-800 dark:text-red-200">{error}</p>
            </div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* English */}
            <div>
              <label
                htmlFor="flashcard-english"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Palabra en Inglés *
              </label>
              <input
                type="text"
                name="english"
                id="flashcard-english"
                value={formData.english}
                onChange={handleInputChange}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Hello"
              />
            </div>

            {/* Spanish */}
            <div>
              <label
                htmlFor="flashcard-spanish"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Traducción en Español *
              </label>
              <input
                type="text"
                name="spanish"
                id="flashcard-spanish"
                value={formData.spanish}
                onChange={handleInputChange}
                required
                className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="Hola"
              />
            </div>
          </div>

          {/* Examples Section */}
          <div className="border-t border-gray-200 pt-6 dark:border-gray-700">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Ejemplos de Uso
              </h3>
              <button
                type="button"
                onClick={generateWithAI}
                disabled={isLoading || !formData.english.trim()}
                className="flex items-center rounded-lg bg-gradient-to-r from-purple-500 to-blue-500 px-3 py-2 text-sm text-white transition-all duration-200 hover:from-purple-600 hover:to-blue-600 disabled:cursor-not-allowed disabled:from-gray-400 disabled:to-gray-500"
              >
                <svg
                  className="mr-2 h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
                {isLoading ? 'Generando...' : 'Generar con IA'}
              </button>
            </div>

            <div className="space-y-4">
              {/* Example English */}
              <div>
                <label
                  htmlFor="flashcard-example-english"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Ejemplo en Inglés
                </label>
                <textarea
                  name="exampleEnglish"
                  id="flashcard-example-english"
                  value={formData.exampleEnglish}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Hello, how are you today?"
                />
              </div>

              {/* Example Spanish */}
              <div>
                <label
                  htmlFor="flashcard-example-spanish"
                  className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
                >
                  Ejemplo en Español
                </label>
                <textarea
                  name="exampleSpanish"
                  id="flashcard-example-spanish"
                  value={formData.exampleSpanish}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full resize-none rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                  placeholder="Hola, ¿cómo estás hoy?"
                />
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
            {/* Category */}
            <div>
              <label
                htmlFor="flashcard-category"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Categoría
              </label>
              <select
                name="category"
                id="flashcard-category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              >
                <option value="general">General</option>
                <option value="family">Familia</option>
                <option value="work">Trabajo</option>
                <option value="travel">Viajes</option>
                <option value="food">Comida</option>
                <option value="emotions">Emociones</option>
                <option value="nature">Naturaleza</option>
                <option value="technology">Tecnología</option>
              </select>
            </div>

            {/* Tags */}
            <div>
              <label
                htmlFor="flashcard-tags"
                className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                Etiquetas (separadas por comas)
              </label>
              <input
                type="text"
                name="tags"
                id="flashcard-tags"
                value={formData.tags}
                onChange={handleInputChange}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
                placeholder="básico, saludo, común"
              />
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label
              htmlFor="flashcard-image"
              className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300"
            >
              URL de Imagen (opcional)
            </label>
            <input
              type="url"
              name="image"
              id="flashcard-image"
              value={formData.image}
              onChange={handleInputChange}
              className="w-full rounded-lg border border-gray-300 px-4 py-3 transition-colors focus:border-transparent focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
              placeholder="https://ejemplo.com/imagen.jpg"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col gap-3 border-t border-gray-200 pt-6 dark:border-gray-700 sm:flex-row">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-lg border border-gray-300 px-6 py-3 font-medium text-gray-700 transition-colors hover:bg-gray-50 dark:border-gray-600 dark:text-gray-300 dark:hover:bg-gray-700"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={
                isLoading ||
                !formData.english.trim() ||
                !formData.spanish.trim()
              }
              className="flex flex-1 items-center justify-center rounded-lg bg-primary-600 px-6 py-3 font-semibold text-white transition-colors hover:bg-primary-700 disabled:bg-primary-400"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" color="white" className="mr-2" />
                  Creando...
                </>
              ) : (
                'Crear Flashcard'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateFlashcardModal;
