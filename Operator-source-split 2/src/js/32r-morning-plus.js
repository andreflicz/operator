// ============ GOOD MORNING, MORE ============
// Scores (NFL + NBA: last results and what's next, your teams first), the time capsule (a note to
// future you that turns up on some morning, rarely), the note for tomorrow (one form, three parts),
// and the way back from the work preview to Good morning.

// ---- scores ----
const SPORTS = [{id:'nfl', label:'NFL', icon:'&#127944;'}, {id:'nba', label:'NBA', icon:'&#127936;'}];
function ymdCompact(d){ return d.getFullYear()+pad2(d.getMonth()+1)+pad2(d.getDate()); }
function parseScoreboard(j, l){
  return arr(j && j.events).map(function(e){
    const c = arr(e.competitions)[0] || {}, cs = arr(c.competitors);
    const home = cs.find(function(x){ return x.homeAway==='home'; }) || cs[0] || {}, away = cs.find(function(x){ return x.homeAway==='away'; }) || cs[1] || {};
    const st = (e.status && e.status.type) || {};
    const t = function(x){ const tm = x.team || {}; return {abbr:tm.abbreviation||'', name:tm.displayName||'', short:tm.shortDisplayName||tm.name||'', score:x.score!=null ? String(x.score) : '', win:!!x.winner}; };
    return {l:l, id:e.id, at:Date.parse(e.date), state:st.state, detail:st.shortDetail||'', home:t(home), away:t(away)};
  }).filter(function(g){ return g.home.abbr && g.away.abbr && isFinite(g.at); });
}
async function fetchScoreboard(l){
  const now = Date.now(), range = ymdCompact(new Date(now - 5*86400000))+'-'+ymdCompact(new Date(now + 6*86400000));
  let j = null;
  try{ const r = await fetchWithin(WAKE_HELPER+'sports?l='+l+'&d='+range, 9000); if(r && r.ok) j = await r.json(); }catch(e){}
  if(!j){ try{ const r = await fetchWithin('https://site.api.espn.com/apis/site/v2/sports/'+(l==='nfl' ? 'football' : 'basketball')+'/'+l+'/scoreboard?dates='+range, 9000); if(r && r.ok) j = await r.json(); }catch(e){} }
  return j ? parseScoreboard(j, l) : null;
}
function favWords(){ return sectionTopics(wakeCfg().newsSports, 'NFL, NBA').toLowerCase().split(/\s*,\s*/).filter(function(w){ return w && !/^(nfl|nba|football|basketball|sports)$/.test(w); }); }
function isFavGame(g){ const ws = favWords(); return ws.some(function(w){ return [g.home.name, g.home.short, g.home.abbr, g.away.name, g.away.short, g.away.abbr].some(function(x){ return String(x).toLowerCase().indexOf(w)>=0; }); }); }
function pickGames(list){
  const favFirst = function(xs){ return xs.filter(isFavGame).concat(xs.filter(function(g){ return !isFavGame(g); })); };
  const live = favFirst(list.filter(function(g){ return g.state==='in'; }));
  const done = favFirst(list.filter(function(g){ return g.state==='post'; }).sort(function(a, b){ return b.at - a.at; }));
  const next = favFirst(list.filter(function(g){ return g.state==='pre'; }).sort(function(a, b){ return a.at - b.at; }));
  return live.slice(0, 1).concat(done.slice(0, live.length ? 1 : 2), next.slice(0, 2)).slice(0, 4);
}
// returns a promise, so the voice can wait for the scores when you ask for sports
function loadScores(force){
  const today = todayStr(), sc = ui.scores;
  if(sc && sc.date===today && sc.loading) return ui._scoresP;
  // a failed fetch (nothing came back) is tried again after a few minutes, or when asked for
  if(sc && sc.date===today && sc.got && (sc.nfl || sc.nba || (!force && Date.now() - (sc.at||0) < 5*60000))) return Promise.resolve(sc);
  ui.scores = {date:today, loading:true};
  ui._scoresP = Promise.all(SPORTS.map(function(s){ return fetchScoreboard(s.id); })).then(function(r){
    ui.scores = {date:today, loading:false, got:true, at:Date.now(), nfl:r[0], nba:r[1]};
    if(ui.wakeMode==='brief' && overlayOpen('wakeOverlay')) renderWakeOverlayInto();
    return ui.scores;
  });
  return ui._scoresP;
}
function scoreWhen(g){
  const d = new Date(g.at), today = todayStr(), ds = ds2(d);
  const day = ds===today ? 'Today' : ds===addDays(today, 1) ? 'Tomorrow' : d.toLocaleDateString(undefined, {weekday:'short'});
  return day+' '+d.toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'});
}
function gameChipHtml(g){
  const fav = isFavGame(g), sp = SPORTS.find(function(s){ return s.id===g.l; });
  const side = function(t, showScore){ return '<span class="gc-t'+(t.win ? ' is-win' : '')+'"><b>'+escapeHtml(t.abbr)+'</b>'+(showScore ? '<i>'+escapeHtml(t.score)+'</i>' : '')+'</span>'; };
  const scored = g.state!=='pre';
  return '<div class="gc is-'+g.state+(fav ? ' is-fav' : '')+'" title="'+escapeHtml(g.away.name+' at '+g.home.name)+'">'+
    '<span class="gc-l">'+(sp ? sp.icon : '')+'</span>'+
    '<span class="gc-m">'+side(g.away, scored)+'<span class="gc-at">'+(scored ? '–' : '@')+'</span>'+side(g.home, scored)+'</span>'+
    '<span class="gc-s">'+(g.state==='in' ? '<em class="gc-live"></em>'+escapeHtml(g.detail) : g.state==='post' ? 'Final' : escapeHtml(scoreWhen(g)))+'</span></div>';
}
function scoresHtml(){
  const sc = ui.scores; if(!sc || !sc.got) return '';
  const games = []; SPORTS.forEach(function(s){ const list = sc[s.id]; if(list && list.length) games.push.apply(games, pickGames(list).slice(0, 2)); });
  return games.length ? '<div class="gc-grid">'+games.map(gameChipHtml).join('')+'</div>' : '';
}
// what the voice can say about it
function scoresSpoken(){
  const sc = ui.scores; if(!sc || !sc.got) return '';
  const lines = [];
  SPORTS.forEach(function(s){
    const g = pickGames(sc[s.id] || []);
    const done = g.find(function(x){ return x.state==='post'; }), next = g.find(function(x){ return x.state==='pre'; });
    if(done){ const w = done.home.win ? done.home : done.away, l = done.home.win ? done.away : done.home; lines.push('In the '+s.label+', the '+w.short+' beat the '+l.short+', '+w.score+' to '+l.score+'.'); }
    if(next) lines.push('Next up, '+next.away.short+' at '+next.home.short+', '+scoreWhen(next).replace('Today', 'today').replace('Tomorrow', 'tomorrow')+'.');
  });
  return lines.join(' ');
}

// ---- the time capsule: a note to future you ----
function capsules(){ const c = state.journal.capsules; return Array.isArray(c) ? c : (state.journal.capsules = []); }
function randomCapsuleDate(){ const days = 30 + Math.floor(Math.random()*335); return addDays(todayStr(), days); }
function dueCapsule(){ const t = todayStr(); return capsules().filter(function(c){ return !c.openedOn && c.openOn<=t; }).sort(function(a, b){ return a.openOn.localeCompare(b.openOn); })[0] || capsules().find(function(c){ return c.openedOn===t; }) || null; }
// opening it: it stays on the page for the day and goes into the journal
function openCapsule(c){
  if(c.openedOn) return;
  c.openedOn = todayStr();
  state.journal.entries.push({id:uid(), date:todayStr(), timestamp:Date.now(), text:c.text, title:'⏳ '+(c.title || 'From '+fmtDateShort(c.writtenOn)), type:'freeform', mood:null, pinned:true, photos:[], capsuleFrom:c.writtenOn});
  persist('journal');
}
function capsuleSaveFromModal(){
  const t = document.getElementById('quickJournalModalText'), tt = document.getElementById('quickJournalModalTextTitle');
  if(!t || !t.value.trim()) return false;
  const when = ui.qjCapsule==='random' || !ui.qjCapsuleDate ? randomCapsuleDate() : ui.qjCapsuleDate;
  capsules().push({id:uid(), text:t.value.trim(), title:tt ? tt.value.trim() : '', writtenOn:todayStr(), openOn:when, hidden:ui.qjCapsule==='random'});
  persist('journal');
  ui.journalDraftText = ''; ui.qjTitleDraft = ''; ui.qjCapsule = null; ui.qjCapsuleDate = null;
  return true;
}
ACTIONS.qjCapsule = function(){
  const t = document.getElementById('quickJournalModalText'); if(t) ui.journalDraftText = t.value;
  ui.qjCapsule = ui.qjCapsule ? null : 'random'; renderQuickJournalModalInto();
};
ACTIONS.qjCapsuleWhen = function(el, e, id){ ui.qjCapsule = id; if(id==='random') ui.qjCapsuleDate = null; renderQuickJournalModalInto(); };
document.addEventListener('change', function(e){ if(e.target && e.target.id==='qjCapsuleDate'){ ui.qjCapsuleDate = e.target.value || null; ui.qjCapsule = e.target.value ? 'date' : 'random'; } });
function capsuleBarHtml(){
  if(!ui.qjCapsule) return '';
  return '<div class="qj3-cap"><span>&#9203; For future you —</span>'+
    '<button class="qj3-capb'+(ui.qjCapsule==='random'?' is-on':'')+'" data-action="qjCapsuleWhen" data-id="random" title="Some morning in the next year — you won\'t know when">Surprise me</button>'+
    '<input type="date" class="qj3-capd" id="qjCapsuleDate" min="'+addDays(todayStr(), 1)+'" value="'+escapeHtml(ui.qjCapsuleDate||'')+'" title="Or pick the day">'+
  '</div>';
}

// ---- the note for tomorrow: one form, three parts, always editable ----
function openTomorrowNote(){
  let o = document.getElementById('tnOverlay');
  if(!o){ o = document.createElement('div'); o.id = 'tnOverlay'; o.className = 'overlay tn-ov'; o.innerHTML = '<div class="card tn" id="tnContent"></div>'; document.body.appendChild(o); o.addEventListener('pointerdown', function(e){ if(e.target===o) closeTomorrowNote(); }); }
  const target = morningNoteTarget(), nn = nightNote(target);
  const day = target===addDays(todayStr(), 1) ? 'Tomorrow' : new Date(target+'T12:00').toLocaleDateString(undefined, {weekday:'long'});
  document.getElementById('tnContent').innerHTML =
    '<div class="tn-h"><div><div class="tn-k">&#127769; '+day+' morning</div><div class="tn-t">Leave yourself a note</div></div><button class="tn-x" data-action="closeTomorrowNote">&#10005;</button></div>'+
    '<div class="tn-f"><div class="tn-l"><b>Headline</b><span>On the alarm and at the top of Good morning</span></div><input class="tn-in" id="tnHead" maxlength="90" placeholder="Up at 6. Don’t negotiate." value="'+escapeHtml(nn.headline)+'"></div>'+
    '<div class="tn-f"><div class="tn-l"><b>Good morning</b><span>A few words for when you wake up</span></div><textarea class="tn-in" id="tnMorning" rows="2" placeholder="Slow coffee, a walk, then go.">'+escapeHtml(nn.morning)+'</textarea></div>'+
    '<div class="tn-f"><div class="tn-l"><b>Business message</b><span>On the work page, before you lock in</span></div><textarea class="tn-in" id="tnWork" rows="2" placeholder="Call Mike first. Then the JJS edit.">'+escapeHtml(nn.work)+'</textarea></div>'+
    '<div class="tn-a"><button class="tn-save" data-action="saveTomorrowNote">Save note</button></div>';
  o.classList.remove('hidden');
  setTimeout(function(){ const i = document.getElementById('tnHead'); if(i) i.focus(); }, 50);
}
function closeTomorrowNote(){ const o = document.getElementById('tnOverlay'); if(o) o.classList.add('hidden'); }
ACTIONS.openTomorrowNote = function(){ openTomorrowNote(); };
ACTIONS.closeTomorrowNote = function(){ closeTomorrowNote(); };
ACTIONS.saveTomorrowNote = function(){
  const v = function(id){ const el = document.getElementById(id); return el ? el.value.trim() : ''; };
  const target = morningNoteTarget();
  // replace what was there for that morning (it's one note you keep updating)
  state.focus.morningNotes = morningNotes().filter(function(n){ return n.forDate!==target; });
  const head = v('tnHead'), morning = v('tnMorning'), work = v('tnWork');
  if(head || morning || work) addMorningNote(head, {morning:morning, work:work});
  persist('focus'); closeTomorrowNote();
  showToast(head || morning || work ? 'Saved — it’ll be waiting for you.' : 'Note cleared.', {icon:'&#127769;'});
  renderView();
};
function tomorrowNoteBtnHtml(cls){ const has = (function(){ const n = nightNote(morningNoteTarget()); return !!(n.headline || n.morning || n.work); })(); return '<button class="'+(cls||'dayoff-back')+'" data-action="openTomorrowNote">&#9998; '+(has ? 'Edit tomorrow’s note' : 'Note for tomorrow')+'</button>'; }

// ---- from the work preview back to Good morning (it's a sequence) ----
ACTIONS.backToMorning = function(){
  ui.planReveal = null; hideOverlay('planOverlay');
  ui.wakeMode = 'brief'; ui.wakeIntroDone = true; ui.briefSkipped = true; ui.briefT0 = Date.now() - 120000; ui.briefShift = 120000;
  if(typeof loadScores==='function' && !(ui.scores && ui.scores.got && (ui.scores.nfl || ui.scores.nba))) loadScores(true);
  showOverlay('wakeOverlay'); renderWakeOverlayInto();
};

// ---- Good morning's background: by the time you're up (default), or always Sunrise / Dark ----
function briefBgClass(){
  const b = wakeCfg().briefBg;
  if(b==='dark' || b==='sunrise') return b;
  const ph = typeof skyPhase==='function' ? skyPhase() : 'morning';
  return ph==='dawn' || ph==='morning' ? 'sunrise' : ph==='day' ? 'day' : ph==='golden' || ph==='dusk' ? 'golden' : 'night';
}
// ---- the minimal Good morning: one big button in the middle, the important things around it ----
function briefMinimalOn(){ return wakeCfg().briefLayout==='minimal'; }
function briefMinimalHtml(){
  const name = state.profile.name || '', today = todayStr(), now = typeof wxNow==='function' ? wxNow() : null, phase = skyPhase(), win = dayWindow();
  const events = state.calendar.events.filter(function(e){ return e.date===today; }).sort(function(a, c){ return (a.time||'').localeCompare(c.time||''); });
  const q = quoteOfDay(), nn = nightNote(), news = ui.morningNews && ui.morningNews.date===today ? ui.morningNews.items : null;
  const slept = lastNightSleep(), streak = computeStreak();
  const tile = function(cls, k, html, i){ return '<div class="gmm-t '+cls+'" style="--i:'+i+'"><div class="gmm-k">'+k+'</div>'+html+'</div>'; };
  ui.briefLines = [{at:0, text: (nn.headline ? 'You left yourself a note. ' : '')+'Get ready to start your day.'}];
  const sc = typeof scoresHtml==='function' ? scoresHtml() : '';
  return '<div class="brief brief2 brief4 gmm-wrap bg-'+briefBgClass()+' intro-skipped is-skipped" data-sky="'+phase+'">'+
    '<div class="brief-top"><span class="brief-brand">OPERATOR</span><span class="brief-dot"></span><span>'+new Date().toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'})+'</span>'+
      '<span class="b4-music">'+(typeof opMuteHtml==='function' ? opMuteHtml() : '')+'</span><button class="brief-skipall" data-action="briefSkip" title="Skip to the app">Skip &#9197;</button></div>'+
    '<h1 class="gmm-hello">Good morning'+(name ? ', <span>'+escapeHtml(name)+'</span>' : '')+'.</h1>'+
    '<div class="br-voice"><span class="br-voice-dot"></span><span id="brVoice"></span></div>'+(typeof opAskHtml==='function' ? opAskHtml('brief') : '')+
    '<div class="gmm">'+
      tile('gmm-wx', (now ? wxIcon(wxKind(now.code), phase) : SKY_META[phase].icon)+' Outside', now ? '<b>'+now.temp+'&deg;</b><span>'+escapeHtml(wxLabel(now.code))+(now.hi!=null ? ' · H '+now.hi+'&deg; L '+now.lo+'&deg;' : '')+'</span>' : '<b>'+SKY_META[phase].label+'</b><span>Sunset '+fmtMinOfDay(win.set)+'</span>', 0)+
      tile('gmm-q', '&#10024; For today', '<p>'+escapeHtml(q[0])+'</p>'+(q[1] ? '<small>— '+escapeHtml(q[1])+'</small>' : ''), 1)+
      tile('gmm-day', '&#128197; Today', events.length ? events.slice(0, 3).map(function(e){ return '<div class="gmm-ev"><b>'+(e.time ? fmt12Hour(e.time) : 'All day')+'</b> '+escapeHtml(e.title)+'</div>'; }).join('') : '<span>Nothing scheduled.</span>', 2)+
      tile('gmm-you', '&#128100; You', '<b>'+streak+'</b><span>day streak'+(slept ? ' · slept '+fmtDurationLabel(slept.minutes) : '')+'</span>'+(nn.headline ? '<div class="gmm-note">&#127769; '+escapeHtml(nn.headline)+'</div>' : ''), 3)+
      '<div class="gmm-c"><button class="gmm-go" data-action="wakeStartMorning"><span class="gmm-go-ring"></span><span class="gmm-go-t">Get to Work</span><span class="gmm-go-s">&#8594;</span></button></div>'+
      tile('gmm-news', '&#128240; Headlines', news && news.length ? news.slice(0, 3).map(function(n){ return '<button class="gmm-n" data-action="openNewsLink" data-url="'+escapeHtml(n.link)+'">'+escapeHtml(n.title)+'</button>'; }).join('') : '<span>'+(morningNewsOn() ? 'Loading…' : 'Headlines are off.')+'</span>', 4)+
      (sc ? tile('gmm-sc', '&#127944; Scores', sc, 5) : '')+
    '</div>'+
  '</div>';
}
ACTIONS.wakeBriefLayout = function(el, e, id){ wakeCfg().briefLayout = id; persist('focus'); renderView(); if(overlayOpen('wakeOverlay')) renderWakeOverlayInto(); };
