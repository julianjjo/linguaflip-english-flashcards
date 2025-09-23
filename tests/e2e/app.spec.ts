import { test, expect } from '@playwright/test';

test.describe('LinguaFlip end-to-end journey', () => {
  test.describe.configure({ mode: 'serial' });

  test('landing page displays hero content and CTAs', async ({ page }) => {
    await test.step('Navigate to the landing page', async () => {
      await page.goto('/');
    });

    await test.step('Verify hero heading and supporting text', async () => {
      await expect(
        page.getByRole('heading', { name: /Impulsa tu inglés con/i })
      ).toBeVisible();
      await expect(
        page.getByText('flashcards inteligentes', { exact: false })
      ).toBeVisible();
    });

    await test.step('Confirm primary call-to-action links to registration', async () => {
      const primaryCta = page.getByRole('link', {
        name: 'Crear cuenta gratuita',
      });
      await expect(primaryCta).toBeVisible();
      await expect(primaryCta).toHaveAttribute('href', '/register');
    });

    await test.step('Ensure secondary navigation links are present', async () => {
      await expect(
        page.getByRole('link', { name: 'Iniciar sesión' })
      ).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Empieza gratis' })
      ).toHaveAttribute('href', '/register');
    });
  });

  test('primary navigation anchors lead to the workflow section', async ({
    page,
  }) => {
    await test.step('Open the landing page', async () => {
      await page.goto('/');
    });

    await test.step('Jump to the workflow section using the navigation link', async () => {
      const workflowLink = page
        .getByRole('link', { name: 'Cómo funciona' })
        .first();
      await workflowLink.click();
      await expect(page).toHaveURL(/#workflow/);
    });

    await test.step('Verify that the workflow heading is visible', async () => {
      const workflowHeading = page.getByRole('heading', {
        name: 'Un flujo pensado para tu agenda',
      });
      await workflowHeading.scrollIntoViewIfNeeded();
      await expect(workflowHeading).toBeVisible();
    });
  });

  test('study mode link navigates to the study page', async ({ page }) => {
    await test.step('Open the landing page', async () => {
      await page.goto('/');
    });

    await test.step('Follow the hero study link', async () => {
      await page.getByRole('link', { name: 'Ver modo estudio' }).click();
      await expect(page).toHaveURL(/\/study$/);
    });

    await test.step('Confirm study session content is rendered', async () => {
      await expect(
        page.getByRole('heading', { name: 'Sesión de Estudio' })
      ).toBeVisible();
      await expect(page.getByText('Cargando flashcards...')).toBeVisible();
      await expect(
        page.getByRole('link', { name: 'Volver al Dashboard' })
      ).toBeVisible();
    });
  });

  test('login form validation and password visibility toggle work as expected', async ({
    page,
  }) => {
    await test.step('Open the login page', async () => {
      await page.goto('/login');
    });

    await test.step('Submit the form without credentials to trigger validation', async () => {
      await page
        .getByRole('button', { name: 'Iniciar Sesión', exact: true })
        .click();
      const errorAlert = page.locator('#errorMessage');
      await expect(errorAlert).toBeVisible();
      await expect(errorAlert).toContainText(
        'Todos los campos obligatorios deben ser completados'
      );
    });

    await test.step('Toggle password visibility control', async () => {
      const passwordInput = page.locator('#password');
      const toggleButton = page
        .locator('button[onclick*="togglePasswordVisibility"]')
        .first();
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'text');
      await toggleButton.click();
      await expect(passwordInput).toHaveAttribute('type', 'password');
    });
  });
});
