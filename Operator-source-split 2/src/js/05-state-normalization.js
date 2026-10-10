// ============ STATE + NORMALIZATION ============
let state = {
  profile: defaultProfile(),
  tasks: { items: [] },
  focus: defaultFocus(),
  health: { gymLog: [], weightLog: [], calorieEntries: [] },
  meals: defaultMeals(),
  journal: { entries: [], types: [] },
  finances: { debts: [], payments: [], income: [] },
  business: { pipeline: [], clients: [] },
  calendar: defaultCalendar(),
  standards: defaultStandards(),
  daysOff: defaultDaysOff(),
  goals: defaultGoals(),
  dashboardPanels: defaultDashboardPanels(),
  modes: defaultModes(),
  settings: defaultSettings(),
  appActivity: defaultAppActivity(),
  personal: defaultPersonal(),
  boards: defaultBoards()
};
let ui = {
  view:'today', healthTab:'workouts', businessTab:'overview', personalTab:'you', focusTab:'overview', settingsTab:'you',
  forms:{task:false, client:false, prospect:false, breakForm:false},
  pendingFocusMinutes: null,
  focusOpenEnded: false,
  calendarYear: new Date().getFullYear(),
  calendarMonth: new Date().getMonth(),
  calendarSelectedDate: todayStr(),
  editingTaskId: null,
  editingGoalId: null,
  editingProspectId: null,
  editingClientId: null,
  journalDraftText: '',
  selectedMood: null,
  showAllFinished: false,
  quickAccessOpen: false,
  showCalLegend: false,
  expandedProspectId: null,
  selectedTaskIds: new Set(),
  selectedProspectIds: new Set(),
  journalFilterMood: null,
  journalSearchText: '',
  editingJournalId: null,
  editingClientId2: null,
  showClientModal: null,
  focusModalStep: 'idle',
  quickAddMode: 'backlog',
  editingWorkoutId: null,
  newTaskOngoing: false,
  journalClearArmed: false,
  journalClearText: '',
  invoiceClient: 'personal',
  attachingInvoiceId: null,
  newTaskClients: ['personal'],
  editTaskClientsSel: [],
  viewingModeId: null,
  datePicker: null,
  invoicePrefillAmount: null,
  invoicePrefillDesc: null,
  editingRetainerClientId: null,
  loggingPaymentDebtId: null,
  journalDraftPhotos: [],
  editingJournalMood: undefined,
  quickJournalOpen: false,
  viewingJournalPhoto: null,
  newProspectLeadSource: null,
  newTaskOngoingDeadline: null,
  newTaskOngoingFrequency: '',
  newTaskIncludeStandard: false,
  currentTaskId: null,
  currentTaskStartedAt: null,
  editingCalEventId: null,
  editingAlarmId: null,
  editingPackageId: null,
  pickingPackageForClient: null,
  customDeliverableClientId: null,
  journalSearchOpen: false,
  pickingJournalTypeEmoji: null,
  newReminderType: 'reminder',
  newClientJournalTag: null,
  newClientJournalDraft: '',
  stagedTaskId: null,
  justStaged: false,
  journalViewMode: 'personal'
};
let pickedJournalTypeSwatch = SWATCHES[0];
let armed = new Set();
let aiHoldTimer = null;
let aiHoldInterval = null;
let aiHoldCycled = false;
let aiPreviewToolId = null;
function renderLockInNudgeModal(){
  return '<div class="section-title" style="justify-content:center;">Want to Lock In?</div>'+
    '<div class="kpi-sub" style="margin-bottom:18px;">You\'re not tracking focus time right now. Lock in so this actually counts?</div>'+
    '<div class="row" style="justify-content:center;">'+
      '<button class="btn btn-ghost" data-action="dismissLockInNudge">Not Now</button>'+
      '<button class="btn btn-good" data-action="lockInFromNudge">&#128274; Lock In</button>'+
    '</div>';
}
function maybeNudgeLockIn(){
  if(state.focus.activeSession) return;
  const el = document.getElementById('lockInNudgeOverlay');
  if(!el) return;
  const content = document.getElementById('lockInNudgeContent');
  if(content) content.innerHTML = renderLockInNudgeModal();
  el.classList.remove('hidden');
}
function dismissLockInNudge(){
  const el = document.getElementById('lockInNudgeOverlay');
  if(el) el.classList.add('hidden');
}
function lockInFromNudge(){ dismissLockInNudge(); openLockInChooser(); }
// A small, non-blocking "Apple-style" banner notification — used instead of the full-screen
// lock-in nudge for actions (like logging a client touch) that already happened and don't need
// a decision, just a heads-up.
let toastHideTimer = null;
let toastRemoveTimer = null;
function showToast(message, opts){
  opts = opts || {};
  const container = document.getElementById('toastContainer');
  if(!container) return;
  clearTimeout(toastHideTimer); clearTimeout(toastRemoveTimer);
  container.innerHTML = '<div class="toast'+(opts.actionLabel ? ' has-action' : '')+'" id="activeToast">'+
    '<span class="toast-icon">'+(opts.icon||'&#128276;')+'</span>'+
    '<div class="toast-body"><span class="toast-msg">'+escapeHtml(message)+'</span>'+
    (opts.actionLabel ? '<button class="toast-action" data-action="'+opts.actionAction+'"'+(opts.actionId ? ' data-id="'+escapeHtml(opts.actionId)+'"' : '')+'>'+escapeHtml(opts.actionLabel)+'</button>' : '')+'</div>'+
    '<button class="toast-x" data-action="dismissToast" title="Dismiss">&#10005;</button>'+
  '</div>';
  const el = document.getElementById('activeToast');
  requestAnimationFrame(function(){ if(el) el.classList.add('show'); });
  const hide = function(){ toastHideTimer = setTimeout(function(){
    if(el) el.classList.remove('show');
    toastRemoveTimer = setTimeout(function(){ if(container.contains(el)) container.innerHTML=''; }, 260);
  }, opts.duration || 3200); };
  hide();
  // hovering keeps it up; leaving starts the clock again
  if(el){ el.addEventListener('mouseenter', function(){ clearTimeout(toastHideTimer); clearTimeout(toastRemoveTimer); el.classList.add('show'); }); el.addEventListener('mouseleave', hide); }
}
function dismissToast(){
  const el = document.getElementById('activeToast'), container = document.getElementById('toastContainer');
  clearTimeout(toastHideTimer); clearTimeout(toastRemoveTimer);
  if(el) el.classList.remove('show');
  toastRemoveTimer = setTimeout(function(){ if(container) container.innerHTML = ''; }, 220);
}
ACTIONS.dismissToast = function(){ dismissToast(); };
function showLockInToast(){
  showToast("Logged — you're not locked in right now", {icon:'&#128274;', actionLabel:'Lock In', actionAction:'lockInFromToast'});
}
function lockInFromToast(){
  const container = document.getElementById('toastContainer');
  if(container) container.innerHTML='';
  openLockInChooser();
}
let justCompletedTaskId = null;
function flashTaskComplete(id){
  justCompletedTaskId = id;
  setTimeout(function(){ if(justCompletedTaskId===id){ justCompletedTaskId=null; renderView(); } }, 950);
}
let expandedJournal = new Set();
let lastRenderedStreak = null;
let pickedSwatch = SWATCHES[0];
let pendingBreakMinutes = null;

function normalizeProfile(p){ p=p||{}; const d=defaultProfile(); Object.keys(d).forEach(function(k){ if(p[k]===undefined) p[k]=d[k]; }); return p; }
function normalizeTasks(t){
  t=t||{}; t.items = arr(t.items);
  // Recently deleted: kept 30 days so nothing deleted by accident is gone for good
  t.trash = arr(t.trash).filter(function(x){ return x && x.task && Date.now()-(x.at||0) < 30*86400000; });
  if(!Array.isArray(t.categories)) t.categories=[
    {id:'general', label:'General', color:'#8A90A2'},
    {id:'video', label:'Video Idea', color:'#c792ea'}
  ];
  if(!Array.isArray(t.videoTypes)) t.videoTypes=[
    {id:'reel', label:'Reel'},
    {id:'longform', label:'Long-form'},
    {id:'ad', label:'Ad'}
  ];
  t.items.forEach(function(item){
    if(item.client===undefined) item.client='personal';
    if(!Array.isArray(item.clients) || !item.clients.length) item.clients=[item.client||'personal'];
    item.client = item.clients[0];
    if(item.notes===undefined) item.notes='';
    if(item.priority===undefined) item.priority='med';
    if(item.deadline===undefined) item.deadline=null;
    if(item.ongoing===undefined) item.ongoing=false;
    if(item.ongoingDeadline===undefined) item.ongoingDeadline=null;
    // one date per task now: an ongoing task's old "target date" becomes its deadline if it had none
    if(item.ongoing && item.ongoingDeadline && !item.deadline) item.deadline = item.ongoingDeadline;
    if(item.ongoingFrequency===undefined) item.ongoingFrequency=null;
    if(item.includeInStandard===undefined) item.includeInStandard=false;
    if(item.trackedMinutes===undefined) item.trackedMinutes=0;
    if(!Array.isArray(item.ongoingDoneDates)) item.ongoingDoneDates=[];
    if(item.active===undefined) item.active=true;
    if(item.categoryId===undefined) item.categoryId=null;
    if(item.isVideoIdea===undefined) item.isVideoIdea=false;
    if(item.videoType===undefined) item.videoType=null;
  });
  return t;
}
function taskCategoryById(id){ return arr(state.tasks.categories).find(function(c){ return c.id===id; }) || null; }
function taskVideoTypeById(id){ return arr(state.tasks.videoTypes).find(function(c){ return c.id===id; }) || null; }
function taskCategoryTagHtml(t){
  if(!t.categoryId) return '';
  const cat = taskCategoryById(t.categoryId);
  if(!cat) return '';
  return '<span class="tag" style="background:'+hexToRgba(cat.color,0.16)+';color:'+cat.color+';border:1px solid '+hexToRgba(cat.color,0.4)+';">'+escapeHtml(cat.label)+'</span>';
}
// The master wake-up alarm: one daily alarm (e.g. 7:00 Mon–Sat) plus an optional
// one-morning change. The first time this runs, an existing repeating "wake-up" alarm and
// any upcoming night-plan wake alarms are folded into it (their settings carry over).
function normalizeWake(f){
  const fresh = !f.wake || typeof f.wake!=='object';
  const w = fresh ? {} : f.wake;
  const out = {
    enabled: w.enabled===true,
    time: /^\d\d:\d\d$/.test(w.time||'') ? w.time : '07:00',
    days: Array.isArray(w.days) ? w.days.map(Number).filter(function(d){ return d>=0 && d<=6; }) : [1,2,3,4,5,6],
    override: (w.override && w.override.date && w.override.date>=todayStr()) ? w.override : null,
    sound: ['standard','peaceful','loud'].indexOf(w.sound)>=0 ? w.sound : 'peaceful',
    media: (w.media && (w.media.ref || w.media.url || (w.media.type==='music' && w.media.q))) ? w.media : null,
    snoozeMinutes: Number(w.snoozeMinutes)>0 ? Number(w.snoozeMinutes) : 9,
    openIn: ['firefox','safari','chrome'].indexOf(w.openIn)>=0 ? w.openIn : 'firefox',
    useMusic: w.useMusic===false ? false : true,
    // the slow, cinematic intro unless you picked Quick yourself
    intro: w.introChosen && w.intro==='quick' ? 'quick' : 'cinematic', introChosen: !!w.introChosen, news: w.news!==false,
    lastFiredTs: Number(w.lastFiredTs)||0,
    armedAt: Number(w.armedAt)||Date.now()
  };
  if(fresh){
    const rep = arr(f.alarms).find(function(a){ return a.wake && !a.date && arr(a.days).length; });
    if(rep){
      out.enabled = rep.enabled!==false; out.time = rep.time || out.time; out.days = arr(rep.days).slice();
      if(rep.mediaUrl) out.media = {url:rep.mediaUrl, name:rep.mediaUrl};
    }
    const oneOff = arr(f.alarms).filter(function(a){ return (a.wake || a.kind==='wake') && a.date && a.date>=todayStr(); })
      .sort(function(a,b){ return (a.date+a.time).localeCompare(b.date+b.time); })[0];
    if(oneOff){
      out.override = {date:oneOff.date, time:oneOff.time};
      if(oneOff.mediaUrl && !out.media) out.media = {url:oneOff.mediaUrl, name:oneOff.mediaUrl};
    }
    f.alarms = arr(f.alarms).filter(function(a){ return a!==rep && !((a.wake || a.kind==='wake') && a.date); });
  }
  // keep everything else you've set (news topics, sections, background…) — newer settings
  // aren't listed above and used to be dropped on every load
  Object.keys(w).forEach(function(k){ if(!(k in out)) out[k] = w[k]; });
  return out;
}
function normalizeFocus(f){
  f=f||{};
  if(f.activeSession===undefined) f.activeSession=null;
  if(f.activeSession){
    if(!Array.isArray(f.activeSession.breaks)) f.activeSession.breaks=[];
    if(f.activeSession.onBreak===undefined) f.activeSession.onBreak=false;
    if(Array.isArray(f.activeSession.completedTasks)){
      f.activeSession.completedTasks.forEach(function(t){ if(t.noteFinalized===undefined) t.noteFinalized=false; });
    }
  }
  f.sessions = arr(f.sessions).map(function(s){ if(!Array.isArray(s.completedTasks)) s.completedTasks=[]; if(!s.type) s.type='deep'; return s; });
  f.taskSegments = arr(f.taskSegments);
  if(f.nightPlan===undefined) f.nightPlan = null;
  f.morningNotes = arr(f.morningNotes);
  f.alarms = arr(f.alarms);
  f.alarms.forEach(function(a){ if(!Array.isArray(a.days)) a.days = []; if(!a.armedAt) a.armedAt = Date.now(); });
  f.wake = normalizeWake(f);
  if(f.snooze && !(f.snooze.ts > Date.now()-2*3600000)) f.snooze = null;
  if(f.lastManualStopAt===undefined) f.lastManualStopAt = null;
  if(f.lastSessionEndedAt===undefined) f.lastSessionEndedAt = null;
  f.reminders = arr(f.reminders);
  if(!Array.isArray(f.prepItems)) f.prepItems = defaultFocus().prepItems;
  if(!f.motivations || typeof f.motivations!=='object') f.motivations = defaultFocus().motivations;
  f.motivations.toward = arr(f.motivations.toward);
  f.motivations.away = arr(f.motivations.away);
  return f;
}
function normalizeHealth(h){ h=h||{}; h.gymLog=arr(h.gymLog); h.weightLog=arr(h.weightLog); h.calorieEntries=arr(h.calorieEntries); return h; }
function normalizeMeals(m){ m=m||{}; m.library = (Array.isArray(m.library) && m.library.length) ? m.library : defaultMeals().library; return m; }
function normalizeJournal(j){
  j=j||{}; j.entries=arr(j.entries); if(!Array.isArray(j.capsules)) j.capsules=[];
  if(!j.intentions || typeof j.intentions!=='object') j.intentions = {months:{}, weeks:{}, prompted:{}};
  if(!Array.isArray(j.types) || !j.types.length) j.types = defaultJournalTypes();
  else {
    const retiredIds = ['idea','win','vent','reflect','tired'];
    j.types = j.types.filter(function(t){ return retiredIds.indexOf(t.id)<0; });
    if(!j.types.some(function(t){ return t.id==='starred'; })){
      j.types.unshift({id:'starred', emoji:'⭐', label:'Starred', color:'#FFD700'});
    }
  }
  j.entries.forEach(function(e){ if(e.mood===undefined) e.mood=null; if(e.pinned===undefined) e.pinned=false; if(!Array.isArray(e.photos)) e.photos=[]; });
  return j;
}
function normalizeFinances(f){
  f=f||{}; f.debts=arr(f.debts); f.payments=arr(f.payments); f.income=arr(f.income); f.invoices=arr(f.invoices);
  f.invoices.forEach(function(inv){
    if(inv.status===undefined) inv.status='unpaid';
    if(inv.attachmentName===undefined) inv.attachmentName=null;
    if(inv.attachmentData===undefined) inv.attachmentData=null;
    if(inv.client===undefined) inv.client='personal';
  });
  f.debts.forEach(function(d){
    if(d.description===undefined) d.description='';
    if(d.creditor===undefined) d.creditor='';
  });
  return f;
}
function normalizeBusiness(b){
  b=b||{}; b.pipeline=arr(b.pipeline); b.clients=arr(b.clients); b.packages=arr(b.packages);
  b.packages.forEach(function(pk){
    if(!Array.isArray(pk.deliverables)) pk.deliverables=[];
    if(pk.price===undefined||pk.price===null) pk.price=0;
    if(pk.description===undefined) pk.description='';
    pk.deliverables.forEach(function(d){ if(!d.weeklyTarget || d.weeklyTarget<1) d.weeklyTarget=1; });
  });
  b.clients.forEach(function(c){
    if(!Array.isArray(c.deliverables)) c.deliverables=[];
    if(c.billingDay===undefined||c.billingDay===null) c.billingDay=1;
    if(c.notes===undefined||c.notes===null) c.notes='';
    if(c.mrr===undefined||c.mrr===null) c.mrr=0;
    if(c.packageId===undefined) c.packageId=null;
    if(c.leadSource===undefined) c.leadSource=null;
    if(c.startDate===undefined) c.startDate=null;
    if(!Array.isArray(c.journal)) c.journal=[];
    if(!Array.isArray(c.touches)) c.touches = c.lastTouchDate ? [c.lastTouchDate] : [];
    const pkg = c.packageId ? b.packages.find(function(p){return p.id===c.packageId;}) : null;
    c.deliverables.forEach(function(d){
      if(d.completedAt===undefined) d.completedAt=null;
      if(d.fromPackage===undefined) d.fromPackage=false;
      if(d.recurring===undefined) d.recurring=!!d.fromPackage;
      if(!Array.isArray(d.completedDates)){
        // migrate legacy week-bucketed progress (completedWeeks) into dated entries
        d.completedDates = arr(d.completedWeeks).map(function(wk){ return wk; });
      }
      if(!d.weeklyTarget || d.weeklyTarget<1) d.weeklyTarget=1;
      // Self-heal: a deliverable copied from a package can drift out of sync with the
      // package's own target if it was edited after assignment. Re-sync on every load.
      if(d.fromPackage && pkg){
        let srcDef = d.sourceId ? pkg.deliverables.find(function(x){return x.id===d.sourceId;}) : null;
        if(!srcDef) srcDef = pkg.deliverables.find(function(x){return x.title===d.title;});
        if(srcDef){
          d.weeklyTarget = srcDef.weeklyTarget||1;
          if(!d.sourceId) d.sourceId = srcDef.id;
        }
      }
    });
  });
  b.pipeline.forEach(function(p){ if(!Array.isArray(p.stageHistory)) p.stageHistory=[]; if(p.convertedClientId===undefined) p.convertedClientId=null; if(p.leadSource===undefined) p.leadSource=null; });
  normalizeCrmData(b);
  return b;
}
function normalizeCalendar(c){
  c=c||{};
  c.events=arr(c.events);
  if(!Array.isArray(c.categories) || !c.categories.length) c.categories = defaultCalendar().categories;
  c.categories.forEach(function(cat){ if(cat.autoRemind===undefined) cat.autoRemind=false; });
  c.events.forEach(function(ev){
    if(!ev.categoryId && ev.type){
      const match = c.categories.find(function(cat){ return cat.id===ev.type; });
      ev.categoryId = match ? match.id : c.categories[0].id;
    }
    if(!ev.categoryId) ev.categoryId = c.categories[0].id;
    if(ev.meetingLink===undefined) ev.meetingLink = null;
    if(ev.alarmId===undefined) ev.alarmId = null;
    if(ev.linkedClient===undefined) ev.linkedClient = null;
  });
  return c;
}
function normalizeStandards(s){
  s=s||{};
  if(!Array.isArray(s.items)) s.items=defaultStandards().items;
  s.items.forEach(function(it){ if(it.createdAt===undefined) it.createdAt=null; });
  if(!s.deepWorkTargetMinutes) s.deepWorkTargetMinutes=180;
  if(s.daysOffAllowedPerWeek===undefined || s.daysOffAllowedPerWeek===null) s.daysOffAllowedPerWeek=2;
  if(s.trainedEnabled===undefined) s.trainedEnabled=false;
  s.completions=arr(s.completions);
  if(!s.dayOverrides || typeof s.dayOverrides!=='object') s.dayOverrides = {};
  if(s.streakBase===undefined) s.streakBase = null;
  return s;
}
function normalizeDaysOff(d){ d=d||{}; d.dates=arr(d.dates); return d; }
function normalizeGoals(g){
  g=g||{}; g.items=arr(g.items);
  g.items.forEach(function(it){
    if(it.target===undefined) it.target=null;
    if(it.current===undefined) it.current=0;
    if(it.unit===undefined) it.unit='';
    if(it.deadline===undefined) it.deadline=null;
    if(it.autoTrack===undefined) it.autoTrack=null;
    if(it.period===undefined) it.period=null;
    if(it.start===undefined) it.start=null;
  });
  return g;
}
function normalizeDashboardPanels(d){
  d=d||{};
  const defaults = defaultDashboardPanels();
  const validIds = defaults.order;
  if(!Array.isArray(d.order) || !d.order.length) d.order = defaults.order.slice();
  // Client Health, Reach Out Today and Client Next Steps became one Clients panel; it takes
  // the place of whichever of them sat highest (and stays hidden if all three were hidden).
  if(!d.clientHubMerged){
    const old = ['clientOps','reachOut','clientSteps'];
    const idxs = old.map(function(id){ return d.order.indexOf(id); }).filter(function(i){ return i>=0; });
    const en = d.enabled || {};
    if(idxs.length && d.order.indexOf('clientHub')<0) d.order.splice(Math.min.apply(null, idxs), 0, 'clientHub');
    if(old.every(function(id){ return en[id]===false; })) en.clientHub = false;
    old.forEach(function(id){ delete en[id]; });
    d.enabled = en;
    d.clientHubMerged = true;
  }
  d.order = d.order.filter(function(pid){ return validIds.indexOf(pid)>=0; });
  defaults.order.forEach(function(pid){ if(d.order.indexOf(pid)<0) d.order.push(pid); });
  if(!d.enabled || typeof d.enabled!=='object') d.enabled = {};
  // One-time layout moves, applied in order and only once each, so any order you set
  // afterwards is respected: Quick Journal under the streak panel (phase 2), then Reach Out
  // Today under it (phase 4), then Client Next Steps under that (lifecycle).
  const moveAfter = function(id, afterId, fallbackIdx){
    const i = d.order.indexOf(id); if(i>=0) d.order.splice(i,1);
    const a = d.order.indexOf(afterId);
    d.order.splice(a>=0 ? a+1 : fallbackIdx, 0, id);
  };
  if(!d.journalRaised){ moveAfter('journal', 'personalStats', 0); d.journalRaised = true; }
  if(!d.visionPanelAdded){ moveAfter('vision', 'personalStats', 0); d.visionPanelAdded = true; }
  if(!d.v2PanelsAdded){ moveAfter('agenda', 'vision', 1); moveAfter('week', 'goals', d.order.length); moveAfter('heatmap', 'week', d.order.length); moveAfter('why', 'heatmap', d.order.length); d.v2PanelsAdded = true; }
  if(!d.agendaOff){ d.enabled.agenda = false; d.agendaOff = true; }
  if(!d.reachOutAdded){ moveAfter('clientHub', 'journal', 1); d.reachOutAdded = true; d.clientStepsAdded = true; }
  // This Week and Consistency became one panel: it shows if either one was showing.
  if(!d.progressMerged){ if(d.enabled.week===false && d.enabled.heatmap!==false) d.enabled.week = true; delete d.enabled.heatmap; d.progressMerged = true; }
  return d;
}
function normalizeModes(m){
  m=m||{};
  if(m.active===undefined) m.active=null;
  m.history=arr(m.history);
  return m;
}
function normalizeSettings(s){
  s=s||{};
  if(!s.clientCare || typeof s.clientCare!=='object') s.clientCare={};
  if(s.clientCare.yellowHours==null || isNaN(Number(s.clientCare.yellowHours))) s.clientCare.yellowHours=48;
  if(s.clientCare.redHours==null || isNaN(Number(s.clientCare.redHours))) s.clientCare.redHours=72;
  if(!s.quickLinks || typeof s.quickLinks!=='object') s.quickLinks={};
  if(s.quickLinks.businessFilesPath===undefined) s.quickLinks.businessFilesPath='';
  if(!s.quickLinks.metaAdsUrl) s.quickLinks.metaAdsUrl='https://adsmanager.facebook.com';
  if(!s.quickLinks.ghlUrl) s.quickLinks.ghlUrl='https://app.gohighlevel.com';
  if(!s.quickLinks.driveUrl) s.quickLinks.driveUrl='https://drive.google.com';
  if(!s.quickLinks.lastAiUsed) s.quickLinks.lastAiUsed='chatgpt';
  if(!s.quickLinks.icons || typeof s.quickLinks.icons!=='object') s.quickLinks.icons={};
  if(!s.weather || typeof s.weather!=='object') s.weather={};
  if(!s.appTracking || typeof s.appTracking!=='object') s.appTracking={};
  if(s.appTracking.enabled===undefined) s.appTracking.enabled=true;
  if(s.appTracking.autoLockIn===undefined) s.appTracking.autoLockIn=true;
  if(s.appTracking.thresholdMinutes==null || isNaN(Number(s.appTracking.thresholdMinutes))) s.appTracking.thresholdMinutes=12;
  if(s.appTracking.graceMinutes==null || isNaN(Number(s.appTracking.graceMinutes))) s.appTracking.graceMinutes=3;
  if(s.appTracking.cooldownMinutes==null || isNaN(Number(s.appTracking.cooldownMinutes))) s.appTracking.cooldownMinutes=15;
  if(s.appTracking.idleSeconds==null || isNaN(Number(s.appTracking.idleSeconds))) s.appTracking.idleSeconds=60;
  if(!s.appTracking.distractionSince) s.appTracking.distractionSince = todayStr();
  return s;
}
function normalizePersonal(p){
  p = p||{}; p.wishlist = arr(p.wishlist);
  p.wishlist.forEach(function(w){ if(w.purchased===undefined) w.purchased=false; if(!w.priority) w.priority='med'; if(w.price===undefined) w.price=null; });
  return p;
}
function normalizeBoards(b){
  b = b||{}; b.boards = arr(b.boards);
  b.boards.forEach(function(bd){
    bd.elements = arr(bd.elements);
    if(!bd.kind) bd.kind = 'vision';
    if(bd.parentId===undefined) bd.parentId = null;
    if(!bd.viewport || typeof bd.viewport!=='object') bd.viewport = {x:0, y:0, zoom:1};
  });
  // One master Vision board (plus boards nested inside it); every other top-level vision
  // board moves, with everything nested in it, to the Milanote section. Nothing is deleted.
  if(!b.milanoteSplit){
    const byId = {}; b.boards.forEach(function(bd){ byId[bd.id] = bd; });
    let master = b.masterId && byId[b.masterId] && byId[b.masterId].kind==='vision' ? byId[b.masterId] : null;
    if(!master) master = b.boards.filter(function(bd){ return bd.kind==='vision' && !bd.parentId; })[0] || null;
    b.masterId = master ? master.id : null;
    const rootOf = function(bd){ let cur = bd, guard = 0; while(cur && cur.parentId && byId[cur.parentId] && guard++<30) cur = byId[cur.parentId]; return cur; };
    b.boards.forEach(function(bd){ if(bd.kind==='vision' && (!master || rootOf(bd)!==master)) bd.kind = 'milanote'; });
    b.milanoteSplit = true;
  }
  // Everything now lives in Journal → Boards (the separate Milanote section is gone).
  if(!b.journalMerge){ b.boards.forEach(function(bd){ if(bd.kind==='milanote') bd.kind = 'journal'; }); b.journalMerge = true; }
  if(b.masterId && !b.boards.some(function(bd){ return bd.id===b.masterId; })) b.masterId = null;
  return b;
}
function normalizeAppActivity(a){
  a=a||{};
  if(!a.days || typeof a.days!=='object') a.days={};
  if(a.todayDate===undefined) a.todayDate=null;
  a.todayIntervals=arr(a.todayIntervals);
  if(!a.lockedDays || typeof a.lockedDays!=='object') a.lockedDays={};
  return a;
}

