#!/usr/bin/env node

import { access } from 'fs/promises';
import { constants } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import testConfig from './test-config.js';
import testServer from './test-server.js';
import mockServer from './mocks/mock-server.js';

const MIN_NODE_VERSION = '18.0.0';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '..');

function formatResult(result) {
  const icon = result.success ? '✅' : '❌';
  const message = result.detail ? ` - ${result.detail}` : '';
  console.log(`${icon} ${result.name}${message}`);
}

function parseVersion(versionString) {
  const [major = '0', minor = '0', patch = '0'] = versionString
    .replace(/^v/, '')
    .split('.');
  return {
    major: Number.parseInt(major, 10),
    minor: Number.parseInt(minor, 10),
    patch: Number.parseInt(patch, 10),
  };
}

function compareVersions(a, b) {
  if (a.major !== b.major) return a.major - b.major;
  if (a.minor !== b.minor) return a.minor - b.minor;
  return a.patch - b.patch;
}

function checkNodeVersion() {
  const current = parseVersion(process.version);
  const minimum = parseVersion(MIN_NODE_VERSION);

  if (compareVersions(current, minimum) < 0) {
    throw new Error(
      `Node.js ${MIN_NODE_VERSION}+ required, current version is ${process.version}`
    );
  }

  return `Node.js ${process.version} satisfies minimum requirement (${MIN_NODE_VERSION})`;
}

async function checkDependenciesInstalled() {
  const nodeModulesPath = resolve(ROOT_DIR, 'node_modules');
  await access(nodeModulesPath, constants.R_OK);
  return 'node_modules directory is accessible';
}

async function checkEnvFile() {
  const envPath = resolve(ROOT_DIR, '.env.test');
  try {
    await access(envPath, constants.R_OK);
    return 'Using .env.test configuration file';
  } catch (error) {
    console.warn(
      '⚠️  .env.test not found. Falling back to default test configuration values.'
    );
    return 'Default test configuration will be used';
  }
}

function checkTestConfig() {
  const baseUrl = testConfig.getBaseURL();
  if (typeof baseUrl !== 'string' || baseUrl.length === 0) {
    throw new Error('Invalid base URL in test configuration');
  }

  const timeouts = testConfig.getTimeouts();
  if (!Number.isFinite(timeouts.test) || timeouts.test <= 0) {
    throw new Error('Test timeout must be a positive number');
  }

  return `Base URL: ${baseUrl}, test timeout: ${timeouts.test}ms`;
}

function checkHealthConfiguration() {
  const config = testConfig.getHealthCheckConfig();
  if (!Number.isFinite(config.timeout) || config.timeout <= 0) {
    throw new Error('Health check timeout must be a positive number');
  }

  if (!Number.isFinite(config.retries) || config.retries <= 0) {
    throw new Error('Health check retries must be a positive number');
  }

  return `Health checks ${config.enabled ? 'enabled' : 'disabled'} (timeout: ${config.timeout}ms, retries: ${config.retries})`;
}

function checkTestServerConfig() {
  const { port, host } = testServer.config;
  if (!Number.isInteger(port) || port <= 0) {
    throw new Error('Invalid test server port configuration');
  }
  if (!host) {
    throw new Error('Invalid test server host configuration');
  }

  if (typeof testServer.getServerUrl !== 'function') {
    throw new Error('Test server URL resolver missing');
  }

  return `Test server configured for ${host}:${port}`;
}

function checkMockServerConfig() {
  if (
    typeof mockServer.start !== 'function' ||
    typeof mockServer.stop !== 'function'
  ) {
    throw new Error('Mock server start/stop handlers are not available');
  }

  return 'Mock server handlers available';
}

async function runHealthChecks() {
  console.log('🩺 Running LinguaFlip test health checks...');

  const checks = [
    { name: 'Node.js version', run: checkNodeVersion },
    { name: 'Dependencies installed', run: checkDependenciesInstalled },
    { name: 'Environment configuration', run: checkEnvFile },
    { name: 'Test configuration', run: checkTestConfig },
    { name: 'Health check configuration', run: checkHealthConfiguration },
    { name: 'Test server configuration', run: checkTestServerConfig },
    { name: 'Mock server configuration', run: checkMockServerConfig },
  ];

  const results = [];

  for (const check of checks) {
    try {
      const detail = await check.run();
      const result = { name: check.name, success: true, detail };
      results.push(result);
      formatResult(result);
    } catch (error) {
      const result = {
        name: check.name,
        success: false,
        detail: error.message,
      };
      results.push(result);
      formatResult(result);
    }
  }

  const failed = results.filter((result) => !result.success);

  if (failed.length > 0) {
    console.error(`\n❌ ${failed.length} health check(s) failed`);
    process.exit(1);
  }

  console.log('\n✅ All health checks passed');
}

runHealthChecks().catch((error) => {
  console.error('Unexpected error while running health checks:', error);
  process.exit(1);
});
