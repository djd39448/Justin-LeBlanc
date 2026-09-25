/** Loads server-only configuration. Dependencies: Zod. Consumers: bootstrap/adapters.
 * Why: integrations fail closed without exposing secrets in browser bundles or errors. */
import { z } from 'zod';
const bool = z.enum(['true', 'false']).transform((v) => v === 'true');
export const ConfigSchema = z
  .object({
    NODE_ENV: z.enum(['test', 'development', 'production']).default('development'),
    PORT: z.coerce.number().default(4318),
    PUBLIC_SITE_URL: z.url().default('https://justinleblancmusic.50by50.dev'),
    API_URL: z.url().default('http://127.0.0.1:4318'),
    DEMO_MODE: bool.default(true),
    DATABASE_URL: z.string().default('private/jlm-demo.sqlite'),
    PRIVATE_STORAGE_PATH: z.string().default('private/documents'),
    ADMIN_TOKEN: z.string().min(32),
    JOB_AUTH_SECRET: z.string().min(32),
    DEMO_RECIPIENT_ALLOWLIST: z.string(),
    OPERATOR_EMAIL: z.email(),
    PERFORMER_EMAIL: z.email(),
    CLIENT_TEST_EMAIL: z.email(),
    INQUIRY_NOTIFICATIONS_ENABLED: bool.default(false),
    INQUIRY_NOTIFICATION_EMAIL: z.union([z.email(), z.literal('')]).default(''),
    SMTP_HOST: z.string().default('smtp.gmail.com'),
    SMTP_PORT: z.coerce.number().default(465),
    SMTP_USER: z.string().default(''),
    SMTP_PASS: z.string().default(''),
    IMAP_HOST: z.string().default('imap.gmail.com'),
    IMAP_PORT: z.coerce.number().default(993),
    GOOGLE_CLIENT_ID: z.string().default(''),
    GOOGLE_CLIENT_SECRET: z.string().default(''),
    GOOGLE_REFRESH_TOKEN: z.string().default(''),
    SHOW_CALENDAR_ID: z.string().default(''),
    FREE_BUSY_CALENDAR_IDS: z.string().default(''),
    PUBLIC_EVENTS_ENABLED: bool.default(false),
    PUBLIC_EVENTS_CALENDAR_ID: z.string().default(''),
    PUBLIC_EVENTS_TIMEZONE: z.string().default('America/Chicago'),
    PUBLIC_EVENTS_ID_SECRET: z.string().default(''),
    OPENAI_API_KEY: z.string().default(''),
    OPENAI_CHAT_MODEL: z.string().default('gpt-4.1-mini'),
    CHAT_DAILY_TURN_LIMIT: z.coerce.number().int().min(1).max(1000).default(100),
    RETELL_API_KEY: z.string().default(''),
    RETELL_JLM_AGENT_ID: z.string().default(''),
    RETELL_JLM_PHONE_NUMBER: z.string().default(''),
    DEMO_CALLER_ALLOWLIST: z.string().default(''),
    VOICE_DAILY_CALL_LIMIT: z.coerce.number().int().min(1).max(100).default(10),
    BOOKING_WRITES_ENABLED: bool.default(false),
    INVOICE_SEND_ENABLED: bool.default(false),
    MORNING_SCAN_ENABLED: bool.default(false),
    AI_ENABLED: bool.default(false),
    VOICE_ENABLED: bool.default(false),
  })
  .superRefine((config, ctx) => {
    if (config.INQUIRY_NOTIFICATIONS_ENABLED && config.INQUIRY_NOTIFICATION_EMAIL === '')
      ctx.addIssue({
        code: 'custom',
        path: ['INQUIRY_NOTIFICATION_EMAIL'],
        message: 'Inquiry notification email is required when notifications are enabled.',
      });
  });
export type Config = z.infer<typeof ConfigSchema>;
/** Validates env values; errors identify names only. */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const result = ConfigSchema.safeParse(env);
  if (!result.success)
    throw new Error(
      `Configuration invalid: ${result.error.issues.map((i) => i.path.join('.')).join(', ')}; set these variables using .env.example.`,
    );
  return result.data;
}
/** Checks every final recipient against the configured demo boundary. */
export function assertRecipients(config: Config, recipients: string[]): void {
  const allowed = new Set(
    config.DEMO_RECIPIENT_ALLOWLIST.split(',').map((v) => v.trim().toLowerCase()),
  );
  if (!config.DEMO_MODE)
    throw new Error(
      'This deployment requires DEMO_MODE=true; real-client sending is not authorized.',
    );
  if (recipients.length === 0 || recipients.some((v) => !allowed.has(v.toLowerCase())))
    throw new Error(
      'Recipient blocked at provider boundary; configure only verified demo inboxes.',
    );
}
export function assertInquiryNotificationRecipients(
  config: Config,
  mail: { to: string[]; cc: string[]; bcc: string[] },
): void {
  const recipient = config.INQUIRY_NOTIFICATION_EMAIL.trim().toLowerCase();
  if (
    !config.DEMO_MODE ||
    !config.INQUIRY_NOTIFICATIONS_ENABLED ||
    recipient.length === 0 ||
    mail.to.length !== 1 ||
    mail.to[0]?.toLowerCase() !== recipient ||
    mail.cc.length !== 0 ||
    mail.bcc.length !== 0
  )
    throw new Error('Inquiry notification recipient policy blocked this message.');
}
