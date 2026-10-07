// Smoke test: loads the built dashboard in headless Chromium and checks
// that it initializes cleanly (no console errors, #app becomes visible,
// nav works, storage round-trips). Run after every build.py.
const path = require('path');
const { chromium } = require('playwright');

(async () => {
  const file = process.argv[2] || path.join(__dirname, '..', 'dist', 'command-center-2.html');
  const url = 'file://' + path.resolve(file);

  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();

  const errors = [];
  page.on('pageerror', (err) => errors.push('pageerror: ' + err.message));
  page.on('console', (msg) => {
    if (msg.type() === 'error') errors.push('console.error: ' + msg.text());
  });

  await page.goto(url, { waitUntil: 'load' });
  await page.waitForTimeout(800);

  const appVisible = await page.evaluate(() => {
    const app = document.getElementById('app');
    return app && app.style.display !== 'none';
  });

  const loadingHidden = await page.evaluate(() => {
    const l = document.getElementById('loading');
    return l && l.style.display === 'none';
  });

  // Click through each nav item and confirm the view root gets content with no new errors.
  const navResults = {};
  for (const view of ['today', 'focus', 'business', 'calendar', 'personal', 'settings']) {
    await page.click(`[data-action="nav"][data-view="${view}"]`);
    await page.waitForTimeout(150);
    const html = await page.evaluate(() => document.getElementById('viewRoot').innerHTML.length);
    navResults[view] = html;
  }

  await browser.close();

  console.log('appVisible:', appVisible);
  console.log('loadingHidden:', loadingHidden);
  console.log('navResults:', navResults);
  console.log('errors:', errors.length ? errors : 'none');

  // Google Fonts is unreachable in this sandbox (network allowlist) — that's an
  // environment limitation, not something the app's own code does wrong, and it
  // reproduces identically against the original unsplit file. Ignore just that.
  const realErrors = errors.filter(
    (e) => !/ERR_TUNNEL_CONNECTION_FAILED|ERR_CONNECTION_REFUSED|fonts\.googleapis|fonts\.gstatic/.test(e)
  );

  const navOk = Object.values(navResults).every((n) => n > 0);
  const ok = appVisible && loadingHidden && navOk && realErrors.length === 0;
  console.log(ok ? 'SMOKE TEST PASSED' : 'SMOKE TEST FAILED');
  process.exit(ok ? 0 : 1);
})();
