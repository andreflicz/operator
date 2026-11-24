# Operator: rundown for a new chat (as of Nov 9, 2026, Round 69, Mac 4.2.0)

## What it is
Operator is Andre's personal "lock in" app: focus sessions, tasks, business (clients, leads, ads, deliverables),
personal (journal, goals, streaks, finances), and **Op**, a built-in Claude assistant that can do almost anything in the
app via tools. It's for Andre's own use but every feature is built generally (not hard-coded to him).

It ships two ways:
- **The page**: one self-contained HTML file, `dist/command-center-2.html` (also kept in this project as
  `claude/command-center-2.html`).
- **Operator for Mac**: an Electron wrapper around that page (`mac/`), with a menu-bar item, a floating journal bubble,
  a global talk key for Op, an activity tracker, and an iPhone page served over Wi-Fi.

## Where things are
- GitHub: `andreflicz/operator`. **Latest branch: `claude/dreamy-carson-ozyoy0`** (Round 69, commit cf61ff8).
  Everything lives under `app/` (it was `Operator-source-split 2/` until Round 78).
- `src/js/*.js`: the page source, concatenated in the order of `src/js/manifest.json` into **one closure**. Later files
  override earlier ones, usually with `fn = (function(base){ return function(){ … base.apply(this, arguments) }; })(fn)`.
  Each round adds a file (`32z78-r68.js`, `32z79-r69.js` …).
- `src/styles.css`: all styles (each round appends a block).
- `mac/`: `main.js` (Electron main, phone server on port 8940, talk key via uiohook, bubble, tray), `preload.js`,
  `bubble.html`, `phone.html`, `stage.js`, `install-operator.sh`.
- `mac/helpers/helper.sh` + `bridge.pl`: the local helper (Anthropic calls, etc.);
  `stage.js` copies them into `mac/res`. Helper version is `"helper":18`; the page's `OP_HELPER_NEEDS` must match.
- **`HANDOFF.md`**: the long technical handoff (read it first). `ROUND-NN-LIST.md`: what each round changed.

## Build, test, package
```
python3 scripts/build.py                     # → dist/command-center-2.html
node scripts/smoke-test.js
node scripts/e2e/rNN-test.js dist/command-center-2.html   # per-round suites (r5 … r69, regressions)
xvfb-run -a node scripts/e2e/mac-app-test.js # real Electron test
```
Mac release: bump `mac/package.json` + `package-lock.json` → `cd mac && node stage.js` →
`npx electron-builder --mac dir --arm64 --x64 --publish never` → delete non-darwin `uiohook-napi/prebuilds` →
zip `out/mac-arm64` → `Operator-X-AppleSilicon.zip`, `out/mac` → `Operator-X-Intel.zip` (`zip -qry`).
Send the zips **with `install-operator.sh`**. Andre runs `bash ~/Downloads/install-operator.sh`: it signs with a stable
local identity so macOS keeps Accessibility / Input Monitoring permissions. **Don't tell him to drag the app in by
hand.** That changes the signature and silently breaks the talk key (Round 69 added auto-reset for that case).

Known flaky/old: `r16` "…and on a yes, the business brief" fails on older builds too.

## How Andre likes to work
- Give him a numbered list of his asks, ask only questions that matter, then build.
- Be thorough; triple-check (run the suites, look at screenshots).
- **Minimal design: no small grey explainer text.** Plain words, no jargon.
- Push to GitHub after each step. Commit messages end with the Co-Authored-By / Claude-Session lines.
- When asked for "the update file", just send the zip (AppleSilicon) and nothing else.
- Update `claude/operator-handoff.md` and `claude/command-center-2.html` in this project at the end of a round.

## Big pieces (where to look)
- **Focus / lock in**: `19-focus.js`, `32m-lock-in.js`. `state.focus.activeSession` (breaks, onBreak), sessions log.
  Breaks over 2 h become clocking out (r69). Edit a running session's start (tap the timer / right-click / Op
  `edit_session`, r68).
- **Op**: `32x-op.js` (`aiCall`, `aiAsk`, `AI.history`, plain error lines), tools in `OP_TOOLS` + `opRunTool`
  (`32z17-op-control.js`, `32z62-r57op.js`, wrapped in later rounds). Op can lock in/out directly (r69), read every
  journal (entries, boards, client journals, memos), add tasks, take breaks, etc.
- **Streaks**: `state.standards.challenges` (r63–r66); by default a streak day counts when **Today's standard** is
  done, and a streak's rules get added to Today's standard (r68). Own-rules streaks are still possible.
- **Right-click menus**: `33c-context-menu.js` + r68 (Mark lost/won on leads, card buttons).
- **Voice memos**: just saved by default, with Analyze / Analyze all (r67–r68).
- **iPhone** (r68–r69): Settings → Op → Your iPhone → scan the QR (code rides in `#c=`). Same Wi-Fi only.
  Lock in/out, breaks, today's locked-in time, what's on the Mac / idle, talk to Op, add task.
- **Mac permissions** (r69): Settings → Op → Check resets stale TCC entries (`tccutil reset … com.local.operator`).

## Open / worth knowing
- Phone needs the Mac awake with Operator running; no location tracking (a web page can't do that).
- Not yet confirmed on Andre's real Mac: the r69 bubble click fix and the permission reset. Ask how they went.
- `canvas` artifact ("The app now") holds screenshots of the live app; other rounds manage it.
