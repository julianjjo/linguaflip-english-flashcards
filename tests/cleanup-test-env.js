#!/usr/bin/env node

import { exec } from 'child_process';
import { promisify } from 'util';
import { rm } from 'fs/promises';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import testConfig from './test-config.js';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = resolve(__dirname, '..');
const MOCK_SERVER_PORT = 3001;

const ARTIFACT_TARGETS = [
  { path: 'test-results', description: 'test result artifacts' },
  { path: 'playwright-report', description: 'Playwright reports' },
  { path: 'coverage', description: 'coverage output' },
];

const commandAvailability = new Map();
let hasLoggedMissingNetworkTools = false;

function delay(ms) {
  return new Promise((resolveDelay) => setTimeout(resolveDelay, ms));
}

async function isCommandAvailable(commandName) {
  if (commandAvailability.has(commandName)) {
    return commandAvailability.get(commandName);
  }

  try {
    await execAsync(`command -v ${commandName}`);
    commandAvailability.set(commandName, true);
    return true;
  } catch (error) {
    commandAvailability.set(commandName, false);
    return false;
  }
}

function parseLsofOutput(stdout) {
  return stdout
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => Number.parseInt(line, 10))
    .filter((pid) => Number.isInteger(pid) && pid > 1);
}

function parseFuserOutput(stdout) {
  return stdout
    .split('\n')
    .flatMap((line) => {
      const [, tail = ''] = line.split(':');
      return tail.split(/\s+/);
    })
    .map((value) => Number.parseInt(value, 10))
    .filter((pid) => Number.isInteger(pid) && pid > 1);
}

function extractPidsFromLine(line) {
  const trimmed = line.trim();
  if (!trimmed) {
    return [];
  }

  const pids = new Set();

  for (const match of trimmed.matchAll(/pid=(\d+)/g)) {
    const pid = Number.parseInt(match[1], 10);
    if (Number.isInteger(pid) && pid > 1) {
      pids.add(pid);
    }
  }

  for (const match of trimmed.matchAll(/\b(\d+)\/[\w.-]+/g)) {
    const pid = Number.parseInt(match[1], 10);
    if (Number.isInteger(pid) && pid > 1) {
      pids.add(pid);
    }
  }

  if (/^\d+$/.test(trimmed)) {
    const pid = Number.parseInt(trimmed, 10);
    if (Number.isInteger(pid) && pid > 1) {
      pids.add(pid);
    }
  }

  return Array.from(pids);
}

function parseNetworkToolOutput(stdout) {
  return stdout
    .split('\n')
    .flatMap((line) => extractPidsFromLine(line))
    .filter((pid) => Number.isInteger(pid) && pid > 1);
}

async function getPidsForPort(port) {
  const pids = new Set();
  const commandDefinitions = [
    {
      binary: 'lsof',
      buildCommand: (targetPort) => `lsof -ti :${targetPort}`,
      parser: parseLsofOutput,
    },
    {
      binary: 'fuser',
      buildCommand: (targetPort) => `fuser -n tcp ${targetPort} 2>/dev/null`,
      parser: parseFuserOutput,
    },
    {
      binary: 'ss',
      buildCommand: (targetPort) => `ss -Hlnpt '( sport = :${targetPort} )'`,
      parser: parseNetworkToolOutput,
    },
    {
      binary: 'netstat',
      buildCommand: (targetPort) =>
        `netstat -anp 2>/dev/null | grep :${targetPort}`,
      parser: parseNetworkToolOutput,
    },
  ];

  let attemptedCommand = false;

  for (const definition of commandDefinitions) {
    if (!(await isCommandAvailable(definition.binary))) {
      continue;
    }

    attemptedCommand = true;

    try {
      const { stdout } = await execAsync(definition.buildCommand(port));
      definition.parser(stdout).forEach((pid) => pids.add(pid));
    } catch (error) {
      const exitCode = typeof error.code === 'number' ? error.code : undefined;
      if (exitCode === 1 || exitCode === 256) {
        continue;
      }

      const stderrOutput = (error.stderr || '').toString().trim();
      const message = stderrOutput || error.message;
      console.warn(
        `⚠️ Unable to inspect port ${port} using ${definition.binary}: ${message}`
      );
    }
  }

  if (!attemptedCommand && !hasLoggedMissingNetworkTools) {
    console.warn(
      '⚠️ No supported network inspection commands available (expected one of: lsof, fuser, ss, netstat). Skipping process lookup by port.'
    );
    hasLoggedMissingNetworkTools = true;
  }

  return { pids: Array.from(pids), inspected: attemptedCommand };
}

function isProcessAlive(pid) {
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code !== 'ESRCH';
  }
}

async function terminatePid(pid, label) {
  const numericPid = Number(pid);
  if (!Number.isInteger(numericPid) || numericPid <= 0) {
    return;
  }

  console.log(`🔻 Terminating ${label} process (PID ${numericPid})`);

  try {
    process.kill(numericPid, 'SIGTERM');
  } catch (error) {
    if (error.code === 'ESRCH') {
      console.log(`ℹ️ ${label} process ${numericPid} is no longer running`);
      return;
    }
    if (error.code === 'EPERM') {
      console.warn(`⚠️ Insufficient permissions to terminate PID ${numericPid}`);
      return;
    }
    throw error;
  }

  await delay(500);

  if (isProcessAlive(numericPid)) {
    console.log(`⚠️ ${label} process ${numericPid} still running, forcing kill`);
    try {
      process.kill(numericPid, 'SIGKILL');
    } catch (error) {
      if (error.code === 'ESRCH') {
        console.log(`ℹ️ ${label} process ${numericPid} exited during cleanup`);
      } else if (error.code === 'EPERM') {
        console.warn(
          `⚠️ Insufficient permissions to force kill ${label} process ${numericPid}`
        );
      } else {
        throw error;
      }
    }
  } else {
    console.log(`✅ ${label} process ${numericPid} stopped`);
  }
}

async function cleanupPort(port, label) {
  if (!port) {
    return;
  }

  const { pids, inspected } = await getPidsForPort(port);

  if (!inspected) {
    console.log(
      `ℹ️ Skipping port-based cleanup for ${label} on port ${port} (no supported network utilities available)`
    );
    return;
  }

  if (!pids.length) {
    console.log(`ℹ️ No ${label} processes detected on port ${port}`);
    return;
  }

  console.log(
    `🛑 Found ${pids.length} ${label} process(es) on port ${port}: ${pids.join(', ')}`
  );

  for (const pid of pids) {
    try {
      await terminatePid(pid, label);
    } catch (error) {
      console.warn(
        `⚠️ Failed to terminate ${label} process ${pid}: ${error.message}`
      );
    }
  }
}

async function removePath(relativePath, description) {
  const targetPath = resolve(ROOT_DIR, relativePath);

  if (!existsSync(targetPath)) {
    console.log(`ℹ️ No ${description} found at ${relativePath}`);
    return;
  }

  try {
    await rm(targetPath, { recursive: true, force: true });
    console.log(`✅ Removed ${description} (${relativePath})`);
  } catch (error) {
    console.warn(
      `⚠️ Failed to remove ${description} at ${relativePath}: ${error.message}`
    );
  }
}

async function removeArtifacts() {
  for (const { path, description } of ARTIFACT_TARGETS) {
    await removePath(path, description);
  }
}

async function cleanupEnvironment() {
  console.log('🧹 Starting test environment cleanup...');

  const serverConfig = testConfig.getServerConfig();
  await cleanupPort(serverConfig.port, 'test server');

  const mockConfig = testConfig.getMockConfig();
  if (mockConfig.useMocks) {
    console.log('ℹ️ Mocks enabled, ensuring mock server is stopped');
  } else {
    console.log('ℹ️ Mocks disabled, checking for stray mock server processes');
  }
  await cleanupPort(MOCK_SERVER_PORT, 'mock server');

  await removeArtifacts();

  console.log('✅ Test environment cleanup completed');
}

cleanupEnvironment().catch((error) => {
  console.error('❌ Test environment cleanup failed:', error);
  process.exitCode = 1;
});
