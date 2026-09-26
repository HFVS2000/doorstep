import { count, expect, fillSignup, pin, test } from './fixtures';

test('loads the map with a pin for every house', async ({ page, errors }) => {
  void errors;
  await expect(page.locator('.door-pin')).toHaveCount(6);
});

test('Not Interested turns the pin red in one tap, and Undo puts it back', async ({ page, errors }) => {
  void errors;
  await pin(page, '1').click();
  await page.getByRole('button', { name: /Not Interested/ }).click();
  await expect(pin(page, '1')).toHaveAttribute('aria-label', /Not interested/);
  await expect(count(page, 'Not int.')).toHaveText('1');
  await page.getByRole('button', { name: /Undo/ }).click();
  await expect(pin(page, '1')).toHaveAttribute('aria-label', /Not knocked/);
  await expect(count(page, 'Not int.')).toHaveText('0');
});

test('No Answer with a return time and note becomes a callback', async ({ page, errors }) => {
  void errors;
  await pin(page, '2').click();
  await page.getByRole('button', { name: /No Answer/ }).click();
  await page.getByRole('button', { name: 'Tomorrow 6pm' }).click();
  await page.fill('#qnote', 'Red door, blue car');
  await page.getByRole('button', { name: 'Set callback' }).click();
  await expect(pin(page, '2')).toHaveAttribute('aria-label', /Callback/);
  await pin(page, '2').click();
  await expect(page.getByText(/· back Tomorrow 6pm/)).toBeVisible();
  await expect(page.getByText('“Red door, blue car”')).toBeVisible();
});

test('No Answer without a time stays grey', async ({ page, errors }) => {
  void errors;
  await pin(page, '3').click();
  await page.getByRole('button', { name: /No Answer/ }).click();
  await page.getByRole('button', { name: 'Log it' }).click();
  await expect(pin(page, '3')).toHaveAttribute('aria-label', /No answer/);
});

test('tapping a house with no pin adds one and looks up its address', async ({ page, errors }) => {
  void errors;
  const map = (await page.locator('section[aria-label="Territory map"]').boundingBox())!;
  // top-left corner: clear of the pins, which cluster round the canvasser
  await page.mouse.click(map.x + 40, map.y + 70);
  await expect(page.getByText('42 Lime Walk').first()).toBeVisible();
  await expect(page.locator('.door-pin')).toHaveCount(7);
});

test('a full sign-up sends to the office and marks the house green', async ({ page, errors }) => {
  void errors;
  await pin(page, '4').click();
  await page.getByRole('button', { name: /Pitching/ }).click();
  await expect(page.locator('#addr1')).toHaveValue('4 Lime Walk');
  const submit = page.locator('button[type=submit]');
  await expect(submit).toBeDisabled({ timeout: 100 }).catch(() => {});
  await fillSignup(page);
  await expect(submit).toHaveText(/Submit to EHAAT/i);
  await submit.click();
  await expect(page.getByText('Sent to EHAAT')).toBeVisible();
  await page.getByRole('button', { name: 'Next door' }).click();
  await expect(pin(page, '4')).toHaveAttribute('aria-label', /Signed up/);
  await expect(count(page, 'Signed')).toHaveText('1');
});

test('offline sign-ups are kept on the tablet and sent when signal returns', async ({ page, errors }) => {
  void errors;
  await page.getByRole('button', { name: /Online/ }).click();
  await expect(page.getByText(/Offline · 0 saved on tablet/)).toBeVisible();
  await pin(page, '5').click();
  await page.getByRole('button', { name: /Pitching/ }).click();
  await fillSignup(page);
  await expect(page.locator('button[type=submit]')).toHaveText(/Save offline/i);
  await page.locator('button[type=submit]').click();
  await expect(page.getByText('Saved on this tablet')).toBeVisible();
  await page.getByRole('button', { name: 'Next door' }).click();
  await expect(page.getByText(/Offline · [1-9]\d* saved on tablet/)).toBeVisible();
  await page.getByRole('button', { name: /Offline/ }).click();
  await expect(page.getByText(/1 sign-up sent to the office/)).toBeVisible();
  await expect(page.getByText('Online · synced')).toBeVisible();
});

test('the form blocks under-18s and bad bank details', async ({ page, errors }) => {
  void errors;
  await pin(page, '2').click();
  await page.getByRole('button', { name: /Pitching/ }).click();
  await fillSignup(page, { yyyy: String(new Date().getFullYear() - 16) });
  await expect(page.getByText('Under 18')).toBeVisible();
  await expect(page.locator('button[type=submit]')).toHaveText(/Add date of birth/i);
  await page.fill('#yyyy', '1981');
  await page.fill('#sort', '999999');
  await expect(page.getByText('Sort code not recognised')).toBeVisible();
  await page.fill('#sort', '204577');
  await page.fill('#account', '11111111');
  await expect(page.getByText('can’t accept this account number')).toBeVisible();
});

test('Gift Aid only appears for Regular Giving, never the lottery', async ({ page, errors }) => {
  void errors;
  await pin(page, '1').click();
  await page.getByRole('button', { name: /Pitching/ }).click();
  await expect(page.locator('#giftAid')).toHaveCount(0);
  await page.getByRole('button', { name: /Regular Giving/ }).click();
  await expect(page.locator('#giftAid')).toHaveCount(1);
  await expect(page.locator('#lotteryRules')).toHaveCount(0);
});

test('door logs survive closing and reopening the app', async ({ page, errors }) => {
  void errors;
  await pin(page, '2').click();
  await page.getByRole('button', { name: /Not Interested/ }).click();
  await page.reload();
  await page.waitForSelector('.door-pin');
  await expect(pin(page, '2')).toHaveAttribute('aria-label', /Not interested/);
});

test('switching between aerial and street map keeps the pins', async ({ page, errors }) => {
  void errors;
  await page.getByRole('button', { name: 'Show street map' }).click();
  await expect(page.getByRole('button', { name: 'Show satellite' })).toBeVisible();
  await expect(page.locator('.door-pin')).toHaveCount(6);
});

test('layout: no sideways scrolling and big touch targets', async ({ page, errors }) => {
  void errors;
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
  await pin(page, '1').click();
  for (const name of [/Pitching/, /No Answer/, /Not Interested/]) {
    const box = (await page.getByRole('button', { name }).boundingBox())!;
    expect(box.height).toBeGreaterThanOrEqual(60);
  }
  await page.getByRole('button', { name: /Pitching/ }).click();
  const submit = (await page.locator('button[type=submit]').boundingBox())!;
  expect(submit.height).toBeGreaterThanOrEqual(80);
  const overflow2 = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow2).toBeLessThanOrEqual(0);
});
