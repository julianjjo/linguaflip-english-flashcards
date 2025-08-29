import React from 'react';
import StudySettings from './StudySettings';
import { StudyProfile } from '../types';

interface SettingsPageProps {
  currentProfile: StudyProfile | null;
  isSettingsOpen: boolean;
  onOpenSettings: () => void;
  onCloseSettings: () => void;
  onProfileChange: (profile: StudyProfile) => void;
  onSaveProfile: (profile: StudyProfile) => void;
  onLoadPreset: (presetId: string) => void;
}

const SettingsPage: React.FC<SettingsPageProps> = ({
  currentProfile,
  isSettingsOpen,
  onOpenSettings,
  onCloseSettings,
  onProfileChange,
  onSaveProfile,
  onLoadPreset,
}) => {
  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-semibold text-primary-600 mb-2">Study Settings</h2>
        <p className="text-neutral-600">Customize your learning experience</p>
      </div>

      <div className="bg-white rounded-xl shadow-lg p-6">
        <StudySettings
          currentProfile={currentProfile}
          isOpen={isSettingsOpen}
          onClose={onCloseSettings}
          onProfileChange={onProfileChange}
          onSaveProfile={onSaveProfile}
          onLoadPreset={onLoadPreset}
        />
      </div>
    </div>
  );
};

export default SettingsPage;