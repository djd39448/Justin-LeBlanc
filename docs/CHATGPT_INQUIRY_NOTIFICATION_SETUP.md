# Justin ChatGPT inquiry-notification setup

Status: backend/provider acceptance is observed for the one synthetic inquiry; Justin account
authorization, Gmail inbox receipt, event-trigger task creation, and ChatGPT notification remain
pending observation. This document is an account-side setup guide, not evidence that the ChatGPT
layer is active.

ChatGPT's supported route is a Gmail event-triggered task in Justin's own eligible ChatGPT
account. The backend remains authoritative: it sends the `[JLM Inquiry]` email, and ChatGPT only
creates a privacy-conscious notification. The website must not call a personal-ChatGPT push API.
See the official [Scheduled tasks | ChatGPT Learn](https://learn.chatgpt.com/docs/automations?translationFallback=pt-BR)
documentation for current eligibility, connection, and task controls. UI availability can vary by
account, plan, client, and rollout.

## Justin account setup

1. In an eligible ChatGPT web or mobile client, sign in to Justin's own account. Do not share or
   request Justin's password.
2. Connect the Gmail inbox that receives the private `[JLM Inquiry]` messages, granting only the
   permissions shown by ChatGPT. Do not connect Dave's inbox as a substitute.
3. Create an event-triggered task/automation for new Gmail messages whose subject starts with
   `[JLM Inquiry]`. Keep notifications enabled through the account's normal notification control.
4. Paste the task prompt below verbatim. The task must not reply, forward, delete, archive, mark
   read/unread, label, or otherwise mutate Gmail.
5. Do not submit another inquiry for this release: the one authorized synthetic was already sent.
   After authorization, check whether that existing message is present and whether the task emits
   only one of the three approved sentences below. A future inquiry-based retest requires fresh
   explicit authorization. Record the observed result privately; do not put customer PII, the inbox
   address, or tokens in repository evidence.

If Gmail connection, the event-triggered task feature, or notification permission is unavailable,
leave this layer pending. The website, backend, outbox, and follow-up lifecycle can still be
released independently. Do not describe a configured-but-unobserved task as live.

## Copy/paste task prompt

```text
Watch the connected Gmail inbox for new messages whose subject begins with [JLM Inquiry]. Never reply, forward, delete, archive, mark read or unread, label, or otherwise modify any email. Never quote, summarize, expose, or repeat customer names, email addresses, phone numbers, event details, inquiry references, resume tokens, or any other customer PII. Emit exactly one of these notification sentences based only on the message's notification type: "A new Justin LeBlanc booking inquiry was received. Open Gmail to review it and follow up within 24 hours."; "A Justin LeBlanc inquiry is approaching its follow-up deadline. Open Gmail and confirm follow-up."; or "A Justin LeBlanc inquiry has passed the 24-hour follow-up deadline. Open Gmail and follow up now." Do not emit any other text, and do not treat opening Gmail or acknowledging this notification as customer follow-up.
```

## Release evidence

- Justin account authorization: **PENDING — root to fill after authorization**
- Event-trigger task created: **PENDING — root to fill after observation**
- Synthetic notification observed: **PENDING — root to fill with timestamp/result**
- Provider delivery status: **OBSERVED — one first-attempt SMTP/provider acceptance; inbox receipt was not observed**

The backend's protected `INQUIRY_NOTIFICATIONS_ENABLED` and `INQUIRY_NOTIFICATION_EMAIL` values,
dedicated inquiry-only SMTP gate, deterministic outbox, and 20-hour/24-hour lifecycle are
documented in [INQUIRY_ROUND_THREE_SPEC.md](INQUIRY_ROUND_THREE_SPEC.md). The recipient value is
runtime-only and intentionally absent from this document and the repository.
