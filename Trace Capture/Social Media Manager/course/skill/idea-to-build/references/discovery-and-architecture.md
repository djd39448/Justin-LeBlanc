# Discovery and architecture

## Capture and align

Start with the problem, people, desired experience, context, and constraints. Capture the user's language before translating it into technical requirements. Separate verified facts from assumptions and proposals. Identify contradictions and non-goals.

When alignment matters, describe the journey as observable behavior: who acts, what triggers the process, what they see or do, and what end state they expect. Ask for correction or agreement where the user requested that gate. A readback is not itself permission to build.

Example request: “Hold my context until I say done. Then organize the goal, people, experience, constraints, facts, assumptions, unknowns, and non-goals. Repeat it back and wait for correction.”

## Inspect and decide

Read the relevant repository, current configuration, evidence, and authoritative documents. Report what exists, what is verified, what is planned, and what is unknown. Seek additional material only when it changes the decision. Offer practical alternatives with tradeoffs and a recommendation when a material choice is unresolved.

Record each consequential choice with context, decision, rationale, status, consequences, alternatives, and a condition for reopening it. Retain dated supersession history rather than silently rewriting earlier decisions.

## Design the system

Describe components, responsibilities, dependency direction, sources of truth, actors, data flow, contracts, trust boundaries, integrations, state transitions, failure behavior, retries, idempotency, observability, and recovery where relevant. Explain rejected alternatives and open questions. Show the workflow over time, including partial failure and external effects. Do not confuse a proposed architecture with an implemented or deployed system.

Keep the design proportional. An isolated request does not automatically require a new architecture document. Use the project's existing document authority rules; a newer narrow approved decision supersedes an older one only where they conflict.
