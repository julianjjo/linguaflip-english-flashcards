import React from 'react';
import { useAudioSystem } from '@/hooks/useAudioSystem';
import { useNumericInput } from '@/hooks/useNumericInput';
import { useErrorHandler } from '@/hooks/useErrorHandler';
import { ActionButton } from './ActionButton';

const AudioSettings: React.FC = () => {
  const {
    isSupported,
    voices,
    settings,
    updateSettings,
    speak,
    isSpeaking
  } = useAudioSystem();

  // Feature flags
  // const geminiTTSEnabled = useFeatureFlag('gemini-tts');
  // const enhancedSettingsEnabled = useFeatureFlag('enhanced-audio-settings');

  // Use custom hooks to reduce duplication
  const { handleNumericChange } = useNumericInput(updateSettings, {
    min: 0.5,
    max: 2,
    step: 0.1
  });

  const { handleAsyncError } = useErrorHandler('AudioSettings');

  const handleVoiceChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedVoice = voices.find(voice => voice.name === event.target.value);
    if (selectedVoice) {
      updateSettings({ voice: selectedVoice });
    }
  };

  const testAudio = async () => {
    await handleAsyncError(
      () => speak('Hello! This is a test of the audio system.'),
      'Test audio failed'
    );
  };

  if (!isSupported) {
    return (
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <h3 className="text-sm font-medium text-yellow-800">
              Audio Not Supported
            </h3>
            <div className="mt-2 text-sm text-yellow-700">
              <p>Your browser doesn't support speech synthesis. Audio features will use fallback methods.</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">Audio Settings</h3>
        <p className="text-sm text-gray-600 mb-6">
          Customize your audio experience for flashcard pronunciation.
        </p>
      </div>

      {/* Voice Selection */}
      <div>
        <label htmlFor="voice-select" className="block text-sm font-medium text-gray-700 mb-2">
          Voice
        </label>
        <select
          id="voice-select"
          value={settings.voice?.name || ''}
          onChange={handleVoiceChange}
          className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
        >
          {voices.map((voice) => (
            <option key={voice.name} value={voice.name}>
              {voice.name} ({voice.lang})
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-gray-500">
          Choose your preferred voice for pronunciation
        </p>
      </div>

      {/* Speech Rate */}
      <div>
        <label htmlFor="rate-slider" className="block text-sm font-medium text-gray-700 mb-2">
          Speed: {settings.rate.toFixed(1)}x
        </label>
        <input
          id="rate-slider"
          type="range"
          min="0.5"
          max="2"
          step="0.1"
          value={settings.rate}
          onChange={handleNumericChange('rate')}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Slow</span>
          <span>Normal</span>
          <span>Fast</span>
        </div>
      </div>

      {/* Pitch */}
      <div>
        <label htmlFor="pitch-slider" className="block text-sm font-medium text-gray-700 mb-2">
          Pitch: {settings.pitch.toFixed(1)}
        </label>
        <input
          id="pitch-slider"
          type="range"
          min="0"
          max="2"
          step="0.1"
          value={settings.pitch}
          onChange={handleNumericChange('pitch')}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Low</span>
          <span>Normal</span>
          <span>High</span>
        </div>
      </div>

      {/* Volume */}
      <div>
        <label htmlFor="volume-slider" className="block text-sm font-medium text-gray-700 mb-2">
          Volume: {Math.round(settings.volume * 100)}%
        </label>
        <input
          id="volume-slider"
          type="range"
          min="0"
          max="1"
          step="0.1"
          value={settings.volume}
          onChange={handleNumericChange('volume')}
          className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
        />
        <div className="flex justify-between text-xs text-gray-500 mt-1">
          <span>Mute</span>
          <span>Medium</span>
          <span>Max</span>
        </div>
      </div>

      {/* Test Button */}
      <div className="pt-4 border-t border-gray-200">
        <ActionButton
          onClick={testAudio}
          disabled={isSpeaking}
          loading={isSpeaking}
          variant="primary"
          size="md"
          aria-label="Test current audio settings"
        >
          {isSpeaking ? 'Playing...' : 'Test Audio'}
        </ActionButton>
        <p className="mt-2 text-xs text-gray-500">
          Click to test your current audio settings
        </p>
      </div>

      {/* Audio Status */}
      <div className="bg-gray-50 rounded-lg p-4">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Audio System Status</h4>
        <div className="space-y-1 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Speech Synthesis API:</span>
            <span className="text-green-600">✓ Supported</span>
          </div>
          <div className="flex justify-between">
            <span>Available Voices:</span>
            <span>{voices.length}</span>
          </div>
          <div className="flex justify-between">
            <span>Current Voice:</span>
            <span className="truncate ml-2 max-w-32">{settings.voice?.name || 'Default'}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AudioSettings;