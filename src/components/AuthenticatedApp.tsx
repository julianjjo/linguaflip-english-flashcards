import React from 'react';
import AuthProvider from './AuthProvider';
import UserProfile from './UserProfile';
import CreateFlashcardButton from './CreateFlashcardButton';

interface AuthenticatedAppProps {
  children?: React.ReactNode;
  showUserProfile?: boolean;
  showCreateButton?: boolean;
}

const AuthenticatedApp: React.FC<AuthenticatedAppProps> = ({ 
  children, 
  showUserProfile = true, 
  showCreateButton = true 
}) => {
  return (
    <AuthProvider>
      {children}
      {showUserProfile && (
        <div className="fixed top-0 right-16 z-50 flex items-center h-16 px-4">
          <UserProfile />
        </div>
      )}
      {showCreateButton && <CreateFlashcardButton />}
    </AuthProvider>
  );
};

export default AuthenticatedApp;