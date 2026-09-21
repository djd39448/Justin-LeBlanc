# TrustCore — Coding Standards & Best Practices

These standards are non-negotiable. Every module, every commit, every test must follow them.
Any developer — human or AI — working in any TrustCore repo MUST read and follow this document.

This file is the complete standard. Point at it at the start of a session and you have everything
needed. The canonical form also lives in the Pinecone `trustcore-systems/coding-standards`
namespace (vector IDs `cs-00` through `cs-10`). Per-repo addenda (e.g.
`TrustCore-Engine/CONTRIBUTING.md` for TypeScript specifics) extend these standards — they do
not replace them.

---

## Intent (cs-00)

The goal is that any developer — human or AI — can be handed any TrustCore repo with zero
other context and immediately understand what everything does, why it exists, how it connects,
and how to work on it safely.

No tribal knowledge. No "ask the guy who built it." The code, the annotations, the tests, and
the commit history ARE the documentation. If someone has to ask what a module does, that
module failed this standard.

---

## Origin (cs-01)

These standards come directly from the project owner's words:

> "Maintain Pristine code best practices. No dark code, all code must be Annotated,
> modules must say what they do, what depends on them, what they depend on and why.
> All code must be linted before commit/push. No dumb or silent errors or failures.
> If something is wrong it needs to say what and how to fix. Test everything and make
> the tests transparent and reusable. Commit in small easy to roll back batches with
> detailed commit messages for easy debugging."

> "No spaghetti code. Make sure you build and document CLI for everything so an agent
> can use it."

---

## 1. Pristine Code — No Dark Code, No Spaghetti (cs-02)

### No dark code

- No mystery functions with unclear purpose
- No dead code left behind "just in case" — delete it; git keeps the history
- No magic numbers or unnamed constants — name them, even when they're used once
- No functions that do 5 things — each function does ONE thing
- No deeply nested logic — use guard clauses and early returns to flatten
- **Prefer obvious over clever.** A straightforward three-line loop beats a dense one-liner
  that has to be decoded
- No `TODO` / `FIXME` comments without a ticket reference or a date — unowned TODOs rot
- Name things by intent, not implementation (`calculateWeightedReward` beats `processData`)

### No spaghetti code

- Clear dependency flow — modules depend DOWN, never circular
- No function longer than ~50 lines — if it's longer, break it up
- No god-objects / god-modules that know about everything
- Each module has a single, clear responsibility
- Imports at the top tell you exactly what a module needs
- Side effects are explicit — don't hide network, DB, or filesystem calls inside innocuous-looking helpers

### Enforcement

- If you can't describe what a function does in one sentence, it's too complex
- If a module imports more than 5 other project modules, it's doing too much
- If you have to scroll to understand a function, it needs to be split
- If a reader has to run the code in their head to know what it does, the code is too clever

---

## 2. Annotation — Every Module Self-Documents (cs-03)

### Module-level docstring (REQUIRED on every source file)

Every module MUST have a docstring/header at the top that states:

1. One-line summary of what the module does
2. Longer description if needed
3. **Dependencies** — what modules it uses and why
4. **Depended on by** — what uses it and how
5. **Why this exists** — plain-English explanation of the problem it solves

**Python example:**

```python
"""Writes agent task rows and emits status transitions.

Dependencies:
    - core.db: Shared Postgres pool.
    - core.events: In-process event bus for dashboard subscribers.

Depended on by:
    - api.agent_v1: Only path through which agents write task state.
    - dashboard.task_stream: Subscribes to emitted transitions.

Why this exists:
    All task durability routes through this module so the audit trail
    is guaranteed. Direct DB writes from agent code are disallowed.
"""
```

**TypeScript example (JSDoc):**

```typescript
/**
 * Reconciles memory facts into tentative / verified / retracted states.
 *
 * Dependencies:
 *   - memory/store: Raw immutable memory chunks.
 *   - memory/contradictions: Contradiction detector.
 *
 * Depended on by:
 *   - api/memory: Exposes promoted facts via /memory/facts.
 *   - eve/evals: Reads verified facts as ground truth.
 *
 * Why this exists:
 *   Raw memory chunks are never mutated. All derived fact movement
 *   is funnelled through this module so provenance stays intact.
 */
```

### Function/class docstrings

- Every public function gets a docstring with Args, Returns, and behavior description
- Private functions (prefixed `_`) get a one-liner if the name isn't self-explanatory
- Type hints / type annotations on all public function signatures — no untyped public APIs

### What NOT to annotate

- Don't add comments that just restate the code (`# increment counter` above `counter += 1`)
- Don't add comments on code you didn't write or change
- Comments explain **WHY**, not **WHAT**

---

## 3. Linting — Clean Before Every Commit (cs-04)

### Tool per language

| Language       | Linter/Formatter            |
|----------------|-----------------------------|
| Python         | `ruff`                      |
| TypeScript/JS  | `eslint` + `prettier`       |
| Go             | `go vet` + `golangci-lint`  |
| Rust           | `clippy`                    |
| PowerShell     | `PSScriptAnalyzer`          |

### Rules

- Zero lint errors before any commit (no suppression directives unless genuinely necessary with an inline explanation)
- Import sorting enforced (Python `I001`, TS `import/order`)
- No unused imports, no unused variables
- Line length 100 chars max unless the language community norm differs

### Pre-commit check

Before EVERY `git commit`, run the linter on changed files and the test runner on touched
test dirs. Both must pass. No exceptions. Wire these into a pre-commit hook so they can't
be skipped accidentally.

**Python:**

```bash
python -m ruff check <changed_dirs>
python -m pytest <relevant_tests> -q
```

**TypeScript:**

```bash
npx eslint <changed_files>
npx tsc --noEmit
npx vitest run <relevant_tests>
```

---

## 4. Error Handling — No Silent Failures (cs-05)

> "No dumb or silent errors or failures. If something is wrong it needs to say what and
> how to fix."

### Rules

- NEVER use bare catch-alls that swallow errors (`except:`, `except Exception: pass`, `catch {}`, `_ = err`)
- NEVER use optional chaining (`?.`) or null coalescing (`??`) to silently paper over a null that indicates a real failure
- NEVER use `!` non-null assertions in TypeScript — every `!` is a lie to the type system; prove the non-null path with a check
- NEVER return `None` / `null` / `undefined` to mean "failed" — return a meaningful error type, or raise
- Every error must be logged with:
  1. **WHAT** went wrong — the actual error
  2. **WHERE** it happened — module, function, context (values of relevant variables)
  3. **HOW** to fix it — actionable message pointing at the next step
- Use the standard logging framework, not `print()` / `console.log()`. `console.log` is banned
  in TypeScript — use `console.error` / `console.warn` (stderr) for operational output
- Validate at boundaries — external inputs, API responses, subprocess outputs, DB rows — and
  fail loudly right at the boundary rather than letting a bad value propagate

### Examples

**Python — subprocess call across the WSL boundary:**

```python
# BAD — silent failure, caller has no idea what broke
try:
    result = subprocess.run(["python", "train.py"], capture_output=True)
except Exception:
    return None

# GOOD — specific exceptions, actionable messages, typed re-raise
try:
    result = subprocess.run(
        ["python", "train.py", "--config", cfg_path],
        capture_output=True,
        encoding="utf-8",
        errors="replace",
        timeout=timeout,
        check=True,
    )
except subprocess.TimeoutExpired:
    logger.error(
        "Training process timed out after %ds for config %s. "
        "Check GPU utilization with nvidia-smi; consider lowering batch size or max_steps.",
        timeout, cfg_path,
    )
    raise
except subprocess.CalledProcessError as e:
    logger.error(
        "train.py exited %d for config %s. "
        "stderr tail: %s. "
        "Re-run manually with the same config to reproduce.",
        e.returncode, cfg_path, (e.stderr or "")[-500:],
    )
    raise TrainingError(cfg_path, e.returncode) from e
```

**TypeScript — DB write that must surface null paths:**

```typescript
// BAD — non-null assertion hides the real failure
return result.rows[0]!.id;

// BAD — optional chaining silently returns undefined when the row is missing
return result.rows[0]?.id;

// GOOD — surface the null path with an actionable message
const row = result.rows[0];
if (!row) {
  throw new Error(
    `INSERT into ${table} returned no row for task_id=${taskId}. ` +
    `Likely a constraint violation or pool exhaustion — check pg logs.`
  );
}
return row.id;
```

**Principle:** every error message should tell the next person exactly what to do next.
If it wouldn't help a fresh session diagnose the problem, it isn't done.

---

## 5. Testing — Transparent and Reusable (cs-06)

> "Test everything and make the tests transparent and reusable."

### Coverage requirements

- Every public function in core business logic must have at least one test
- Every bug fix must include a regression test that fails before the fix and passes after
- Edge cases: empty inputs, `None`/`null` values, zero-length collections, missing keys,
  boundary values (0, 1, max)

### Test structure

- Test classes/suites grouped by feature: `TestTaskWriter`, `TestMemoryReconciler`, `TestAgentScope`
- Test names describe the behavior: `test_writer_rejects_direct_status_downgrade`
- Each test tests ONE thing — no 50-line tests that check everything
- Use helper functions for test data setup; helpers are reusable across test classes

### Test data

- Tests use synthetic data, not real API calls
- Mock external dependencies: network, third-party services, subprocesses, filesystem
- For DB-backed code: use a transactional rollback fixture against a local test DB, not mocks
- Tests must run offline and fast — target under 30 seconds for the unit suite
- Split slow integration tests (real GPU, real Postgres, real cross-agent) into a separate
  opt-in suite

---

## 6. Commits — Small Batches, Detailed Messages (cs-07)

> "Commit in small easy to roll back batches with detailed commit messages for easy debugging."

### Commit size

- One logical change per commit
- Module + its tests = ONE commit
- Bug fix + new feature = TWO commits
- Never commit 500 lines across 10 files in one shot

### Commit cadence

- Commit each logical unit of work as soon as it's complete and verified (tests passing,
  lint clean in touched files) — do not batch to the end of a session
- Stage only files created or modified in the current work session; leave pre-existing
  uncommitted changes alone so they don't get mixed in
- Never push, force-push, amend published commits, or do anything destructive without
  explicit approval

### Commit message format

```
<verb> <what> — <why/impact>

<body: 3-5 bullet points explaining what changed and why>

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

### Verb conventions

| Verb       | When to use                                       |
|------------|---------------------------------------------------|
| `Add`      | New feature/module (didn't exist before)          |
| `Update`   | Enhance existing feature                          |
| `Fix`      | Bug fix                                           |
| `Refactor` | Restructure without behavior change               |
| `Remove`   | Delete dead code/features                         |

### Example

```
Add contradiction-aware memory fact layer — reduce stale recall errors

- New tentative/verified/retracted lifecycle in memory_facts table
- Reconciler runs on MemoryCore.summarize() post-hook
- Raw memory chunks remain immutable; only derived facts mutate
- 14 new tests covering promotion, retraction, and provenance preservation

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>
```

---

## 7. CLI — Agent-Readable Interface for Everything (cs-08)

> "Make sure you build and document CLI for everything so an agent can use it."

### Every feature must have a CLI entry point

- If a human can do it in the UI, an agent must be able to do it from the command line
- CLI scripts live in a consistent location per repo (`scripts/`, `bin/`, or `cmd/`);
  TrustCore-Engine uses `scripts/ps/` for PowerShell orchestration and `scripts/` for
  Python/Node entry points
- Use the language's standard arg-parsing library: `argparse` (Python), `commander` (Node),
  `cobra` (Go), `clap` (Rust)
- `--help` must actually help — real examples, not boilerplate

### CLI documentation format

Every CLI script must show usage in its module docstring:

```python
"""Run a DPO experiment against a cached dataset.

Usage:
    python run_experiment.py                             # default config
    python run_experiment.py --config email-writer.yml   # named config
    python run_experiment.py --steps 200 --lr 1e-5       # inline overrides
    python run_experiment.py --resume run-042            # resume a checkpoint
    python run_experiment.py --json                      # machine-readable output
"""
```

### JSON output mode

- Every CLI that outputs data must support `--json` for machine-readable output
- Default is human-readable terminal output
- JSON goes to `stdout`, logs go to `stderr` so pipes stay clean

### Exit codes

| Code | Meaning                              |
|------|--------------------------------------|
| `0`  | Success                              |
| `1`  | Runtime error (with logged message)  |
| `2`  | Bad arguments                        |

---

## 8. Environment Gotchas — Hard-Won Lessons (cs-09)

TrustCore runs on Windows 11 with a WSL executor and a TypeScript Node runtime alongside
Python. These gotchas come from that mix. Each entry states the **symptom**, the **root
cause**, and the exact **fix**.

### WSL path mangling in Git Bash

- **Symptom**: `/home/...` or `/mnt/...` paths get rewritten to `C:/Program Files/Git/home/...`
- **Cause**: Git Bash path translation on Windows
- **Fix**: Prefix with double-slash to defeat the rewrite

```python
# Single-slash — Git Bash rewrites to C:/Program Files/Git/home/...
WSL_BIN = "/home/trustcore-rdp/.local/bin/mytool"

# Double-slash — preserved as-is
WSL_BIN = "//home/trustcore-rdp/.local/bin/mytool"
```

### Subprocess encoding across the WSL → Windows boundary

- **Symptom**: `UnicodeDecodeError` on subprocess output
- **Cause**: WSL binaries emit UTF-8; Windows default decoder doesn't tolerate it
- **Fix**: Always set explicit encoding with replacement

```python
subprocess.run(cmd, encoding="utf-8", errors="replace")
```

### Subprocess buffering (Python training scripts)

- **Symptom**: Training output appears in chunks or silence for minutes, then dumps
- **Cause**: Python stdout is block-buffered when redirected to a pipe or file
- **Fix**: Set `PYTHONUNBUFFERED=1` in the environment of the subprocess call

### Windows console Unicode

- **Symptom**: `UnicodeEncodeError` when printing em-dashes, checkmarks, emoji
- **Cause**: Windows console defaults to `cp1252`
- **Fix**: Reconfigure stdout at the top of any script that prints to terminal

```python
import sys
sys.stdout.reconfigure(encoding="utf-8")
```

(Ruff will flag `E402` on imports that follow this — this is an expected exception for
entry-point scripts only.)

### PowerShell script encoding

- **Symptom**: `.ps1` files with non-ASCII characters break on Windows PowerShell
- **Cause**: Default PowerShell encoding is UTF-8-with-BOM for saving, but consumers
  disagree on BOM handling
- **Fix**: Save `.ps1` files as UTF-8 without BOM; set `$OutputEncoding = [System.Text.Encoding]::UTF8`
  at the top of scripts that pipe to other tools

### TypeScript strict mode (TrustCore-Engine)

- `tsconfig.json` enforces full strict mode plus `noUnusedLocals`, `noUnusedParameters`,
  `noImplicitReturns`
- No `console.log` — use `console.error` / `console.warn` for all operational output
- No `!` non-null assertions — prove the non-null path with a check and a meaningful error
- No `async` functions without `await` — either remove `async` or restructure to actually await
- Don't use `?.` or `??` to silently absorb nulls that represent real failure paths

(See `TrustCore-Engine/CONTRIBUTING.md` for the full TypeScript addendum.)

### Agent API writes must go through `/agent/v1/`

- **Symptom**: Orphan rows in `tasks` table, missing audit trail, dashboard doesn't update
- **Cause**: Agent code wrote directly to the DB instead of through the scoped API
- **Fix**: All agent-origin writes route through `/agent/v1/` middleware. Direct DB writes
  from agent code are not allowed — they bypass scope enforcement and the audit trail

---

## Checklist — Before Every PR / Commit (cs-10)

```
[ ] Linter passes with zero errors on touched files
[ ] All tests pass (including any new regression test for a bug fix)
[ ] Every new module has the full docstring (what, depends on, depended by, why)
[ ] Every public function has type hints/annotations and a docstring
[ ] No silent error handling (no bare except/catch, no swallowed errors, no !, no ?. over real nulls)
[ ] Every error message says WHAT, WHERE, and HOW to fix
[ ] No dead code, no magic numbers, no unnamed constants, no untracked TODOs
[ ] No functions over ~50 lines; no modules importing >5 project modules
[ ] Commit message follows: verb + what — why/impact, then 3-5 bullet body
[ ] Commit is small enough to roll back without collateral damage
[ ] Staged only files from this work session (no pre-existing uncommitted changes mixed in)
[ ] CLI exists for any new feature with --help and --json
[ ] Environment gotchas from cs-09 accounted for (WSL paths, encoding, buffering, Unicode)
[ ] Agent-origin writes go through /agent/v1/, not direct DB
[ ] Runtime path removals satisfy cs-11: contents read, consumers identified, replacement smoke-tested, rollback documented
```

---

## 11. Capability removal discipline (cs-11)

> Runtime paths that serve production traffic cannot be removed without equivalent-or-better replacement proof.

**Why this exists.** Added 2026-04-24 in response to a Phase 1a incident: a 263-line file (`src/llm/anthropic-client.ts`) was deleted in a refactor on the claimed basis that it was "the API-key escape hatch." The file was in fact the active production path serving Claude Haiku via paid Anthropic API access for Alex and the live evaluator (slug `eval`, persona Eve). The PM reviewer approved the deletion without reading the file's contents. A pre-rebuild diagnostic caught the gap before containers were rebuilt; the incident would otherwise have caused a silent capability regression to local Ollama. See HANDOFF.md "Session Close-Out — 2026-04-24 (Recovery)" for the full incident account.

**Rules.** When a commit deletes, replaces, or bypasses a code path that could be serving production runtime traffic:

- The reviewer MUST read the deleted file's contents before approving the deletion. "Grep shows only N importers" is not sufficient — it tells you what depends on the file at the source level, not what the file does at runtime.
- The commit body MUST name the runtime consumers the file was serving, identified via: env var inspection, live container inspection, log evidence, DB evidence — whichever applies.
- The replacement path MUST produce equivalent-or-better behavior, demonstrated via live smoke-test evidence. Unit tests that mock the external service do not validate the replacement against the external service.
- The deletion MUST have a documented rollback path (specific commit to revert; specific env var to set; specific DB config to flip) that restores the pre-removal behavior without requiring new code.
- Removal of any auth-bearing path requires explicit operator approval after smoke-test evidence lands.

**Anti-patterns to catch in review:**

- Framing a file's deletion by its label ("escape hatch", "legacy", "deprecated") without evidence the label reflects runtime state. Labels describe intent, not behavior.
- Asking "who imports this?" instead of "what does this do at runtime?"
- Treating "test grid stays green" as evidence of runtime parity when the tests mock the removed path.
- Assuming an architectural invariant was in effect before the refactor without checking. Phase 1a's "CLI-OAuth only" was a target state, not a current state; the refactor mistook one for the other.

When in doubt: don't delete. Convert to a shim, flag for follow-up, or require a separate arc with its own smoke-test plan.

---

## Sync points

- **Pinecone**: this document is the source; the `trustcore-systems/coding-standards`
  namespace (11 vectors, `cs-00` through `cs-10`) is the retrievable index form. If you
  change a section here, re-upsert the corresponding `cs-XX` vector.
- **Per-repo addenda**: repos may add language- or runtime-specific rules on top
  (e.g. `TrustCore-Engine/CONTRIBUTING.md` for TypeScript strict-mode details). Addenda
  must not contradict this document — if they do, this document wins and the addendum
  gets fixed.
