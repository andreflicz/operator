# Operator app — continuity brief (updated 2026-11-01, after Round 60)

## What this is
"Operator" is Andre's personal productivity app: business (clients, leads, MRR, deliverables, playbooks), focus (lock-in sessions, tasks), personal (goals, health, finances, journal, social), and Op, the AI assistant inside it. The UI and logic are one self-contained HTML page built from a source tree. It ships as a Mac app (Electron). The older Chrome-app-shell `.app` still exists in the repo as the source of the helper scripts.

Andre tests every build himself and comes back with detailed, itemized feedback, often as comments on the Claude Design canvas ("Operator — Update Mockups", page "The app now"). He expects:
- every item handled, nothing missed; be thorough and triple-check;
- judgment calls flagged;
- the code pushed to GitHub after each step;
- the canvas updated with real screenshots of the build.

Design rules he set: "a bad app informs, a good one just has a great UI." Minimal, level, symmetrical; no small grey explainer text; one well-placed control rather than repeated buttons; consistent across features. Build features general ("not a just-me app").

## Where the code lives
- GitHub: `andreflicz/operator`. Rounds 57–60 are on branch `claude/dreamy-carson-ozyoy0` (built on `claude/clever-johnson-7y2dqy`, Round 56). Pull it at the start of a session.
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
                            Round 58: 32z64-r58.js (Op's logging, notes + feed, chat times, voice, Op's read typing),
                            32z65-r58ui.js (Business tabs, Playbooks overview/builder, Social accounts + full screen, package calendars, Settings)
                            Round 59: 32z66-r59.js (Op's read, talk-button cut, update write-ups, SOP playbooks + the permanent lead
                            playbook), 32z67-r59ui.js (Setup, Log center calendar, packages by cycle day, locking in, client calendars,
                            Calendar client filter, tab animations, weight & fuel, journal)
                            Round 60: 32z68-r60.js (read once, PTT reply once, Op files updates, presets, monthly deliverables,
                            personal packages), 32z69-r60ui.js (XP pop-up, PTT explainer, Log center tab, Social clients/settings,
                            Calendar picker/legend, goals order, journal, vault)
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
4. Re-run the maintained suites r41–r60 and r57-migrate (r40 and older are stale) and `xvfb-run -a node scripts/e2e/mac-app-test.js` (first time in a container: `cd mac && npm install && node stage.js`).
   `node scripts/e2e/r57-shots.js` / `r58-shots.js` / `r59-shots.js` / `r60-shots.js dist/command-center-2.html <outdir> [names]` take each round's screenshots.
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
- Build view: stage strip, the open stage's steps (list), Calendar = the guide (ideal month, posting days). Board (R57; replaced by the R58 Overview): the chosen
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

## Round 58 notes (the list is ROUND-58-LIST.md)
- App updates are ONE place: journal entries with the Update tag. `settings.opIdeas` is gone (migrated once at startup).
  The app files Andre's own words (`r58File(words, summary)`): suggest_improvement / add_journal tag Update use the message
  in progress (`R58.turn`, set by the aiAsk wrapper and cleared when the reply ends; "mark that as an update" means the
  message before). `mark_update` (an earlier message by a few words) and `file_updates` (list mode, after his yes) find his
  messages in `opChat()`. If Op says "logged" and no tool ran, the app files the words itself.
- What Op DOES (tasks, events…) goes to the feed `state.focus.r58Feed` (`r58FeedAdd`), shown first in Notifications under
  "From Op"; tap one for the detail. Notes (`r57Note`) have ✕, fade out, and one note per action.
- `delete_session` (+ Undo) removes a work session; a session open over 10 hours asks once.
- Voice: hands-free has no time cap and waits longer the longer he talks; the browser's 60 s stop is held off while
  listening. A tap while Op speaks stops him and finishes his line on screen (no mic); a double tap talks.
- Op's read types from `R58T[kind]` into the live page (a redraw doesn't jump it); the interval runs only while typing.
- Business tabs: Overview, Clients, Leads, Packages, Finances, Playbooks (+ Log center and Setup on the right).
- Playbooks: no Clients/Leads switch. Overview = a column per playbook someone's on, "Not running" pills (drop targets),
  "Not on a playbook" at the bottom (★ default in one tap). Builder = pills with ★ (one default per kind, picked when adding).
  `pbMoveTo` refuses a lead onto a client playbook.
- Social: no Clients tab. Overview starts with every account (`r58StripHtml`: own accounts gold, then clients'; Zernio
  duplicates of his own are hidden). Tap one: numbers, Client link, Package link (`igCfg().r58Pkg`, falls back to the
  client's package), content calendar, report/export. Full screen = `html.r58-content` (Esc exits).
- Packages: a delivery calendar per package (`pk.schedule[delivId] = [days]`, "Spread them out"), `pk.type==='self'` = Just me.
  Clients' content calendars use the schedule's days.
- Tasks: ticking two within 0.55 s used to drop the first (one `justCompletedTaskId`); now the pending one finishes at once.

## Round 59 notes (the list is ROUND-59-LIST.md)
- Op's read has a fixed height (`.r58-opl`, 104px, three lines); `opReadKick` asks for three labelled lines of ≤9 words or
  ≤30 words of prose; a stored read over 220 characters is written again. Finances and Business → Overview put it first.
- Talk button while Op speaks: `opStop`, his current line (`R57.lastSaid`) goes into the chat, the pending `opSay`
  promises resolve so the turn carries on, and `R59.hush` keeps him silent (text only) until the turn ends.
- App updates: `r59File(summary, words)`: the entry's text is Op's write-up, `e.said` is Andre's words (shown folded as
  "What you said", included in copies). Round 58's word-for-word entries were converted once (title → text, words → said).
- Playbooks are client SOPs. ONE permanent lead playbook (`p.master`, `r59LeadPb()`, `r59LeadSync()` on every render):
  its stages are the lead stages (names and order follow Setup), every open lead is on it, it can't be deleted and its
  stages can't be added/removed in the builder. No posting days in playbooks. New playbooks only from the + (no For).
  `R59.noLeadPb = true` switches the permanent lead playbook off: r55–r57 set it to test the model before it.
- Setup (`bizSetupHtml`): Lead pipeline (drag to reorder: `r59MoveStage`, rename, recolour, add, remove), Client stages,
  Reach-out, Messages; Playbooks opens the tab. A renamed stage re-renders straight away.
- Log center: List / Calendar; the calendar is clients and leads together (`r59LcItems`), filter Everyone/Clients/Leads.
- Packages: `pk.schedule[delivId] = [cycle days 1–30]`. Day 1 = a client's `startDate` anniversary (`r59Cycles`), or the
  day you locked in for your own account (`igCfg().r59Plans[acctId] = {pk, start}`). Package changes sync to clients
  (`r59PkSync`). Package sheet: `openPackageEditModal` → `r59PkSheet`; new package: `openNewPackageModal` → `r59PkNew`.
- Your own account: "Lock in on content" sheet, hold 1.4s to commit (`r59Commit`); shown first on Social → Overview.
- Client window → Calendar (`r59ClientItems`: content, playbook steps this cycle and next, dated tasks, events, cycle
  starts, billing) with kind filters; the Calendar page has a client picker (`ui.r59CalClient`) using the same items.
- Tab animations: `renderView` compares the tab state (`r59TabSig`) with the last render; what changed gets `.r59-in`.
- Weight & fuel rebuilt (`renderBodyFuel`), numbers rounded to one decimal on Health; Journal is write-left / read-right.

## Round 60 notes (the list is ROUND-60-LIST.md)
- Op's read: Round 59 refetched any stored read over 220 characters on every render (it typed twice / rewrote
  itself). `opReadKick` now presents a long stored read as short to that check; the page clamps it.
- Push-to-talk cut: `r59ShowLine` writes ONE chat entry (`R60.cutEntry`); `opChatLog` for the same turn fills that
  entry with the full reply instead of adding a second one.
- Filing: if Andre's message asks to add something to the updates (`R60_ASKS_UPDATE`) and no filing tool ran, the app
  writes it up (`r59Summarize`) and files it. Op's system prompt says it's non-negotiable.
- Notes: `r57Note` now shows `#r60Pop`, a short glowing white line next to the XP (`#musicDock`); tap to expand.
  The old `.r57-notes` corner stack is hidden. Everything still goes to the feed.
- Settings → Op: `.r60-ptt` says whether the talk key works in the background (from `OPAPP.talkHealth`).
- Presets: `R60_PRESETS` (Onboarding, Monthly client, Save a client, Offboarding) + "Onboarding → Monthly client"
  (both, chained via `p.next`); your own in `crm().pbPresets` (`r60SavePreset` in the builder). Shown in the
  new-playbook sheet and on the Overview when there are no client playbooks. Builder: "When they finish → They move to …".
- Deliverables: `d.per = 'month'`, `d.monthly = N` (package and client). `monthlyTargetFor` / `isDeliverableDoneThisWeek`
  respect it; `r59PkSync` copies it to clients.
- Packages: `pk.personal` (also sets `type:'self'`): no price, no "On it"; Day 1 is when you lock in.
- Hover labels: `hovLabelFor` never makes a label from an internal action name (anything with a digit, like r59PkDay).
- Business tabs: Overview, Clients, Leads, Log center, Packages, Finances, Playbooks (no Log center button).
- Social: Clients group with colours and a + (`r60CliOpen` sheet links Zernio accounts to clients); ⚙ settings sheet
  (swap, connect, clients' accounts, refresh) instead of ⇄; Full screen / Refresh row moved down.
- Calendar: no Today chip; `.r60-calb` picker (search) replaces the select; Legend behind a button; the check-in and
  Op's line share a row; the month has more room.
- Goals: "Your goals" first (Andre said "year goals"; read as Your goals: the long-term ones). Journal: own layout
  (`renderJournalEntriesTab`, `renderClientJournalComposeCard`, `renderAllClientJournalRow`). Vault: status pill per
  card, All / Open / Sealed, week notes use 📝.

## Removed (don't bring back)
GoHighLevel everywhere (stubs in 32z5c-r55.js); Op live mode (ElevenLabs agent); Op check-ins while working; "Have Op rewrite it"; client cycles/lifecycle tasks (`r54LcSync` → false); custom XP areas.

## The helpers (127.0.0.1 only)
`bridge.pl` (perl) listens and hands each request to `helper.sh`: **8935, wake** (alarms, music, TTS, the Anthropic proxy, Scribe STT); **8934, activity** (serves `activity.log`). Keys live in `~/Library/Application Support/Operator/*.key` (mode 600). Bump the helper version in `/ping` and `OP_HELPER_NEEDS` together whenever routes change.

## Operator for Mac (mac/)
- Electron 44.7.0 / electron-builder 26.16.1. uiohook-napi (global talk key) is a dependency, `npmRebuild:false`, `asarUnpack **/*.node`.
- Packaging (Linux container, no Apple Developer ID). rcodesign can't be downloaded here, so the zips go out unsigned and
  Andre installs with `bash ~/Downloads/install-operator.sh` (mac/install-operator.sh: unzips with ditto, copies to
  /Applications, signs inside out with codesign, verifies, opens). `codesign --deep` failed for him on 3.2.0; don't send that again.
  Old rcodesign steps, if it's available:
  1. bump `version` in mac/package.json (and package-lock.json);
  2. `node stage.js`;
  3. `npx electron-builder --mac dir --arm64 --x64 --publish never` → `out/mac` (Intel) and `out/mac-arm64`;
  4. in each `…/app.asar.unpacked/node_modules/uiohook-napi/prebuilds` delete everything but `darwin-*`; `rcodesign sign` every `*.node` under app.asar.unpacked;
  5. `rcodesign sign -e build/entitlements.mac.plist` each `Contents/Frameworks/*.app`, then the `Operator.app` itself;
  6. `cd out/mac-arm64 && zip -qry ../Operator-X-AppleSilicon.zip Operator.app` (and `out/mac` → `-Intel.zip`). `rcodesign verify` reports CMS errors on ad-hoc signatures; that's expected.
- macOS blocks the first open: right-click → Open, or `xattr -cr /Applications/Operator.app`.
- main.js: single instance, menu bar Tray, ⌥O show/hide, ✕ hides, ⌘Q quits, starts the helpers, move-in from the old Chrome profile, `window.operatorPage` bridge.

## Status
Round 60 (2026-11-01): ROUND-60-LIST.md (19 items): see Round 60 notes.
Round 59 (2026-10-31): ROUND-59-LIST.md (17 items, with Andre's answers): Op's read fixed and first, talk-button cut,
update write-ups, SOP playbooks + permanent lead playbook, Setup, Log center calendar, packages by cycle day, locking
in, client calendars, Calendar client filter, tab animations, weight & fuel, journal.
Round 58 (2026-10-31): the list from Andre's Op session (ROUND-58-LIST.md, 35 items): updates in his words in one place,
honest "logged", list mode, remove a session, chat times, notes/feed, voice, Op's read, bubble, Business tabs, Playbooks
overview/builder/★, Social accounts + full screen + package links, package calendars + Just me, Settings cleanups.
Packaged as Mac 3.2.0. Round 59: Mac 3.3.0.
Round 57 (2026-10-31): playbooks as pipelines, one task name, Reach out to leads fixes, the Op list (prompt, sessions, AFK, debriefs,
goodnight, reply box, hold-to-talk anywhere, break, ducking, double input, journal tag, notes), journal threads, Socials
content calendar + reports, Op bubble and mood colours, Op's read as a line, food for any day, Analytics hero, XP audit.
Packaged as Mac 3.1.0.
Shipped through 3.0.9 (Round 56: playbooks rebuilt with Board + Build, playbook tasks on the task list, Calendar fits the screen, quote buttons on the author line). Round 55: rank-up message and visuals, GHL removal and a full sweep, quotes (new / write / pin), real XP, money check-in, sidebar signals, notification counter/glow/chime, categoriser fix, Finances UI, ultrawide layouts, Your day labels, the + menu, Playbooks, Op client reports, Social → Clients.
Not done yet (agreed for later): the posting area; calendar task due dates.
