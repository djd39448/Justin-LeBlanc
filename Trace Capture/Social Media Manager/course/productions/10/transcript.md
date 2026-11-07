# Lesson 10 transcript: Capstone: cloud to contract

## Your final project

Choose a small idea you care about, or continue the fictional inquiry tracker. The goal is not to produce a polished app in a single sitting. It is to demonstrate that you can lead the process from an unstructured idea to a bounded, testable plan and explain how execution would be verified. Use synthetic examples and avoid sending real messages or changing outside systems as part of this exercise.

## Capture and align

Write a brief brain dump. Include the problem, people, desired experience, constraints, and uncertainty. Ask an agent for a structured readback and correct it. Your final journey must name an actor, trigger, actions, and result. Record what you agreed and what is still unknown. If the agent proposes technology before understanding the desired behavior, bring the conversation back to the readback. If the behavior is already agreed, proceed from that point.

## Research and decide

Create a small reality scan: what exists, what is verified, what is merely planned, and what you cannot yet know. Cite actual evidence where available. List two material decisions, compare options, and record choices with reasons and reopen conditions. For the tracker, you might choose to support the existing form first and defer email import. Do not mark a real integration live based only on a planned diagram or a simulated response.

## Map and specify

Draw a component diagram and trace one successful and one failed workflow. Identify the source of truth, an access boundary, and at least one recovery concern. Write a build specification with scope, non-goals, input validation, expected outputs, state changes, errors, security, preservation requirements, acceptance checks, and rollback. Translate broad claims into observable behaviors. If the owner says the tracker must never send an automatic email, the spec must preserve that boundary.

## Plan the kickoff

Break the work into ordered phases. Give parallel work exclusive ownership and define shared interfaces first. Write a kickoff with the project location or placeholder, baseline, read order, authority, decisions, sequence, verification, usage policy, and handoff. Explain how the agent should proceed if a model is unavailable or usage is unknown. Include a checkpoint and stop conditions for a long run. Planning does not by itself authorize deployment or unrelated external changes.

## Review it cold

Read the package as someone who has not heard your conversation. Can they tell which documents govern a behavior? Can they identify the first safe action? Is each important claim paired with appropriate evidence? Does the plan say what stays unchanged? Are failures and uncertain effects recoverable? Use the rubric below. Revise the package where a fresh reader must guess. A successful capstone is clear, bounded, testable, authorized at the appropriate stage, and restartable.

## Choose a small scope

Pick a project small enough to describe in a few sentences. The inquiry tracker is a good example because it has a public input, a private owner, a record, and meaningful failure cases. If you choose your own idea, write the real outcome and explicitly exclude at least one tempting future feature. You can work with an agent throughout the exercise. The goal is to create a package that preserves your intentions and gives another agent an actionable, testable starting point.

## Assess the readback

Give your raw idea to the agent and ask for a structured mirror. Compare its description to what you intended. Check the people involved, the trigger, the actions, and the final state. Correct an assumption or ambiguity. Record the final agreed statement and any unresolved questions. A fresh reader should be able to distinguish what you actually said from what the agent suggested. If a decision is already settled, include its source rather than forcing an unnecessary repeat discussion.

## Assess the design

Inspect your architecture diagram. Does each component have a clear job? Can you trace a valid request from beginning to end? What is the authoritative record? Where do untrusted inputs enter? Who may view or change private data? Now trace a failure, such as a storage outage. A diagram can be simple, but the explanation should make responsibilities and recovery visible. If the diagram requires facts you have not checked, label them as assumptions.

## Assess the contract

Choose three requirements and ask a fresh reader to describe how each would be proven. Add acceptance criteria where answers differ. Include a success path, invalid data, and at least one failure or authorization case. List what the build must preserve. Describe a safe order of work and a proposed rollback. If implementation needs a provider or an owner's permission, state that boundary explicitly rather than silently assume it will be available.

## Assess the handoff

Your final kickoff and handoff should let a new agent find the governing documents, identify the revision or baseline, know what is allowed, and take the first safe action. Ask the fresh reader to identify any contradiction or missing dependency. A useful handoff also distinguishes built, offline-tested, provider-accepted, live-observed, and pending. If your capstone is only a plan, say so. That is a valid outcome for this exercise.

## Use the feedback

Score each rubric item and write down any place the reader guessed. Revise your package and ask the reader to explain the revised section again. A simulated agent review can find confusing language, but it is not the same as observing a real beginner. Keep the useful lessons for your next project: a better prompt, a clearer template, or a failure pattern worth documenting. You have now practiced the entire method from cloud to contract and have a foundation for authorizing a safe build.

## Transfer the work

Now imagine your project grows or you hand it to another team. Which decisions should remain stable? Which assumptions are tied to the current environment? Which costs or permissions need fresh confirmation? Write a short note that answers these questions and points to the relevant artifacts. This is how the workflow scales beyond a single prompt: understanding, decisions, evidence, and the next action remain available even when the original conversation is no longer in context.
