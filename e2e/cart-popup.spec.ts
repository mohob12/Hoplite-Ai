import { expect, test } from '@playwright/test';
import { setLocale } from './helpers';

test('items can be removed from the cart popup until it is empty', async ({ page, context }) => {
  await setLocale(context, 'fr');
  await page.goto('/');
  for (const name of ['Panini', 'Chawarma']) {
    await page.locator(`[data-testid=dish][data-name="${name}"] [data-testid=dish-open]`).click();
    await page.getByTestId('add-to-cart').click();
    if (name === 'Panini') await page.getByTestId('cart-popup-continue').click();
  }
  const popup = page.getByTestId('cart-popup');
  await expect(popup.getByTestId('cart-line')).toHaveCount(2);
  await expect(page.getByTestId('cart-popup-subtotal')).toHaveText('650 DA');
  await popup.getByTestId('cart-line').filter({ hasText: 'Panini' }).getByTestId('line-remove').click();
  await expect(popup.getByTestId('cart-line')).toHaveCount(1);
  await expect(page.getByTestId('cart-popup-subtotal')).toHaveText('350 DA');
  // Decreasing a quantity of 1 removes the line too.
  await popup.getByTestId('line-dec').click();
  await expect(page.getByTestId('cart-popup-empty')).toBeVisible();
  await expect(page.getByTestId('cart-popup-checkout')).toHaveCount(0);
  await page.getByTestId('cart-popup-continue').click();
  await expect(page.getByTestId('cart-count')).toHaveCount(0);
});

test('language menu switches language and direction', async ({ page, context }) => {
  await setLocale(context, 'ar');
  await page.goto('/');
  const btn = page.getByTestId('lang-select');
  await expect(btn).toHaveAttribute('aria-label', /العربية/);
  await btn.click();
  await expect(btn).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByTestId('lang-ar')).toHaveAttribute('aria-selected', 'true');
  await page.getByTestId('lang-en').click();
  await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(btn).toHaveAttribute('aria-expanded', 'false');
  await expect(page.getByRole('heading', { level: 1 })).toContainText('Our menu');

  // Keyboard: open with ArrowDown, move, choose with Enter.
  await btn.focus();
  await page.keyboard.press('ArrowDown');
  await expect(page.getByTestId('lang-en')).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(page.getByTestId('lang-fr')).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('html')).toHaveAttribute('lang', 'fr');

  // Clicking outside closes the menu.
  await btn.click();
  await expect(page.getByRole('listbox')).toBeVisible();
  await page.locator('.site-footer').click({ position: { x: 5, y: 5 } });
  await expect(page.getByRole('listbox')).toHaveCount(0);
});
