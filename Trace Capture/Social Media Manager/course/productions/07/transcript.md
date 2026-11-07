# Lesson 7 transcript: Coding standards and evidence

## Standards for readers

Coding standards are agreements about how software should be written and maintained. You do not have to read every line of code to benefit from them. Ask whether a module has a clear responsibility, whether names explain intent, whether inputs are checked at boundaries, and whether the next person can find the behavior. Standards should help the agent create software that can be understood and changed without relying on the original author's memory.

## No silent failure

A silent failure happens when something goes wrong but the system hides the problem. Imagine the inquiry tracker says “Thank you” even though the record was not saved. That is worse than a visible failure because both visitor and owner believe the inquiry exists. A helpful diagnostic states what failed, where it happened, and what action may help, without exposing passwords, private customer content, or secret keys. The user-facing message and operator log can contain different levels of detail.

## Test the boundary

A test is a repeatable check of a claim. Boundary tests exercise the points where data enters, leaves, or changes state. For the tracker, try valid and invalid submissions, an unauthorized attempt to view records, and a storage failure. Use synthetic data for examples. Test both the result and important non-effects: an invalid submission should not create a record, and a failed save should not show false success. Ask the agent to explain which requirement each test supports.

## Small verified slices

A coherent slice includes the change, its relevant check, evidence, and an update to the project record. A commit is a saved revision in version control. Small commits can make a problem easier to locate and reverse. They are not automatically proof that behavior works. Keep scope and ownership clear, preserve unrelated work, and run the affected checks. Repeat checks when the underlying code changes, a check fails, or a new concern justifies it.

## Levels of proof

Implemented means present in the code. Offline-tested means tested in a controlled environment. Provider-accepted means an outside service accepted a request. Live-observed means the intended real-world effect was actually observed. These are different claims. For example, a fake email provider returning success proves the application handled the fake response; it does not prove delivery. A provider accepting a real message does not necessarily prove the intended person received it.

## Evidence and recovery

An evidence record identifies the version, commands or observations, results, time, and sanitized artifacts. Missing access is a blocker or an unverified gap, not a pass. Ask what happens when a change fails, how to restore the earlier state, and whether the restoration was actually rehearsed. Good review is proportionate to risk: protect critical boundaries while avoiding repeated full reviews that add cost without new information.

## Readable code

Imagine that six months from now the tracker fails and a new agent must diagnose it. Names like saveInquiry and listNewInquiries communicate purpose more clearly than doStuff. A module with a narrow responsibility is easier to locate and change than one that handles validation, storage, email, and presentation in a single block. Ask the agent for a map of dependencies and side effects. You do not need to prescribe every formatting preference to require that future readers can follow the system.

## A useful error

If a required field is missing, a visitor can see “Enter a way for us to contact you.” If the storage service is down, the owner may need an operational log naming the failing component and a safe troubleshooting action. Logs should avoid recording sensitive contact details, credentials, or raw external payloads unnecessarily. The point is not to make every error public; it is to ensure the right person can understand and respond to the failure.

## Test what must not happen

A negative test verifies behavior when something should not happen. For example, submit an inquiry without a contact method. Confirm the system rejects it and does not create a record. Attempt to open the owner view without authorization and verify access is denied. Simulate a storage failure and verify the public form does not display success. These checks often catch mistakes that a single successful example misses.

## Where was it tested?

A local test may replace a provider with a fake response. That can prove your application reacts correctly to that response, but it cannot prove the real provider accepts your account or delivers a message. A provider's acceptance is a stronger but still different observation from a real user seeing the effect. Record the environment and the exact claim. “Not yet tested” is a useful status when it keeps the next person from assuming proof exists.

## Review the change

A reviewer can ask: which requirement does this change implement? What inputs does it accept? What happens on failure? Which tests changed? Are secrets or private data exposed? Is there an obvious rollback? Does the documentation still agree with the behavior? A small verified commit keeps these questions manageable. Avoid rerunning the same complete suite repeatedly when nothing relevant has changed, but do run checks again when a change or failure makes earlier results stale.

## Follow the evidence

An evidence note can say: at this revision, the local validation suite ran and its stated cases passed; a separate live-provider check has not been run. Include the command and sanitized output when appropriate. If a screenshot shows a private list, use fictional records. The result should let another person verify the level of confidence without needing the original agent's memory or a polished summary that hides gaps.

## Show the proof

Ask the agent to pair each important standard with a concrete observation. For example, rather than saying “errors are handled,” show the test or code path that demonstrates a failed save does not produce a success message. Rather than saying “security is complete,” describe which access boundary was checked, in which environment, and what remains outside the test. Where the reviewer cannot reproduce or inspect a claim, mark the confidence accordingly. This practice applies even if you do not personally read the implementation.
