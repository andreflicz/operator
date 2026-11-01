# Round 64: Andre's updates (Oct 31, 10:46 PM – Nov 1, 12:43 AM)

Some of these were filed before 3.6.0 (Rounds 62–63) went out; those are noted, checked again against what he
described, and fixed where 3.6.0 doesn't cover it.

## A. Op
1. **A mini tab instead of the chat panel.** Op's window becomes a small tab: a status line ("Listening", "Thinking",
   "Speaking"), Op's three buttons and close / minimize. No typing box (he talks to Op). Op's replies stay out of the
   way rather than filling a panel. Small and tidy, no awkward sizing.
2. **Double messages when he cuts Op off** (talking or typing): each reply shows once, the text stays visible, and
   cutting in and replying works cleanly. 3.6.0 stopped the same message being sent twice, but not this cut-off case
   (the partial line and then the full reply). Reproduce and fix it.
3. **Every app update and piece of feedback logged, each confirmed as saved.** 3.6.0 files anything Op claims to have
   filed. Also: go back through his conversation with Op and file whatever's missing, and every save gets a visible
   "Saved to App updates" confirmation.
4. **Push-to-talk from other apps.** 3.6.0's installer keeps macOS's permission across updates and Check shows whether
   it works. Confirm after he installs 3.6.0 (the one-time remove and re-add); if it still fails, look further.

## B. Today
5. **The bottom of the Clients panel** (the leads row under the client cards) isn't spaced well. Tidy it.

## C. Personal → Streaks
6. **One console for the whole streak system**: the running challenge (75 Hard etc.) goes in one panel together with
   Today's standard and the day streak (🔥). An overview of the day, not separate boxes.

## D. Personal → Health
7. **Weight: the BMI scale** looks wrong and doesn't fill its panel. Redo it.
8. **Fuel**: the bottom of the panel and the sizing across Health look off. Even it out.
