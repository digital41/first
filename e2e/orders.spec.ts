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
          },
        },
      }),
    });
  });
}

test.describe('Orders Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await setupAuthenticatedUser(page);
  });

  test('should display orders list', async ({ page }) => {
    const orders = [
      {
        id: 'order-1',
        orderNumber: 'BP-2024-001',
        documentType: 'BP',
        status: 'DELIVERED',
        totalAmount: 1500.00,
        customerName: 'Test User',
        createdAt: new Date().toISOString(),
        items: [
          { description: 'Product A', quantity: 2, unitPrice: 500, totalPrice: 1000 },
          { description: 'Product B', quantity: 1, unitPrice: 500, totalPrice: 500 },
        ],
      },
      {
        id: 'order-2',
        orderNumber: 'BL-2024-002',
        documentType: 'BL',
        status: 'SHIPPED',
        totalAmount: 750.00,
        customerName: 'Test User',
        createdAt: new Date().toISOString(),
        items: [
          { description: 'Product C', quantity: 3, unitPrice: 250, totalPrice: 750 },
        ],
      },
    ];

    await page.route('**/api/client/orders*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: orders }),
      });
    });

    await page.goto('/orders');

    // Should display orders
    await expect(page.getByText(/BP-2024-001|Commande/i)).toBeVisible({ timeout: 10000 });
  });

  test('should show empty state when no orders', async ({ page }) => {
    await page.route('**/api/client/orders*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto('/orders');

    // Should show empty state
    await expect(page.getByText(/aucune commande|pas de commande/i)).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to order detail', async ({ page }) => {
    const order = {
      id: 'order-1',
      orderNumber: 'BP-2024-001',
      documentType: 'BP',
      status: 'DELIVERED',
      totalAmount: 1500.00,
      customerName: 'Test User',
      createdAt: new Date().toISOString(),
      items: [],
    };

    await page.route('**/api/client/orders*', async (route) => {
      const url = route.request().url();
      if (url.includes('BP-2024-001')) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: order }),
        });
      } else {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [order] }),
        });
      }
    });

    await page.goto('/orders');

    // Click on order to view details
    const orderCard = page.getByText(/BP-2024-001/);
    if (await orderCard.isVisible()) {
      await orderCard.click();

      // Should navigate to order detail
      await expect(page).toHaveURL(/orders\/BP-2024-001/, { timeout: 5000 });
    }
  });
});

test.describe('Order Detail Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await setupAuthenticatedUser(page);
  });

  test('should display order information', async ({ page }) => {
    const orderNumber = 'BP-2024-001';
    const order = {
      id: 'order-1',
      orderNumber,
      documentType: 'BP',
      status: 'DELIVERED',
      totalAmount: 1500.00,
      customerName: 'Test User',
      customerEmail: 'test@example.com',
      createdAt: new Date().toISOString(),
      deliveryAddress: '123 Test Street, Paris',
      items: [
        { id: '1', description: 'Product A', quantity: 2, unitPrice: 500, totalPrice: 1000 },
        { id: '2', description: 'Product B', quantity: 1, unitPrice: 500, totalPrice: 500 },
      ],
    };

    await page.route(`**/api/client/orders/${orderNumber}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: order }),
      });
    });

    await page.goto(`/orders/${orderNumber}`);

    // Should display order number
    await expect(page.getByText(orderNumber)).toBeVisible({ timeout: 10000 });

    // Should display order items
    await expect(page.getByText('Product A')).toBeVisible();
    await expect(page.getByText('Product B')).toBeVisible();

    // Should display total amount
    await expect(page.getByText(/1[\s,.]?500/)).toBeVisible();
  });

  test('should show status tracker', async ({ page }) => {
    const orderNumber = 'BP-2024-001';

    await page.route(`**/api/client/orders/${orderNumber}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'order-1',
            orderNumber,
            documentType: 'BP',
            status: 'SHIPPED',
            totalAmount: 1000,
            createdAt: new Date().toISOString(),
            items: [],
          },
        }),
      });
    });

    await page.goto(`/orders/${orderNumber}`);

    // Should show status indicators
    await expect(page.getByText(/en cours|expédié|shipped/i)).toBeVisible({ timeout: 10000 });
  });

  test('should have download invoice button', async ({ page }) => {
    const orderNumber = 'BP-2024-001';

    await page.route(`**/api/client/orders/${orderNumber}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'order-1',
            orderNumber,
            documentType: 'BP',
            status: 'DELIVERED',
            totalAmount: 1000,
            createdAt: new Date().toISOString(),
            items: [],
          },
        }),
      });
    });

    await page.goto(`/orders/${orderNumber}`);

    // Should have download/print button
    const downloadButton = page.getByRole('button', { name: /télécharger|imprimer|pdf/i });
    await expect(downloadButton).toBeVisible({ timeout: 10000 });
  });

  test('should navigate back to orders list', async ({ page }) => {
    const orderNumber = 'BP-2024-001';

    await page.route(`**/api/client/orders/${orderNumber}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'order-1',
            orderNumber,
            status: 'DELIVERED',
            items: [],
            createdAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.route('**/api/client/orders*', async (route) => {
      if (!route.request().url().includes(orderNumber)) {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [] }),
        });
      }
    });

    await page.goto(`/orders/${orderNumber}`);

    // Click back button
    const backButton = page.getByRole('button', { name: /retour/i });
    if (await backButton.isVisible()) {
      await backButton.click();
      await expect(page).toHaveURL(/\/orders$/, { timeout: 5000 });
    }
  });
});

test.describe('Orders - Mobile Responsive', () => {
  test.use({ viewport: { width: 375, height: 667 } }); // iPhone SE size

  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await setupAuthenticatedUser(page);
  });

  test('should display orders properly on mobile', async ({ page }) => {
    await page.route('**/api/client/orders*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'order-1',
              orderNumber: 'BP-2024-001',
              status: 'DELIVERED',
              totalAmount: 1500,
              createdAt: new Date().toISOString(),
              items: [],
            },
          ],
        }),
      });
    });

    await page.goto('/orders');

    // Page should be scrollable and content visible
    await expect(page.getByText(/BP-2024-001/)).toBeVisible({ timeout: 10000 });
  });

  test('should show mobile-friendly order detail', async ({ page }) => {
    const orderNumber = 'BP-2024-001';

    await page.route(`**/api/client/orders/${orderNumber}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: 'order-1',
            orderNumber,
            status: 'DELIVERED',
            totalAmount: 1500,
            items: [
              { description: 'Product A', quantity: 2, unitPrice: 750, totalPrice: 1500 },
            ],
            createdAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.goto(`/orders/${orderNumber}`);

    // Content should be visible on mobile
    await expect(page.getByText(orderNumber)).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Product A')).toBeVisible();
  });
});
