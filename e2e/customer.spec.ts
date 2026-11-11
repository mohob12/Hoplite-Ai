import { expect, test } from '@playwright/test';
import { setLocale } from './helpers';

// Prices from supabase/seed.sql (demo data).
test.describe('customer ordering', () => {
  test.beforeEach(async ({ context }) => {
    await setLocale(context, 'fr');
  });

  test('variants, extras, multi-product cart and dine-in order', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    // Pending-verification products are never shown to customers.
    await expect(page.locator('[data-testid=dish][data-name="Salade de thon"]')).toHaveCount(0);
    await expect(page.locator('[data-testid=dish][data-name="Gratin de crevettes"]')).toHaveCount(0);

    // Clicking the dish image opens the options window.
    await page.locator('[data-testid=dish][data-name="Pizza Margherita"] [data-testid=dish-open]').click();
    const modal = page.getByTestId('product-modal');
    await expect(modal).toBeVisible();
    const add = page.getByTestId('add-to-cart');
    await expect(add).toBeDisabled(); // must choose a variant first

    await modal.getByTestId('variant-option').filter({ hasText: 'Moyenne' }).click();
    await expect(page.getByTestId('modal-total')).toHaveText('600 DA');
    await modal.getByTestId('variant-option').filter({ hasText: 'Grande' }).click();
    await expect(page.getByTestId('modal-total')).toHaveText('900 DA');
    await modal.getByTestId('extra-option').filter({ hasText: 'Champignons' }).click();
    await expect(page.getByTestId('modal-total')).toHaveText('980 DA');
    await modal.getByRole('button', { name: '+' }).click();
    await expect(page.getByTestId('modal-total')).toHaveText(/1\s?960 DA/);
    await add.click();
    await expect(modal).toBeHidden();

    // Single-variant product: no choice needed.
    await page.locator('[data-testid=dish][data-name="Cheese Burger"] [data-testid=dish-open]').click();
    await expect(page.getByTestId('variant-option')).toHaveCount(0);
    await expect(page.getByTestId('modal-total')).toHaveText('450 DA');
    await page.getByTestId('add-to-cart').click();

    // Third product with variant.
    await page.locator('[data-testid=dish][data-name="Tacos"] [data-testid=dish-open]').click();
    await page.getByTestId('variant-option').filter({ hasText: 'Double' }).click();
    await page.getByTestId('add-to-cart').click();

    await expect(page.getByTestId('cart-count')).toHaveText('4');
    await page.getByTestId('open-cart').click();
    const drawer = page.getByTestId('cart-drawer');
    await expect(drawer.getByTestId('cart-line')).toHaveCount(3);
    // 2×980 + 450 + 700 = 3110
    await expect(page.getByTestId('cart-subtotal')).toHaveText(/3\s?110 DA/);

    // Order-type buttons toggle and swap their fields.
    const dine = page.getByTestId('type-dine_in');
    const take = page.getByTestId('type-takeaway');
    const deliv = page.getByTestId('type-delivery');
    await expect(take).toHaveText(/À emporter/);
    await take.click();
    await expect(take).toHaveAttribute('aria-pressed', 'true');
    await expect(dine).toHaveAttribute('aria-pressed', 'false');
    await expect(page.getByTestId('f-phone')).toBeVisible();
    await expect(page.getByTestId('f-table')).toHaveCount(0);
    await expect(page.getByTestId('f-address')).toHaveCount(0);
    await expect(take).toHaveCSS('background-color', 'rgb(215, 38, 30)');

    await deliv.click();
    await expect(page.getByTestId('f-address')).toBeVisible();
    await expect(page.getByTestId('fee-pending')).toBeVisible();
    await expect(page.getByTestId('payment-label')).toContainText('Paiement en espèces à la livraison');

    await dine.click();
    await expect(dine).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByTestId('f-table')).toBeVisible();
    await expect(page.getByTestId('f-name')).toBeVisible();
    await expect(page.getByTestId('f-notes')).toBeVisible();
    await expect(page.getByTestId('f-phone')).toHaveCount(0);
    await expect(page.getByTestId('payment-label')).toContainText('Paiement en espèces au restaurant');

    // Validation blocks submission.
    await page.getByTestId('submit-order').click();
    await expect(drawer.locator('.field-error').first()).toBeVisible();

    await page.getByTestId('f-table').fill('7');
    await page.getByTestId('f-name').fill('Karim');
    await page.getByTestId('f-notes').fill('Sans oignons');
    await page.getByTestId('submit-order').click();

    await expect(page).toHaveURL(/\/order\/MK-\d+\?t=/);
    await expect(page.getByTestId('order-reference')).toHaveText(/^MK-\d+$/);
    await expect(page.getByTestId('order-type')).toHaveText('Sur place');
    await expect(page.getByTestId('order-payment')).toContainText('Paiement en espèces');
    await expect(page.getByTestId('confirmation-item')).toHaveCount(3);
    await expect(page.getByTestId('conf-subtotal')).toHaveText(/3\s?110 DA/);
    await expect(page.getByTestId('conf-total')).toHaveText(/3\s?110 DA/);
    await expect(page.getByTestId('cart-count')).toHaveCount(0);
  });

  test('delivery order keeps the fee pending', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid=dish][data-name="Burger Classique"] [data-testid=dish-open]').click();
    await page.getByTestId('add-to-cart').click();
    await page.getByTestId('open-cart').click();
    await page.getByTestId('type-delivery').click();
    await page.getByTestId('f-name').fill('Nadia');
    await page.getByTestId('f-phone').fill('0661 22 33 44');
    await page.getByTestId('f-address').fill('Cité 200 logements, Bt 3, Bab Ezzouar');
    await page.getByTestId('submit-order').click();

    await expect(page.getByTestId('order-type')).toHaveText('Livraison');
    await expect(page.getByTestId('conf-fee')).toHaveText('En attente de confirmation');
    await expect(page.getByTestId('conf-subtotal')).toHaveText('400 DA');
    await expect(page.getByText('Total estimé (hors livraison)')).toBeVisible();
    await expect(page.getByTestId('order-payment')).toContainText('Paiement en espèces à la livraison');
  });

  test('no false success when the database submission fails', async ({ page }) => {
    await page.goto('/');
    await page.locator('[data-testid=dish][data-name="Panini"] [data-testid=dish-open]').click();
    await page.getByTestId('add-to-cart').click();
    await page.getByTestId('open-cart').click();
    await page.getByTestId('type-takeaway').click();
    await page.getByTestId('f-name').fill('Sofiane');
    await page.getByTestId('f-phone').fill('0770 00 00 01');

    await page.route('**/rest/v1/rpc/place_order', (route) => route.abort('failed'));
    await page.getByTestId('submit-order').click();
    await expect(page.getByTestId('submit-error')).toBeVisible();
    await expect(page).toHaveURL(/\/$/);
    await expect(page.getByTestId('cart-line')).toHaveCount(1); // cart preserved
  });
});

test.describe('languages & direction', () => {
  for (const [locale, dir, takeaway, dine] of [
    ['ar', 'rtl', 'خارجي', 'في المطعم'],
    ['fr', 'ltr', 'À emporter', 'Sur place'],
    ['en', 'ltr', 'Takeaway', 'Dine in'],
  ] as const) {
    test(`${locale} renders ${dir}`, async ({ page, context }) => {
      await setLocale(context, locale);
      await page.goto('/');
      await expect(page.locator('html')).toHaveAttribute('dir', dir);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await page.locator('[data-testid=dish][data-name="Panini"] [data-testid=dish-open]').click();
      await page.getByTestId('add-to-cart').click();
      await page.getByTestId('open-cart').click();
      await expect(page.getByTestId('type-takeaway')).toContainText(takeaway);
      await expect(page.getByTestId('type-dine_in')).toContainText(dine);
      // Layout must not overflow horizontally in either direction.
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(1);
    });
  }
});
