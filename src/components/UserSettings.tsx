import React from 'react';
import { useUserPreferences } from '@/hooks/useUserPreferences';
import { useToast } from '@/hooks/useToast';
import ThemeToggle from './ThemeToggle';
import LoadingSpinner from './LoadingSpinner';

interface UserSettingsProps {
  isOpen: boolean;
  onClose: () => void;
}

const UserSettings: React.FC<UserSettingsProps> = ({ isOpen, onClose }) => {
  const { preferences, updatePreference, resetToDefaults, isLoading } = useUserPreferences();
  const { showSuccess, showInfo } = useToast();

  if (!isOpen) return null;

  const handleSave = () => {
    showSuccess('Configuración guardada', 'Tus preferencias han sido actualizadas correctamente.');
    onClose();
  };

  const handleReset = () => {
    resetToDefaults();
    showInfo('Configuración restablecida', 'Se han restaurado los valores predeterminados.');
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
        <div className="bg-white dark:bg-gray-800 rounded-lg p-6 shadow-xl">
          <LoadingSpinner size="lg" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Cargando configuración...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
            Configuración de Usuario
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            aria-label="Cerrar configuración"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-8">
          {/* Tema */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Apariencia
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tema
                </label>
                <ThemeToggle variant="button" />
              </div>
            </div>
          </section>

          {/* Audio */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Audio y Voz
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Velocidad de voz
                </label>
                <input
                  type="range"
                  min="0.5"
                  max="2"
                  step="0.1"
                  value={preferences.speechRate}
                  onChange={(e) => updatePreference('speechRate', parseFloat(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-gray-500 ml-2">{preferences.speechRate}x</span>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Tono de voz
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={preferences.speechPitch}
                  onChange={(e) => updatePreference('speechPitch', parseFloat(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-gray-500 ml-2">{preferences.speechPitch}</span>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Volumen
                </label>
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={preferences.speechVolume}
                  onChange={(e) => updatePreference('speechVolume', parseFloat(e.target.value))}
                  className="w-24"
                />
                <span className="text-sm text-gray-500 ml-2">{Math.round(preferences.speechVolume * 100)}%</span>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Audio automático
                </label>
                <button
                  onClick={() => updatePreference('autoPlayAudio', !preferences.autoPlayAudio)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.autoPlayAudio ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.autoPlayAudio ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Estudio */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Configuración de Estudio
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Meta diaria de tarjetas
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={preferences.dailyGoal}
                  onChange={(e) => updatePreference('dailyGoal', parseInt(e.target.value))}
                  className="w-20 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Duración de sesión (minutos)
                </label>
                <input
                  type="number"
                  min="5"
                  max="120"
                  value={preferences.sessionDuration}
                  onChange={(e) => updatePreference('sessionDuration', parseInt(e.target.value))}
                  className="w-20 px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
                />
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Mostrar progreso
                </label>
                <button
                  onClick={() => updatePreference('showProgress', !preferences.showProgress)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.showProgress ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.showProgress ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Accesibilidad */}
          <section>
            <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-4">
              Accesibilidad
            </h3>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Alto contraste
                </label>
                <button
                  onClick={() => updatePreference('highContrast', !preferences.highContrast)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.highContrast ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.highContrast ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Texto grande
                </label>
                <button
                  onClick={() => updatePreference('largeText', !preferences.largeText)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.largeText ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.largeText ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Reducir animaciones
                </label>
                <button
                  onClick={() => updatePreference('reduceMotion', !preferences.reduceMotion)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    preferences.reduceMotion ? 'bg-primary-600' : 'bg-gray-200 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      preferences.reduceMotion ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 dark:border-gray-700">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
          >
            Restablecer valores predeterminados
          </button>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-md transition-colors"
            >
              Guardar cambios
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UserSettings;