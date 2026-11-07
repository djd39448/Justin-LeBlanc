# Lesson 8 transcript: Kickoff, routing, and usage

## The clean kickoff

A kickoff is a compact, executable briefing for a new agent or session. It identifies the project location and baseline, required reading, document authority, settled decisions, goal, scope, permissions, sequence, checks, and handoff. Imagine handing the tracker project to someone who has not attended any previous meeting. They should be able to locate the spec, know that automatic sending is out of scope, and identify the first safe task. They should not have to reconstruct decisions from a long chat transcript.

## Bound parallel work

You can use multiple agents for independent tasks, provided each has a clear assignment. Give a worker an outcome, relevant source files, exclusive file or subsystem ownership, constraints, acceptance checks, and a compact reply format. Define shared interfaces before separate workers depend on them. If one worker implements validation while another works on a view, their contract for the inquiry record must be agreed. A dispatched task is not complete until its result is collected and reviewed.

## Route by capability

Route deterministic tasks such as searching, formatting, or repeatable checks to ordinary tools when possible. Use a qualified local model for suitable extraction or drafting, and a capable lower-cost worker for bounded ordinary implementation. Reserve the strongest available conductor for architecture, difficult ambiguity, sensitive boundaries, integration, and final judgment. Verify what models and tools are actually available. A prompt cannot create a model, a capability, or a budget. Lower cost is useful only if the route can do the job reliably.

## Monitor shared usage

Before substantial dispatch and after a batch of work, inspect any available usage information and identify the tightest shared allowance. Dave's example policy keeps a 25 percent reserve and stops discretionary cloud dispatch at 75 percent used. These are configurable personal rules, not limits that every provider imposes. Mac and Windows may share the same account allowance. If usage is unavailable, report it as unknown, avoid discretionary cloud dispatch, and continue useful work with deterministic tools or qualified local capacity. Keep only the minimum authorized cloud work needed for safe completion and handoff. Do not invent a measurement or claim a hard stop is enforced when no tool can enforce it.

## Avoid wasted work

Record the route actually used, available usage, results, and the next action. Avoid filler delegation, paid polling, and repeating a check that already passed unless the code changes, a failure occurs, or a new concern arises. If a worker was interrupted, find out whether it finished or changed anything before retrying. Never automatically use reset credits. Account settings, host permissions, and the owner's instructions remain authoritative.

## A worker brief

Try: “Implement the tracker validation described in the approved spec. You own the validation module and its tests. Do not change the shared record contract. Use synthetic data. Run the affected checks. Return changed files, results, open risks, and the next integration action.” That worker has a bounded objective and a concrete output. The conductor still reads the result and integrates it against the whole project rather than treating parallelism as automatic proof.

## What goes in a kickoff

Start with the exact project and working directory, expected base revision, and instructions to preserve unrelated changes. List the documents in their authority order and summarize the decisions that are already settled. Describe the approved outcome, exclusions, allowed and forbidden actions, work sequence, acceptance checks, evidence, and handoff. If a new session cannot locate a file or reconcile a dirty workspace, it should report the specific issue rather than assume it can discard work.

## Parallel with boundaries

Worker one can own the validation module and its tests. Worker two can own the owner-view files. Their shared contract defines the inquiry identifier, fields, and status values. The conductor owns the shared contract and integration. Each worker gets a compact description, the relevant sources, an acceptance check, and the instruction to report changed files and unresolved risk. If a worker needs to change the shared contract, it should coordinate that boundary rather than silently diverge.

## Choose the route

A script can count missing files or run a deterministic check without a language model. A qualified local model may summarize a bounded source or draft a low-risk passage. A lower-cost cloud worker may implement a well-specified isolated component. The strongest available conductor can handle conflicting requirements, security boundaries, and integration judgment. Test model availability before relying on a route, and escalate when the work proves harder or riskier than expected.

## A quota example

Suppose a shared allowance is 60 percent used. Under Dave's example, there is still room before the 75 percent discretionary-dispatch cutoff, but the conductor should plan the next batch with the 25 percent reserve in mind. Suppose it is 76 percent used. The example policy stops discretionary cloud dispatch and preserves capacity for essential completion and handoff. It does not assert that every provider has the same window or that a percentage represents money. If the platform exposes no usage figure, say so.

## Reconcile the batch

After a batch, collect each worker's result, inspect the changes and relevant checks, and update the shared state. If a worker disappears, determine whether it left a commit, modified files, or is still running. An interrupted operation may already have produced an external effect. Investigate before resending or repeating it. Avoid paying another worker to reproduce work that was already completed, and do not assume a dispatched task succeeded merely because no error appeared in the chat.

## A compact response

Ask workers to return the task outcome, changed files, commands and results, evidence location, open risks, and the next integration action. This makes their output easy to compare and reduces long conversational handoffs. It does not replace the conductor's responsibility to inspect meaningful changes and verify the integration. The goal of token efficiency is to spend attention where it changes the outcome while keeping enough capacity to finish responsibly.

## Unavailable route

If the requested premium model is not available, the conductor must report the actual model and evaluate whether it is capable of the required judgment. It can use available tools for independent work and ask for help where a genuine capability or authority gap remains. It should not claim that a model was used simply because a prompt requested it. The same applies to usage monitoring: an instruction to check a quota is not proof that the host exposes a quota. Honest reporting is part of the routing contract.
