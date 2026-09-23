# Justin LeBlanc build instructions

Read `README.md`, `docs/PUBLIC_FORM_SIMPLIFICATION_SPEC.md`, `docs/ROUND_TWO_BUILD_SPEC.md`, `docs/BUILD_SPEC.md`,
`docs/WORKFLOWS.md`, `docs/ARCHITECTURE.md`, `CODING_STANDARDS.md`, and the current `KICKOFF.md`
before implementation. The dated 2026-09-21 plans and evidence remain historical context; the
2026-09-23 public-form simplification specification controls conflicting public-form requirements,
and the round-two specification controls other conflicting public-site requirements.

## Authority and scope

- Dave approved an isolated demo, preserving Justin's visual identity, with website,
  discovery form, voice, chat, calendar, email, and post-performance invoicing.
- Dave's 2026-09-22 round-two direction makes the public homepage conversion-first: render the
  planner in the opening experience, keep navigation pinned, add a sanitized live Public Shows
  Calendar projection, accept visitor-entered numeric budget, and remove all public chat/voice
  presentation. Preserve the voice/chat resources and backend implementation for a future explicit
  re-enable. See `docs/ROUND_TWO_BUILD_SPEC.md`; do not confuse planned work with deployed state.
- Dave's 2026-09-23 direction simplifies the public browser to a two-step, inquiry-only planner.
  Step 1 retains contact and preferred reply. Step 2 retains the existing event fields, relabels
  `Event city` as `Location of the event`, and keeps only Performance time, Sound / equipment
  needs, Budget (optional), and Special requests (optional) as planning-detail fields before the
  recap and consent controls. Remove every public consultation selector, availability/booking call,
  and post-submit reserve/tentative-hold card while preserving the private/backend consultation,
  hold, Calendar, assistant, and legacy-data implementation. See
  `docs/PUBLIC_FORM_SIMPLIFICATION_SPEC.md`; it supersedes older requirements only where they
  conflict and is not evidence that the change has deployed.
- Work only in this repository and new Justin demo resources. Existing TrustCore and
  Telnyx resources are read-only references. Never overwrite their agents, numbers,
  calendar event types, handlers, deployments, DNS, or credentials.
- Push small verified commits to this private repository as work progresses. This is
  explicit push authorization; no force-push or rewriting published history.
- Documentation session did not authorize launching the implementation immediately.
  Implementation begins when Dave submits `KICKOFF.md` in a new session.
- Choose reasonable demo defaults in `docs/DECISIONS.md`. Don't reopen settled product
  questions. Record assumptions and continue useful independent work.
- New spending, new credential grants, or unavailable account access must follow the
  actual host's approval rules. Do all independent work before reporting an exact blocker.
  Never pretend a mocked integration is live.

## Execution and cost

- Requested conductor: GPT-6 Astra, Ultra reasoning, coding mode; use an available
  Ultracode workflow if installed. A prompt cannot enable a model/tool that isn't available.
- Use plan -> work -> review -> compound. Use Compound Engineering commands when actually
  installed, otherwise implement the same phases explicitly; do not invent slash commands.
- Delegate bounded independent work with explicit file ownership and compact briefs.
  Route deterministic tasks to scripts; qualified local models to drafting/extraction;
  low-cost capable cloud workers to ordinary implementation; Astra to hard decisions and review.
- Before substantial dispatch and after batches, check usage. Reserve 25% of the tightest
  shared cloud allowance. At 75% used stop discretionary cloud dispatch. Unknown is not unlimited.
  Never redeem reset credits automatically or assume another host has independent limits.
- Confirm worker/model availability. Reconcile interrupted jobs before retrying. Record
  completed work, actual route and usage where exposed; no paid polling or filler delegation.
- If Switchboard is available or cross-session work is needed, first read the host's
  switchboard coordination playbook. On Dave's Windows host it is at
  `C:/Users/trustcore-rdp/.claude/skills/switchboard-coordination/references/codex-playbook.md`.
  Use start_session for nonblocking dispatch, identify origin, and avoid peer reply loops.

## Engineering

- Follow `CODING_STANDARDS.md` and `docs/CONTRIBUTING.md`. No copied credentials or customer PII.
- Maintain one canonical business record and one versioned KB for every intake channel.
- Business state transitions, money, auth, recipient gates and idempotency are deterministic.
- Tests prove behavior at boundaries. Run relevant tests once; repeat only after changes or failures.
- Log what/where/remedy without secrets. Every operator action has CLI help and JSON output.
- Update `PROGRESS.md`, `HANDOFF.md`, and acceptance evidence at meaningful milestones.
- Human and agent content must agree. No fabricated testimonials, prices, availability,
  venue rules, free-admission claims, or promises of search ranking.
