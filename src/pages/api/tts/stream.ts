import type { APIRoute } from 'astro';
import { getGeminiTTSService } from '../../../services/geminiTTS';
import type { TTSRequest } from '../../../services/geminiTTS';
import { SecurityError } from '../../../utils/security';

export const POST: APIRoute = async ({ request }) => {
  try {
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

    // Get user identifier
    const authHeader = request.headers.get('authorization');
    let userIdentifier = 'anonymous';

    if (authHeader && authHeader.startsWith('Bearer ')) {
      userIdentifier = 'authenticated-user';
    }

    // Initialize TTS service
    const ttsService = getGeminiTTSService(undefined, userIdentifier);

    // Create streaming response
    const stream = new ReadableStream({
      async start(controller) {
        try {
          const generator = ttsService.generateSpeechStream(requestData);

          for await (const chunk of generator) {
            // Send chunk as server-sent event
            const eventData = JSON.stringify({
              type: chunk.isComplete ? 'complete' : 'chunk',
              data: Array.from(chunk.data), // Convert Uint8Array to regular array
              mimeType: chunk.mimeType,
              isComplete: chunk.isComplete,
            });

            const eventString = `data: ${eventData}\n\n`;
            controller.enqueue(new TextEncoder().encode(eventString));

            if (chunk.isComplete) {
              break;
            }
          }

          controller.close();
        } catch (error) {
          console.error('[API] TTS Streaming Error:', error);

          const errorData = JSON.stringify({
            type: 'error',
            error:
              error instanceof SecurityError
                ? error.message
                : 'TTS generation failed',
          });

          controller.enqueue(
            new TextEncoder().encode(`data: ${errorData}\n\n`)
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      status: 200,
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  } catch (error) {
    console.error('[API] TTS Streaming Setup Error:', error);

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
        message: 'TTS streaming failed. Please try again later.',
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
      'Access-Control-Max-Age': '86400',
    },
  });
};
