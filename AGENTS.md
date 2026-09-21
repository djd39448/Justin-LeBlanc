# Justin LeBlanc build instructions

Read `README.md`, `docs/BUILD_SPEC.md`, `docs/WORKFLOWS.md`, `docs/ARCHITECTURE.md`,
`CODING_STANDARDS.md`, and `plans/2026-09-21-build-plan.md` before implementation.

## Authority and scope

- Dave approved an isolated demo, preserving Justin's visual identity, with website,
  discovery form, voice, chat, calendar, email, and post-performance invoicing.
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
