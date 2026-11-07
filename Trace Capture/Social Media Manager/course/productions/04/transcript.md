# Lesson 4 transcript: Architecture and workflows

## A map of jobs

Architecture describes how parts of a system fit together and what each part is responsible for. You can think of it as a map of rooms and doors, not a shopping list of software brands. For the inquiry tracker, a form collects details, a service validates them, storage keeps an inquiry record, and a private view shows the owner what needs attention. A useful map says which part can change a record and how information moves among parts.

## Follow an inquiry

Start with the organizer submitting a fictional request. The form sends the fields to a service. The service checks required information and either rejects it with a useful explanation or saves one record. The owner then opens the private list and marks that record handled. Draw arrows for these moves. Identify the source of truth: the authoritative record that determines current status. If a copy or summary exists elsewhere, say how it stays consistent with that record.

## State over time

A workflow is a sequence of states and transitions. A state is a condition, such as new or handled. A transition is the action that changes it. List who can perform each transition and what happens if it fails. For example, if saving a submitted form fails, do not show a false success message. Show a useful error and preserve the user's input where possible. A clear workflow helps test more than the happy path, the sequence where nothing goes wrong.

## Trust boundaries

A trust boundary is a point where information crosses from a less trusted place to a more trusted one. A public visitor can enter text; the system must validate that text before relying on it. A private owner view should require appropriate access. Describe who may read or change each record and whether any information leaves the system. Do not allow an AI-generated guess to decide who is authorized or where money and messages go. Those important rules need deterministic checks: rules implemented so the same permitted input produces the expected result.

## Safe retries

Suppose the visitor presses submit twice because the network was slow. Without a design for duplicates, the owner may receive two records. Idempotency means repeating the same operation safely without duplicating its intended effect. There are different ways to achieve it, and the right approach depends on the system. The architecture should name the problem, the proposed identity or retry rule, and how the system reconciles an uncertain result before doing the operation again.

## Useful detail

A useful beginner architecture includes a simple diagram, component responsibilities, data flow, source of truth, user permissions, external integrations, failure behavior, and an operator recovery path. It also notes important alternatives. You do not need to select every framework to understand the design. Ask the agent to explain the diagram in everyday language, then trace one successful inquiry and one failed inquiry through it. If the explanation contradicts the agreed journey, fix the design before turning it into a build contract.

## Draw the system

Draw the organizer and owner outside the system boundary. Inside it, draw a public form, validation service, inquiry store, and private owner view. Label an arrow from the form to validation “submitted fields,” and an arrow to the store “validated inquiry.” The store returns a saved identifier, which lets the form show a real confirmation. The private view reads that record and can request an allowed status change. A text description alongside the diagram makes the same information available to a screen reader.

## When storage fails

Now imagine the store is unavailable. The validation service cannot truthfully report a successful save. It returns a failure the form can display. The visitor sees an explanation and an appropriate next step; the owner sees an operator diagnostic that avoids exposing the visitor's private details. Once storage returns, the visitor can retry under the agreed duplicate-handling rule. Drawing this path reveals a design need that a diagram of only successful arrows would miss.

## Who may act?

Who is allowed to mark an inquiry handled? The private view should not infer permission merely because someone knows a record identifier. An access mechanism should verify the user's identity and check the operation against trusted rules. Keep the decision as a concrete responsibility in the architecture. The exact identity provider can remain undecided until the project is ready to choose it; the need for an authorization boundary does not have to wait for a brand name.

## One source of truth

The owner may want a count of new inquiries and a detail view. These are two views of one authoritative record, not independent systems that each decide the status. If a count is cached, explain how it is refreshed and what happens if it is stale. A source of truth simplifies disagreements: when the count and detail view differ, the design says which record governs and how to repair the summary. It also helps tests target the right behavior.

## Repeat without harm

Imagine a user clicks submit twice or a response is lost after the server saves the record. The client may not know whether a retry will create a duplicate. The design can use an operation identifier, a uniqueness rule, or another suitable method; the correct choice depends on the existing system. Document the intended effect and how an uncertain outcome will be reconciled. “Just retry” is not enough when an operation can send a message, charge money, or create a duplicate record.

## Test the map

Ask a beginner to follow the arrows and explain what happens from submission to confirmation. Then ask where access is checked and what happens if storage fails. If the answers cannot be found, add a clear label or note. The exercise does not require complex diagrams or a particular drawing application. A few boxes, arrows, and a plain-language description can be a better design conversation than a crowded chart full of unexplained technology names.

## From map to spec

Once the responsibilities and paths are understandable, the build specification can define the exact behavior at each point. The diagram may say “validate inquiry”; the spec explains which fields are required, what error appears, and whether a failed submission creates a record. Keep the two consistent. If the specification reveals an unaddressed failure path, revise the architecture. Architecture is a working model that helps people make decisions, and it can evolve as long as changes are recorded and agreed at the appropriate level.
