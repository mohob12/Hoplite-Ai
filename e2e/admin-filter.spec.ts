import { expect, test } from '@playwright/test';
import { adminLogin, orderCard, placeOrder, quickTakeaway, setLocale, variantId } from './helpers';

test('live orders can be filtered by order type', async ({ page, request, context }) => {
  await setLocale(context, 'fr');
  await context.addInitScript(() => {
    // Start from "all" once; later reloads must keep the saved choice.
    if (!sessionStorage.getItem('filter-reset')) {
      sessionStorage.setItem('filter-reset', '1');
      localStorage.removeItem('mk.dash.typeFilter');
    }
  });
  await adminLogin(page);
  const burger = await variantId(request, 'Burger Classique');
  const dine = await placeOrder(request, {
    order_type: 'dine_in',
    customer_name: 'Filtre Salle',
    table_number: '4',
    items: [{ variant_id: burger, quantity: 1 }],
  });
  const take = await quickTakeaway(request, 'Filtre Emporter');
  const deliv = await placeOrder(request, {
    order_type: 'delivery',
    customer_name: 'Filtre Livraison',
    customer_phone: '0661 99 88 77',
    delivery_address: 'Rue 5, Bt 2, El Mohammadia',
    items: [{ variant_id: burger, quantity: 1 }],
  });
  for (const o of [dine, take, deliv]) await expect(orderCard(page, o.reference)).toBeVisible();

  const cards = page.getByTestId('order-card');
  const check = async (filter: string, type: string, visible: string, hidden: string[]) => {
    await page.getByTestId(`filter-${filter}`).click();
    await expect(page.getByTestId(`filter-${filter}`)).toHaveAttribute('aria-pressed', 'true');
    await expect(orderCard(page, visible)).toBeVisible();
    for (const h of hidden) await expect(orderCard(page, h)).toHaveCount(0);
    for (const card of await cards.all()) await expect(card).toContainText(type);
  };
  await check('dine_in', 'Sur place', dine.reference, [take.reference, deliv.reference]);
  await check('takeaway', 'À emporter', take.reference, [dine.reference, deliv.reference]);
  await check('delivery', 'Livraison', deliv.reference, [dine.reference, take.reference]);

  // The choice survives a reload, and orders of other types still alert and are counted on their button.
  await page.reload();
  await expect(page.getByTestId('filter-delivery')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-state', 'live', { timeout: 20_000 });
  const other = await quickTakeaway(request, 'Filtre Arrivée');
  await expect(page.getByTestId('new-order-alert')).toContainText(other.reference);
  await expect(orderCard(page, other.reference)).toHaveCount(0);
  await expect(page.getByTestId('filter-takeaway').locator('.tf-new')).toBeVisible();

  await page.getByTestId('filter-all').click();
  for (const o of [dine, take, deliv, other]) await expect(orderCard(page, o.reference)).toBeVisible();

  // Oldest first: cards appear in the order the orders were placed.
  const refs = await page.getByTestId('incoming-orders').getByTestId('order-card').evaluateAll((els) =>
    els.map((e) => Number((e.getAttribute('data-reference') ?? '').replace('MK-', ''))),
  );
  expect(refs.length).toBeGreaterThanOrEqual(4);
  expect(refs).toEqual([...refs].sort((a, b) => a - b));
  const pos = (r: string) => refs.indexOf(Number(r.replace('MK-', '')));
  expect(pos(dine.reference)).toBeLessThan(pos(take.reference));
  expect(pos(take.reference)).toBeLessThan(pos(deliv.reference));
  expect(pos(deliv.reference)).toBeLessThan(pos(other.reference));
});
