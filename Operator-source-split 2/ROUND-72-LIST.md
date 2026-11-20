# Round 72 — the list

Andre's list from Nov 20, plus his tagged app updates from Nov 15–19. Where they overlap they're one item. Built on
branch `claude/round-72` (from `claude/round-70`, which has Round 71).

## Alarms and mornings
1. **Snooze is a snooze.** The Sleep tag used to call the *reminder* snooze when the wake alarm was going: the alarm kept
   ringing and a "Reminder (snoozed)" popped up later. It now snoozes the real alarm. The screen goes back to the time,
   with "Snoozed until 7:09" under it, and the music stops (a setting).
2. **Sleep and snooze have their own controls.** The ring screen has Snooze, I'm up and Turn off. Snooze is also its
   own tag step, so a tag can do only that. The Sleep tag still does both: snooze if the alarm is going, goodnight if not.
3. **Turn off the alarm from the app.** Turn off stops the ringing and leaves the clock on screen.
4. **"I'm awake" keeps the music.** The tag and the I'm up button log that you're up and stop the alarm. Your wake-up song
   keeps playing (a setting, off by default: "I'm awake stops the music").
5. **A Good morning tag.** Starts the Good morning sequence (and logs you're up). It's in the starter set.
6. **Good morning hands off to the app, not the lock-in page.** Its button goes to Today.
7. **The work alarm takes over the screen like Good morning does,** even if you've been on the Mac all morning. It
   shows the time, the weather, what's on today and the first thing up. Its button opens the lock-in page.
8. **The alarm list looks right.** Bold name in the middle, the time under it, and the switch can't overlap the time.

## Tags
9. **Tags never stop to ask.** No pop-ups and no press-and-hold: a lock-out tap right after a lock-in just locks out.
10. **Locking in from a tag has a moment.** A short lock-in animation plays, then the session starts and the music
    comes in the way it does when you lock in by hand.

## Op
11. **Good morning sounds like a person.** No coffee lines. A greeting that's different every day, the weather, one
    remark on how big the day is (not a rundown), then a line to get you ready to lock in. Never the same line twice in
    two weeks.
12. **"Read me the day."** Three short lines: where you are, what's next, and how the day's going. It works from a tag,
    from Op and from the phone, and it doesn't need the key.
13. **Op can do everything.** He can edit, add and delete work sessions (any of them, not just the one running), log
    shooting time, and run any button in the app when you ask him to.
14. **Op uses less memory.** Chat history is capped, old lines are trimmed, and spoken audio is released when he's done.

## Your time
15. **Auto lock-in, rebuilt.** A browser only counts as work when the app can see that the site is a work site:
    YouTube in Firefox never locks you in. Time with no keyboard or mouse doesn't count. An automatic session ends itself
    10 minutes after the work stops, back-dated to when it stopped. It only starts in your work hours, and never while
    you're asleep, shooting, off or on a break. Any session over 4 hours asks if you're still there.
16. **Clean up long sessions.** View all sessions has "Long ones": every session over 6 hours, with Trim and Delete.
17. **Shooting is its own time.** Shooting ends a lock-in instead of hiding inside it as a break (the Nov 17 bug).
    Six kinds of time: Focus, Shooting, Break, Off, Awake, Asleep. A "Your time" panel shows today and this week. "Log
    time" adds a stretch after the fact (e.g. shot 7 to 1).
18. **Locking in lands on Tasks,** never on Analytics.

## Music
19. **Music settings.** Automatic music: On, Fade away or Off. Choose which moments play music (locking in, work, Good
    morning, Inspiration), how long before it fades, the volume, and whether a break, a lock-out or a snooze stops it.
    Fade away is the default.

## Looks
20. **Calendar has room.** Days never overlap. The month gets its full height and the page scrolls if it has to.
21. **No level in the top right.**
22. **XP gets its own page.** Your card, your level and Claim, today's quests, every stat with what feeds it, the ranks,
    and where XP comes from. It's all on one page and nothing runs off to the right.
23. **Customize on Today:** small and medium widgets fit their boxes and line up with each other.
24. **Command View is customizable.** Customize on the board itself: show or hide each part, reorder them, small,
    medium or large, and new parts (a big clock, weather, today's calendar, your time, current mode, a note).

## Phone
25. **A real dashboard on the phone.** Now, Tasks, Calendar, Clients, Journal and Op, plus Alarms (see them and switch
    them on or off).
26. **Op talks on the phone.** The phone unlocks audio on your first tap, so his replies play. That was the missing
    piece on iOS. If the Mac's voice is off it uses the phone's own voice.

## From the tagged updates: already done or replaced
- "Lock-in state wrong on shoot days" → 17. "Calendar all messed up" → 20. "Yes fix it" (no context) → skipped.
- The song lyrics entry (Nov 19) isn't an app update.

## Judgment calls
- Fade away is the default for automatic music, after 6 minutes. Your wake-up song is never faded: that's your alarm.
- Auto lock-in only starts in your work hours if a work alarm is set. With no work hours it can start any time (as before).
- The 4-hour "still there?" check is for automatic sessions. Sessions you start yourself keep Round 70's 8-hour ask.
