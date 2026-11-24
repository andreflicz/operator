# Round 58: everything from Andre's Op session (Oct 31), in one list

Compiled from the whole chat with Op and from what Op actually logged. Op logged some items twice, paraphrased
others, and missed several (marked **missed by Op**). Andre's own words are quoted where they matter.
"R57 bug" means the problem is in Round 57's code and the likely cause is noted.

## A. Op and logging updates
1. **Save the update text verbatim.** "Maybe we just take my text verbatim and save it into the update." Op paraphrased
   every one.
2. **One place for updates.** "Can we just put them all in one spot. This is so confusing." Everything goes to the
   App updates journal, tagged Update. The separate "Op's ideas for the app" list goes (R57 bug: `r57Log` writes each
   one to both lists).
3. **Op says "logged" only when it really is, and logs every item.** He said "logged" for things he hadn't saved, then
   admitted "I haven't logged the whole thread yet". When asked to go back through the chat and log everything, he
   didn't. **missed by Op**
4. **"Mark that as an update" works the first time.** Andre had to ask twice. Junk entries also landed in the list
   ("In the journal under Update." twice). **missed by Op**
5. **A list mode.** "Listen to all of them… when I say I'm done, list out everything… get the green light… put it in
   the journal." Op must hold the items, read them all back, and save them only on a yes. **missed by Op**
6. **Op can remove or fix a work session.** "Can you remove that last work session… I definitely did not just work
   for 10 hours." Op has no tool for this. Also catch a session that's obviously too long: 832 minutes stayed open,
   because R57 sessions only end when you end them, so warn about it instead of logging it silently. **missed by Op**
7. **Times on messages in Op's chat.** **missed by Op**

## B. Notifications and Op's notes
8. **One notification per action, not two.** R57 bug: logging an update fires two notes (the journal write and
   the idea log each make one).
9. **They fade out smoothly** instead of blanking.
10. **The top-right Op note gets a close button**, styled to match. **missed by Op**
11. **A notifications feed of everything Op sends or logs.** One short line each; tap one for the full detail of what he
    did. Op's logged updates don't show in Notifications today.

## C. Op's read and the typing
12. **The typing finishes the whole text.** "It'll type out… half of the second part, and then it'll just pop up all at
    once." R57 bug: a redraw during the typing replaces it with the full text.
13. **Op's read colours.** They clash on Business Overview. Restyle them, and use one look across every section.
14. **Op's read doesn't push the page around** when it appears ("it's just morphing the page"). Its space is reserved.

## D. Pop-ups
15. **A form pop-up sits over the page; nothing behind it moves or reshapes.**

## E. Op's window (the bubble) **missed by Op**
16. Bigger by default.
17. The area where the text lands is small and doesn't scroll. It needs to scroll.
18. Resizing it feels odd.
19. Better spacing. The Turn Op off and Full screen buttons "look kind of ugly".

## F. Voice
20. **No time cap.** He talks for several minutes at a time and it stopped mid-monologue.
21. **It doesn't cut him off mid-thought.** It cut him off during a short pause, even on a short message with the green
    bar moving. It stops only after a clear finish with nothing after it. (Hands-free listening ends after a short
    silence today, with a 5-minute cap. R57 only removed that for hold-to-talk.)
22. **Tapping the talk button while Op is speaking** stops his voice, finishes his text quickly with a nice animation,
    and does NOT open the mic. A double tap is what starts talking.

## G. Business
23. **Tabs in this order: Overview, Clients, Leads, Packages, Finances, Playbooks.** Clients and Leads become their own
    tabs; Playbooks moves to the end. (Log center needs a new home, probably inside Leads and Clients.)

## H. Playbooks
24. No Clients / Leads switch: all playbooks in one place.
25. Star a default playbook (for example the default one for leads).
26. **Overview:** like the Leads board, each active playbook (one with people on it) as a column of cards, and everyone
    not on a playbook at the bottom.
27. **Builder:** a separate place to make and set up a playbook, with a calendar view of how it's expected to run.

## I. Social: the content command center
28. **Remove the Clients tab.** (R57 put the content calendar there, so it has to move.)
29. **Overview's top: every account handle** (@commenccollective, @andreflix…). His own accounts look different from
    client accounts. Tap any account to open its analytics.
30. **Link each social account to a package.**
31. **Social goes full screen, like Inspiration:** a content mode with as much information as possible, looking great.
    It's the command center for content, for himself and for clients, and client reports live here. High priority:
    "We need to post content. That's so important."

## J. Packages
32. **A calendar on each package:** mark the day each client gets each deliverable (each reel, each post). It connects
    packages, deliverables, reels, tasks and social. With an account linked (30), that calendar is the account's
    content calendar.
33. **A package type for himself** (or anything not billed), so he can put his own brand on a package.

## K. Settings
34. **App updates:** remove the "counted as updates" line at the bottom. Everything there is an update.
35. **Connections & Data:** the Integrations / Payment / Square / Stripe header shows at the top of every part (Data,
    Test & demo, App updates). Keep it only on Integrations.
