import { useState, useEffect, useCallback, useRef } from 'react';
import { useUserPreferences } from './useUserPreferences';
import { getAudioCache } from '../services/audioCache';
import type { CachedAudio } from '../services/audioCache';
import { GEMINI_VOICES } from '../services/geminiTTS';
import type { TTSVoice } from '../services/geminiTTS';

export type TTSProvider = 'browser' | 'gemini';

export interface GeminiVoice {
  name: string;
  displayName: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
}

interface AudioSettings {
  voice: SpeechSynthesisVoice | null;
  geminiVoice: string;
  provider: TTSProvider;
  rate: number;
  pitch: number;
  volume: number;
  temperature?: number;
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
  isGenerating: boolean;
  voices: SpeechSynthesisVoice[];
  geminiVoices: TTSVoice[];
  settings: AudioSettings;
  updateSettings: (newSettings: Partial<AudioSettings>) => void;
  preloadPronunciation: (text: string) => Promise<void>;
  switchProvider: (provider: TTSProvider) => void;
  getCacheSize: () => Promise<number>;
  clearCache: () => Promise<void>;
}

const CACHE_DURATION = 1000 * 60 * 60; // 1 hour
const MAX_CACHE_SIZE = 50;

export const useAudioSystem = (): UseAudioSystemReturn => {
  const { preferences } = useUserPreferences();
  const [isSupported, setIsSupported] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const [geminiVoices] = useState<TTSVoice[]>(GEMINI_VOICES);
  const [settings, setSettings] = useState<AudioSettings>({
    voice: null,
    geminiVoice: 'Zephyr',
    provider: preferences.ttsProvider || 'gemini',
    rate: preferences.speechRate,
    pitch: preferences.speechPitch,
    volume: preferences.speechVolume,
    temperature: 1.0,
  });

  const audioCache = useRef<AudioCache>({});
  const currentUtterance = useRef<SpeechSynthesisUtterance | null>(null);
  const audioContext = useRef<AudioContext | null>(null);
  const currentAudioSource = useRef<AudioBufferSourceNode | null>(null);
  const audioCacheService = useRef(getAudioCache());

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

  // Gemini TTS implementation
  const speakWithGemini = useCallback(async (text: string, voice: string, temperature?: number): Promise<void> => {
    try {
      // Check cache first
      const cached = await audioCacheService.current.getAudio(text, voice);
      if (cached) {
        await playAudioData(cached.audioData);
        return;
      }

      setIsGenerating(true);

      // Call TTS API
      const response = await fetch('/api/tts/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          voice,
          temperature: temperature || 1.0
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
        throw new Error(errorData.message || 'TTS generation failed');
      }

      const audioData = await response.arrayBuffer();
      const audioDataArray = new Uint8Array(audioData);
      const mimeType = response.headers.get('Content-Type') || 'audio/wav';
      const duration = parseFloat(response.headers.get('X-Audio-Duration') || '0');

      // Cache the audio
      await audioCacheService.current.storeAudio(text, voice, audioDataArray, mimeType, duration);

      // Play the audio
      await playAudioData(audioDataArray);
      
    } catch (error) {
      console.error('Gemini TTS failed:', error);
      throw error;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  // Play audio data using Web Audio API
  const playAudioData = useCallback(async (audioData: Uint8Array): Promise<void> => {
    if (!audioContext.current) {
      if ('AudioContext' in window || 'webkitAudioContext' in window) {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        audioContext.current = new AudioContextClass();
      } else {
        throw new Error('Web Audio API not supported');
      }
    }

    try {
      const audioBuffer = await audioContext.current.decodeAudioData(audioData.buffer.slice(audioData.byteOffset, audioData.byteOffset + audioData.byteLength));
      
      const source = audioContext.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContext.current.destination);
      
      currentAudioSource.current = source;
      
      return new Promise<void>((resolve, reject) => {
        source.onended = () => {
          currentAudioSource.current = null;
          resolve();
        };
        
        source.onerror = () => {
          currentAudioSource.current = null;
          reject(new Error('Audio playback failed'));
        };
        
        source.start();
      });
    } catch (error) {
      console.error('Audio decoding/playback failed:', error);
      throw error;
    }
  }, []);

  const speak = useCallback(async (text: string, options: Partial<AudioSettings> = {}): Promise<void> => {
    if (!text.trim()) return;

    const finalSettings = { ...settings, ...options };
    
    try {
      setIsSpeaking(true);

      // Use Gemini TTS if selected as provider
      if (finalSettings.provider === 'gemini') {
        await speakWithGemini(text, finalSettings.geminiVoice, finalSettings.temperature);
        return;
      }

      // Fall back to browser TTS
      if (isSupported && finalSettings.provider === 'browser') {
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

      // Final fallback: Web Audio API synthesis
      if (audioContext.current) {
        let audioBuffer = audioCache.current[getCacheKey(text, finalSettings.voice?.name)]?.audioBuffer;

        if (!audioBuffer) {
          audioBuffer = await synthesizeFallbackAudio(text);
          if (audioBuffer) {
            audioCache.current[getCacheKey(text, finalSettings.voice?.name)] = {
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

      // Ultimate fallback: console log
      console.log(`🔊 Audio playback: "${text}"`);
      setIsSpeaking(false);

    } catch (error) {
      console.error('Audio system error:', error);
      setIsSpeaking(false);
      throw error;
    }
  }, [isSupported, settings, speakWithGemini, cleanCache]);

  const stop = useCallback(() => {
    // Stop browser TTS
    if (currentUtterance.current) {
      speechSynthesis.cancel();
      currentUtterance.current = null;
    }
    
    // Stop Gemini TTS audio
    if (currentAudioSource.current) {
      currentAudioSource.current.stop();
      currentAudioSource.current = null;
    }
    
    setIsSpeaking(false);
    setIsGenerating(false);
  }, []);

  const updateSettings = useCallback((newSettings: Partial<AudioSettings>) => {
    setSettings(prev => ({ ...prev, ...newSettings }));
  }, []);

  // Switch TTS provider
  const switchProvider = useCallback((provider: TTSProvider) => {
    setSettings(prev => ({ ...prev, provider }));
  }, []);

  // Get cache size
  const getCacheSize = useCallback(async (): Promise<number> => {
    return await audioCacheService.current.getCacheSize();
  }, []);

  // Clear audio cache
  const clearCache = useCallback(async (): Promise<void> => {
    await audioCacheService.current.clearCache();
  }, []);

  const preloadPronunciation = useCallback(async (text: string): Promise<void> => {
    if (!text.trim()) return;

    if (settings.provider === 'gemini') {
      // Check if already cached
      const cached = await audioCacheService.current.hasAudio(text, settings.geminiVoice);
      if (cached) return;

      // Pre-generate with Gemini TTS
      try {
        await speakWithGemini(text, settings.geminiVoice, settings.temperature);
      } catch (error) {
        console.warn('Preload failed:', error);
      }
      return;
    }

    // Browser TTS preload (legacy)
    const cacheKey = getCacheKey(text, settings.voice?.name);
    if (audioCache.current[cacheKey]) return;

    if (isSupported) {
      audioCache.current[cacheKey] = {
        audioBuffer: null,
        timestamp: Date.now(),
      };
      cleanCache();
      return;
    }

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
  }, [settings.provider, settings.geminiVoice, settings.temperature, settings.voice?.name, speakWithGemini, isSupported, cleanCache]);

  return {
    speak,
    stop,
    isSupported,
    isSpeaking,
    isGenerating,
    voices,
    geminiVoices,
    settings,
    updateSettings,
    preloadPronunciation,
    switchProvider,
    getCacheSize,
    clearCache,
  };
};