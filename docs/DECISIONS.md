# Decisions and provisional demo policies

These defaults let the build proceed. Justin must approve real business terms before launch.

| Topic | Selected demo default | Status |
|---|---|---|
| Objective | More private-event bookings, less qualification/admin effort | User approved |
| Theme | Optimize existing blue musician identity | User approved |
| Hosting | Isolated `justinleblancmusic.50by50.dev` | User approved |
| Voice | Existing Retell account, separate managed number and agent | Agent provisioned; number blocked by owner KYC |
| Calendar/email | Dave's verified TrustCore accounts, isolated records | SMTP/IMAP diagnostic verified; limited Calendar consent pending |
| Chat credential | Reuse existing OpenAI API key securely | Reuse configured; four real qualification cases passed |
| Consultation | 20 minutes, Mon–Fri 10am–4pm Central Time (`America/Chicago`), 24h notice | User approved; respect existing actual free/busy |
| Booking timezone | Customer-facing consultation and event inputs/displays use Central Time (`America/Chicago`) | User approved; DST-aware IANA conversion |
| Buffers | 60 min setup + 30 min breakdown + 60 min each-side travel placeholder | Provisional, operator adjustable |
| Event hold | Expires 48h after consultation end; requires scheduled consultation | Provisional |
| Confirmation | Authenticated operator confirms after consultation and agreed quote | User approved |
| Contract/deposit | Track statuses; not required in demo, no payment/contract automation | Provisional |
| Morning check | 08:00 America/Chicago, shows with prior-local-day end time | Provisional |
| Invoice terms | USD, due 14 calendar days after issue, no real payment link | Provisional |
| Reminder | One performer reminder after 24h, unresolved queue after 72h | Provisional |
| Taxes | Explicit demo tax=0 assumption; real tax treatment unresolved | Provisional, not tax advice |
| Audience | Demo operator and allowlisted test clients only for external workflow effects | Demo boundary |

## Demo pricing examples (not Justin's published or approved rates)

Seed editable package configuration, not hardcoded prose:
- Private gathering: 2 performance hours, solo demo format, base $700.
- Extended celebration: 3 performance hours, solo demo format, base $1,000.
- Corporate reception: 2 performance hours, base $900.
- Wedding/custom production: consultation required; don't auto-price multiple locations/ensembles.
- Extra performance time: $175 per 30 minutes, only after explicit agreement.
- Local travel demo: first 30 one-way miles included, then $2 per excess one-way mile.
  Distance must be measured or operator-entered; don't guess venue distance from a city name.
- Sound equipment/setup inclusion is an assumption to confirm; complex production remains quote-only.

Every estimate lists inputs, included services, surcharges, currency, assumptions and version.
Integer cents, deterministic arithmetic, no tax/fee invention. These numbers illustrate the flow;
the research comparator rates are not proof of what Justin charges. Agreed quote replaces the
estimate at confirmation and is the only pricing basis for an invoice, plus approved amendments.

## Matters for Justin after the demo

Actual packages, formats/repertoire, radius/travel, technical rider, setup/breaks, payment methods,
deposits/contracts/cancellation terms, invoice legal identity/address/tax, response hours, hold
policy, privacy/recording, approved assets, existing client DB, calendar and mailing account.
Keep these in the handoff; don't block demonstration of reasonable marked defaults.
