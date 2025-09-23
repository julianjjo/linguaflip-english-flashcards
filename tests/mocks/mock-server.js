import { createServer } from 'http';
import testConfig from '../test-config.js';

/**
 * Mock Server for External APIs
 * Provides mock responses for Gemini API, Speech Synthesis, and external images
 */
class MockServer {
  constructor() {
    this.server = null;
    this.mockConfig = testConfig.getMockConfig();
    this.port = 3001; // Default mock server port
  }

  /**
   * Start the mock server
   */
  async start() {
    if (!this.mockConfig.useMocks) {
      console.log('ℹ️ Mocks disabled, skipping mock server startup');
      return;
    }

    console.log('🎭 Starting mock server...');

    return new Promise((resolve, reject) => {
      this.server = createServer((req, res) => {
        this.handleRequest(req, res);
      });

      this.server.listen(this.port, () => {
        console.log(`✅ Mock server started on port ${this.port}`);
        resolve();
      });

      this.server.on('error', (error) => {
        reject(error);
      });
    });
  }

  /**
   * Stop the mock server
   */
  async stop() {
    if (this.server) {
      console.log('🛑 Stopping mock server...');
      return new Promise((resolve) => {
        this.server.close(() => {
          console.log('✅ Mock server stopped');
          resolve();
        });
      });
    }
  }

  /**
   * Handle incoming requests
   */
  handleRequest(req, res) {
    const url = new URL(req.url, `http://localhost:${this.port}`);

    // Set CORS headers
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader(
      'Access-Control-Allow-Methods',
      'GET, POST, PUT, DELETE, OPTIONS'
    );
    res.setHeader(
      'Access-Control-Allow-Headers',
      'Content-Type, Authorization'
    );

    // Handle preflight requests
    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Route requests to appropriate mock handlers
    if (this.mockConfig.mockGemini && url.pathname.startsWith('/gemini')) {
      this.handleGeminiRequest(req, res, url);
    } else if (
      this.mockConfig.mockSpeech &&
      url.pathname.startsWith('/speech')
    ) {
      this.handleSpeechRequest(req, res, url);
    } else if (
      this.mockConfig.mockImages &&
      url.pathname.startsWith('/picsum')
    ) {
      this.handleImageRequest(req, res, url);
    } else {
      this.handleNotFound(req, res);
    }
  }

  /**
   * Handle Gemini API mock requests
   */
  handleGeminiRequest(req, res, url) {
    if (req.method === 'POST' && url.pathname === '/gemini/generate') {
      let body = '';

      req.on('data', (chunk) => {
        body += chunk.toString();
      });

      req.on('end', () => {
        try {
          const requestData = JSON.parse(body);

          // Mock response based on the request
          const mockResponse = this.generateGeminiMockResponse(requestData);

          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify(mockResponse));
        } catch (error) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Invalid request body' }));
        }
      });
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Gemini endpoint not found' }));
    }
  }

  /**
   * Generate mock response for Gemini API
   */
  generateGeminiMockResponse(requestData) {
    const { prompt, language = 'en' } = requestData;

    // Mock flashcard generation response
    if (prompt && prompt.toLowerCase().includes('flashcard')) {
      return {
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    front: `Mock front for: ${prompt.substring(0, 50)}...`,
                    back: `Mock back explanation for: ${prompt.substring(0, 50)}...`,
                    language: language,
                    difficulty: 'intermediate',
                  }),
                },
              ],
            },
          },
        ],
        usageMetadata: {
          promptTokenCount: 100,
          candidatesTokenCount: 150,
          totalTokenCount: 250,
        },
      };
    }

    // Default mock response
    return {
      candidates: [
        {
          content: {
            parts: [
              {
                text: `Mock response for prompt: ${prompt || 'No prompt provided'}`,
              },
            ],
          },
        },
      ],
      usageMetadata: {
        promptTokenCount: 50,
        candidatesTokenCount: 75,
        totalTokenCount: 125,
      },
    };
  }

  /**
   * Handle Speech Synthesis API mock requests
   */
  handleSpeechRequest(req, res, url) {
    if (req.method === 'POST' && url.pathname === '/speech/synthesize') {
      // Mock audio response
      const mockAudioBuffer = Buffer.from('mock-audio-data');

      res.writeHead(200, {
        'Content-Type': 'audio/mpeg',
        'Content-Length': mockAudioBuffer.length,
      });
      res.end(mockAudioBuffer);
    } else if (req.method === 'GET' && url.pathname === '/speech/voices') {
      // Mock voices list
      const mockVoices = [
        { name: 'en-US-Wavenet-A', language: 'en-US', gender: 'female' },
        { name: 'en-US-Wavenet-B', language: 'en-US', gender: 'male' },
        { name: 'es-ES-Wavenet-A', language: 'es-ES', gender: 'female' },
      ];

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ voices: mockVoices }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Speech endpoint not found' }));
    }
  }

  /**
   * Handle external image mock requests
   */
  handleImageRequest(req, res, url) {
    if (req.method === 'GET' && url.pathname.startsWith('/picsum/')) {
      // Extract dimensions from URL (e.g., /picsum/300/200)
      const pathParts = url.pathname.split('/');
      const width = parseInt(pathParts[2]) || 300;
      const height = parseInt(pathParts[3]) || 200;

      // Create a simple colored rectangle as mock image
      const mockImageBuffer = this.generateMockImage(width, height);

      res.writeHead(200, {
        'Content-Type': 'image/jpeg',
        'Content-Length': mockImageBuffer.length,
        'Cache-Control': 'public, max-age=3600',
      });
      res.end(mockImageBuffer);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Image endpoint not found' }));
    }
  }

  /**
   * Generate a simple mock image
   */
  generateMockImage(width, height) {
    // Create a simple JPEG-like buffer (this is a very basic mock)
    // In a real implementation, you might use a library like sharp or canvas
    const buffer = Buffer.alloc(1024); // Mock JPEG header + minimal data
    buffer.write('JFIF', 6); // Mock JPEG marker
    return buffer;
  }

  /**
   * Handle 404 responses
   */
  handleNotFound(req, res) {
    res.writeHead(404, { 'Content-Type': 'application/json' });
    res.end(
      JSON.stringify({
        error: 'Mock endpoint not found',
        requestedUrl: req.url,
        availableEndpoints: [
          '/gemini/generate (POST)',
          '/speech/synthesize (POST)',
          '/speech/voices (GET)',
          '/picsum/{width}/{height} (GET)',
        ],
      })
    );
  }

  /**
   * Get mock server URL
   */
  getServerUrl() {
    return `http://localhost:${this.port}`;
  }
}

// Export singleton instance
export const mockServer = new MockServer();
export default mockServer;
