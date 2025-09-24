#!/usr/bin/env node

import { config as loadEnv } from 'dotenv';
import { spawn } from 'child_process';
import { appendFile, mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, resolve } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '..');
const LOG_DIR = resolve(ROOT_DIR, 'test-results');
const LOG_FILE = resolve(LOG_DIR, 'test.log');
const MOCK_SERVER_PORT = 3001;

const envFile = `.env.${process.env.NODE_ENV || 'test'}`;
const envPath = resolve(ROOT_DIR, envFile);
loadEnv({ path: envPath, override: false });

const { default: testConfig } = await import('./test-config.js');

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function ensureLogInfrastructure() {
  if (!existsSync(LOG_DIR)) {
    await mkdir(LOG_DIR, { recursive: true });
    console.log(`📁 Created test results directory at ${LOG_DIR}`);
  }

  if (!existsSync(LOG_FILE)) {
    await writeFile(LOG_FILE, '', 'utf8');
    console.log(`📝 Created test log file at ${LOG_FILE}`);
  }
}

async function appendLog(message) {
  const timestamp = new Date().toISOString();
  await appendFile(LOG_FILE, `[${timestamp}] ${message}\n`, 'utf8');
}

function getNpmCommand() {
  return process.platform === 'win32' ? 'npm.cmd' : 'npm';
}

function startDetachedProcess(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      ...options,
      detached: true,
      stdio: 'ignore',
    });

    child.once('error', (error) => {
      reject(error);
    });

    child.once('spawn', () => {
      // Allow the parent process to exit independently of the child
      child.unref();
      resolve(child.pid);
    });
  });
}

async function isEndpointResponsive(url, timeout = 2000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    return response.status >= 200 && response.status < 500;
  } catch (error) {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function waitForEndpoint(
  url,
  { retries = 30, interval = 1000, timeout = 2000, name = 'service' } = {}
) {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    if (await isEndpointResponsive(url, timeout)) {
      if (attempt > 1) {
        console.log(`✅ ${name} responded after ${attempt} attempt(s)`);
      }
      return;
    }

    if (attempt === 1) {
      console.log(`⏳ Waiting for ${name} at ${url}...`);
    }

    await delay(interval);
  }

  throw new Error(
    `${name} at ${url} did not respond after ${retries} attempts`
  );
}

async function ensureMockServerRunning() {
  const mockConfig = testConfig.getMockConfig();
  const mockBaseUrl = `http://localhost:${MOCK_SERVER_PORT}`;

  if (!mockConfig.useMocks) {
    console.log('ℹ️ Mock server disabled by configuration, skipping startup');
    return { enabled: false, started: false, url: mockBaseUrl, pid: null };
  }

  const healthEndpoint = `${mockBaseUrl}/speech/voices`;
  if (await isEndpointResponsive(healthEndpoint)) {
    console.log(`ℹ️ Mock server already available at ${mockBaseUrl}`);
    return { enabled: true, started: false, url: mockBaseUrl, pid: null };
  }

  const mockModuleUrl = new URL('./mocks/mock-server.js', import.meta.url).href;
  const bootstrapCode = `
    import mockServer from ${JSON.stringify(mockModuleUrl)};
    const shutdownSignals = ['SIGINT', 'SIGTERM'];
    let shuttingDown = false;
    async function shutdown() {
      if (shuttingDown) return;
      shuttingDown = true;
      try {
        if (typeof mockServer.stop === 'function') {
          await mockServer.stop();
        }
      } catch (error) {
        console.error('Mock server shutdown error:', error);
      } finally {
        process.exit(0);
      }
    }
    shutdownSignals.forEach((signal) => process.on(signal, shutdown));
    await mockServer.start();
    // Keep event loop active even if the server is not holding references yet
    setInterval(() => {}, 2147483647);
  `;

  const pid = await startDetachedProcess(
    process.execPath,
    ['--input-type=module', '-e', bootstrapCode],
    {
      cwd: ROOT_DIR,
      env: {
        ...process.env,
        NODE_ENV: 'test',
        USE_MOCKS: 'true',
        MOCK_GEMINI_API: mockConfig.mockGemini ? 'true' : 'false',
        MOCK_SPEECH_SYNTHESIS: mockConfig.mockSpeech ? 'true' : 'false',
        MOCK_EXTERNAL_IMAGES: mockConfig.mockImages ? 'true' : 'false',
      },
    }
  );

  console.log(`🎭 Mock server spawned on ${mockBaseUrl} (PID ${pid})`);
  await waitForEndpoint(healthEndpoint, {
    name: 'mock server',
    retries: 30,
    interval: 1000,
    timeout: 2000,
  });
  console.log(`✅ Mock server is responding at ${mockBaseUrl}`);

  return { enabled: true, started: true, url: mockBaseUrl, pid };
}

async function ensureTestServerRunning() {
  const serverConfig = testConfig.getServerConfig();
  const baseUrl = `http://${serverConfig.host}:${serverConfig.port}`;

  if (await isEndpointResponsive(baseUrl)) {
    console.log(`ℹ️ Test server already running at ${baseUrl}`);
    process.env.TEST_BASE_URL = baseUrl;
    return { started: false, url: baseUrl, pid: null, skipped: false };
  }

  const adapterPath = resolve(ROOT_DIR, 'node_modules', '@astrojs', 'node');
  if (!existsSync(adapterPath)) {
    console.warn(
      '⚠️ @astrojs/node adapter is not installed. Skipping automatic dev server startup. ' +
        'Install it with `npm install @astrojs/node` to enable the embedded test server.'
    );
    return {
      started: false,
      url: baseUrl,
      pid: null,
      skipped: true,
      reason: '@astrojs/node adapter missing',
    };
  }

  const env = {
    ...process.env,
    NODE_ENV: 'test',
    VITE_NODE_ENV: 'test',
    HOST: serverConfig.host,
    PORT: String(serverConfig.port),
    TEST_HOST: serverConfig.host,
    TEST_PORT: String(serverConfig.port),
    TEST_BASE_URL: baseUrl,
  };

  try {
    const pid = await startDetachedProcess(getNpmCommand(), ['run', 'dev'], {
      cwd: ROOT_DIR,
      env,
    });

    console.log(`🚀 Test server started on ${baseUrl} (PID ${pid})`);
    await waitForEndpoint(baseUrl, {
      name: 'test server',
      retries: 40,
      interval: 1000,
      timeout: 2000,
    });
    console.log(`✅ Test server is responding at ${baseUrl}`);

    process.env.TEST_BASE_URL = baseUrl;

    return { started: true, url: baseUrl, pid, skipped: false };
  } catch (error) {
    console.warn(
      `⚠️ Failed to start the test server automatically: ${error.message}`
    );
    console.warn(
      '   You can start it manually with `npm run dev` before executing the tests.'
    );
    return {
      started: false,
      url: baseUrl,
      pid: null,
      skipped: true,
      reason: error.message,
    };
  }
}

async function main() {
  console.log('🔧 Setting up LinguaFlip test environment...');
  await ensureLogInfrastructure();
  await appendLog('Starting test environment setup');

  const mockInfo = await ensureMockServerRunning();
  const serverInfo = await ensureTestServerRunning();

  await appendLog(
    `Mock server: ${mockInfo.enabled ? (mockInfo.started ? `started (pid ${mockInfo.pid})` : 'already running') : 'disabled'}`
  );
  const serverLogStatus = serverInfo.started
    ? `started (pid ${serverInfo.pid})`
    : serverInfo.skipped
      ? `not started (${serverInfo.reason || 'manual start required'})`
      : 'already running';
  await appendLog(`Test server: ${serverLogStatus} at ${serverInfo.url}`);

  console.log('✅ Test environment setup complete');
  if (serverInfo.started) {
    console.log(
      `   Test server URL: ${serverInfo.url} (PID ${serverInfo.pid})`
    );
  } else if (serverInfo.skipped) {
    console.warn(
      `   Test server not running automatically (${serverInfo.reason || 'manual start required'}).`
    );
    console.warn(
      '   Run `npm run dev` manually if your tests depend on the Astro dev server.'
    );
  } else {
    console.log(`   Test server already running at ${serverInfo.url}`);
  }

  if (mockInfo.enabled) {
    console.log(
      `   Mock server: ${mockInfo.url} (${mockInfo.started ? `PID ${mockInfo.pid}` : 'already running'})`
    );
  } else {
    console.log('   Mock server: disabled');
  }

  await appendLog('Test environment setup complete');
}

main().catch(async (error) => {
  console.error('❌ Failed to set up test environment:', error.message);
  await appendLog(`Setup failed: ${error.message}`);
  process.exitCode = 1;
});
