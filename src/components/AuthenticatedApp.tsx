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
  showCreateButton = true,
}) => {
  return (
    <AuthProvider>
      {children}
      {showUserProfile && (
        <div className="fixed right-16 top-0 z-50 flex h-16 items-center px-4">
          <UserProfile />
        </div>
      )}
      {showCreateButton && <CreateFlashcardButton />}
    </AuthProvider>
  );
};

export default AuthenticatedApp;
