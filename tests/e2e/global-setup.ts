import type { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  // Global setup code goes here
  // This runs once before all tests
  console.log('🚀 Starting Playwright E2E tests...');
}

export default globalSetup;