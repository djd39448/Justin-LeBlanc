# Public-form simplification release evidence — 2026-09-23

This record covers the verified two-step, inquiry-only public planner release. It supplements rather
than rewrites the dated round-two and provider evidence.

## Source and deployment

- Implementation commit: `c6abf12015bcb6ef179985a08919cd3319026915`, on both `origin/main` and
  `origin/codex/justin-round-two`.
- Feature CI [35905466911](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35905466911)
  and main CI [35905771617](https://github.com/djd39448/Justin-LeBlanc/actions/runs/35905771617)
  passed.
- Production deployment: `73a78aec-f10a-4b95-b494-fd191ecccbd6` at
  `https://73a78aec.50by50-justinleblancmusic.pages.dev`.
- Canonical site: `https://justinleblancmusic.50by50.dev/`.
- Immediate rollback: `a3152e61-ed47-41a7-9595-ebd42e694245`.

## Final verification

| Check               | Result                                                               |
| ------------------- | -------------------------------------------------------------------- |
| Unit/integration    | PASS — 146 tests in 24 files                                         |
| Lint and typecheck  | PASS                                                                 |
| Astro               | PASS — 21 files, zero diagnostics, nine pages built                  |
| Playwright          | PASS — 34 cases, 26 intentional viewport skips across five viewports |
| Public-output audit | PASS — 15 built files scanned, zero findings                         |
| Secret scan         | PASS — zero findings                                                 |

Browser coverage proves exactly two planner steps. Step 2 retains the approved event fields and
exact planning labels, including **Location of the event**, **Performance time**,
**Sound / equipment needs**, **Budget (optional)**, and **Special requests (optional)**. There is no
step 3 and no retired atmosphere, timing-note, additional-note, consultation, availability,
booking, reserve, next-step, or tentative-hold control.

Required legacy property keys/default handling remain compatible with the inquiry contract, while
the deployed planner bundle contains none of `/api/time`, `/api/availability`, `/api/bookings`, or
public scheduling markers. Protected backend booking and assistant capabilities remain covered by
the existing test suite.

## Responsive and accessibility evidence

- [Homepage — 360px mobile](public-form-simplification-2026-09-23/homepage-mobile-360.png)
- [Homepage — 390px mobile](public-form-simplification-2026-09-23/homepage-mobile-390.png)
- [Homepage — 768px tablet](public-form-simplification-2026-09-23/homepage-tablet-768.png)
- [Homepage — 1280px desktop](public-form-simplification-2026-09-23/homepage-desktop-1280.png)
- [Homepage — 1440px desktop](public-form-simplification-2026-09-23/homepage-desktop-1440.png)
- [Recap — 390px mobile](public-form-simplification-2026-09-23/review-mobile-390.png)
- [Recap — 1440px desktop](public-form-simplification-2026-09-23/review-desktop-1440.png)

The live browser audit found no horizontal overflow and no console warning or error. Measured
contrast was 15.10:1 for recap text, 17.14:1 for consent text, and 8.99:1 for the checkbox border.
The optional marketing checkbox was unchecked.

## Read-only live smoke

- Canonical homepage: HTTP 200.
- Canonical `/plan-your-event/`: HTTP 200.
- Deployment URL: HTTP 200.
- `/api/health`: HTTP 200.
- Unauthenticated `/api/admin/state`: HTTP 401.
- `/admin`: HTTP 200 with `Cache-Control: no-store` and noindex.
- `/api/public-events`: exact safe HTTP 503 remains in place.

Live smoke was deliberately read-only. No inquiry was submitted, no consultation or hold was
created, and no provider resource or backend runtime service was changed for this static Pages
release.
