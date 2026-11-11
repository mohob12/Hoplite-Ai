import { expect, test } from '@playwright/test';
import { ANON_KEY, activateNotifications, adminLogin, chimes, orderCard, placeOrder, quickTakeaway, setLocale, variantId } from './helpers';

test.describe('admin dashboard — realtime orders', () => {
  test.beforeEach(async ({ context }) => {
    await setLocale(context, 'fr');
  });

  test('new order appears live with sound, counter and highlight; no duplicates across tabs', async ({ context, page, request }) => {
    await adminLogin(page);
    await expect(page.getByTestId('activate-banner')).toBeVisible();
    await activateNotifications(page);
    await expect(page.getByTestId('notification-status')).toHaveAttribute('data-leader', 'true');

    // Second dashboard tab in the same browser.
    const tab2 = await context.newPage();
    await tab2.goto('/admin');
    await expect(tab2.getByTestId('connection-status')).toHaveAttribute('data-state', 'live', { timeout: 20_000 });
    await activateNotifications(tab2);
    await expect(tab2.getByTestId('notification-status')).toHaveAttribute('data-leader', 'false');

    const before = Number(await page.getByTestId('stat-new').locator('.value').innerText());
    const c1 = await chimes(page);
    const c2 = await chimes(tab2);

    const { reference } = await quickTakeaway(request, 'Realtime Client');

    // No reload: the card must arrive through realtime.
    const card = orderCard(page, reference);
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card).toHaveClass(/fresh/);
    await expect(card).toContainText('Realtime Client');
    await expect(card).toContainText('Classic Burger');
    await expect(card).toContainText('Paiement en espèces');
    await expect(page.getByTestId('new-order-alert')).toContainText(reference);
    await expect(page.getByTestId('new-order-alert')).toContainText('À emporter');
    await expect(page.getByTestId('stat-new').locator('.value')).toHaveText(String(before + 1));
    await expect(orderCard(tab2, reference)).toBeVisible();

    await expect.poll(async () => (await chimes(page)) - c1).toBe(1);
    await page.waitForTimeout(2500); // allow any duplicate chime to surface
    expect((await chimes(page)) - c1).toBe(1);
    expect((await chimes(tab2)) - c2).toBe(0);
    await expect(page.locator(`[data-testid=order-card][data-reference="${reference}"]`)).toHaveCount(1);

    // Two quick orders → one chime each, queued (never overlapping).
    const a = await quickTakeaway(request, 'Burst A');
    const b = await quickTakeaway(request, 'Burst B');
    await expect(orderCard(page, a.reference)).toBeVisible();
    await expect(orderCard(page, b.reference)).toBeVisible();
    await expect.poll(async () => (await chimes(page)) - c1, { timeout: 15_000 }).toBe(3);
    expect((await chimes(tab2)) - c2).toBe(0);
    await tab2.close();
  });

  test('accept / advance / reject, delivery fee and receipt', async ({ page, request, context }) => {
    await adminLogin(page);
    const burger = await variantId(request, 'Classic Burger');
    const order = await placeOrder(request, {
      order_type: 'delivery',
      customer_name: 'Livraison Test',
      customer_phone: '0661 00 11 22',
      delivery_address: 'Rue des Frères, n° 12, El Mohammadia',
      notes: 'Sonner deux fois',
      items: [{ variant_id: burger, quantity: 2 }],
    });
    const card = orderCard(page, order.reference);
    await expect(card).toBeVisible({ timeout: 10_000 });
    await expect(card).toContainText('En attente de confirmation');
    await expect(card).toContainText('Sonner deux fois');
    await expect(card.getByTestId('accept-order')).toBeDisabled();

    await card.getByTestId('fee-input').fill('250');
    await card.getByTestId('fee-confirm').click();
    await expect(card.getByTestId('order-total')).toHaveText(/^850 DA$/);
    await expect(card.getByTestId('accept-order')).toBeEnabled();
    await card.getByTestId('accept-order').click();

    const active = orderCard(page, order.reference);
    await expect(active).toHaveAttribute('data-status', 'confirmed');
    for (const next of ['preparing', 'ready', 'out_for_delivery', 'completed']) {
      await active.getByTestId('advance-order').click();
      if (next !== 'completed') await expect(active).toHaveAttribute('data-status', next);
    }
    await expect(orderCard(page, order.reference)).toHaveCount(0); // completed leaves the live board

    // Customer sees the confirmed fee and final total.
    const customer = await context.newPage();
    await customer.goto(`/order/${order.reference}?t=${order.access_token}`);
    await expect(customer.getByTestId('conf-fee')).toHaveText('250 DA');
    await expect(customer.getByTestId('conf-total')).toHaveText(/^850 DA$/);
    await expect(customer.getByTestId('order-status')).toContainText('Terminée');
    await customer.close();

    // Reject flow.
    const toReject = await quickTakeaway(request, 'A refuser');
    const rcard = orderCard(page, toReject.reference);
    await expect(rcard).toBeVisible({ timeout: 10_000 });
    page.once('dialog', (d) => d.accept());
    await rcard.getByTestId('reject-order').click();
    await expect(orderCard(page, toReject.reference)).toHaveCount(0);

    // History: search + status filter.
    await page.goto('/admin/orders');
    await page.getByTestId('history-search').fill(toReject.reference);
    await expect(page.getByTestId('history-table')).toContainText(toReject.reference);
    await expect(page.getByTestId('history-table')).toContainText('Refusée');
    await page.getByTestId('history-search').fill('');
    await page.getByTestId('history-status').selectOption('completed');
    await expect(page.getByTestId('history-table')).toContainText(order.reference);

    // Receipt.
    const [receipt] = await Promise.all([
      context.waitForEvent('page'),
      page.evaluate((id) => window.open(`/admin/orders/${id}/print`, '_blank'), await orderIdFor(page, order.reference)),
    ]);
    await receipt.addInitScript(() => (window.print = () => {}));
    await expect(receipt.getByTestId('receipt')).toContainText(order.reference);
    await expect(receipt.getByTestId('receipt')).toContainText('Livraison Test');
    await expect(receipt.getByTestId('receipt')).toContainText('Paiement en espèces à la livraison');
  });

  test('recovers when the realtime connection drops', async ({ page, request }) => {
    await adminLogin(page);

    // 1) Browser offline → orders placed meanwhile appear once back online.
    await page.context().setOffline(true);
    await expect(page.getByTestId('connection-status')).toHaveAttribute('data-state', /offline|polling/, { timeout: 20_000 });
    const missed = await quickTakeaway(request, 'Pendant coupure');
    await page.waitForTimeout(1500);
    await expect(orderCard(page, missed.reference)).toHaveCount(0);
    await page.context().setOffline(false);
    await expect(orderCard(page, missed.reference)).toBeVisible({ timeout: 30_000 });
    await expect(page.getByTestId('connection-status')).toHaveAttribute('data-state', 'live', { timeout: 40_000 });

    // 2) Realtime socket refused → polling fallback still delivers orders.
    await page.routeWebSocket(/realtime/, (ws) => ws.close());
    await page.reload();
    await expect(page.getByTestId('connection-status')).toHaveAttribute('data-state', 'polling', { timeout: 30_000 });
    const polled = await quickTakeaway(request, 'Via polling');
    await expect(orderCard(page, polled.reference)).toBeVisible({ timeout: 20_000 });
  });
});

async function orderIdFor(page: import('@playwright/test').Page, reference: string): Promise<string> {
  return page.evaluate(async ([ref, anon]) => {
    const keyName = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))!;
    const session = JSON.parse(localStorage.getItem(keyName)!);

    const res = await fetch(`/sb/rest/v1/orders?select=id&reference=eq.${ref}`, {
      headers: { apikey: anon, Authorization: `Bearer ${session.access_token}` },
    });
    const [row] = await res.json();
    return row.id as string;
  }, [reference, ANON_KEY] as const);
}
