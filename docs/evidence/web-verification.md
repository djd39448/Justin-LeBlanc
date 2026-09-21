# Live web verification

Verified 2026-09-21 against Cloudflare Pages deployment `63cfd5c3` at
`https://justinleblancmusic.50by50.dev`.

## Browser and responsive evidence

Chrome UI testing used the deployed page at five explicit viewport widths. Each viewport kept the
hero heading and primary CTA in meaningful initial HTML. `documentElement.scrollWidth` equaled its
client width in every run, so no horizontal page overflow was present.
Full-page capture review found no clipped controls, overlapping copy, broken imagery, or exposed
empty states; cards and form fields stack cleanly at the two phone widths.

| Viewport    | Client / scroll width | Evidence                                     |
| ----------- | --------------------- | -------------------------------------------- |
| 360 × 800   | 345 / 345             | [Homepage at 360 px](web/homepage-360.png)   |
| 390 × 844   | 375 / 375             | [Homepage at 390 px](web/homepage-390.png)   |
| 768 × 1024  | 753 / 753             | [Homepage at 768 px](web/homepage-768.png)   |
| 1280 × 900  | 1265 / 1265           | [Homepage at 1280 px](web/homepage-1280.png) |
| 1440 × 1000 | 1425 / 1425           | [Homepage at 1440 px](web/homepage-1440.png) |

The 15 px difference between requested and client widths is the vertical scrollbar, not horizontal
overflow. Captures contain the public page with blank form controls and no operator token, inquiry
credential, or personal submission.

Keyboard checks passed at 360 px and 1440 px. The skip link is first, followed by the home link and
the visible navigation for that breakpoint. At 360 px, Enter opens the Menu disclosure and exposes
the labelled mobile navigation. At 1440 px, focus proceeds through Private events, Hear Justin,
FAQs, Plan your event, then the hero actions. Focused links render a 3 px solid outline.

## HTML, indexing, and operator boundary

- `/`, `/plan-your-event/`, `/hear-live/`, `/faq/`, `/about/`, `/privacy/`, `/reference/`, and
  `/admin/` returned HTTP 200 with an initial `<h1>` and `noindex, nofollow, noarchive` meta tag.
- The homepage initial HTML contains `Live music shaped around your room.`; it does not rely on
  client rendering for the main content.
- `robots.txt` returns HTTP 200 and applies `User-agent: *` plus `Disallow: /` for the private demo.
- `sitemap.xml` returns HTTP 200 and lists the seven public routes; admin is excluded. Repository
  URLs and canonical metadata now use Cloudflare's final trailing-slash form and require redeploy.
- `/admin/` initially exposes only a password-type operator token field and `Open workspace`. The
  input has no value attribute. The page says the token stays in session storage and never enters a
  URL.

## Current limitations and security findings

The public API origin is not connected on deployment `63cfd5c3`. A read-only request to
`/api/admin/state` returned Cloudflare HTTP 530 / error 1016 and no application data. Public inquiry,
availability, booking, chat, and authenticated admin workflows were therefore **not** passed live.
Their local browser/API QA is separate evidence and must not be treated as a deployed journey.

The live deployment already sends `X-Content-Type-Options: nosniff` and
`Referrer-Policy: strict-origin-when-cross-origin`. It does not yet send `X-Robots-Tag`, frame/CSP,
HSTS, or Permissions-Policy headers, and `/admin/` currently has public cache control. The repository
now includes `apps/web/public/_headers` with global noindex, framing protection, conservative
permissions, HSTS, and `Cache-Control: no-store` for admin routes. Those headers require redeploy and
a live header recheck.
