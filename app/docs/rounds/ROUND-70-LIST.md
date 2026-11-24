# Round 70 — the whole list

Two lists merged into one: the 18 app updates Andre and Claude settled on (Nov 15), and the NFC tag
round (`claude/round-70-nfc-plan.md` + `claude/round-70-starter-tags.md`). Nothing is left out.

## Part 1 — the app updates (1–18)

1. **A session that runs long.** After 8 hours (a setting) Op asks whether you're still working. No answer
   in 10 minutes (a setting) and the session ends at the last moment you touched the Mac, so the hours you
   weren't there don't count. "Still working" asks again 2 hours later. A break over 2 hours still becomes
   clocking out, and that limit is a setting too.
2. **Op lives in the bottom left.** His tab, what he says he did and anything he asks all sit in one corner,
   above the clock-in pill. No app name, no app icon.
3. **Good morning is yours to start.** "I'm up" lifts the alarm away quietly and keeps your wake time.
   Good morning has its own button there, and until noon a small bar at the top middle of the main focus
   page offers it: Start, or ✕ to leave it. Once it has played, or after noon, the bar is gone for the day.
4. **The journal bubble takes a voice memo.** A mic on the quick journal and on the Mac's floating bubble.
   Tap, talk, tap again: it saves to Journal → Memos. Writing is optional.
5. **Expenses have a type.** Personal, Business or a client, on top of the category. Pick it when you add
   one or change it later on its row. Filter by type, and see this month's total for each.
6. **The journal's search and sorting live behind one Filter button.** Hidden until tapped: search, month,
   day and tags, all in one place instead of doubled up at the top.
7. **Op can do everything.** Every part of the app, including writing to boards, when you ask. He never acts
   on his own and never asks first. He can read and explain your scoring (Mind, Finances, Consistency,
   Goals) but never changes it.
8. **Done means saved.** Op only says something is logged after the tool saved it. A small note in his
   corner says what he did; tap it for the whole thing. A failed save is tried once more, then said plainly
   in red. A touch he logs clears the follow-up that was due, so the overdue count resets.
9. **Inspiration reaches further.** A wide set of ideas (the piano first) grouped as Music, Make, Learn,
   Move, Mind, People, Home and Unplugged. Add your own with an emoji and a name. Log one for an earlier day.
10. **The key.** If Anthropic turns the key down, a notification says so with a button to Settings.
11. **Playbooks.** A client can be on several at once, each with its own progress. You or Op can make one
    from just a name or an idea and Op fills in the steps. A client with a live campaign in Social joins the
    ad-management playbook by itself; you can still add anyone by hand. When a campaign ends or pauses, the
    app asks what to do with them.
12. **The XP center.** Inside Personal → You, small and built in, colourful: your XP, your level, and every
    quest you can claim (daily, goals, locking in). A level up waits as a Claim button and pays off with
    fireworks. Consistency counts tasks, work time, client touches, workouts and habits.
13. **Client journals take photos and screenshots.** Drag and drop or an upload button. Thumbnails on the
    entry, tap for the big one. Op can see them.
14. **The streak survives days off.** Break days, off days and shooting days you mark keep the streak where
    it is: no +1, no break. Mark them up to a month ahead when you lock in. All of it is in settings.
15. **View all sessions opens the list.** Every session with its date, start and end, length, what you worked
    on and its breaks. Edit or delete one from the row.
16. **Sealed messages.** "Keep bringing it back" is gone. One small Repeat button in its place.
17. **The menu bar acts right away.** Lock out, Take a break / End break, and Stop music, with no window and
    no sheet to hold. Music stops by itself when you lock out or take a break.
18. **Client backlog: last month's work can still be done.** Add tasks from an earlier month against their
    deliverables. They say how many days late they are, and finishing one counts for the day you did it.

## Part 2 — tags (19–47)

### The tag engine
19. **Tags list** in Settings → Tags: name, where it lives, what it does, last tapped, taps, on/off.
20. **Each tag has its own secret** (128-bit). Turning a tag off, or making a new link, kills the old one.
21. **The tag link** `http://<host>:8940/t/<secret>` works from a browser, from the iPhone's banner and from
    a Shortcut, with no header to set.
22. **A tap runs the tag:** its steps in order, a second read within 2 seconds ignored, the tap logged, and
    an answer in plain words.
23. **Already done is not an error:** "Already locked in, 1h 12m."
24. **One tag, many steps** — not one action per tag.
25. **Rules per step:** time of day, locked in or not, on a break, sleeping, the alarm ringing, already out,
    first tap of the day. So one tag locks in when you're out and locks out when you're in.
26. **Place is a suggestion.** Picking an action suggests where the tag goes; any action can go on any tag.
27. **Duplicate a tag, reorder its steps.**
28. **Every tap** goes to Op's feed and shows as a note on the Mac. A tap also says where you are.
29. **Safety:** only the catalog's actions, nothing that deletes, rate-limited, private network or tailnet only.

### Setting one up
30. **The Add a tag wizard:** pick what it does (big cards, several at once), name it with a suggested place,
    pick Tap and open or Hands-free, then "Tap your tag now" — it shows a check the moment the tap lands.
31. **Test now** runs a tag's steps from the Mac.
32. **A Copy button per field.** No commands to paste.
33. **The starter set in one tap** (below).
34. **The setup check:** phone server on, address reachable, code accepted, this build supports each action,
    the Mac stays awake, Tailscale. Each line says what to fix.
35. **The writer-app steps** with a QR of the link.
36. **Op walks you through it** (`tags_help`) and can list, make, edit and run tags.
37. **A quiet tag** (14 days) or a changed address says so.

### The phone
38. **The phone page rebuilt:** Now, Op, Tags, Log. Every tag action is also a button there.
39. **Quick logs** as one-tap chips: water, workout, meal, weigh-in, mood, and a task.
40. **A real home screen icon**, standalone, with the app's colour.
41. **Live:** refreshes while it's open, and says plainly when the Mac is asleep, the code is wrong or the
    build is too old. `GET /api/version` so an error can explain itself.
42. **Op's real voice on the phone** (`POST /api/speak` through the helper), not the iPhone's robot voice.
    Short, speakable replies. A per-tag choice: speak on the phone, speak on the Mac, text only, or silent.
43. **Talk to Op from a tag** — dictate, and he answers out loud.

### Online
44. **Tailscale (free):** the tailnet is allowed, the Settings card walks you through it, and the tag links
    and QR use the tailnet address so everything works away from home.
45. **One host, chosen for you**, and it says when the address changed. **Keep the Mac awake for tags.**

### What the tags do
46. **The sticky reminder.** A gently pulsing pill on every page of the Mac app and on the phone: "Log your
    meal", "Log your workout", "Log your weight". It doesn't time out and doesn't block anything. It stays
    until you log it or tap Skip this one. Several stack as one pill with a count. It's in Notifications too.
47. **The starter set**, each one a preset you can change:
    1. **Desk** — lock in; tap again to lock out, with the session length. A second tap within 10 minutes
       asks first, so a double read can't end a session.
    2. **Break** — start a break (15 min, editable); tap again to end it.
    3. **Sleep (nightstand)** — alarm ringing: snooze, and it says the new time. Not ringing: go to sleep,
       Op says goodnight and stays quiet until the alarm. The tap is when you went to bed.
    4. **Awake (nightstand)** — ends sleep, saves how long you slept, and starts Good morning, which opens
       with the number ("7h 12m, in bed at 11:20"). Op speaks on the Mac by default; a setting moves him to
       the phone. No tap and it falls back to the old way, marked estimated.
    5. **Door** — leaving: Shooting, Training, Errand or Other. Locked in when you leave: it becomes an
       ordinary break with the reason on it, and carries on when you're back. Coming back ends the mode and
       leaves a sticky reminder to log the workout or the shoot. Forget the tap and the Mac asks when it
       sees you again.
    6. **Kitchen** — a sticky "Log your meal" and the phone opens on your most-used meals. One tap logs it.
    7. **Weigh-in (bathroom)** — the phone asks for the number, saves it, and Op says the change from last
       time. Hands-free, the Shortcut asks for the number and sends it with the tap.
    8. **Talk to Op** — keychain or phone case: dictate, and he answers in his voice.
    Also shipped, off by default: **Gym bag**, **Reading chair**, **Phone box**, **Add a task**, **Custom**.

### Waiting
- **Room lights** (plan part F). Andre: no lights for now.
- **A real iPhone app** (Core NFC, Siri, widgets) and **cloud sync so it works with the Mac off**: their own
  rounds, later.
