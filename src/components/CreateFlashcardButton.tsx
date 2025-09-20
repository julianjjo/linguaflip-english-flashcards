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
  onFlashcardCreated
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
          className={`
            fixed bottom-6 right-6 z-40
            w-14 h-14 bg-primary-600 hover:bg-primary-700 
            text-white rounded-full shadow-lg hover:shadow-xl
            transform hover:scale-105 active:scale-95
            transition-all duration-200
            flex items-center justify-center
            group
            ${className}
          `}
          aria-label="Crear nueva flashcard"
        >
          <svg 
            className="w-6 h-6 transition-transform group-hover:rotate-90" 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          
          {/* Tooltip */}
          <div className="absolute right-full mr-3 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 whitespace-nowrap pointer-events-none">
            {isAuthenticated ? 'Crear flashcard' : 'Inicia sesión para crear flashcards'}
            <div className="absolute left-full top-1/2 transform -translate-y-1/2 w-0 h-0 border-l-4 border-l-gray-900 border-t-4 border-t-transparent border-b-4 border-b-transparent"></div>
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
        className={`
          inline-flex items-center px-4 py-2 
          bg-primary-600 hover:bg-primary-700 
          text-white font-medium rounded-lg 
          transition-colors duration-200
          ${className}
        `}
      >
        <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
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