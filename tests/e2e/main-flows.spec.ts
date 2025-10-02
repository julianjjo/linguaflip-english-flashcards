import { test, expect } from '@playwright/test';

const timestamp = Date.now();
const registrationUser = {
  email: `playwright-user-${timestamp}@example.com`,
  password: 'TestPassw0rd!',
  username: `pw_user_${timestamp}`,
};

test.describe('Flujos principales adicionales de LinguaFlip', () => {
  test('un usuario puede completar el registro y es redirigido al dashboard', async ({
    page,
  }) => {
    await page.route('**/api/auth/register', async (route) => {
      const responsePayload = {
        success: true,
        data: {
          user: {
            id: 'user_test_1',
            email: registrationUser.email,
            username: registrationUser.username,
          },
          tokens: {
            accessToken: 'access-token-mock',
            refreshToken: 'refresh-token-mock',
            expiresIn: 3600,
          },
        },
        message: 'Registration successful',
      };

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(responsePayload),
      });
    });

    await page.goto('/register');

    await page.getByLabel('Correo electrónico *').fill(registrationUser.email);
    await page
      .getByLabel('Nombre de usuario (opcional)')
      .fill(registrationUser.username);
    await page.locator('#password').fill(registrationUser.password);
    await page.locator('#confirmPassword').fill(registrationUser.password);
    await page.getByRole('checkbox', { name: /Acepto los/i }).check();

    await Promise.all([
      page.waitForResponse(
        (response) =>
          response.url().includes('/api/auth/register') &&
          response.request().method() === 'POST'
      ),
      page.getByRole('button', { name: 'Crear cuenta' }).click(),
    ]);

    const successAlert = page.locator('#successMessage');
    await expect(successAlert).toBeVisible();
    await expect(successAlert).toContainText(
      'Cuenta creada exitosamente. Redirigiendo...'
    );

    await expect(page).toHaveURL(/\/dashboard$/);

    await expect
      .poll(async () => {
        return page.evaluate(() => ({
          accessToken: window.localStorage.getItem('linguaflip_auth_token'),
          refreshToken: window.localStorage.getItem('linguaflip_refresh_token'),
          user: window.localStorage.getItem('linguaflip_user'),
        }));
      })
      .toMatchObject({
        accessToken: 'access-token-mock',
        refreshToken: 'refresh-token-mock',
      });
  });

  test('el dashboard muestra estadísticas provenientes de la API y permite navegar a gestión de datos', async ({
    page,
  }) => {
    const statsPayload = {
      success: true,
      data: {
        totalCards: 180,
        masteredCards: 65,
        currentStreak: 9,
        longestStreak: 15,
        todayStudyTime: 42,
        cardsReviewedToday: 32,
        accuracyToday: 92,
        dueToday: 14,
        totalStudyTime: 760,
        averageAccuracy: 88,
        sessionsThisWeek: 6,
        sessionsThisMonth: 20,
        cardsInProgress: 58,
        newCards: 12,
      },
    };

    const activityPayload = {
      success: true,
      data: {
        sessions: [
          {
            id: 'session-1',
            date: '2024-03-01',
            cardsReviewed: 25,
            correctAnswers: 22,
            totalTime: 35,
            accuracy: 88,
            averageTimePerCard: 1.4,
            relativeTime: 'Hace 2 horas',
            performanceLevel: 'good',
            formattedDate: 'Hoy',
          },
        ],
        pagination: {
          currentPage: 1,
          totalPages: 1,
          limit: 5,
          offset: 0,
          hasMore: false,
          total: 1,
        },
        summary: {
          totalCardsReviewed: 25,
          totalStudyTime: 35,
          averageAccuracy: 88,
          sessionsCount: 1,
        },
      },
    };

    const progressPayload = {
      success: true,
      data: {
        progressData: [
          {
            date: '2024-03-01',
            cardsReviewed: 25,
            correctAnswers: 22,
            totalTime: 35,
            sessions: 1,
            accuracy: 88,
          },
        ],
        summary: {
          totalCardsReviewed: 25,
          totalCorrectAnswers: 22,
          totalStudyTime: 35,
          totalSessions: 1,
          averageAccuracy: 88,
          averageCardsPerSession: 25,
          averageTimePerSession: 35,
        },
        period: {
          days: 30,
          type: 'daily' as const,
        },
      },
    };

    await page.addInitScript(() => {
      window.localStorage.setItem('linguaflip_auth_token', 'dashboard-access');
      window.localStorage.setItem(
        'linguaflip_refresh_token',
        'dashboard-refresh'
      );
      window.localStorage.setItem(
        'linguaflip_user',
        JSON.stringify({
          id: 'user_test_dashboard',
          email: 'dashboard@example.com',
        })
      );
    });

    await page.route('**/api/dashboard/stats', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(statsPayload),
      });
    });

    await page.route('**/api/dashboard/activity*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(activityPayload),
      });
    });

    await page.route('**/api/dashboard/progress*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify(progressPayload),
      });
    });

    await page.goto('/dashboard');

    await expect(
      page.getByRole('heading', { name: 'Dashboard de Progreso' })
    ).toBeVisible();
    await expect(page.getByText('Total de Tarjetas')).toBeVisible();
    await expect(page.getByText('180', { exact: true })).toBeVisible();
    await expect(page.getByText('Tarjetas Dominadas')).toBeVisible();
    await expect(page.getByText('65', { exact: true })).toBeVisible();

    await expect(
      page.getByRole('heading', { name: 'Acciones Rápidas' })
    ).toBeVisible();
    await expect(
      page.getByRole('link', { name: 'Gestionar Datos' })
    ).toBeVisible();

    await Promise.all([
      page.waitForNavigation(),
      page.getByRole('link', { name: 'Gestionar Datos' }).click(),
    ]);

    await expect(page).toHaveURL(/\/data$/);
    await expect(
      page.getByRole('heading', { name: 'Gestión de Datos' })
    ).toBeVisible();
  });

  test('la página de progreso muestra las tarjetas de resumen y el acceso directo a nuevas sesiones', async ({
    page,
  }) => {
    await page.goto('/progress');

    await expect(
      page.getByRole('heading', { name: 'Progreso de Estudio' })
    ).toBeVisible();
    await expect(page.locator('#current-streak')).toHaveText('7');
    await expect(page.locator('#total-time')).toHaveText('24.5');
    await expect(page.locator('#cards-reviewed')).toContainText('1,247');
    await expect(page.locator('#accuracy-rate')).toHaveText('87%');

    const newSessionLink = page.getByRole('link', {
      name: 'Nueva Sesión de Estudio',
    });
    await expect(newSessionLink).toHaveAttribute('href', '/study');
  });

  test('los accesos rápidos de ayuda desplazan a la sección correspondiente', async ({
    page,
  }) => {
    await page.goto('/help');

    const faqSection = page.getByRole('heading', {
      level: 2,
      name: 'Preguntas Frecuentes',
    });
    await expect(faqSection).toBeVisible();

    await page.getByRole('button', { name: 'Ver FAQ →' }).click();

    await expect
      .poll(async () => {
        return faqSection.evaluate((element) => {
          const rect = element.getBoundingClientRect();
          return rect.top >= 0 && rect.top < window.innerHeight;
        });
      })
      .toBeTruthy();
  });

  test('guardar cambios en configuración muestra un indicador temporal', async ({
    page,
  }) => {
    await page.goto('/settings');

    const saveButton = page.getByRole('button', { name: 'Guardar Cambios' });
    await expect(saveButton).toBeEnabled();
    await saveButton.click();

    const statusToast = page.locator('#save-status');
    await expect(statusToast).toBeVisible();
  });
});
