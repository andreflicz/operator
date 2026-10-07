# Operator — source layout

This is the split-up source for the Operator dashboard (`command-center-2.html`,
the file `Operator-2-7-2.app/Contents/Resources/` loads). It used to be one
7,100-line file; it's now organized into files by feature so edits are cheap
and localized, but it still **builds into the exact same single HTML file**
the app needs — there's no framework, no bundler dependency at runtime, and
nothing changes about how the app itself works.

## Layout

```
src/
  head.html              <!DOCTYPE>, <meta>, <title>, font <link>s
  styles.css             all CSS (unwrapped — no <style> tags)
  body-shell.html         static body markup: sidebar nav, all modal/overlay shells
  js/
    manifest.json         ordered list of the section files below (build reads this)
    01-storage.js
    02-helpers.js
    02b-dom-morph.js       in-place re-render (morphInto) used by renderView + all modals
    03-scroll-picker.js
    04-defaults.js
    05-state-normalization.js
    06-sound.js
    07-client-helpers.js
    08-days-off-standards-streak.js
    09-charts.js
    10-delete-confirm.js
    11-reset-data.js
    12-clear-journal-confirm.js
    13-task-card.js
    14-mini-calendar.js
    15-upcoming.js
    16-dashboard-panels.js
    17-today.js
    18-tasks.js
    19-focus.js
    20-pre-focus-modal.js
    21-app-activity-tracking.js
    22-fitness-health.js
    23-journal.js
    24-goals.js
    25-packages-plans.js
    26-personal.js
    27-finances.js
    28-business.js
    29-calendar.js
    30-settings.js
    31-nav-render-dispatch.js
    32-clock-timer-alarms.js
    33-event-delegation.js
    34-init.js
  tail.html               </script></body></html>
scripts/
  build.py                reassembles src/ -> dist/command-center-2.html
  smoke-test.js            headless-Chromium check: app loads, all 6 nav views render, no JS errors
dist/
  command-center-2.html    the built file — copy this into the .app bundle
packaged/
  Operator-2-7-2.app/      a full app bundle with dist/'s output already dropped in
```

This split (into 34 numbered section files) mirrors the `// ==== SECTION ====`
comment headers that were already in the original file, so nothing was
reorganized or renamed — the code inside each file is byte-for-byte what it
was before, just in its own file. `scripts/build.py` concatenates everything
back in the original order; running it against the untouched split produces
output that's byte-identical (verified with `diff`/`md5sum`) to the
original `command-center-2.html`.

Rendering note: `renderView()` and every modal's `render…Into()` patch the live DOM with
`morphInto()` (02b-dom-morph.js) instead of replacing `innerHTML`, so unchanged nodes are
never rebuilt (no flashes, no lost scroll, no reset form fields). Only navigating to a
different view does a full replace + fade. Give a wrapper element a `data-key` when it
should be treated as new content (e.g. the active tab's panel) so its entry animation runs.

It's still all one JS scope (one `(function(){ ... })()` closure at build
time), same globals (`state`, `ui`, etc.), same one delegated click handler.
Splitting by file doesn't change any of that — it's purely an editing
convenience, not a rewrite. See the project's `operator-handoff.md` doc for
the architecture conventions themselves (state shape, the data-action
dispatch pattern, time-tracking systems, etc.) — those didn't change.

## Workflow for every future update

1. Edit the relevant `src/js/NN-section-name.js` file (or `styles.css` /
   `body-shell.html` for markup/CSS changes). Only touch the section(s) a
   given update actually needs.
2. `python3 scripts/build.py` — rebuilds `dist/command-center-2.html`.
3. `node scripts/smoke-test.js` — loads the built file in headless Chromium,
   clicks through all six nav tabs, and fails on any JS error or a view that
   renders empty.
4. For anything touching a specific flow (a new modal, a changed calculation,
   a new button), also drive that flow directly in Playwright and/or take a
   screenshot before calling it done — the smoke test only catches crashes
   and empty views, not wrong behavior.
5. Copy `dist/command-center-2.html` into
   `Operator-2-7-2.app/Contents/Resources/command-center-2.html`, re-zip the
   `.app`, and confirm `Contents/MacOS/Operator` kept its executable bit
   after the zip round-trip.
6. Deliver the updated `.app.zip`.

`src/js/manifest.json` controls file order in the build — if a new section
is ever split out on its own, add it to that list.
