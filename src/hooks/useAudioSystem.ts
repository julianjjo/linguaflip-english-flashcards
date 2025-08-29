import { useState, useEffect, useCallback, useRef } from 'react';
import { useUserPreferences } from './useUserPreferences';

interface AudioSettings {
  voice: SpeechSynthesisVoice | null;
  rate: number;
  pitch: number;
  volume: number;
}

interface AudioCache {
  [key: string]: {
    audioBuffer: AudioBuffer | null;
    timestamp: number;
  };
}

interface UseAudioSystemReturn {
  speak: (text: string, options?: Partial<AudioSettings>) => Promise<void>;
  stop: () => void;
  isSupported: boolean;
  isSpeaking: boolean;
  voices: SpeechSynthesisVoice[];
  settings: AudioSettings;
  updateSettings: (newSettings: Partial<AudioSettings>) => void;
  preloadPronunciation: (text: string) => Promise<void>;
}

const CACHE_DURATION = 1000 * 60 * 60; // 1 hour
const MAX_CACHE_SIZE = 50;

export const useAudioSystem = (): UseAudioSystemReturn => {
  const { preferences } = useUserPreferences();
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [settings, setSettings] = useState<AudioSettings>({
    voice: null,
    rate: preferences.speechRate,
    pitch: preferences.speechPitch,
    volume: preferences.speechVolume,
  });

  const audioCache = useRef<AudioCache>({});
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);
  const audioContext = useRef<AudioContext | null>(null);

  // Initialize audio system
  useEffect(() => {
    const speechSupported = 'speechSynthesis' in window;
    setIsSupported(speechSupported);

    if (speechSupported) {
      // Load available voices
      const loadVoices = () => {
        const availableVoices = speechSynthesis.getVoices();
        setVoices(availableVoices);

        // Set default English voice
        const englishVoice = availableVoices.find(voice =>
          voice.lang.startsWith('en') && voice.default
        ) || availableVoices.find(voice => voice.lang.startsWith('en'));

        if (englishVoice) {
          setSettings(prev => ({ ...prev, voice: englishVoice }));
        }
      };

      loadVoices();
      speechSynthesis.addEventListener('voiceschanged', loadVoices);

      return () => {
        speechSynthesis.removeEventListener('voiceschanged', loadVoices);
      };
    }
  }, []);

  // Initialize Web Audio API for fallbacks
  useEffect(() => {
    if ('AudioContext' in window || 'webkitAudioContext' in window) {
      try {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContext.current = new AudioContextClass();
      } catch (error) {
        console.warn('Web Audio API not available:', error);
      }
    }
  }, []);

  // Cache management
  const cleanCache = useCallback(() => {
    const now = Date.now();
    const entries = Object.entries(audioCache.current);

    if (entries.length > MAX_CACHE_SIZE) {
      // Remove oldest entries
      const sortedEntries = entries.sort(([, a], [, b]) => a.timestamp - b.timestamp);
      const entriesToRemove = sortedEntries.slice(0, entries.length - MAX_CACHE_SIZE);

      entriesToRemove.forEach(([key]) => {
        delete audioCache.current[key];
      });
    }

    // Remove expired entries
    entries.forEach(([key, value]) => {
      if (now - value.timestamp > CACHE_DURATION) {
        delete audioCache.current[key];
      }
    });
  }, []);

  const getCacheKey = (text: string, voiceName?: string) => {
    return `${voiceName || 'default'}:${text.toLowerCase().trim()}`;
  };

  // Fallback audio synthesis using Web Audio API
  const synthesizeFallbackAudio = async (text: string): Promise<AudioBuffer | null> => {
    if (!audioContext.current) return null;

    try {
      // Simple text-to-speech using oscillator (basic fallback)
      const words = text.split(' ');
      const duration = Math.max(words.length * 0.3, 1); // 300ms per word, minimum 1s

      const sampleRate = audioContext.current.sampleRate;
      const frameCount = sampleRate * duration;
      const audioBuffer = audioContext.current.createBuffer(1, frameCount, sampleRate);

      const channelData = audioBuffer.getChannelData(0);

      // Generate simple speech-like sound
      for (let i = 0; i < frameCount; i++) {
        const time = i / sampleRate;
        const wordIndex = Math.floor(time / 0.3);
        const word = words[wordIndex];

        if (word) {
          // Simple frequency modulation based on word length
          const baseFreq = 200 + (word.length * 20);
          const modulation = Math.sin(time * 10) * 0.1;
          channelData[i] = Math.sin(time * (baseFreq + modulation) * 2 * Math.PI) * 0.1;
        }
      }

      return audioBuffer;
    } catch (error) {
      console.warn('Fallback audio synthesis failed:', error);
      return null;
    }
  };

  const speak = useCallback(async (text: string, options: Partial<AudioSettings> = {}): Promise<void> => {
    if (!text.trim()) return;

    const finalSettings = { ...settings, ...options };
    const cacheKey = getCacheKey(text, finalSettings.voice?.name);

    try {
      setIsSpeaking(true);

      // Try Speech Synthesis API first
      if (isSupported) {
        return new Promise((resolve, reject) => {
          const utterance = new SpeechSynthesisUtterance(text);
          utterance.voice = finalSettings.voice;
          utterance.rate = finalSettings.rate;
          utterance.pitch = finalSettings.pitch;
          utterance.volume = finalSettings.volume;
          utterance.lang = finalSettings.voice?.lang || 'en-US';

          utterance.onstart = () => setIsSpeaking(true);
          utterance.onend = () => {
            setIsSpeaking(false);
            currentUtterance.current = null;
            resolve();
          };
          utterance.onerror = (event) => {
            console.warn('Speech synthesis error:', event.error);
            setIsSpeaking(false);
            currentUtterance.current = null;
            reject(new Error(`Speech synthesis failed: ${event.error}`));
          };

          currentUtterance.current = utterance;
          speechSynthesis.speak(utterance);
        });
      }

      // Fallback to Web Audio API
      if (audioContext.current) {
        let audioBuffer = audioCache.current[cacheKey]?.audioBuffer;

        if (!audioBuffer) {
          audioBuffer = await synthesizeFallbackAudio(text);
          if (audioBuffer) {
            audioCache.current[cacheKey] = {
              audioBuffer,
              timestamp: Date.now(),
            };
            cleanCache();
          }
        }

        if (audioBuffer) {
          const source = audioContext.current.createBufferSource();
          source.buffer = audioBuffer;
          source.connect(audioContext.current.destination);
          source.start();

          return new Promise((resolve) => {
            source.onended = () => {
              setIsSpeaking(false);
              resolve();
            };
          });
        }
      }

      // Final fallback: console log (for development/debugging)
      console.log(`🔊 Audio playback: "${text}"`);
      setIsSpeaking(false);

    } catch (error) {
      console.error('Audio system error:', error);
      setIsSpeaking(false);
      throw error;
    }
  }, [isSupported, settings, cleanCache]);

  const stop = useCallback(() => {
    if (currentUtterance.current) {
      speechSynthesis.cancel();
      currentUtterance.current = null;
    }
    setIsSpeaking(false);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AudioSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  const preloadPronunciation = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return;

    const cacheKey = getCacheKey(text, settings.voice?.name);

    // If already cached, skip
    if (audioCache.current[cacheKey]) return;

    // For Speech Synthesis API, we can't really preload, but we can validate
    if (isSupported) {
      // Just mark as cached to avoid repeated synthesis attempts
      audioCache.current[cacheKey] = {
        audioBuffer: null, // Speech synthesis doesn't use AudioBuffer
        timestamp: Date.now(),
      };
      cleanCache();
      return;
    }

    // For Web Audio fallback, generate and cache the audio buffer
    if (audioContext.current) {
      const audioBuffer = await synthesizeFallbackAudio(text);
      if (audioBuffer) {
        audioCache.current[cacheKey] = {
          audioBuffer,
          timestamp: Date.now(),
        };
        cleanCache();
      }
    }
  }, [isSupported, settings.voice?.name, cleanCache]);

  return {
    speak,
    stop,
    isSupported,
    isSpeaking,
    voices,
    settings,
    updateSettings,
    preloadPronunciation,
  };
};