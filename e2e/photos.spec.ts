import { expect, test } from '@playwright/test';
import { setLocale } from './helpers';

test('every dish shows a photo and the credits page lists the licensed ones', async ({ page, context }) => {
  await setLocale(context, 'fr');
  await page.goto('/');
  const dishes = page.getByTestId('dish');
  await expect(dishes.first()).toBeVisible();
  await expect(page.locator('[data-testid=dish] .img-ph')).toHaveCount(0);
  const count = await dishes.count();
  expect(await page.locator('[data-testid=dish] .dish-img img').count()).toBe(count);

  // No broken images on the menu.
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await expect
    .poll(() =>
      page.evaluate(() =>
        [...document.querySelectorAll<HTMLImageElement>('.dish-img img')].filter((i) => i.complete && i.naturalWidth === 0).length,
      ),
    )
    .toBe(0);

  await page.getByTestId('credits-link').click();
  await expect(page).toHaveURL(/\/credits$/);
  await expect(page.getByTestId('credits-list').locator('li')).toHaveCount(45);
  await expect(page.getByTestId('credits-list')).toContainText('CC BY');
});
