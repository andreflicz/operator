// Shared helpers for the end-to-end checks (Playwright + the sandbox's Chromium).
// Tests run against an instrumented copy of the build that exposes internals as window.__op.
const path = require('path');
const { chromium } = require('playwright');
const fs = require('fs');
function instrument(src, out){
  let s = fs.readFileSync(src,'utf8'); const i = s.lastIndexOf('})();');
  s = s.slice(0,i)+"window.__op={get state(){return state;}, get ui(){return ui;}, checkAutoLockIn:checkAutoLockIn, pollAppActivity:pollAppActivity, parseActivityLogText:parseActivityLogText, todayStr:todayStr, renderView:renderView, ev:function(code){ return eval(code); }};\n"+s.slice(i);
  fs.writeFileSync(out, s);
}
function ds(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
async function launch(){ return chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox'] }); }
async function newPage(browser, file, seed, clockAt){
  // older suites were written for the card lineup; List became the default in round 11 (r11 checks that)
  seed = Object.assign({}, seed||{}); seed.profile = Object.assign({}, seed.profile||{});
  if(seed.profile.lineupView===undefined) seed.profile.lineupView = 'cards';
  const ctx = await browser.newContext({ viewport:{width:1400,height:900} });
  const page = await ctx.newPage();
  page.errors = [];
  page.on('pageerror', e => page.errors.push(e.message));
  if(clockAt) await page.clock.install({ time: clockAt });
  await page.addInitScript((seed) => {
    try{ if (sessionStorage.getItem('seeded')) return; sessionStorage.setItem('seeded','1'); }catch(e){ return; }
    Object.keys(seed).forEach(k => localStorage.setItem('opsdash:'+k, JSON.stringify(seed[k])));
  }, seed||{});
  await page.goto('file://'+path.resolve(file)); await page.waitForTimeout(400);
  return page;
}
const results = [];
function check(name, ok, info){ results.push((ok?'PASS ':'FAIL ')+name+(info!==undefined && !ok?'  '+JSON.stringify(info).slice(0,400):'')); }
function report(){ console.log(results.join('\n')); return results.some(r=>r.startsWith('FAIL')); }
const OUT = require('path').join(__dirname, '.out');
fs.mkdirSync(OUT, {recursive:true});
module.exports = { instrument, ds, launch, newPage, check, report, OUT };
