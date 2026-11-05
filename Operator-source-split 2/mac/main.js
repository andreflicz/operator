// Operator, the Mac app.
// The same Operator page, in its own window, with what a web page can't do on its own:
//  • it lives in the menu bar and keeps running when you close the window (alarms, Op, the tracking);
//  • ⌥O brings it up (or puts it away) from anywhere;
//  • it starts the local helpers the page talks to on 127.0.0.1 (wake/music/voice/AI 8935, GoHighLevel
//    8936, app activity 8934) and the light "what's in front" poller;
//  • the first time, it brings your data over from Operator for Chrome (or from an export).
const { app, BrowserWindow, Tray, Menu, globalShortcut, nativeImage, shell, dialog, session, powerSaveBlocker, ipcMain } = require('electron');
const path = require('path'), fs = require('fs'), os = require('os');
const { spawn, execFileSync } = require('child_process');

const HOME = os.homedir();
const DATA_DIR = path.join(HOME, 'Library', 'Application Support', 'Operator');
const CHROME_PROFILE = path.join(HOME, 'Library', 'Application Support', 'OperatorAppProfile');
const RES = app.isPackaged ? path.join(process.resourcesPath, 'app') : path.join(__dirname, 'res');
// a newer page dropped in by an update (File → Install update…) wins over the one the app shipped with
const PAGE_SHIPPED = path.join(RES, 'command-center-2.html');
const PAGE_UPDATE = path.join(DATA_DIR, 'App', 'page', 'command-center-2.html');
function pageFile() { try { if (fs.statSync(PAGE_UPDATE).size > 100000 && fs.statSync(PAGE_UPDATE).mtimeMs > fs.statSync(PAGE_SHIPPED).mtimeMs) return PAGE_UPDATE; } catch (e) {} return PAGE_SHIPPED; }
const PORTS = { activity: 8934, wake: 8935, ghl: 8936 };
process.env.OPERATOR_VERSION = app.getVersion();

app.setName('Operator');
app.setPath('userData', path.join(DATA_DIR, 'App'));
// an app that has to ring on time: no slowed-down timers in the background, sound without a click
app.commandLine.appendSwitch('autoplay-policy', 'no-user-gesture-required');
app.commandLine.appendSwitch('disable-background-timer-throttling');
app.commandLine.appendSwitch('disable-renderer-backgrounding');
app.commandLine.appendSwitch('disable-backgrounding-occluded-windows');

if (!app.requestSingleInstanceLock()) { app.quit(); }

let win = null, tray = null, quitting = false, status = {}, blocker = null;
const kids = {};
const log = (...a) => { try { fs.appendFileSync(path.join(DATA_DIR, 'app.log'), new Date().toISOString() + ' ' + a.join(' ') + '\n'); } catch (e) {} };
try { fs.mkdirSync(DATA_DIR, { recursive: true }); } catch (e) {}

// ---------------- moving in from Operator for Chrome ----------------
function alive(pid) { try { process.kill(pid, 0); return true; } catch (e) { return false; } }
function napSync(s) { try { execFileSync('/bin/sleep', [String(s)]); } catch (e) {} }
function stopOldLauncher() {
  // the Chrome version's launcher owns the same ports: it hands over (its cleanup frees them)
  try {
    const pid = Number(fs.readFileSync(path.join(DATA_DIR, 'launcher.pid'), 'utf8').trim());
    if (pid && pid !== process.pid && alive(pid)) {
      const args = execFileSync('/bin/ps', ['-o', 'args=', '-p', String(pid)]).toString();
      if (/MacOS\/Operator/.test(args) && !/Electron|Frameworks/.test(args)) {
        process.kill(pid, 'SIGTERM'); for (let i = 0; i < 25 && alive(pid); i++) napSync(0.2);
        log('stopped the Chrome launcher', pid);
      }
    }
  } catch (e) {}
}
function migrateFromChrome() {
  const ud = app.getPath('userData'), flag = path.join(ud, '.moved-in');
  if (fs.existsSync(flag)) return null;
  fs.mkdirSync(ud, { recursive: true });
  const src = path.join(CHROME_PROFILE, 'Default');
  let copied = [];
  if (fs.existsSync(src) && !fs.existsSync(path.join(ud, 'Local Storage'))) {
    // the old window has to be closed so its storage is complete on disk
    try { execFileSync('/usr/bin/pkill', ['-TERM', '-f', '--', '--user-data-dir=' + CHROME_PROFILE]); napSync(1.5); } catch (e) {}
    for (const d of ['Local Storage', 'IndexedDB']) {
      const from = path.join(src, d);
      if (fs.existsSync(from)) { try { fs.cpSync(from, path.join(ud, d), { recursive: true, filter: (f) => !/\/LOCK$/.test(f) }); copied.push(d); } catch (e) { log('copy failed', d, e.message); } }
    }
  }
  fs.writeFileSync(flag, JSON.stringify({ at: Date.now(), from: copied.length ? 'chrome' : 'none', copied }));
  return copied.length ? 'chrome' : 'none';
}

// ---------------- the helpers ----------------
function freePorts() {
  const ports = Object.values(PORTS).join(' ');
  const sh = 'for port in ' + ports + '; do for pid in $(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null); do case "$(ps -o comm= -p "$pid" 2>/dev/null)" in *perl*|*nc|*bash|*cat) kill "$pid" 2>/dev/null ;; esac; done; done';
  try { execFileSync('/bin/bash', ['-c', sh]); } catch (e) {}
}
function helperEnv() { return Object.assign({}, process.env, { DATA_DIR, CHROME_PID: String(process.pid), PROFILE_DIR: '' }); }
function startKid(name, cmd, args) {
  if (quitting) return;
  const k = spawn(cmd, args, { env: helperEnv(), stdio: 'ignore' });
  kids[name] = k;
  k.on('exit', (code) => { if (kids[name] === k) delete kids[name]; if (!quitting) { log(name, 'stopped', code, '- starting it again'); setTimeout(() => startKid(name, cmd, args), 2500); } });
  k.on('error', (e) => log(name, 'error', e.message));
}
function startHelpers() {
  freePorts();
  const helper = path.join(RES, 'helper.sh'), bridge = path.join(RES, 'bridge.pl');
  for (const kind of ['wake', 'ghl', 'activity']) startKid(kind, '/usr/bin/perl', [bridge, String(PORTS[kind]), kind, helper]);
  startKid('poller', '/bin/bash', [path.join(RES, 'activity.sh')]);
  try { fs.writeFileSync(path.join(DATA_DIR, 'window.pid'), String(process.pid)); fs.writeFileSync(path.join(DATA_DIR, 'opfocus'), '0 0'); } catch (e) {}
  // keep the Mac from idle-sleeping while Operator runs (the display can still turn off), so alarms ring
  blocker = powerSaveBlocker.start('prevent-app-suspension');
}
function stopHelpers() {
  try { execFileSync('/bin/bash', [path.join(RES, 'helper.sh'), 'wake', 'GET /music/stop HTTP/1.1'], { env: helperEnv(), timeout: 4000 }); } catch (e) {}
  for (const k of Object.values(kids)) { try { k.kill('SIGTERM'); } catch (e) {} }
  freePorts();
  if (blocker != null) try { powerSaveBlocker.stop(blocker); } catch (e) {}
}

// ---------------- the window ----------------
function run(js) { if (win && !win.isDestroyed()) return win.webContents.executeJavaScript(js, true).catch(() => null); return Promise.resolve(null); }
function showWin() { if (!win) return; if (app.dock) app.dock.show(); if (win.isMinimized()) win.restore(); win.show(); win.focus(); }
function toggleWin() { if (!win) return; if (win.isVisible() && win.isFocused()) win.hide(); else showWin(); }
function createWindow() {
  win = new BrowserWindow({
    width: 1400, height: 900, minWidth: 960, minHeight: 620, show: false, title: 'Operator', backgroundColor: '#0d0b12',
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false, backgroundThrottling: false, spellcheck: true }
  });
  win.loadFile(pageFile());
  win.once('ready-to-show', () => showWin());
  // the red ✕ puts it away; it keeps running in the menu bar (⌘Q or the menu quits)
  win.on('close', (e) => { if (!quitting) { e.preventDefault(); win.hide(); if (app.dock) app.dock.hide(); } });
  win.on('focus', () => { try { fs.writeFileSync(path.join(DATA_DIR, 'opfocus'), '1 ' + Math.floor(Date.now() / 1000)); } catch (e) {} });
  win.on('blur', () => { try { fs.writeFileSync(path.join(DATA_DIR, 'opfocus'), '0 ' + Math.floor(Date.now() / 1000)); } catch (e) {} });
  // links open in your browser, not in here
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:|^mailto:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
  win.webContents.on('will-navigate', (e, url) => { if (!url.startsWith('file://')) { e.preventDefault(); shell.openExternal(url); } });
  win.webContents.on('render-process-gone', (e, d) => { log('page crashed', d.reason); if (!quitting) setTimeout(() => win && win.reload(), 1000); });
}

// ---------------- the menu bar ----------------
function trayIcon() { const img = nativeImage.createFromPath(path.join(RES, 'trayTemplate.png')); img.setTemplateImage(true); return img; }
function trayMenu() {
  const s = status || {}, login = app.getLoginItemSettings().openAtLogin;
  return Menu.buildFromTemplate([
    { label: 'Show Operator', accelerator: 'Alt+O', click: showWin },
    { type: 'separator' },
    s.locked ? { label: 'Lock out…', click: () => { showWin(); run("operatorPage.lockOut()"); } }
             : { label: 'Lock in', click: () => run("operatorPage.lockIn()") },
    { label: 'Talk to Op', enabled: s.opOn !== false, click: () => { showWin(); run("operatorPage.talk()"); } },
    { label: s.busy ? 'Op: quiet until ' + s.busy : 'Op: busy for an hour', enabled: s.opOn !== false, click: () => run(s.busy ? "operatorPage.busyEnd()" : "operatorPage.busy(60)") },
    { label: s.opOn === false ? 'Turn Op on' : 'Turn Op off', click: () => run("operatorPage.power()") },
    { type: 'separator' },
    { label: 'Journal bubble', type: 'checkbox', accelerator: 'Alt+J', checked: !!bubCfg.on, click: (m) => bubShow(m.checked) },
    { type: 'separator' },
    { label: 'Open at login', type: 'checkbox', checked: login, click: (m) => app.setLoginItemSettings({ openAtLogin: m.checked, openAsHidden: true }) },
    { label: 'Import data…', click: () => importData() },
    { type: 'separator' },
    { label: 'Quit Operator', accelerator: 'Cmd+Q', click: () => { quitting = true; app.quit(); } }
  ]);
}
function trayRefresh() {
  if (!tray) return;
  const s = status || {};
  tray.setTitle(s.label ? ' ' + s.label : '', { fontType: 'monospacedDigit' });
  tray.setToolTip(s.tip || 'Operator');
  tray.setContextMenu(trayMenu());
}
function appMenu() {
  Menu.setApplicationMenu(Menu.buildFromTemplate([
    { role: 'appMenu', submenu: [{ role: 'about' }, { type: 'separator' }, { label: 'Settings…', accelerator: 'Cmd+,', click: () => { showWin(); run("operatorPage.settings()"); } }, { type: 'separator' }, { role: 'hide' }, { role: 'hideOthers' }, { role: 'unhide' }, { type: 'separator' }, { label: 'Quit Operator', accelerator: 'Cmd+Q', click: () => { quitting = true; app.quit(); } }] },
    { label: 'File', submenu: [{ label: 'Import data…', click: () => importData() }, { label: 'Install update…', click: () => installUpdate() }, { label: 'Export data', click: () => run('operatorPage.exportData()') }, { type: 'separator' }, { role: 'close' }] },
    { role: 'editMenu' },
    { label: 'View', submenu: [{ role: 'reload' }, { role: 'toggleDevTools' }, { type: 'separator' }, { role: 'resetZoom' }, { role: 'zoomIn' }, { role: 'zoomOut' }, { type: 'separator' }, { role: 'togglefullscreen' }] },
    { role: 'windowMenu' }
  ]));
}

// ---------------- a page update (a new command-center-2.html) ----------------
async function installUpdate() {
  const r = await dialog.showOpenDialog(win, { title: 'Install an Operator update', buttonLabel: 'Install', properties: ['openFile'], filters: [{ name: 'Operator page', extensions: ['html'] }], defaultPath: path.join(HOME, 'Downloads') });
  if (r.canceled || !r.filePaths[0]) return;
  const f = r.filePaths[0], txt = fs.readFileSync(f, 'utf8');
  if (!/<title>Operator<\/title>/.test(txt) || txt.length < 100000) { dialog.showMessageBox(win, { type: 'warning', message: 'That isn’t an Operator update.' }); return; }
  fs.mkdirSync(path.dirname(PAGE_UPDATE), { recursive: true }); fs.writeFileSync(PAGE_UPDATE, txt);
  win.loadFile(PAGE_UPDATE);
}

// ---------------- your data from an export ----------------
async function importText(text) {
  JSON.parse(text);   // (not a JSON file: stop here)
  await run('operatorPage.importText(' + JSON.stringify(text) + ')');
}
async function importData(file) {
  try {
    if (!file) {
      const r = await dialog.showOpenDialog(win, { title: 'Import Operator data', buttonLabel: 'Import', properties: ['openFile'], filters: [{ name: 'Operator export', extensions: ['json'] }], defaultPath: path.join(HOME, 'Downloads') });
      if (r.canceled || !r.filePaths[0]) return false;
      file = r.filePaths[0];
    }
    await importText(fs.readFileSync(file, 'utf8'));
    showWin(); return true;
  } catch (e) { dialog.showMessageBox(win, { type: 'warning', message: 'That file couldn’t be imported.', detail: String(e.message || e) }); return false; }
}
function latestExport() {
  try {
    const dir = path.join(HOME, 'Downloads');
    const f = fs.readdirSync(dir).filter((n) => /^operator-data.*\.json$/i.test(n)).map((n) => ({ n, t: fs.statSync(path.join(dir, n)).mtimeMs })).sort((a, b) => b.t - a.t)[0];
    return f ? { file: path.join(dir, f.n), at: new Date(f.t) } : null;
  } catch (e) { return null; }
}
async function afterMoveIn(how) {
  // the Chrome version's data came over? (the page has a name, tasks or clients)
  const has = await run("operatorPage.hasData()");
  if (has) { if (how === 'chrome') log('moved in from Chrome'); return; }
  const ex = latestExport();
  const r = await dialog.showMessageBox(win, {
    type: 'question', message: 'Bring your Operator data over?',
    detail: ex ? 'Found an export in Downloads from ' + ex.at.toLocaleString() + '.' : 'In Operator for Chrome: Settings → Connections & data → Export. Then import the file here (File → Import data…).',
    buttons: ex ? ['Import it', 'Choose a file…', 'Start fresh'] : ['Choose a file…', 'Start fresh'], defaultId: 0, cancelId: ex ? 2 : 1
  });
  if (ex && r.response === 0) importData(ex.file);
  else if ((ex && r.response === 1) || (!ex && r.response === 0)) importData();
}


// ---------------- the journal bubble ----------------
// A little round button that floats over everything (drag it where you like). Tap it, write, ⌘↩: it's in your
// journal. ⌥J or the menu bar shows and hides it; where it sits and whether it's out are remembered.
const BUB_FILE = path.join(DATA_DIR, 'bubble.json');
const BUB_SMALL = { w: 64, h: 64 }, BUB_BIG = { w: 340, h: 230 };
let bub = null, bubCfg = { on: true };
try { bubCfg = Object.assign(bubCfg, JSON.parse(fs.readFileSync(BUB_FILE, 'utf8'))); } catch (e) {}
function bubSave() { try { fs.writeFileSync(BUB_FILE, JSON.stringify(bubCfg)); } catch (e) {} }
function bubCreate() {
  if (bub && !bub.isDestroyed()) return bub;
  const { screen } = require('electron'), wa = screen.getPrimaryDisplay().workArea;
  let x = bubCfg.x, y = bubCfg.y;
  const onScreen = x != null && screen.getAllDisplays().some((d) => x >= d.workArea.x - 20 && y >= d.workArea.y - 20 && x <= d.workArea.x + d.workArea.width - 40 && y <= d.workArea.y + d.workArea.height - 40);
  if (!onScreen) { x = wa.x + wa.width - BUB_SMALL.w - 24; y = wa.y + wa.height - BUB_SMALL.h - 24; }
  bub = new BrowserWindow({ x, y, width: BUB_SMALL.w, height: BUB_SMALL.h, frame: false, transparent: true, resizable: false, movable: true, minimizable: false, maximizable: false, fullscreenable: false,
    skipTaskbar: true, hasShadow: false, alwaysOnTop: true, show: false, backgroundColor: '#00000000', acceptFirstMouse: true,
    webPreferences: { preload: path.join(__dirname, 'bubble-preload.js'), contextIsolation: true, nodeIntegration: false } });
  bub.setAlwaysOnTop(true, 'floating');
  try { bub.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true }); } catch (e) {}
  bub.loadFile(path.join(__dirname, 'bubble.html'));
  bub.once('ready-to-show', () => { if (bubCfg.on) bub.showInactive(); });
  bub.on('moved', () => { const b = bub.getBounds(); bubCfg.x = b.x + b.width - BUB_SMALL.w; bubCfg.y = b.y + b.height - BUB_SMALL.h; bubSave(); });
  bub.on('closed', () => { bub = null; });
  return bub;
}
function bubShow(on) {
  bubCfg.on = on; bubSave();
  if (on) { bubCreate(); if (bub.webContents.isLoading()) return; bub.showInactive(); } else if (bub) bub.hide();
  trayRefresh();
}
function bubToggle() {
  // ⌥J: out and closed → open it to write; open → put it away
  if (!bubCfg.on || !bub || !bub.isVisible()) { bubShow(true); const w = bubCreate(); const go = () => { w.show(); w.focus(); w.webContents.send('bubble:focus'); }; if (w.webContents.isLoading()) w.webContents.once('did-finish-load', go); else go(); }
  else bubShow(false);
}
ipcMain.on('bubble:open', (e, on) => {
  if (!bub) return;
  const b = bub.getBounds(), s = on ? BUB_BIG : BUB_SMALL;
  // (it grows up and to the left, so the corner it sits in stays put)
  bub.setBounds({ x: b.x + b.width - s.w, y: b.y + b.height - s.h, width: s.w, height: s.h });
  if (on) bub.focus();
});
// (Round 69: the dot is moved by hand, not as a window drag area: on a Mac a drag area swallows the click, so tapping
// the bubble did nothing)
ipcMain.on('bubble:moveTo', (e, x, y) => { if (!bub) return; const b = bub.getBounds(); bub.setBounds({ x: Math.round(x), y: Math.round(y), width: b.width, height: b.height }); });
ipcMain.handle('bubble:pos', () => { if (!bub) return null; const b = bub.getBounds(); return [b.x, b.y]; });
ipcMain.on('bubble:moved', () => { if (!bub) return; const b = bub.getBounds(); bubCfg.x = b.x + b.width - BUB_SMALL.w; bubCfg.y = b.y + b.height - BUB_SMALL.h; bubSave(); });
ipcMain.handle('bubble:save', async (e, text) => {
  const ok = await run('operatorPage.addJournal(' + JSON.stringify(String(text || '').slice(0, 20000)) + ')');
  return !!ok;
});


// ---------------- the talk key, anywhere on the Mac ----------------
// Like a Discord bind: any key (or a mouse side button) you pick in Settings → Op. Hold it to talk, let go to send
// (or tap on, tap off). It works with Operator hidden. With Operator in front the page handles the key itself, so
// it works there even before macOS lets the app see keys everywhere. macOS needs Operator turned on in
// Privacy & Security → Input Monitoring (and Accessibility); when it isn't, the page is told so and says what to do.
let talk = { on: true, key: 'AltRight', mode: 'hold' }, hookOk = false, held = null, hookTried = false, lastHook = 0, hookErr = '';
function uKey(code) {
  let K = null; try { K = require('uiohook-napi').UiohookKey; } catch (e) { return null; }
  if (!code) return null;
  const alias = { AltLeft: 'Alt', ControlLeft: 'Ctrl', ControlRight: 'CtrlRight', ShiftLeft: 'Shift', MetaLeft: 'Meta' };
  let name = alias[code] || code;
  name = name.replace(/^Key([A-Z])$/, '$1').replace(/^Digit(\d)$/, '$1');
  return K && K[name] != null ? K[name] : null;
}
// (the page names buttons from the browser's numbering: Mouse3 is the right button, Mouse4/5 the side buttons; the global
// hook numbers them 2 = right, 3 = middle, 4/5 = side buttons)
function mouseBtn(code) { const m = /^Mouse(\d)$/.exec(code || ''); if (!m) return null; const n = Number(m[1]); return n === 3 ? 2 : n === 2 ? 3 : n; }
function front() { return !!(win && !win.isDestroyed() && win.isVisible() && win.isFocused()); }
// Round 67: the Option key from other apps. On a Mac, Option, Control, Shift and Command don't arrive as key presses but
// as "the modifier keys changed", and if the global hook misses those (or macOS hasn't let it in yet) nothing happens.
// So for those keys there's a second, independent listener: a tiny script that reads which modifier keys are held,
// left and right apart (CGEventSourceFlagsState, about 30 times a second), and reports a change. Either one can start
// talking; the other is ignored while the key is held.
const MOD_MASK = { AltLeft: 0x20, AltRight: 0x40, ControlLeft: 0x01, ControlRight: 0x2000, ShiftLeft: 0x02, ShiftRight: 0x04, MetaLeft: 0x08, MetaRight: 0x10 };
let modProc = null, modTries = 0, modDown = false, lastTalk = 0, lastVia = '';
const MOD_JXA = [
  "ObjC.import('Cocoa'); try { ObjC.import('CoreGraphics'); } catch (e) {}",
  "var last = -1;",
  "while (true) {",
  "  var f = Number($.CGEventSourceFlagsState(1)) & 0x207f;",
  "  if (f !== last) { last = f; console.log('F ' + f); }",
  "  delay(0.03);",
  "}"
].join('\n');
function modStart() {
  if (process.platform !== 'darwin' || modProc || !MOD_MASK[talk.key] || !talk.on) return;
  if (modTries > 5) return;
  modTries++;
  try {
    const { spawn } = require('child_process');
    const p = spawn('/usr/bin/osascript', ['-l', 'JavaScript', '-e', MOD_JXA], { stdio: ['ignore', 'pipe', 'pipe'] });
    modProc = p;
    let buf = '';
    const onData = (d) => {
      buf += String(d); let i;
      while ((i = buf.indexOf('\n')) >= 0) {
        const line = buf.slice(0, i).trim(); buf = buf.slice(i + 1);
        const m = /^F (\d+)$/.exec(line); if (!m) continue;
        const mask = MOD_MASK[talk.key]; if (!mask) continue;
        const on = (Number(m[1]) & mask) !== 0;
        if (on && !modDown) { modDown = true; lastTalk = Date.now(); lastVia = 'modifiers'; pressDown(); }
        else if (!on && modDown) { modDown = false; pressUp(); }
      }
    };
    p.stdout.on('data', onData); p.stderr.on('data', onData);
    p.on('exit', (code) => { modProc = null; modDown = false; log('modifier listener stopped', code); if (talk.on && MOD_MASK[talk.key]) setTimeout(modStart, 5000); });
    log('modifier listener on for', talk.key);
  } catch (e) { modProc = null; log('modifier listener failed', String(e && e.message || e)); }
}
function modStop() { if (modProc) { try { modProc.kill(); } catch (e) {} modProc = null; modDown = false; } }
function keyHealth() {
  let need = '';
  if (process.platform === 'darwin') { try { if (!require('electron').systemPreferences.isTrustedAccessibilityClient(false)) need = 'Accessibility'; } catch (e) {} }
  if (!need && hookOk && !lastHook) need = 'ListenEvent';
  return { hooked: hookOk, last: lastHook, now: Date.now(), ok: hookOk && !need ? true : (need ? false : null), need: need || '', err: hookErr, talkAt: lastTalk, via: lastVia, mods: !!modProc };
}
function healthToPage() { run('operatorPage.talkKeyHealth && operatorPage.talkKeyHealth(' + JSON.stringify(keyHealth()) + ')'); }
function pressDown() { if (held) return; held = { other: false, at: Date.now() }; if (talk.mode === 'hold' && talk.on && !front()) run('operatorPage.talkDown ? operatorPage.talkDown() : operatorPage.talkToggle()'); }
function pressUp() { const h = held; held = null; if (!h || !talk.on || front()) return; if (talk.mode === 'hold') run('operatorPage.talkUp ? operatorPage.talkUp() : null'); else if (!h.other) run('operatorPage.talkToggle()'); }
function hookStart() {
  if (hookOk) return;
  try {
    if (process.platform === 'darwin') {
      const { systemPreferences } = require('electron');
      if (!systemPreferences.isTrustedAccessibilityClient(false)) {
        if (!hookTried) { hookTried = true; systemPreferences.isTrustedAccessibilityClient(true); }
        healthToPage(); setTimeout(hookStart, 10000); return;
      }
    } else if (!process.env.OP_KEY_HOOK) return;
    const { uIOhook } = require('uiohook-napi');
    uIOhook.on('keydown', (e) => { lastHook = Date.now(); const k = uKey(talk.key); if (k != null && e.keycode === k) { lastTalk = Date.now(); lastVia = 'hook'; pressDown(); } else if (held) held.other = true; });
    uIOhook.on('keyup', (e) => { lastHook = Date.now(); const k = uKey(talk.key); if (k != null && e.keycode === k) pressUp(); });
    uIOhook.on('mousedown', (e) => { lastHook = Date.now(); if (mouseBtn(talk.key) === e.button) pressDown(); else if (held) held.other = true; });
    uIOhook.on('mouseup', (e) => { lastHook = Date.now(); if (mouseBtn(talk.key) === e.button) pressUp(); });
    uIOhook.start(); hookOk = true;
    run('window.__opGlobalKey = true');
    log('talk key hooked');
    setTimeout(healthToPage, 15000);
  } catch (e) { hookErr = String(e && e.message || e); log('talk key hook failed', hookErr); healthToPage(); }
}
ipcMain.on('op:talkPrefs', (e, p) => { talk.on = p.on !== false; if (p.key) talk.key = String(p.key); talk.mode = p.mode === 'tap' ? 'tap' : 'hold'; if (talk.on) { hookStart(); modTries = 0; modStart(); } if (!talk.on || !MOD_MASK[talk.key]) modStop(); healthToPage(); });
ipcMain.handle('op:talkHealth', () => keyHealth());
function openPane(which) {
  const pane = which === 'Accessibility' ? 'Privacy_Accessibility' : 'Privacy_ListenEvent';
  // (newer macOS names the pane differently; the old link still works on most versions, so try it first)
  return shell.openExternal('x-apple.systempreferences:com.apple.preference.security?' + pane)
    .catch(() => shell.openExternal('x-apple.systempreferences:com.apple.settings.PrivacySecurity.extension?' + pane))
    .catch(() => null);
}
ipcMain.on('op:openPrivacy', (e, which) => { openPane(which); });
// Round 62: "Check" does something you can see. It asks macOS to list Operator under Accessibility (macOS shows its own
// prompt the first time), starts listening for the key if it wasn't, opens the setting still missing, and reports back.
// macOS only lets an app see keys from other apps after the app restarts, so the page then offers a restart.
// Round 69: a switch that shows on in System Settings but belongs to an older copy of Operator (another signature) does
// nothing, and turning it off and on doesn't help. So when macOS says Operator isn't allowed, Check clears Operator's old
// entries first (tccutil reset, only Operator's own) and asks again: a fresh switch appears, off, ready to turn on.
const BUNDLE_ID = 'com.local.operator';
let lastCheck = 0;
function tccReset(service) {
  return new Promise((res) => { try { require('child_process').execFile('/usr/bin/tccutil', ['reset', service, BUNDLE_ID], (err) => { log('tcc reset', service, err ? String(err.message || err) : 'ok'); res(!err); }); } catch (e) { res(false); } });
}
ipcMain.handle('op:talkCheck', async () => {
  let trusted = true, reset = '';
  if (process.platform === 'darwin') {
    try { trusted = require('electron').systemPreferences.isTrustedAccessibilityClient(false); } catch (e) {}
    if (!trusted) {
      if (await tccReset('Accessibility')) reset = 'Accessibility';
      await tccReset('ListenEvent');
      try { trusted = require('electron').systemPreferences.isTrustedAccessibilityClient(true); } catch (e) {}
    } else if (hookOk && !lastHook && lastCheck && Date.now() - lastCheck > 20000) {
      // allowed, listening, but not one key has come through: the Input Monitoring switch is the stale one
      if (await tccReset('ListenEvent')) reset = 'Input Monitoring';
    }
  }
  lastCheck = Date.now();
  if (talk.on) hookStart();
  const h = keyHealth();
  openPane(!trusted ? 'Accessibility' : 'ListenEvent');
  return Object.assign(h, { trusted: trusted, reset: reset, opened: !trusted ? 'Accessibility' : 'Input Monitoring' });
});
// Round 66: the client report as a real PDF (the page shows only the report while it prints)
ipcMain.handle('op:pdf', async (e, name) => {
  try {
    const wc = e.sender, owner = BrowserWindow.fromWebContents(wc) || win;
    const data = await wc.printToPDF({ printBackground: true, pageSize: 'Letter', margins: { marginType: 'none' }, preferCSSPageSize: true });
    const r = await dialog.showSaveDialog(owner, { title: 'Save the report', defaultPath: path.join(HOME, 'Downloads', String(name || 'Report.pdf').replace(/[\/:*?"<>|]+/g, '-')), filters: [{ name: 'PDF', extensions: ['pdf'] }] });
    if (r.canceled || !r.filePath) return { saved: false };
    fs.writeFileSync(r.filePath, data);
    shell.showItemInFolder(r.filePath);
    return { saved: true, path: r.filePath };
  } catch (err) { return { saved: false, err: String(err && err.message || err) }; }
});
ipcMain.on('op:relaunch', () => { quitting = true; app.relaunch(); app.quit(); });

// ---------------- the page talks back ----------------
ipcMain.on('op:status', (e, s) => { status = s || {}; trayRefresh(); });
ipcMain.on('op:show', () => showWin());
ipcMain.handle('op:loginItem', () => app.getLoginItemSettings().openAtLogin);
ipcMain.handle('op:setLoginItem', (e, on) => { app.setLoginItemSettings({ openAtLogin: !!on, openAsHidden: true }); return app.getLoginItemSettings().openAtLogin; });
ipcMain.handle('op:importFile', () => importData());

// ---------------- start, stop ----------------
app.on('second-instance', () => showWin());
app.on('activate', () => showWin());
app.on('before-quit', () => { quitting = true; });
app.on('will-quit', () => { globalShortcut.unregisterAll(); stopHelpers(); modStop(); try { if (hookOk) require('uiohook-napi').uIOhook.stop(); } catch (e) {} });
// (before anything opens the page's storage)
let how = null;
if (app.hasSingleInstanceLock()) { stopOldLauncher(); try { how = migrateFromChrome(); } catch (e) { log('move-in failed', e.message); } }
app.whenReady().then(() => {
  session.defaultSession.setPermissionRequestHandler((wc, perm, cb) => cb(['media', 'notifications', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'speaker-selection', 'idle-detection'].includes(perm)));
  session.defaultSession.setPermissionCheckHandler((wc, perm) => ['media', 'notifications', 'clipboard-read', 'clipboard-sanitized-write', 'fullscreen', 'speaker-selection'].includes(perm));
  startHelpers();
  appMenu();
  createWindow();
  tray = new Tray(trayIcon()); trayRefresh();
  if (!globalShortcut.register('Alt+O', toggleWin)) log('⌥O is taken by another app');
  if (!globalShortcut.register('Alt+J', bubToggle)) log('⌥J is taken by another app');
  if (bubCfg.on) bubCreate();
  if (how) win.webContents.once('did-finish-load', () => setTimeout(() => afterMoveIn(how), 2500));
  win.webContents.on('did-finish-load', () => { if (hookOk) run('window.__opGlobalKey = true'); });
});

// ---- Round 68: Operator on your iPhone ----
// Off until you turn it on (Settings → Connections & data → Your iPhone). Then a small page is served on your home
// Wi-Fi (port 8940): open it in Safari on the iPhone, type the 6-digit code once, and Add to Home Screen. From there you
// can talk to Op (typed or dictated), lock in and out, and add a task. Every request needs the code; nothing is
// reachable from outside your network, and the page only asks the app the few things below.
const PHONE_FILE = path.join(DATA_DIR, 'phone.json');
let phone = { on: false, code: '' }, phoneSrv = null, phoneSeen = 0;
try { phone = Object.assign(phone, JSON.parse(fs.readFileSync(PHONE_FILE, 'utf8'))); } catch (e) {}
function phoneSave() { try { fs.mkdirSync(DATA_DIR, { recursive: true }); fs.writeFileSync(PHONE_FILE, JSON.stringify(phone), { mode: 0o600 }); } catch (e) {} }
function lanIp() {
  const nets = os.networkInterfaces();
  for (const k of Object.keys(nets)) for (const n of nets[k] || []) if (n.family === 'IPv4' && !n.internal && !/^169\.254\./.test(n.address)) return n.address;
  return '';
}
function phoneInfo() { return { on: !!phone.on, code: phone.code, url: phone.on && lanIp() ? 'http://' + lanIp() + ':8940' : '', seen: phoneSeen }; }
function phoneStop() { if (phoneSrv) { try { phoneSrv.close(); } catch (e) {} phoneSrv = null; } }
function phoneStart() {
  phoneStop(); if (!phone.on) return;
  if (!/^\d{6}$/.test(phone.code || '')) { phone.code = String(Math.floor(100000 + Math.random() * 900000)); phoneSave(); }
  const http = require('http');
  const page = (() => { try { return fs.readFileSync(path.join(__dirname, 'phone.html'), 'utf8'); } catch (e) { return '<h1>Operator</h1>'; } })();
  const fails = {};
  phoneSrv = http.createServer((req, res) => {
    const ip = (req.socket.remoteAddress || '').replace(/^::ffff:/, '');
    // (only your own network: private addresses)
    if (!/^(10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|127\.|::1$|fe80:)/i.test(ip)) { res.writeHead(403); return res.end(); }
    const send = (code, obj, type) => { res.writeHead(code, { 'Content-Type': type || 'application/json', 'Cache-Control': 'no-store' }); res.end(type ? obj : JSON.stringify(obj)); };
    const u = new URL(req.url, 'http://x');
    if (req.method === 'GET' && (u.pathname === '/' || u.pathname === '/index.html')) return send(200, page, 'text/html; charset=utf-8');
    if (u.pathname === '/manifest.json') return send(200, JSON.stringify({ name: 'Operator', short_name: 'Operator', display: 'standalone', background_color: '#0d0f14', theme_color: '#0d0f14', start_url: '/' }), 'application/manifest+json');
    if (!u.pathname.startsWith('/api/')) return send(404, { error: 'not found' });
    // (six wrong codes from one address: it waits a minute)
    const f = fails[ip] || { n: 0, at: 0 };
    if (f.n >= 6 && Date.now() - f.at < 60000) return send(429, { error: 'wait a minute' });
    if (req.headers['x-op-code'] !== phone.code) { fails[ip] = { n: f.n + 1, at: Date.now() }; return send(401, { error: 'wrong code' }); }
    fails[ip] = { n: 0, at: 0 }; phoneSeen = Date.now();
    let body = '';
    req.on('data', (c) => { body += c; if (body.length > 20000) req.destroy(); });
    req.on('end', async () => {
      let x = {}; try { x = body ? JSON.parse(body) : {}; } catch (e) {}
      const act = u.pathname.slice(5);
      const calls = {
        state: 'operatorPage.phoneState()',
        lockin: 'operatorPage.phoneLockIn()',
        lockout: 'operatorPage.phoneLockOut()',
        ask: 'operatorPage.ask(' + JSON.stringify(String(x.text || '').slice(0, 4000)) + ')',
        task: 'operatorPage.phoneTask(' + JSON.stringify(String(x.title || '').slice(0, 200)) + ')',
        break: 'operatorPage.phoneBreak ? operatorPage.phoneBreak(' + (Math.max(0, Math.min(240, Math.round(Number(x.min) || 0)))) + ') : null'
      };
      if (!calls[act]) return send(404, { error: 'not found' });
      const out = await run('Promise.resolve(' + calls[act] + ')');
      // (how long since the Mac was last touched, in seconds: the phone shows "Idle 40m" when you've walked off)
      if (out && typeof out === 'object') { try { out.idle = require('electron').powerMonitor.getSystemIdleTime(); } catch (e) {} }
      send(200, { ok: out != null, out: out });
    });
  });
  phoneSrv.on('error', (e) => log('phone server', e.message));
  phoneSrv.listen(8940, '0.0.0.0');
}
ipcMain.handle('phone:info', () => phoneInfo());
ipcMain.handle('phone:set', (e, on) => { phone.on = !!on; if (on && !phone.code) phone.code = ''; phoneSave(); phoneStart(); return phoneInfo(); });
ipcMain.handle('phone:newCode', () => { phone.code = ''; phoneSave(); phoneStart(); return phoneInfo(); });
app.whenReady().then(() => { if (phone.on) phoneStart(); });
app.on('will-quit', () => phoneStop());
