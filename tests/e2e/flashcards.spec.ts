import { expect, test, type Page } from '@playwright/test';

const timestamp = Date.now();
const testUser = {
  email: `flashcards-e2e-${timestamp}@example.com`,
  password: `TestPass123!`,
  username: `flashcards_user_${timestamp}`,
};

async function loginThroughAuthModal(page: Page): Promise<void> {
  await page.goto('/study');
  await page.waitForLoadState('domcontentloaded');

  const createButton = page.getByLabel('Crear nueva flashcard');
  await createButton.waitFor({ state: 'visible', timeout: 30000 });

  const profileLoginButton = page
    .locator('div.fixed.right-16')
    .getByRole('button', { name: 'Iniciar Sesión', exact: true });
  await profileLoginButton.waitFor({ state: 'visible', timeout: 30000 });
  await profileLoginButton.click();

  const authHeading = page.getByRole('heading', { name: 'Iniciar Sesión' });
  await expect(authHeading).toBeVisible({ timeout: 30000 });

  await page.getByLabel('Correo electrónico').fill(testUser.email);
  await page.getByLabel('Contraseña').fill(testUser.password);

  const submitButton = page
    .locator('form')
    .getByRole('button', { name: 'Iniciar Sesión', exact: true });

  const loginResponsePromise = page.waitForResponse(
    (response) =>
      response.url().includes('/api/auth/login') &&
      response.request().method() === 'POST'
  );

  await submitButton.click();
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok()).toBeTruthy();

  await page.waitForLoadState('networkidle');
  await expect(page).toHaveURL(/\/study/);
  await expect(
    page.getByRole('heading', { name: 'Sesión de Estudio' })
  ).toBeVisible();
}

test('los invitados deben autenticarse antes de crear flashcards', async ({
  page,
}) => {
  await page.goto('/study');
  await page.waitForLoadState('domcontentloaded');

  const authRequired = page.locator('#auth-required-state');
  await expect(authRequired).toBeVisible();
  await expect(authRequired).toContainText('Inicia Sesión para Estudiar');

  const loginButton = authRequired.getByRole('button', {
    name: 'Iniciar Sesión',
    exact: true,
  });
  await loginButton.click();

  await expect(
    page.getByRole('heading', { name: 'Iniciar Sesión', exact: true })
  ).toBeVisible();
});

test.describe
  .serial('Flujo autenticado de creación y estudio de flashcards', () => {
  let createdFlashcard: { english: string; spanish: string } | null = null;

  test.beforeAll(async ({ request }) => {
    const response = await request.post('/api/auth/register', {
      headers: { 'Content-Type': 'application/json' },
      data: {
        email: testUser.email,
        password: testUser.password,
        confirmPassword: testUser.password,
        username: testUser.username,
      },
    });

    expect(response.ok()).toBeTruthy();
  });

  test('el usuario registrado puede iniciar sesión desde el modal flotante', async ({
    page,
  }) => {
    await loginThroughAuthModal(page);
  });

  test('un usuario autenticado puede abrir el modal de creación de flashcards', async ({
    page,
  }) => {
    await loginThroughAuthModal(page);

    const createButton = page.getByLabel('Crear nueva flashcard');
    await createButton.waitFor({ state: 'visible', timeout: 30000 });
    await createButton.click();

    await expect(
      page.getByRole('heading', { name: 'Crear Nueva Flashcard' })
    ).toBeVisible();
    await expect(page.getByLabel('Palabra en Inglés *')).toBeVisible();
    await expect(page.getByLabel('Traducción en Español *')).toBeVisible();

    await page.getByRole('button', { name: 'Cerrar modal' }).click();
    await page
      .getByRole('heading', { name: 'Crear Nueva Flashcard' })
      .waitFor({ state: 'detached' });
  });

  test('el modal permite crear una nueva flashcard desde el modo de estudio', async ({
    page,
  }) => {
    await loginThroughAuthModal(page);

    const createButton = page.getByLabel('Crear nueva flashcard');
    await createButton.waitFor({ state: 'visible', timeout: 30000 });
    await createButton.click();

    const englishTerm = `E2E Term ${Date.now()}`;
    const spanishTerm = `Término ${Date.now()}`;

    await page.getByLabel('Palabra en Inglés *').fill(englishTerm);
    await page.getByLabel('Traducción en Español *').fill(spanishTerm);
    await page
      .getByLabel('Ejemplo en Inglés')
      .fill('This is an automated example.');
    await page
      .getByLabel('Ejemplo en Español')
      .fill('Este es un ejemplo generado por pruebas.');

    const createResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/flashcards/create') &&
        response.request().method() === 'POST'
    );

    await page.getByRole('button', { name: 'Crear Flashcard' }).click();

    const createResponse = await createResponsePromise;
    expect(createResponse.ok()).toBeTruthy();

    await page
      .getByRole('heading', { name: 'Crear Nueva Flashcard' })
      .waitFor({ state: 'detached' });

    createdFlashcard = {
      english: englishTerm,
      spanish: spanishTerm,
    };
  });

  test('la nueva flashcard aparece en el modo estudio y se puede calificar', async ({
    page,
  }) => {
    await loginThroughAuthModal(page);

    expect(createdFlashcard).not.toBeNull();
    const { english, spanish } = createdFlashcard!;

    await page.route('**/api/flashcards/review', async (route) => {
      const requestBody = await route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            flashcard: {
              id: requestBody.cardId,
              english,
              spanish,
              reviewCount: 1,
            },
          },
        }),
      });
    });

    await page.goto('/study');
    await page.waitForLoadState('domcontentloaded');

    const flashcardFront = page
      .locator('#flashcard-container')
      .getByText(english, { exact: true });
    await expect(flashcardFront).toBeVisible({ timeout: 15000 });

    await page.getByRole('button', { name: 'Voltear' }).click();

    const flashcardBack = page
      .locator('#flashcard-container')
      .getByText(spanish, { exact: true });
    await expect(flashcardBack).toBeVisible();
    await expect(page.locator('#recall-controls')).toBeVisible();

    const reviewResponsePromise = page.waitForResponse(
      (response) =>
        response.url().includes('/api/flashcards/review') &&
        response.request().method() === 'POST'
    );

    await page.getByRole('button', { name: 'Good' }).click();

    const reviewResponse = await reviewResponsePromise;
    expect(reviewResponse.ok()).toBeTruthy();

    await expect(page.locator('#recall-controls')).toBeHidden();
  });
});
