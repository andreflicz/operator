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
    skipTaskbar: true, hasShadow: false, alwaysOnTop: true, show: false, backgroundColor: '#00000000',
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
function mouseBtn(code) { const m = /^Mouse(\d)$/.exec(code || ''); return m ? Number(m[1]) : null; }
function front() { return !!(win && !win.isDestroyed() && win.isVisible() && win.isFocused()); }
function keyHealth() {
  let need = '';
  if (process.platform === 'darwin') { try { if (!require('electron').systemPreferences.isTrustedAccessibilityClient(false)) need = 'Accessibility'; } catch (e) {} }
  if (!need && hookOk && !lastHook) need = 'ListenEvent';
  return { hooked: hookOk, last: lastHook, ok: hookOk && !need ? true : (need ? false : null), need: need || '', err: hookErr };
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
    uIOhook.on('keydown', (e) => { lastHook = Date.now(); const k = uKey(talk.key); if (k != null && e.keycode === k) pressDown(); else if (held) held.other = true; });
    uIOhook.on('keyup', (e) => { lastHook = Date.now(); const k = uKey(talk.key); if (k != null && e.keycode === k) pressUp(); });
    uIOhook.on('mousedown', (e) => { lastHook = Date.now(); if (mouseBtn(talk.key) === e.button) pressDown(); else if (held) held.other = true; });
    uIOhook.on('mouseup', (e) => { lastHook = Date.now(); if (mouseBtn(talk.key) === e.button) pressUp(); });
    uIOhook.start(); hookOk = true;
    run('window.__opGlobalKey = true');
    log('talk key hooked');
    setTimeout(healthToPage, 15000);
  } catch (e) { hookErr = String(e && e.message || e); log('talk key hook failed', hookErr); healthToPage(); }
}
ipcMain.on('op:talkPrefs', (e, p) => { talk.on = p.on !== false; if (p.key) talk.key = String(p.key); talk.mode = p.mode === 'tap' ? 'tap' : 'hold'; if (talk.on) hookStart(); healthToPage(); });
ipcMain.handle('op:talkHealth', () => keyHealth());
ipcMain.on('op:openPrivacy', (e, which) => { const pane = which === 'Accessibility' ? 'Privacy_Accessibility' : 'Privacy_ListenEvent'; shell.openExternal('x-apple.systempreferences:com.apple.preference.security?' + pane).catch(() => null); });

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
app.on('will-quit', () => { globalShortcut.unregisterAll(); stopHelpers(); try { if (hookOk) require('uiohook-napi').uIOhook.stop(); } catch (e) {} });
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
