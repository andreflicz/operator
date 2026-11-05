# Operator app — continuity brief (updated 2026-11-04, after Round 68)

## What this is
"Operator" is Andre's personal productivity app: business (clients, leads, MRR, deliverables, playbooks), focus (lock-in sessions, tasks), personal (goals, health, finances, journal, social), and Op, the AI assistant inside it. The UI and logic are one self-contained HTML page built from a source tree. It ships as a Mac app (Electron). The older Chrome-app-shell `.app` still exists in the repo as the source of the helper scripts.

Andre tests every build himself and comes back with detailed, itemized feedback, often as comments on the Claude Design canvas ("Operator — Update Mockups", page "The app now"). He expects:
- every item handled, nothing missed; be thorough and triple-check;
- judgment calls flagged;
- the code pushed to GitHub after each step;
- the canvas updated with real screenshots of the build.

Design rules he set: "a bad app informs, a good one just has a great UI." Minimal, level, symmetrical; no small grey explainer text; one well-placed control rather than repeated buttons; consistent across features. Build features general ("not a just-me app").

## Where the code lives
- GitHub: `andreflicz/operator`. Rounds 57–67 are on branch `claude/dreamy-carson-ozyoy0` (built on `claude/clever-johnson-7y2dqy`, Round 56). Pull it at the start of a session.
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
                            Round 61: 32z70-r61.js (widget sizes S/M/L, Customize button, Goals heading, Journal layout,
                            Social name, Op window auto-size + idle close, holiday banner ✕ / Halloween tune / preview only in test)
                            Round 62: 32z71-r62.js (Op: one reply per message, "filed" always true, clean ✕, working indicator,
                            compact window that grows + grip back, talk-key Check; Customize in the top panel, Goals/Journal on
                            the Personal tab line). Mac: main.js op:talkCheck / op:relaunch; install-operator.sh signs with a
                            stable local identity
                            Round 63: 32z72-r63.js (Personal → Streaks: Today's standard + challenges)
                            Round 64: 32z73-r64.js (Op small tab, cut-off merge, unfiled updates, streak console, BMI,
                            Fuel, no cross-page glide, analytics range picker + range recap, Playbooks stage board)
                            Round 65: 32z74-r65.js (SOP playbooks: task / call / doc; no reports; streaks redone; Op tab drag)
                            Round 66: 32z75-r66.js (playbook names / when they finish, Calendar all clients, challenges,
                            setup questions, vault, widgets) and 32z76-r66b.js (notifications, social XP, bell, report)
                            Round 67: 32z77-r67.js (Op's web search behind a firewall, real breaks, no silent echo drops; voice
                            memos + Ask Op + read_journal; journal filters; new leads stay; Not mine campaigns; check-in
                            frequency; the did-you-do-it pop-up). Mac: main.js modifier listener; helper.sh / bridge.pl (in packaged/…/Resources,
                            staged into mac/res by stage.js) take POST bodies for /ai/chat and long /stt
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
4. Re-run the maintained suites r41–r61 and r57-migrate (r40 and older are stale) and `xvfb-run -a node scripts/e2e/mac-app-test.js` (first time in a container: `cd mac && npm install && node stage.js`).
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
- (added) Holidays: `.hol-fx` sits above a scene (`body.has-scene .hol-fx` z 1, `.app` z 2); the banner is the first thing
  on Today (`r60Cut` moves it out of the hero) with `r60HolMusic` (WebAudio tunes in `R60_TUNES`, no files); new
  holidays in `holToday`: newyear, valentines, stpatricks, easter (`r60Easter`), july4. An earlier round hid non-birthday
  banners with CSS; that's overridden.
- (added) Today widgets: every `PANEL_RENDERERS` output is wrapped in `.r60w` (`--span`, 12-column grid,
  `state.dashboardPanels.r60Span`, defaults `R60_SPAN_DEF`); `SMALL_PANELS` is emptied. Customize (`ui.todayEdit`):
  S/M/L/Full, drag the title to move (`text/r60w`), drag the right edge to resize (capture-phase mouse handlers; the
  width is kept in the closure because Today re-renders during the drag).
- (added) Streak + Today's Standard: the standard chips move inside `.sw` (`.r60-std`). Weather is a compact pill.
  Level-up: `.lvl-n b` sizes to its digits (two digits were clipped by background-clip and looked darkened).
- (added) Log center: a date per row sets `x.followUp.date` (crmNextDue already uses it). Calendar ⚙ (`r60CalSetHtml`):
  week check-in (Mon–Sun, with dates), month check-in, check-outs that are due, goals. The week is Monday to Sunday.

## Round 61 notes (the list is ROUND-61-LIST.md)
- Today widgets: three sizes only (S = 4, M = 6, L = 12 columns; `r61Snap` snaps older widths); no edge resize; panels in
  a row stretch to the same height and their last card centers its content. Customize is `.r61-cb` above the panels.
- Goals: the top row is "Goals" + the settings gear; the "Your goals" label row is gone (the goals stay first).
- Journal: Entries / Boards / Vault top right (`.r61-jtabs`), the writing column centered, search is a 🔍 at the bottom
  (`ui.r61Search`).
- Op's window: no resize grip; a stored height is cleared once; it closes itself after 90 s with nothing going on
  (no speech, listening, thinking, typing, hover or new chat).
- Mac app: `mouseBtn` maps the page's Mouse3 (right button) to the hook's 2; side buttons stay 4/5.
- Holidays: the Settings preview shows only in Test mode / demo; a ✕ hides this year's banner
  (`state.profile.r61HolHidden`); a new Halloween tune (organ voice, bass line).
- The combined "Onboarding → Monthly client" preset is gone (chaining stays: "When they finish → They move to …").

## Round 62 notes (the list is ROUND-62-LIST.md)
- **One message, one reply** (outermost `aiAsk` wrapper in 32z71): the same words within 10 s are dropped; a voice ask that
  matches one of Op's lines from the last 45 s (≥ 80% word overlap, 4+ words; never when typed) is dropped as the mic hearing
  him; a message sent while `AI.busy` waits in `R62.queue` (newest only) and goes when he's free (it's in the chat once:
  `R62.skipMe`). `opChatLog` skips an op line identical to one of the last 6 in 5 min. `R62.dropped` counts the drops.
- **"Filed" is real**: after the turn, if the reply claims filing to the updates (`R62_CLAIM`, not negated by `R62_NEG`) and
  no suggest_improvement / mark_update / file_updates ran, the app files it (r59Summarize + r59File), even when other tools
  ran. (Round 58's net only covered no-tools turns.) Already-filed words aren't filed twice.
- **✕**: the cause of the ~5 s freeze was the turn awaiting `opSay`, whose promise never resolved after `opStop`. Close now
  resolves `R59_PENDING`, sets `R59.hush` (the rest of the turn is written, not spoken) and `R62.quiet` (no `opBubShow`
  until the turn ends or he reaches for Op: orb / window / talk button / a new ask).
- **Working indicator**: `.r62-work` in the window's top bar ("Thinking…", or `R62_TOOL_LABEL[tool]…`), `body.r62-busy`.
- **Op's window**: opens on the last exchange (`R62.openIdx`), grows with new lines up to min(58vh, 520px); the grip is back
  (`r58BubGrip` redefined): a dragged height holds until close (`R62.manual`), the width is remembered. Round 61's
  "no grip" is undone; the 90 s idle close stays.
- **Talk key anywhere**: the likely real cause was the ad-hoc signature: every install was a "new app" to macOS, so the
  Input Monitoring / Accessibility grant silently stopped applying. install-operator.sh now makes a private
  "Operator Local Signing" certificate in the login keychain once and signs with it every time (falls back to ad-hoc).
  Not verified on a real Mac (no Mac here). Check (Settings → Op) calls `op:talkCheck` (prompts Accessibility, starts the
  hook, opens the missing pane, also via the newer `com.apple.settings.PrivacySecurity.extension` URL), then shows live
  rows (Accessibility, "keys from other apps": `h.last` after the check) and Restart Operator (`op:relaunch`).
- **Today**: Customize is `.r62-cb` in the hero beside `.th-full` (`pageEditBtnHtml('toggleTodayEdit')` returns a marker
  that renderToday swaps). Widgets are size containers: the Business card is 3 / 2 / 1 columns at L / M / S (Round 60's
  `.card:last-child{display:flex}` had turned it into one centered column), client cards auto-fit.
- **Personal**: Goals' gear and the Journal's Entries / Boards / Vault move onto the tab line (`.r62-gtop`, `.r62-jtabs`);
  no "Goals" label. **Social**: Round 60's 44 px margin above the header buttons is gone.

## Round 63 notes (the list is ROUND-63-LIST.md)
- **Personal → Streaks** (`ui.personalTab='streaks'`; renderPersonal renders the cheap Wish List tab and swaps the panel).
- **Today's standard is set only here**: deep work target, days off a week, the items (rename inline, ✕, add). Settings →
  "Goals & Standards" is now "Goals & Targets" and its Deep work target / Streak Rules / Daily Standard parts are cut out
  (renderSettings wrapper). On Today, "Today's standard" opens Streaks.
- **Challenges** live in `state.standards.challenges` (persist 'standards'): `{id, preset, name, days, strict, rules:[{id,
  label, cue}], start, log:{date:[ruleIds]}, ended:{date, done}}`. `strict`: reset (75 Hard), twice (never miss twice:
  one missed day is a slip, a second in a row restarts), track. `r63Status(c)` computes the run (runStart, day, slips,
  restarts, best, finished) from the log every time; nothing is stored about restarts. `r63Settle()` closes finished runs
  and the tab offers the next step on `R63_LADDER` (first → soft → medium → hard).
- Presets (`R63_PRESETS`): First streak (21 days, three two-minute-style wins with cues), 75 Soft, 75 Medium, 75 Hard (the
  commonly published rules; Frisella is the source for Hard; Soft/Medium have no official version), Your own. The start
  sheet edits name, days, strictness, rules and each rule's moment ("After I…").
- On Today: each running streak is a row under Today's standard in the streak panel, rules as chips to tick.
- Op: `streak_check {rule, done}` and `start_streak {preset, name, days, rules}`; aiSystem gets the running streaks.
- No XP for streaks yet (a judgment call: say if he wants it).

## Round 64 notes (the list is ROUND-64-LIST.md, with Andre's answers)
- **Op is a small tab** (`#opBub.r64-mini`): the log, typing row, caption, status row and grip are hidden; `.r64-st` shows
  `r64State()` (Listening… / Speaking / Thinking… or the tool label / Up next… / Ready, "Replied · open" when his voice is
  off) and opens full screen (r57OpOpen). It tucks away 7 s after he's done (not while hovered). Busy with the tab
  closed: `#r64Dot` (a spinner) shows in its place; tap it to bring the tab back. Round 62's compact/grow log code still
  runs but the log is hidden.
- **Cut-off doubles**: the outermost `opChatLog` wrapper drops an op line that's contained in one of his lines since your
  last message, and replaces a shorter one with the fuller one (`r64Norm`, 5 min window).
- **Unfiled updates**: `r64Unfiled()` scans the last 45 days of your chat lines for app requests (`R64_APP` + `R64_ASK`)
  not found in App updates (text, said, title, summaries; `r62Sim` ≥ .75). They're listed at the top of App updates
  (File / Skip / File all; skips in `state.settings.r64Skip`).
- **Streak console**: the running streaks sit under the fire streak (`.r64-runs`), their rules join Today's standard's
  chips after a divider. Round 63's separate `.r63-today` row is cut out.
- **BMI**: `bmiScaleHtml` redrawn (15–35 scale, zones labelled with your weights). **Fuel**: picks in two columns at the
  bottom, week bars on tracks. **Clients**: leads in an even grid under a hairline.
- **Goals "broken on first open"**: not reproduced. A likely cause: FLIP (`data-flip`, Round 41) glided goal cards from
  where the same goal sat on Today. FLIP now only runs within a page (`r64PageSig`).
- **Analytics**: `analyticsRangeTabs` is a recap button + a 🔍 range button with a popover (Today, This week, Last week,
  This month, Last month, All time, custom dates `ui.anFrom/anTo`). `rangeDays` knows month / lastmonth / custom; those
  render with `r64SpanHtml`. The recap follows the range (`R64_RECAP`): Today opens the day recap; others open the
  `r64Recap` sheet (totals, best day, every day → its day recap).
- **Playbooks overview**: playbook pills (count, Leads/Clients), the chosen playbook's stages as columns (`.r64-col`,
  `data-pb6-col="pbId|stageId"`, the Round 57 capture drop handler moves people), and a "Not on a playbook" tray.

## Round 65 notes (the list is ROUND-65-LIST.md, with Andre's answers)
- **Playbooks are SOPs**: `PB_TYPES` / `PB57_TYPES` are task, call ("Call / event"), doc. `r65Clean()` (every pbSync)
  deletes Report / Access / Send steps from every playbook and removes any open pb task whose step isn't a Task.
  The presets drop those steps (`r60Sp` returns null, `r60St` filters).
- **Only Task steps make tasks**: pbSync runs with `R65.inSync`, and pbState then hands it only Task occurrences (open
  is still all steps, so a stage waits for everything). After the sync, `r65AfterSync`: each client's open call within 60
  days becomes a Calendar event (`r65pb` = step key; `x.pb.r65ev` remembers it, `x.pb.ev` links it so the step follows
  the event); a call whose day has passed is done; a stage with everything done moves on.
- **Documents**: listed on the person's playbook card (`.r65-docs`, link icon for http links, ✓ = `r65DocDone`).
- **No reports**: r55Report / r57CliExport are no-ops, their buttons are removed after every render, the
  `client_report` Op tool is gone.
- **Streaks**: End / Restart call `uiConfirm({title, text})` (they passed a string: the box was empty). The tab is
  `r63Tab` → `.r65s` (run card with a day ring + today's rules + chain, the standard, five start cards, past streaks,
  "How streaks stick" as a sheet).
- **Today**: the streak panel's left side is the day streak + hours worked this week (`.sw-tw`, added if missing,
  "Start one today" removed); a streak's rules are ordinary `.chip`s in Today's standard.
- **Op's tab**: placed by `r65OpPlace` (saved `state.profile.r65OpPos`, default bottom center of the main area), dragged
  by any part but its buttons; double-click puts it back. **Activity pill**: `.ap-warn` ("?") hidden.

## Round 66 notes (the list is ROUND-66-LIST.md, with Andre's answers)
- **Playbook task names**: during pbSync a step still titled "New step" makes no task; `r66TaskNames()` keeps an open
  task's title in step with its step (`t.master.stepTitle` = the step title the task last matched; a task you renamed
  keeps your name).
- **When they finish** (`r66EndHtml`, `ACTIONS.r66End`): They're done / back to any stage (`p.r66End = {stage}`; the
  first stage also sets `repeats`) / on to another playbook (`p.next`). `pbAdvance` honours `r66End` at the last stage.
  "Starts when a lead reaches" is removed (r59LeadSync already puts every open lead on the lead playbook).
- **Calendar → All clients**: `ui.r59CalClient = '__all'`; `r66AllItems` merges `r59ClientItems` of every active client,
  coloured by client, titled with short names / initials. (The selected-day list is dropped by Round 52's layout, as for
  one client.)
- **Challenges**: `R63_PRESETS` gain `level` (1 Warm-up … 4 Hard) and new ones (7-day reset, 30 days clean, Clean eating
  30, Cold 30, 66 days, Monk mode 30 / 90). XP on finishing = days × level rate (20/30/40/60) × 1.2 for "back to day 1"
  (× .6 for "just track"), paid once via `r66XpAdd` (`c.r66Paid`). Starting: the sheet's button is "Next: commit" →
  the oath, the rules, "Why are you doing this?" (required, kept as `c.why`), hold 1.6 s to lock in, then a full-screen
  "Locked in · Day 1". The tab opens with a quote of the day (`R66_QUOTES`) and what finishing is worth (XP, level
  from → to, days left).
- **Setup questions** (`state.profile.r66Me = {country, hols, off, ext, own}`): a card on Today until answered (or "later"
  for the day). `isDayOff` is true on the holidays you take off (± ext days), so the day streak doesn't break;
  `holToday` only returns holidays you celebrate (birthday always); Op's system prompt gets them.
- **Vault**: week / month notes get `openOn` (30 / 91 days after sealing); old ones whose date passed got a new date in
  the future once (`state.settings.r66VaultFixed`). Locked until then.
- **Widgets**: every Today widget is a flex column whose last block fills and centres; a widget is at most 640px tall
  (scrolls inside). Today's tasks below Large shows only Now / Next. Your why: chips, Small by default (moved to S once).
  Leads to reach out to: auto-fit grid.
- **Notifications** (`state.settings.r66Notif = {cats:{id:{on, how}}, social:{likes, comments, shares, followers}}`):
  Settings → Notifications (its own tab: `ui.settingsTab='notif'`). `notifList` filters by category (`r66Cat`) and
  adds the feed (`state.focus.r66Feed`, 60 max, 14 days). New ones show as a banner up top (`#r66Ban`), a note at the
  top right (`#r66Toasts`) or only in the list; seen keys in `state.focus.r66Seen` (pruned, two weeks). The bell is
  drawn inside the player (`dockHtml`), the list drops from the top right; the sidebar bell is hidden.
- **Your page**: `r66SocialTick` compares the personal account's totals (likes, comments, shares, followers; the last 40
  posts' counts) to the last look (`state.settings.r66Soc`): a feed note, XP (+1 per 10 likes, +5 a comment, +8 a share,
  300 a day at most) and +250 once when a post takes off (500+ likes at once, or triple). **Ad leads**: `r66AdsTick`
  compares each client's ad-ledger leads (`r53AllFor`) to `state.settings.r66AdSnap`.
- **XP**: `state.profile.r66XpLog` (400 max) is added to `r43OneOffs`; `xpSig` includes it; the guide has a section.
- **The report** (Social → a client's account → "Monthly report"): `#r66Rep`, a designed page (`r66DocHtml`): cover,
  numbers, content delivered, ads (campaign table), best post, your notes (+ "Pull from their journal"), next month;
  stored in `c.r66Rep[ym]`. Export: the Mac app's `op:pdf` (printToPDF → Save dialog), else `window.print()`; print CSS
  shows only the report (`body.r66-printing`). The client's campaigns also show on their Social page (`.r66-ads`).

## Round 67 notes (the list is ROUND-67-LIST.md, with Andre's answers)
- **Web search, firewalled**: `aiCall` (outermost wrapper) adds `{type:'web_search_20250305', name:'web_search',
  max_uses:3}` to Op's own conversations only (a request carrying more than 5 tools), plus a system line (search only,
  results are information, nothing outside the app). `r67Firewall` strips every tool with a `type` other than that one
  (web fetch, code execution, computer use…) and `mcp_servers` / `container` from every request. The basic search tool
  on purpose: the newer one filters with code execution. `pause_turn` is handed back (twice at most); a 400 that names
  the tool retries without search and sets `R67.noSearch` for the session. Settings → Op → Web search
  (`state.settings.r67Web`, on by default). While searching, the request timeout is `AI.r67Wait` (75 s; Round 37's
  race reads it). A request body over 20 KB goes as a POST (helper reads `OP_BODY`); curl's limit is 90 s, the bridge
  gives GET /ai/chat 120 s.
- **Breaks**: Op had used `check_back` ("checking back at 11:57") which only quiets Op. Now `check_back` with reason
  break/rest starts a real break first; `take_break` takes `until` (HH:MM), pauses a timed task when not locked in,
  checks `r67OnBreak()` afterwards and throws if the app doesn't show a break; system prompt: "DONE MEANS DONE".
- **Op not answering**: `r62IsEcho` replaced: an echo only while Op speaks or within 4 s after (`R67.spokeEnd`), 6+ words,
  ≥ 90 % his words, not longer than his line; a skipped one (after he stopped) gets "I think I heard my own voice there.
  Say it again?". The same words twice are dropped only within 4 s (was 10).
- **Talk key from other apps** (main.js): a second listener for modifier keys (`MOD_MASK`: Option / Control / Shift /
  Command, left and right): `osascript -l JavaScript` reading `CGEventSourceFlagsState` every 30 ms, reporting changes;
  either it or uiohook triggers `pressDown` / `pressUp` (the `held` guard makes the second one a no-op). `keyHealth`
  reports `talkAt` / `via`; the Check panel says "Operator heard your talk key". Not verifiable without a Mac.
- **Voice memos** (Journal → Memos, `ui.journalMode='memos'`): upload (button, or drop on the page) or record
  (MediaRecorder). Queue in memory (`R67.queue`) with durations; the cost card (ElevenLabs at $0.40/h, the higher of
  the plan prices; Op's reading by the brain's price) and Go. Each memo: Scribe through `POST /stt?long=1&ext=…` (bridge
  allows 500 MB and 900 s for it; helper curl 850 s), then one Claude read → `{title, summary, points}`.
  `state.journal.memos` keeps `{id, name, src, date, dur, words, title, summary, points, at}`; the transcript is in
  IndexedDB (`blobTx`, key `memo:<id>`, 60k chars max); audio is never kept. `state.journal.r67Overview` = the full
  list (made from the summaries). Already-done files (name + size) are skipped.
- **Ask Op**: the ✦ Ask Op tab opens `#r67Ask` over the app; chat kept in `state.journal.r67Ask` (60). System = Op's
  + memo summaries + the latest 40 entries; tools = all of Op's (+ search). New tools everywhere: `read_journal`
  (query / month / day / tag) and `memo_transcript` (async: the main tool loop now awaits tool results).
- **My journal filters**: `filteredJournalEntries` replaced (title + text search, `ui.r67JMonth`, `ui.r67JDay`, tag =
  `ui.journalFilterMood`); the bar `.r67-jf` sits above the entries; Round 61's bottom search is removed.
- **New leads stay**: leads created on/after `state.focus.r67Since` with no touch and no stage move show as
  `r67new:<id>` until acted on (a touch, a stage, or ✕ → `state.focus.r67Acted`). Clear all keeps them and the ad-lead
  feed notes; feed ad notes outlive the 14 days until opened.
- **Not mine** (`igCfg().r67NotMine = {campaignId:{name, at}}`): `adClientOf` returns null for them, `adGroups` and
  `r53AllFor` skip them (so totals, the report, ad-lead notifications). The button sits under an opened campaign; the
  list to bring back is at the bottom of the ads overview. Nothing is sent to the ad account.
- **Check-in frequency**: Log center client rows get "Check in" (`.r67-ev`, sets `x.cadenceDays`; Default = Business
  setup). Lead rows already had Round 54's cadence.
- **Did you actually do it?**: `completeTask` asks (`uiConfirm`) when it runs inside a trusted click/drop/key event and the
  task would log something (`r67WhatLogs`: reach, reachLeads, care, pb, deliv). Programmatic calls (Op, sync, tests)
  don't ask. Deliverable "+1 Log one" buttons don't ask (they're an explicit log with Undo).

- **Follow-up (Mac 4.0.1)**: a client's page in Social always has "Ad campaigns" (`r67ClientAdsHtml`, replacing Round
  66's box): each campaign's menu = Theirs / Move to another client / Unassign / Not mine, and "Add a campaign…" (a whole
  ad account at once, unassigned ones, someone else's). Changes go through `r67Assign`, which also rebases
  `state.settings.r66AdSnap` so a move isn't "new leads". The Ads tab's Assign menu (`r50AssignSel`) has "Not mine"
  (Round 67's first button hooked Round 49's rows, which Round 50 had replaced: it never showed). **Free memos**: Memos
  takes transcripts as text (.txt / .md / .rtf files, or "Paste a transcript"; the iPhone's Voice Memos → ⋯ → Copy
  Transcript): no transcription, only Op's read. Claude can't take audio, so audio always needs a transcript first.

## Removed (don't bring back)
GoHighLevel everywhere (stubs in 32z5c-r55.js); client reports outside Social (R65; the report is back in Social only, R66); Op live mode (ElevenLabs agent); Op check-ins while working; "Have Op rewrite it"; client cycles/lifecycle tasks (`r54LcSync` → false); custom XP areas.

## Round 68 notes (2026-11-04; the list is ROUND-68-LIST.md)
- File: 32z78-r68.js (after 32z77-r67.js). Test: scripts/e2e/r68-test.js. Mac 4.1.0.
- **Right-click**: `contactFromEl` finds a person from any row/card that opens exactly one (Log center rows, board cards);
  the contact menu starts with Mark lost / Mark won (leads). Anything else: the right-clicked card's own buttons
  (`r68CardButtons`, up to 10) above the app menu (`appMenuHtml` wrapper; `ctxExtra` op `r68Btn` clicks / runs holds).
  With a session running, the menu has "Edit this session's start".
- **Client backlog by month**: `ui.r68CblOff`; `clientBacklogHtml` swaps `dvwCycle`'s default date while it renders.
- **Streaks from Today's standard**: `c.useStd` (default for new ones). Starting one adds its rules to
  `state.standards.items` (deduped) and keeps `c.rules = []`; `r63DayDone` = `manualStandardsDoneFor(d)`; the run card
  shows the standard items (ticks call `toggleStandard`); Today's streak panel adds no chips for it. A running streak
  with its own rules has "Rules" (`r68RulesSheet`: rename, add, remove, or switch to Today's standard).
- **The running session**: tap the time on Locked in (`#focusElapsed` and the minimal clocks) or right-click → date +
  time of the start (up to 3 days back). Op tool `edit_session {start:'YYYY-MM-DD HH:MM'}`.
- **Memos**: `r67MemosHtml` replaced; `R67.queue` is flushed straight into saved memos (`r68Flush`): text →
  transcript in IndexedDB, audio → the file itself (`memoA:<id>`, played with ▶). Analyze (one) / Analyze all
  (asks with the cost) transcribe if needed and run `r67Read` (conversations: who said what). No overview card, no Go.
- **Op reads every journal**: `read_journal` also returns boards' card text, clients' journals and saved-only memos.
- **Op errors**: `aiErrLine` says plainly: key refused, out of credit, busy, or an old helper. Helper /ping is 18 and
  `OP_HELPER_NEEDS` 18 (Round 67 changed what the helper reads without bumping it); with a helper < 18 big requests
  go in the address as before. The "request body is not valid JSON: EOF" error = new page + old helper.
- **Personal goals**: `.r43-owns` becomes one scrolling row (2 visible) with ‹ › when there are more than 2.
- **Journal tabs**: `.tabs .r62-jtabs` slimmer and lifted so they sit on the tab line without making it taller.
- **iPhone** (main.js, Settings → Connections & data → Your iPhone): off by default; on = an HTTP server on
  0.0.0.0:8940 (private addresses only), `mac/phone.html` + `/api/state|lockin|lockout|task|ask`, every call needs
  the 6-digit code (`X-Op-Code`; 6 wrong → wait a minute). The page asks `operatorPage.phoneState / phoneLockIn /
  phoneLockOut / phoneTask / ask` (Op answers in writing; the phone speaks it). Settings in `DATA_DIR/phone.json`.
  Works on the same Wi-Fi only (no presence detection: a web page can't track location in the background).

## The helpers (127.0.0.1 only)
`bridge.pl` (perl) listens and hands each request to `helper.sh`: **8935, wake** (alarms, music, TTS, the Anthropic proxy, Scribe STT); **8934, activity** (serves `activity.log`). Keys live in `~/Library/Application Support/Operator/*.key` (mode 600). Bump the helper version in `/ping` and `OP_HELPER_NEEDS` together whenever routes change.

## Operator for Mac (mac/)
- Electron 44.7.0 / electron-builder 26.16.1. uiohook-napi (global talk key) is a dependency, `npmRebuild:false`, `asarUnpack **/*.node`.
- Packaging (Linux container, no Apple Developer ID). rcodesign can't be downloaded here, so the zips go out unsigned and
  Andre installs with `bash ~/Downloads/install-operator.sh` (mac/install-operator.sh: unzips with ditto, copies to
  /Applications, signs inside out with codesign, with the stable "Operator Local Signing" identity since 3.6.0, verifies, opens). `codesign --deep` failed for him on 3.2.0; don't send that again.
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
Round 67 (2026-11-03): ROUND-67-LIST.md (11 items). Mac 4.0.0; 4.0.1 adds client ad assignment in Social and free transcripts.
Round 68 (2026-11-04): ROUND-68-LIST.md. Mac 4.1.0.
Round 66 (2026-11-01): ROUND-66-LIST.md (18 items). Mac 3.9.0.
Round 65 (2026-11-01): ROUND-65-LIST.md (9 items). Mac 3.8.0.
Round 64 (2026-11-01): ROUND-64-LIST.md (13 items). Mac 3.7.0.
Round 63 (2026-11-01): ROUND-63-LIST.md (Streaks). Mac 3.6.0 carries Rounds 62 and 63.
Round 62 (2026-11-01): ROUND-62-LIST.md (12 items).
Round 61 (2026-11-01): ROUND-61-LIST.md (14 items).
Round 60 (2026-11-01): ROUND-60-LIST.md (19 items): see Round 60 notes.
Round 59 (2026-10-31): ROUND-59-LIST.md (17 items, with Andre's answers): Op's read fixed and first, talk-button cut,
update write-ups, SOP playbooks + permanent lead playbook, Setup, Log center calendar, packages by cycle day, locking
in, client calendars, Calendar client filter, tab animations, weight & fuel, journal.
Round 58 (2026-10-31): the list from Andre's Op session (ROUND-58-LIST.md, 35 items): updates in his words in one place,
honest "logged", list mode, remove a session, chat times, notes/feed, voice, Op's read, bubble, Business tabs, Playbooks
overview/builder/★, Social accounts + full screen + package links, package calendars + Just me, Settings cleanups.
Packaged as Mac 3.2.0. Round 59: Mac 3.3.0. Round 60: Mac 3.4.0. Round 61: Mac 3.5.0.
Round 57 (2026-10-31): playbooks as pipelines, one task name, Reach out to leads fixes, the Op list (prompt, sessions, AFK, debriefs,
goodnight, reply box, hold-to-talk anywhere, break, ducking, double input, journal tag, notes), journal threads, Socials
content calendar + reports, Op bubble and mood colours, Op's read as a line, food for any day, Analytics hero, XP audit.
Packaged as Mac 3.1.0.
Shipped through 3.0.9 (Round 56: playbooks rebuilt with Board + Build, playbook tasks on the task list, Calendar fits the screen, quote buttons on the author line). Round 55: rank-up message and visuals, GHL removal and a full sweep, quotes (new / write / pin), real XP, money check-in, sidebar signals, notification counter/glow/chime, categoriser fix, Finances UI, ultrawide layouts, Your day labels, the + menu, Playbooks, Op client reports, Social → Clients.
Not done yet (agreed for later): the posting area; calendar task due dates.
