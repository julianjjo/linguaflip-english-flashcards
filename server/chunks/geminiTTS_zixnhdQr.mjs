import { GoogleGenAI } from '@google/genai';
import { l as loadSecurityConfig, b as SecurityError, e as validateGeminiApiKey, c as checkRateLimit, s as sanitizeTextInput } from './utils_B4MKaY9u.mjs';

const GEMINI_VOICES = [
  {
    name: "Zephyr",
    displayName: "Zephyr (Natural)",
    language: "en-US",
    gender: "neutral"
  },
  {
    name: "Coral",
    displayName: "Coral (Warm)",
    language: "en-US",
    gender: "female"
  },
  {
    name: "Sage",
    displayName: "Sage (Calm)",
    language: "en-US",
    gender: "male"
  }
];
class GeminiTTSService {
  constructor(apiKey, userIdentifier = "default-user") {
    this.model = "gemini-2.5-flash-preview-tts";
    this.userIdentifier = userIdentifier;
    try {
      this.securityConfig = loadSecurityConfig();
    } catch (error) {
      if (error instanceof SecurityError) {
        throw error;
      }
      throw new SecurityError(
        "Failed to load security configuration",
        "CONFIG_LOAD_ERROR"
      );
    }
    const keyToUse = apiKey || this.securityConfig.geminiApiKey;
    if (!validateGeminiApiKey(keyToUse)) {
      throw new SecurityError(
        "Invalid API key format",
        "INVALID_API_KEY_FORMAT"
      );
    }
    this.client = new GoogleGenAI({ apiKey: keyToUse });
  }
  // If needed, request WAV/LINEAR16 from the API rather than converting here.
  /**
   * Generate speech audio from text using Gemini TTS
   */
  async generateSpeech(request) {
    const rateLimitResult = checkRateLimit(
      `tts-${this.userIdentifier}`,
      this.securityConfig.rateLimitMaxRequests || 50,
      this.securityConfig.rateLimitWindowMs || 6e4
    );
    if (!rateLimitResult.allowed) {
      throw new SecurityError(
        "Rate limit exceeded. Please wait before making another request.",
        "RATE_LIMIT_EXCEEDED"
      );
    }
    const sanitizedText = sanitizeTextInput(request.text);
    if (!sanitizedText || sanitizedText.length === 0) {
      throw new SecurityError(
        "Invalid input: text cannot be empty after sanitization",
        "INVALID_INPUT"
      );
    }
    if (sanitizedText.length > 1e3) {
      throw new SecurityError(
        "Input too long: maximum 1000 characters allowed",
        "INPUT_TOO_LONG"
      );
    }
    const voice = request.voice || "Zephyr";
    const validVoice = GEMINI_VOICES.find((v) => v.name === voice);
    if (!validVoice) {
      throw new SecurityError(
        `Invalid voice selection: ${voice}`,
        "INVALID_VOICE"
      );
    }
    console.log(
      `[TTS] Generating speech for user ${this.userIdentifier}: "${sanitizedText.substring(0, 50)}..."`
    );
    try {
      const speechConfig = {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voice
          }
        }
      };
      const generateConfig = {
        temperature: request.temperature || 1,
        responseModalities: ["audio"],
        speechConfig
      };
      const audioChunks = [];
      let mimeType = "audio/wav";
      const response = await this.client.models.generateContentStream({
        model: this.model,
        contents: [
          {
            role: "user",
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
        if (chunk.candidates && chunk.candidates[0]?.content?.parts && chunk.candidates[0].content.parts[0]?.inlineData) {
          const inlineData = chunk.candidates[0].content.parts[0].inlineData;
          if (inlineData.data) {
            const audioData = typeof inlineData.data === "string" ? new Uint8Array(Buffer.from(inlineData.data, "base64")) : inlineData.data;
            audioChunks.push(audioData);
            mimeType = inlineData.mimeType || mimeType;
          }
        }
      }
      if (audioChunks.length === 0) {
        throw new Error("No audio data received from Gemini TTS");
      }
      const totalLength = audioChunks.reduce(
        (sum, chunk) => sum + chunk.length,
        0
      );
      const combinedAudio = new Uint8Array(totalLength);
      let offset = 0;
      for (const chunk of audioChunks) {
        combinedAudio.set(chunk, offset);
        offset += chunk.length;
      }
      const finalAudioData = combinedAudio;
      const finalMimeType = mimeType;
      return {
        audioData: finalAudioData,
        mimeType: finalMimeType,
        duration: this.estimateAudioDuration(sanitizedText, validVoice)
      };
    } catch (error) {
      console.error("[TTS] Generation failed:", error);
      if (error instanceof SecurityError) {
        throw error;
      }
      throw new Error(
        `TTS generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Generate speech with streaming support
   */
  async *generateSpeechStream(request) {
    const rateLimitResult = checkRateLimit(
      `tts-stream-${this.userIdentifier}`,
      this.securityConfig.rateLimitMaxRequests || 50,
      this.securityConfig.rateLimitWindowMs || 6e4
    );
    if (!rateLimitResult.allowed) {
      throw new SecurityError(
        "Rate limit exceeded. Please wait before making another request.",
        "RATE_LIMIT_EXCEEDED"
      );
    }
    const sanitizedText = sanitizeTextInput(request.text);
    if (!sanitizedText || sanitizedText.length === 0) {
      throw new SecurityError(
        "Invalid input: text cannot be empty after sanitization",
        "INVALID_INPUT"
      );
    }
    const voice = request.voice || "Zephyr";
    const validVoice = GEMINI_VOICES.find((v) => v.name === voice);
    if (!validVoice) {
      throw new SecurityError(
        `Invalid voice selection: ${voice}`,
        "INVALID_VOICE"
      );
    }
    try {
      const speechConfig = {
        voiceConfig: {
          prebuiltVoiceConfig: {
            voiceName: voice
          }
        }
      };
      const generateConfig = {
        temperature: request.temperature || 1,
        responseModalities: ["audio"],
        speechConfig
      };
      const response = await this.client.models.generateContentStream({
        model: this.model,
        contents: [
          {
            role: "user",
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
        if (chunk.candidates && chunk.candidates[0]?.content?.parts && chunk.candidates[0].content.parts[0]?.inlineData) {
          const inlineData = chunk.candidates[0].content.parts[0].inlineData;
          if (inlineData.data) {
            let audioData = typeof inlineData.data === "string" ? new Uint8Array(Buffer.from(inlineData.data, "base64")) : inlineData.data;
            let mimeType = inlineData.mimeType || "audio/wav";
            yield {
              data: audioData,
              mimeType,
              isComplete: false
            };
          }
        }
      }
      yield {
        data: new Uint8Array(0),
        mimeType: "audio/wav",
        isComplete: true
      };
    } catch (error) {
      console.error("[TTS] Streaming generation failed:", error);
      throw new Error(
        `TTS streaming failed: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
  /**
   * Estimate audio duration based on text length and voice
   */
  estimateAudioDuration(text, _voice) {
    const wordsPerMinute = 155;
    const words = text.split(/\s+/).length;
    const estimatedMinutes = words / wordsPerMinute;
    const estimatedSeconds = estimatedMinutes * 60;
    return Math.max(estimatedSeconds * 1.1, 1);
  }
  /**
   * Get list of available voices
   */
  getAvailableVoices() {
    return [...GEMINI_VOICES];
  }
  /**
   * Test TTS service connectivity
   */
  async testConnection() {
    try {
      const testResponse = await this.generateSpeech({
        text: "Test connection",
        voice: "Zephyr"
      });
      return testResponse.audioData.length > 0;
    } catch (error) {
      console.error("[TTS] Connection test failed:", error);
      return false;
    }
  }
}
const geminiTTSInstances = /* @__PURE__ */ new Map();
const getGeminiTTSService = (apiKey, userIdentifier = "default-user") => {
  const key = `${"env"}:${userIdentifier}`;
  let inst = geminiTTSInstances.get(key);
  if (!inst) {
    inst = new GeminiTTSService(apiKey, userIdentifier);
    geminiTTSInstances.set(key, inst);
  }
  return inst;
};

export { getGeminiTTSService as g };
