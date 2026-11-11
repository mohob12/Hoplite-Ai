import { expect, type APIRequestContext, type BrowserContext, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';

function env(name: string): string {
  if (process.env[name]) return process.env[name]!;
  try {
    const line = readFileSync('.env.local', 'utf8')
      .split('\n')
      .find((l) => l.startsWith(`${name}=`));
    return line ? line.slice(name.length + 1).trim() : '';
  } catch {
    return '';
  }
}

export const ANON_KEY = env('VITE_SUPABASE_ANON_KEY');
export const ADMIN_EMAIL = process.env.E2E_ADMIN_EMAIL ?? 'admin@mackiffan.local';
export const ADMIN_PASSWORD = process.env.E2E_ADMIN_PASSWORD ?? 'Kiffan-2026!';

const headers = { apikey: ANON_KEY, Authorization: `Bearer ${ANON_KEY}`, 'Content-Type': 'application/json' };

export async function variantId(request: APIRequestContext, productFr: string, variantFr?: string): Promise<string> {
  const res = await request.get(
    `/sb/rest/v1/products?select=name_fr,product_variants(id,name_fr,verification)&name_fr=eq.${encodeURIComponent(productFr)}`,
    { headers },
  );
  const [p] = await res.json();
  const v = p.product_variants.find((x: { name_fr: string }) => !variantFr || x.name_fr === variantFr);
  return v.id;
}

/** Places an order the same way the website does (anon RPC). */
export async function placeOrder(
  request: APIRequestContext,
  payload: Record<string, unknown>,
): Promise<{ reference: string; access_token: string }> {
  const res = await request.post('/sb/rest/v1/rpc/place_order', { headers, data: { payload } });
  expect(res.ok(), await res.text()).toBeTruthy();
  return res.json();
}

export async function quickTakeaway(request: APIRequestContext, name = 'Client Test') {
  const burger = await variantId(request, 'Burger Classique');
  return placeOrder(request, {
    order_type: 'takeaway',
    customer_name: name,
    customer_phone: '0555 11 22 33',
    items: [{ variant_id: burger, quantity: 1 }],
  });
}

export async function adminLogin(page: Page) {
  await page.goto('/admin/login');
  await page.locator('input[name=email]').fill(ADMIN_EMAIL);
  await page.locator('input[name=password]').fill(ADMIN_PASSWORD);
  await page.locator('form button.btn-primary').click();
  await expect(page.getByTestId('connection-status')).toHaveAttribute('data-state', 'live', { timeout: 20_000 });
}

export async function activateNotifications(page: Page) {
  await page.bringToFront();
  // One trusted click; the banner may unmount on pointerdown (re-unlock), so don't retry.
  const box = await page.getByTestId('activate-notifications').boundingBox();
  if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.getByTestId('notification-status')).toHaveAttribute('data-active', 'true');
}

export const chimes = (page: Page) => page.evaluate(() => (window as unknown as { __mkChimes?: number }).__mkChimes ?? 0);

export async function setLocale(context: BrowserContext, locale: 'ar' | 'fr' | 'en') {
  await context.addInitScript((l) => localStorage.setItem('mk.locale', l), locale);
}

export function orderCard(page: Page, reference: string) {
  return page.locator(`[data-testid=order-card][data-reference="${reference}"]`).first();
}
