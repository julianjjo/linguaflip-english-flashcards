import { GoogleGenAI } from '@google/genai';
import type { GenerateContentConfig, VoiceConfig, SpeechConfig, PrebuiltVoiceConfig } from '@google/genai/types';
import {
  validateGeminiApiKey,
  sanitizeTextInput,
  checkRateLimit,
  SecurityError,
  loadSecurityConfig
} from '../utils/security';

export interface TTSVoice {
  name: string;
  displayName: string;
  language: string;
  gender: 'male' | 'female' | 'neutral';
}

export interface TTSRequest {
  text: string;
  voice?: string;
  temperature?: number;
}

export interface TTSResponse {
  audioData: Uint8Array;
  mimeType: string;
  duration?: number;
}

export interface AudioChunk {
  data: Uint8Array;
  mimeType: string;
  isComplete: boolean;
}

// Available Gemini TTS voices
export const GEMINI_VOICES: TTSVoice[] = [
  {
    name: 'Zephyr',
    displayName: 'Zephyr (Natural)',
    language: 'en-US',
    gender: 'neutral'
  },
  {
    name: 'Coral',
    displayName: 'Coral (Warm)',
    language: 'en-US', 
    gender: 'female'
  },
  {
    name: 'Sage',
    displayName: 'Sage (Calm)',
    language: 'en-US',
    gender: 'male'
  }
];

export class GeminiTTSService {
  private client: GoogleGenAI;
  private securityConfig: any;
  private userIdentifier: string;
  private readonly model = 'gemini-2.5-flash-preview-tts';

  constructor(apiKey?: string, userIdentifier: string = 'default-user') {
    this.userIdentifier = userIdentifier;

    // Load security configuration
    try {
      this.securityConfig = loadSecurityConfig();
    } catch (error) {
      if (error instanceof SecurityError) {
        throw error;
      }
      throw new SecurityError('Failed to load security configuration', 'CONFIG_LOAD_ERROR');
    }

    // Use provided API key or load from secure config
    const keyToUse = apiKey || this.securityConfig.geminiApiKey;

    // Validate API key format
    if (!validateGeminiApiKey(keyToUse)) {
      throw new SecurityError('Invalid API key format', 'INVALID_API_KEY_FORMAT');
    }

    this.client = new GoogleGenAI(keyToUse);
  }

  // If needed, request WAV/LINEAR16 from the API rather than converting here.

  /**
   * Parse audio MIME type to extract bits per sample and sample rate
   */
  private parseAudioMimeType(mimeType: string): { bitsPerSample: number; rate: number } {
    let bitsPerSample = 16;
    let rate = 24000;

    // Extract rate from parameters
    const parts = mimeType.split(';');
    for (const param of parts) {
      const trimmedParam = param.trim();
      if (trimmedParam.toLowerCase().startsWith('rate=')) {
        try {
          const rateStr = trimmedParam.split('=', 2)[1];
          rate = parseInt(rateStr, 10);
        } catch (error) {
          // Keep default rate if parsing fails
        }
      } else if (trimmedParam.startsWith('audio/L')) {
        try {
          bitsPerSample = parseInt(trimmedParam.split('L', 2)[1], 10);
        } catch (error) {
          // Keep default bits per sample if parsing fails
        }
      }
    }

    return { bitsPerSample, rate };
  }

  /**
   * Generate speech audio from text using Gemini TTS
   */
  async generateSpeech(request: TTSRequest): Promise<TTSResponse> {
    // Check rate limiting
    const rateLimitResult = checkRateLimit(
      `tts-${this.userIdentifier}`,
      this.securityConfig.rateLimitMaxRequests || 50,
      this.securityConfig.rateLimitWindowMs || 60000
    );

    if (!rateLimitResult.allowed) {
      throw new SecurityError(
        'Rate limit exceeded. Please wait before making another request.',
        'RATE_LIMIT_EXCEEDED'
      );
    }

    // Sanitize and validate input
    const sanitizedText = sanitizeTextInput(request.text);
    if (!sanitizedText || sanitizedText.length === 0) {
      throw new SecurityError('Invalid input: text cannot be empty after sanitization', 'INVALID_INPUT');
    }

    if (sanitizedText.length > 1000) {
      throw new SecurityError('Input too long: maximum 1000 characters allowed', 'INPUT_TOO_LONG');
    }

    // Validate voice selection
    const voice = request.voice || 'Zephyr';
    const validVoice = GEMINI_VOICES.find(v => v.name === voice);
    if (!validVoice) {
      throw new SecurityError(`Invalid voice selection: ${voice}`, 'INVALID_VOICE');
    }

    console.log(`[TTS] Generating speech for user ${this.userIdentifier}: "${sanitizedText.substring(0, 50)}..."`);

    try {
      // Configure speech generation
      const speechConfig: SpeechConfig = {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voice
          } as PrebuiltVoiceConfig
        } as VoiceConfig
      };

      const generateConfig: GenerateContentConfig = {
        temperature: request.temperature || 1,
        responseModalities: ['audio'],
        speechConfig
      };

      // Generate content with streaming
      const audioChunks: Uint8Array[] = [];
      let mimeType = 'audio/wav';

      const response = this.client.models.generateContentStream({
        model: this.model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: sanitizedText
              }
            ]
          }
        ],
        config: generateConfig
      });

      for await (const chunk of response) {
        if (
          chunk.candidates &&
          chunk.candidates[0]?.content?.parts &&
          chunk.candidates[0].content.parts[0]?.inlineData
        ) {
          const inlineData = chunk.candidates[0].content.parts[0].inlineData;
          if (inlineData.data) {
            audioChunks.push(inlineData.data);
            mimeType = inlineData.mimeType || mimeType;
          }
        }
      }

      if (audioChunks.length === 0) {
        throw new Error('No audio data received from Gemini TTS');
      }

      // Combine all audio chunks
      const totalLength = audioChunks.reduce((sum, chunk) => sum + chunk.length, 0);
      const combinedAudio = new Uint8Array(totalLength);
      let offset = 0;
      
      for (const chunk of audioChunks) {
        combinedAudio.set(chunk, offset);
        offset += chunk.length;
      }

      // Return original encoding; client will decode.
      const finalAudioData = combinedAudio;
      const finalMimeType = mimeType;

      return {
        audioData: finalAudioData,
        mimeType: finalMimeType,
        duration: this.estimateAudioDuration(sanitizedText, validVoice)
      };

    } catch (error) {
      console.error('[TTS] Generation failed:', error);
      if (error instanceof SecurityError) {
        throw error;
      }
      throw new Error(`TTS generation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Generate speech with streaming support
   */
  async* generateSpeechStream(request: TTSRequest): AsyncGenerator<AudioChunk, void, unknown> {
    // Same validation as generateSpeech
    const rateLimitResult = checkRateLimit(
      `tts-stream-${this.userIdentifier}`,
      this.securityConfig.rateLimitMaxRequests || 50,
      this.securityConfig.rateLimitWindowMs || 60000
    );

    if (!rateLimitResult.allowed) {
      throw new SecurityError(
        'Rate limit exceeded. Please wait before making another request.',
        'RATE_LIMIT_EXCEEDED'
      );
    }

    const sanitizedText = sanitizeTextInput(request.text);
    if (!sanitizedText || sanitizedText.length === 0) {
      throw new SecurityError('Invalid input: text cannot be empty after sanitization', 'INVALID_INPUT');
    }

    const voice = request.voice || 'Zephyr';
    const validVoice = GEMINI_VOICES.find(v => v.name === voice);
    if (!validVoice) {
      throw new SecurityError(`Invalid voice selection: ${voice}`, 'INVALID_VOICE');
    }

    try {
      const speechConfig: SpeechConfig = {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voice
          } as PrebuiltVoiceConfig
        } as VoiceConfig
      };

      const generateConfig: GenerateContentConfig = {
        temperature: request.temperature || 1,
        responseModalities: ['audio'],
        speechConfig
      };

      const response = this.client.models.generateContentStream({
        model: this.model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: sanitizedText
              }
            ]
          }
        ],
        config: generateConfig
      });

      let isComplete = false;
      let chunkCount = 0;

      for await (const chunk of response) {
        if (
          chunk.candidates &&
          chunk.candidates[0]?.content?.parts &&
          chunk.candidates[0].content.parts[0]?.inlineData
        ) {
          const inlineData = chunk.candidates[0].content.parts[0].inlineData;
          if (inlineData.data) {
            chunkCount++;
            
            // Pass-through chunks; preserve mimeType
            let audioData = inlineData.data as Uint8Array;
            let mimeType = inlineData.mimeType || 'audio/wav';

            yield {
              data: audioData,
              mimeType,
              isComplete: false
            };
          }
        }
      }

      // Send final completion signal
      yield {
        data: new Uint8Array(0),
        mimeType: 'audio/wav',
        isComplete: true
      };

    } catch (error) {
      console.error('[TTS] Streaming generation failed:', error);
      throw new Error(`TTS streaming failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Estimate audio duration based on text length and voice
   */
  private estimateAudioDuration(text: string, voice: TTSVoice): number {
    // Average speaking rate is about 150-160 words per minute
    // Adjust based on voice characteristics
    const wordsPerMinute = 155; // Average speaking rate
    const words = text.split(/\s+/).length;
    const estimatedMinutes = words / wordsPerMinute;
    const estimatedSeconds = estimatedMinutes * 60;
    
    // Add some buffer time
    return Math.max(estimatedSeconds * 1.1, 1); // Minimum 1 second
  }

  /**
   * Get list of available voices
   */
  getAvailableVoices(): TTSVoice[] {
    return [...GEMINI_VOICES];
  }

  /**
   * Test TTS service connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const testResponse = await this.generateSpeech({
        text: 'Test connection',
        voice: 'Zephyr'
      });
      return testResponse.audioData.length > 0;
    } catch (error) {
      console.error('[TTS] Connection test failed:', error);
      return false;
    }
  }
}

// Export per-user keyed instances for proper rate limiting isolation
const geminiTTSInstances = new Map<string, GeminiTTSService>();

export const getGeminiTTSService = (apiKey?: string, userIdentifier: string = 'default-user'): GeminiTTSService => {
  const key = `${apiKey ?? 'env'}:${userIdentifier}`;
  let inst = geminiTTSInstances.get(key);
  if (!inst) {
    inst = new GeminiTTSService(apiKey, userIdentifier);
    geminiTTSInstances.set(key, inst);
  }
  return inst;
};

export default GeminiTTSService;