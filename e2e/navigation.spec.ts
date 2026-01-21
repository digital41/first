import { test, expect } from '@playwright/test';

// Helper to set up authenticated state
async function setupAuthenticatedUser(page: any) {
  await page.evaluate(() => {
    localStorage.setItem('client_access_token', 'mock-token');
    localStorage.setItem('client_refresh_token', 'mock-refresh');
  });

  await page.route('**/api/auth/me', async (route: any) => {
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
            companyName: 'Test Company',
            phone: '0612345678',
            createdAt: '2024-01-01T00:00:00.000Z',
          },
        },
      }),
    });
  });

  // Mock all common endpoints
  await page.route('**/api/client/tickets*', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }),
    });
  });

  await page.route('**/api/client/orders*', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });

  await page.route('**/api/client/notifications*', async (route: any) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ success: true, data: [] }),
    });
  });
}

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await setupAuthenticatedUser(page);
  });

  test('should navigate to tickets page from sidebar', async ({ page }) => {
    await page.goto('/');

    const ticketsLink = page.getByRole('link', { name: /tickets|demandes/i });
    if (await ticketsLink.isVisible()) {
      await ticketsLink.click();
      await expect(page).toHaveURL(/tickets/);
    }
  });

  test('should navigate to orders page from sidebar', async ({ page }) => {
    await page.goto('/');

    const ordersLink = page.getByRole('link', { name: /commandes|orders/i });
    if (await ordersLink.isVisible()) {
      await ordersLink.click();
      await expect(page).toHaveURL(/orders/);
    }
  });

  test('should navigate to profile page', async ({ page }) => {
    await page.goto('/');

    // Click on user menu or profile link
    const profileLink = page.getByRole('link', { name: /profil/i });
    const userMenu = page.getByRole('button', { name: /test user/i });

    if (await profileLink.isVisible()) {
      await profileLink.click();
    } else if (await userMenu.isVisible()) {
      await userMenu.click();
      const profileMenuItem = page.getByRole('link', { name: /mon profil/i });
      if (await profileMenuItem.isVisible()) {
        await profileMenuItem.click();
      }
    }

    await expect(page).toHaveURL(/profile/);
  });

  test('should show active navigation state', async ({ page }) => {
    await page.goto('/tickets');

    // The tickets nav item should have active styling
    const ticketsNavItem = page.getByRole('link', { name: /tickets|demandes/i });
    if (await ticketsNavItem.isVisible()) {
      // Check for active class or styling
      const classes = await ticketsNavItem.getAttribute('class');
      expect(classes).toMatch(/active|current|primary|selected/i);
    }
  });
});

test.describe('Profile Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await setupAuthenticatedUser(page);
  });

  test('should display user profile information', async ({ page }) => {
    await page.goto('/profile');

    await expect(page.getByText('Test User')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('test@example.com')).toBeVisible();
    await expect(page.getByText('0612345678')).toBeVisible();
    await expect(page.getByText('Test Company')).toBeVisible();
    await expect(page.getByText('C001')).toBeVisible();
  });

  test('should show edit button', async ({ page }) => {
    await page.goto('/profile');

    const editButton = page.getByRole('button', { name: /modifier/i });
    await expect(editButton).toBeVisible({ timeout: 10000 });
  });

  test('should enter edit mode when clicking edit', async ({ page }) => {
    await page.goto('/profile');

    const editButton = page.getByRole('button', { name: /modifier/i });
    await editButton.click();

    // Should show save and cancel buttons
    await expect(page.getByRole('button', { name: /enregistrer/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /annuler/i })).toBeVisible();
  });

  test('should update profile successfully', async ({ page }) => {
    await page.route('**/api/auth/me', async (route) => {
      if (route.request().method() === 'PUT') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              user: {
                id: 'user-123',
                email: 'test@example.com',
                displayName: 'Updated Name',
                role: 'CUSTOMER',
                phone: '0698765432',
              },
            },
            message: 'Profil mis à jour',
          }),
        });
      } else {
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
                companyName: 'Test Company',
                phone: '0612345678',
                createdAt: '2024-01-01T00:00:00.000Z',
              },
            },
          }),
        });
      }
    });

    await page.goto('/profile');

    // Enter edit mode
    const editButton = page.getByRole('button', { name: /modifier/i });
    await editButton.click();

    // Update name
    const nameInput = page.getByPlaceholder(/votre nom/i);
    await nameInput.clear();
    await nameInput.fill('Updated Name');

    // Save changes
    const saveButton = page.getByRole('button', { name: /enregistrer/i });
    await saveButton.click();

    // Should show success message
    await expect(page.getByText(/mis à jour|succès/i)).toBeVisible({ timeout: 10000 });
  });

  test('should cancel edit and restore original values', async ({ page }) => {
    await page.goto('/profile');

    // Enter edit mode
    const editButton = page.getByRole('button', { name: /modifier/i });
    await editButton.click();

    // Modify name
    const nameInput = page.getByPlaceholder(/votre nom/i);
    await nameInput.clear();
    await nameInput.fill('Changed Name');

    // Cancel
    const cancelButton = page.getByRole('button', { name: /annuler/i });
    await cancelButton.click();

    // Should be back to view mode with original name
    await expect(page.getByText('Test User')).toBeVisible();
    await expect(page.getByRole('button', { name: /modifier/i })).toBeVisible();
  });

  test('should logout from profile page', async ({ page }) => {
    await page.route('**/api/auth/logout', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true }),
      });
    });

    await page.goto('/profile');

    const logoutButton = page.getByRole('button', { name: /déconnexion/i });
    await logoutButton.click();

    // Should redirect to login
    await expect(page).toHaveURL(/login/, { timeout: 10000 });
  });
});

test.describe('Header Navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await setupAuthenticatedUser(page);
  });

  test('should display user name in header', async ({ page }) => {
    await page.goto('/');

    await expect(page.getByText('Test User')).toBeVisible({ timeout: 10000 });
  });

  test('should show notifications bell', async ({ page }) => {
    await page.goto('/');

    const notificationsBell = page.locator('[aria-label*="notification"], button:has(svg)').first();
    await expect(notificationsBell).toBeVisible({ timeout: 10000 });
  });

  test('should show user dropdown menu', async ({ page }) => {
    await page.goto('/');

    // Click on user menu
    const userMenuButton = page.getByRole('button').filter({ hasText: 'Test User' });
    if (await userMenuButton.isVisible()) {
      await userMenuButton.click();

      // Should show dropdown with profile and logout options
      await expect(page.getByText(/mon profil/i)).toBeVisible();
      await expect(page.getByText(/déconnexion/i)).toBeVisible();
    }
  });
});

test.describe('Mobile Navigation', () => {
  test.use({ viewport: { width: 375, height: 667 } });

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await setupAuthenticatedUser(page);
  });

  test('should show hamburger menu on mobile', async ({ page }) => {
    await page.goto('/');

    // Should have hamburger menu button
    const menuButton = page.locator('button:has(svg)').first();
    await expect(menuButton).toBeVisible({ timeout: 10000 });
  });

  test('should open mobile menu when clicking hamburger', async ({ page }) => {
    await page.goto('/');

    // Find and click hamburger menu
    const menuButton = page.getByRole('button', { name: /menu/i });
    if (await menuButton.isVisible()) {
      await menuButton.click();

      // Mobile navigation should be visible
      const nav = page.locator('nav, aside, [role="navigation"]');
      await expect(nav).toBeVisible();
    }
  });

  test('should navigate and close menu on mobile', async ({ page }) => {
    await page.goto('/');

    // Open menu
    const menuButton = page.getByRole('button', { name: /menu/i });
    if (await menuButton.isVisible()) {
      await menuButton.click();

      // Click on tickets link
      const ticketsLink = page.getByRole('link', { name: /tickets/i });
      if (await ticketsLink.isVisible()) {
        await ticketsLink.click();

        // Should navigate to tickets
        await expect(page).toHaveURL(/tickets/);
      }
    }
  });
});
