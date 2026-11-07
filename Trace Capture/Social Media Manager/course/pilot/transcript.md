# Lesson 1 transcript: The whole system

## One messy idea

Imagine you have an idea for a small tool. You are a performer, and event organizers contact you by email, text, and web form. You want one place where you can see each inquiry and what needs a reply. You tell an AI agent, “Build me something that keeps track of my inquiries.” The agent may immediately write code. That feels like progress. But what exactly is an inquiry? Who uses the tool? Should it send messages? What happens when two messages describe the same event? Until those questions are settled, a fast build can make the wrong assumptions very efficiently.

## Cloud → contract → code

This course teaches a different starting point: slow down long enough to make the important decisions visible. Then give the agent a clear path to build and prove the result. We call the journey cloud to contract to code. The cloud is the messy idea you start with. The contract is the shared description of what must happen and how we will know it works. The code is the implementation that follows. The aim is not to make you a programmer overnight. It is to help you lead the conversation and recognize whether the resulting work matches what you asked for.

## Two loops

There are two loops. The first is the conversation loop: spill, mirror, research, decide, and agree. The second is the delivery loop: establish a baseline, build, verify, prove, and carry the learning forward. A loop can repeat. You may discover a contradiction during research and return to the readback. A failed test can send a change back for correction. The order gives us a map, not a reason to ignore new information.

## Start with a brain dump

In the conversation loop, you begin with the brain dump. Say what you are trying to accomplish, what frustrates you, who is involved, what you have tried, and what you are unsure about. You do not need a polished prompt. You can say, “I have three places where inquiries arrive, and I keep losing track. I need to see what needs a response. I am not sure whether this should send emails automatically.” That uncertainty matters. It is part of the idea, not a mistake to hide.

## Mirror the idea

Next comes the mirror. Ask the agent to repeat back the goal, people, desired experience, constraints, assumptions, and open questions. In our example, it might say, “An organizer submits details; the performer sees one inquiry and can mark it as needing a reply or handled.” You can correct it: “Yes, but I want to decide what to send myself. Do not send emails automatically.” The important thing is that the agent describes behavior you can recognize: who does what, in what order, and what result they see.

## The alignment gate

That creates an alignment gate. A gate is simply a point where we check whether a condition is true before going on. Here, the condition is that the owner recognizes the readback as the intended experience. You can say, “Yes, that is right,” or keep correcting it. This gate matters because architecture—the plan for how the pieces fit together—rests on the behavior we are trying to create. When a task is already agreed and authorized, the agent should recognize that and continue from the current stage rather than force you to repeat the whole conversation.

## Research reality

After we understand the intended experience, we research. The agent looks at what already exists and separates verified facts from plans and assumptions. Perhaps an inquiry form already stores event details, but there is no shared view of them. Perhaps a document says automatic email is planned, though no such feature is actually running. Those are different claims. This reality scan helps us avoid rebuilding something that already works or promising a feature that is only imagined.

## Make decisions visible

Then we make the decisions that change the design. For the tracker, should the first version accept inquiries only from the existing form, or also import old emails? What happens to duplicates? The agent can describe options, tradeoffs, and a recommendation. You decide the questions that change the outcome. A decision ledger is a simple record of the choice, why it was made, and what could justify revisiting it later. It keeps a future agent from reopening a settled question because the original conversation is no longer in its context.

## Architecture → specification

Only then do we describe the architecture and write the build specification. Architecture maps responsibilities and relationships: a form collects information, a record stores it, and a private view displays it. A workflow describes what happens over time, including failures. A build specification turns that design into precise behavior: required inputs, outputs, validation, edge cases, and acceptance criteria. Acceptance criteria are observable conditions that tell us when a requirement has been met. “The tracker is easy to use” is hard to prove. “A user can find a submitted inquiry and mark it handled” gives us a specific behavior to test.

## Authorize the build

The delivery loop starts by establishing the baseline: what files, version, and running behavior exist now. We then authorize the relevant work. Agreement on a design is not automatically permission to deploy it, spend money, send messages, or change outside systems. A kickoff is the concise instruction a new agent can follow: where the work lives, which decisions govern it, what is allowed, which steps come first, and how to verify the result. If you already authorized a particular action, the agent should honor that authorization rather than ask for it again.

## Build in small slices

Build in small, complete slices. For example, first save a fictional inquiry and retrieve it. Next show its status. Each slice includes an appropriate check and leaves a record of what changed. A progress log tracks current work and blockers; a changelog records meaningful changes over time. A handoff tells the next person or agent what is done, what is uncertain, and the next safe step. These documents are useful because the next session may not have the original conversation.

## Evidence has levels

Finally, prove the right claim. “Implemented” means the capability exists in the code. “Offline-tested” means a check passed in a controlled environment. “Provider-accepted” means an outside service accepted a request. “Live-observed” means the real behavior was actually observed in the live environment. These levels are not interchangeable. For example, a test that simulates sending an email does not prove that a real organizer received one. Evidence is the concrete record behind a claim: a test result, a sanitized screenshot, a command result, or an observed live outcome, with enough context for someone else to assess it.

## Your turn

Throughout this course, we will keep returning to the same tracker. You will not need to write code to practice defining what should happen, asking for an architecture, or assessing a plan. By the end, you will have a set of artifacts that another agent can use without guessing what you meant. The central habit is straightforward: capture the idea, reach agreement on the experience, make the decisions visible, and ask for proof at the level you actually need.
