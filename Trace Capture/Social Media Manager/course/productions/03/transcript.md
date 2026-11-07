# Lesson 3 transcript: Research and decisions

## Research reality

Imagine the tracker owner believes an existing form saves submissions. If the agent designs a new database around that assumption without checking, the resulting plan may miss a system that already contains valuable information. A reality scan looks at the repository, documents, and the actual workflow the task permits the agent to inspect. Ask the agent to report what it examined and what it could not access. The goal is to ground design in the current world.

## Four evidence labels

Create four columns: verified, planned, assumed, and unknown. “The repository contains a form component” may be verified from code. “The form currently receives live submissions” requires stronger evidence than code alone. A roadmap item is planned. A belief that has not been checked is an assumption. If access is missing, call it unknown. A timestamp or revision helps another person know what the observation applies to. A clean-looking document does not magically turn a future goal into a live system.

## Trace one inquiry

For our fictional tracker, inspect the form, follow where its data goes, and ask what happens after a user submits. Does it show an error if saving fails? Does anything send a message? Is there one record or several copies? A repository inspection might reveal that the form stores inquiries, while email import is only a proposal. Record the exact source of each claim and the limits of the observation. We are not contacting actual organizers or sending real messages during the exercise.

## Compare the options

Suppose the team can either use the existing form only or add an email importer. Ask for each option's benefits, effort, dependencies, risks, and an explicit recommendation. The simplest choice may be to use the form first and defer import. That is not a promise never to build import. It gives the first version a bounded outcome. Ask the owner questions that genuinely affect scope, architecture, risk, or cost, instead of interrupting over every routine detail.

## Decision ledger

A decision ledger records context, decision, rationale, alternatives, consequences, status, and a condition that would justify reopening it. For example: “Provisionally use the website form for version one, subject to confirming it exists and works. Defer email import. Revisit when the owner has a tested export and approves the scope.” Mark a choice as accepted, provisional, deferred, or rejected. If a decision changes later, add a dated supersession note rather than silently pretending the old decision never existed.

## Turn unknowns into work

Before architecture, review the facts that materially affect the design. Which are verified? Which can be safely assumed for planning? Which require a decision? If you cannot access the live form, you can design around a clearly labeled assumption, but you must not claim its live behavior is proven. A useful research report ends with the exact evidence found, contradictions, recommended options, and the decisions that remain with the owner.

## Evidence walkthrough

For the tracker, a responsible investigator might open the form source, identify the handler that receives submissions, and inspect any existing test. The result could be: “A form component exists at this revision; a local test covers required fields.” That does not prove the deployed site uses the same revision. If deployment information is unavailable, record that gap. A screenshot, a source file, a test result, and a live observation support different claims. The reader should never have to guess which one was used.

## Ask a focused question

“Research everything” is expensive and hard to verify. Ask targeted questions: Where does the form send data? Where is the authoritative inquiry record? What happens when saving fails? Is email import actually implemented? The agent can inspect the relevant files and summarize with paths and evidence. If it cannot access a necessary system, it should state the exact limitation. This keeps the research proportional to the decision at hand and avoids drowning the owner in unrelated detail.

## Fair comparison

Suppose option one uses the form only. It is narrower and avoids an email integration, but the owner must handle email inquiries separately. Option two adds an email importer. It may reduce manual work, but requires access, a matching strategy, privacy decisions, and failure handling. A decision is easier when each option includes both benefits and costs. A recommendation should say why it fits the current outcome, not simply claim that one approach is best for everyone.

## Owner decisions

Some decisions can be made using ordinary project conventions. Others change what the product does or what access it needs. The owner should decide whether the first release imports an inbox, sends messages, or handles real customer information. The agent can recommend a safe default and do independent work while the answer is pending. Ask only the question that changes the design: “Should the first version include email import, or should it track form submissions only?”

## A reusable decision

A useful ledger entry has a title, date, context, accepted choice, alternatives considered, rationale, consequences, and an explicit status. A reopen condition might be “the owner approves inbox access and supplies representative synthetic export examples.” If a later decision replaces it, preserve the earlier entry and link the new decision. This history is useful because future contributors can understand both what was chosen and why a seemingly attractive alternative was deferred.

## New facts, new plan

New evidence can overturn an assumption. Suppose a live inspection shows that the old form does not save inquiries at all. Record the new observation, revise the dependency in the architecture, and tell the owner whether the scope or timeline changes. The decision ledger is not a rule against learning; it prevents silent changes and needless repetition. An agent should correct stale statements when it has evidence and clearly identify which claims remain unverified.

## Decide with uncertainty

If an important fact cannot be verified, write the uncertainty next to the decision it affects. For example, the team may provisionally design a form-only workflow while awaiting access to the existing form. State the assumption, who can resolve it, and what would change if it proves false. A provisional decision lets independent thinking continue without pretending the question is closed. When evidence arrives, compare it to the assumption and either confirm the decision or record a dated change. This approach is particularly valuable when an owner or outside provider cannot respond immediately.
