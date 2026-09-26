import { test as base, expect, type Page } from '@playwright/test';

// All outside services are faked, so tests run offline and give the same result every time.
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
const EMPTY_STYLE = { version: 8, sources: {}, layers: [{ id: 'bg', type: 'background', paint: { 'background-color': '#EEF0EA' } }] };

export const HOUSES = Array.from({ length: 6 }, (_, i) => ({
  type: 'node', id: i + 1,
  // tight cluster round the canvasser so every pin is on screen, even on a phone
  lat: 51.7208 + (i % 2 ? -0.00018 : 0.00022),
  lon: 0.4651 + Math.floor(i / 2) * 0.00028,
  tags: { 'addr:housenumber': String(i + 1), 'addr:street': 'Lime Walk', 'addr:postcode': 'CM2 9NQ', 'addr:city': 'Chelmsford' },
}));

export async function fakeServices(page: Page) {
  await page.route('**/server.arcgisonline.com/**', (r) => r.fulfill({ contentType: 'image/png', body: PNG }));
  await page.route('**/tiles.openfreemap.org/**', (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify(EMPTY_STYLE) }));
  await page.route('**/fonts.googleapis.com/**', (r) => r.fulfill({ contentType: 'text/css', body: '' }));
  await page.route('**/fonts.gstatic.com/**', (r) => r.abort());
  await page.route(/overpass/, (r) => r.fulfill({ contentType: 'application/json', body: JSON.stringify({ elements: HOUSES }) }));
  await page.route('**/nominatim.openstreetmap.org/**', (r) =>
    r.fulfill({ contentType: 'application/json', body: JSON.stringify({ address: { house_number: '42', road: 'Lime Walk', postcode: 'CM2 9NQ', town: 'Chelmsford' } }) }));
}

export const test = base.extend<{ errors: string[] }>({
  errors: async ({ page }, use) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error' && !/ERR_FAILED|net::|AJAXError/.test(m.text())) errors.push(m.text()); });
    await fakeServices(page);
    await page.goto('/');
    await page.waitForSelector('.door-pin');
    await use(errors);
    expect(errors, 'no errors in the browser console').toEqual([]);
  },
});
export { expect };

export const pin = (page: Page, n: string) => page.locator(`.door-pin[aria-label^="${n} Lime Walk"]`);
export const count = (page: Page, label: string) => page.locator(`[title="${label}"] span.font-display`);

export async function fillSignup(page: Page, opts: { yyyy?: string } = {}) {
  await page.getByRole('button', { name: 'Mrs', exact: true }).click();
  await page.fill('#first', 'Sarah');
  await page.fill('#last', 'Collins');
  await page.fill('#dd', '14');
  await page.fill('#mm', '03');
  await page.fill('#yyyy', opts.yyyy ?? '1981');
  await page.fill('#mobile', '+44 7700 900412');
  await page.fill('#sort', '204577');
  await page.fill('#account', '43718265');
  for (const id of ['holder', 'lotteryRules', 'terms', 'privacy']) await page.click(`#${id}`);
  const pad = page.locator('canvas.sig');
  await pad.scrollIntoViewIfNeeded();
  const b = (await pad.boundingBox())!;
  await page.mouse.move(b.x + 40, b.y + 120);
  await page.mouse.down();
  await page.mouse.move(b.x + 220, b.y + 70, { steps: 10 });
  await page.mouse.up();
}
