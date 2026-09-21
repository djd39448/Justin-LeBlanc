# Limited Calendar and tunnel setup

Recorded 2026-09-21 during the isolated Justin demo setup.

## Symptoms and causes

- Google sign-in completed, but the first grant omitted `calendar.app.created`. Sign-in success alone did not establish the requested Calendar access.
- After the missing permission was granted, Calendar creation returned HTTP 403 with `SERVICE_DISABLED`. The Calendar API was disabled in the OAuth client's existing Cloud project. This is a separate prerequisite from user consent.
- The Cloud Console initially used another signed-in account and displayed a project-access error. Switching to the existing project-owner account resolved that view; no IAM role or broad permission grant was needed.
- Cloudflare's browser Copy button did not populate the automation session's virtual clipboard. The owner transferred the new connector command through a temporary loopback-only password form. The form validated the intended account and tunnel and saved only the token to protected storage. No token was printed or committed.
- A read-only resource audit returned Cloudflare HTTP 401 after its existing Wrangler access token expired. Running `wrangler pages project list` refreshed the established authorization; the subsequent audit passed.

## Recovery rules

`scripts/google-authorize.ts` checks both limited Calendar scopes before attempting creation. It saves the refresh grant privately and reports sanitized provider reasons and the Calendar API activation URL. After API activation, use `--provision-only` with the protected environment file; a second sign-in is unnecessary when the saved scopes are correct.

The private `google-calendar-provisioning.json` records an attempted create before the request. An uncertain result blocks another create. A definitive rejected request permits retry after its prerequisite changes. A successful manifest repairs configuration from the recorded calendar ID without creating another calendar.

The active connector is recorded separately in private `tunnel-active.json`. An earlier failed API creation response in `tunnel-created.json` is not proof of the current tunnel's state. Verify the configured route and the actual public health endpoint. The connector token is passed with `--token-file`, never a command-line token value.

## Evidence and remaining limits

The public inquiry, scoped resume, chat, and rejection checks passed in [public API evidence](../evidence/public-api-smoke.json). The refreshed [resource comparison](../evidence/resource-isolation.json) found two Justin DNS additions and no changed pre-existing records or resources. [Google setup status](../evidence/google-setup-status.json) records the latest prerequisite state. Neither a healthy tunnel nor saved OAuth credentials proves booking, invitation, or invoice delivery.
