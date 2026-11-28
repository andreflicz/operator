# Round 81 (4.13.0)

Code: `src/js/32z90-r81.js` (Mind, calendar, playbooks, money) and `src/js/32z91-r81sched.js` (schedule, streaks). Test: `scripts/e2e/r81-test.js` (22).

## Schedule, rebuilt
- One weekly board, set once: each day shows its kind, the wake line, the work block and Train or Rest. Click a day to change it; "Same on every work day" copies it.
- **Seasons**: e.g. Normal (5/2) and a Training season (trains every day). Switching changes the week, the alarms and the training days. New season = a copy of the current week. You can rename or delete seasons, or fill one from a preset.
- The workout master streak skips your season's rest days.
- **Days off** in one card:
  - Holidays: Off, Light or Work.
  - Birthdays: yours from your profile, plus anyone you add, each as Off, Light or Just mark it.
  - Regular days off: every other Saturday, the first Monday of the month, and so on.
  - Time off: one day, or a stretch.
- The two-week vacation suggestion is gone.
- "Runs my alarms" switch: you can keep the schedule on without it running your alarms.
- Next two weeks strip.

## Streaks
- Your rules and "Should I say yes?" moved here from the schedule.
- Master streaks, in order: work hours, workout, calorie deficit, **read**, journal, reach out, **meditate**. Read and Meditate are items you tick yourself.
- A custom streak no longer has a "when" field.
- The Days off button and the "Days off a week" select are gone. The schedule decides days off now.

## Playbooks
- Every playbook has **Edit** (opens the builder) and **Change it with Op**. You describe the change and Op rewrites the playbook. Stages with the same name keep their people; anyone on a removed stage goes to the first stage.
- The New playbook sheet asks how to start (Describe it / From a template / Blank) and shows only that path.

## Money
- Bank sync now also records money coming into your accounts. This is not counted as income; it's only used to match transfers.
- An outgoing payment that lands in another of your accounts (same amount, within 4 days) becomes a Transfer. So does a payment to one of your own cards (the card's name plus payment wording). Neither counts as spending.
- Each account is marked Business or Personal in Accounts. Charges on a business account count as business; a type you set by hand still wins.
- Spending has All, Personal and Business filters.

## Fixes
- Calendar → Your day: the first and last times stay inside the card. The wake-up time was cut off before.
- Mind:
  - It's a full 360° space. Stars surround you, you can turn right over the top and look up from underneath, and the planets spread higher and lower.
  - Clicking is easier: bigger hit areas, and a planet's name counts as part of it.
  - Nothing dims while you drag.
  - Panning from a side-on view no longer jumps.
- Folded sidebar: the Map button stays inside the sidebar.

## Tests updated
- r56, r57, r59, r60, r61: they now pick a path in the new-playbook sheet first.
- r63: no "when" field and no days-off select.
- r80: the schedule's new markup.
