# Operator

Andre's focus, business and life app for the Mac (plus a phone page and NFC tags). Lock in, track deep work,
clients, leads, money, health and the day, with Op, the voice assistant, in the middle of it.

## Where things are

```
app/
  src/js/            the app, one file per part, in load order (src/js/manifest.json)
  src/styles.css     all the styles
  mac/               the Mac app (Electron): main.js, preload.js, phone.html (the iPhone page),
                     helpers/ (helper.sh, bridge.pl), stage.js, package.json
  scripts/build.py   builds src/ into dist/command-center-2.html
  scripts/e2e/       tests (one per round: r78-test.js, …) and screenshot scripts
  docs/              HANDOFF.md (how it all fits), RUNDOWN.md, rounds/ (what changed each round)
```

## Build the Mac app

```
cd app
python3 scripts/build.py                    # → dist/command-center-2.html
cd mac && npm install && node stage.js
npx electron-builder --mac dir --arm64 --x64 --publish never
```

## Test

```
cd app
node scripts/e2e/r78-test.js dist/command-center-2.html     # this round
bash scripts/e2e/run-all.sh                                  # everything
```

## Branches

`main` is the current app. Work for a round happens on a `claude/…` branch and is merged into `main` when it's done.
