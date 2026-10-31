# Operator app — continuity brief (updated 2026-10-31, after Round 57)

## What this is
"Operator" is Andre's personal productivity app: business (clients, leads, MRR, deliverables, playbooks), focus (lock-in sessions, tasks), personal (goals, health, finances, journal, social), and Op, the AI assistant inside it. The UI and logic are one self-contained HTML page built from a source tree. It ships as a Mac app (Electron). The older Chrome-app-shell `.app` still exists in the repo as the source of the helper scripts.

Andre tests every build himself and comes back with detailed, itemized feedback, often as comments on the Claude Design canvas ("Operator — Update Mockups", page "The app now"). He expects:
- every item handled, nothing missed; be thorough and triple-check;
- judgment calls flagged;
- the code pushed to GitHub after each step;
- the canvas updated with real screenshots of the build.

Design rules he set: "a bad app informs, a good one just has a great UI." Minimal, level, symmetrical; no small grey explainer text; one well-placed control rather than repeated buttons; consistent across features. Build features general ("not a just-me app").

## Where the code lives
- GitHub: `andreflicz/operator`. Round 57 is on branch `claude/dreamy-carson-ozyoy0` (built on `claude/clever-johnson-7y2dqy`, Round 56). Pull it at the start of a session.
- Every commit ends with the session's Co-Authored-By / Claude-Session lines.
- Layout inside `Operator-source-split 2/`:

```
src/head.html, src/body-shell.html, src/tail.html, src/styles.css
src/js/manifest.json        load order of every JS file (the build reads it)
src/js/NN-*.js              the original sections
src/js/32zNN-rXX.js         one file per update round, layered on top (see "Override pattern")
                            Round 55: 32z5c-r55.js (general), 32z5d-r55pb.js (Playbooks), 32z5e-r55op.js (reports, clients' socials)
                            Round 57: 32z60-r57.js (task names, leads, journal threads, forms), 32z61-r57pb.js (playbooks as
                            pipelines, XP for stages), 32z62-r57op.js (Op), 32z63-r57ui.js (Socials, Op bubble, reads, Health, Analytics)
scripts/build.py            src/ → dist/command-center-2.html (injects const OP_BUILT = <ms>)
scripts/smoke-test.js       quick load check
scripts/e2e/*-test.js       Playwright suites, one per round (common.js: instrument, newPage, check, report)
mac/                        Operator for Mac (Electron): main.js, preload.js, stage.js, res/, build/
packaged/Operator-2-7-2.app the old Chrome-shell app; its Resources/helper.sh + bridge.pl are the helper source
```

## Workflow for every update
1. Add a new round file after the last one in manifest.json, plus a CSS block at the end of styles.css.
2. `python3 scripts/build.py`, then `node scripts/smoke-test.js dist/command-center-2.html`.
3. Write `scripts/e2e/rXX-test.js` and run it: `node scripts/e2e/rXX-test.js dist/command-center-2.html`. `window.__op.ev(code)` runs code inside the app's closure. `newPage(browser, file, seed, clockAt)`; the fake clock leaks memory, so soak tests pass `null`.
4. Re-run the maintained suites r41–r57 (r40 and older are stale) and `xvfb-run -a node scripts/e2e/mac-app-test.js` (first time in a container: `cd mac && npm install && node stage.js`).
   `node scripts/e2e/r57-shots.js dist/command-center-2.html <outdir> [names]` takes the Round 57 screenshots.
5. Screenshot what changed, update the canvas, commit and push.

## Override pattern
Function declarations are global inside the one closure and callers look them up by name, so later rounds wrap earlier ones:
`fn = (function(base){ return function(){ … base.apply(this, arguments) … }; })(fn);`

Other conventions:
- Clicks go through `data-action` → `ACTIONS[name](el, e, id)`.
- `renderView()` redraws (it morphs the DOM in place); `persist(key)` saves; `afterRenderHooks` run after renders.
- `showToast`, `uiAsk`, `uiConfirm` are the dialogs; `addSheetOpen/Refresh/Close` are the bottom sheets.
- One-time migrations run in `setTimeout(…, 0)` so they see loaded state.
- When putting user text into `String.replace`, pass a function as the replacement (`$` patterns otherwise expand).
- Name clashes happen. Grep for a name before declaring it.

## Architecture notes
- `state` (persisted, STATE_KEYS) vs `ui` (transient).
- Time tracking: deep work in `state.focus.sessions`; modes (`break` / `offtime` / `shooting`) in `state.modes`.
- Client deliverables use the monthly-pace system in 28-business.js. Client Health has one shared card renderer and one touch control.
- XP is set in one table, `XP_BOOK` (32z44-r43.js). Areas are fixed since R48 (Work, Health, Personal, always on). Since R55, XP needs real action: `R55_HOLD_ACTS` buttons become press-and-hold (a MutationObserver converts `data-action` to `data-hold-act`, also on attribute changes from re-renders); setting up a week/plan needs a goal; checkout needs every goal marked; journal XP needs ≥12 written words (`r55JournalCounts`); the weekly money check-in is a real review sheet and a weekly task (master kind `money`).
- Tasks generated by the app carry `master:{kind,…}` and are made by `masterTasksSync()`.

## Playbooks (R55, rebuilt in R56; the model below is superseded by "Playbooks (R57)")
- Data: `crm().playbooks`, each `{id,name,for:'client'|'lead',repeats,days,next,stage,items}`; `kind` is only a mirror kept by `pbKindSync` (lead / onboarding = once / monthly = repeats). No defaults and no starting set: nobody is put on a playbook automatically (only a lead playbook's own "starts when a lead reaches <stage>" rule).
- Item `{id,title,type:call|report|task|access|send,day,repeat:'once'|'week',dow,every,checklist,links,notes}`.
- Person state: `x.pb = {id,start,run,done:{key:date|'missed'},auto,hist,ev,finished}`; off a playbook = `{id:null,hist}`. Keys are `run~cycleStart:itemId[:date]`. A repeating playbook of 28–31 days runs by calendar month from the start date, otherwise every N days (`pbByMonth`).
- `pbSync()` (inside masterTasksSync): every once-item of the current run is a task (today if due by tomorrow, else backlog with its date), weekly ones a week ahead; done ↔ done both ways; late ones lower health and notify; an empty playbook never "finishes" anyone.
- Moving: `pbMoveTo(kind, id, pbId|null)` (board drag, their window, "On it" list, new-contact pick) confirms what gets checked off; taking someone off removes their open tasks.
- UI: Business → Clients & leads → Playbooks. Board (a column per playbook + "Not on a playbook", drag cards) and Build (calendar sized to the screen height via `--rh`, Mon–Sun weekly row, inline item panel / "On it" side). "+ New playbook" sheet: name, for, length (only set there), when it ends. Client backlog shows each client's playbook tasks.
- Calendar page: `r56CalFit` (32z5f-r56.js) sizes the month rows so the page never scrolls (value kept on `html` as `--r56-rh`, since the calendar redraws every second).

## Playbooks (R57: pipelines of stages)
- A playbook is a pipeline you move people through by hand: `p.stages = [{id, name, crm, repeat:null|'month', days, steps:[…]}]`,
  `p.postDays` (the guide's posting days). `crm` = the Lead Center / client stage it mirrors (moving someone in one moves them
  in the other; `pb57Mirroring` stops the loop). Old day-based playbooks convert to one stage (`pb57Migrate`); playbooks made
  from old client cycles convert one stage per cycle step, with each item's real due rule (`pb57FromCycle`).
- Step `{id, title, type:task|call|doc|report|send|access, due:{rule:'enter'|'day'|'end'|'before'|'week', n, dow}, checklist,
  links, files:[{name, mime, ref:'idb:…'}], notes, every}`. A call with no linked event is a "Book: …" task; once booked the step
  is due on the event's day and done once it has happened.
- Person: `x.pb = {id, start, stage, enteredAt, seq, run, done, made, joined, hist}`. Keys are `run~[seq@]cycleStart:stepId[:date]`
  (`seq` makes each entry into a stage its own). `pb57In(x)` is the day the current stage counts from (the playbook's day 1
  for the first stage).
- `pbSync`: a step's task is made once (`x.pb.made`); after that title, date and list are yours. A task you delete marks the
  step `skipped`. Done ↔ done both ways. A finished (non-monthly) stage moves them on (`pbAdvance` → `pb57Enter`); moving on by
  hand ticks off what's left (`pb57Enter`, reopened by `pb57Back` / undo).
- Health, notifications, the sidebar and stats share ONE rule, `pbBehind(kind, x)`: behind = a past guide week (7-day blocks
  from the stage's start) with open steps; 1 week yellow, 2+ red. `pbLateFor` returns the same tasks.
- Build view: stage strip, the open stage's steps (list), Calendar = the guide (ideal month, posting days). Board: the chosen
  playbook's stages as columns. Leads still get no tasks (their due steps fold into Reach out to leads + notifications).
- XP: `XP_BOOK.work.stage` (+40) for each stage finished with its steps done.

## Round 57 notes
- Task names: `taskName(t)` is the one source; pages without a client chip (Wind down, Plan of attack, lock-in pages, Op's
  context) draw with it (`r57WithNames`, which holds back saving tasks while it draws). The old text sweep (`niceTitles*`) is off.
- Op: no work-hours / bedtime refusals in the prompt; sessions end only by you unless Settings → Focus → "End a session when
  I'm away" is on (talking to Op counts as there); AFK from the activity helper's idle seconds (`r57Away`); debrief after any
  event (Settings → Op); goodnight then quiet until the alarm (`state.focus.r57QuietUntil`); hold-to-talk with any key
  (`opPttKey` is a KeyboardEvent.code or Mouse3–5; `state.profile.opKeyMode` 'hold'|'tap'); the mic opens without voice
  processing (`r57MicOpts`); his own last line heard back is dropped (`r57Echo`); Op's notes (`r57Note`/`r57Log`) go to
  Settings (opIdeas, `from:'op'|'did'`) and App updates (the Update journal tag, made if missing).
- Mac app: main.js forwards the talk key only when Operator isn't in front (the page handles it in front); `op:talkHealth`
  / `op:openPrivacy` report and open Input Monitoring / Accessibility. Hook keycodes come from `uiohook-napi`'s UiohookKey.
- helper.sh `/music/duck` takes `l=` (percent). Not a new route, so the helper version wasn't bumped.
- Journal: any entry can come back (`e.back = {mode, date, repeat, next, shownOn}`) and grow a thread (`e.thread`).

## Removed (don't bring back)
GoHighLevel everywhere (stubs in 32z5c-r55.js); Op live mode (ElevenLabs agent); Op check-ins while working; "Have Op rewrite it"; client cycles/lifecycle tasks (`r54LcSync` → false); custom XP areas.

## The helpers (127.0.0.1 only)
`bridge.pl` (perl) listens and hands each request to `helper.sh`: **8935, wake** (alarms, music, TTS, the Anthropic proxy, Scribe STT); **8934, activity** (serves `activity.log`). Keys live in `~/Library/Application Support/Operator/*.key` (mode 600). Bump the helper version in `/ping` and `OP_HELPER_NEEDS` together whenever routes change.

## Operator for Mac (mac/)
- Electron 44.7.0 / electron-builder 26.16.1. uiohook-napi (global talk key) is a dependency, `npmRebuild:false`, `asarUnpack **/*.node`.
- Packaging (Linux container, ad-hoc signing with rcodesign; no Apple Developer ID):
  1. bump `version` in mac/package.json (and package-lock.json);
  2. `node stage.js`;
  3. `npx electron-builder --mac dir --arm64 --x64 --publish never` → `out/mac` (Intel) and `out/mac-arm64`;
  4. in each `…/app.asar.unpacked/node_modules/uiohook-napi/prebuilds` delete everything but `darwin-*`; `rcodesign sign` every `*.node` under app.asar.unpacked;
  5. `rcodesign sign -e build/entitlements.mac.plist` each `Contents/Frameworks/*.app`, then the `Operator.app` itself;
  6. `cd out/mac-arm64 && zip -qry ../Operator-X-AppleSilicon.zip Operator.app` (and `out/mac` → `-Intel.zip`). `rcodesign verify` reports CMS errors on ad-hoc signatures; that's expected.
- macOS blocks the first open: right-click → Open, or `xattr -cr /Applications/Operator.app`.
- main.js: single instance, menu bar Tray, ⌥O show/hide, ✕ hides, ⌘Q quits, starts the helpers, move-in from the old Chrome profile, `window.operatorPage` bridge.

## Status
Round 57 (2026-10-31): playbooks as pipelines, one task name, Reach out to leads fixes, the Op list (prompt, sessions, AFK, debriefs,
goodnight, reply box, hold-to-talk anywhere, break, ducking, double input, journal tag, notes), journal threads, Socials
content calendar + reports, Op bubble and mood colours, Op's read as a line, food for any day, Analytics hero, XP audit.
Not packaged as a Mac build this round (no version bump).
Shipped through 3.0.9 (Round 56: playbooks rebuilt with Board + Build, playbook tasks on the task list, Calendar fits the screen, quote buttons on the author line). Round 55: rank-up message and visuals, GHL removal and a full sweep, quotes (new / write / pin), real XP, money check-in, sidebar signals, notification counter/glow/chime, categoriser fix, Finances UI, ultrawide layouts, Your day labels, the + menu, Playbooks, Op client reports, Social → Clients.
Not done yet (agreed for later): the posting area; calendar task due dates.
