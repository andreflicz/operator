// ============ THE MORNING: DAWN → ALARM → GOOD MORNING → START WORK ============
// 1 Dawn       — the last 20 minutes before the alarm (when you went to sleep through Wind down):
//                the screen comes up out of the dark like a sunrise, and a soft chord swells in
//                the last minute and a half.
// 2 The alarm  — your music, the time, a line for the day, and two buttons: Snooze / Start your day.
// 3 Good morning — human first. The weather and the sun, your note from last night, a quote, a few
//                things for a good day (get outside, water, music…), the vision board, the news, and
//                a small look at the day ahead. One way forward: Start my morning.
// 4 Morning mode — routine, breakfast, the walk. Start work when you're ready.
// 5 Start work — the work intro: the business in numbers, a line to work by, the plan of attack,
//                and straight into Lock in.
// Clock out (Focus / Today) is the other end of the work day.

function wakeGreeting(){ return 'Good morning'; }

// ---- lines for the day (chosen by date, so they're the same all day) ----
const MORNING_QUOTES = [
  ['We suffer more often in imagination than in reality.', 'Seneca'],
  ['Begin at once to live, and count each separate day as a separate life.', 'Seneca'],
  ['When you arise in the morning, think of what a precious privilege it is to be alive — to breathe, to think, to enjoy, to love.', 'Marcus Aurelius'],
  ['The impediment to action advances action. What stands in the way becomes the way.', 'Marcus Aurelius'],
  ['How we spend our days is, of course, how we spend our lives.', 'Annie Dillard'],
  ['The sun himself is weak when he first rises, and gathers strength and courage as the day gets on.', 'Charles Dickens'],
  ['Write it on your heart that every day is the best day in the year.', 'Ralph Waldo Emerson'],
  ['The best time to plant a tree was twenty years ago. The second best time is now.', 'Proverb'],
  ['Stay hungry. Stay foolish.', 'Steve Jobs'],
  ['Rest is not idleness.', 'John Lubbock'],
  ['Look deep into nature, and then you will understand everything better.', 'Albert Einstein'],
  ['Every morning we are born again. What we do today is what matters most.', 'Buddha'],
  ['First say to yourself what you would be; and then do what you have to do.', 'Epictetus'],
  ['No man is free who is not master of himself.', 'Epictetus'],
  ['The obstacle is the way.', 'Ryan Holiday'],
  ['Everything is figureoutable.', 'Marie Forleo'],
  ['You could leave life right now. Let that determine what you do and say and think.', 'Marcus Aurelius'],
  ['Happiness is not something ready made. It comes from your own actions.', 'Dalai Lama']
];
const WORK_QUOTES = [
  ['Amateurs sit and wait for inspiration. The rest of us just get up and go to work.', 'Stephen King'],
  ['Be so good they can’t ignore you.', 'Steve Martin'],
  ['Discipline equals freedom.', 'Jocko Willink'],
  ['Hard choices, easy life. Easy choices, hard life.', 'Jerzy Gregorek'],
  ['Well done is better than well said.', 'Benjamin Franklin'],
  ['Small deeds done are better than great deeds planned.', 'Peter Marshall'],
  ['Make each day your masterpiece.', 'John Wooden'],
  ['Slow is smooth, and smooth is fast.', 'Navy SEAL saying'],
  ['Don’t watch the clock; do what it does. Keep going.', 'Sam Levenson'],
  ['Ideas are easy. Implementation is hard.', 'Guy Kawasaki'],
  ['Focus is a matter of deciding what things you’re not going to do.', 'John Carmack'],
  ['We are what we repeatedly do. Excellence, then, is not an act, but a habit.', 'Will Durant'],
  ['Motivation is what gets you started. Habit is what keeps you going.', 'Jim Ryun'],
  ['Lost time is never found again.', 'Benjamin Franklin']
];
// small, human things for a good day — three a morning
const MORNING_THOUGHTS = [
  ['&#127749;', 'Get outside in the first hour.', 'Ten minutes of morning light sets your whole day.'],
  ['&#127795;', 'Walk to the park.', 'No phone. Just look around for a bit.'],
  ['&#128167;', 'Water before coffee.', 'A full glass, first thing.'],
  ['&#127911;', 'Put on something you love.', 'Music while you get ready changes the whole mood.'],
  ['&#128245;', 'Phone face-down till breakfast is done.', 'The world can wait twenty minutes.'],
  ['&#127859;', 'Make breakfast like it matters.', 'Sit down for it.'],
  ['&#10024;', 'Romanticize it.', 'The coffee, the light, the walk. This is your life — enjoy it.'],
  ['&#128591;', 'Name one thing you’re grateful for.', 'Say it out loud.'],
  ['&#128075;', 'Text someone you love good morning.', 'Takes ten seconds, makes their day.'],
  ['&#127788;&#65039;', 'Five slow breaths.', 'Before you look at a screen.'],
  ['&#128719;', 'Make your bed.', 'First win of the day.'],
  ['&#9729;&#65039;', 'Look at the sky for a minute.', 'Whatever it’s doing today.'],
  ['&#127939;', 'Move a little.', 'A stretch, a walk, a few push-ups. Wake the body up.'],
  ['&#128588;', 'You don’t have to rush.', 'A calm morning makes a sharp afternoon.']
];
function dayNum(){ const d = new Date(), start = new Date(d.getFullYear(), 0, 0); return Math.floor((d - start)/86400000); }
function quoteOfDay(){ return MORNING_QUOTES[dayNum() % MORNING_QUOTES.length]; }
function workQuoteOfDay(){ return WORK_QUOTES[dayNum() % WORK_QUOTES.length]; }
function thoughtsOfDay(n){ const out = [], len = MORNING_THOUGHTS.length, d = dayNum(); for(let i=0;i<(n||3);i++) out.push(MORNING_THOUGHTS[(d*3 + i*5) % len]); return out.filter(function(x, i, a){ return a.indexOf(x)===i; }); }
function quoteHtml(q, cls){ return '<figure class="qt '+(cls||'')+'"><span class="qt-mark">&ldquo;</span><blockquote>'+escapeHtml(q[0])+'</blockquote><figcaption><span class="qt-rule"></span>'+escapeHtml(q[1])+'</figcaption></figure>'; }

// ---- headlines (through the launcher; a public feed reader if the launcher can't) ----
function morningNewsOn(){ return wakeCfg().news!==false; }
function parseRss(text){
  const xml = new DOMParser().parseFromString(text, 'text/xml');
  const chan = xml.querySelector('channel > title');
  const src = chan ? chan.textContent.replace(/\s*[:\-|].*$/, '').trim() : '';
  return Array.prototype.slice.call(xml.querySelectorAll('item')).slice(0, 4).map(function(it){
    const t = it.querySelector('title'), l = it.querySelector('link');
    return {title:(t ? t.textContent : '').trim(), link:(l ? l.textContent : '').trim(), src:src};
  }).filter(function(x){ return x.title; });
}
async function fetchWithin(url, ms){
  const ctl = new AbortController(), tm = setTimeout(function(){ ctl.abort(); }, ms);
  try{ const r = await fetch(url, {cache:'no-store', signal:ctl.signal}); clearTimeout(tm); return r; }catch(e){ clearTimeout(tm); return null; }
}
async function loadMorningNews(){
  if(!morningNewsOn()) return;
  const today = todayStr();
  if(ui.morningNews && ui.morningNews.date===today && (ui.morningNews.items || ui.morningNews.loading)) return;
  ui.morningNews = {date:today, loading:true, items:null};
  let items = null;
  try{
    const res = await fetchWithin(WAKE_HELPER+'news', 9000);
    if(res && res.ok) items = parseRss(await res.text());
  }catch(e){}
  if(!items || !items.length){
    // an Operator still running last version's launcher has no /news — read the feed another way
    try{
      const res = await fetchWithin('https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent('https://feeds.npr.org/1001/rss.xml'), 8000);
      if(res && res.ok){ const j = await res.json(); items = arr(j && j.items).slice(0, 4).map(function(x){ return {title:String(x.title||'').trim(), link:String(x.link||''), src:'NPR'}; }).filter(function(x){ return x.title; }); }
    }catch(e){}
  }
  ui.morningNews = {date:today, loading:false, items:items && items.length ? items : null};
  if(ui.morningNews.items && ui.wakeMode==='brief' && overlayOpen('wakeOverlay')){
    // it arrived after the page started building: give it its moment instead of popping in
    ui.briefNewsAt = Date.now();
    renderWakeOverlayInto();
  }
}
ACTIONS.openNewsLink = function(el){ const u = el.dataset.url; if(!/^https?:\/\//.test(u||'')) return; helperFetch(WAKE_HELPER+'open?b=default&u='+hexUtf8(u), 3000).then(function(ok){ if(!ok) window.open(u, '_blank'); }); };

// ---- 1 dawn: the screen comes up like a sunrise before the alarm ----
const DAWN_MS = 20*60000;
let dawnDismissedTs = 0;
function checkDawn(){
  const m = state.modes && state.modes.active;
  if(!m || !m.sleep || overlayOpen('wakeOverlay')) return;
  const nw = nextWake(); if(!nw) return;
  const left = nw.ts - Date.now();
  if(left > DAWN_MS || left <= 0 || dawnDismissedTs===nw.ts) return;
  ui.wakeMode = 'dawn'; ui.dawnTs = nw.ts; ui.dawnTime = nw.time; ui.dawnPad = false;
  closeOtherOverlaysForWake();
  showOverlay('wakeOverlay'); renderWakeOverlayInto();
  pingWrapper();
}
function dawnProgress(){ return ui.dawnTs ? Math.max(0, Math.min(1, 1 - (ui.dawnTs - Date.now())/DAWN_MS)) : 1; }
function dawnHtml(){
  const p = dawnProgress();
  return '<div class="dawn" id="dawnSky" style="--p:'+p.toFixed(3)+'">'+
    '<div class="dawn-sky"></div><div class="dawn-sun"></div><div class="dawn-haze"></div>'+
    '<div class="dawn-c">'+
      '<div class="dawn-clock" id="wakeClock">'+new Date().toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'})+'</div>'+
      '<div class="dawn-sub">Alarm at '+fmt12Hour(ui.dawnTime||'')+'. Rest a little longer.</div>'+
    '</div>'+
    '<div class="dawn-acts"><button class="dawn-btn" data-action="dawnUp">I’m already up</button><button class="dawn-btn is-ghost" data-action="dawnDismiss" title="Hide until the alarm">Hide</button></div>'+
  '</div>';
}
function tickDawn(){
  const el = document.getElementById('dawnSky'); if(!el) return;
  const p = dawnProgress();
  el.style.setProperty('--p', p.toFixed(3));
  // the last minute and a half: a soft chord swells under the light
  if(!ui.dawnPad && ui.dawnTs && ui.dawnTs - Date.now() <= 90000){ ui.dawnPad = true; playDawnPad(); }
}
ACTIONS.dawnDismiss = function(){ dawnDismissedTs = ui.dawnTs; ui.wakeMode = null; hideOverlay('wakeOverlay'); };
ACTIONS.dawnUp = function(){
  // up before the alarm: it won't ring this morning, and Good morning starts now
  const w = wakeCfg(); if(ui.dawnTs){ w.lastFiredTs = Math.max(w.lastFiredTs||0, ui.dawnTs); persist('focus'); }
  wakeImUp();
};

// ---- 2 the alarm: Snooze / Start your day ----
function wakeRingHtml(){
  const w = wakeCfg();
  const playing = wakeUsesMusic(w) && !(wakeRing && wakeRing.mediaFailed);
  const q = quoteOfDay(), name = state.profile.name;
  const ns = morningNotesFor(todayStr());
  return '<div class="wk2 wk3" data-sky="'+skyLook()+'">'+
    '<div class="wk2-aura"><i></i><i></i><i></i></div>'+
    '<div class="wk2-center">'+
      '<div class="wk2-greet">Good morning'+(name ? ', '+escapeHtml(name) : '')+(wakeRing && wakeRing.test ? ' <span class="tag">TEST</span>' : '')+'</div>'+
      '<div class="wk2-clock" id="wakeClock">'+new Date().toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'})+'</div>'+
      '<div class="wk3-date">'+new Date().toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'})+'</div>'+
      '<div class="wk3-quote">'+quoteHtml(q, 'is-ring')+'</div>'+
      (ns.length ? '<div class="wk2-note">&ldquo;'+escapeHtml(ns[ns.length-1].text)+'&rdquo;<span>You, last night</span></div>' : '')+
      '<div class="wk2-actions wk3-actions">'+
        '<button class="wk2-snooze" data-action="wakeSnooze">&#128164; Snooze '+(w.snoozeMinutes||9)+' min</button>'+
        '<button class="wk2-up" data-action="wakeStartDay"><span>&#9728;&#65039; Start your day</span></button>'+
      '</div>'+
      (wakeUsesMusic(w) ? '<div class="wk2-music'+(playing?' is-playing':'')+'">'+
          (playing ? '<span class="wk2-eq"><i></i><i></i><i></i><i></i></span>' : '')+
          '<span class="wk2-song">'+escapeHtml(mediaName(w.media))+'</span><span class="wk2-src">'+(wakeRing && wakeRing.mediaFailed ? 'Starting the music…' : escapeHtml(mediaKindLabel(w.media)))+'</span>'+
        '</div>' : '')+
    '</div>'+
  '</div>';
}

// ---- 3 Good morning ----
function briefBase(){ return wakeCfg().intro!=='quick' ? 5600 : 3000; }
function wakeBriefHtml(){
  const today = todayStr(), name = state.profile.name || '';
  const events = state.calendar.events.filter(function(e){ return e.date===today; }).sort(function(a, c){ return (a.time||'').localeCompare(c.time||''); });
  const notes = morningNotesFor(today).map(function(n){ return n.text; });
  const vb = masterVisionBoard();
  const q = quoteOfDay();
  const news = ui.morningNews && ui.morningNews.date===today ? ui.morningNews.items : null;
  const now = typeof wxNow==='function' ? wxNow() : null, phase = skyPhase(), win = dayWindow();
  const timeStr = new Date().toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'});
  const mNow = new Date().getHours()*60 + new Date().getMinutes();
  const plan = typeof todaysPlan==='function' ? todaysPlan().filter(function(t){ return t.status!=='done'; }) : [];
  // The page builds itself one piece at a time, with a line of narration typing above each piece
  // as it arrives. Delays are fixed when a piece first appears (re-renders keep the same node, so
  // nothing plays twice); skipping the intro shifts the whole schedule earlier.
  const cine = wakeCfg().intro!=='quick';
  const base = briefBase(), gap = 1150;
  const sunLine = mNow < win.rise ? 'The sun comes up at '+fmtMinOfDay(win.rise)+'.' : mNow < win.set ? 'The sun’s been up since '+fmtMinOfDay(win.rise)+'.' : '';
  const lines = [];
  let k = 0;
  const panel = function(cls, anim, voice, html, extraStyle, attrs){
    const d = base + (k++)*gap;
    if(voice) lines.push({at: d - 380, text: voice});
    return '<section class="br-p '+cls+' '+anim+'" data-k="'+(k-1)+'" style="--d:'+d+'ms'+(extraStyle||'')+'"'+(attrs||'')+'>'+html+'</section>';
  };
  // the hero: the weather and the sun — the first, biggest thing you see
  const hero = panel('br-hero', 'br-a-blur', 'It’s '+timeStr+'.'+(now ? ' '+now.temp+'° and '+wxLabel(now.code).toLowerCase()+' outside.' : '')+(sunLine ? ' '+sunLine : ''),
    '<div class="brh-wx">'+
      '<span class="brh-i">'+(now ? wxIcon(wxKind(now.code), phase) : SKY_META[phase].icon)+'</span>'+
      '<div>'+(now ? '<div class="brh-t">'+now.temp+'&deg;</div><div class="brh-l">'+escapeHtml(wxLabel(now.code))+'</div>' : '<div class="brh-l is-big">'+SKY_META[phase].label+'</div>')+
        (now && now.hi!=null ? '<div class="brh-hl">High '+now.hi+'&deg; &middot; Low '+now.lo+'&deg;</div>' : '')+'</div>'+
    '</div>'+
    '<div class="brh-sun">'+sunArcHtml({w:300, h:78, pad:10, r:5, animate:true})+
      '<div class="brh-sun-row"><span><small>Sunrise</small>'+fmtMinOfDay(win.rise)+'</span><span class="brh-day">'+daylightLabel()+'</span><span><small>Sunset</small>'+fmtMinOfDay(win.set)+'</span></div>'+
    '</div>');
  const left = [], right = [];
  if(notes.length) left.push(panel('br-lastnight', 'br-a-blur', 'You left yourself a note last night.', '<div class="br-k">&#127769; From Last Night</div>'+notes.map(function(t){ return '<div class="br-ln-text">'+escapeHtml(t)+'</div>'; }).join('')));
  left.push(panel('br-quote', 'br-a-words', 'Something to carry with you.', '<div class="br-k">&#10024; For Today</div>'+quoteHtml(q)));
  left.push(panel('br-thoughts', 'br-a-rise', 'A few things for a good day.', '<div class="br-k">&#127807; For a Good Day</div>'+
    thoughtsOfDay(3).map(function(x, i){ return '<div class="br-th" style="--i:'+i+'"><span class="br-th-i">'+x[0]+'</span><div><b>'+x[1]+'</b><span>'+x[2]+'</span></div></div>'; }).join('')));
  if(vb && vb.elements.length) right.push(panel('br-vision', 'br-a-scale', 'And this is what it’s all for.', '<span class="br-vision-k">&#127775; Vision</span>'+boardStaticHtml(vb, 'wake-board')+'<span class="br-vision-hint">Click to open</span>', '', ' data-action="wakeBoardToggle" title="Open your vision board"'));
  if(news){
    // headlines that came in after the page started get their own turn instead of popping in
    const d0 = base + k*gap, late = ui.briefNewsAt ? Math.max(600, d0 - (ui.briefNewsAt - (ui.briefT0||0))) : null;
    right.push(panel('br-news', 'br-a-rise', 'Here’s what’s happening out there.', '<div class="br-k">&#128240; Headlines'+(news[0].src ? ' <span class="br-src">'+escapeHtml(news[0].src)+'</span>' : '')+'</div>'+
      news.slice(0, 4).map(function(n){ return '<button class="br-news-i" data-action="openNewsLink" data-url="'+escapeHtml(n.link)+'"><span>'+escapeHtml(n.title)+'</span><i>&#8599;</i></button>'; }).join(''), late!=null ? ';--late:'+late+'ms' : ''));
  } else if(morningNewsOn() && ui.morningNews && ui.morningNews.loading){
    right.push('<section class="br-p br-news is-loading br-a-fade" style="--d:'+(base + k*gap)+'ms"><div class="br-k">&#128240; Headlines</div><div class="br-news-wait"><i></i><i></i><i></i></div></section>');
  }
  // the day ahead — small, just the shape of it
  const dayBits = [];
  if(events.length) dayBits.push(events.length===1 ? 'One thing on the calendar' : events.length+' things on the calendar');
  if(plan.length) dayBits.push(plan.length===1 ? 'one thing planned' : plan.length+' things planned');
  right.push(panel('br-day', 'br-a-right', dayBits.length ? 'Later today: '+dayBits.join(', ')+'. No rush.' : 'Nothing on the calendar. The day’s yours.',
    '<div class="br-k">&#128197; The Day Ahead</div>'+
    (events.length ? '<div class="br-agenda">'+events.slice(0, 4).map(function(e){ return '<div><b>'+(e.time ? fmt12Hour(e.time) : 'All day')+'</b>'+escapeHtml(e.title)+'</div>'; }).join('')+'</div>' : '')+
    (plan.length ? '<div class="br-day-plan">'+(plan.length===1 ? 'One thing' : plan.length+' things')+' planned for work. First up: <b>'+escapeHtml(plan[0].title)+'</b></div>' : '')+
    (!events.length && !plan.length ? '<div class="br-day-plan">Nothing scheduled. Enjoy it.</div>' : '')));
  const ctaD = base + k*gap;
  lines.push({at: ctaD - 380, text: 'Take your time. Work can wait until you’re ready.'});
  ui.briefLines = lines;
  const shift = ui.briefShift || 0;
  return '<div class="brief brief2 brief3'+(ui.wakeBoardBig?' board-open':'')+(ui.wakeIntroDone?' intro-skipped':'')+(ui.briefSkipped?' is-skipped':'')+'" data-sky="'+phase+'" style="--shift:'+shift+'ms">'+
    (cine
      ? '<div class="brief-intro is-cinematic" data-action="wakeIntroSkip" title="Click to skip"><div class="bi-glow"></div>'+
          '<div class="bi-time">'+timeStr+'</div>'+
          '<div class="bi-word">Good morning</div>'+(name ? '<div class="bi-name">'+escapeHtml(name)+'</div>' : '')+
          '<div class="bi-line">'+new Date().toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'})+'</div></div>'
      : '<div class="brief-intro" data-action="wakeIntroSkip" title="Click to skip"><div class="bi-glow"></div><div class="bi-word">Good morning</div>'+(name ? '<div class="bi-name">'+escapeHtml(name)+'</div>' : '')+'</div>')+
    '<div class="brief-grid-bg"></div>'+
    '<div class="brief-inner">'+
      '<div class="brief-top br-p br-a-fade" style="--d:'+(base-1300)+'ms"><span class="brief-brand">OPERATOR</span><span class="brief-dot"></span><span>'+new Date().toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'})+'</span>'+
        (ui.briefSkipped ? '' : '<button class="brief-skipall" data-action="briefSkip" title="Show everything now">Skip &#9197;</button>')+
        '<button class="brief-x" data-action="wakeBriefDone" title="Close">&#10005;</button></div>'+
      '<h1 class="brief-hello br-p br-a-blur" style="--d:'+(base-1000)+'ms">Good morning'+(name ? ', <span>'+escapeHtml(name)+'</span>' : '')+'.</h1>'+
      '<div class="br-voice br-p br-a-fade" style="--d:'+(base-700)+'ms"><span class="br-voice-dot"></span><span id="brVoice"></span><span class="br-caret"></span></div>'+
      '<div class="brief-music-slot">'+wakeMusicPillHtml()+'</div>'+
      hero+
      '<div class="brief2-cols"><div class="brief2-col is-left">'+left.join('')+'</div><div class="brief2-col is-right">'+right.join('')+'</div></div>'+
      '<div class="brief-cta br-p br-a-rise" data-k="'+k+'" style="--d:'+ctaD+'ms">'+
        '<button class="brief-go brief-morning" data-action="wakeStartMorning">&#9728;&#65039; Start My Morning</button>'+
      '</div>'+
    '</div>'+
    (ui.wakeBoardBig && vb ? '<div class="br-vision-big" data-action="wakeBoardToggle" title="Close">'+boardStaticHtml(vb, 'wake-board')+'<button class="wk2-vision-x" data-action="wakeBoardToggle">&#10005;</button></div>' : '')+
  '</div>';
}
// skipping the intro moves the whole schedule up so the page starts building right away
ACTIONS.wakeIntroSkip = function(){
  if(!ui.wakeIntroDone){
    const base = briefBase(), el = Date.now() - (ui.briefT0||Date.now());
    const shift = Math.max(0, base - 1400 - el);
    ui.briefShift = (ui.briefShift||0) + shift; ui.briefT0 = (ui.briefT0||Date.now()) - shift;
  }
  ui.wakeIntroDone = true; renderWakeOverlayInto();
};
// ---- the narration: one line at a time, typed out ----
let briefVoiceTimer = null;
function briefVoiceRun(){
  clearInterval(briefVoiceTimer);
  briefVoiceTimer = setInterval(function(){
    const el = document.getElementById('brVoice');
    if(!el || ui.wakeMode!=='brief' || !overlayOpen('wakeOverlay')){ if(!overlayOpen('wakeOverlay')) clearInterval(briefVoiceTimer); return; }
    const lines = ui.briefLines || [], t = Date.now() - (ui.briefT0||0);
    let cur = null; lines.forEach(function(l){ if(t >= l.at) cur = l; });
    const txt = cur ? (ui.briefSkipped ? cur.text : cur.text.slice(0, Math.max(0, Math.floor((t - cur.at)/30)))) : '';
    if(el.textContent!==txt) el.textContent = txt;
    const wrap = el.parentNode; if(wrap) wrap.classList.toggle('is-typing', !!cur && txt.length < cur.text.length);
    // as the narration reaches each piece, bring it into view if it's below the fold
    const idx = cur ? lines.indexOf(cur) : -1;
    if(idx>0 && idx!==ui.briefLineSeen && !ui.briefSkipped){
      ui.briefLineSeen = idx;
      const target = document.querySelector('#wakeContent .br-p[data-k="'+idx+'"]');
      if(target) setTimeout(function(){ target.scrollIntoView({block:'nearest', behavior:'smooth'}); }, 400);
    }
  }, 30);
}
ACTIONS.briefSkip = function(){ ui.wakeIntroDone = true; ui.briefSkipped = true; renderWakeOverlayInto(); };

// ---- 5 Start work: the work intro, then straight into Lock in ----
function clockIn(){
  const m = state.modes.active;
  if(m && (m.morning || (m.type==='offtime' && !m.sleep))) finishActiveMode(true);
  if(typeof applyNightPlanAuto==='function') applyNightPlanAuto();
  ui.view = 'today'; renderView();
  ui.planReveal = {at:Date.now()};
  showOverlay('planOverlay'); renderPlanRevealInto();
  playWorkIntro();
}
ACTIONS.clockIn = function(){ clockIn(); };
ACTIONS.closePlanReveal = function(){ ui.planReveal = null; hideOverlay('planOverlay'); renderView(); };
ACTIONS.planLockIn = function(el, e, id){
  // the intro hands over to the Lock in steps with the first task already picked
  ui.planReveal = null; hideOverlay('planOverlay');
  if(id){ setNextUp(id); ui.stagedTaskId = id; }
  renderView(); openLockInChooser();
};
function workStats(){
  const clients = arr(state.business.clients).filter(function(c){ return clientStageActive(c.stage); });
  const mrr = clients.reduce(function(a, c){ return a + Number(c.mrr||0); }, 0);
  const goal = Number(state.profile.revenueGoalMonthly)||0;
  const open = arr(state.business.pipeline).filter(leadIsOpen);
  const pipe = open.reduce(function(a, p){ return a + Number(p.value||0); }, 0);
  const d = new Date(), key = d.getFullYear()+'-'+pad2(d.getMonth()+1);
  const collected = typeof collectedByMonth==='function' ? collectedByMonth(key) : 0;
  const y = addDays(todayStr(), -1), yDeep = deepWorkMinutesFor(y);
  return [
    {k:'Monthly recurring', v:money(mrr), sub: goal ? Math.round(mrr/goal*100)+'% of '+money(goal) : clients.length+' active client'+(clients.length===1?'':'s'), pct: goal ? Math.min(100, mrr/goal*100) : null},
    {k:'Collected this month', v:money(collected), sub:new Date().toLocaleDateString(undefined, {month:'long'})},
    {k:'Open leads', v:String(open.length), sub: pipe ? money(pipe)+' in the pipeline' : 'In the pipeline'},
    {k:'Deep work yesterday', v:fmtHours(yDeep), sub:'Streak: '+computeStreak()+' day'+(computeStreak()===1?'':'s')}
  ];
}
function renderPlanReveal(){
  if(!ui.planReveal) return '';
  const plan = todaysPlan().filter(function(t){ return t.status!=='done'; }).slice(0, 6), first = plan[0];
  const today = todayStr(), name = state.profile.name || '';
  const events = state.calendar.events.filter(function(e){ return e.date===today && e.time; }).sort(function(a, c){ return (a.time||'').localeCompare(c.time||''); });
  const q = workQuoteOfDay();
  const stats = workStats();
  const target = state.standards.deepWorkTargetMinutes || 180;
  let d = 900;
  const at = function(step){ const v = d; d += step||260; return 'animation-delay:'+v+'ms'; };
  return '<div class="wi">'+
    '<div class="wi-top"><span class="pr-badge">&#128339; Clocked In</span><span class="pr-time">'+new Date().toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'})+'</span>'+
      '<button class="wd-close" data-action="closePlanReveal" title="Close">&#10005;</button></div>'+
    '<div class="wi-inner">'+
      '<div class="wi-k" style="animation-delay:200ms">Work Mode</div>'+
      '<h1 class="wi-h" style="animation-delay:420ms">Let’s get to work'+(name ? ', <span>'+escapeHtml(name)+'</span>' : '')+'.</h1>'+
      '<div class="wi-stats">'+stats.map(function(s){ return '<div class="wi-stat" style="'+at(140)+'"><div class="wi-stat-k">'+s.k+'</div><div class="wi-stat-v">'+s.v+'</div>'+(s.pct!=null ? '<div class="wi-bar"><i style="width:'+s.pct.toFixed(1)+'%"></i></div>' : '')+'<div class="wi-stat-s">'+escapeHtml(s.sub)+'</div></div>'; }).join('')+'</div>'+
      '<div class="wi-cols">'+
        '<div class="wi-plan" style="'+at(300)+'"><div class="wi-sec">Plan of Attack <span>'+(plan.length ? plan.length+(plan.length===1?' thing':' things') : '')+'</span></div>'+
          (plan.length ? '<ol class="pr-list">'+plan.map(function(t, i){ return '<li class="pr-row'+(i===0?' is-first':'')+'" style="animation-delay:'+(d + i*160)+'ms"><span class="wd-num">'+String(i+1).padStart(2,'0')+'</span>'+priorityTag(t.priority)+'<span class="pr-t">'+escapeHtml(t.title)+'</span>'+(t.deadline===today ? '<span class="pr-due">Due today</span>' : '')+'</li>'; }).join('')+'</ol>'
            : '<div class="wd-empty">Nothing planned yet. Pick your first move in Lock in.</div>')+
          (events.length ? '<div class="wi-cal">'+events.slice(0, 3).map(function(e){ return '<span><b>'+fmt12Hour(e.time)+'</b>'+escapeHtml(e.title)+'</span>'; }).join('')+'</div>' : '')+
        '</div>'+
        '<div class="wi-side" style="'+at(300)+'">'+quoteHtml(q, 'is-work')+
          '<div class="wi-target"><span>Today’s target</span><b>'+fmtHours(target)+'</b><span>of deep work</span></div></div>'+
      '</div>'+
      '<div class="pr-cta" style="animation-delay:'+(d + plan.length*160 + 200)+'ms">'+
        '<button class="ls-go pr-go" data-action="planLockIn"'+(first ? ' data-id="'+first.id+'"' : '')+'><span class="ls-go-ring"></span><span class="ls-go-i">&#128274;</span><b>LOCK IN</b></button>'+
        (first ? '<div class="ls-go-sub">First up: '+escapeHtml(first.title)+'</div>' : '')+
        '<button class="pr-later" data-action="closePlanReveal">Not yet</button>'+
      '</div>'+
    '</div>'+
  '</div>';
}
function renderPlanRevealInto(){ const el = document.getElementById('planContent'); if(el) morphInto(el, renderPlanReveal()); }
registerModal('planOverlay', renderPlanRevealInto);

// ---- Clock out: done working for the day ----
function clockOutFlash(){
  const d = document.createElement('div');
  d.className = 'lock-flash is-out is-clock';
  d.innerHTML = '<div class="lf-ring"></div><div class="lf-k">&#127937; Clocked Out</div><div class="lf-t">'+fmtHours(deepWorkMinutesTodayLive())+' of deep work today</div>';
  document.body.appendChild(d);
  setTimeout(function(){ if(d.parentNode) d.parentNode.removeChild(d); }, 2100);
}
ACTIONS.clockOut = function(){
  if(state.focus.activeSession){ showToast('Lock out of your session first.', {icon:'&#128274;'}); return; }
  const prev = state.modes.active ? Object.assign({}, state.modes.active) : null;
  startMode('offtime', {clockedOut:true, note:'Clocked out'});
  ui.undoMode = {prev:prev, at:Date.now()};
  playLockOut(); clockOutFlash();
  showToast('Done for the day.', {icon:'&#127937;', actionLabel:'Undo', actionAction:'undoQuickMode', duration:6000});
};

// the vision board fits itself once its entrance has played (it measures wrong while scaled)
document.addEventListener('animationend', function(e){ if(e.target && e.target.classList && (e.target.classList.contains('br-vision') || e.target.classList.contains('mm-vision'))) fitStaticBoards(e.target); });
