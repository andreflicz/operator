// Build 6: the Mac app's shell, run for real (Electron) on a pretend home folder.
// A pretend "Operator for Chrome" profile is made first (real Chromium storage with a name and a task in it),
// then the app starts: it should move that data in, hand the page its bridge, start the helpers and quit cleanly.
// Run under a display: xvfb-run -a node scripts/e2e/mac-app-test.js
const { chromium, _electron } = require('playwright');
const path = require('path'), fs = require('fs'), os = require('os'), http = require('http');
const { check, report } = require('./common.js');
const MAC = path.join(__dirname, '..', '..', 'mac');
const get = (port, p) => new Promise((res) => { const r = http.get({host:'127.0.0.1', port, path:p, timeout:4000}, (x) => { let b = ''; x.on('data', (d) => b += d); x.on('end', () => res({code:x.statusCode, body:b})); }); r.on('error', () => res(null)); r.on('timeout', () => { r.destroy(); res(null); }); });
(async () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'op-home-'));
  const prof = path.join(home, 'Library', 'Application Support', 'OperatorAppProfile');
  // 1. the old app's data, in a real Chromium profile, at the same file:// origin
  const page = path.join(MAC, 'res', 'command-center-2.html');
  const old = await chromium.launchPersistentContext(prof, {headless:true, args:['--no-sandbox']});
  const op = await old.newPage(); await op.goto('file://'+page); await op.waitForTimeout(800);
  await op.evaluate(() => { localStorage.setItem('opsdash:profile', JSON.stringify({name:'Andre Lopez'})); localStorage.setItem('opsdash:tasks', JSON.stringify({items:[{id:'m1', title:'Moved-in task', status:'today'}]})); });
  await op.waitForTimeout(300); await old.close();
  check('a Chrome-version profile to move in from', fs.existsSync(path.join(prof, 'Default', 'Local Storage')));

  // 2. the app
  const app = await _electron.launch({executablePath:require(path.join(MAC, 'node_modules', 'electron')), args:[path.join(MAC, 'main.js'), '--no-sandbox'], cwd:MAC, env:Object.assign({}, process.env, {HOME:home, ELECTRON_DISABLE_SECURITY_WARNINGS:'1'})});
  const win = await app.firstWindow(); await win.waitForLoadState('domcontentloaded'); await win.waitForTimeout(3500);
  const pk = await win.evaluate(() => operatorPage.peek()), name = pk.name, tasks = pk.tasks;
  check('your data comes over from Operator for Chrome on the first open', name==='Andre Lopez' && tasks.includes('Moved-in task'), {name, tasks});
  check('the page knows it is in the Mac app', await win.evaluate(() => !!(window.operatorApp && window.operatorApp.isApp) && document.documentElement.classList.contains('is-mac-app')));
  check('no Node in the page', await win.evaluate(() => typeof require==='undefined' && typeof process==='undefined'));
  const ping = await get(8935, '/ping');
  check('the helpers are up (wake / voice / AI on 8935)', !!ping && /"helper":17/.test(ping.body), ping);
  const act = await get(8934, '/');
  check('the activity helper answers (8934)', !!act && act.code===200, act);
  await app.evaluate(({Menu}) => { const m = Menu.getApplicationMenu(); m.items[0].submenu.items.find((i) => /Settings/.test(i.label)).click(); }); await win.waitForTimeout(500);
  check('the app menu drives the page (Settings…)', (await win.evaluate(() => operatorPage.peek())).view==='settings');
  const st = await app.evaluate(({BrowserWindow}) => { const w = BrowserWindow.getAllWindows()[0]; return {title:w.getTitle(), visible:w.isVisible()}; });
  check('one window, titled Operator', st.visible && /Operator/.test(st.title), st);
  // the red ✕ only hides it; it keeps running
  await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].close()); await win.waitForTimeout(500);
  const after = await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows().map((w) => w.isVisible()));
  check('closing the window keeps Operator running (menu bar)', after.length===1 && after[0]===false, after);
  await app.evaluate(({app}) => { app.emit('second-instance'); }); await win.waitForTimeout(300);
  check('opening it again brings the window back', (await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].isVisible())));
  await app.evaluate(({BrowserWindow}) => BrowserWindow.getAllWindows()[0].webContents.executeJavaScript('operatorPage.lockIn()')); await win.waitForTimeout(500);
  check('Lock in from the menu bar locks you in', (await win.evaluate(() => operatorPage.peek())).view==='focus' && /"activeSession":\{/.test(await win.evaluate(() => localStorage.getItem('opsdash:focus') || '')));
  await win.evaluate(() => operatorPage.importText(JSON.stringify({profile:{name:'From Export'}, tasks:{items:[{id:'x1', title:'Imported task', status:'today'}]}}))); await win.waitForTimeout(600);
  check('importing an export replaces the data', (await win.evaluate(() => operatorPage.peek())).tasks.includes('Imported task'));
  await win.screenshot({path:path.join(__dirname, '.out', 'mac-app.png')});
  check('moved-in flag written (it only moves in once)', fs.existsSync(path.join(home, 'Library', 'Application Support', 'Operator', 'App', '.moved-in')));
  await app.evaluate(({app}) => { app.quit(); }); await new Promise((r) => setTimeout(r, 2500));
  check('quitting stops the helpers', !(await get(8935, '/ping')));
  process.exit(report() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
