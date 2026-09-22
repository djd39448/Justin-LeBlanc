/** Composes the demo's real services with server-only configuration.
 * Dependencies: domain services and provider adapters. Consumers: HTTP, scheduler and CLI.
 * Why: all entry points share one database, configuration and business implementation. */
import { loadKnowledgeRelease } from '../../kb/release.js';
import { BookingService } from '../../packages/domain/booking.js';

import { CalendarEffectDispatcher, GoogleCalendarAdapter } from './adapters/calendar.js';
import { ImapEmailAdapter, SmtpEmailAdapter } from './adapters/email.js';
import { PublicEventsCalendarReader } from './adapters/public-events.js';
import { createAssistantHandlers } from './assistants/handlers.js';
import { OpenAIChatAssistant } from './assistants/openai.js';
import { EventBriefService } from './billing/brief.js';
import { BillingService } from './billing/service.js';
import { assertRecipients, type Config } from './config.js';
import { OutboxDispatcher } from './jobs/outbox.js';
import { Store } from './store.js';

/** Creates service objects; no external effect occurs until an explicit service operation. */
export function createRuntime(config: Config) {
  const store = new Store(config.DATABASE_URL);
  const knowledge = loadKnowledgeRelease();
  const calendar = new GoogleCalendarAdapter(config);
  const publicEvents = new PublicEventsCalendarReader(
    {
      enabled: config.PUBLIC_EVENTS_ENABLED,
      calendarId: config.PUBLIC_EVENTS_CALENDAR_ID,
      timezone: config.PUBLIC_EVENTS_TIMEZONE,
      idSecret: config.PUBLIC_EVENTS_ID_SECRET,
      googleClientId: config.GOOGLE_CLIENT_ID,
      googleClientSecret: config.GOOGLE_CLIENT_SECRET,
      googleRefreshToken: config.GOOGLE_REFRESH_TOKEN,
    },
    {
      reportExcluded: ({ excluded }) => {
        console.warn(
          JSON.stringify({
            event: 'public_events_excluded',
            count: excluded,
            remedy:
              'Review only the controlled Public Shows Calendar entries; no event data was logged.',
          }),
        );
      },
      reportFailure: (failure) => {
        console.error(
          JSON.stringify({
            event: 'public_events_refresh_failed',
            ...failure,
          }),
        );
      },
    },
  );
  const booking = new BookingService(
    store,
    calendar,
    {
      operatorEmail: config.OPERATOR_EMAIL,
      performerEmail: config.PERFORMER_EMAIL,
      senderEmail: config.SMTP_USER,
      replyToEmail: config.OPERATOR_EMAIL,
    },
    (inquiry) => {
      if (!config.BOOKING_WRITES_ENABLED) throw new Error('Booking writes are disabled.');
      assertRecipients(config, [inquiry.input.email, config.OPERATOR_EMAIL]);
    },
  );
  const billing = new BillingService(store, calendar, {
    operatorEmail: config.OPERATOR_EMAIL,
    performerEmail: config.PERFORMER_EMAIL,
    senderEmail: config.SMTP_USER,
    publicSiteUrl: config.PUBLIC_SITE_URL,
    privateStoragePath: config.PRIVATE_STORAGE_PATH,
    sellerDisplayName: 'Justin LeBlanc — DEMO',
    sellerAddress: 'Demo seller address — to be approved before real use',
    demoMode: config.DEMO_MODE,
    hostname: new URL(config.PUBLIC_SITE_URL).hostname,
  });
  const smtp = new SmtpEmailAdapter(config);
  const imap = new ImapEmailAdapter(config);
  const calendarEffects = new CalendarEffectDispatcher(store, calendar, config);
  const briefs = new EventBriefService(store, {
    operatorEmail: config.OPERATOR_EMAIL,
    senderEmail: config.SMTP_USER,
    publicSiteUrl: config.PUBLIC_SITE_URL,
    privateStoragePath: config.PRIVATE_STORAGE_PATH,
    hostname: new URL(config.PUBLIC_SITE_URL).hostname,
  });
  const outbox = new OutboxDispatcher(store, smtp, imap, calendarEffects, billing, briefs, config);
  const handlers = createAssistantHandlers(store, booking, knowledge);
  const chat = new OpenAIChatAssistant(config, knowledge, handlers);
  return {
    config,
    store,
    knowledge,
    calendar,
    publicEvents,
    booking,
    billing,
    briefs,
    smtp,
    imap,
    outbox,
    chat,
    handlers,
  };
}
export type Runtime = ReturnType<typeof createRuntime>;
