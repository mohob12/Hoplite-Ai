import { expect, test } from '@playwright/test';
import { adminLogin, setLocale } from './helpers';

test('social links are managed in settings and shown in the footer', async ({ page, context }) => {
  await setLocale(context, 'fr');
  await adminLogin(page);
  await page.goto('/admin/settings');
  const form = page.locator('form', { hasText: 'Informations du restaurant' });
  const save = async () => {
    await form.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(form.getByRole('status')).toBeVisible();
  };

  try {
    // Invalid link is refused before saving.
    await form.getByTestId('set-facebook').fill('javascript:alert(1)');
    await form.getByRole('button', { name: 'Enregistrer' }).click();
    await expect(form.getByRole('status')).toContainText('Lien invalide pour Facebook');

    // Bare domains get https:// added.
    await form.getByTestId('set-facebook').fill('facebook.com/mackiffan');
    await form.getByTestId('set-instagram').fill('https://www.instagram.com/mackiffan/');
    await form.getByTestId('set-tiktok').fill('');
    await save();
    await expect(form.getByTestId('set-facebook')).toHaveValue('https://facebook.com/mackiffan');

    const shop = await context.newPage();
    await shop.goto('/');
    const footer = shop.getByTestId('site-footer');
    await expect(footer.getByTestId('social-facebook')).toHaveAttribute('href', 'https://facebook.com/mackiffan');
    await expect(footer.getByTestId('social-instagram')).toHaveAttribute('href', 'https://www.instagram.com/mackiffan/');
    await expect(footer.getByTestId('social-instagram')).toHaveAttribute('target', '_blank');
    await expect(footer.getByTestId('social-tiktok')).toHaveCount(0);
    await shop.close();
  } finally {
    for (const k of ['facebook', 'instagram', 'tiktok']) await form.getByTestId(`set-${k}`).fill('');
    await save();
  }

  const shop = await context.newPage();
  await shop.goto('/');
  await expect(shop.getByTestId('site-footer')).toBeVisible();
  await expect(shop.getByTestId('social-links')).toHaveCount(0);
  await shop.close();
});

test('banner shows open/closed status from the configured hours, in the page language', async ({ browser }) => {
  // Default hours: 11:00 → midnight, Algiers time (UTC+1).
  const at = async (iso: string, locale: 'fr' | 'ar' | 'en') => {
    const ctx = await browser.newContext();
    await setLocale(ctx, locale);
    const p = await ctx.newPage();
    await p.clock.setFixedTime(new Date(iso));
    await p.goto('/');
    const s = p.getByTestId('open-status');
    await expect(s).toBeVisible();
    const result = { open: await s.getAttribute('data-open'), text: (await s.innerText()).replace(/\s+/g, ' ').trim() };
    await ctx.close();
    return result;
  };

  expect(await at('2026-11-11T21:00:00Z', 'fr')).toEqual({ open: 'true', text: 'Ouvert maintenant · ferme à minuit' });
  expect(await at('2026-11-11T21:00:00Z', 'ar')).toEqual({ open: 'true', text: 'مفتوح الآن · يغلق عند منتصف الليل' });
  expect(await at('2026-11-11T23:30:00Z', 'fr')).toEqual({ open: 'false', text: 'Fermé · ouvre à 11h00' });
  expect(await at('2026-11-11T23:30:00Z', 'en')).toEqual({ open: 'false', text: 'Closed now · opens at 11:00' });
  expect(await at('2026-11-12T09:59:00Z', 'ar')).toEqual({ open: 'false', text: 'مغلق الآن · يفتح عند الساعة 11:00' });
  expect((await at('2026-11-12T10:00:00Z', 'en')).open).toBe('true');
});
