# Round 64: Andre's updates (Oct 31, 10:46 PM – Nov 1)

The Op-filed items from 12:42 AM (App updates, push-to-talk, double messages) were filed before 3.6.0 went out. 3.6.0
already fixes part of each one; this round finishes them and checks them again. "Streaks" came up twice; it's one item
here.

## A. Op
1. **A small Op tab instead of the chat panel.** It shows only his state ("Listening…", "Thinking…", "Speaking"), his
   three buttons (full screen, turn off, close) and nothing else. No typing box. His replies don't fill it.
2. **No double messages when you cut him off** while he's speaking or typing: each reply shows once, the text stays,
   and cutting in and talking back works cleanly. (3.6.0 removed exact repeats; the cut-off path still writes the
   half-said line and then the full reply as two messages. That gets fixed here.)
3. **Everything you've told Op about the app is in App updates.** The app goes back through your conversation with Op,
   finds every app request or piece of feedback that isn't in App updates, and files it. From then on, each one is
   confirmed as saved (a note that says it's in, every time).
4. **Push-to-talk from other apps.** 3.6.0's installer and Check are the fix. If the key still doesn't work from other
   apps after installing 3.6.0 and doing the one-time step, Check shows exactly which part fails, and that goes here.

## B. Today
5. **Clients widget: the bottom** (the leads row) is badly spaced. Tidy it.
6. **The streak panel is the console for the whole day-streak system**: the fire streak, Today's standard and a running
   streak like 75 Hard together, as one overview (not a separate block under it).

## C. Personal
7. **Streaks**: Today's standard and the streaks you create (75 Hard and so on) live together as one system, kept in
   the same place as the streak panel on Today.
8. **Health → Weight: the BMI scale** looks wrong and doesn't fill the panel. Redo it.
9. **Health → Fuel: the bottom and the sizing** look bad. Fix the layout.
10. **Goals**: it was broken on the first open of the app (fine later). Find what draws it wrong the first time.

## D. Focus → Analytics
11. **The range changes the recap too**: on This week, the "Day recap" becomes the week's recap; Last week shows last
    week's, and so on.
12. **One 🔍 button to pick the range**: Today, This week, Last week, This month, Last month, All time, and a custom
    range (pick the dates).

## E. Playbooks
13. **Playbooks overview: drag and drop clients between stages.** See each playbook with its stages and move a client
    from one stage to the next by dragging.

## Andre's answers
- **Streaks**: keep the Personal → Streaks tab as the command center for the whole streak system. On Today, make it
  **tighter**: the running streak's day count sits right next to the fire streak, and its rules go in the same line as
  Today's standard. One compact console, no extra row. (Item 7 needs no other change.)
- **Op's small tab**: status only, plus a clear sign that he's working in the background.
- **Goals**: it looks good now, but it was broken when he first opened the app. Look in the code for what draws it
  wrong on the first open.
- **Playbooks**: like the Lead center, the stages shown visually (a column per stage), clients as cards to drag
  between them.
