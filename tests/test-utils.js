// General test utilities for browser-based integration tests

export function getDynamicTimeout(base = 30000) {
  const multiplier = process.env.CI ? 2 : 1;
  return base * multiplier;
}

export async function setupBrowser(puppeteer) {
  const launchOptions = {
    headless: process.env.CI ? 'new' : 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  };
  return puppeteer.launch(launchOptions);
}

export async function setupPage(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 720 });
  return page;
}

export async function waitForPageLoad(page, url) {
  await page.goto(url, {
    waitUntil: 'networkidle0',
    timeout: getDynamicTimeout(60000),
  });
}

export function resolveUrl(baseUrl, relativePath = '/') {
  if (!baseUrl) {
    throw new Error('Base URL not configured for tests');
  }
  if (!relativePath) {
    return baseUrl;
  }
  if (relativePath.startsWith('http')) {
    return relativePath;
  }
  return new URL(relativePath, baseUrl).toString();
}

export async function logMemoryUsage() {
  if (global.gc) {
    global.gc();
  }
  const usage = process.memoryUsage();
  console.log(`Memory usage: RSS ${(usage.rss / 1024 / 1024).toFixed(2)} MB`);
}

export async function cleanup(browser, page) {
  if (page) {
    await page.close();
  }
  if (browser) {
    await browser.close();
  }
}

export default {
  getDynamicTimeout,
  setupBrowser,
  setupPage,
  waitForPageLoad,
  resolveUrl,
  logMemoryUsage,
  cleanup,
};
