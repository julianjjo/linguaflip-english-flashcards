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
  private readonly model = 'gemini-2.5-pro-preview-tts';

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

  /**
   * Convert raw audio data to WAV format with proper headers
   */
  private convertToWav(audioData: Uint8Array, mimeType: string): Uint8Array {
    const parameters = this.parseAudioMimeType(mimeType);
    const bitsPerSample = parameters.bitsPerSample;
    const sampleRate = parameters.rate;
    const numChannels = 1;
    const dataSize = audioData.length;
    const bytesPerSample = bitsPerSample / 8;
    const blockAlign = numChannels * bytesPerSample;
    const byteRate = sampleRate * blockAlign;
    const chunkSize = 36 + dataSize; // 36 bytes for header fields before data chunk size

    // Create WAV header
    const header = new ArrayBuffer(44);
    const view = new DataView(header);

    // "RIFF" chunk descriptor
    view.setUint32(0, 0x52494646, false); // "RIFF"
    view.setUint32(4, chunkSize, true); // ChunkSize (little-endian)
    view.setUint32(8, 0x57415645, false); // "WAVE"

    // "fmt " sub-chunk
    view.setUint32(12, 0x666d7420, false); // "fmt "
    view.setUint32(16, 16, true); // Subchunk1Size (16 for PCM)
    view.setUint16(20, 1, true); // AudioFormat (1 for PCM)
    view.setUint16(22, numChannels, true); // NumChannels
    view.setUint32(24, sampleRate, true); // SampleRate
    view.setUint32(28, byteRate, true); // ByteRate
    view.setUint16(32, blockAlign, true); // BlockAlign
    view.setUint16(34, bitsPerSample, true); // BitsPerSample

    // "data" sub-chunk
    view.setUint32(36, 0x64617461, false); // "data"
    view.setUint32(40, dataSize, true); // Subchunk2Size

    // Combine header and audio data
    const wavData = new Uint8Array(header.byteLength + audioData.length);
    wavData.set(new Uint8Array(header), 0);
    wavData.set(audioData, header.byteLength);

    return wavData;
  }

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

      // Convert to WAV if necessary
      let finalAudioData = combinedAudio;
      let finalMimeType = 'audio/wav';

      if (!mimeType.includes('wav')) {
        finalAudioData = this.convertToWav(combinedAudio, mimeType);
        finalMimeType = 'audio/wav';
      }

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
            
            // Convert to WAV if needed
            let audioData = inlineData.data;
            let mimeType = inlineData.mimeType || 'audio/wav';

            if (!mimeType.includes('wav')) {
              audioData = this.convertToWav(audioData, mimeType);
              mimeType = 'audio/wav';
            }

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

// Export singleton instance with proper caching
let geminiTTSInstance: GeminiTTSService | null = null;
let lastApiKey: string | undefined = undefined;
let lastUserIdentifier: string | undefined = undefined;

export const getGeminiTTSService = (apiKey?: string, userIdentifier?: string): GeminiTTSService => {
  // Only recreate if no instance exists OR if parameters actually changed
  if (!geminiTTSInstance || apiKey !== lastApiKey || userIdentifier !== lastUserIdentifier) {
    geminiTTSInstance = new GeminiTTSService(apiKey, userIdentifier);
    lastApiKey = apiKey;
    lastUserIdentifier = userIdentifier;
  }
  return geminiTTSInstance;
};

export default GeminiTTSService;