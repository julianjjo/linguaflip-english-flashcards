import React, { useState } from 'react';
import { useAuth } from './AuthProvider';
import AuthModal from './AuthModal';
import LoadingSpinner from './LoadingSpinner';
import { logout } from '../stores/auth';

interface UserProfileProps {
  className?: string;
}

const UserProfile: React.FC<UserProfileProps> = ({ className = '' }) => {
  const { isAuthenticated, user, isLoading } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>(
    'login'
  );

  // Listen for global auth modal events
  React.useEffect(() => {
    const handleOpenAuthModal = (event: any) => {
      const mode = event.detail?.mode || 'login';
      setAuthModalMode(mode);
      setIsAuthModalOpen(true);
    };

    window.addEventListener('open-auth-modal', handleOpenAuthModal);

    return () => {
      window.removeEventListener('open-auth-modal', handleOpenAuthModal);
    };
  }, []);

  const handleLogin = () => {
    setAuthModalMode('login');
    setIsAuthModalOpen(true);
  };

  const handleRegister = () => {
    setAuthModalMode('register');
    setIsAuthModalOpen(true);
  };

  const handleLogout = async () => {
    await logout();
  };

  const handleAuthSuccess = () => {
    setIsAuthModalOpen(false);
  };

  if (isLoading) {
    return (
      <div className={`flex items-center justify-center ${className}`}>
        <LoadingSpinner size="sm" color="primary" />
      </div>
    );
  }

  if (isAuthenticated && user) {
    return (
      <div className={`flex items-center space-x-3 ${className}`}>
        {/* User Avatar */}
        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary-100 dark:bg-primary-800">
          <span className="text-sm font-semibold text-primary-600 dark:text-primary-300">
            {user.username?.charAt(0).toUpperCase() ||
              user.email?.charAt(0).toUpperCase() ||
              'U'}
          </span>
        </div>

        {/* User Info */}
        <div className="hidden sm:block">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            {user.username || user.email?.split('@')[0] || 'Usuario'}
          </p>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {user.statistics?.totalCardsStudied || 0} tarjetas estudiadas
          </p>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-gray-200"
          aria-label="Cerrar sesión"
        >
          <svg
            className="h-5 w-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
            />
          </svg>
        </button>
      </div>
    );
  }

  return (
    <>
      <div className={`flex items-center space-x-2 ${className}`}>
        <button
          onClick={handleLogin}
          className="text-sm font-medium text-primary-600 transition-colors hover:text-primary-700 dark:text-primary-400 dark:hover:text-primary-300"
        >
          Iniciar Sesión
        </button>
        <span className="text-gray-300 dark:text-gray-600">|</span>
        <button
          onClick={handleRegister}
          className="rounded-lg bg-primary-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary-700"
        >
          Registrarse
        </button>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        initialMode={authModalMode}
        onSuccess={handleAuthSuccess}
      />
    </>
  );
};

export default UserProfile;
