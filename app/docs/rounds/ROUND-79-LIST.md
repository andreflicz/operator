# Round 79 (Mac 4.11.0)

## Mind view
- **Pick, then open.** A click picks a planet: the camera glides to it and its card shows. To open it, use **Open** on the card, double-click it, or press Enter. Nothing opens by itself.
- **Opening shows the whole app:** the sidebar, every tab, Settings and pop-ups, all full size. The galaxy stops drawing while you're in there. **Map** at the top of the sidebar (or Esc) takes you back.
- **No hidden page changes.** Anything that changes the page while you're on the map (a quest's "Do it", ⌘K, Op) opens the app, so nothing changes out of sight. Before, a quest's "Do it" did nothing you could see.
- **Space no longer locks you in or out.**
- **3D from the start:**
  - **Camera:** it looks across the galaxy instead of down on it, with stronger perspective, so near planets are big and far ones small.
  - **Depth:** planets sit at very different heights.
  - **Zoom:** goes deeper with real perspective.
- **Fixed:** the sun could throw a drawing error during the opening sweep.

## Money
- **Spending tab** (Personal → Finances → Spending):
  - **Totals:** what you spent each month, compared with the month before. Transfers are shown apart and not counted.
  - **Categories:** click one to see who you paid.
  - **Other:** opens to its places. Pick a category for a place and every charge from it moves, now and from then on.
  - **Your own categories:** "+ New category…" in any category menu.
- **New categories:** Business (ads, software, gear), Travel, Fun, Sent to people (Zelle, Venmo, Cash App), Cash, Fees & interest. Anything left in Other is re-checked against them.
- **"Not spending" is now "Transfers."**
- **Transactions:** every expense, with Other and a Spending-only filter. Filter by month, sort newest, oldest, biggest, smallest or A to Z, and change a category right on the row (with "do this for all from X").
- **Debts:**
  - **Sorting:** highest rate, lowest rate, biggest or smallest balance. Debts with no rate always go last, with a note to add it.
  - **The + button's debt form** now asks for the rate, minimum and due day. Debts added there never had a rate, so they couldn't sort by it.
  - **The extra "+ Debt" button is gone.**
- **Weekly check-in → "Something off?":** mark client payments **Got it** and bills or debts **Paid** (overdue ones flagged), add **"I got paid"** right there (a client's name counts as their payment), refresh the bank, or jump to fix a debt.
- **Monthly money review**, a master task from the 1st, due the 7th:
  1. Get every statement.
  2. Drop them in.
  3. See where it went (and sort Other).
  4. Check the bills that repeat.
  5. Set one change for next month.
- **Statement upload:** PDF, CSV and OFX/QFX, several at once. Op reads PDFs; this needs your Anthropic key. Charges your bank already sent are skipped, so nothing counts twice. Payments to a card and refunds are left out.
- **Bills that repeat** are found in your bank and put on the finance calendar as "Repeats every month": the same place each month at about the same amount, e.g. GoHighLevel, Verizon, Google. They count as paid once the charge shows up. Coffee shops and the subway don't count. "Not a bill" takes one off.

## Holidays
- **Automatic:** picked by date, and over when the holiday is. Thanksgiving runs from three days before through the day itself, and Christmas from Dec 18 to 25. New Year's (Dec 31 to Jan 1) is new.
- **Pick one by hand** in Settings → Appearance → Holiday themes → Which one. It stays on until that holiday ends, then goes back to Automatic.

## Light in the background
- **The cause:** the Mac app kept telling the page it was visible even with the window closed (so alarms fire on time), so every animation kept running behind it.
- **Now:** the app tells the page when the window is closed or minimized, and the page goes to sleep. Animations stop, decorations come off, nothing is drawn frame by frame, and sound is let go.
- **After 2 minutes hidden** it also drops the page itself and rebuilds it the moment you open the window.
- **Still running:** the lock-in timer and the menu bar, breaks, alarms and reminders, notifications, the phone and tags.
- **Measured (hidden):**
  - page process: about 14% CPU → 0.5%, about 230 MB → 155 MB;
  - graphics process: about 23% CPU → 0.
