/**
 * Covers the round-two conversion contract in the built public website.
 *
 * Dependencies: The Astro preview started by playwright.config.ts and sanitized public-events
 * fixtures intercepted at the browser boundary.
 * Depended on by: Round-two acceptance evidence and the release review.
 * Why this exists: Responsive composition, focus behavior, and fail-closed public dates are
 * user-visible contracts that unit tests cannot prove.
 */
import { mkdirSync } from 'node:fs';
import { join } from 'node:path';

import { expect, type Page, type TestInfo, test } from 'playwright/test';

const OPENING_LINE =
  'A polished, personable performance shaped around your room, your guests, and the moments they’ll remember.';
const CATEGORY_LABELS = [
  'PRIVATE GATHERINGS',
  'CELEBRATIONS',
  'CORPORATE RECEPTIONS',
  'WEDDING INQUIRIES',
] as const;
const INVALID_BUDGETS = [
  '.50',
  '1.',
  '+1',
  '1,000',
  '1e3',
  '-1',
  '00',
  '01',
  '100000000',
  '100000000.00',
] as const;
const VALID_BUDGETS = ['', '0', '750', '750.5', '750.50', ' 750.50 ', '99999999.99'] as const;

const RESUMED_LEGACY_INPUT = {
  name: 'Legacy Planner',
  email: 'legacy@example.test',
  phone: '',
  preferredReply: 'email',
  company: '',
  eventType: 'private',
  date: '2026-11-14',
  city: 'Houston',
  venue: 'Legacy Venue',
  address: '',
  setting: 'indoor',
  guestCount: 80,
  startLocal: '',
  endLocal: '',
  durationMinutes: 120,
  timezone: 'America/Chicago',
  atmosphere: 'Warm and conversational',
  musicRequests: '',
  scheduleNotes: '',
  equipment: 'unknown',
  access: 'unknown',
  budget: '750–1,000',
  budgetCents: null,
  notes: '',
  consent: true,
  marketingConsent: false,
  source: 'form',
  utm: {},
} as const;

type PublicEventsMode = 'loading' | 'populated' | 'empty' | 'stale' | 'unavailable';

type PublicEventsFixture = {
  events: Array<{
    id: string;
    title: string;
    venue: string;
    city?: string;
    start: string;
    end: string;
    timezone: string;
  }>;
  status: 'fresh' | 'stale';
  lastUpdated: string;
};

const POPULATED_FIXTURE: PublicEventsFixture = {
  events: [
    {
      id: 'pe_e2e_1',
      title: 'Justin LeBlanc live',
      venue: 'The Blue Room',
      city: 'Houston, TX',
      start: '2026-10-17T19:30:00-05:00',
      end: '2026-10-17T21:30:00-05:00',
      timezone: 'America/Chicago',
    },
  ],
  status: 'fresh',
  lastUpdated: '2026-09-22T15:00:00.000Z',
};

const PRIMARY_EVENT = POPULATED_FIXTURE.events[0];
if (PRIMARY_EVENT === undefined) {
  throw new Error('The populated Public Events fixture must include one event.');
}

const EMPTY_FIXTURE: PublicEventsFixture = {
  events: [],
  status: 'fresh',
  lastUpdated: '2026-09-22T15:00:00.000Z',
};

const STALE_FIXTURE: PublicEventsFixture = {
  ...POPULATED_FIXTURE,
  status: 'stale',
  lastUpdated: '2026-09-21T15:00:00.000Z',
};

const UNAVAILABLE_FIXTURE = {
  error: 'public_events_unavailable',
  message: 'Current dates are temporarily unavailable.',
} as const;

function projectWidth(testInfo: TestInfo): number {
  const viewport = testInfo.project.use.viewport;
  if (viewport === undefined || viewport === null) {
    throw new Error('Round-two browser project is missing a viewport. Keep the matrix explicit.');
  }
  return viewport.width;
}

async function routePublicEvents(page: Page, mode: PublicEventsMode): Promise<void> {
  await page.route('**/api/public-events', async (route) => {
    if (mode === 'loading') {
      await new Promise<void>((resolve) => setTimeout(resolve, 2_000));
    }

    if (mode === 'unavailable') {
      await route.fulfill({
        status: 503,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json',
          'Retry-After': '300',
        },
        body: JSON.stringify(UNAVAILABLE_FIXTURE),
      });
      return;
    }

    const fixture =
      mode === 'empty' ? EMPTY_FIXTURE : mode === 'stale' ? STALE_FIXTURE : POPULATED_FIXTURE;
    await route.fulfill({
      status: 200,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json' },
      body: JSON.stringify(fixture),
    });
  });
}

async function fillPlannerThroughDetails(page: Page): Promise<void> {
  await page.locator('#name').fill('Alex Planner');
  await page.locator('#email').fill('alex@example.test');
  await page.getByRole('button', { name: 'Continue to event', exact: true }).click();
  await page.locator('#eventType').selectOption('private');
  await page.locator('#city').fill('Houston');
  await page.locator('#dateFlexible').check();
  await page.getByRole('button', { name: 'Continue to details', exact: true }).click();
  await expect(page.locator('[data-step="3"]')).toBeVisible();
}

test.describe('round-two homepage conversion surface', () => {
  test('renders the required hierarchy, exact copy, usable first step, and a viewport screenshot', async ({
    page,
  }, testInfo) => {
    await routePublicEvents(page, 'populated');
    await page.goto('/');

    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('main h1')).toHaveText('Justin LeBlanc');
    await expect(page.getByText(OPENING_LINE, { exact: true })).toBeVisible();
    for (const category of CATEGORY_LABELS) {
      await expect(page.getByText(category, { exact: true })).toBeVisible();
    }

    const primaryNavigation = page.locator('.desktop-nav');
    const primaryLinks = primaryNavigation.locator('a');
    await expect(primaryLinks.nth(0)).toHaveText('LISTEN');
    await expect(primaryLinks.nth(0)).toHaveAttribute('href', '/#listen');
    await expect(primaryLinks.nth(1)).toHaveText('FOLLOW');
    await expect(primaryLinks.nth(1)).toHaveAttribute('href', '/#follow');
    await expect(primaryLinks.nth(2)).toHaveText('FAQ');
    await expect(primaryLinks.nth(2)).toHaveAttribute('href', '/faq/');
    await expect(primaryLinks.nth(3)).toHaveText('PLAN YOUR EVENT');
    await expect(primaryLinks.nth(3)).toHaveAttribute('href', '#plan-your-event');

    const sectionOrder = await page.locator('main > section').evaluateAll((sections) =>
      sections.map((section) => {
        if (section.classList.contains('opening')) return 'opening';
        if (section.classList.contains('category-rail')) return 'category-rail';
        if (section.classList.contains('public-events')) return 'public-events';
        if (section.id === 'listen') return 'listen';
        if (section.id === 'follow') return 'follow';
        if (section.getAttribute('aria-labelledby') === 'faq-title') return 'faq';
        if (section.classList.contains('closing-cta')) return 'closing-cta';
        return 'other';
      }),
    );
    expect(sectionOrder).toEqual([
      'opening',
      'category-rail',
      'public-events',
      'listen',
      'follow',
      'faq',
      'closing-cta',
    ]);

    await expect(page.locator('#event-planner')).toHaveCount(1);
    await expect(page.locator('[data-step="1"]')).toBeVisible();
    await expect(page.locator('#planner-title')).toBeVisible();
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();

    const width = projectWidth(testInfo);
    if (width === 390 || width === 1440) {
      await expect(page.locator('#planner-title')).toBeInViewport();
      await expect(page.locator('#name')).toBeInViewport();
      if (width === 1440) await expect(page.locator('#email')).toBeInViewport();
    }

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth <= window.innerWidth,
    );
    expect(overflow).toBe(true);

    mkdirSync(join(process.cwd(), 'docs/evidence/round-two/web'), { recursive: true });
    await page.screenshot({
      path: join(
        process.cwd(),
        'docs/evidence/round-two/web',
        `homepage-${testInfo.project.name}.png`,
      ),
      fullPage: true,
    });
  });

  test('keeps the header pinned and keeps anchor focus clear of the header', async ({ page }) => {
    await routePublicEvents(page, 'empty');
    await page.goto('/');

    await page.evaluate(() => window.scrollTo({ top: window.innerHeight * 2.5, behavior: 'auto' }));
    const stickyTop = await page
      .locator('.site-header')
      .evaluate((header) => header.getBoundingClientRect().top);
    expect(stickyTop).toBeGreaterThanOrEqual(-1);
    expect(stickyTop).toBeLessThanOrEqual(1);

    await page.locator('[data-planner-return]').click();
    await expect(page.locator('#planner-title')).toBeFocused();
    await page.waitForFunction(() => {
      const header = document.querySelector<HTMLElement>('.site-header');
      const heading = document.querySelector<HTMLElement>('#planner-title');
      if (header === null || heading === null) return false;
      return heading.getBoundingClientRect().top >= header.getBoundingClientRect().bottom + 15;
    });
    const anchorMetrics = await page.evaluate(() => {
      const header = document.querySelector<HTMLElement>('.site-header');
      const heading = document.querySelector<HTMLElement>('#planner-title');
      if (header === null || heading === null)
        throw new Error('Anchor test could not find header or planner heading.');
      return {
        headerBottom: header.getBoundingClientRect().bottom,
        headingTop: heading.getBoundingClientRect().top,
      };
    });
    expect(anchorMetrics.headingTop).toBeGreaterThanOrEqual(anchorMetrics.headerBottom + 15);
  });

  test('keeps visible navigation targets and form text at accessible sizes', async ({ page }) => {
    await routePublicEvents(page, 'empty');
    await page.goto('/');

    const targetSizes = await page.locator('header a, header button').evaluateAll((elements) =>
      elements
        .map((element) => {
          const rect = element.getBoundingClientRect();
          const style = window.getComputedStyle(element);
          return {
            width: rect.width,
            height: rect.height,
            visible: style.display !== 'none' && rect.width > 0 && rect.height > 0,
          };
        })
        .filter((value) => value.visible),
    );
    expect(targetSizes.length).toBeGreaterThan(0);
    for (const size of targetSizes) {
      expect(size.width).toBeGreaterThanOrEqual(44);
      expect(size.height).toBeGreaterThanOrEqual(44);
    }

    const formTextSizes = await page
      .locator(
        "#event-planner input:not([type='hidden']), #event-planner select, #event-planner textarea",
      )
      .evaluateAll((elements) =>
        elements.map((element) => Number.parseFloat(window.getComputedStyle(element).fontSize)),
      );
    expect(formTextSizes.length).toBeGreaterThan(0);
    for (const fontSize of formTextSizes) expect(fontSize).toBeGreaterThanOrEqual(16);
  });

  test('handles loading, populated, empty, stale, and unavailable public-event states', async ({
    page,
  }) => {
    const expectations: Array<{ mode: PublicEventsMode; text: string }> = [
      { mode: 'loading', text: 'Loading upcoming public performances…' },
      { mode: 'populated', text: '' },
      { mode: 'empty', text: 'There are no upcoming public performances listed right now.' },
      {
        mode: 'stale',
        text: 'Showing the most recently confirmed public-performance listing while dates refresh.',
      },
      { mode: 'unavailable', text: 'Current dates are temporarily unavailable.' },
    ];

    for (const expectation of expectations) {
      await page.unroute('**/api/public-events');
      await routePublicEvents(page, expectation.mode);
      await page.goto('/', {
        waitUntil: expectation.mode === 'loading' ? 'domcontentloaded' : 'load',
      });
      const state = page.locator('#public-events-state');
      if (expectation.text !== '') await expect(state).toContainText(expectation.text);

      if (expectation.mode === 'loading') {
        await expect(state).toContainText('Loading upcoming public performances…');
        const loadingHidden = await page
          .locator('#public-events-list')
          .evaluate((element) => (element as HTMLOListElement).hidden);
        expect(loadingHidden).toBe(true);
        await expect(page.locator('#public-events-list')).toContainText(PRIMARY_EVENT.title);
      }
      if (expectation.mode === 'populated' || expectation.mode === 'stale') {
        await expect(page.locator('#public-events-list li')).toHaveCount(1);
        if (expectation.mode === 'populated') {
          await expect(page.locator('#public-events-list')).toContainText(PRIMARY_EVENT.title);
        }
        const eventTimes = page.locator('#public-events-list time');
        await expect(eventTimes).toHaveCount(2);
        await expect(eventTimes.first()).toHaveAttribute('datetime', PRIMARY_EVENT.start);
        await expect(eventTimes.nth(1)).toHaveAttribute('datetime', PRIMARY_EVENT.end);
        await expect(eventTimes.nth(1)).toHaveClass(/visually-hidden/);
        await expect(eventTimes.first()).toBeVisible();
      }
      if (expectation.mode === 'empty' || expectation.mode === 'unavailable') {
        const listHidden = await page
          .locator('#public-events-list')
          .evaluate((element) => (element as HTMLOListElement).hidden);
        expect(listHidden).toBe(true);
      }
    }
  });

  test('supports the required mobile-menu keyboard and focus lifecycle', async ({
    page,
  }, testInfo) => {
    test.skip(
      projectWidth(testInfo) > 768,
      'Mobile-menu behavior is exercised at the mobile viewport projects.',
    );
    await routePublicEvents(page, 'empty');
    await page.goto('/');

    const toggle = page.locator('.mobile-nav-toggle');
    const menu = page.locator('#mobile-menu');
    await expect(toggle).toHaveAttribute('data-menu-ready', 'true');
    await expect(menu).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');

    await toggle.click();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(menu).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(toggle).toBeFocused();

    await toggle.click();
    await menu.getByRole('link', { name: 'LISTEN', exact: true }).click();
    await expect(menu).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  });

  test('enforces preferred-reply phone rules and budget grammar', async ({ page }, testInfo) => {
    test.skip(
      projectWidth(testInfo) === 360,
      'Run the long-form budget interaction at the 390px mobile acceptance viewport.',
    );
    await routePublicEvents(page, 'empty');
    let submittedBudgetCents: number | null = null;
    await page.route('**/api/inquiries', async (route) => {
      const payload = route.request().postDataJSON() as { budgetCents?: unknown };
      if (typeof payload.budgetCents === 'number') submittedBudgetCents = payload.budgetCents;
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'inq_e2e',
          token: 'token_e2e',
          status: 'new',
          missingFields: [],
        }),
      });
    });
    await page.goto('/');

    const phone = page.locator('#phone');
    expect(await phone.evaluate((element) => (element as HTMLInputElement).required)).toBe(false);
    await page.locator('#preferredReply').selectOption('text');
    expect(await phone.evaluate((element) => (element as HTMLInputElement).required)).toBe(true);
    await page.locator('#preferredReply').selectOption('phone');
    expect(await phone.evaluate((element) => (element as HTMLInputElement).required)).toBe(true);
    await page.locator('#preferredReply').selectOption('email');
    expect(await phone.evaluate((element) => (element as HTMLInputElement).required)).toBe(false);

    await fillPlannerThroughDetails(page);
    const budget = page.locator('#budgetCents');
    await expect(budget).toHaveAttribute('type', 'text');
    await expect(budget).toHaveAttribute('inputmode', 'decimal');
    await page.locator('#event-planner').evaluate((element) => {
      (element as HTMLFormElement).noValidate = true;
    });

    for (const value of INVALID_BUDGETS) {
      await budget.fill(value);
      await page.locator('#event-planner').evaluate((element) => {
        element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      await expect
        .poll(() => budget.evaluate((element) => (element as HTMLInputElement).checkValidity()), {
          message: `Expected ${value} to be rejected as a budget`,
        })
        .toBe(false);
    }
    for (const value of VALID_BUDGETS) {
      await budget.fill(value);
      await page.locator('#event-planner').evaluate((element) => {
        element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
      });
      await expect
        .poll(() => budget.evaluate((element) => (element as HTMLInputElement).checkValidity()), {
          message: `Expected ${value} to pass budget validation`,
        })
        .toBe(true);
    }

    await page.locator('#event-planner').evaluate((element) => {
      (element as HTMLFormElement).noValidate = false;
    });
    await page.locator('#atmosphere').fill('Warm and conversational');
    await page.locator('#consent').evaluate((element) => {
      const consent = element as HTMLInputElement;
      consent.checked = true;
      consent.dispatchEvent(new Event('change', { bubbles: true }));
    });
    await budget.fill('750.50');
    await page.locator('#event-planner').evaluate((element) => {
      element.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await expect.poll(() => submittedBudgetCents).toBe(75_050);
  });

  test('uses semantic event times and honors reduced-motion preferences', async ({
    page,
  }, testInfo) => {
    test.skip(
      projectWidth(testInfo) !== 390,
      'Run this detailed media assertion once at the mobile acceptance viewport.',
    );
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await routePublicEvents(page, 'populated');
    await page.goto('/');

    const timeAttributes = await page
      .locator('#public-events-list time')
      .evaluateAll((elements) => elements.map((element) => element.getAttribute('datetime')));
    expect(timeAttributes).toEqual([PRIMARY_EVENT.start, PRIMARY_EVENT.end]);
    const reducedMotion = await page.evaluate(() => {
      const button = document.querySelector<HTMLElement>('.button');
      if (button === null) throw new Error('Reduced-motion test could not find a button.');
      const transitionDuration = window.getComputedStyle(button).transitionDuration;
      const durationValue = Number.parseFloat(transitionDuration);
      return {
        scrollBehavior: window.getComputedStyle(document.documentElement).scrollBehavior,
        transitionDurationMs: transitionDuration.endsWith('s')
          ? durationValue * 1000
          : durationValue,
      };
    });
    expect(reducedMotion.scrollBehavior).toBe('auto');
    expect(reducedMotion.transitionDurationMs).toBeLessThanOrEqual(0.01);
  });

  test('keeps the focused campaign route H1 exact', async ({ page }, testInfo) => {
    test.skip(
      projectWidth(testInfo) !== 1440,
      'The route contract needs one representative desktop run.',
    );
    await routePublicEvents(page, 'empty');
    await page.goto('/plan-your-event/');
    await expect(page.locator('main h1')).toHaveCount(1);
    await expect(page.locator('main h1')).toHaveText('Plan Your Event');
  });

  test('resumes legacy budget context and replaces it with numeric cents on edit', async ({
    page,
  }, testInfo) => {
    test.skip(
      projectWidth(testInfo) !== 390,
      'Run the resume/budget contract once at the 390px mobile acceptance viewport.',
    );
    await routePublicEvents(page, 'empty');
    let updatedPayload: Record<string, unknown> | null = null;
    await page.route('**/api/inquiries/legacy-e2e', async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            inquiryId: 'legacy-e2e',
            status: 'new',
            input: RESUMED_LEGACY_INPUT,
            shows: [],
          }),
        });
        return;
      }
      updatedPayload = route.request().postDataJSON() as Record<string, unknown>;
      await route.fulfill({
        status: 200,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: 'legacy-e2e',
          token: 'legacy-token-e2e',
          status: 'new',
          missingFields: [],
        }),
      });
    });
    await page.addInitScript(() => {
      sessionStorage.setItem(
        'justin-demo-inquiry-resume-v1',
        JSON.stringify({
          id: 'legacy-e2e',
          token: 'legacy-token-e2e',
          status: 'new',
          requestKey: 'legacy-request-e2e',
        }),
      );
    });
    await page.goto('/');

    await expect(page.locator('#save-state')).toHaveText('Submitted inquiry resumed securely');
    await expect(page.locator('#budgetCents')).toHaveValue('');

    await page.getByRole('button', { name: 'Continue to event', exact: true }).click();
    await page.getByRole('button', { name: 'Continue to details', exact: true }).click();
    await expect(page.locator('#legacy-budget-context')).toContainText('750–1,000');
    await expect(page.locator('#legacy-budget-context')).toBeVisible();
    await page.locator('#budgetCents').fill('750.50');
    await page.locator('#submit-inquiry').click();
    await expect.poll(() => updatedPayload).not.toBeNull();
    expect(updatedPayload).toMatchObject({ budget: 'unsure', budgetCents: 75_050 });
  });
});
