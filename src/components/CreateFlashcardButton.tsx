import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import CreateFlashcardModal from './CreateFlashcardModal';
import AuthModal from './AuthModal';

interface CreateFlashcardButtonProps {
  className?: string;
  variant?: 'fab' | 'button';
  onFlashcardCreated?: (flashcard: any) => void;
}

const CreateFlashcardButton: React.FC<CreateFlashcardButtonProps> = ({
  className = '',
  variant = 'fab',
  onFlashcardCreated,
}) => {
  const { isAuthenticated } = useAuth();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  // Listen for global create modal events
  React.useEffect(() => {
    const handleOpenCreateModal = () => {
      if (isAuthenticated) {
        setIsCreateModalOpen(true);
      } else {
        setIsAuthModalOpen(true);
      }
    };

    window.addEventListener('open-create-modal', handleOpenCreateModal);

    return () => {
      window.removeEventListener('open-create-modal', handleOpenCreateModal);
    };
  }, [isAuthenticated]);

  const handleClick = () => {
    if (isAuthenticated) {
      setIsCreateModalOpen(true);
    } else {
      setIsAuthModalOpen(true);
    }
  };

  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
    setIsCreateModalOpen(true);
  };

  const handleFlashcardCreated = (flashcard: any) => {
    setIsCreateModalOpen(false);
    onFlashcardCreated?.(flashcard);
  };

  if (variant === 'fab') {
    return (
      <>
        {/* Floating Action Button */}
        <button
          onClick={handleClick}
          className={`group fixed bottom-6 right-6 z-40 flex h-14 w-14 transform items-center justify-center rounded-full bg-primary-600 text-white shadow-lg transition-all duration-200 hover:scale-105 hover:bg-primary-700 hover:shadow-xl active:scale-95 ${className} `}
          aria-label="Crear nueva flashcard"
        >
          <svg
            className="h-6 w-6 transition-transform group-hover:rotate-90"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 4v16m8-8H4"
            />
          </svg>

          {/* Tooltip */}
          <div className="pointer-events-none absolute right-full mr-3 whitespace-nowrap rounded-lg bg-gray-900 px-3 py-2 text-sm text-white opacity-0 transition-opacity duration-200 group-hover:opacity-100">
            {isAuthenticated
              ? 'Crear flashcard'
              : 'Inicia sesión para crear flashcards'}
            <div className="absolute left-full top-1/2 h-0 w-0 -translate-y-1/2 transform border-b-4 border-l-4 border-t-4 border-b-transparent border-l-gray-900 border-t-transparent"></div>
          </div>
        </button>

        {/* Modals */}
        <CreateFlashcardModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleFlashcardCreated}
        />

        <AuthModal
          isOpen={isAuthModalOpen}
          onClose={() => setIsAuthModalOpen(false)}
          initialMode="register"
          onSuccess={handleAuthSuccess}
        />
      </>
    );
  }

  // Button variant
  return (
    <>
      <button
        onClick={handleClick}
        className={`inline-flex items-center rounded-lg bg-primary-600 px-4 py-2 font-medium text-white transition-colors duration-200 hover:bg-primary-700 ${className} `}
      >
        <svg
          className="mr-2 h-5 w-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 4v16m8-8H4"
          />
        </svg>
        {isAuthenticated ? 'Crear Flashcard' : 'Crear Flashcard'}
      </button>

      {/* Modals */}
      <CreateFlashcardModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleFlashcardCreated}
      />

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode="register"
        onSuccess={handleAuthSuccess}
      />
    </>
  );
};

export default CreateFlashcardButton;
