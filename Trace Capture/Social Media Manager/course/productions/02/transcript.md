# Lesson 2 transcript: Brain dump to alignment

## The idea cloud

Picture the inquiry tracker from Lesson 1. Its owner says: “Requests are in too many places, I forget to respond, and I need help.” That sentence is valuable, but it contains several possible products. We could build a shared inbox, a spreadsheet, an automated email service, or an inquiry dashboard. Your first job is to express the real problem in your own language. Include frustration, examples, constraints, and things you have not decided. You do not need to sort it into the perfect order. Ask the agent to hold its response until you say you are finished.

## Ask for a mirror

Once you finish, ask the agent to organize the material into a goal, people, desired experience, constraints, known facts, assumptions, questions, and non-goals. A non-goal is something the project intentionally does not attempt. This organized response is a readback: a statement of what the agent believes you meant. It is not yet your architecture. It gives you a surface to correct. Tell the agent, “Repeat this back before choosing tools or writing code. Point out contradictions and wait for my correction.”

## Behavior, not a feature

Compare “make a dashboard” with a description of an observable journey: “An event organizer submits a form. The performer opens a private list, sees a new inquiry, and marks it handled after replying.” The second description names a person, an action, and a result. If the agent adds “the system automatically sends a reply,” you can say, “No, I will write the response myself.” That correction is easy before the agent chooses a mail provider and builds an automatic sender.

## Fact, guess, unknown

A fact might be: “There is already a website form,” if someone has inspected it. An assumption might be: “The form stores every message,” if no one has checked. An unknown might be: “Can an inquiry be submitted without an email address?” This distinction is not a test of your memory. It is a way to make uncertainty visible so the team can research the right things. Contradictions deserve attention too: asking for automatic outreach and also saying no messages should leave without approval needs clarification.

## The alignment gate

Read the proposed journey and ask: does this describe what I want the user to experience? Correct it in ordinary language. When it is right, explicitly say so. This is an alignment gate, a check that the shared understanding is ready for design. The gate applies when you are still deciding what to build; it should not make you repeat yourself when you have already agreed and authorized a later task. Save the agreed readback so the next session can find it.

## A prompt to begin

Try: “I am going to describe the idea in pieces. Hold the context until I say done. Then repeat back the goal, people, observable journey, constraints, verified facts, assumptions, unknowns, and non-goals. Identify contradictions. Do not choose the architecture yet. Wait for my corrections.” The prompt is a starting point, not magic words. The important pattern is that you retain the authority to correct the agent's interpretation before an interpretation becomes implementation.

## One conversation

Here is what the first few turns might sound like. The owner says, “I lose event inquiries and want one list. I prefer to reply personally.” The agent asks to hear the rest and waits. The owner explains that requests arrive through a website and sometimes through email, that only the owner should see contact details, and that the first version can start with the website. The agent then summarizes those points. It does not quietly interpret “help me reply” as permission to send an automatic message.

## Correct the mirror

The agent says, “The system imports all your email into a shared dashboard.” The owner corrects it: “Only the website form is in the first version; I have not decided on email imports. The list is private, not shared.” A good agent updates the readback and keeps those two distinctions visible. If the owner says “That is right,” capture the resulting journey. If the owner says “Almost,” keep listening. A correction is a normal part of the process, not a failure of the owner to prompt perfectly.

## Show the journey

Write the journey as a short sequence: an organizer opens the public form; they enter contact and event details; they submit; the system either confirms a successful save or explains a failure; the owner later opens a private list; the owner reviews the inquiry and changes its status. Each sentence describes behavior that someone can later check. Ask what happens if the user abandons the form, if required contact details are missing, and if saving fails. You need not decide every implementation detail at this point.

## Keep claims honest

Imagine the owner says, “The website probably saves submissions.” Mark that as an assumption until someone checks the actual system. If the agent finds a form in the repository, it can report that the form code exists. It cannot conclude, just from the file, that the live site saves submissions successfully. Ask it to describe precisely what it saw. This habit makes later research efficient: you can target the uncertain claims that would materially affect the architecture.

## Translate the metaphor

An owner can say, “I want this to feel like a tidy inbox,” while also saying they do not want a copy of their email. The phrase conveys the experience but not the full feature list. Ask the agent to translate the metaphor into observable behavior and identify choices that remain. The owner decides what the metaphor means. This is particularly useful when an idea contains examples, comparisons, or partial solutions that could otherwise become hidden requirements.

## Save the readback

The output of this stage can be a small document or section: purpose, people, agreed journey, constraints, non-goals, verified facts, assumptions, and outstanding questions. Add a date and a clear status such as agreed or still being discussed. Keep it accessible to future sessions. Later, when the system changes, update or supersede the relevant decision rather than rely on someone remembering what was said. Now you have something concrete enough to research and design.

## Practice the mirror

You can also do the mirror exercise with a friend or by reading your own notes aloud. Ask the listener to describe the desired experience without naming a technology. If they cannot tell whether the owner manually replies or the software sends messages, add that distinction. If they ask how long records remain available and you do not know, mark it as an open decision. The purpose is shared understanding, not proving how much technical terminology you know. You can move forward when the central journey and decision-changing boundaries are clear, and continue to resolve smaller questions at the appropriate stage.
