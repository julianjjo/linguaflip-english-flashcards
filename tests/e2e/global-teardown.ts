// @ts-nocheck
import type { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  // Global teardown code goes here
  // This runs once after all tests
  console.log('✅ Playwright E2E tests completed.');
}

export default globalTeardown;