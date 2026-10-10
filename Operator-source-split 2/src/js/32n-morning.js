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
// Quotes: a mix of philosophers, athletes, makers and founders — famous and not. Only lines whose
// source is solid; lines with no name are our own.
const MORNING_QUOTES = [
  ['At dawn, when you have trouble getting out of bed, tell yourself: “I have to go to work — as a human being.”', 'Marcus Aurelius'],
  ['No man is free who is not master of himself.', 'Epictetus'],
  ['First say to yourself what you would be; and then do what you have to do.', 'Epictetus'],
  ['It is not that we have a short time to live, but that we waste a lot of it.', 'Seneca'],
  ['We suffer more often in imagination than in reality.', 'Seneca'],
  ['Begin at once to live, and count each separate day as a separate life.', 'Seneca'],
  ['Waste no more time arguing about what a good man should be. Be one.', 'Marcus Aurelius'],
  ['The impediment to action advances action. What stands in the way becomes the way.', 'Marcus Aurelius'],
  ['He who has a why to live can bear almost any how.', 'Friedrich Nietzsche'],
  ['Do nothing which is of no use.', 'Miyamoto Musashi'],
  ['Well begun is half done.', 'Aristotle'],
  ['How we spend our days is, of course, how we spend our lives.', 'Annie Dillard'],
  ['The sun himself is weak when he first rises, and gathers strength and courage as the day gets on.', 'Charles Dickens'],
  ['Write it on your heart that every day is the best day in the year.', 'Ralph Waldo Emerson'],
  ['Rest at the end, not in the middle.', 'Kobe Bryant'],
  ['Everything negative — pressure, challenges — is all an opportunity for me to rise.', 'Kobe Bryant'],
  ['You are in danger of living a life so comfortable and soft that you will die without ever realizing your true potential.', 'David Goggins'],
  ['Discipline equals freedom.', 'Jocko Willink'],
  ['Hard choices, easy life. Easy choices, hard life.', 'Jerzy Gregorek'],
  ['Inspiration is for amateurs — the rest of us just show up and get to work.', 'Chuck Close'],
  ['What you do every day matters more than what you do once in a while.', 'Gretchen Rubin'],
  ['Keep hammering.', 'Cameron Hanes'],
  ['The best time to plant a tree was twenty years ago. The second best time is now.', 'Proverb'],
  ['You don’t need a perfect day. You need a good first hour.', ''],
  ['The version of you that you want to be is built in mornings like this one.', '']
];
const WORK_QUOTES = [
  ['Volume negates luck.', 'Alex Hormozi'],
  ['Make people an offer so good they would feel stupid saying no.', 'Alex Hormozi'],
  ['Real artists ship.', 'Steve Jobs'],
  ['Your time is limited, so don’t waste it living someone else’s life.', 'Steve Jobs'],
  ['Creativity is just connecting things.', 'Steve Jobs'],
  ['Learn to sell. Learn to build. If you can do both, you will be unstoppable.', 'Naval Ravikant'],
  ['Play long-term games with long-term people.', 'Naval Ravikant'],
  ['Make something people want.', 'Paul Graham'],
  ['Do things that don’t scale.', 'Paul Graham'],
  ['If you double the number of experiments you do per year, you’re going to double your inventiveness.', 'Jeff Bezos'],
  ['The work you do while you procrastinate is probably the work you should be doing for the rest of your life.', 'Jessica Hische'],
  ['Focus is a matter of deciding what things you’re not going to do.', 'John Carmack'],
  ['Amateurs sit and wait for inspiration. The rest of us just get up and go to work.', 'Stephen King'],
  ['Be so good they can’t ignore you.', 'Steve Martin'],
  ['Ideas are easy. Implementation is hard.', 'Guy Kawasaki'],
  ['Absorb what is useful, discard what is useless, and add what is specifically your own.', 'Bruce Lee'],
  ['Nobody cares. Work harder.', 'Cameron Hanes'],
  ['Slow is smooth, and smooth is fast.', 'Navy SEAL saying'],
  ['Done is better than perfect.', 'Facebook office poster'],
  ['One focused hour beats a distracted day.', ''],
  ['Ship it, then make it better.', '']
];
// for the work preview's second line: starting, procrastination, taking action
const ACTION_QUOTES = [
  ['Procrastination is the thief of time.', 'Edward Young'],
  ['You may delay, but time will not.', 'Benjamin Franklin'],
  ['The best way out is always through.', 'Robert Frost'],
  ['Action is the antidote to despair.', 'Joan Baez'],
  ['Start where you are. Use what you have. Do what you can.', 'Arthur Ashe'],
  ['If you have to eat two frogs, eat the ugliest one first.', 'Brian Tracy'],
  ['Inaction breeds doubt and fear. Action breeds confidence and courage.', 'Dale Carnegie'],
  ['Small daily improvements over time lead to stunning results.', 'Robin Sharma'],
  ['You can’t build a reputation on what you are going to do.', 'Henry Ford'],
  ['Lost time is never found again.', 'Benjamin Franklin'],
  ['The task you’re avoiding is usually the one that moves everything.', ''],
  ['Two minutes of starting beats two hours of planning.', '']
];
// quotes turn over by themselves every so often while a page is up, or on ↻
const QUOTE_SETS = {morning:function(){ return MORNING_QUOTES; }, work:function(){ return WORK_QUOTES; }, action:function(){ return ACTION_QUOTES; }};
function quoteFor(kind){ const list = QUOTE_SETS[kind](), off = (ui.qOff && ui.qOff[kind]) || 0; return list[(dayNum() + off) % list.length]; }
function nextQuote(kind){ ui.qOff = ui.qOff || {}; ui.qOff[kind] = (ui.qOff[kind]||0) + 1; document.querySelectorAll('.qt[data-q="'+kind+'"]').forEach(function(el){
  const tmp = document.createElement('div'); tmp.innerHTML = quoteHtml(quoteFor(kind), el.dataset.cls||'', kind); const n = tmp.firstChild; n.classList.add('qt-swap'); el.replaceWith(n); }); }
ACTIONS.nextQuote = function(el, e, id){ nextQuote(id); };
setInterval(function(){
  if(typeof ui==='undefined' || !ui) return;
  if(overlayOpen('wakeOverlay') && ui.wakeMode==='brief' && briefBuilt()) nextQuote('morning');
  if(overlayOpen('planOverlay')){ nextQuote('work'); setTimeout(function(){ nextQuote('action'); }, 9000); }
}, 45000);
// small, human things for a good day — three a morning
const MORNING_THOUGHTS = [
  ['&#127749;', 'Get outside in the first hour.', 'Ten minutes of morning light sets your whole day.'],
  ['&#127795;', 'Walk to the park.', 'No phone. Just look around for a bit.'],
  ['&#128167;', 'Water before coffee.', 'A full glass, first thing.'],
  ['&#127911;', 'Put on something you love.', 'Music while you get ready changes the whole mood.'],
  ['&#128245;', 'Phone face-down till breakfast is done.', 'The world can wait twenty minutes.'],
  ['&#127859;', 'Make breakfast like it matters.', 'Sit down for it.'],
  ['&#9749;', 'Make a proper coffee.', 'Or a fresh juice. Take it slow.'],
  ['&#129367;', 'Think about what you’ll eat today.', 'Decide now and you won’t grab junk later.'],
  ['&#127807;', 'Open a window.', 'Fresh air before the screen.'],
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
function quoteOfDay(){ return quoteFor('morning'); }
function workQuoteOfDay(){ return quoteFor('work'); }
function thoughtsOfDay(n){ const out = [], len = MORNING_THOUGHTS.length, d = dayNum(); for(let i=0;i<(n||3);i++) out.push(MORNING_THOUGHTS[(d*3 + i*5) % len]); return out.filter(function(x, i, a){ return a.indexOf(x)===i; }); }
function quoteHtml(q, cls, kind){ return '<figure class="qt '+(cls||'')+'"'+(kind ? ' data-q="'+kind+'" data-cls="'+(cls||'')+'"' : '')+'><span class="qt-mark">&ldquo;</span>'+(kind ? '<button class="qt-next" data-action="nextQuote" data-id="'+kind+'" title="Another one">&#8635;</button>' : '')+'<blockquote>'+escapeHtml(q[0])+'</blockquote>'+(q[1] ? '<figcaption><span class="qt-rule"></span>'+escapeHtml(q[1])+'</figcaption>' : '')+'</figure>'; }

// ---- headlines (through the launcher; a public feed reader if the launcher can't) ----
function morningNewsOn(){ return wakeCfg().news!==false; }
// your topics ("AI, Knicks, marketing") → headlines about those, from Google News
function newsTopics(){ return String(wakeCfg().newsTopics||'').split(',').map(function(x){ return x.trim(); }).filter(Boolean).join(', '); }
function topicsQuery(t){ return t.split(',').map(function(x){ x = x.trim(); return /\s/.test(x) ? '"'+x+'"' : x; }).join(' OR ')+' when:2d'; }
// Google News titles end in " - Source"; show the source on its own
function splitSource(n){ const m = / - ([^-]{2,60})$/.exec(n.title); if(m && (!n.src || n.src===m[1])){ n.title = n.title.slice(0, m.index); n.src = m[1]; } return n; }
function parseRss(text){
  const xml = new DOMParser().parseFromString(text, 'text/xml');
  const chan = xml.querySelector('channel > title');
  const src = chan ? chan.textContent.replace(/\s*[:\-|].*$/, '').trim() : '';
  return Array.prototype.slice.call(xml.querySelectorAll('item')).slice(0, 6).map(function(it){
    const t = it.querySelector('title'), l = it.querySelector('link');
    const so = it.querySelector('source');
    return splitSource({title:(t ? t.textContent : '').trim(), link:(l ? l.textContent : '').trim(), src:so ? so.textContent.trim() : src});
  }).filter(function(x){ return x.title; });
}
async function fetchWithin(url, ms){
  const ctl = new AbortController(), tm = setTimeout(function(){ ctl.abort(); }, ms);
  try{ const r = await fetch(url, {cache:'no-store', signal:ctl.signal}); clearTimeout(tm); return r; }catch(e){ clearTimeout(tm); return null; }
}
// the morning paper: your headlines, plus a sports and a tech section (each one is just topics —
// change them in Settings → Wake-up alarm; empty a section to drop it)
function sectionTopics(v, dflt){ return String(v==null ? dflt : v).split(',').map(function(x){ return x.trim(); }).filter(Boolean).join(', '); }
function newsSections(){
  const w = wakeCfg();
  return [{id:'sports', label:'Sports', icon:'&#127936;', q:sectionTopics(w.newsSports, 'NBA, NFL')}, {id:'tech', label:'Tech', icon:'&#128187;', q:sectionTopics(w.newsTech, 'AI, Apple, startups')}].filter(function(x){ return x.q; });
}
async function fetchNews(topics){
  let items = null;
  try{
    const res = await fetchWithin(WAKE_HELPER+'news'+(topics ? '?q='+hexUtf8(topics) : ''), 9000);
    if(res && res.ok) items = parseRss(await res.text());
  }catch(e){}
  if(!items || !items.length){
    // an Operator still running last version's launcher has no /news — read the feed another way
    try{
      const feed = topics ? 'https://news.google.com/rss/search?q='+encodeURIComponent(topicsQuery(topics))+'&hl=en-US&gl=US&ceid=US:en' : 'https://feeds.npr.org/1001/rss.xml';
      const res = await fetchWithin('https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(feed), 8000);
      if(res && res.ok){ const j = await res.json(); items = arr(j && j.items).slice(0, 6).map(function(x){ return splitSource({title:String(x.title||'').trim(), link:String(x.link||''), src:topics ? '' : 'NPR'}); }).filter(function(x){ return x.title; }); }
    }catch(e){}
  }
  return items && items.length ? items : null;
}
async function loadMorningNews(){
  if(!morningNewsOn()) return;
  const today = todayStr();
  if(ui.morningNews && ui.morningNews.date===today && (ui.morningNews.items || ui.morningNews.loading)) return;
  ui.morningNews = {date:today, loading:true, items:null, sec:{}};
  const secs = newsSections();
  const all = await Promise.all([fetchNews(newsTopics())].concat(secs.map(function(x){ return fetchNews(x.q); })));
  const items = all[0], seen = {}, sec = {};
  arr(items).forEach(function(n){ seen[n.title] = 1; });
  secs.forEach(function(x, i){ const list = arr(all[i+1]).filter(function(n){ if(seen[n.title]) return false; seen[n.title] = 1; return true; }); if(list.length) sec[x.id] = list; });
  ui.morningNews = {date:today, loading:false, items:items, sec:sec};
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

// ---- the note from last night: a headline (on the alarm), a message for the morning, and one
// for before work. Older notes were just one line — that line counts as the headline.
function nightNote(date){
  const ns = morningNotesFor(date || todayStr()), out = {headline:'', morning:'', work:''};
  ns.forEach(function(n){
    if(n.headline || n.morning || n.work){ if(n.headline) out.headline = n.headline; if(n.morning) out.morning = n.morning; if(n.work) out.work = n.work; }
    else if(n.text) out.headline = out.headline ? out.headline+' · '+n.text : n.text;
  });
  return out;
}
// ---- 2 the alarm: Snooze / I'm up ----
function wakeRingHtml(){
  const w = wakeCfg();
  const playing = wakeUsesMusic(w) && !(wakeRing && wakeRing.mediaFailed);
  const q = quoteOfDay(), name = state.profile.name, nn = nightNote();
  return '<div class="wk2 wk3" data-sky="'+skyLook()+'">'+
    '<div class="wk2-aura"><i></i><i></i><i></i></div>'+
    '<div class="wk2-center">'+
      '<div class="wk2-greet">Good morning'+(name ? ', '+escapeHtml(name) : '')+(wakeRing && wakeRing.test ? ' <span class="tag">TEST</span>' : '')+'</div>'+
      '<div class="wk2-clock" id="wakeClock">'+new Date().toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'})+'</div>'+
      '<div class="wk3-date">'+new Date().toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'})+'</div>'+
      (nn.headline ? '<div class="wk3-head">'+escapeHtml(nn.headline)+'</div>' : '')+
      '<div class="wk3-quote">'+quoteHtml(q, 'is-ring')+'</div>'+
      '<div class="wk2-actions wk3-actions">'+
        '<button class="wk2-snooze" data-action="wakeSnooze">&#128164; Snooze '+(w.snoozeMinutes||9)+' min</button>'+
        '<button class="wk2-up" data-action="wakeStartDay"><span>&#9728;&#65039; I’m up</span></button>'+
      '</div>'+
      (wakeUsesMusic(w) ? '<div class="wk2-music'+(playing?' is-playing':'')+'">'+(playing ? '<span class="wk2-eq"><i></i><i></i><i></i><i></i></span>' : '')+
          '<span class="wk2-song">'+escapeHtml(mediaName(w.media))+'</span></div>' : '')+
    '</div>'+
  '</div>';
}
// ---- snooze: a calm screen that counts down to the next ring ----
function snoozeHtml(){
  const sn = state.focus.snooze, left = sn ? Math.max(0, sn.ts - Date.now()) : 0, nn = nightNote();
  return '<div class="snz">'+
    '<div class="snz-moon"></div>'+
    '<div class="snz-c">'+
      '<div class="snz-k">&#128164; Snoozing</div>'+
      '<div class="snz-left" id="snzLeft">'+formatElapsed(left)+'</div>'+
      '<div class="snz-sub">Ringing again at '+(sn ? fmtTimeShort(sn.ts) : '')+'</div>'+
      (nn.headline ? '<div class="snz-note">'+escapeHtml(nn.headline)+'</div>' : '')+
    '</div>'+
    '<div class="snz-acts"><button class="dawn-btn" data-action="snoozeUp">&#9728;&#65039; I’m up</button></div>'+
  '</div>';
}
function tickSnooze(){ const el = document.getElementById('snzLeft'), sn = state.focus.snooze; if(el && sn) el.textContent = formatElapsed(Math.max(0, sn.ts - Date.now())); }
ACTIONS.snoozeUp = function(){ state.focus.snooze = null; persist('focus'); wakeImUp(); };

// ---- 3 Good morning: everything on one screen ----
// last night, from going to sleep (Wind down → Go to sleep) to getting up
function lastNightSleep(){
  const h = state.modes.history.filter(function(m){ return m.sleep && m.endedAt && Date.now() - m.endedAt < 8*3600000 && m.minutes >= 60; }).sort(function(a, b){ return b.endedAt - a.endedAt; })[0];
  return h ? {minutes:h.minutes, from:h.startedAt, to:h.endedAt} : null;
}
function briefBase(){ return wakeCfg().intro!=='quick' ? 4800 : 1800; }
// your morning playlist (Apple Music), one click — and it can follow the wake-up song by itself
function morningPlaylist(){ const m = state.profile.morningPlaylist; return m && m.q ? m : null; }
function playlistBtnHtml(){
  const pl = morningPlaylist(), on = !!ui.plPlaying;
  return '<button class="plb'+(on?' is-on':'')+(pl?'':' is-unset')+'" data-action="'+(pl ? (on ? 'stopMorningPlaylist' : 'playMorningPlaylist') : 'setMorningPlaylist')+'" title="'+(pl ? (on ? 'Pause' : 'Play '+escapeHtml(pl.q)) : 'Pick a morning playlist')+'">'+
    '<span class="plb-i">'+(on ? '<span class="wk2-eq"><i></i><i></i><i></i><i></i></span>' : '&#9654;')+'</span><span class="plb-t">'+escapeHtml(pl ? pl.q : 'Morning playlist')+'</span></button>';
}
function plRefresh(){ if(overlayOpen('wakeOverlay')) renderWakeOverlayInto(); if(overlayOpen('planOverlay')) renderPlanRevealInto(); }
ACTIONS.stopMorningPlaylist = function(){ ui.plPlaying = false; musicApp('pause'); plRefresh(); };
// a playlist link (Apple Music → ••• → Share → Copy Link) or its name; a link is turned into the
// playlist's real name by the launcher, and kept so Apple Music can open it if it isn't in your library
async function setMorningPlaylistFrom(v){
  v = String(v||'').trim();
  if(!v){ state.profile.morningPlaylist = null; persist('profile'); return null; }
  let pl = {q:v, k:'playlist'};
  if(/^(https?|music|itms):\/\//i.test(v)){
    const url = v.replace(/^(music|itms):\/\//i, 'https://'), slug = appleMusicFromLink(url);
    pl = {q: slug && !/^pl\./i.test(slug.q) ? slug.q : 'Morning playlist', k:'playlist', url:url};
    const r = await fetchWithin(MUSIC_URL+'resolve?u='+hexUtf8(url), 12000);
    if(r && r.ok){ try{ const j = await r.json(); if(j && j.name) pl.q = j.name; }catch(e){} }
  }
  state.profile.morningPlaylist = pl; persist('profile');
  return pl;
}
ACTIONS.playMorningPlaylist = async function(){
  const pl = morningPlaylist(); if(!pl) return;
  ui.plPlaying = true; plRefresh();
  const r = await fetchWithin(MUSIC_URL+'pick?k=playlist&q='+hexUtf8(pl.q)+(pl.url ? '&u='+hexUtf8(pl.url) : ''), 12000);
  if(r && r.ok) return;
  ui.plPlaying = false; plRefresh();
  let j = null; try{ j = r ? await r.json() : null; }catch(e){}
  if(j && j.opened) showToast('“'+escapeHtml(pl.q)+'” isn’t in your library yet — it’s open in Apple Music now. Tap ＋ Add once, then it plays from here.', {icon:'&#9835;', duration:9000});
  else if(r) showToast('No playlist called “'+escapeHtml(pl.q)+'” in your library. Paste its link in Settings → Sound instead.', {icon:'&#9888;', duration:7000});
  else showToast('Apple Music plays through the Operator app — it isn’t reachable right now.', {icon:'&#9888;'});
};
ACTIONS.setMorningPlaylist = async function(){
  const v = window.prompt('Your morning playlist — paste its Apple Music link (••• → Share → Copy Link), or type its exact name:', ''); if(!v || !v.trim()) return;
  await setMorningPlaylistFrom(v);
  if(overlayOpen('wakeOverlay')) renderWakeOverlayInto(); if(overlayOpen('planOverlay')) renderPlanRevealInto();
  ACTIONS.playMorningPlaylist();
};
// you, lately: streak, training, weight, and something you wrote a while back
function briefMemory(){
  const today = todayStr(), es = arr(state.journal.entries).filter(function(e){ return e.text && e.date < addDays(today, -6); });
  if(!es.length) return null;
  const want = [365, 180, 90, 30, 14, 7];
  for(let i=0;i<want.length;i++){ const d = addDays(today, -want[i]), hit = es.find(function(e){ return e.date===d; }); if(hit) return {e:hit, ago:want[i]}; }
  const pinned = es.filter(function(e){ return e.pinned; }), pool = pinned.length ? pinned : es, e = pool[dayNum() % pool.length];
  return {e:e, ago:Math.round((Date.parse(today) - Date.parse(e.date))/86400000)};
}
function agoLabel(n){ return n>=365 ? 'A year ago' : n>=170 ? 'Six months ago' : n>=85 ? 'Three months ago' : n>=28 ? 'A month ago' : n>=14 ? 'Two weeks ago' : n+' days ago'; }
function briefYouHtml(){
  const streak = computeStreak(), wk = typeof workoutsThisWeek==='function' ? workoutsThisWeek() : 0, wp = typeof weightProgress==='function' ? weightProgress() : {};
  const tiles = [['&#128293;', streak, streak===1 ? 'day streak' : 'day streak'], ['&#127947;&#65039;', wk, 'workouts this week']];
  if(wp.latest!=null) tiles.push(['&#9878;&#65039;', wp.latest, wp.goal!=null ? 'lbs &middot; goal '+wp.goal : 'lbs']);
  const mem = briefMemory();
  const memHtml = mem ? '<div class="br-mem"><small>'+agoLabel(mem.ago)+' you wrote</small><p>'+(mem.e.title ? '<b>'+escapeHtml(mem.e.title)+'</b> ' : '')+escapeHtml(String(mem.e.text).slice(0, 140))+(String(mem.e.text).length > 140 ? '…' : '')+'</p></div>' : '';
  return {voice: mem ? 'And a little something from you, '+agoLabel(mem.ago).toLowerCase()+'.' : 'Here’s where you’re at.',
    html:'<div class="br-k">&#128100; You, Lately</div><div class="br-you-t">'+tiles.map(function(t){ return '<div><span>'+t[0]+'</span><b>'+t[1]+'</b><small>'+t[2]+'</small></div>'; }).join('')+'</div>'+memHtml};
}
function wakeBriefHtml(){
  const today = todayStr(), name = state.profile.name || '';
  const events = state.calendar.events.filter(function(e){ return e.date===today; }).sort(function(a, c){ return (a.time||'').localeCompare(c.time||''); });
  const nn = nightNote(today);
  const q = quoteOfDay();
  const news = ui.morningNews && ui.morningNews.date===today ? ui.morningNews.items : null;
  const now = typeof wxNow==='function' ? wxNow() : null, phase = skyPhase(), win = dayWindow();
  const timeStr = new Date().toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'});
  const mNow = new Date().getHours()*60 + new Date().getMinutes();
  const plan = typeof todaysPlan==='function' ? todaysPlan().filter(function(t){ return t.status!=='done'; }) : [];
  const vb = masterVisionBoard();
  // The page builds itself one piece at a time, with a line of narration typing above each piece
  // as it arrives. Delays are fixed when a piece first appears (re-renders keep the same node, so
  // nothing plays twice); skipping the intro shifts the whole schedule earlier.
  const cine = wakeCfg().intro!=='quick';
  const base = briefBase();
  const sunLine = mNow < win.rise ? 'The sun comes up at '+fmtMinOfDay(win.rise)+'.' : mNow < win.set ? 'The sun’s been up since '+fmtMinOfDay(win.rise)+'.' : '';
  const lines = [];
  // each piece waits until its line of narration has been said and had a moment to sink in
  let k = 0, tcur = base;
  const panel = function(cls, anim, voice, html, extraStyle, attrs){
    const d = tcur; k++;
    if(voice){ lines.push({at: d - 380, text: voice}); tcur += Math.max(1500, voice.split(' ').length*BRIEF_WORD_MS + 650); } else tcur += 800;
    return '<section class="br-p '+cls+' '+anim+'" data-k="'+(k-1)+'" style="--d:'+d+'ms'+(extraStyle||'')+'"'+(attrs||'')+'>'+html+'</section>';
  };
  const slept = lastNightSleep();
  // column 1: the weather and the sun (and how you slept), then your note
  const colA = [], colB = [], colC = [];
  colA.push(panel('br-hero', 'br-a-blur', 'It’s '+timeStr+'.'+(now ? ' '+now.temp+'° and '+wxLabel(now.code).toLowerCase()+' outside.' : '')+(slept ? ' You got '+fmtDurationLabel(slept.minutes)+' of sleep.' : sunLine ? ' '+sunLine : ''),
    '<div class="brh-top"><div class="brh-wx"><span class="brh-i">'+(now ? wxIcon(wxKind(now.code), phase) : SKY_META[phase].icon)+'</span>'+
      '<div>'+(now ? '<div class="brh-t">'+now.temp+'&deg;</div><div class="brh-l">'+escapeHtml(wxLabel(now.code))+(now.hi!=null ? ' <span>&middot; H '+now.hi+'&deg; L '+now.lo+'&deg;</span>' : '')+'</div>' : '<div class="brh-l is-big">'+SKY_META[phase].label+'</div>')+'</div></div>'+
      (slept ? '<div class="brh-sleep"><small>Slept</small><b>'+fmtDurationLabel(slept.minutes)+'</b><span>'+fmtTimeShort(slept.from)+' &rarr; '+fmtTimeShort(slept.to)+'</span></div>' : '')+'</div>'+
    '<div class="brh-sun">'+sunArcHtml({w:300, h:64, pad:8, r:4.5, animate:true})+
      '<div class="brh-sun-row"><span><small>Sunrise</small>'+fmtMinOfDay(win.rise)+'</span><span class="brh-day">'+daylightLabel()+'</span><span><small>Sunset</small>'+fmtMinOfDay(win.set)+'</span></div></div>'));
  if(nn.headline || nn.morning) colA.push(panel('br-lastnight', 'br-a-blur', 'You left yourself a note last night.', '<div class="br-k">&#127769; From Last Night</div>'+
    (nn.headline ? '<div class="br-ln-head">'+escapeHtml(nn.headline)+'</div>' : '')+(nn.morning ? '<div class="br-ln-text">'+escapeHtml(nn.morning)+'</div>' : '')));
  else if(vb && vb.elements.length) colA.push(panel('br-vision', 'br-a-scale', 'And this is what it’s all for.', boardStaticHtml(vb, 'wake-board'), '', ' data-action="wakeBoardToggle" title="Open your vision board"'));
  const you = briefYouHtml();
  if(you) colA.push(panel('br-you', 'br-a-rise', you.voice, you.html));
  // column 2: a line to carry, and a few small things for a good day
  colB.push(panel('br-quote', 'br-a-words', 'Something to carry with you.', '<div class="br-k">&#10024; For Today</div>'+quoteHtml(q, '', 'morning')));
  colB.push(panel('br-thoughts', 'br-a-rise', 'A few things for a good day.', '<div class="br-k">&#127807; For a Good Day</div>'+
    thoughtsOfDay(4).map(function(x, i){ return '<div class="br-th" style="--i:'+i+'"><span class="br-th-i">'+x[0]+'</span><div><b>'+x[1]+'</b><span>'+x[2]+'</span></div></div>'; }).join('')));
  // column 3: the world, then the day ahead
  if(news){
    const d0 = tcur, late = ui.briefNewsAt ? Math.max(600, d0 - (ui.briefNewsAt - (ui.briefT0||0))) : null;
    const sec = (ui.morningNews && ui.morningNews.sec) || {}, secs = newsSections().filter(function(x){ return sec[x.id]; });
    const item = function(n, i, top){ return '<button class="br-news-i'+(top?' is-top':'')+'" data-action="openNewsLink" data-url="'+escapeHtml(n.link)+'"><span>'+escapeHtml(n.title)+(n.src ? '<small>'+escapeHtml(n.src)+'</small>' : '')+'</span><i>&#8599;</i></button>'; };
    colC.push(panel('br-news', 'br-a-rise', secs.length ? 'Here’s what’s happening — the news, '+secs.map(function(x){ return x.label.toLowerCase(); }).join(' and ')+'.' : 'Here’s what’s happening out there.',
      '<div class="br-k">&#128240; '+(newsTopics() ? 'Your News' : 'Headlines')+'</div>'+
      news.slice(0, secs.length ? 3 : 6).map(function(n, i){ return item(n, i, i===0); }).join('')+
      secs.map(function(x){ return '<div class="br-news-sec"><div class="br-news-h">'+x.icon+' '+x.label+'<span>'+escapeHtml(x.q)+'</span></div>'+sec[x.id].slice(0, 3).map(function(n, i){ return item(n, i, false); }).join('')+'</div>'; }).join(''),
      late!=null ? ';--late:'+late+'ms' : ''));
  } else if(morningNewsOn() && ui.morningNews && ui.morningNews.loading){
    colC.push('<section class="br-p br-news is-loading br-a-fade" style="--d:'+tcur+'ms"><div class="br-k">&#128240; The News</div><div class="br-news-wait"><i></i><i></i><i></i></div></section>');
  }
  // the day ahead — just the calendar; the work plan waits for the business preview
  colB.push(panel('br-day', 'br-a-right', events.length ? (events.length===1 ? 'One thing on the calendar later.' : events.length+' things on the calendar later.') : 'Nothing on the calendar. The day’s yours.',
    '<div class="br-k">&#128197; Today</div>'+
    (events.length ? '<div class="br-agenda">'+events.slice(0, 3).map(function(e){ return '<div><b>'+(e.time ? fmt12Hour(e.time) : 'All day')+'</b>'+escapeHtml(e.title)+'</div>'; }).join('')+'</div>' : '<div class="br-day-plan">Nothing scheduled. Enjoy the morning.</div>')));
  const ctaD = tcur;
  lines.push({at: ctaD - 380, text: 'Get ready to start your day.'});
  ui.briefLines = lines;
  const shift = ui.briefShift || 0;
  const w = wakeCfg(), song = (wakeFinishing || wakeAudio || wakeMusicApp) && w.media ? mediaName(w.media) : '';
  return '<div class="brief brief2 brief3 brief4 bg-'+(wakeCfg().briefBg==='dark' ? 'dark' : 'sunrise')+(ui.wakeBoardBig?' board-open':'')+(ui.wakeIntroDone?' intro-skipped':'')+(ui.briefSkipped?' is-skipped':'')+'" data-sky="'+phase+'" style="--shift:'+shift+'ms">'+
    (cine
      ? '<div class="brief-intro is-cinematic" data-action="wakeIntroSkip" title="Click to skip"><div class="bi-glow"></div>'+
          '<div class="bi-time">'+timeStr+'</div>'+
          '<div class="bi-word">Good morning</div>'+(name ? '<div class="bi-name">'+escapeHtml(name)+'</div>' : '')+
          '<div class="bi-line">'+new Date().toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'})+'</div></div>'
      : '<div class="brief-intro" data-action="wakeIntroSkip" title="Click to skip"><div class="bi-glow"></div><div class="bi-word">Good morning</div>'+(name ? '<div class="bi-name">'+escapeHtml(name)+'</div>' : '')+'</div>')+
    '<div class="brief-grid-bg"></div>'+
    '<div class="brief-inner b4">'+
      '<div class="brief-top br-p br-a-fade" style="--d:'+(base-1300)+'ms"><span class="brief-brand">OPERATOR</span><span class="brief-dot"></span><span>'+new Date().toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'})+'</span>'+
        '<span class="b4-music">'+(song ? '<span class="b4-song"><span class="wk2-eq"><i></i><i></i><i></i><i></i></span>'+escapeHtml(song)+'<button class="b4-stop" data-action="wakeStopMusic" title="Stop">&#9632;</button></span>' : playlistBtnHtml())+'</span>'+
        // one button: Skip takes you straight to the app
        '<button class="brief-skipall" data-action="briefSkip" title="Skip to the app">Skip &#9197;</button></div>'+
      '<h1 class="brief-hello br-p br-a-blur" style="--d:'+(base-1000)+'ms">Good morning'+(name ? ', <span>'+escapeHtml(name)+'</span>' : '')+'.</h1>'+
      '<div class="br-voice br-p br-a-fade" style="--d:'+(base-700)+'ms"><span class="br-voice-dot"></span><span id="brVoice"></span><span class="br-caret"></span></div>'+
      // no news column (headlines off) → two columns that fill the width instead of an empty third
      '<div class="b4-grid'+(colC.length ? '' : ' cols-2')+'"><div class="b4-col">'+colA.join('')+'</div><div class="b4-col">'+colB.join('')+'</div>'+(colC.length ? '<div class="b4-col">'+colC.join('')+'</div>' : '')+'</div>'+
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
const BRIEF_WORD_MS = 190; // a comfortable read: each line finishes before the next piece arrives
function briefBuilt(){ const l = ui.briefLines || []; return !!l.length && Date.now() - (ui.briefT0||0) > l[l.length-1].at + 2000; }
function briefVoiceRun(){
  clearInterval(briefVoiceTimer);
  briefVoiceTimer = setInterval(function(){
    const el = document.getElementById('brVoice');
    if(!el || ui.wakeMode!=='brief' || !overlayOpen('wakeOverlay')){ if(!overlayOpen('wakeOverlay')) clearInterval(briefVoiceTimer); return; }
    const lines = ui.briefLines || [], t = Date.now() - (ui.briefT0||0);
    let cur = null; lines.forEach(function(l){ if(t >= l.at) cur = l; });
    if(ui.briefSkipped && lines.length) cur = lines[lines.length-1];
    // a word at a time, at a calm reading pace (it used to type letter by letter, too fast)
    const words = cur ? cur.text.split(' ') : [];
    const txt = cur ? (ui.briefSkipped ? cur.text : words.slice(0, Math.max(0, Math.floor((t - cur.at)/BRIEF_WORD_MS) + 1)).join(' ')) : '';
    if(el.textContent!==txt) el.textContent = txt;
    const wrap = el.parentNode; if(wrap) wrap.classList.toggle('is-typing', !!cur && txt.length < cur.text.length);
    // as the narration reaches each piece, bring it into view if it's below the fold
    const idx = cur ? lines.indexOf(cur) : -1;
    if(idx>0 && idx!==ui.briefLineSeen && !ui.briefSkipped){
      ui.briefLineSeen = idx;
      const target = document.querySelector('#wakeContent .br-p[data-k="'+idx+'"]');
      if(target) setTimeout(function(){ target.scrollIntoView({block:'nearest', behavior:'smooth'}); }, 400);
    }
  }, 120);
}
// shows the whole page at once (no narration build-up) — used by tests
function briefRevealAll(){ ui.wakeIntroDone = true; ui.briefSkipped = true; renderWakeOverlayInto(); }
// a click anywhere on the page (not on a button) brings the next piece in right away
function briefAdvance(){
  const lines = ui.briefLines || [], t = Date.now() - (ui.briefT0||0);
  const next = lines.find(function(l){ return l.at > t; });
  if(!next){ return; }
  const shift = next.at - t;
  ui.briefT0 = (ui.briefT0||Date.now()) - shift; ui.briefShift = (ui.briefShift||0) + shift; ui.wakeIntroDone = true;
  renderWakeOverlayInto();
}
document.addEventListener('click', function(e){
  if(ui.wakeMode!=='brief' || !overlayOpen('wakeOverlay')) return;
  const b = e.target.closest && e.target.closest('#wakeContent .brief4'); if(!b) return;
  // the Start button can't be pressed before it has appeared (a click there was starting the morning blind)
  const piece = e.target.closest('.brief-cta');
  const hidden = piece && parseFloat(getComputedStyle(piece).opacity) < 0.08;
  if(hidden){ e.preventDefault(); e.stopImmediatePropagation(); briefAdvance(); return; }
  if(e.target.closest('button, a, input, [data-action]')) return;
  briefAdvance();
}, true);
// Skip: the page lifts away and you're on the front page
ACTIONS.briefSkip = function(){
  ui.wakeIntroDone = true; ui.briefSkipped = true;
  ui.view = 'today'; renderView();
  wakeLiftAway(function(){ if(ui.wakeMode==='brief') endBriefing(); });
};

// ---- 5 Start work: the work intro, then straight into Lock in ----
function clockIn(opts){
  opts = opts || {};
  const m = state.modes.active;
  if(m && (m.morning || (m.type==='offtime' && !m.sleep))) finishActiveMode(true);
  if(typeof applyNightPlanAuto==='function') applyNightPlanAuto();
  ui.view = 'today'; renderView();
  ui.planReveal = {at:Date.now()};
  showOverlay('planOverlay'); renderPlanRevealInto();
  if(!opts.quiet) playWorkIntro();
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
  ].concat(workSocialStats());
}
// followers and new messages, when GoHighLevel is connected (otherwise they simply don't show)
function workSocialStats(){
  const out = [];
  try{
    const sd = typeof socialData==='function' ? socialData() : null;
    const f = sd && sd.platformTotals && sd.platformTotals.followers;
    if(f && Object.keys(f).length){
      let total = 0, gain = 0;
      Object.keys(f).forEach(function(k){ const x = f[k]||{}, ser = arr(x.series).map(Number); total += Number(x.total)||0; if(ser.length>1) gain += ser[ser.length-1] - ser[0]; });
      out.push({k:'Followers', v:total.toLocaleString(), sub:(gain>=0 ? '+' : '')+gain.toLocaleString()+' this week'});
    }
    if(typeof ghlCfg==='function' && ghlCfg().connected){ const n = inboxUnread(); out.push({k:'New messages', v:String(n), sub:n ? 'Waiting in Social' : 'Inbox clear', go:'goToConvos'}); }
  }catch(e){}
  return out;
}
// each active client's health at a glance
function workClientsHtml(){
  const cs = arr(state.business.clients).filter(function(c){ return clientStageActive(c.stage); });
  if(!cs.length) return '';
  const rank = {red:0, yellow:1, green:2};
  const rows = cs.map(function(c){ return {c:c, h:clientHealthStatus(c)}; }).sort(function(a, b){ return rank[a.h.level] - rank[b.h.level]; }).slice(0, 6);
  return '<div class="wi-clients"><div class="wi-sec">Clients <span>'+cs.length+' active</span></div><div class="wi-cl-grid">'+rows.map(function(r){
    const word = r.h.level==='red' ? 'Needs you' : r.h.level==='yellow' ? 'Keep an eye' : 'Healthy';
    return '<button class="wi-cl is-'+r.h.level+'" data-action="openContact" data-kind="client" data-id="'+r.c.id+'"><i></i><b>'+escapeHtml(crmName('client', r.c))+'</b><span>'+word+'</span></button>';
  }).join('')+'</div></div>';
}
// the last seven days of deep work, today on the right
function workWeekHtml(target){
  const today = todayStr(), days = [];
  for(let i=6;i>=0;i--){ const dd = addDays(today, -i); days.push({d:dd, m: i===0 ? deepWorkMinutesTodayLive() : deepWorkMinutesFor(dd)}); }
  const total = days.reduce(function(a, x){ return a + x.m; }, 0), top = Math.max(target, ...days.map(function(x){ return x.m; }), 1);
  const hit = days.filter(function(x){ return x.m >= target; }).length;
  return '<div class="wi-week"><div class="wi-sec">Your week <span>'+fmtHours(total)+' &middot; '+hit+'/7 days on target</span></div>'+
    '<div class="wi-wk-bars"><i class="wi-wk-goal" style="bottom:'+Math.min(96, target/top*100).toFixed(1)+'%" title="Daily target: '+fmtHours(target)+'"></i>'+days.map(function(x){
      return '<div class="wi-wk'+(x.d===today?' is-today':'')+(x.m>=target?' is-hit':'')+'" title="'+weekdayShort(x.d)+': '+fmtDurationLabel(x.m)+'"><u style="height:'+Math.max(3, x.m/top*100).toFixed(1)+'%"></u><span>'+weekdayShort(x.d).slice(0,1)+'</span></div>';
    }).join('')+'</div></div>';
}
function renderPlanReveal(){
  if(!ui.planReveal) return '';
  const plan = todaysPlan().filter(function(t){ return t.status!=='done'; }).slice(0, 6), first = plan[0];
  const today = todayStr(), name = state.profile.name || '';
  const events = state.calendar.events.filter(function(e){ return e.date===today && e.time; }).sort(function(a, c){ return (a.time||'').localeCompare(c.time||''); });
  const q = workQuoteOfDay();
  const stats = workStats();
  const target = state.standards.deepWorkTargetMinutes || 180;
  // quick and calm: everything is in within about a second
  let d = 220;
  const at = function(step){ const v = d; d += Math.round((step||260)/3); return 'animation-delay:'+v+'ms'; };
  return '<div class="wi">'+
    '<div class="wi-top"><span class="pr-badge">&#128339; Clocked In</span><span class="pr-time">'+new Date().toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'})+'</span>'+
      '<span class="wi-pl">'+playlistBtnHtml()+'</span>'+
      '<button class="wd-close" data-action="closePlanReveal" title="Close">&#10005;</button></div>'+
    '<div class="wi-inner">'+
      '<div class="wi-k" style="animation-delay:40ms">Work Mode</div>'+
      '<h1 class="wi-h" style="animation-delay:100ms">Let’s get to work'+(name ? ', <span>'+escapeHtml(name)+'</span>' : '')+'.</h1>'+
      '<div class="wi-stats n'+stats.length+'">'+stats.map(function(s){ return '<div class="wi-stat"'+(s.go ? ' data-action="'+s.go+'"' : '')+' style="'+at(140)+'"><div class="wi-stat-k">'+s.k+'</div><div class="wi-stat-v">'+s.v+'</div>'+(s.pct!=null ? '<div class="wi-bar"><i style="width:'+s.pct.toFixed(1)+'%"></i></div>' : '')+'<div class="wi-stat-s">'+escapeHtml(s.sub)+'</div></div>'; }).join('')+'</div>'+
      '<div class="wi-cols">'+
        '<div class="wi-col">'+
          '<div class="wi-plan" style="'+at(300)+'"><div class="wi-sec">Plan of Attack <span>'+(plan.length ? plan.length+(plan.length===1?' thing':' things')+' &middot; ' : '')+'aim for '+fmtHours(target)+'</span></div>'+
            (plan.length ? '<ol class="pr-list">'+plan.map(function(t, i){ return '<li class="pr-row'+(i===0?' is-first':'')+'" style="animation-delay:'+(d + i*60)+'ms"><span class="wd-num">'+String(i+1).padStart(2,'0')+'</span>'+priorityTag(t.priority)+'<span class="pr-t">'+escapeHtml(t.title)+'</span>'+(t.deadline===today ? '<span class="pr-due">Due today</span>' : '')+'</li>'; }).join('')+'</ol>'
              : '<div class="wd-empty">Nothing planned yet. Pick your first move in Lock in.</div>')+
            (events.length ? '<div class="wi-cal">'+events.slice(0, 3).map(function(e){ return '<span><b>'+fmt12Hour(e.time)+'</b>'+escapeHtml(e.title)+'</span>'; }).join('')+'</div>' : '')+
          '</div>'+
          workClientsHtml()+
        '</div>'+
        '<div class="wi-col wi-right" style="'+at(300)+'">'+(nightNote().work ? '<div class="wi-note"><span>&#127769; You told yourself</span><p>'+escapeHtml(nightNote().work)+'</p></div>' : '')+
          '<div class="wi-side">'+quoteHtml(q, 'is-work', 'work')+'</div>'+
          workWeekHtml(target)+
          '<div class="wi-act">'+quoteHtml(quoteFor('action'), 'is-act', 'action')+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="pr-cta" style="animation-delay:420ms">'+
        '<button class="ls-go pr-go" data-action="planLockIn"'+(first ? ' data-id="'+first.id+'"' : '')+'><span class="ls-go-ring"></span><span class="ls-go-i">&#128274;</span><b>LOCK IN</b></button>'+
        (first ? '<div class="ls-go-sub">First up: '+escapeHtml(first.title)+'</div>' : '')+
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
  d.innerHTML = '<div class="lf-ring"></div><div class="lf-k">&#127937; Clocked Out</div><div class="lf-t">'+fmtHours(deepWorkMinutesTodayLive())+' of deep work today'+(typeof isWorkDay==='function' && !isWorkDay(addDays(todayStr(), 1)) ? ' &middot; day off tomorrow' : '')+'</div>';
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
