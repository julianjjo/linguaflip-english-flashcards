import { createServer } from 'http';
import { exec } from 'child_process';
import { promisify } from 'util';
import testConfig from './test-config.js';
import { request } from 'http';

const execAsync = promisify(exec);

/**
 * Test Server Manager
 * Handles automatic setup and teardown of test server
 */
class TestServer {
  constructor() {
    this.server = null;
    this.serverProcess = null;
    this.config = testConfig.getServerConfig();
    this.healthCheck = testConfig.getHealthCheckConfig();
  }

  /**
   * Start the test server
   */
  async start() {
    console.log('🚀 Starting test server...');

    try {
      // Check if port is already in use
      const isPortInUse = await this.checkPortInUse(this.config.port);
      if (isPortInUse) {
        console.log(
          `⚠️ Port ${this.config.port} is already in use. Attempting to use it...`
        );
        return this.config.port;
      }

      // Start the development server with test configuration
      await this.startDevServer();

      // Wait for server to be ready
      await this.waitForServerReady();

      console.log(
        `✅ Test server started on http://${this.config.host}:${this.config.port}`
      );
      return this.config.port;
    } catch (error) {
      console.error('❌ Failed to start test server:', error.message);
      throw error;
    }
  }

  /**
   * Stop the test server
   */
  async stop() {
    console.log('🛑 Stopping test server...');

    try {
      if (this.serverProcess) {
        this.serverProcess.kill('SIGTERM');

        // Wait for process to exit
        await new Promise((resolve) => {
          this.serverProcess.on('exit', () => {
            console.log('✅ Test server process terminated');
            resolve();
          });

          // Force kill after 5 seconds
          setTimeout(() => {
            if (this.serverProcess) {
              this.serverProcess.kill('SIGKILL');
              console.log('⚠️ Test server force terminated');
              resolve();
            }
          }, 5000);
        });
      }

      if (this.server) {
        this.server.close();
        console.log('✅ Test server closed');
      }
    } catch (error) {
      console.error('❌ Error stopping test server:', error.message);
    }
  }

  /**
   * Start development server using npm script
   */
  async startDevServer() {
    return new Promise((resolve, reject) => {
      // Set environment variables for test server
      const env = {
        ...process.env,
        NODE_ENV: 'test',
        PORT: this.config.port.toString(),
        HOST: this.config.host,
      };

      // Start the dev server
      this.serverProcess = exec('npm run dev', {
        env,
        cwd: process.cwd(),
      });

      this.serverProcess.stdout.on('data', (data) => {
        console.log('📝 Server output:', data.toString().trim());
      });

      this.serverProcess.stderr.on('data', (data) => {
        console.error('⚠️ Server error:', data.toString().trim());
      });

      this.serverProcess.on('error', (error) => {
        reject(error);
      });

      // Resolve after a short delay to allow server to start
      setTimeout(resolve, 2000);
    });
  }

  /**
   * Check if a port is already in use
   */
  async checkPortInUse(port) {
    try {
      const { stdout } = await execAsync(
        `lsof -i :${port} || netstat -an | grep :${port}`
      );
      return stdout.trim().length > 0;
    } catch (error) {
      return false;
    }
  }

  /**
   * Wait for server to be ready
   */
  async waitForServerReady() {
    if (!this.healthCheck.enabled) {
      console.log('ℹ️ Health checks disabled, skipping server readiness check');
      return;
    }

    const maxRetries = this.healthCheck.retries;
    const retryDelay = 1000;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`🔍 Health check attempt ${attempt}/${maxRetries}...`);

        const response = await this.performHealthCheck();

        if (response === 200) {
          console.log('✅ Server is ready!');
          return;
        } else {
          console.log(
            `⚠️ Server responded with status ${response}, retrying...`
          );
        }
      } catch (error) {
        console.log(
          `⚠️ Health check failed (attempt ${attempt}/${maxRetries}): ${error.message}`
        );
      }

      if (attempt < maxRetries) {
        await new Promise((resolve) => setTimeout(resolve, retryDelay));
      }
    }

    throw new Error(`Server failed to start after ${maxRetries} attempts`);
  }

  /**
   * Perform health check on the server
   */
  async performHealthCheck() {
    return new Promise((resolve, reject) => {
      const options = {
        hostname: this.config.host,
        port: this.config.port,
        path: '/',
        method: 'GET',
        timeout: this.healthCheck.timeout,
      };

      const req = request(options, (res) => {
        resolve(res.statusCode);
      });

      req.on('error', (error) => {
        reject(error);
      });

      req.on('timeout', () => {
        req.destroy();
        reject(new Error('Health check timeout'));
      });

      req.end();
    });
  }

  /**
   * Get server URL
   */
  getServerUrl() {
    return `http://${this.config.host}:${this.config.port}`;
  }

  /**
   * Check if server is running
   */
  async isRunning() {
    try {
      const response = await this.performHealthCheck();
      return response === 200;
    } catch (error) {
      return false;
    }
  }
}

// Export singleton instance
export const testServer = new TestServer();
export default testServer;
