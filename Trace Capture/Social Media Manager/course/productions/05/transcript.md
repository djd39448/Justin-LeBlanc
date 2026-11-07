# Lesson 5 transcript: Documents with distinct jobs

## One file, one job

Documentation works best when each document answers a clear question. A README is the front door: what is this project and where do I start? Session instructions, often named AGENTS.md, explain applicable working rules. A decision ledger says which important choices were made and why. An architecture document explains how parts fit together. A workflow document explains behavior over time, including failure. These documents serve different readers and should not silently contradict one another.

## Three design documents

The architecture shows responsibility and structure. The build specification states exactly what behavior must be delivered, including validation, boundaries, and acceptance criteria. The build plan arranges work into an order: what depends on what, who owns each part, and how completion will be checked. For our tracker, the architecture says a service validates and stores an inquiry. The spec defines the required fields and what the user sees on error. The plan says which part to implement and verify first.

## Execution memory

A progress log tells us what happened recently, what is underway, and what comes next. A changelog records meaningful changes over time. An evidence record captures what was actually checked, with the version and result. A runbook explains how to operate, inspect, and recover the system. A handoff is a concise restart point: the current state, known gaps, important decisions, exact blockers, and next safe action. A log is not proof by itself unless it points to appropriate evidence.

## Document authority

Documents have different authority. A more recent, explicitly approved narrow specification can supersede an older requirement where they conflict; other older requirements may still apply. A progress report can describe what someone believes is done, but it cannot turn an untested feature into verified behavior. A kickoff can authorize an agent to act within its stated scope. When instructions conflict, ask the agent to identify the actual source and the precise conflict rather than quietly choose whichever text is convenient.

## Avoid a paper maze

Not every tiny project needs a separate file for every concept. The important part is that an agent can find the decisions, scope, tests, operational steps, and current state. A small project might combine sections; a larger one may separate them. Use the simplest organization that keeps responsibilities clear. A naming convention helps, but a filename does not guarantee that a document is current or authoritative. Read its content and date.

## Trace a change

Imagine the tracker changes from three statuses to two. Update the relevant decision and spec, implement the change when authorized, record what changed in the changelog, record test results in evidence, and refresh progress and handoff. The architecture may not need to change if component responsibilities remain the same. This is why each document has one job: we can update the places whose truth actually changed without rewriting every page.

## The smallest useful set

A tiny project might start with a README, a decisions section, a combined architecture and specification, a plan, and a handoff. As the project grows, separate documents when readers need different levels of detail or authority. The aim is not to create files for their own sake. Ask whether a new contributor can find the current behavior, the reason behind a decision, what remains to build, and how to verify a change. If those answers are clear, the structure is doing its job.

## Which rule controls?

Suppose an older build spec says the owner can choose among three inquiry statuses. A later approved narrow spec says to use only New and Handled. The later decision controls that conflict. An older privacy rule that does not conflict can still apply. A helpful agent points to both documents and states exactly which clause changed. It does not discard every older requirement merely because a newer document exists.

## State vs. history

A progress log may say “validation implementation is underway; failure-path test remains.” A changelog may later say “added validation and clear missing-field errors.” Evidence records the actual check, revision, and result. These entries answer different questions and can refer to one another. They should not claim a deployment or live result until it has actually occurred. Keeping these roles distinct lets a reviewer find the current blocker without reading the entire project history.

## A restartable handoff

At the end of a session, tell the next reader the branch or revision, current work state, authoritative documents, tests run, unverified areas, running services if relevant, and exact next safe step. Mention any uncertain external effect that needs reconciliation. If the previous session ended after a provider request was sent, that uncertainty matters more than a long narrative about how hard the task was. A handoff is a practical starting point, not a congratulatory summary.

## Follow a requirement

Imagine the tracker owner changes the required contact method. First record the decision and update the approved specification. Then adapt the plan and implement within the granted scope. Add or update tests for both accepted and rejected inputs. Record the check and revision in evidence, update progress, and mention the material behavior change in the changelog. If the change affects data flow or responsibilities, update the architecture too. If it does not, leave unrelated sections alone.

## Conflicting documents

If the README says a feature is live while the handoff says deployment is pending, do not pick one sentence because it sounds more confident. Inspect dated evidence and current state where authorized. Report the contradiction and correct the stale description when the task permits. If the evidence is insufficient, label the status unknown. Documents are useful because they make information inspectable; they cannot substitute for the observation they claim to represent.

## The handoff test

Give a partner only your document map and a short project folder. Ask where they would find the original goal, an approved decision, a failed check, and the next safe action. If they cannot answer, the information may be missing, hidden, or duplicated inconsistently. Revise the map and try again. In a real project, a fresh agent can do a similar review, but label that as an agent review rather than claiming a human learner tested the material. The goal is that a newcomer can navigate without your oral explanation.
