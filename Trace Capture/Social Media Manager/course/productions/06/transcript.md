# Lesson 6 transcript: Build specification and plan

## A build contract

A build specification is an agreement about what must happen. It lets an implementation agent make the right small decisions while leaving the important ones settled. Begin with the outcome, users, scope, and non-goals. Then describe behavior in terms of inputs, outputs, validation, state changes, errors, security, and the things the work must preserve. Link each important requirement to acceptance evidence. Include examples so a fresh reader can distinguish expected behavior from a plausible guess.

## Make it concrete

For the tracker, compare “validate the form” with: “Require a contact name and one preferred contact method. If either is missing, explain the missing field and keep the entered values. Do not save an incomplete inquiry.” This is a proposed example; the real owner must approve the fields. It tells the agent what to accept, reject, and show the visitor. It also creates several test cases without prescribing every line of code.

## Design acceptance

Acceptance criteria are conditions that can be observed. Assign stable identifiers such as A-01, and connect each to one or more checks. A-01 might say a valid fictional inquiry appears once in the owner list. A test could submit a valid synthetic record and retrieve it. Record the scope of the evidence: a local test demonstrates local behavior; it does not prove that a live provider is configured. Include negative paths, such as missing fields, unauthorized access, and a storage failure.

## Preserve boundaries

A spec must say what remains unchanged. If the existing public website is out of scope, explicitly preserve it. If sending email is not authorized, say that the tracker records status without sending messages. Name external dependencies, privacy expectations, and what happens when an integration cannot be reached. Write a concrete rollback: the way to return to the previous known state if the change fails. Do not pretend an untested rollback has already worked.

## Order the work

A plan orders the work. One possible sequence is to agree on the inquiry record, build validation and storage, build the owner view against the agreed contract, integrate, then verify. Parallel workers can work safely when their file ownership and interfaces are clear. If two people change the same shared contract at once, integration becomes harder. For each phase, list its goal, prerequisites, owned files or subsystem, checks, evidence, and completion condition.

## Ready for kickoff?

Before handing the plan to an agent, ask whether a fresh person could explain what is in scope, which decisions are settled, how success will be checked, and when to stop. Separate an approved plan from authorization to execute it. The kickoff will identify the repository, baseline, read order, allowed actions, forbidden actions, work sequence, proof, and handoff. We will build that briefing in Lesson 8. A good spec reduces guessing without making safe, routine implementation choices impossible.

## Name the outcome

For the tracker, the overall outcome might be that an owner can find and manage inquiries received through a web form. That sentence does not yet specify every field or validation rule. Add a scope section identifying the first release, such as public form submission and a private status list. Add non-goals such as email import, automatic replies, or payments if those are not part of the approved work. These boundaries protect both the owner and the implementation agent from assumptions.

## Inputs and errors

Write down the fields, which are required, how invalid values are identified, and what the person sees. “The form should be friendly” is a preference, but it does not define how an empty required field behaves. A stronger criterion says the field is named in a clear message and the previously entered values remain available. Also say whether the failed submission creates a record. These details give the developer room to choose the interface while preserving the important behavior.

## Proof you can trace

Connect each requirement to an acceptance ID and a check. For example, A-02 could describe rejecting an inquiry with no contact method. A test submits that invalid data and checks for both an error and absence of a saved record. Record whether the test runs locally, against a staging service, or in production. A green local check is useful evidence for local behavior, but it does not prove a live deployment is configured or that a provider delivered anything.

## Compatibility and undo

What existing data and behavior must remain intact? If an older inquiry already has a status, a new view should not erase it. If the deployment fails, the plan should identify the earlier version or reversal procedure and the point at which rollback is safe. Some changes, such as sending a real message, cannot be unsent; they need special care and explicit authorization. Label an untested recovery plan as a plan, then rehearse it when appropriate and allowed.

## Dependency graph

Before implementation, list what must exist before something else can be completed. The view depends on an agreed record format; tests depend on defined expected behavior. Workers may draft a view and validation logic in parallel after the shared format is agreed, but they should not edit the same files without coordination. The conductor collects each result and checks the integrated behavior. This is how parallel work saves time without turning shared interfaces into a guessing game.

## Walk three cases

Ask the agent to walk through one valid inquiry, one invalid inquiry, and one storage failure against the spec. Where it has to guess, add the missing rule or label it as an intentional implementation choice. Check that acceptance covers the non-goals too: if automatic email is forbidden, a test or inspection should show that submitting an inquiry does not trigger it. A good contract helps the team build the agreed outcome and recognize when work is still incomplete.

## Fresh-agent check

Imagine you are the agent seeing the project for the first time. Which document tells you what to build? Which decision explains why email import was deferred? Can you identify a task that can be completed and tested without waiting for an unrelated task? Can you state when to stop if access is missing? If the answer to any of these is unclear, add a specific reference or boundary to the plan. The goal is to remove consequential ambiguity while leaving room for reasonable implementation choices.
