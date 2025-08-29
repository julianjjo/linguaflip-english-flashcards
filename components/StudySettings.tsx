import React, { useState, useEffect } from 'react';
import {
  StudyProfile,
  StudyModeConfig,
  DifficultyFilter,
  SessionControls,
  AudioSettings,
  VisualSettings,
  NotificationSettings,
  StudyGoals,
  StudyMode,
  DifficultyLevel,
  CardLimit,
  SessionDuration
} from '../types';
import {
  DEFAULT_STUDY_MODE,
  DEFAULT_DIFFICULTY_FILTER,
  DEFAULT_SESSION_CONTROLS,
  DEFAULT_AUDIO_SETTINGS,
  DEFAULT_VISUAL_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_STUDY_GOALS,
  STUDY_PRESETS
} from '../constants';

interface StudySettingsProps {
  currentProfile: StudyProfile | null;
  onProfileChange: (profile: StudyProfile) => void;
  onSaveProfile: (profile: StudyProfile) => void;
  onLoadPreset: (presetId: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const StudySettings: React.FC<StudySettingsProps> = ({
  currentProfile,
  onProfileChange,
  onSaveProfile,
  onLoadPreset,
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'session' | 'mode' | 'difficulty' | 'audio' | 'visual' | 'notifications' | 'goals' | 'profiles'>('session');
  const [profileName, setProfileName] = useState('');
  const [showSaveDialog, setShowSaveDialog] = useState(false);

  // Initialize with current profile or defaults
  const [studyMode, setStudyMode] = useState<StudyModeConfig>(currentProfile?.studyMode || DEFAULT_STUDY_MODE);
  const [difficultyFilter, setDifficultyFilter] = useState<DifficultyFilter>(currentProfile?.difficultyFilter || DEFAULT_DIFFICULTY_FILTER);
  const [sessionControls, setSessionControls] = useState<SessionControls>(currentProfile?.sessionControls || DEFAULT_SESSION_CONTROLS);
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(currentProfile?.audioSettings || DEFAULT_AUDIO_SETTINGS);
  const [visualSettings, setVisualSettings] = useState<VisualSettings>(currentProfile?.visualSettings || DEFAULT_VISUAL_SETTINGS);
  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>(currentProfile?.notificationSettings || DEFAULT_NOTIFICATION_SETTINGS);
  const [studyGoals, setStudyGoals] = useState<StudyGoals>(currentProfile?.studyGoals || DEFAULT_STUDY_GOALS);

  // Update local state when currentProfile changes
  useEffect(() => {
    if (currentProfile) {
      setStudyMode(currentProfile.studyMode);
      setDifficultyFilter(currentProfile.difficultyFilter);
      setSessionControls(currentProfile.sessionControls);
      setAudioSettings(currentProfile.audioSettings);
      setVisualSettings(currentProfile.visualSettings);
      setNotificationSettings(currentProfile.notificationSettings);
      setStudyGoals(currentProfile.studyGoals);
      setProfileName(currentProfile.name);
    }
  }, [currentProfile]);

  const handleSaveProfile = () => {
    if (!profileName.trim()) return;

    const newProfile: StudyProfile = {
      id: currentProfile?.id || `profile_${Date.now()}`,
      name: profileName.trim(),
      description: currentProfile?.description,
      studyMode,
      difficultyFilter,
      sessionControls,
      audioSettings,
      visualSettings,
      notificationSettings,
      studyGoals,
      createdAt: currentProfile?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isDefault: currentProfile?.isDefault || false
    };

    onSaveProfile(newProfile);
    setShowSaveDialog(false);
  };

  const handleLoadPreset = (presetId: string) => {
    onLoadPreset(presetId);
  };

  const tabs = [
    { id: 'session', label: 'Session', icon: '⏱️' },
    { id: 'mode', label: 'Study Mode', icon: '🎯' },
    { id: 'difficulty', label: 'Difficulty', icon: '📊' },
    { id: 'audio', label: 'Audio', icon: '🔊' },
    { id: 'visual', label: 'Visual', icon: '👁️' },
    { id: 'notifications', label: 'Notifications', icon: '🔔' },
    { id: 'goals', label: 'Goals', icon: '🎯' },
    { id: 'profiles', label: 'Profiles', icon: '💾' }
  ];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-200">
          <h2 className="text-2xl font-bold text-neutral-900">Study Settings</h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-neutral-100 transition-colors"
          >
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex h-[600px]">
          {/* Sidebar */}
          <div className="w-64 border-r border-neutral-200 p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                    activeTab === tab.id
                      ? 'bg-primary-100 text-primary-700 border-r-2 border-primary-600'
                      : 'text-neutral-700 hover:bg-neutral-100'
                  }`}
                >
                  <span className="mr-3">{tab.icon}</span>
                  {tab.label}
                </button>
              ))}
            </nav>

            {/* Quick Actions */}
            <div className="mt-8 pt-4 border-t border-neutral-200">
              <button
                onClick={() => setShowSaveDialog(true)}
                className="w-full mb-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                Save Profile
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 p-6 overflow-y-auto">
            {activeTab === 'session' && <SessionControlsTab controls={sessionControls} onChange={setSessionControls} />}
            {activeTab === 'mode' && <StudyModeTab mode={studyMode} onChange={setStudyMode} />}
            {activeTab === 'difficulty' && <DifficultyTab filter={difficultyFilter} onChange={setDifficultyFilter} />}
            {activeTab === 'audio' && <AudioTab settings={audioSettings} onChange={setAudioSettings} />}
            {activeTab === 'visual' && <VisualTab settings={visualSettings} onChange={setVisualSettings} />}
            {activeTab === 'notifications' && <NotificationsTab settings={notificationSettings} onChange={setNotificationSettings} />}
            {activeTab === 'goals' && <GoalsTab goals={studyGoals} onChange={setStudyGoals} />}
            {activeTab === 'profiles' && <ProfilesTab presets={STUDY_PRESETS} onLoadPreset={handleLoadPreset} />}
          </div>
        </div>

        {/* Save Profile Dialog */}
        {showSaveDialog && (
          <div className="absolute inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white rounded-lg p-6 w-96">
              <h3 className="text-lg font-semibold mb-4">Save Study Profile</h3>
              <input
                type="text"
                placeholder="Profile name"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full px-3 py-2 border border-neutral-300 rounded-lg mb-4"
              />
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowSaveDialog(false)}
                  className="px-4 py-2 text-neutral-600 hover:bg-neutral-100 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                >
                  Save
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Session Controls Tab
const SessionControlsTab: React.FC<{
  controls: SessionControls;
  onChange: (controls: SessionControls) => void;
}> = ({ controls, onChange }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-neutral-900">Session Controls</h3>

    <div className="grid grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Daily Card Limit
        </label>
        <select
          value={controls.dailyCardLimit}
          onChange={(e) => onChange({ ...controls, dailyCardLimit: Number(e.target.value) as CardLimit })}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
        >
          <option value={10}>10 cards</option>
          <option value={25}>25 cards</option>
          <option value={50}>50 cards</option>
          <option value={100}>100 cards</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Session Duration
        </label>
        <select
          value={controls.sessionDuration}
          onChange={(e) => onChange({ ...controls, sessionDuration: Number(e.target.value) as SessionDuration })}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
        >
          <option value={15}>15 minutes</option>
          <option value={30}>30 minutes</option>
          <option value={45}>45 minutes</option>
          <option value={60}>60 minutes</option>
        </select>
      </div>
    </div>

    <div className="grid grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Break Interval (minutes)
        </label>
        <input
          type="number"
          min="0"
          max="60"
          value={controls.breakInterval}
          onChange={(e) => onChange({ ...controls, breakInterval: Number(e.target.value) })}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Break Duration (seconds)
        </label>
        <input
          type="number"
          min="10"
          max="300"
          value={controls.breakDuration}
          onChange={(e) => onChange({ ...controls, breakDuration: Number(e.target.value) })}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
        />
      </div>
    </div>

    <div className="space-y-3">
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={controls.enablePauseResume}
          onChange={(e) => onChange({ ...controls, enablePauseResume: e.target.checked })}
          className="mr-3"
        />
        <span className="text-sm text-neutral-700">Enable pause/resume functionality</span>
      </label>

      <label className="flex items-center">
        <input
          type="checkbox"
          checked={controls.autoSaveProgress}
          onChange={(e) => onChange({ ...controls, autoSaveProgress: e.target.checked })}
          className="mr-3"
        />
        <span className="text-sm text-neutral-700">Auto-save progress</span>
      </label>
    </div>
  </div>
);

// Study Mode Tab
const StudyModeTab: React.FC<{
  mode: StudyModeConfig;
  onChange: (mode: StudyModeConfig) => void;
}> = ({ mode, onChange }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-neutral-900">Study Mode</h3>

    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-3">
        Select Study Mode
      </label>
      <div className="grid grid-cols-2 gap-3">
        {[
          { value: 'review-only', label: 'Review Only', desc: 'Practice mastered cards' },
          { value: 'new-cards-only', label: 'New Cards Only', desc: 'Learn new vocabulary' },
          { value: 'mixed', label: 'Mixed Mode', desc: 'Balanced learning' },
          { value: 'difficult-cards', label: 'Difficult Cards', desc: 'Focus on challenging content' },
          { value: 'custom', label: 'Custom Mode', desc: 'User-defined ratios' }
        ].map((option) => (
          <label key={option.value} className="flex items-start p-3 border border-neutral-300 rounded-lg cursor-pointer hover:bg-neutral-50">
            <input
              type="radio"
              name="studyMode"
              value={option.value}
              checked={mode.mode === option.value}
              onChange={(e) => onChange({ ...mode, mode: e.target.value as StudyMode })}
              className="mt-1 mr-3"
            />
            <div>
              <div className="font-medium text-neutral-900">{option.label}</div>
              <div className="text-sm text-neutral-600">{option.desc}</div>
            </div>
          </label>
        ))}
      </div>
    </div>

    {mode.mode === 'custom' && mode.customRatios && (
      <div className="mt-6 p-4 bg-neutral-50 rounded-lg">
        <h4 className="font-medium text-neutral-900 mb-3">Custom Ratios (%)</h4>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm text-neutral-700 mb-1">Review Cards</label>
            <input
              type="number"
              min="0"
              max="100"
              value={mode.customRatios.reviewCards}
              onChange={(e) => onChange({
                ...mode,
                customRatios: { ...mode.customRatios!, reviewCards: Number(e.target.value) }
              })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-700 mb-1">New Cards</label>
            <input
              type="number"
              min="0"
              max="100"
              value={mode.customRatios.newCards}
              onChange={(e) => onChange({
                ...mode,
                customRatios: { ...mode.customRatios!, newCards: Number(e.target.value) }
              })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
            />
          </div>
          <div>
            <label className="block text-sm text-neutral-700 mb-1">Difficult Cards</label>
            <input
              type="number"
              min="0"
              max="100"
              value={mode.customRatios.difficultCards}
              onChange={(e) => onChange({
                ...mode,
                customRatios: { ...mode.customRatios!, difficultCards: Number(e.target.value) }
              })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
            />
          </div>
        </div>
      </div>
    )}
  </div>
);

// Difficulty Tab
const DifficultyTab: React.FC<{
  filter: DifficultyFilter;
  onChange: (filter: DifficultyFilter) => void;
}> = ({ filter, onChange }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-neutral-900">Difficulty Filtering</h3>

    <label className="flex items-center">
      <input
        type="checkbox"
        checked={filter.enabled}
        onChange={(e) => onChange({ ...filter, enabled: e.target.checked })}
        className="mr-3"
      />
      <span className="text-sm font-medium text-neutral-700">Enable difficulty filtering</span>
    </label>

    {filter.enabled && (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-neutral-700 mb-2">
            Difficulty Levels
          </label>
          <div className="flex space-x-4">
            {(['easy', 'medium', 'hard'] as DifficultyLevel[]).map((level) => (
              <label key={level} className="flex items-center">
                <input
                  type="checkbox"
                  checked={filter.levels.includes(level)}
                  onChange={(e) => {
                    const newLevels = e.target.checked
                      ? [...filter.levels, level]
                      : filter.levels.filter(l => l !== level);
                    onChange({ ...filter, levels: newLevels });
                  }}
                  className="mr-2"
                />
                <span className="text-sm text-neutral-700 capitalize">{level}</span>
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filter.focusRecentCards}
              onChange={(e) => onChange({ ...filter, focusRecentCards: e.target.checked })}
              className="mr-3"
            />
            <span className="text-sm text-neutral-700">Focus on recently added cards</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filter.prioritizeDueCards}
              onChange={(e) => onChange({ ...filter, prioritizeDueCards: e.target.checked })}
              className="mr-3"
            />
            <span className="text-sm text-neutral-700">Prioritize cards due for review</span>
          </label>

          <label className="flex items-center">
            <input
              type="checkbox"
              checked={filter.excludeMasteredCards}
              onChange={(e) => onChange({ ...filter, excludeMasteredCards: e.target.checked })}
              className="mr-3"
            />
            <span className="text-sm text-neutral-700">Exclude mastered cards</span>
          </label>
        </div>

        {filter.focusRecentCards && (
          <div>
            <label className="block text-sm font-medium text-neutral-700 mb-2">
              Recent Days Threshold
            </label>
            <input
              type="number"
              min="1"
              max="365"
              value={filter.recentDaysThreshold}
              onChange={(e) => onChange({ ...filter, recentDaysThreshold: Number(e.target.value) })}
              className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
            />
          </div>
        )}
      </div>
    )}
  </div>
);

// Audio Tab
const AudioTab: React.FC<{
  settings: AudioSettings;
  onChange: (settings: AudioSettings) => void;
}> = ({ settings, onChange }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-neutral-900">Audio Settings</h3>

    <div className="grid grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Speech Speed
        </label>
        <select
          value={settings.speed}
          onChange={(e) => onChange({ ...settings, speed: Number(e.target.value) as AudioSettings['speed'] })}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
        >
          <option value={0.5}>Very Slow (0.5x)</option>
          <option value={0.75}>Slow (0.75x)</option>
          <option value={1.0}>Normal (1.0x)</option>
          <option value={1.25}>Fast (1.25x)</option>
          <option value={1.5}>Very Fast (1.5x)</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Voice Type
        </label>
        <select
          value={settings.voice}
          onChange={(e) => onChange({ ...settings, voice: e.target.value as AudioSettings['voice'] })}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
        >
          <option value="default">Default</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
        </select>
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-2">
        Volume ({settings.volume}%)
      </label>
      <input
        type="range"
        min="0"
        max="100"
        value={settings.volume}
        onChange={(e) => onChange({ ...settings, volume: Number(e.target.value) })}
        className="w-full"
      />
    </div>

    <div className="space-y-3">
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={settings.autoPlay}
          onChange={(e) => onChange({ ...settings, autoPlay: e.target.checked })}
          className="mr-3"
        />
        <span className="text-sm text-neutral-700">Auto-play audio for cards</span>
      </label>

      <label className="flex items-center">
        <input
          type="checkbox"
          checked={settings.enableBackgroundMusic}
          onChange={(e) => onChange({ ...settings, enableBackgroundMusic: e.target.checked })}
          className="mr-3"
        />
        <span className="text-sm text-neutral-700">Enable background music</span>
      </label>
    </div>
  </div>
);

// Visual Tab
const VisualTab: React.FC<{
  settings: VisualSettings;
  onChange: (settings: VisualSettings) => void;
}> = ({ settings, onChange }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-neutral-900">Visual Settings</h3>

    <div className="grid grid-cols-3 gap-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Card Size
        </label>
        <select
          value={settings.cardSize}
          onChange={(e) => onChange({ ...settings, cardSize: e.target.value as VisualSettings['cardSize'] })}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Font Size
        </label>
        <select
          value={settings.fontSize}
          onChange={(e) => onChange({ ...settings, fontSize: e.target.value as VisualSettings['fontSize'] })}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
        >
          <option value="small">Small</option>
          <option value="medium">Medium</option>
          <option value="large">Large</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Theme
        </label>
        <select
          value={settings.theme}
          onChange={(e) => onChange({ ...settings, theme: e.target.value as VisualSettings['theme'] })}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
        >
          <option value="light">Light</option>
          <option value="dark">Dark</option>
          <option value="auto">Auto</option>
        </select>
      </div>
    </div>

    <div className="space-y-3">
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={settings.showProgressBar}
          onChange={(e) => onChange({ ...settings, showProgressBar: e.target.checked })}
          className="mr-3"
        />
        <span className="text-sm text-neutral-700">Show progress bar</span>
      </label>

      <label className="flex items-center">
        <input
          type="checkbox"
          checked={settings.showCardCounter}
          onChange={(e) => onChange({ ...settings, showCardCounter: e.target.checked })}
          className="mr-3"
        />
        <span className="text-sm text-neutral-700">Show card counter</span>
      </label>

      <label className="flex items-center">
        <input
          type="checkbox"
          checked={settings.enableAnimations}
          onChange={(e) => onChange({ ...settings, enableAnimations: e.target.checked })}
          className="mr-3"
        />
        <span className="text-sm text-neutral-700">Enable animations</span>
      </label>
    </div>
  </div>
);

// Notifications Tab
const NotificationsTab: React.FC<{
  settings: NotificationSettings;
  onChange: (settings: NotificationSettings) => void;
}> = ({ settings, onChange }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-neutral-900">Notification Settings</h3>

    <div className="space-y-4">
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={settings.enableBreakReminders}
          onChange={(e) => onChange({ ...settings, enableBreakReminders: e.target.checked })}
          className="mr-3"
        />
        <span className="text-sm text-neutral-700">Break reminders</span>
      </label>

      <label className="flex items-center">
        <input
          type="checkbox"
          checked={settings.enableSessionComplete}
          onChange={(e) => onChange({ ...settings, enableSessionComplete: e.target.checked })}
          className="mr-3"
        />
        <span className="text-sm text-neutral-700">Session completion notifications</span>
      </label>

      <label className="flex items-center">
        <input
          type="checkbox"
          checked={settings.enableDailyGoal}
          onChange={(e) => onChange({ ...settings, enableDailyGoal: e.target.checked })}
          className="mr-3"
        />
        <span className="text-sm text-neutral-700">Daily goal reminders</span>
      </label>

      <label className="flex items-center">
        <input
          type="checkbox"
          checked={settings.enableStreakReminders}
          onChange={(e) => onChange({ ...settings, enableStreakReminders: e.target.checked })}
          className="mr-3"
        />
        <span className="text-sm text-neutral-700">Streak maintenance reminders</span>
      </label>
    </div>

    <div className="pt-4 border-t border-neutral-200">
      <h4 className="font-medium text-neutral-900 mb-3">Alert Types</h4>
      <div className="space-y-3">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={settings.soundEnabled}
            onChange={(e) => onChange({ ...settings, soundEnabled: e.target.checked })}
            className="mr-3"
          />
          <span className="text-sm text-neutral-700">Sound notifications</span>
        </label>

        <label className="flex items-center">
          <input
            type="checkbox"
            checked={settings.vibrationEnabled}
            onChange={(e) => onChange({ ...settings, vibrationEnabled: e.target.checked })}
            className="mr-3"
          />
          <span className="text-sm text-neutral-700">Vibration (mobile)</span>
        </label>
      </div>
    </div>
  </div>
);

// Goals Tab
const GoalsTab: React.FC<{
  goals: StudyGoals;
  onChange: (goals: StudyGoals) => void;
}> = ({ goals, onChange }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-neutral-900">Study Goals</h3>

    <div className="grid grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Daily Card Goal
        </label>
        <input
          type="number"
          min="1"
          max="500"
          value={goals.dailyCardGoal}
          onChange={(e) => onChange({ ...goals, dailyCardGoal: Number(e.target.value) })}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Accuracy Target (%)
        </label>
        <input
          type="number"
          min="1"
          max="100"
          value={goals.accuracyTarget}
          onChange={(e) => onChange({ ...goals, accuracyTarget: Number(e.target.value) })}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
        />
      </div>
    </div>

    <div className="grid grid-cols-2 gap-6">
      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Weekly Card Goal
        </label>
        <input
          type="number"
          min="1"
          max="1000"
          value={goals.weeklyCardGoal}
          onChange={(e) => onChange({ ...goals, weeklyCardGoal: Number(e.target.value) })}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral-700 mb-2">
          Monthly Card Goal
        </label>
        <input
          type="number"
          min="1"
          max="2000"
          value={goals.monthlyCardGoal}
          onChange={(e) => onChange({ ...goals, monthlyCardGoal: Number(e.target.value) })}
          className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
        />
      </div>
    </div>

    <div>
      <label className="block text-sm font-medium text-neutral-700 mb-2">
        Streak Target (days)
      </label>
      <input
        type="number"
        min="1"
        max="365"
        value={goals.streakTarget}
        onChange={(e) => onChange({ ...goals, streakTarget: Number(e.target.value) })}
        className="w-full px-3 py-2 border border-neutral-300 rounded-lg"
      />
    </div>
  </div>
);

// Profiles Tab
const ProfilesTab: React.FC<{
  presets: typeof STUDY_PRESETS;
  onLoadPreset: (presetId: string) => void;
}> = ({ presets, onLoadPreset }) => (
  <div className="space-y-6">
    <h3 className="text-xl font-semibold text-neutral-900">Study Profiles & Presets</h3>

    <div>
      <h4 className="font-medium text-neutral-900 mb-3">Quick Presets</h4>
      <div className="grid grid-cols-1 gap-3">
        {presets.map((preset) => (
          <div key={preset.id} className="p-4 border border-neutral-300 rounded-lg">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{preset.icon}</span>
                  <h5 className="font-medium text-neutral-900">{preset.name}</h5>
                  <span className="px-2 py-1 text-xs bg-neutral-100 text-neutral-600 rounded">
                    {preset.category}
                  </span>
                </div>
                <p className="text-sm text-neutral-600 mb-3">{preset.description}</p>
              </div>
              <button
                onClick={() => onLoadPreset(preset.id)}
                className="px-4 py-2 bg-primary-600 text-white text-sm rounded-lg hover:bg-primary-700 transition-colors"
              >
                Load Preset
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>

    <div className="mt-8 p-4 bg-neutral-50 rounded-lg">
      <h4 className="font-medium text-neutral-900 mb-2">Custom Profiles</h4>
      <p className="text-sm text-neutral-600">
        Save your custom study configurations as profiles for quick access.
        Use the "Save Profile" button to create a new profile with your current settings.
      </p>
    </div>
  </div>
);

export default StudySettings;