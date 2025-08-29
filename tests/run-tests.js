#!/usr/bin/env node

/**
 * Main Test Runner
 * Orchestrates the entire testing infrastructure
 */

import testConfig from './test-config.js';
import testServer from './test-server.js';
import mockServer from './mocks/mock-server.js';
import { logMemoryUsage, cleanup } from './test-utils.js';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

class TestRunner {
  constructor() {
    this.config = testConfig;
    this.testServer = testServer;
    this.mockServer = mockServer;
    this.resources = [];
  }

  /**
   * Main test execution method
   */
  async run() {
    console.log('🚀 Starting LinguaFlip Test Suite');
    console.log('📋 Environment:', this.config.getEnvironment());
    console.log('🌐 Base URL:', this.config.getBaseURL());

    try {
      // Setup test environment
      await this.setup();

      // Run health checks
      await this.runHealthChecks();

      // Execute tests
      await this.executeTests();

    } catch (error) {
      console.error('❌ Test execution failed:', error.message);
      process.exit(1);
    } finally {
      // Cleanup
      await this.cleanup();
    }
  }

  /**
   * Setup test environment
   */
  async setup() {
    console.log('🔧 Setting up test environment...');

    try {
      // Start mock server if mocks are enabled
      if (this.config.getMockConfig().useMocks) {
        await this.mockServer.start();
        this.resources.push(this.mockServer);
      }

      // Start test server
      await this.testServer.start();
      this.resources.push(this.testServer);

      console.log('✅ Test environment setup complete');
    } catch (error) {
      console.error('❌ Failed to setup test environment:', error.message);
      throw error;
    }
  }

  /**
   * Run health checks
   */
  async runHealthChecks() {
    const healthConfig = this.config.getHealthCheckConfig();

    if (!healthConfig.enabled) {
      console.log('ℹ️ Health checks disabled');
      return;
    }

    console.log('🔍 Running health checks...');

    // Check test server
    const serverRunning = await this.testServer.isRunning();
    if (!serverRunning) {
      throw new Error('Test server health check failed');
    }

    // Check mock server if enabled
    if (this.config.getMockConfig().useMocks) {
      // Simple mock server health check
      try {
        const response = await fetch(`${this.mockServer.getServerUrl()}/health`);
        if (!response.ok) {
          console.warn('⚠️ Mock server health check returned non-200 status');
        }
      } catch (error) {
        console.warn('⚠️ Mock server health check failed:', error.message);
      }
    }

    console.log('✅ Health checks passed');
  }

  /**
   * Execute test files
   */
  async executeTests() {
    console.log('🧪 Executing tests...');

    const testFiles = [
      'tests/design-tests.js',
      'tests/interaction-tests.js'
    ];

    const results = [];

    for (const testFile of testFiles) {
      console.log(`\n📄 Running ${testFile}...`);

      try {
        const { stdout, stderr } = await execAsync(`npx mocha ${testFile} --timeout 30000`, {
          env: {
            ...process.env,
            NODE_ENV: 'test',
            TEST_BASE_URL: this.testServer.getServerUrl()
          }
        });

        if (stdout) console.log(stdout);
        if (stderr) console.error(stderr);

        results.push({ file: testFile, success: true });

      } catch (error) {
        console.error(`❌ Test file ${testFile} failed:`, error.message);
        results.push({ file: testFile, success: false, error: error.message });
      }
    }

    // Report results
    this.reportResults(results);

    // Check if any tests failed
    const failedTests = results.filter(r => !r.success);
    if (failedTests.length > 0) {
      throw new Error(`${failedTests.length} test file(s) failed`);
    }
  }

  /**
   * Report test results
   */
  reportResults(results) {
    console.log('\n📊 Test Results Summary:');
    console.log('='.repeat(50));

    results.forEach(result => {
      const status = result.success ? '✅ PASS' : '❌ FAIL';
      console.log(`${status} ${result.file}`);

      if (!result.success && result.error) {
        console.log(`   Error: ${result.error}`);
      }
    });

    const passed = results.filter(r => r.success).length;
    const total = results.length;

    console.log('='.repeat(50));
    console.log(`Total: ${total}, Passed: ${passed}, Failed: ${total - passed}`);

    // Log memory usage
    logMemoryUsage();
  }

  /**
   * Cleanup test environment
   */
  async cleanup() {
    console.log('🧹 Cleaning up test environment...');
    await cleanup(this.resources);
    console.log('✅ Cleanup complete');
  }
}

// Handle command line arguments
const args = process.argv.slice(2);
const watch = args.includes('--watch');
const parallel = args.includes('--parallel');

// Run tests
const runner = new TestRunner();

if (watch) {
  console.log('👀 Watch mode enabled - not yet implemented');
  // TODO: Implement watch mode
} else if (parallel) {
  console.log('⚡ Parallel mode enabled - not yet implemented');
  // TODO: Implement parallel execution
} else {
  runner.run().catch(error => {
    console.error('💥 Fatal error:', error);
    process.exit(1);
  });
}