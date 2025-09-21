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
  onSuccess
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
    tags: 'básico, saludo, común'
  });

  const resetForm = () => {
    setFormData({
      english: 'Hello',
      spanish: 'Hola',
      exampleEnglish: 'Hello, how are you today?',
      exampleSpanish: 'Hola, ¿cómo estás hoy?',
      category: 'general',
      image: '',
      tags: 'básico, saludo, común'
    });
    setError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
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
          tags: formData.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        })
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
        reviewCount: 0
      };

      // Update local store
      await flashcardsActions.saveFlashcard(newFlashcard, user.userId);

      // Call success callback
      onSuccess?.(newFlashcard);

      // Emit global event for other components to listen to
      window.dispatchEvent(new CustomEvent('flashcard-created', { detail: { flashcard: newFlashcard } }));

      // Reset form and close modal
      resetForm();
      onClose();

    } catch (error) {
      console.error('Failed to create flashcard:', error);
      setError(error instanceof Error ? error.message : 'Error al crear la flashcard');
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

      setFormData(prev => ({
        ...prev,
        exampleEnglish,
        exampleSpanish
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Crear Nueva Flashcard
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors"
              aria-label="Cerrar modal"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <p className="mt-2 text-gray-600 dark:text-gray-300">
            Crea una nueva tarjeta de vocabulario para tu colección
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {/* Error Display */}
          {error && (
            <div className="p-4 bg-red-50 dark:bg-red-900/50 border border-red-200 dark:border-red-700 rounded-lg">
              <p className="text-red-800 dark:text-red-200 text-sm">{error}</p>
            </div>
          )}

          {/* Main Content */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* English */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Palabra en Inglés *
              </label>
              <input
                type="text"
                name="english"
                value={formData.english}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                placeholder="Hello"
              />
            </div>

            {/* Spanish */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Traducción en Español *
              </label>
              <input
                type="text"
                name="spanish"
                value={formData.spanish}
                onChange={handleInputChange}
                required
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                placeholder="Hola"
              />
            </div>
          </div>

          {/* Examples Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                Ejemplos de Uso
              </h3>
              <button
                type="button"
                onClick={generateWithAI}
                disabled={isLoading || !formData.english.trim()}
                className="flex items-center px-3 py-2 text-sm bg-gradient-to-r from-purple-500 to-blue-500 hover:from-purple-600 hover:to-blue-600 disabled:from-gray-400 disabled:to-gray-500 text-white rounded-lg transition-all duration-200 disabled:cursor-not-allowed"
              >
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
                {isLoading ? 'Generando...' : 'Generar con IA'}
              </button>
            </div>

            <div className="space-y-4">
              {/* Example English */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ejemplo en Inglés
                </label>
                <textarea
                  name="exampleEnglish"
                  value={formData.exampleEnglish}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors resize-none"
                  placeholder="Hello, how are you today?"
                />
              </div>

              {/* Example Spanish */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Ejemplo en Español
                </label>
                <textarea
                  name="exampleSpanish"
                  value={formData.exampleSpanish}
                  onChange={handleInputChange}
                  rows={2}
                  className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors resize-none"
                  placeholder="Hola, ¿cómo estás hoy?"
                />
              </div>
            </div>
          </div>

          {/* Additional Options */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Category */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Categoría
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
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
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Etiquetas (separadas por comas)
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleInputChange}
                className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
                placeholder="básico, saludo, común"
              />
            </div>
          </div>

          {/* Image URL */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              URL de Imagen (opcional)
            </label>
            <input
              type="url"
              name="image"
              value={formData.image}
              onChange={handleInputChange}
              className="w-full px-4 py-3 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent dark:bg-gray-700 dark:text-white transition-colors"
              placeholder="https://ejemplo.com/imagen.jpg"
            />
          </div>

          {/* Actions */}
          <div className="flex flex-col sm:flex-row gap-3 pt-6 border-t border-gray-200 dark:border-gray-700">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg font-medium transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isLoading || !formData.english.trim() || !formData.spanish.trim()}
              className="flex-1 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-400 text-white font-semibold py-3 px-6 rounded-lg transition-colors flex items-center justify-center"
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