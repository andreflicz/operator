# Round 60: Andre's updates (Oct 31, 5:08–7:50 PM), in one list

Compiled from the App updates Op filed. Op filed two of these twice (the Journal redesign); they're merged here.
"Likely cause" is a first read of the code and hasn't been checked yet.

## A. Op
1. **Op's read types twice, then rewrites itself.** It types the whole read, then starts again from the beginning; and
   sometimes, after it's done, it rewrites itself for no reason. Each read should type once and then stay put.
   Likely cause: the read is fetched again when the numbers behind it change slightly (its signature includes the
   facts), and Round 59 trims the stored text, so the "already typed" marker no longer matches and it retypes.
2. **Push-to-talk while Op speaks sends his message twice.** The text shows (good), but his reply lands in the chat
   twice. Likely cause (Round 59): the cut writes his spoken line into the chat, then the end of the turn logs his full
   reply again. The whole flow should work reliably: tap → voice stops, the text shows once, the turn finishes silently.
3. **Op actually carries out app changes.** When Andre gives Op an app change or feedback, Op must file it in App
   updates in that same reply, every time, and only say it's logged when the tool really ran. "I'm trusting you to
   get this done."
4. **Op's log notification moves and shrinks.** No long text blocks top right. When Op logs something, a short animated
   pop-up appears next to the XP at the top: a subtle white glow that feels like Op, with one short line ("Op saved
   something to App updates"). It can be expanded to the full text.
5. **Push-to-talk when the app isn't in front.** Make it clear whether push-to-talk works in the background and how to
   set it up (Settings → Op, or Op's page).

## B. Playbooks
6. **Presets when there are none.** Built-in, editable starting points, e.g. Onboarding (a new client's first week /
   first month) and Monthly client (weekly report, monthly report, the regular rhythm).
7. **Custom presets.** Save your own playbook as a reusable preset; start a new playbook from scratch or from a preset.
8. **Chaining.** When a client finishes one playbook they move on to the next by themselves (e.g. Onboarding →
   Monthly client), set up once rather than moved by hand. (The "When it ends → On to …" option exists; it needs to be
   obvious and work this way end to end.)

## C. Business
9. **Log center becomes a regular tab, after Leads:** Overview, Clients, Leads, Log center, Packages, Finances, Playbooks.
   The Log center button goes.
10. **Deliverables with any cadence.** Not only "× a week": e.g. 2 YouTube videos a month. Set the cadence per
    deliverable (a week / a month), and count and track it that way everywhere.
11. **A personal package.** When creating a package, mark it Personal: it's for Andre's own content, so no price or money
    fields and no "who's on it". He isn't put on it automatically; it's assumed to be his.
12. **The package calendar's hover text.** Hovering a day shows "r59PkDay" (an internal name). Show what's scheduled
    that day instead.

## D. Social
13. **Clients on Social.** There's no visible clients section; it isn't clear how to add a client's account or how
    clients are told apart (e.g. by colour). Add a clear clients section with a way to add and tell them apart.
14. **Top controls.** The swap button becomes a Settings button. Full screen and Refresh (top right) move down a bit,
    away from the level display.

## E. Calendar
15. **Controls.** Remove the Today button. One search-style button switches between your calendar and a client's.
    The client filter (top right) is easy to use. The legend goes behind a Legend button instead of taking space
    bottom left.
16. **Layout.** Op's read and the "Check in for October" notice share one line at the top. The calendar feels
    squished: give it more room.

## F. Personal
17. **Goals:** the year goals go at the very top of Personal → Goals.
18. **Journal, redone.** A prettier, inviting place to write; a cleaner list of entries; My Journal / Client Journals
    placed sensibly (not pushed to the far right); Client Journals' entries get a clean layout too. Boards stays as it is.
19. **Vault.** Keep the look. Make the logic clear: each capsule says when it opens (or "sometime this year"); filters
    for Open and Sealed; and the green check either explained or removed (a capsule written yesterday shows sealed while
    older ones show a green check, and it isn't clear why).

## G. Added to Round 60 (Nov 1)
20. **Holidays show everywhere.** With a background scene on (anything but Minimal), the scene covered the holiday
    decorations, and the Today banner was tucked inside the hero. Holidays show on every scene, with a proper banner;
    more holidays; and music for each one.
21. **Overview: Day streak and Today's Standard in one panel.**
22. **Widgets.** Every panel on Today can be resized (and moved): a fully customizable overview that still looks good.
23. **Overview revamp.** The hero (locked in or not) stays; the rest gets an upgrade.
24. **Log center: pick a date to reach out to someone** (a specific next-touch date).
25. **Calendar: a settings button** with your week / month check-in, check-out, and weekly / monthly goals.
26. **When does the week start?** It runs Monday to Sunday (Oct 26 was a Monday). Say so where it shows.
27. **Level-up animation:** part of the text on the right looks darkened (seen at level 10).
28. **Overview hero:** the weather / sunrise–sunset part is too long, and the player card in the middle may not be
    centered. Redo that part.
