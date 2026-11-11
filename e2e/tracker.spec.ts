import { expect, test, type Page } from '@playwright/test';
import { ANON_KEY, adminLogin, placeOrder, quickTakeaway, setLocale, variantId } from './helpers';

/** Updates an order with the logged-in admin session (same API the dashboard uses). */
async function adminPatch(admin: Page, reference: string, patch: Record<string, unknown>) {
  const status = await admin.evaluate(
    async ([ref, body, anon]) => {
      const key = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))!;
      const token = JSON.parse(localStorage.getItem(key)!).access_token;
      const res = await fetch(`/sb/rest/v1/orders?reference=eq.${ref}`, {
        method: 'PATCH',
        headers: { apikey: anon, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      return res.status;
    },
    [reference, patch, ANON_KEY] as const,
  );
  expect(status).toBeLessThan(300);
}

const GREEN = 'rgb(31, 157, 85)';

test.beforeEach(async ({ context }) => {
  await setLocale(context, 'fr');
});

test('tracker advances live, glows green and shows the table in a yellow circle', async ({ page, context, request }) => {
  const burger = await variantId(request, 'Burger Classique');
  const order = await placeOrder(request, {
    order_type: 'dine_in',
    customer_name: 'Suivi Salle',
    table_number: '12',
    items: [{ variant_id: burger, quantity: 1 }],
  });
  await page.goto(`/order/${order.reference}?t=${order.access_token}`);

  const steps = page.getByTestId('tracker-step');
  const links = page.getByTestId('tracker-link');
  await expect(steps).toHaveCount(5);
  await expect(steps.nth(0)).toHaveAttribute('data-state', 'current');
  await expect(links.nth(0)).toHaveAttribute('data-state', 'current');
  await expect(links.nth(1)).toHaveAttribute('data-state', 'todo');
  await expect(page.getByTestId('order-status')).toContainText('Reçue');

  const badge = page.getByTestId('table-badge');
  await expect(badge).toHaveText('12');
  await expect(badge).toHaveCSS('background-color', 'rgb(242, 183, 5)');
  await expect(badge).toHaveCSS('border-radius', /999px|50%/);

  const admin = await context.newPage();
  await adminLogin(admin);
  await adminPatch(admin, order.reference, { status: 'confirmed' });
  await adminPatch(admin, order.reference, { status: 'preparing' });

  // No reload: the page refreshes itself.
  await expect(page.locator('[data-testid=tracker-step][data-status=preparing]')).toHaveAttribute('data-state', 'current', {
    timeout: 15_000,
  });
  await expect(steps.nth(0)).toHaveAttribute('data-state', 'done');
  await expect(steps.nth(1)).toHaveAttribute('data-state', 'done');
  await expect(links.nth(0)).toHaveAttribute('data-state', 'done');
  await expect(links.nth(1)).toHaveAttribute('data-state', 'done');
  await expect(links.nth(2)).toHaveAttribute('data-state', 'current');
  await expect(steps.nth(0).locator('.tdot')).toHaveCSS('background-color', GREEN);
  await expect(links.nth(0)).toHaveCSS('background-color', GREEN);
  await expect(page.getByTestId('order-status')).toContainText('En préparation');
  await expect(page.locator('[data-testid=tracker-step][data-status=preparing]')).toContainText('depuis');

  await adminPatch(admin, order.reference, { status: 'ready' });
  await adminPatch(admin, order.reference, { status: 'completed' });
  await page.reload();
  for (let i = 0; i < 5; i++) await expect(steps.nth(i)).toHaveAttribute('data-state', 'done');
  await expect(page.getByTestId('order-status')).toContainText('Bon appétit');
});

test('vertical on mobile, horizontal on desktop; delivery has six steps', async ({ page, request }) => {
  const burger = await variantId(request, 'Burger Classique');
  const order = await placeOrder(request, {
    order_type: 'delivery',
    customer_name: 'Suivi Livraison',
    customer_phone: '0661 10 20 30',
    delivery_address: 'Rue 9, Bt 1, El Mohammadia',
    items: [{ variant_id: burger, quantity: 1 }],
  });
  await page.setViewportSize({ width: 393, height: 851 });
  await page.goto(`/order/${order.reference}?t=${order.access_token}`);
  const tracker = page.getByTestId('order-tracker');
  await expect(page.getByTestId('tracker-step')).toHaveCount(6);
  await expect(tracker).toHaveCSS('flex-direction', 'column');
  await expect(page.getByTestId('order-status')).toContainText('frais de livraison');
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
  expect(overflow).toBeLessThanOrEqual(1);

  await page.setViewportSize({ width: 1280, height: 900 });
  await expect(tracker).toHaveCSS('flex-direction', 'row');
});

test('rejected order shows a clear red state instead of the tracker', async ({ page, context, request }) => {
  const order = await quickTakeaway(request, 'Suivi Refus');
  const admin = await context.newPage();
  await adminLogin(admin);
  await adminPatch(admin, order.reference, { status: 'rejected' });
  await page.goto(`/order/${order.reference}?t=${order.access_token}`);
  await expect(page.getByTestId('order-tracker')).toHaveCount(0);
  await expect(page.getByTestId('order-status')).toContainText('Refusée');
});
