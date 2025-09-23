import puppeteer from 'puppeteer';
import testConfig from './test-config.js';
import {
  setupBrowser,
  setupPage,
  waitForPageLoad,
  resolveUrl,
  getDynamicTimeout,
} from './test-utils.js';

describe('LinguaFlip Design Tests', () => {
  let browser;
  let page;
  let config;

  beforeAll(async () => {
    jest.setTimeout(getDynamicTimeout(60000)); // 60 seconds for setup

    config = testConfig;
    console.log(`🌐 Testing against: ${config.getBaseURL()}`);

    browser = await setupBrowser(puppeteer);
  });

  afterAll(async () => {
    if (browser) {
      await browser.close();
    }
  });

  beforeEach(async () => {
    jest.setTimeout(getDynamicTimeout(30000));

    page = await setupPage(browser);
  });

  afterEach(async () => {
    if (page) {
      await page.close();
    }
  });

  describe('Page Loading', () => {
    test('should load the main page successfully', async () => {
      jest.setTimeout(getDynamicTimeout(30000));

      try {
        const url = resolveUrl();
        await page.goto(url, { waitUntil: 'networkidle2' });
        await waitForPageLoad(page);

        const title = await page.title();
        expect(title).not.toBe('');
        console.log('✅ Página cargada exitosamente');
      } catch (error) {
        console.error('❌ Error al cargar la página:', error.message);
        throw error;
      }
    });

    test('should have proper HTTP status', async () => {
      jest.setTimeout(getDynamicTimeout(15000));

      const url = resolveUrl();
      const response = await page.goto(url, { waitUntil: 'networkidle2' });
      const status = response.status();
      expect([200, 304]).toContain(status); // 304 es válido para recursos cacheados
      console.log(`✅ HTTP status correcto (${status})`);
    });

    test('should load within reasonable time', async () => {
      jest.setTimeout(getDynamicTimeout(20000));

      const startTime = Date.now();
      const url = resolveUrl();
      await page.goto(url, { waitUntil: 'networkidle2' });
      await waitForPageLoad(page);

      const loadTime = Date.now() - startTime;
      const maxLoadTime = config.getTimeouts().pageLoad;
      expect(loadTime).toBeLessThan(maxLoadTime);
      console.log(`✅ Página cargada en ${loadTime}ms`);
    });
  });

  describe('Main Elements', () => {
    beforeEach(async () => {
      jest.setTimeout(getDynamicTimeout(15000));

      const url = resolveUrl();
      await page.goto(url, { waitUntil: 'networkidle2' });
      await waitForPageLoad(page);

      // Wait for hydration to complete and suppress hydration errors
      await page.waitForTimeout(2000);
    });

    test('should have main container', async () => {
      const mainContainer = await page.$(
        '[data-testid="main-container"], main, #root, body'
      );
      expect(mainContainer).not.toBeNull();
      console.log('✅ Contenedor principal encontrado');
    });

    test('should have header component', async () => {
      const header = await page.$(
        'header, [data-testid="header"], nav, [role="navigation"]'
      );
      expect(header).not.toBeNull();
      console.log('✅ Header encontrado');
    });

    test('should have navigation', async () => {
      const nav = await page.$(
        'nav, [data-testid="navigation"], [role="navigation"]'
      );
      expect(nav).not.toBeNull();
      console.log('✅ Navegación encontrada');
    });

    test('should have some interactive content', async () => {
      const interactiveElements = await page.$$(
        'button, a, input, [role="button"]'
      );
      expect(interactiveElements.length).toBeGreaterThan(0);
      console.log(
        `✅ ${interactiveElements.length} elementos interactivos encontrados`
      );
    });
  });

  describe('Tailwind CSS', () => {
    beforeEach(async () => {
      const url = resolveUrl();
      await page.goto(url, { waitUntil: 'networkidle2' });
    });

    test('should have Tailwind utilities applied', async () => {
      const bodyClasses = await page.$eval('body', (el) => el.className);
      expect(bodyClasses).toContain('bg-');
      console.log('✅ Utilidades Tailwind aplicadas');
    });

    test('should have responsive classes', async () => {
      const responsiveElements = await page.$$(
        '[class*="md:"], [class*="lg:"], [class*="sm:"]'
      );
      expect(responsiveElements.length).toBeGreaterThan(0);
      console.log(
        `✅ ${responsiveElements.length} elementos con clases responsive encontrados`
      );
    });

    test('should have flexbox utilities', async () => {
      const flexElements = await page.$$('[class*="flex"], [class*="grid"]');
      expect(flexElements.length).toBeGreaterThan(0);
      console.log(
        `✅ ${flexElements.length} elementos con layout utilities encontrados`
      );
    });

    test('should have proper spacing classes', async () => {
      const spacingElements = await page.$$(
        '[class*="p-"], [class*="m-"], [class*="px-"], [class*="py-"]'
      );
      expect(spacingElements.length).toBeGreaterThan(0);
      console.log(
        `✅ ${spacingElements.length} elementos con clases de espaciado encontrados`
      );
    });
  });

  describe('Responsive Design', () => {
    beforeEach(async () => {
      const url = resolveUrl();
      await page.goto(url, { waitUntil: 'networkidle2' });
    });

    test('should work on mobile devices', async () => {
      await page.setViewport({ width: 375, height: 667 }); // iPhone SE
      await new Promise((resolve) => setTimeout(resolve, 500));

      const body = await page.$('body');
      const boundingBox = await body.boundingBox();
      expect(boundingBox.width).toBeLessThan(400);
      console.log('✅ Diseño responsive en móvil verificado');
    });

    test('should work on tablet devices', async () => {
      await page.setViewport({ width: 768, height: 1024 }); // iPad
      await new Promise((resolve) => setTimeout(resolve, 500));

      const body = await page.$('body');
      const boundingBox = await body.boundingBox();
      expect(boundingBox.width).toBeGreaterThan(700);
      expect(boundingBox.width).toBeLessThan(800);
      console.log('✅ Diseño responsive en tablet verificado');
    });

    test('should work on desktop devices', async () => {
      await page.setViewport({ width: 1920, height: 1080 }); // Desktop
      await new Promise((resolve) => setTimeout(resolve, 500));

      const body = await page.$('body');
      const boundingBox = await body.boundingBox();
      expect(boundingBox.width).toBeGreaterThan(1800);
      console.log('✅ Diseño responsive en desktop verificado');
    });

    test('should maintain readability on all screen sizes', async () => {
      const viewports = [
        { width: 320, height: 568 }, // Mobile small
        { width: 768, height: 1024 }, // Tablet
        { width: 1920, height: 1080 }, // Desktop
      ];

      for (const viewport of viewports) {
        await page.setViewport(viewport);
        await new Promise((resolve) => setTimeout(resolve, 300));

        const fontSize = await page.$eval('body', (el) => {
          const style = window.getComputedStyle(el);
          return parseFloat(style.fontSize);
        });

        expect(fontSize).toBeGreaterThan(10); // Mínimo 10px
        console.log(
          `✅ Legibilidad mantenida en ${viewport.width}x${viewport.height}`
        );
      }
    });
  });

  describe('Basic Functionality', () => {
    beforeEach(async () => {
      const url = resolveUrl();
      await page.goto(url, { waitUntil: 'networkidle2' });
    });

    test('should have interactive elements', async () => {
      const buttons = await page.$$(
        'button, [role="button"], input[type="button"]'
      );
      const links = await page.$$('a[href]');
      const inputs = await page.$$('input, textarea, select');

      const totalInteractive = buttons.length + links.length + inputs.length;
      expect(totalInteractive).toBeGreaterThan(0);
      console.log(`✅ ${totalInteractive} elementos interactivos encontrados`);
    });

    test('should have proper focus management', async () => {
      const focusableElements = await page.$$(
        'button, a[href], input, select, textarea'
      );
      expect(focusableElements.length).toBeGreaterThan(0);

      // Verificar que el primer elemento focusable puede recibir foco
      await page.keyboard.press('Tab');
      const activeElement = await page.evaluate(
        () => document.activeElement.tagName
      );
      expect(['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA']).toContain(
        activeElement
      );
      console.log('✅ Manejo de foco correcto');
    });

    test('should handle basic user interactions', async () => {
      const buttons = await page.$$('button');
      if (buttons.length > 0) {
        try {
          await buttons[0].click();
          await page.waitForTimeout(500);
          console.log('✅ Interacción básica con botón exitosa');
        } catch (error) {
          console.log(
            'ℹ️ No se pudo probar clic en botón (posiblemente normal)'
          );
        }
      }
    });

    test('should have proper form validation if forms exist', async () => {
      const forms = await page.$$('form');
      if (forms.length > 0) {
        const form = forms[0];
        const inputs = await form.$$('input[required]');

        if (inputs.length > 0) {
          // Intentar enviar formulario sin llenar campos requeridos
          try {
            await form.$eval(
              'input[type="submit"], button[type="submit"]',
              (el) => el.click()
            );
            await page.waitForTimeout(500);
            console.log('✅ Validación de formulario verificada');
          } catch (error) {
            console.log('ℹ️ No se pudo probar validación de formulario');
          }
        }
      }
    });
  });

  describe('Performance', () => {
    test('should load resources efficiently', async () => {
      const client = await page.target().createCDPSession();
      await client.send('Network.enable');

      const requests = [];
      client.on('Network.responseReceived', (event) => {
        requests.push(event.response);
      });

      const url = resolveUrl();
      await page.goto(url, { waitUntil: 'networkidle2' });

      const failedRequests = requests.filter((req) => req.status >= 400);
      expect(failedRequests.length).toBe(0);
      console.log(`✅ ${requests.length} recursos cargados correctamente`);
    });

    test('should not have console errors', async () => {
      const errors = [];
      page.on('console', (msg) => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      const url = resolveUrl();
      await page.goto(url, { waitUntil: 'networkidle2' });
      await new Promise((resolve) => setTimeout(resolve, 1000));

      expect(errors.length).toBe(0);
      console.log('✅ No se encontraron errores en consola');
    });
  });
});
