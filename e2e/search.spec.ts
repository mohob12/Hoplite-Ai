import { expect, test } from '@playwright/test';
import { setLocale } from './helpers';

const names = (page: import('@playwright/test').Page) =>
  page.getByTestId('dish').evaluateAll((els) => els.map((e) => e.getAttribute('data-name')));

test('dish search filters the menu in any language and can be cleared', async ({ page, context }) => {
  await setLocale(context, 'ar');
  await page.goto('/');
  const search = page.getByTestId('menu-search');
  await expect(page.getByTestId('dish').first()).toBeVisible();
  const total = await page.getByTestId('dish').count();

  // Arabic, with spelling folded (تونه ≈ التونة). Dishes awaiting price confirmation are not listed.
  await search.fill('تونه');
  await expect.poll(() => names(page)).toEqual(['Panini au Thon']);
  await expect(page.locator('[data-name="Pizza Thon"]')).toHaveCount(0);
  // Category tabs only list categories that still have results.
  await expect(page.locator('.cat-tab')).toHaveCount(1);
  await expect(page.locator('.cat-tab', { hasText: 'التاكوس' })).toHaveCount(0);
  await search.fill('دجاج');
  await expect.poll(() => names(page)).toEqual(expect.arrayContaining(['Tacos Poulet', 'Sandwich Poulet', 'Soupe de poulet']));
  await expect(page.getByTestId('menu-search-count')).toContainText(String(await page.getByTestId('dish').count()));

  // French name while the page is in Arabic; accents and case ignored; all words must match.
  await search.fill('TACOS poulet');
  await expect.poll(() => names(page)).toEqual(['Tacos Poulet']);
  await search.fill('FUME');
  await expect.poll(() => names(page)).toEqual(['Pizza Poulet Fumé']);

  // A result can still be opened and ordered.
  await search.fill('panini thon');
  await page.locator('[data-testid=dish][data-name="Panini au Thon"] [data-testid=dish-open]').click();
  await expect(page.getByTestId('add-to-cart')).toBeVisible();
  await page.keyboard.press('Escape');

  // No match → message with a clear button that restores the full menu.
  await search.fill('sushi');
  await expect(page.getByTestId('menu-search-empty')).toContainText('sushi');
  await expect(page.getByTestId('dish')).toHaveCount(0);
  await page.getByTestId('menu-search-empty').getByRole('button').click();
  await expect(search).toHaveValue('');
  await expect(page.getByTestId('dish')).toHaveCount(total);

  // Escape clears too.
  await search.fill('pizza');
  await search.press('Escape');
  await expect(page.getByTestId('dish')).toHaveCount(total);
});
