import { expect, test, type Page } from '@playwright/test';
import { ANON_KEY, adminLogin, setLocale } from './helpers';

/** Restores the seed state of a product's variants (pending, unnamed) via the admin session. */
async function resetToPending(page: Page, productFr: string) {
  await page.evaluate(
    async ([name, anon]) => {
      const key = Object.keys(localStorage).find((k) => k.startsWith('sb-') && k.endsWith('-auth-token'))!;
      const token = JSON.parse(localStorage.getItem(key)!).access_token;
      const h = { apikey: anon, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
      const res = await fetch(`/sb/rest/v1/products?select=id&name_fr=eq.${encodeURIComponent(name)}`, { headers: h });
      const [p] = await res.json();
      await fetch(`/sb/rest/v1/product_variants?product_id=eq.${p.id}`, {
        method: 'PATCH',
        headers: h,
        body: JSON.stringify({ verification: 'pending', name_ar: '', name_fr: '', name_en: '' }),
      });
    },
    [productFr, ANON_KEY] as const,
  );
}

test('admin verifies split prices before customers can order them', async ({ page, context }) => {
  await setLocale(context, 'fr');
  await adminLogin(page);
  await page.goto('/admin/menu');
  await expect(page.getByText('Prix en attente de vérification')).toBeVisible();

  try {
    await page.locator('.am-pending-item', { hasText: 'Salade de thon' }).click();
    const dialog = page.locator('.modal');
    const cards = dialog.locator('.am-card');
    await expect(cards).toHaveCount(2);

    // Verification without names is refused.
    await cards.nth(0).getByRole('button', { name: 'Modifier' }).click();
    await dialog.getByRole('button', { name: 'Valider et enregistrer' }).click();
    await expect(dialog.getByText('Impossible de valider ce prix')).toBeVisible();

    await dialog.getByRole('button', { name: 'Petit', exact: true }).click();
    await dialog.getByRole('button', { name: 'Valider et enregistrer' }).click();
    await expect(cards.nth(0)).toContainText('Vérifié');

    await cards.nth(1).getByRole('button', { name: 'Modifier' }).click();
    await dialog.getByRole('button', { name: 'Grand', exact: true }).click();
    await dialog.getByRole('button', { name: 'Valider et enregistrer' }).click();
    await expect(cards.nth(1)).toContainText('Vérifié');

    // Customers now see the product with named variants and their own prices.
    const shop = await context.newPage();
    await shop.goto('/');
    await shop.locator('[data-testid=dish][data-name="Salade de thon"] [data-testid=dish-open]').click();
    await shop.getByTestId('variant-option').filter({ hasText: 'Petit' }).click();
    await expect(shop.getByTestId('modal-total')).toHaveText('350 DA');
    await shop.getByTestId('variant-option').filter({ hasText: 'Grand' }).click();
    await expect(shop.getByTestId('modal-total')).toHaveText('400 DA');
    await shop.close();
  } finally {
    await resetToPending(page, 'Salade de thon');
  }
});
