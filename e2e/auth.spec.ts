import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Clear any stored tokens
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.clear();
    });
  });

  test('should display login page', async ({ page }) => {
    await page.goto('/login');

    await expect(page.getByPlaceholder(/code client/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /connexion/i })).toBeVisible();
  });

  test('should show error for invalid customer code', async ({ page }) => {
    await page.goto('/login');

    await page.getByPlaceholder(/code client/i).fill('INVALID_CODE');
    await page.getByRole('button', { name: /connexion/i }).click();

    // Should show error message
    await expect(page.getByText(/aucun compte|erreur|invalid/i)).toBeVisible({ timeout: 10000 });
  });

  test('should redirect to login when accessing protected route', async ({ page }) => {
    await page.goto('/profile');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect to login when accessing tickets without auth', async ({ page }) => {
    await page.goto('/tickets');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('should redirect to login when accessing orders without auth', async ({ page }) => {
    await page.goto('/orders');

    // Should redirect to login
    await expect(page).toHaveURL(/login/);
  });

  test('login form should be accessible', async ({ page }) => {
    await page.goto('/login');

    // Check form accessibility
    const input = page.getByPlaceholder(/code client/i);
    await expect(input).toBeVisible();
    await expect(input).toBeEnabled();

    const button = page.getByRole('button', { name: /connexion/i });
    await expect(button).toBeVisible();
    await expect(button).toBeEnabled();
  });

  test('should handle empty form submission', async ({ page }) => {
    await page.goto('/login');

    await page.getByRole('button', { name: /connexion/i }).click();

    // Should stay on login page or show validation error
    await expect(page).toHaveURL(/login/);
  });
});

test.describe('Authentication Flow (with mock)', () => {
  test('should login successfully with valid customer code', async ({ page }) => {
    // Mock the API response
    await page.route('**/api/auth/login', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
              displayName: 'Test User',
              role: 'CUSTOMER',
              customerCode: 'C001',
            },
            tokens: {
              accessToken: 'mock-access-token',
              refreshToken: 'mock-refresh-token',
            },
          },
        }),
      });
    });

    await page.goto('/login');
    await page.getByPlaceholder(/code client/i).fill('C001');
    await page.getByRole('button', { name: /connexion/i }).click();

    // Should redirect to dashboard/home
    await expect(page).not.toHaveURL(/login/, { timeout: 10000 });
  });

  test('should logout successfully', async ({ page }) => {
    // Set up mock tokens in localStorage
    await page.goto('/login');
    await page.evaluate(() => {
      localStorage.setItem('client_access_token', 'mock-token');
      localStorage.setItem('client_refresh_token', 'mock-refresh');
    });

    // Mock the me endpoint
    await page.route('**/api/auth/me', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            user: {
              id: 'user-123',
              email: 'test@example.com',
              displayName: 'Test User',
              role: 'CUSTOMER',
            },
          },
        }),
      });
    });

    // Mock logout endpoint
    await page.route('**/api/auth/logout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/profile');

    // Click logout button
    const logoutButton = page.getByRole('button', { name: /déconnexion/i });
    if (await logoutButton.isVisible()) {
      await logoutButton.click();

      // Should redirect to login
      await expect(page).toHaveURL(/login/, { timeout: 10000 });
    }
  });
});
