import { readFileSync } from 'fs';
import { resolve } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Test Configuration Manager
 * Handles environment-specific configuration for testing
 */
class TestConfig {
  constructor() {
    this.config = this.loadConfig();
    this.environment = this.getEnvironment();
    this.baseURL = this.getBaseURL();
    this.timeouts = this.getTimeouts();
    this.browser = this.getBrowserConfig();
    this.mocks = this.getMockConfig();
  }

  /**
   * Load environment configuration from .env files
   */
  loadConfig() {
    const env = process.env.NODE_ENV || 'test';
    const envFile = `.env.${env}`;

    try {
      const envPath = resolve(process.cwd(), envFile);
      const envContent = readFileSync(envPath, 'utf8');
      const config = {};

      envContent.split('\n').forEach(line => {
        const [key, ...valueParts] = line.split('=');
        if (key && valueParts.length > 0) {
          const value = valueParts.join('=').trim();
          // Remove quotes if present
          config[key.trim()] = value.replace(/^["']|["']$/g, '');
        }
      });

      return config;
    } catch (error) {
      console.warn(`Warning: Could not load ${envFile}, using default configuration`);
      return this.getDefaultConfig();
    }
  }

  /**
   * Get current environment
   */
  getEnvironment() {
    return process.env.NODE_ENV || this.config.NODE_ENV || 'test';
  }

  /**
   * Get base URL for testing
   */
  getBaseURL() {
    const env = this.getEnvironment();

    switch (env) {
      case 'production':
        return this.config.PROD_BASE_URL || 'http://localhost:3000';
      case 'development':
        return this.config.DEV_BASE_URL || 'http://localhost:5173';
      case 'test':
      default:
        return this.config.TEST_BASE_URL || 'http://localhost:4321';
    }
  }

  /**
   * Get timeout configuration
   */
  getTimeouts() {
    const env = this.getEnvironment();
    const prefix = env === 'production' ? 'PROD' : env === 'development' ? 'DEV' : 'TEST';

    return {
      test: parseInt(this.config[`${prefix}_TIMEOUT`]) || 30000,
      pageLoad: parseInt(this.config[`${prefix}_PAGE_LOAD_TIMEOUT`]) || 10000,
      elementWait: parseInt(this.config[`${prefix}_ELEMENT_WAIT_TIMEOUT`]) || 5000,
      healthCheck: parseInt(this.config.HEALTH_CHECK_TIMEOUT) || 5000
    };
  }

  /**
   * Get browser configuration
   */
  getBrowserConfig() {
    const env = this.getEnvironment();
    const prefix = env === 'production' ? 'PROD' : env === 'development' ? 'DEV' : 'TEST';

    const headless = this.config[`${prefix}_BROWSER`] !== 'false';
    const args = this.config[`${prefix}_BROWSER_ARGS`]
      ? this.config[`${prefix}_BROWSER_ARGS`].split(',')
      : ['--no-sandbox', '--disable-setuid-sandbox'];

    return {
      headless,
      args: args.map(arg => arg.trim())
    };
  }

  /**
   * Get mock configuration
   */
  getMockConfig() {
    return {
      useMocks: this.config.USE_MOCKS === 'true',
      mockGemini: this.config.MOCK_GEMINI_API === 'true',
      mockSpeech: this.config.MOCK_SPEECH_SYNTHESIS === 'true',
      mockImages: this.config.MOCK_EXTERNAL_IMAGES === 'true'
    };
  }

  /**
   * Get default configuration
   */
  getDefaultConfig() {
    return {
      NODE_ENV: 'test',
      TEST_BASE_URL: 'http://localhost:4321',
      TEST_TIMEOUT: '30000',
      TEST_PAGE_LOAD_TIMEOUT: '10000',
      TEST_ELEMENT_WAIT_TIMEOUT: '5000',
      USE_MOCKS: 'true',
      MOCK_GEMINI_API: 'true',
      MOCK_SPEECH_SYNTHESIS: 'true',
      MOCK_EXTERNAL_IMAGES: 'true',
      TEST_BROWSER: 'headless',
      TEST_BROWSER_ARGS: '--no-sandbox,--disable-setuid-sandbox',
      HEALTH_CHECK_ENABLED: 'true',
      HEALTH_CHECK_TIMEOUT: '5000',
      HEALTH_CHECK_RETRIES: '3'
    };
  }

  /**
   * Get server configuration for test setup
   */
  getServerConfig() {
    const env = this.getEnvironment();

    switch (env) {
      case 'production':
        return {
          port: parseInt(this.config.PROD_PORT) || 3000,
          host: this.config.PROD_HOST || '0.0.0.0'
        };
      case 'development':
        return {
          port: parseInt(this.config.DEV_PORT) || 5173,
          host: this.config.DEV_HOST || 'localhost'
        };
      case 'test':
      default:
        return {
          port: parseInt(this.config.TEST_PORT) || 4321,
          host: this.config.TEST_HOST || 'localhost'
        };
    }
  }

  /**
   * Get health check configuration
   */
  getHealthCheckConfig() {
    return {
      enabled: this.config.HEALTH_CHECK_ENABLED === 'true',
      timeout: parseInt(this.config.HEALTH_CHECK_TIMEOUT) || 5000,
      retries: parseInt(this.config.HEALTH_CHECK_RETRIES) || 3
    };
  }

  /**
   * Get parallel testing configuration
   */
  getParallelConfig() {
    return {
      enabled: this.config.TEST_PARALLEL !== 'false',
      maxConcurrent: parseInt(this.config.MAX_CONCURRENT_TESTS) || 4
    };
  }
}

// Export singleton instance
export const testConfig = new TestConfig();
export default testConfig;