import { defineConfig, devices } from '@playwright/test';

/**
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests/e2e',
  /* Run tests in files in parallel */
  fullyParallel: true,
  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,
  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,
  /* Workers configuration for CI/CD */
  workers: process.env.CI ? (process.env.WORKERS ? parseInt(process.env.WORKERS) : 2) : undefined,
  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [
        ['json', { outputFile: 'test-results/results.json' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['html', { outputFolder: 'playwright-report' }]
      ]
    : [
        ['line'],
        ['json', { outputFile: 'test-results/results.json' }],
        ['junit', { outputFile: 'test-results/junit.xml' }]
      ],
  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.BASE_URL || 'http://localhost:4321',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Take screenshot only when test fails */
    screenshot: 'only-on-failure',

    /* Record video only when retrying a test */
    video: 'retain-on-failure',
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Run your local dev server before starting the tests */
  webServer: process.env.CI ? {
    command: 'npm run build:preview',
    url: process.env.BASE_URL || 'http://localhost:4321',
    reuseExistingServer: false,
    timeout: 120 * 1000,
  } : {
    command: 'npm run dev',
    url: 'http://localhost:4321',
    reuseExistingServer: true,
    timeout: 120 * 1000,
  },

  /* Global setup and teardown */
  globalSetup: './tests/e2e/global-setup.ts',
  globalTeardown: './tests/e2e/global-teardown.ts',

  /* Test timeout */
  timeout: process.env.CI ? 45 * 1000 : 60 * 1000,
  expect: {
    /* Timeout for assertions */
    timeout: process.env.CI ? 15 * 1000 : 10 * 1000,
  },

  /* Shard configuration for CI/CD */
  shard: process.env.SHARD ? {
    current: parseInt(process.env.SHARD.split('/')[0]),
    total: parseInt(process.env.SHARD.split('/')[1]),
  } : undefined,

  /* Additional configuration for CI/CD */
  ...(process.env.CI && {
    /* Increase retries for CI environment */
    retries: 3,
    /* Use more conservative settings for CI */
    use: {
      ...{
        /* Base URL to use in actions like `await page.goto('/')`. */
        baseURL: process.env.BASE_URL || 'http://localhost:4321',

        /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
        trace: 'retain-on-failure',

        /* Take screenshot only when test fails */
        screenshot: 'only-on-failure',

        /* Record video only when retrying a test */
        video: 'retain-on-failure',
      }
    },
  }),
});