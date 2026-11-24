// ============ INIT ============
async function init(){
  state.profile = normalizeProfile(await loadKey('profile', defaultProfile()));
  state.tasks = normalizeTasks(await loadKey('tasks', {items:[]}));
  state.focus = normalizeFocus(await loadKey('focus', defaultFocus()));
  state.health = normalizeHealth(await loadKey('health', {gymLog:[], weightLog:[], calorieEntries:[]}));
  state.meals = normalizeMeals(await loadKey('meals', defaultMeals()));
  state.journal = normalizeJournal(await loadKey('journal', {entries:[]}));
  state.finances = normalizeFinances(await loadKey('finances', {debts:[], payments:[], income:[]}));
  state.business = normalizeBusiness(await loadKey('business', {pipeline:[], clients:[]}));
  state.calendar = normalizeCalendar(await loadKey('calendar', defaultCalendar()));
  state.standards = normalizeStandards(await loadKey('standards', defaultStandards()));
  state.daysOff = normalizeDaysOff(await loadKey('daysOff', defaultDaysOff()));
  state.goals = normalizeGoals(await loadKey('goals', defaultGoals()));
  state.dashboardPanels = normalizeDashboardPanels(await loadKey('dashboardPanels', defaultDashboardPanels()));
  state.modes = normalizeModes(await loadKey('modes', defaultModes()));
  state.settings = normalizeSettings(await loadKey('settings', defaultSettings()));
  state.appActivity = normalizeAppActivity(await loadKey('appActivity', defaultAppActivity()));
  state.personal = normalizePersonal(await loadKey('personal', defaultPersonal()));
  state.boards = normalizeBoards(await loadKey('boards', defaultBoards()));

  splitActiveModeAtMidnight();
  if(crmMigratedOnLoad) persist('business');
  remapConvertedLeadRefs();
  // what you lined up as "next" survives a restart
  if(state.focus.nextTaskId && !state.focus.activeSession && state.tasks.items.some(function(t){ return t.id===state.focus.nextTaskId && t.status!=='done'; })) ui.stagedTaskId = state.focus.nextTaskId;
  applyTheme();
  applySidebarState();
  // the start: the ring draws itself while the heavy bits warm up (fonts, your XP, the first page),
  // then the app rises in — so the first clicks are smooth. (Automated test runs skip the wait.)
  const boot = document.getElementById('loading'), bar = document.getElementById('bootBar');
  const step = function(p){ if(bar) bar.style.width = p+'%'; };
  step(55);
  try{ if(document.fonts && document.fonts.ready) await Promise.race([document.fonts.ready, new Promise(function(r){ setTimeout(r, 900); })]); }catch(e){}
  step(75);
  try{ if(typeof xpSummary==='function') xpSummary(); }catch(e){}
  step(90);
  const quick = navigator.webdriver || (boot && boot.dataset.quick);
  const minShow = quick ? 0 : Math.max(0, 1250 - (performance.now() - (window.__bootT0 || 0)));
  if(minShow) await new Promise(function(r){ setTimeout(r, minShow); });
  step(100);
  document.getElementById('app').style.display='flex';
  renderView();
  if(boot && !quick){ document.getElementById('app').classList.add('app-in'); boot.classList.add('is-out'); setTimeout(function(){ boot.style.display = 'none'; }, 650); }
  else if(boot) boot.style.display = 'none';
  // the app first, then the scene fades in behind it
  requestAnimationFrame(function(){ setTimeout(sceneMount, 0); });
  setTimeout(function(){ refreshWeather(false); }, 1500);
  startClocks();
  startFocusTicker();
  startModeTicker();
  startAlarmChecker();
  startAppActivityPolling();
  const idle = window.requestIdleCallback || function(fn){ return setTimeout(fn, 1200); };
  idle(warmAudio);
  setTimeout(function(){ idle(migrateInlineJournalPhotos); }, 2500);
}
init();

