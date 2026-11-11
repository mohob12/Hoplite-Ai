import { expect, test } from '@playwright/test';
import { adminLogin, setLocale } from './helpers';

test.beforeEach(async ({ context }) => {
  await setLocale(context, 'fr');
});

test('reviews and job applications: public submission and admin moderation', async ({ page, context }) => {
  const stamp = Date.now().toString().slice(-6);
  const shop = await context.newPage();

  await shop.goto('/reviews');
  await shop.getByLabel('Nom').fill(`Avis ${stamp}`);
  await shop.getByLabel('Votre commentaire').fill('Très bon service');
  await shop.getByRole('button', { name: 'Envoyer' }).click();
  await expect(shop.getByText('Merci ! Votre avis sera publié')).toBeVisible();

  await shop.goto('/careers');
  await shop.getByLabel('Nom complet').fill(`Candidat ${stamp}`);
  await shop.getByLabel('Téléphone').fill('0555 44 55 66');
  await shop.getByLabel('Poste souhaité').fill('Livreur');
  await shop.getByRole('button', { name: 'Envoyer la candidature' }).click();
  await expect(shop.getByText('Candidature reçue')).toBeVisible();

  await adminLogin(page);
  await page.goto('/admin/reviews');
  const review = page.locator('article', { hasText: `Avis ${stamp}` });
  await review.getByRole('button', { name: 'Approuver' }).click();
  await expect(review.getByRole('button', { name: 'Retirer' })).toBeVisible();
  await shop.goto('/reviews');
  await expect(shop.getByText(`Avis ${stamp}`)).toBeVisible(); // now public

  await page.goto('/admin/applications');
  const app = page.locator('article', { hasText: `Candidat ${stamp}` });
  await expect(app).toContainText('Livreur');
  await app.locator('select').selectOption('reviewed');
  await expect(app).toContainText('Examinée');
});

test('restaurant settings: disabling delivery reaches the storefront', async ({ page, context }) => {
  await adminLogin(page);
  await page.goto('/admin/settings');
  const form = page.locator('form', { hasText: 'Informations du restaurant' });
  const delivery = form.locator('.switch input').nth(1);
  await expect(delivery).toBeChecked();

  try {
    await delivery.uncheck();
    await form.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(form.getByRole('status')).toBeVisible();

    const shop = await context.newPage();
    await shop.goto('/');
    await shop.locator('[data-testid=dish][data-name="Panini"] [data-testid=dish-open]').click();
    await shop.getByTestId('add-to-cart').click();
    await shop.getByTestId('open-cart').click();
    await expect(shop.getByTestId('type-delivery')).toBeDisabled();
    await shop.close();
  } finally {
    await delivery.check();
    await form.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(form.getByRole('status')).toBeVisible();
  }
});

test('product photo can be added by URL and removed', async ({ page }) => {
  await adminLogin(page);
  await page.goto('/admin/menu');
  await page.locator('.am-prod-row', { hasText: 'Panini' }).click();
  const dialog = page.locator('.modal');
  const thumbs = dialog.locator('img');
  const before = await thumbs.count();
  await dialog.getByPlaceholder('https://…').fill('/images/demo/burger.jpg');
  await dialog.getByRole('button', { name: 'Ajouter par lien' }).click();
  await expect(thumbs).toHaveCount(before + 1);
  page.once('dialog', (d) => d.accept());
  await dialog.getByRole('button', { name: 'Supprimer' }).last().click();
  await expect(thumbs).toHaveCount(before);
});
