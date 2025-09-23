import type { APIRoute } from 'astro';
import { getGeminiTTSService } from '../../../services/geminiTTS';
import type { TTSRequest } from '../../../services/geminiTTS';
import { SecurityError } from '../../../utils/security';

// Rate limiting store (in production, use Redis or similar)
const rateLimitStore = new Map<
  string,
  { requests: number; lastReset: number }
>();

const RATE_LIMIT_WINDOW = 60000; // 1 minute
const RATE_LIMIT_MAX_REQUESTS = 30; // 30 requests per minute per IP

function checkRateLimit(clientIP: string): boolean {
  const now = Date.now();
  const clientData = rateLimitStore.get(clientIP) || {
    requests: 0,
    lastReset: now,
  };

  // Reset if window has passed
  if (now - clientData.lastReset >= RATE_LIMIT_WINDOW) {
    clientData.requests = 0;
    clientData.lastReset = now;
  }

  // Check if within limit
  if (clientData.requests >= RATE_LIMIT_MAX_REQUESTS) {
    return false;
  }

  clientData.requests++;
  rateLimitStore.set(clientIP, clientData);
  return true;
}

function getClientIP(request: Request): string {
  // Try to get real IP from headers (for production behind proxy)
  const xForwardedFor = request.headers.get('x-forwarded-for');
  const xRealIP = request.headers.get('x-real-ip');

  if (xForwardedFor) {
    return xForwardedFor.split(',')[0].trim();
  }

  if (xRealIP) {
    return xRealIP;
  }

  // Fallback to a generic identifier for development
  return 'localhost';
}

export const POST: APIRoute = async ({ request }) => {
  try {
    // Check rate limiting
    const clientIP = getClientIP(request);
    if (!checkRateLimit(clientIP)) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          message: 'Too many requests. Please wait before trying again.',
        }),
        {
          status: 429,
          headers: {
            'Content-Type': 'application/json',
            'Retry-After': '60',
          },
        }
      );
    }

    // Parse request body
    let requestData: TTSRequest;
    try {
      requestData = await request.json();
    } catch {
      return new Response(
        JSON.stringify({
          error: 'Invalid JSON',
          message: 'Request body must be valid JSON',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate required fields
    if (!requestData.text || typeof requestData.text !== 'string') {
      return new Response(
        JSON.stringify({
          error: 'Invalid input',
          message: 'Text field is required and must be a string',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Additional validation
    if (requestData.text.length > 1000) {
      return new Response(
        JSON.stringify({
          error: 'Text too long',
          message: 'Maximum text length is 1000 characters',
        }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get authentication info (if available)
    const authHeader = request.headers.get('authorization');
    let userIdentifier = 'anonymous';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      // In a real implementation, verify the JWT token here
      // For now, we'll use a simple identifier
      userIdentifier = 'authenticated-user';
    }

    // Initialize TTS service
    const ttsService = getGeminiTTSService(undefined, userIdentifier);

    // Generate speech
    const response = await ttsService.generateSpeech(requestData);

    // Return audio data as binary response
    return new Response(response.audioData, {
      status: 200,
      headers: {
        'Content-Type': response.mimeType,
        'Content-Length': response.audioData.length.toString(),
        'Cache-Control': 'public, max-age=3600', // Cache for 1 hour
        'X-Audio-Duration': (response.duration || 0).toString(),
        // CORS headers for development
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('[API] TTS Generation Error:', error);

    if (error instanceof SecurityError) {
      return new Response(
        JSON.stringify({
          error: 'Security Error',
          message: error.message,
          code: error.code,
        }),
        {
          status: error.code === 'RATE_LIMIT_EXCEEDED' ? 429 : 400,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    return new Response(
      JSON.stringify({
        error: 'Internal Server Error',
        message: 'TTS generation failed. Please try again later.',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
};

// Handle preflight requests for CORS
export const OPTIONS: APIRoute = async () => {
  return new Response(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      'Access-Control-Max-Age': '86400', // 24 hours
    },
  });
};
