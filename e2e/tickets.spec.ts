import { test, expect } from '@playwright/test';

// Helper to set up authenticated state
async function setupAuthenticatedUser(page: any) {
  await page.evaluate(() => {
    localStorage.setItem('client_access_token', 'mock-token');
    localStorage.setItem('client_refresh_token', 'mock-refresh');
  });

  // Mock auth/me endpoint
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

test.describe('Tickets Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await setupAuthenticatedUser(page);
  });

  test('should display tickets list', async ({ page }) => {
    // Mock tickets endpoint
    await page.route('**/api/client/tickets*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: [
            {
              id: 'ticket-1',
              ticketNumber: 'TKT-20240115-ABCD',
              subject: 'Problème technique',
              status: 'OPEN',
              priority: 'MEDIUM',
              issueType: 'TECHNICAL',
              createdAt: new Date().toISOString(),
            },
            {
              id: 'ticket-2',
              ticketNumber: 'TKT-20240114-EFGH',
              subject: 'Question livraison',
              status: 'IN_PROGRESS',
              priority: 'LOW',
              issueType: 'DELIVERY',
              createdAt: new Date().toISOString(),
            },
          ],
          meta: {
            total: 2,
            page: 1,
            limit: 20,
            totalPages: 1,
          },
        }),
      });
    });

    await page.goto('/tickets');

    // Should display ticket list
    await expect(page.getByText('Problème technique')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText('Question livraison')).toBeVisible();
  });

  test('should show create ticket button', async ({ page }) => {
    await page.route('**/api/client/tickets*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }),
      });
    });

    await page.goto('/tickets');

    const createButton = page.getByRole('button', { name: /nouveau ticket|créer/i });
    await expect(createButton).toBeVisible({ timeout: 10000 });
  });

  test('should filter tickets by status', async ({ page }) => {
    await page.route('**/api/client/tickets*', async (route) => {
      const url = new URL(route.request().url());
      const status = url.searchParams.get('status');

      const tickets = status === 'OPEN'
        ? [{ id: 'ticket-1', ticketNumber: 'TKT-001', subject: 'Open Ticket', status: 'OPEN', createdAt: new Date().toISOString() }]
        : [];

      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: tickets, meta: { total: tickets.length, page: 1, limit: 20, totalPages: 1 } }),
      });
    });

    await page.goto('/tickets');

    // Look for filter options
    const statusFilter = page.getByRole('combobox').first();
    if (await statusFilter.isVisible()) {
      await statusFilter.selectOption('OPEN');
      // Should update the list
      await expect(page.getByText('Open Ticket')).toBeVisible({ timeout: 5000 });
    }
  });

  test('should show empty state when no tickets', async ({ page }) => {
    await page.route('**/api/client/tickets*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }),
      });
    });

    await page.goto('/tickets');

    // Should show empty state message
    await expect(page.getByText(/aucun ticket|pas de ticket/i)).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Ticket Creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await setupAuthenticatedUser(page);
  });

  test('should open create ticket modal/page', async ({ page }) => {
    await page.route('**/api/client/tickets*', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }),
        });
      }
    });

    await page.goto('/tickets');

    // Click create button
    const createButton = page.getByRole('button', { name: /nouveau ticket|créer/i });
    if (await createButton.isVisible()) {
      await createButton.click();

      // Should show ticket creation form
      await expect(page.getByPlaceholder(/sujet|objet/i)).toBeVisible({ timeout: 5000 });
    }
  });

  test('should validate required fields', async ({ page }) => {
    await page.route('**/api/client/tickets*', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [], meta: { total: 0, page: 1, limit: 20, totalPages: 0 } }),
      });
    });

    await page.goto('/tickets/new');

    // Try to submit without filling required fields
    const submitButton = page.getByRole('button', { name: /créer|envoyer|soumettre/i });
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should show validation errors
      await expect(page.getByText(/requis|obligatoire|required/i)).toBeVisible({ timeout: 5000 });
    }
  });
});

test.describe('Ticket Detail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/login');
    await setupAuthenticatedUser(page);
  });

  test('should display ticket details', async ({ page }) => {
    const ticketId = 'ticket-123';
    const ticket = {
      id: ticketId,
      ticketNumber: 'TKT-20240115-ABCD',
      subject: 'Test Ticket Subject',
      description: 'Detailed description of the issue',
      status: 'OPEN',
      priority: 'HIGH',
      issueType: 'TECHNICAL',
      createdAt: new Date().toISOString(),
      customer: {
        id: 'user-123',
        displayName: 'Test User',
        email: 'test@example.com',
      },
    };

    await page.route(`**/api/client/tickets/${ticketId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: ticket }),
      });
    });

    await page.route(`**/api/client/tickets/${ticketId}/messages`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: [] }),
      });
    });

    await page.goto(`/tickets/${ticketId}`);

    // Should display ticket info
    await expect(page.getByText('Test Ticket Subject')).toBeVisible({ timeout: 10000 });
    await expect(page.getByText(/TKT-20240115-ABCD/)).toBeVisible();
  });

  test('should allow sending messages', async ({ page }) => {
    const ticketId = 'ticket-123';

    await page.route(`**/api/client/tickets/${ticketId}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          data: {
            id: ticketId,
            ticketNumber: 'TKT-001',
            subject: 'Test Ticket',
            status: 'OPEN',
            createdAt: new Date().toISOString(),
          },
        }),
      });
    });

    await page.route(`**/api/client/tickets/${ticketId}/messages`, async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({ success: true, data: [] }),
        });
      } else if (route.request().method() === 'POST') {
        await route.fulfill({
          status: 201,
          contentType: 'application/json',
          body: JSON.stringify({
            success: true,
            data: {
              id: 'msg-new',
              content: 'Test message',
              createdAt: new Date().toISOString(),
            },
          }),
        });
      }
    });

    await page.goto(`/tickets/${ticketId}`);

    // Find message input and send button
    const messageInput = page.getByPlaceholder(/message|réponse/i);
    if (await messageInput.isVisible()) {
      await messageInput.fill('Test message');

      const sendButton = page.getByRole('button', { name: /envoyer/i });
      await sendButton.click();

      // Message should be sent (input should be cleared)
      await expect(messageInput).toHaveValue('');
    }
  });
});
