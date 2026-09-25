import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, type Page, type TestInfo, test } from 'playwright/test';

const evidence = join(process.cwd(), 'docs/evidence/public-form-round-three');
const PHONE_ERROR = 'Enter a complete 10-digit phone number or clear this field.';
const RECEIPT_COPY = 'Your request has been received. I’ll contact you as soon as I’m available.';

function projectWidth(testInfo: TestInfo): number {
  const viewport = testInfo.project.use.viewport;
  if (viewport === undefined || viewport === null) throw new Error('Viewport is required.');
  return viewport.width;
}

async function openPlanner(page: Page, path = '/'): Promise<void> {
  await page.route('**/api/public-events', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        events: [],
        status: 'fresh',
        lastUpdated: '2026-09-24T12:00:00.000Z',
      }),
    }),
  );
  await page.goto(path);
  await expect(page.getByText('BOOKING INQUIRIES', { exact: true }).first()).toBeVisible();
}

async function fillStepOne(page: Page): Promise<void> {
  await page.locator('#name').fill('Alex Planner');
  await page.locator('#email').fill('alex@example.test');
  await page.getByRole('button', { name: 'Last Step', exact: true }).click();
}

async function fillRequiredEventDetails(page: Page): Promise<void> {
  await page.locator('#eventType').selectOption('private');
  await page.locator('#city').fill('Houston');
  await page.locator('#eventDate').fill('111426');
  await page.locator('input[name="setting"][value="indoor"]').check();
  await page.locator('#consent').check();
}

const legacyInput = {
  name: 'Legacy Planner',
  email: 'legacy@example.test',
  phone: '',
  preferredReply: 'text',
  company: 'Legacy Company',
  eventType: 'private',
  date: 'flexible',
  city: 'Houston',
  venue: 'Legacy Venue',
  address: '101 Legacy Way',
  setting: 'indoor',
  guestCount: 80,
  startLocal: '2026-11-14T18:00',
  endLocal: '2026-11-14T20:00',
  durationMinutes: 120,
  timezone: 'America/New_York',
  atmosphere: 'Warm and conversational',
  musicRequests: 'Legacy request',
  scheduleNotes: 'Legacy schedule note',
  equipment: 'PA required',
  access: 'stairs',
  budget: '750–1,000',
  budgetCents: null,
  notes: 'Legacy private note',
  consent: true,
  marketingConsent: false,
  source: 'chat',
  utm: { source: 'legacy-source', campaign: 'legacy-campaign' },
} as const;

test.describe('round-three inquiry planner', () => {
  test('renders the exact two-step contract at every required viewport', async ({
    page,
  }, testInfo) => {
    await openPlanner(page);

    await expect(page.locator('[data-step]')).toHaveCount(2);
    await expect(page.locator('#progress-label')).toHaveText('Step 1 of 2');
    await expect(page.locator('.booking-phone')).toHaveCount(0);
    const businessPhone = page.locator('a[href="tel:+18323039116"]');
    await expect(businessPhone).toHaveCount(1);
    await expect(businessPhone).toHaveText('(832) 303-9116');

    const stepOneIds = await page
      .locator('[data-step="1"] .field-grid > .field')
      .evaluateAll((fields) =>
        fields.map((field) => field.querySelector('input, select, textarea')?.id ?? ''),
      );
    expect(stepOneIds).toEqual(['name', 'email', 'phone', 'preferredReply']);
    await expect(page.locator('label[for="name"]')).toContainText('Your Name');
    await expect(page.locator('label[for="email"]')).toContainText('Email');
    await expect(page.locator('label[for="phone"]')).toHaveText('Phone Number');
    await expect(page.locator('label[for="preferredReply"]')).toHaveText(
      'Preferred method of response',
    );
    await expect(page.locator('#phone')).not.toHaveAttribute('required', '');
    await expect(page.locator('#preferredReply')).toHaveValue('text');
    expect(await page.locator('#preferredReply option').allTextContents()).toEqual([
      'Text',
      'Email',
      'Phone Call',
    ]);
    await expect(page.getByRole('button', { name: 'Last Step', exact: true })).toHaveCount(1);

    await fillStepOne(page);
    const stepTwoOrder = await page.locator('[data-step="2"] .field-grid').evaluate((grid) =>
      [...grid.children].map((field) => {
        const control = field.querySelector<
          HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement
        >('input:not(.date-picker-source), select, textarea');
        return (
          control?.id || field.querySelector('legend')?.textContent?.replace('*', '').trim() || ''
        );
      }),
    );
    expect(stepTwoOrder).toEqual([
      'eventType',
      'city',
      'eventDate',
      'Is it outdoors?',
      'durationMinutes',
      'equipment',
      'budgetCents',
      'musicRequests',
    ]);
    await expect(page.locator('label[for="city"]')).toContainText('Location of Event');
    await expect(page.locator('#equipment')).toHaveValue('PA required');
    expect(await page.locator('#equipment option').allTextContents()).toEqual([
      'PA required',
      'PA is provided',
    ]);
    await expect(page.locator('input[name="setting"]:checked')).toHaveCount(0);
    await expect(
      page.locator(
        '#company, #venue, #guestCount, #dateFlexible, #atmosphere, #scheduleNotes, #notes, #schedule-card, #schedule-form',
      ),
    ).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'That’s It', exact: true })).toBeVisible();

    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    mkdirSync(evidence, { recursive: true });
    await page.screenshot({
      path: join(evidence, `planner-${testInfo.project.name}.png`),
      fullPage: true,
    });
  });

  test('accepts only the approved optional phone forms with one exact error', async ({
    page,
  }, testInfo) => {
    test.skip(projectWidth(testInfo) !== 390, 'Run the phone matrix once.');
    await openPlanner(page);
    await page.locator('#name').fill('Alex Planner');
    await page.locator('#email').fill('alex@example.test');
    const phone = page.locator('#phone');

    for (const preference of ['text', 'phone'] as const) {
      await page.locator('#preferredReply').selectOption(preference);
      await phone.fill('');
      await page.getByRole('button', { name: 'Last Step', exact: true }).click();
      await expect(page.locator('[data-step="2"]')).toBeVisible();
      await page.getByRole('button', { name: 'Back', exact: true }).click();
    }

    for (const valid of ['5555550100', '1 555 555 0100', '+1 (555) 555-0100']) {
      await phone.fill(valid);
      await page.getByRole('button', { name: 'Last Step', exact: true }).click();
      await expect(page.locator('[data-step="2"]')).toBeVisible();
      await page.getByRole('button', { name: 'Back', exact: true }).click();
    }

    for (const invalid of [
      '555555010',
      '+1 555 555 010',
      '155555501000',
      '555-ABC-0100',
      '5555550100 ext 2',
    ]) {
      await phone.fill(invalid);
      await page.getByRole('button', { name: 'Last Step', exact: true }).click();
      await expect(page.locator('[data-step="1"]')).toBeVisible();
      await expect(phone).toBeFocused();
      await expect(phone).toHaveJSProperty('validationMessage', PHONE_ERROR);
    }
  });

  test('normalizes real dates, rejects impossible dates, and keeps values on refocus', async ({
    page,
  }, testInfo) => {
    test.skip(projectWidth(testInfo) !== 390, 'Run the date interaction once.');
    await openPlanner(page);
    await fillStepOne(page);
    await page.locator('#eventType').selectOption('private');
    await page.locator('#city').fill('Houston');
    await page.locator('input[name="setting"][value="indoor"]').check();

    const date = page.locator('#eventDate');
    await date.fill('022924');
    await expect(date).toHaveValue('02-29-24');
    await date.focus();
    await expect(date).toHaveValue('02-29-24');
    await date.fill('02292025');
    await date.blur();
    await expect(date).toHaveJSProperty(
      'validationMessage',
      'Enter a real date in MM-DD-YY or MM-DD-YYYY format.',
    );
    await page.locator('#eventDatePicker').evaluate((input) => {
      (input as HTMLInputElement).value = '2026-11-14';
      input.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await expect(date).toHaveValue('11-14-2026');
  });

  test('restores the required outdoors radio from a browser draft', async ({ page }, testInfo) => {
    test.skip(projectWidth(testInfo) !== 390, 'Run draft restoration once.');
    await openPlanner(page);
    await fillStepOne(page);
    await fillRequiredEventDetails(page);
    await page.reload();
    await expect(page.locator('#save-state')).toHaveText('Draft resumed in this browser');
    await page.getByRole('button', { name: 'Last Step', exact: true }).click();
    await expect(page.locator('input[name="setting"][value="indoor"]')).toBeChecked();
  });

  test('migrates v1 ISO draft dates and preserves new-inquiry UTM attribution', async ({
    page,
  }, testInfo) => {
    test.skip(projectWidth(testInfo) !== 390, 'Run attribution and draft migration once.');
    const submissions: Array<Record<string, unknown>> = [];
    await page.route('**/api/inquiries', async (route) => {
      submissions.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'inq-utm',
          token: 'opaque-token',
          status: 'new',
          missingFields: [],
        }),
      });
    });
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'justin-demo-inquiry-draft-v1',
        JSON.stringify({ eventDate: '2026-11-14', preferredReply: 'text' }),
      );
    });
    await openPlanner(page, '/?utm_source=newsletter&utm_medium=email&utm_campaign=fall');
    await expect(page.locator('#eventDate')).toHaveValue('11-14-2026');
    await fillStepOne(page);
    await fillRequiredEventDetails(page);
    await page.getByRole('button', { name: 'That’s It', exact: true }).click();
    await expect.poll(() => submissions.length).toBe(1);
    expect(submissions[0]?.utm).toEqual({
      source: 'newsletter',
      medium: 'email',
      campaign: 'fall',
    });
  });

  test('replays the original uncertain create and reaches a safe receipt exactly once', async ({
    page,
  }, testInfo) => {
    test.skip(projectWidth(testInfo) !== 390, 'Run uncertain-response recovery once.');
    let inquiryRequests = 0;
    let updateRequests = 0;
    const keys: string[] = [];
    const payloads: Array<Record<string, unknown>> = [];
    const updatePayloads: Array<Record<string, unknown>> = [];
    let schedulingRequests = 0;
    for (const path of ['time', 'availability', 'bookings']) {
      await page.route(`**/api/${path}`, (route) => {
        schedulingRequests += 1;
        return route.abort();
      });
    }
    await page.route('**/api/inquiries', async (route) => {
      inquiryRequests += 1;
      keys.push(route.request().headers()['idempotency-key'] ?? '');
      payloads.push(route.request().postDataJSON() as Record<string, unknown>);
      if (inquiryRequests === 1) {
        await route.abort('failed');
        return;
      }
      await route.fulfill({
        status: 201,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'inq_round_three',
          token: 'opaque-resume-token',
          status: 'new',
          missingFields: [],
        }),
      });
    });
    await page.route('**/api/inquiries/**', async (route) => {
      updateRequests += 1;
      updatePayloads.push(route.request().postDataJSON() as Record<string, unknown>);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'inq_round_three',
          token: 'opaque-resume-token',
          status: 'new',
          missingFields: [],
        }),
      });
    });

    await openPlanner(page);
    await fillStepOne(page);
    await fillRequiredEventDetails(page);
    await page.getByRole('button', { name: 'That’s It', exact: true }).click();
    await expect(page.locator('#form-alert')).toContainText('We could not save the inquiry');
    await page.locator('#city').fill('Edited after uncertain response');
    await page.getByRole('button', { name: 'That’s It', exact: true }).click();

    await expect(page).toHaveURL(/\/inquiry-received\/$/);
    await expect(page.getByText(RECEIPT_COPY, { exact: true })).toBeVisible();
    expect(keys).toHaveLength(2);
    expect(keys[0]).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(keys[1]).toBe(keys[0]);
    expect(payloads[1]).toEqual(payloads[0]);
    expect(payloads[1]?.city).toBe('Houston');
    expect(updateRequests).toBe(1);
    expect(updatePayloads[0]?.city).toBe('Edited after uncertain response');
    expect(payloads[1]?.date).toBe('2026-11-14');
    expect(schedulingRequests).toBe(0);
    expect(new URL(page.url()).search).toBe('');
    expect(new URL(page.url()).hash).toBe('');
    expect(page.url()).not.toContain('opaque-resume-token');
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /noindex/);

    await page.reload();
    await expect(page.getByText(RECEIPT_COPY, { exact: true })).toBeVisible();
    expect(inquiryRequests).toBe(2);
    expect(updateRequests).toBe(1);
  });

  test('preserves retired legacy data when a resumed browser draft is updated', async ({
    page,
  }, testInfo) => {
    test.skip(projectWidth(testInfo) !== 390, 'Run legacy merge coverage once.');
    let updatedPayload: Record<string, unknown> | null = null;
    await page.route('**/api/inquiries/legacy-round-three', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify({
            inquiryId: 'legacy-round-three',
            status: 'new',
            input: legacyInput,
            shows: [],
          }),
        });
        return;
      }
      updatedPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 'legacy-round-three',
          token: 'legacy-resume-token',
          status: 'new',
          missingFields: [],
        }),
      });
    });
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'justin-demo-inquiry-resume-v1',
        JSON.stringify({
          id: 'legacy-round-three',
          token: 'legacy-resume-token',
          status: 'new',
          requestKey: 'legacy-request',
        }),
      );
      sessionStorage.setItem(
        'justin-demo-inquiry-draft-v1',
        JSON.stringify({
          name: 'Draft Planner',
          email: 'draft@example.test',
          phone: '',
          preferredReply: 'text',
          eventType: 'private',
          city: 'Draft City',
          eventDate: '',
          setting: 'outdoor',
          durationMinutes: '120',
          equipment: 'PA required',
          budgetCents: '',
          musicRequests: 'Draft request',
          consent: true,
          marketingConsent: false,
          __budgetWasEdited: false,
        }),
      );
    });

    await openPlanner(page);
    await expect(page.locator('#save-state')).toHaveText(
      'Saved inquiry available; current edits kept',
    );
    await expect(page.locator('#eventDate')).toHaveValue('Flexible');
    await page.getByRole('button', { name: 'Last Step', exact: true }).click();
    await expect(page.locator('input[name="setting"][value="outdoor"]')).toBeChecked();
    await expect(page.locator('#legacy-budget-context')).toContainText('750–1,000');
    await expect(page.locator('#legacy-budget-context')).toBeVisible();
    await page.getByRole('button', { name: 'That’s It', exact: true }).click();
    await expect.poll(() => updatedPayload).not.toBeNull();

    expect(updatedPayload).toMatchObject({
      company: 'Legacy Company',
      date: 'flexible',
      city: 'Draft City',
      venue: 'Legacy Venue',
      address: '101 Legacy Way',
      setting: 'outdoor',
      guestCount: 80,
      startLocal: '2026-11-14T18:00',
      endLocal: '2026-11-14T20:00',
      timezone: 'America/New_York',
      atmosphere: 'Warm and conversational',
      scheduleNotes: 'Legacy schedule note',
      access: 'stairs',
      budget: '750–1,000',
      budgetCents: null,
      notes: 'Legacy private note',
      source: 'chat',
      utm: { source: 'legacy-source', campaign: 'legacy-campaign' },
    });
  });

  test('keeps the receipt private and the Gmail/ChatGPT explanation off the homepage', async ({
    page,
  }, testInfo) => {
    test.skip(projectWidth(testInfo) !== 1280, 'Run privacy copy once.');
    await openPlanner(page);
    await expect(page.locator('main')).not.toContainText('ChatGPT');
    await expect(page.locator('main')).not.toContainText('Gmail');
    await page.goto('/privacy/');
    await expect(page.getByRole('heading', { name: 'Private notifications' })).toBeVisible();
    await expect(page.locator('main')).toContainText('protected business inbox');
    await expect(page.locator('main')).toContainText('Gmail and ChatGPT notifications');
  });
});
