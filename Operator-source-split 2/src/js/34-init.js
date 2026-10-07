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
  applyTheme();
  applySidebarState();
  document.getElementById('loading').style.display='none';
  document.getElementById('app').style.display='flex';
  renderView();
  startClocks();
  startFocusTicker();
  startModeTicker();
  startAlarmChecker();
  startAppActivityPolling();
}
init();

