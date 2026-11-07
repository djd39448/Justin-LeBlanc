# Lesson 9 transcript: Autonomous builds and recovery

## Bounded autonomy

An autonomous build lets an agent continue through an authorized sequence without asking for routine confirmation at every step. It does not grant unlimited permission. Define the goal, the approved scope, the definition of done, a deadline if relevant, and what actions are allowed. For the tracker, autonomous work might include implementing and testing a local feature. It does not automatically authorize sending real messages, buying a service, granting credentials, or changing an unrelated system.

## A durable loop

A useful loop is plan, build, review, fix, verify, and record. Work in small slices, and persist a checkpoint at meaningful milestones. A checkpoint is durable information that survives a session ending: current revision, completed work, checks, active processes, uncertain effects, usage where visible, rollback information, and the next safe action. A fresh agent should be able to resume from it without treating the workspace as empty.

## Work around a blocker

Some decisions need the owner. Write a Morning Unblock item containing the exact blocker, what was completed up to the boundary, and one action the owner must take. Keep that feature inactive if necessary and continue independent authorized work. If all remaining work requires approval or crosses a safety boundary, stop and report the blocker. Do not invent credentials or pretend a mock integration is live just to keep the loop moving.

## Recover before retry

Suppose an agent was interrupted after submitting a request to a provider. You may not know whether the provider accepted it. Blindly resending can duplicate the effect. First inspect the job, logs, and durable records; reconcile what happened. The same principle applies to a worker that may have committed changes before a session ended. Preserve valid work, identify the first unproven step, and only retry when the operation is safe to repeat.

## Protect the reserve

Check visible shared usage before substantial dispatch and after batches. Dave's example reserves 25 percent and stops discretionary cloud dispatch at 75 percent used; your own policy can differ. At the threshold, continue safe independent work through available deterministic or local means and preserve capacity for essential completion, recovery, and handoff. If usage is unknown, avoid discretionary cloud dispatch and retain only the minimum authorized cloud work needed for safe completion and handoff. The exact behavior must respect the actual platform and the owner's permissions.

## Morning proof report

At the end, report the outcome and links, revision, completed and pending work, tests and evidence, actual model routes and exposed usage, assumptions, blockers, uncertain external effects, rollback, and the next safe action. Label offline and live evidence correctly. Include the first few things the owner should inspect. If a deadline or blocker ends the run early, say so plainly. Completion is a proven state, not a confident sentence.

## Overnight contract

Start with the approved definition of done: for example, implement the fictional tracker locally, cover the agreed acceptance cases, and produce a restartable handoff. State the authorized workspace, the documents to read, any deadline, and a compact work loop. Tell the agent to make reasonable reversible decisions within scope and record them. Also state which decisions require the owner. A phrase like “do not stop” cannot authorize buying services or altering unrelated systems.

## Useful checkpoints

After a verified slice, record the revision, changed behavior, tests and outcomes, current status, next task, and relevant usage. If an external operation occurred, record its known or uncertain state without exposing secrets. A checkpoint can be a progress file or another durable record appropriate to the project. It should be updated before context is lost, not only at the very end. Small verified commits can supplement the checkpoint when the repository workflow permits them.

## Continue elsewhere

Imagine the private view can be built locally but the chosen identity provider requires a credential the owner has not granted. Record “Owner action: provide or approve the named access” and leave the real integration inactive. Continue documentation, synthetic tests, and independent interface work that does not require the credential. When nothing useful remains within scope, stop with the precise blocker. Never label the real identity integration complete because a fake test passed.

## An uncertain request

A timeout does not always mean nothing happened. If a real provider request may have succeeded, inspect the provider's record or a durable operation log through authorized read-only means before retrying. If the outcome remains uncertain, report that state and the exact action needed to resolve it. An idempotency key or similar design can make repeated requests safer, but it must actually be supported and used. Do not claim an operation is safe to repeat based on a name alone.

## Use the reserve

Before a batch, inspect exposed account usage. After the batch, record its outcomes and current usage if visible. Dave's default reserves 25 percent and stops discretionary cloud dispatch at 75 percent used; it is not a universal platform rule. Do not consume reset credits automatically. If usage cannot be checked, keep the state unknown and use conservative routes. A reserve exists so integration, review, safe recovery, and handoff are not stranded at the end.

## Make review easy

Write the report for a person who was asleep while the work happened. Put the outcome and artifact links first, followed by what is built, verified, unverified, or blocked. Include checks and evidence, the actual route and usage if exposed, decisions taken, unresolved effects, rollback, and the next action. Make the first few things to inspect easy to find. If the job ran out of time, report partial completion accurately rather than stretching the definition of done.

## Resume from reality

In the morning, the owner or a fresh agent should compare the handoff with the actual workspace. Check the revision, working changes, running jobs, and evidence before choosing the next action. If the handoff says a test passed but later code changes touched that behavior, the earlier result may no longer be sufficient. If an external operation is uncertain, reconcile it first. This short reality check preserves valid progress while preventing duplicate work or duplicate effects.
