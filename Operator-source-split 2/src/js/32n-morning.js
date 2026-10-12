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
  ['Ask, and it shall be given you; seek, and ye shall find; knock, and it shall be opened unto you.', 'Jesus, Matthew 7:7'],
  ['Do not worry about tomorrow, for tomorrow will worry about itself.', 'Jesus, Matthew 6:34'],
  ['Let your light shine before others.', 'Jesus, Matthew 5:16'],
  ['With God all things are possible.', 'Jesus, Matthew 19:26'],
  ['Get busy living, or get busy dying.', 'Stephen King'],
  ['Don’t quit. Suffer now and live the rest of your life as a champion.', 'Muhammad Ali'],
  ['Dedication sees dreams come true.', 'Kobe Bryant'],
  ['Dreams without goals are just dreams.', 'Denzel Washington'],
  ['I didn’t come this far to only come this far.', 'Tom Brady'],
  ['Whether you think you can, or you think you can’t: you’re right.', 'Henry Ford'],
  ['Stay hungry, stay foolish.', 'Steve Jobs'],
  ['At dawn, when you have trouble getting out of bed, tell yourself: “I have to go to work. As a human being.”', 'Marcus Aurelius'],
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
  ['Everything negative (pressure, challenges) is all an opportunity for me to rise.', 'Kobe Bryant'],
  ['You are in danger of living a life so comfortable and soft that you will die without ever realizing your true potential.', 'David Goggins'],
  ['Discipline equals freedom.', 'Jocko Willink'],
  ['Hard choices, easy life. Easy choices, hard life.', 'Jerzy Gregorek'],
  ['Inspiration is for amateurs: the rest of us just show up and get to work.', 'Chuck Close'],
  ['What you do every day matters more than what you do once in a while.', 'Gretchen Rubin'],
  ['Keep hammering.', 'Cameron Hanes'],
  ['The best time to plant a tree was twenty years ago. The second best time is now.', 'Proverb'],
  ['You don’t need a perfect day. You need a good first hour.', ''],
  ['The version of you that you want to be is built in mornings like this one.', ''],
  ['Morning is when I am awake and there is a dawn in me.', 'Henry David Thoreau'],
  ['Lose an hour in the morning, and you will spend all day looking for it.', 'Richard Whately'],
  ['Make each day your masterpiece.', 'John Wooden'],
  ['Don’t let what you cannot do interfere with what you can do.', 'John Wooden'],
  ['You do not rise to the level of your goals. You fall to the level of your systems.', 'James Clear'],
  ['Every action you take is a vote for the type of person you wish to become.', 'James Clear'],
  ['The days are long but the decades are short.', 'Sam Altman'],
  ['Hard work beats talent when talent doesn’t work hard.', 'Tim Notke'],
  ['You miss 100% of the shots you don’t take.', 'Wayne Gretzky'],
  ['I’ve failed over and over and over again in my life. And that is why I succeed.', 'Michael Jordan'],
  ['It ain’t about how hard you hit. It’s about how hard you can get hit and keep moving forward.', 'Rocky Balboa'],
  ['Small deeds done are better than great deeds planned.', 'Peter Marshall'],
  ['Talent is cheaper than table salt. What separates the talented individual from the successful one is a lot of hard work.', 'Stephen King'],
  ['The morning is wiser than the evening.', 'Russian proverb'],
  ['Nobody is coming. It’s you, today, again.', ''],
  ['Slow is fine. Stopped is the only thing that isn’t.', '']
];
const WORK_QUOTES = [
  ['The work works on you more than you work on the work.', 'Alex Hormozi'],
  ['Stay hungry, stay foolish.', 'Steve Jobs'],
  ['Quality is more important than quantity. One home run is much better than two doubles.', 'Steve Jobs'],
  ['Modern problems require modern solutions.', 'Dave Chappelle'],
  ['Talent wins games, but teamwork and intelligence win championships.', 'Michael Jordan'],
  ['When something is important enough, you do it even if the odds are not in your favor.', 'Elon Musk'],
  ['Work like there is someone working 24 hours a day to take it all away from you.', 'Mark Cuban'],
  ['If you never want to be criticized, for goodness’ sake don’t do anything new.', 'Jeff Bezos'],
  ['The cowards never started and the weak died along the way. That leaves us.', 'Phil Knight'],
  ['I’m not a businessman, I’m a business, man.', 'Jay-Z'],
  ['Who’s gonna carry the boats?', 'David Goggins'],
  ['Escape competition through authenticity.', 'Naval Ravikant'],
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
  ['Some people want it to happen, some wish it would happen, others make it happen.', 'Michael Jordan'],
  ['I can’t relate to lazy people. We don’t speak the same language.', 'Kobe Bryant'],
  ['I like criticism. It makes you strong.', 'LeBron James'],
  ['Get busy living, or get busy dying.', 'Stephen King'],
  ['Volume negates luck.', 'Alex Hormozi'],
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
  const tmp = document.createElement('div'); tmp.innerHTML = quoteHtml(quoteFor(kind), el.dataset.cls||'', kind); const n = tmp.firstChild; n.classList.add('qt-swap'); el.replaceWith(n); }); if(typeof briefFit==='function') requestAnimationFrame(function(){ briefFit(); }); }
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
  ['&#10024;', 'Romanticize it.', 'The coffee, the light, the walk. This is your life: enjoy it.'],
  ['&#128591;', 'Name one thing you’re grateful for.', 'Say it out loud.'],
  ['&#128075;', 'Text someone you love good morning.', 'Takes ten seconds, makes their day.'],
  ['&#127788;&#65039;', 'Five slow breaths.', 'Before you look at a screen.'],
  ['&#128719;', 'Make your bed.', 'First win of the day.'],
  ['&#9729;&#65039;', 'Look at the sky for a minute.', 'Whatever it’s doing today.'],
  ['&#127939;', 'Move a little.', 'A stretch, a walk, a few push-ups. Wake the body up.'],
  ['&#128588;', 'You don’t have to rush.', 'A calm morning makes a sharp afternoon.'],
  ['&#129388;', 'Make a green juice.', 'Greens before anything that comes in a wrapper.'],
  ['&#128214;', 'Read ten pages.', 'Before anything with a feed.'],
  ['&#129496;', 'Do nothing for ten minutes.', 'No phone, no music. Let your head settle before you fill it.'],
  ['&#128296;', 'Stop picturing it. Build it.', 'The life you keep imagining gets made in today’s hours.'],
  ['&#128509;', 'Go somewhere you haven’t been.', 'A new street, a new park, a coffee spot you’ve walked past. Explore.'],
  ['&#9728;&#65039;', 'Get the light on your face.', 'Ten minutes outside beats another coffee.']
];
// "For a Good Day": a reel that rolls through the morning — what you're eating, a walk somewhere you
// like, and the small things — a different set each day
function goodDayItems(){
  const out = [], w = wakeCfg(), lib = arr(state.meals && state.meals.library);
  const go = lib.slice().sort(function(a, b){ return (b.uses||0) - (a.uses||0); }).slice(0, 3).map(function(m){ return m.name; }).filter(Boolean);
  out.push(['&#129367;', 'Know what you’re eating today.', go.length ? 'Your go-tos: '+go.join(', ')+(state.profile.calorieTarget ? ' · '+Number(state.profile.calorieTarget).toLocaleString()+' cal' : '')+'. Decide now, not when you’re starving.' : 'Breakfast, lunch, dinner. Decided before you’re hungry.']);
  const places = String(w.places||'').split(',').map(function(x){ return x.trim(); }).filter(Boolean);
  if(places.length) out.push(['&#127795;', 'Walk to '+places[dayNum() % places.length]+'.', 'No phone. Just the walk there and back.']);
  const len = MORNING_THOUGHTS.length, d = dayNum();
  for(let i=0; out.length < 9 && i < len; i++){
    const t = MORNING_THOUGHTS[(d*5 + i*7) % len];
    if(out.every(function(x){ return x[1]!==t[1]; }) && !/eat today/.test(t[1])) out.push(t);
  }
  return out;
}
function goodDayReelHtml(){
  const items = goodDayItems(), n = items.length, i = (ui.gdIdx||0) % n;
  // (a list that rolls on to the next one every ten seconds — or move it by hand)
  const row = function(x){ return '<div class="br-th gd-i"><span class="br-th-i">'+x[0]+'</span><div><b>'+x[1]+'</b><span>'+x[2]+'</span></div></div>'; };
  return '<div class="gd-reel" data-n="'+n+'"><div class="gd-track" style="--i:'+i+'">'+items.concat(items).map(row).join('')+'</div></div>'+
    '<div class="gd-nav"><button class="rl-arr" data-action="gdStep" data-id="-1" title="Back">&#8249;</button><div class="gd-dots">'+items.map(function(_, k){ return '<i class="'+(k===i ? 'on' : '')+'" data-action="gdGo" data-id="'+k+'"></i>'; }).join('')+'</div><button class="rl-arr" data-action="gdStep" data-id="1" title="Next">&#8250;</button></div>';
}
// move the reel to row i (wrapping both ways); a manual move holds the auto-roll for a bit
function gdShow(i, manual){
  const tr = document.querySelector('#wakeContent .gd-track'); if(!tr) return;
  const n = goodDayItems().length, from = ui.gdIdx||0;
  if(manual) ui.gdHold = Date.now();
  // (the list is there twice, so however tall the panel is, the end never shows an empty gap; past the
  // first copy it quietly jumps back to the same spot in the first)
  if(i < 0){ tr.classList.add('no-anim'); gdPlace(tr, n); void tr.offsetWidth; tr.classList.remove('no-anim'); i = n - 1; }
  if(i > n){ const at = ((from % n) + n) % n; tr.classList.add('no-anim'); gdPlace(tr, at); void tr.offsetWidth; tr.classList.remove('no-anim'); i = at + 1; }
  ui.gdIdx = i;
  tr.classList.remove('no-anim'); gdPlace(tr, i);
  document.querySelectorAll('#wakeContent .gd-dots i').forEach(function(d, k){ d.classList.toggle('on', k===i % n); });
  if(i >= n) setTimeout(function(){ if(ui.gdIdx!==i) return; ui.gdIdx = 0; tr.classList.add('no-anim'); gdPlace(tr, 0); void tr.offsetWidth; tr.classList.remove('no-anim'); }, 900);
  return from;
}
// rows are as tall as their words (no "…"): the reel slides to wherever row i starts
function gdPlace(tr, i){ const row = tr.children[i]; tr.style.transform = 'translateY('+(row ? -row.offsetTop : 0)+'px)'; }
ACTIONS.gdStep = function(el, e, id){ gdShow((ui.gdIdx||0) + Number(id||1), true); playTick(); };
ACTIONS.gdGo = function(el, e, id){ gdShow(Number(id)||0, true); playTick(); };
// a swipe on the trackpad (or the wheel, or a drag) moves it too
let gdWheelAt = 0;
document.addEventListener('wheel', function(e){
  const r = e.target && e.target.closest && e.target.closest('#wakeContent .gd-reel, #wakeContent .bi-reel'); if(!r) return;
  e.preventDefault();
  const d = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX; if(Math.abs(d) < 12 || Date.now() - gdWheelAt < 450) return;
  gdWheelAt = Date.now();
  if(r.classList.contains('gd-reel')) gdShow((ui.gdIdx||0) + (d > 0 ? 1 : -1), true); else ACTIONS.biStep(null, null, d > 0 ? 1 : -1);
}, {passive:false});
let gdDrag = null;
document.addEventListener('pointerdown', function(e){ const r = e.target && e.target.closest && e.target.closest('#wakeContent .gd-reel, #wakeContent .bi-reel'); gdDrag = r ? {r:r, x:e.clientX, y:e.clientY} : null; });
document.addEventListener('pointerup', function(e){
  if(!gdDrag) return; const g = gdDrag; gdDrag = null;
  const dx = e.clientX - g.x, dy = e.clientY - g.y, d = Math.abs(dy) > Math.abs(dx) ? -dy : -dx; if(Math.abs(d) < 30) return;
  if(g.r.classList.contains('gd-reel')) gdShow((ui.gdIdx||0) + (d > 0 ? 1 : -1), true); else ACTIONS.biStep(null, null, d > 0 ? 1 : -1);
});
// it rolls on by itself every few seconds while Good morning is up
setInterval(function(){
  if(ui.wakeMode!=='brief' || typeof overlayOpen!=='function' || !overlayOpen('wakeOverlay')) return;
  if(ui.gdHold && Date.now() - ui.gdHold < 15000) return;
  gdShow((ui.gdIdx||0) + 1);
}, 10000);
function dayNum(){ const d = new Date(), start = new Date(d.getFullYear(), 0, 0); return Math.floor((d - start)/86400000); }
function quoteOfDay(){ return quoteFor('morning'); }
function workQuoteOfDay(){ return quoteFor('work'); }
function thoughtsOfDay(n){ const out = [], len = MORNING_THOUGHTS.length, d = dayNum(); for(let i=0;i<(n||3);i++) out.push(MORNING_THOUGHTS[(d*3 + i*5) % len]); return out.filter(function(x, i, a){ return a.indexOf(x)===i; }); }
function quoteLenCls(t){ const n = String(t||'').length; return n < 55 ? ' q-short' : n > 120 ? ' q-long' : ''; }
function quoteHtml(q, cls, kind){ return '<figure class="qt '+(cls||'')+quoteLenCls(q[0])+'"'+(kind ? ' data-q="'+kind+'" data-cls="'+(cls||'')+'"' : '')+'><span class="qt-mark">&ldquo;</span>'+(kind ? '<button class="qt-next" data-action="nextQuote" data-id="'+kind+'" title="Another one">&#8635;</button>' : '')+'<blockquote>'+escapeHtml(q[0])+'</blockquote>'+(q[1] ? '<figcaption><span class="qt-rule"></span>'+escapeHtml(q[1])+'</figcaption>' : '')+'</figure>'; }

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
  return Array.prototype.slice.call(xml.querySelectorAll('item')).slice(0, 8).map(function(it){
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
    const res = await fetchWithin(WAKE_HELPER+'news'+(topics ? '?q='+hexUtf8(topics) : '?t=top'), 9000);
    if(res && res.ok) items = parseRss(await res.text());
  }catch(e){}
  if(!items || !items.length){
    // an Operator still running last version's launcher has no /news — read the feed another way
    try{
      const feed = topics ? 'https://news.google.com/rss/search?q='+encodeURIComponent(topicsQuery(topics))+'&hl=en-US&gl=US&ceid=US:en' : 'https://news.google.com/rss?hl=en-US&gl=US&ceid=US:en';
      const res = await fetchWithin('https://api.rss2json.com/v1/api.json?rss_url='+encodeURIComponent(feed), 8000);
      if(res && res.ok){ const j = await res.json(); items = arr(j && j.items).slice(0, 8).map(function(x){ return splitSource({title:String(x.title||'').trim(), link:String(x.link||''), src:''}); }).filter(function(x){ return x.title; }); }
    }catch(e){}
  }
  return items && items.length ? items : null;
}
// local news: from where the weather is (Settings → Display) — the town's name, looked up once if all
// that's saved is "My location"
async function localPlace(){
  const w = typeof weatherCfg==='function' ? weatherCfg() : {};
  if(w.newsLocal===false || !(w.lat!=null && w.lon!=null)) return '';
  if(w.city && w.cityFor===w.lat+','+w.lon) return w.city;
  const named = String(w.place||'').trim();
  if(named && named!=='My location'){ return named.split(',')[0].trim(); }
  try{
    const r = await fetchWithin('https://api.bigdatacloud.net/data/reverse-geocode-client?latitude='+w.lat+'&longitude='+w.lon+'&localityLanguage=en', 6000);
    if(r && r.ok){ const j = await r.json(), c = j.city || j.locality || ''; if(c){ const cfg = ensureWeatherCfg(); cfg.city = c; cfg.cityFor = w.lat+','+w.lon; persist('settings'); return c; } }
  }catch(e){}
  return '';
}
async function fetchLocalNews(){ const c = await localPlace(); if(!c) return null; const items = await fetchNews(c); return items ? {place:c, items:items} : null; }
function newsMuteWords(){ const w = wakeCfg().newsMute; return String(w==null ? 'Wyoming' : w).split(',').map(function(x){ return x.trim().toLowerCase(); }).filter(Boolean); }
// (returns a promise the voice can wait on when you ask for the news)
function loadMorningNews(force){
  if(!morningNewsOn() && !force) return Promise.resolve(null);
  const today = todayStr();
  if(ui.morningNews && ui.morningNews.date===today && ui.morningNews.loading) return ui._newsP || Promise.resolve(null);
  // (the news is fetched once a day; the scores keep their own clock — a failed try is tried again)
  if(typeof loadScores==='function' && newsSections().some(function(x){ return x.id==='sports'; })) loadScores();
  if(ui.morningNews && ui.morningNews.date===today && ui.morningNews.items) return Promise.resolve(ui.morningNews);
  ui._newsP = loadMorningNewsNow(); return ui._newsP;
}
async function loadMorningNewsNow(){
  if(typeof loadScores==='function' && newsSections().some(function(x){ return x.id==='sports'; })) loadScores();
  const today = todayStr();
  ui.morningNews = {date:today, loading:true, items:null, sec:{}};
  const secs = newsSections();
  const all = await Promise.all([fetchNews(newsTopics()), fetchLocalNews()].concat(secs.map(function(x){ return fetchNews(x.q); })));
  const items = all[0], local = all[1], seen = {}, sec = {};
  all.splice(1, 1);
  arr(items).forEach(function(n){ seen[n.title] = 1; });
  secs.forEach(function(x, i){ const list = arr(all[i+1]).filter(function(n){ if(seen[n.title]) return false; seen[n.title] = 1; return true; }); if(list.length) sec[x.id] = list; });
  // (anything you've hidden — Settings → Morning & Alarms → Hide news about — never shows)
  const mute = newsMuteWords(), keep = function(n){ const t = (n.title+' '+(n.src||'')).toLowerCase(); return !mute.some(function(w){ return t.indexOf(w) >= 0; }); };
  if(items) items.splice(0, items.length, ...items.filter(keep));
  Object.keys(sec).forEach(function(k){ sec[k] = sec[k].filter(keep); if(!sec[k].length) delete sec[k]; });
  if(local) local.items = arr(local.items).filter(keep);
  if(local) sec.local = arr(local.items).filter(function(n){ if(seen[n.title]) return false; seen[n.title] = 1; return true; }).map(function(n){ n.local = local.place; return n; });
  ui.morningNews = {date:today, loading:false, items:items, sec:sec};
  if(ui.morningNews.items && ui.wakeMode==='brief' && overlayOpen('wakeOverlay')){
    // it arrived after the page started building: give it its moment instead of popping in
    ui.briefNewsAt = Date.now();
    renderWakeOverlayInto();
  }
  return ui.morningNews;
}
// the headlines panel: top stories with tech woven in (two of the news, then one of tech)
// (and local woven in near the top: the first local story is third, then one every few)
function mixHeadlines(top, tech, local){
  const out = [], a = arr(top).slice(), b = arr(tech).slice(), c = arr(local).slice();
  while(out.length < 10 && (a.length || b.length || c.length)){
    if(a.length) out.push({n:a.shift()}); if(a.length && out.length < 10) out.push({n:a.shift()});
    if(c.length && out.length < 10) out.push({n:c.shift(), local:true});
    if(b.length && out.length < 10) out.push({n:b.shift(), tech:true});
  }
  return out;
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

// which morning's note the morning screens show: this morning's — except on a test run, or later in
// the day once you've already written the next one (then you see what you just wrote, not last night's)
function briefNoteDate(){
  const today = todayStr(), t = morningNoteTarget();
  if(t!==today && ((typeof ui!=='undefined' && ui.wakeBriefTest) || new Date().getHours() >= 12) && morningNotesFor(t).length) return t;
  return today;
}
// ---- the note from last night: a headline (on the alarm), a message for the morning, and one
// for before work. Older notes were just one line — that line counts as the headline.
function nightNote(date){
  const ns = morningNotesFor(date || briefNoteDate()), out = {headline:'', morning:'', work:''};
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
    '<div class="snz-acts"><button class="dawn-btn" data-action="snoozeUp">&#9728;&#65039; I’m up</button>'+
      '<button class="snz-music'+(snoozeMusicOn()?' is-on':'')+'" data-action="snoozeMusic" title="'+(snoozeMusicOn() ? 'Pause the music' : 'Play your wake-up song again')+'">'+(snoozeMusicOn() ? '&#10073;&#10073; Pause music' : '&#9654; Play music')+'</button></div>'+
  '</div>';
}
function tickSnooze(){ const el = document.getElementById('snzLeft'), sn = state.focus.snooze; if(el && sn) el.textContent = formatElapsed(Math.max(0, sn.ts - Date.now())); }
// snoozing stops the wake-up song, so the button starts on "▶ Play music" (it plays the song again);
// once something is playing it reads "Pause music"
function snoozeMusicOn(){ return !!(FM.playing || wakeAudio || wakeMusicApp || ui.snzPlaying); }
ACTIONS.snoozeMusic = function(){
  if(snoozeMusicOn()){ ui.snzPlaying = false; if(FM.playing) focusMusicStop(); stopWakeMedia(true); }
  else {
    const m = wakeCfg().media;
    if(m){ ui.snzPlaying = true; playWakeMedia(m, function(){ ui.snzPlaying = false; if(ui.wakeMode==='snooze') renderWakeOverlayInto(); }); }
    else focusMusicPlay();
  }
  renderWakeOverlayInto();
};
ACTIONS.snoozeUp = function(){ state.focus.snooze = null; persist('focus'); wakeImUp(); };

// ---- 3 Good morning: everything on one screen ----
// last night, from going to sleep (Wind down → Go to sleep) to getting up
function lastNightSleep(){
  const h = state.modes.history.filter(function(m){ return m.sleep && m.endedAt && Date.now() - m.endedAt < 8*3600000 && m.minutes >= 60; }).sort(function(a, b){ return b.endedAt - a.endedAt; })[0];
  return h ? {minutes:h.minutes, from:h.startedAt, to:h.endedAt} : null;
}
// the usual lines, said a little differently each day (Op rewrites them in its own words when it can)
function brVary(key, xs){ const d = Number(todayStr().replace(/-/g, '')); return xs[(d + key.length*7) % xs.length]; }
function briefBase(){ return wakeCfg().intro!=='quick' ? 3200 : 1100; }
// ("You, lately" and "a month ago you wrote" are gone: the month and the week took their place — see 32u)
function wakeBriefHtml(){
  if(typeof briefMinimalOn==='function' && briefMinimalOn()) return briefMinimalHtml();
  const today = todayStr(), name = state.profile.name || '';
  const events = state.calendar.events.filter(function(e){ return e.date===today; }).sort(function(a, c){ return (a.time||'').localeCompare(c.time||''); });
  const nn = nightNote();
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
    const wms = typeof opVoiceOn==='function' && opVoiceOn() ? 250 : BRIEF_WORD_MS;
    // (quicker again: the page builds at reading pace; the voice keeps up by moving to the newest line)
    if(voice){ lines.push({at: d - 380, text: voice, key:String(cls).split(' ')[0].replace(/^br-/, '')}); tcur += Math.max(900, voice.split(' ').length*wms + 300); } else tcur += 500;
    return '<section class="br-p '+cls+' '+anim+'" data-k="'+(k-1)+'" style="--d:'+d+'ms'+(extraStyle||'')+'"'+(attrs||'')+'>'+html+'</section>';
  };
  const slept = lastNightSleep();
  // column 1: the weather and the sun (and how you slept), then your note
  const colA = [], colB = [], colC = [], colD = [];
  colA.push(panel('br-hero', 'br-a-blur', 'It’s '+timeStr+'.'+(now ? ' '+now.temp+'° and '+wxLabel(now.code).toLowerCase()+' outside.' : '')+(slept ? ' You got '+fmtDurationLabel(slept.minutes)+' of sleep.' : sunLine ? ' '+sunLine : ''),
    briefHeroViews(vb, '<div class="brh-top"><div class="brh-wx"><span class="brh-i">'+(now ? wxIcon(wxKind(now.code), phase) : SKY_META[phase].icon)+'</span>'+
      '<div>'+(now ? '<div class="brh-t">'+now.temp+'&deg;</div><div class="brh-l">'+escapeHtml(wxLabel(now.code))+(now.hi!=null ? ' <span>&middot; H '+now.hi+'&deg; L '+now.lo+'&deg;</span>' : '')+'</div>' : '<div class="brh-l is-big">'+SKY_META[phase].label+'</div>')+'</div></div>'+
      (slept ? '<div class="brh-sleep"><small>Slept</small><b>'+fmtDurationLabel(slept.minutes)+'</b><span>'+fmtTimeShort(slept.from)+' &rarr; '+fmtTimeShort(slept.to)+'</span></div>' : '')+'</div>'+
    '<div class="brh-sun">'+sunArcHtml({w:300, h:64, pad:8, r:4.5, animate:true})+
      '<div class="brh-sun-row"><span><small>Sunrise</small>'+fmtMinOfDay(win.rise)+'</span><span class="brh-day">'+daylightLabel()+'</span><span><small>Sunset</small>'+fmtMinOfDay(win.set)+'</span></div></div>')));
  if(nn.headline || nn.morning) colA.push(panel('br-lastnight', 'br-a-blur', 'You left yourself a note last night.', '<div class="br-k">&#127769; From Last Night</div>'+
    (nn.headline ? '<div class="br-ln-head">'+escapeHtml(nn.headline)+'</div>' : '')+(nn.morning ? '<div class="br-ln-text">'+escapeHtml(nn.morning)+'</div>' : '')));
  // the month and the week (or, rarely, a time capsule) — with your streak and level on top
  const you = typeof briefIntentHtml==='function' ? briefIntentHtml() : null;
  if(you) colA.push(panel('br-you br-intent', 'br-a-rise', you.voice, you.html));
  // column 2: a line to carry, and a few small things for a good day
  colB.push(panel('br-quote', 'br-a-words', brVary('quote', ['Something to carry with you.', 'A line worth keeping in your pocket today.', 'Here’s one to chew on with your coffee.', 'A little something for the back of your mind.']), '<div class="br-k">&#10024; For Today</div>'+quoteHtml(q, '', 'morning')));
  colB.push(panel('br-thoughts br-goodday', 'br-a-rise', brVary('goodday', ['A few things for a good day.', 'Some small wins, if you want them.', 'A few easy ones to start the day right.', 'Little things that make a day better.']), '<div class="br-k">&#127807; For a Good Day</div>'+goodDayReelHtml()));
  // the day ahead — the calendar, and the content you're after — sits on top of the world's news
  const cp = typeof contentProgress==='function' ? ['business', 'personal'].map(contentProgress).filter(function(p){ return p.n; }) : [];
  // (wide screens: on top of the headlines; otherwise under the weather, where the month panel has room)
  const todayCol = window.innerWidth >= 1680 ? colC : null;
  // (the work itself — the plan, what's due — waits for the work preview; Good morning is the day around it)
  const todayVoice = events.length ? (events.length===1 ? 'One thing on the calendar later.' : events.length+' things on the calendar later.') : 'Nothing on the calendar. The day’s yours.';
  const row = function(when, what, cls){ return '<div class="bd-r'+(cls ? ' '+cls : '')+'"><b>'+when+'</b><span>'+what+'</span></div>'; };
  const todayP = (panel('br-day', 'br-a-right', todayVoice,
    '<div class="br-k">&#128197; Today<span class="br-k-n">'+new Date().toLocaleDateString(undefined, {weekday:'short', month:'short', day:'numeric'})+'</span></div>'+
    '<div class="bd-list">'+
      events.map(function(e){ return row(e.time ? fmt12Hour(e.time) : 'All day', escapeHtml(e.title)+(e.location ? '<small>'+escapeHtml(e.location)+'</small>' : ''), 'is-ev'+(e.time && e.time < nowHM() ? ' is-past' : '')); }).join('')+
      (!events.length ? '<div class="bd-empty">Nothing scheduled. Enjoy the morning.</div>' : '')+
    '</div><div class="bd-more" hidden></div>'+
    (cp.length ? '<div class="br-content">'+cp.map(function(p){ return '<span class="'+(p.done >= p.n ? 'is-hit' : '')+'"><b>'+p.done+'/'+p.n+'</b> '+(p.role==='business' ? 'business' : 'personal')+' videos '+p.label+'</span>'; }).join('')+'</div>' : '')));
  if(todayCol) todayCol.push(todayP); else colA.splice(1, 0, todayP);
  // the world: one panel of headlines (the news and tech, mixed), and one just for sports.
  // While they're loading, a placeholder holds their place so nothing moves when they land.
  const sec = (ui.morningNews && ui.morningNews.sec) || {}, newsWait = morningNewsOn() && ui.morningNews && ui.morningNews.loading;
  const late = ui.briefNewsAt ? function(){ return ';--late:'+Math.max(600, tcur - (ui.briefNewsAt - (ui.briefT0||0)))+'ms'; } : function(){ return ''; };
  // ask Op about sports, the news, tech or the business: small icons in the headlines' corner
  let asksUsed = false; const asks = function(){ if(asksUsed) return ''; asksUsed = true; return briefAsksHtml(); };
  const item = function(n, top, tag){ return '<button class="br-news-i'+(top?' is-top':'')+'" data-action="openNewsLink" data-url="'+escapeHtml(n.link)+'"><span>'+(tag ? '<em class="br-tag">'+tag+'</em>' : '')+escapeHtml(n.title)+(n.src ? '<small>'+escapeHtml(n.src)+'</small>' : '')+'</span><i>&#8599;</i></button>'; };
  const waitHtml = function(cls, k){ return '<section class="br-p '+cls+' is-loading br-a-fade" style="--d:'+tcur+'ms"><div class="br-k">'+k+asks()+'</div><div class="br-news-wait"><i></i><i></i><i></i></div></section>'; };
  const heads = news ? mixHeadlines(news, arr(sec.tech), arr(sec.local)) : [];
  if(heads.length){
    const lt = late(), lp = arr(sec.local)[0] && sec.local[0].local;
    // (as many as fit — the rest are trimmed after it's drawn, so there's no empty space under them)
    colC.push(panel('br-news', 'br-a-rise', 'Here’s what’s happening out there'+(lp ? ', and in '+lp : '')+'.', '<div class="br-k">&#128240; Headlines'+(lp ? '<span class="br-k-n">&#128205; '+escapeHtml(lp)+'</span>' : '')+asks()+'</div><div class="br-news-list">'+heads.map(function(h, i){ return item(h.n, i===0, h.tech ? 'Tech' : h.local ? 'Local' : ''); }).join('')+'</div>', lt));
  } else if(newsWait) colC.push(waitHtml('br-news', '&#128240; Headlines'));
  if(morningNewsOn() && newsSections().some(function(x){ return x.id==='sports'; })){
    // (on a narrower screen sports shares a column with the headlines: fewer rows, no sports stories)
    const roomy = window.innerWidth >= 1680;
    const sc = typeof scoresHtml==='function' ? scoresHtml(roomy ? 4 : 3, roomy ? 4 : 3) : '', sh = arr(sec.sports).slice(0, roomy || !sc ? 6 : 0);
    if(sc || sh.length){
      const lt = late();
      colD.push(panel('br-sports', 'br-a-rise', sc ? 'And the scores, plus what’s coming up.' : 'And the latest in sports.', '<div class="br-k">&#127936; Sports'+asks()+'</div>'+sc+sh.slice(0, sc ? 2 : 6).map(function(n){ return item(n, false); }).join(''), lt));
    } else if(newsWait || (ui.scores && ui.scores.loading)) colD.push(waitHtml('br-sports', '&#127936; Sports'));
    else colD.push(panel('br-sports', 'br-a-rise', '', '<div class="br-k">&#127936; Sports'+asks()+'</div>'+(typeof scoresStatusHtml==='function' ? scoresStatusHtml() : '<div class="br-sports-none">No games on the board right now.</div>')));
  }
  if(!asksUsed){ const t = todayCol ? colC : colA; for(let i = 0; i < t.length; i++){ if(t[i].indexOf('br-day ')>0){ t[i] = t[i].replace('&#128197; Today', '&#128197; Today'+asks()); break; } } }
  const ctaD = tcur;
  lines.push({at: ctaD - 380, text: brVary('cta', ['Get ready to start your day.', 'Whenever you’re ready, the day’s yours.', 'Take your time. Get to it when you’re ready.', 'That’s the morning. Take it at your pace.']), key:'cta'});
  // Op's own words for them, when it has them (asked for once a morning)
  if(typeof opBriefRewrite==='function'){ const ai = ui.briefAi && ui.briefAi.date===today ? ui.briefAi.map : {}; lines.forEach(function(l){ if(l.key && ai[l.key]) l.text = ai[l.key]; }); setTimeout(function(){ opBriefRewrite(lines); }, 0); }
  ui.briefLines = lines;
  const shift = ui.briefShift || 0;
  // with a vision board: the level line goes by the date (left) and the board hangs alone top right
  const w = wakeCfg(), song = (wakeFinishing || wakeAudio || wakeMusicApp) && w.media ? mediaName(w.media) : '';
  return '<div class="brief brief2 brief3 brief4'+' bg-'+briefBgClass()+(ui.wakeBoardBig?' board-open':'')+(ui.wakeIntroDone?' intro-skipped':'')+(ui.briefSkipped?' is-skipped':'')+'" data-sky="'+phase+'" style="--shift:'+shift+'ms">'+
    (cine
      ? '<div class="brief-intro is-cinematic" data-action="wakeIntroSkip" title="Click to skip"><div class="bi-glow"></div>'+
          '<div class="bi-time">'+timeStr+'</div>'+
          '<div class="bi-word">Good morning</div>'+(name ? '<div class="bi-name">'+escapeHtml(name)+'</div>' : '')+
          '<div class="bi-line">'+new Date().toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'})+'</div></div>'
      : '<div class="brief-intro" data-action="wakeIntroSkip" title="Click to skip"><div class="bi-glow"></div><div class="bi-word">Good morning</div>'+(name ? '<div class="bi-name">'+escapeHtml(name)+'</div>' : '')+'</div>')+
    '<div class="brief-grid-bg"></div>'+
    '<div class="brief-inner b4">'+
      '<div class="brief-top br-p br-a-fade" style="--d:'+(base-1300)+'ms"><span class="brief-brand">OPERATOR</span><span class="brief-dot"></span><span>'+new Date().toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'})+'</span>'+
        '<span class="b4-spacer"></span><span class="b4-music">'+(song ? '<span class="b4-song"><span class="wk2-eq"><i></i><i></i><i></i><i></i></span>'+escapeHtml(song)+'<button class="b4-stop" data-action="wakeStopMusic" title="Stop">&#9632;</button></span>' : '')+'</span>'+
        // one button: Skip takes you straight to the app
        '<button class="brief-skipall" data-action="briefSkip" title="Skip to the app">Skip &#9197;</button></div>'+
      '<div class="br-hrow"><h1 class="brief-hello br-p br-a-blur" style="--d:'+(base-1000)+'ms">Good morning'+(name ? ', <span>'+escapeHtml(name)+'</span>' : '')+'.</h1>'+'</div>'+
      '<div class="br-voice br-p br-a-fade'+(typeof opVoiceOn==='function' && opVoiceOn() && !OV.briefSpoke && OV.idx < 1 && !ui.briefSkipped ? ' op-loading' : '')+'" style="--d:'+(base-700)+'ms"><button class="br-voice-dot" data-action="briefTalk" title="Talk to Op" aria-label="Talk to Op"></button>'+
        '<span class="br-voice-load"><b>Op</b> loading<i><u></u></i></span><span id="brVoice"></span><span class="br-caret"></span></div>'+
      // no news column (headlines off) → two columns that fill the width instead of an empty third
      // wide screens get four columns (you · today · headlines · sports); otherwise sports sits under headlines
      '<div class="b4-grid'+(!colC.length && !colD.length ? ' cols-2' : !colD.length ? ' no-d' : !colC.length ? ' no-c' : '')+'"><div class="b4-col c-a">'+colA.join('')+'</div><div class="b4-col c-b">'+colB.join('')+'</div>'+(colC.length ? '<div class="b4-col c-c">'+colC.join('')+'</div>' : '')+(colD.length ? '<div class="b4-col c-d">'+colD.join('')+'</div>' : '')+'</div>'+
      '<div class="brief-cta br-p br-a-rise" data-k="'+k+'" style="--d:'+ctaD+'ms">'+
        '<button class="brief-go brief-morning bgo2" data-action="wakeStartMorning"><span class="bgo-t">Get to work</span><span class="bgo-a"><svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h13M13 6l6 6-6 6"/></svg></span></button>'+
      '</div>'+
    '</div>'+
    (ui.wakeBoardBig && vb ? '<div class="br-vision-big" data-action="wakeBoardToggle" title="Close">'+boardStaticHtml(vb, 'wake-board')+'<button class="wk2-vision-x" data-action="wakeBoardToggle">&#10005;</button></div>' : '')+
  '</div>';
}
// ---- the top-left panel does three things: the morning (weather and the sun), your vision board
// (the real one) and your level. It starts on the morning, then moves through them by itself once the
// page has built; the small switch in its corner picks one (and stops it moving).
const BH_VIEWS = [['wx', 'The morning'], ['vision', 'Your vision board'], ['lvl', 'Your level']];
function briefHeroViews(vb, wxHtml){
  const hasVb = !!(vb && vb.elements.length);
  const views = BH_VIEWS.filter(function(v){ return v[0]!=='vision' || hasVb; });
  let cur = ui.briefHeroV || 'wx'; if(!views.some(function(v){ return v[0]===cur; })) cur = 'wx';
  let lvl = '';
  if(typeof xpSummary==='function'){
    const x = xpSummary(), r = RANKS[x.rank], streak = computeStreak();
    const into = Math.max(0, Math.min(x.total - x.levelLo, x.levelHi - x.levelLo)), span = Math.max(1, x.levelHi - x.levelLo);
    lvl = '<div class="bh-lv" style="--rc:'+r.color+'" data-action="openYou" title="Your card">'+rankBadgeSvg(x.rank, 58)+
      '<div class="bh-lvl-m"><div class="bh-lvl-t"><b>Level '+x.level+'</b><span>'+escapeHtml(r.name)+'</span></div>'+
      '<i class="bh-lvl-bar"><u style="width:'+(x.levelPct*100).toFixed(1)+'%"></u></i>'+
      '<div class="bh-lvl-s"><span>'+(x.canLevel ? 'Level up ready' : into.toLocaleString()+' / '+span.toLocaleString()+' XP')+'</span><span>&#128293; '+streak+' day'+(streak===1?'':'s')+'</span></div></div></div>';
  }
  const body = {wx:wxHtml, vision: hasVb ? '<div class="bh-board" data-action="wakeBoardToggle" title="Open your vision board">'+boardStaticHtml(vb, 'wake-board')+'</div>' : '', lvl:lvl};
  return '<div class="bh-switch" role="tablist">'+views.map(function(v){ return '<button class="bh-tab'+(v[0]===cur ? ' is-on' : '')+'" data-action="briefHeroView" data-id="'+v[0]+'" title="'+v[1]+'" aria-label="'+v[1]+'"></button>'; }).join('')+'</div>'+
    '<div class="bh-views" data-v="'+cur+'">'+views.map(function(v){ return '<div class="bh-v bh-'+v[0]+'">'+body[v[0]]+'</div>'; }).join('')+'</div>';
}
function briefHeroSet(id){
  ui.briefHeroV = id;
  document.querySelectorAll('#wakeContent .bh-views').forEach(function(w){ w.setAttribute('data-v', id); });
  document.querySelectorAll('#wakeContent .bh-tab').forEach(function(t){ t.classList.toggle('is-on', t.dataset.id===id); });
  if(id==='vision' && typeof fitStaticBoards==='function') setTimeout(function(){ document.querySelectorAll('#wakeContent .bh-board').forEach(function(b){ fitStaticBoards(b); }); }, 30);
}
ACTIONS.briefHeroView = function(el, e, id){ ui.briefHeroManual = true; briefHeroSet(id); };
// on its own: the morning first, then the board, then your level, while you read
setInterval(function(){
  if(ui.briefHeroManual || ui.wakeMode!=='brief' || typeof overlayOpen!=='function' || !overlayOpen('wakeOverlay') || ui.wakeBoardBig) return;
  if(!briefBuilt() && !ui.briefSkipped) return;
  const wrap = document.querySelector('#wakeContent .bh-views'); if(!wrap || wrap.matches(':hover')) return;
  const ids = Array.prototype.map.call(document.querySelectorAll('#wakeContent .bh-tab'), function(t){ return t.dataset.id; });
  if(ids.length < 2) return;
  ui.briefHeroAt = ui.briefHeroAt || Date.now();
  if(Date.now() - ui.briefHeroAt < 12000) return;
  ui.briefHeroAt = Date.now();
  briefHeroSet(ids[(ids.indexOf(ui.briefHeroV || 'wx') + 1) % ids.length]);
}, 1000);
// sports, the news, tech, the business: four small line icons (they say what they are on hover)
function briefAsksHtml(){
  const ic = {
    sports:'<circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17M3.5 12h17M6 6c3 2.5 3 9.5 0 12M18 6c-3 2.5-3 9.5 0 12"/>',
    news:'<rect x="4" y="5" width="13" height="14" rx="2"/><path d="M17 9h2.5a.5.5 0 0 1 .5.5V17a2 2 0 0 1-2 2H6M7.5 9h6M7.5 12.5h6M7.5 16h4"/>',
    tech:'<rect x="6.5" y="6.5" width="11" height="11" rx="2"/><path d="M10 10h4v4h-4zM9.5 3.5v3M14.5 3.5v3M9.5 17.5v3M14.5 17.5v3M3.5 9.5h3M3.5 14.5h3M17.5 9.5h3M17.5 14.5h3"/>',
    business:'<rect x="3.5" y="7.5" width="17" height="12" rx="2"/><path d="M9 7.5V6a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2v1.5M3.5 12.5h17"/>'
  };
  const label = {sports:'Sports, from Op', news:'The news, from Op', tech:'Tech, from Op', business:'The business, from Op'};
  return '<span class="br-asks">'+['sports', 'news', 'tech', 'business'].map(function(id){
    return '<button class="br-ask" data-action="opAsk" data-id="'+id+'" title="'+label[id]+'" aria-label="'+label[id]+'"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">'+ic[id]+'</svg></button>';
  }).join('')+'</span>';
}
// fit the panels to the space they have: For a Good Day's four rows share its height, and the
// headlines and Today show as many rows as fit — no half-cut row at the bottom, no empty space under it
function briefFit(root){
  root = root || document.getElementById('wakeContent'); if(!root) return;
  root.querySelectorAll('.gd-track').forEach(function(tr){ gdPlace(tr, ui.gdIdx||0); });
  if(typeof fitStaticBoards==='function') root.querySelectorAll('.bh-board').forEach(function(m){ fitStaticBoards(m); });
  root.querySelectorAll('.br-news-list, .bd-list').forEach(function(list){
    const items = Array.prototype.slice.call(list.children);
    items.forEach(function(it){ it.classList.remove('is-cut'); });
    // (layout positions, not screen ones — the panels may still be sliding in)
    const lim = list.clientHeight + 1, top0 = items.length ? items[0].offsetTop : 0;
    let cut = false; items.forEach(function(it, i){ if(cut || (i > 0 && it.offsetTop - top0 + it.offsetHeight > lim)){ cut = true; it.classList.add('is-cut'); } });
    list.classList.toggle('has-more', cut);
    const more = list.nextElementSibling && list.nextElementSibling.classList.contains('bd-more') ? list.nextElementSibling : null;
    if(more){ const n = items.filter(function(it){ return it.classList.contains('is-cut'); }).length; more.textContent = n ? '+'+n+' more later today' : ''; more.hidden = !n; }
  });
  // the quote: the words step down in size until all of it fits, who said it always shows
  root.querySelectorAll('.br-quote .qt blockquote').forEach(function(bq){
    bq.style.fontSize = '';
    let fs = parseFloat(getComputedStyle(bq).fontSize) || 20, guard = 0;
    while(bq.scrollHeight > bq.clientHeight + 1 && fs > 13 && guard++ < 16){ fs -= 1; bq.style.fontSize = fs+'px'; }
  });
}
window.addEventListener('resize', function(){ clearTimeout(briefFit._t); briefFit._t = setTimeout(function(){ if(typeof overlayOpen==='function' && overlayOpen('wakeOverlay')) briefFit(); }, 120); });
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
const BRIEF_WORD_MS = 150; // a comfortable read: each line finishes before the next piece arrives
function briefBuilt(){ const l = ui.briefLines || []; return !!l.length && Date.now() - (ui.briefT0||0) > l[l.length-1].at + 2000; }
function briefVoiceRun(){
  clearInterval(briefVoiceTimer);
  briefVoiceTimer = setInterval(function(){
    const el = document.getElementById('brVoice');
    if(!el || ui.wakeMode!=='brief' || !overlayOpen('wakeOverlay')){ if(!overlayOpen('wakeOverlay')) clearInterval(briefVoiceTimer); return; }
    // once you've asked the Operator something (or talked to it), the line is its answer — leave it be
    if(typeof OV!=='undefined' && OV.idx===999) return;
    const lines = ui.briefLines || [], t = Date.now() - (ui.briefT0||0);
    if(typeof opBriefTick==='function' && opBriefTick(lines, t)) return;
    let cur = null; lines.forEach(function(l){ if(t >= l.at) cur = l; });
    if(ui.briefSkipped && lines.length) cur = lines[lines.length-1];
    // a word at a time, at a calm reading pace (it used to type letter by letter, too fast)
    const words = cur ? cur.text.split(' ') : [];
    const txt = cur ? (ui.briefSkipped ? cur.text : words.slice(0, Math.max(0, Math.floor((t - cur.at)/BRIEF_WORD_MS) + 1)).join(' ')) : '';
    if(typeof capSet==='function') capSet(el, txt); else if(el.textContent!==txt) el.textContent = txt;
    const wrap = el.parentNode; if(wrap) wrap.classList.toggle('is-typing', !!cur && txt.length < cur.text.length);
    // (it used to scroll each piece into view as it arrived — that's what made the page slide near the
    // end; the page fits the screen now and stays put)
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
  ui.planReveal = {at:Date.now(), from:opts.from||''};
  showOverlay('planOverlay'); renderPlanRevealInto();
  if(!opts.quiet) playWorkIntro();
  if(typeof workDayState==='function'){ workDayState().clockedInAt = Date.now(); persist('focus'); }
  if((opts.from==='morning' || opts.from==='workalarm') && typeof opAutoBusinessBrief==='function') opAutoBusinessBrief();
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
  ].concat(workSocialStats(), workLevelStat());
}
// the game, in the work preview: your level and how far to the next
function workLevelStat(){
  if(typeof xpSummary!=='function') return [];
  const x = xpSummary();
  return [{k:'Level '+x.level+' &middot; '+RANKS[x.rank].name, v:'OVR '+x.ovr, sub:(x.levelHi - x.total).toLocaleString()+' XP to level '+(x.level+1), pct:x.levelPct*100, go:'openYou'}];
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
// the business message you left yourself the night before (the "before you lock in" part of the note)
function workMessageHtml(){
  const w = nightNote().work;
  return '<div class="wi-msg'+(w ? '' : ' is-empty')+'"><div class="wi-msg-h"><span>&#128188; Business message</span><button class="wi-msg-e" data-action="openTomorrowNote" title="'+(w ? 'Write tomorrow’s' : 'Write one for tomorrow')+'">&#9998;</button></div>'+
    (w ? '<p>'+escapeHtml(w)+'</p>' : '<p class="wi-msg-none">Nothing from last night. Leave tomorrow’s when you clock out.</p>')+'</div>';
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
      (ui.planReveal && ui.planReveal.from==='morning' ? '<button class="wi-back" data-action="backToMorning" title="Back to Good morning">&#8592; Morning</button>' : '')+
      '<span class="wi-pl"></span>'+
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
        // your business message from last night first (or a nudge to write tomorrow's), one quote, your week
        '<div class="wi-col wi-right" style="'+at(300)+'">'+workMessageHtml()+
          '<div class="wi-side">'+quoteHtml(q, 'is-work', 'work')+'</div>'+
          workWeekHtml(target)+
        '</div>'+
      '</div>'+
      '<div class="pr-cta" style="animation-delay:420ms">'+
        '<button class="ls-go pr-go" data-action="planLockIn"'+(first ? ' data-id="'+first.id+'"' : '')+'><span class="ls-go-ring"></span><span class="ls-go-i">&#128274;</span><b>LOCK IN</b></button>'+
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
  // (no flash, no "done for the day" toast: the clocked-out page says it, and Clock back in undoes it)
  playLockOut(); ui.restFull = true;
};

// the vision board fits itself once its entrance has played (it measures wrong while scaled)
document.addEventListener('animationend', function(e){ if(e.target && e.target.classList && (e.target.classList.contains('br-vision') || e.target.classList.contains('br-hero') || e.target.classList.contains('mm-vision'))) fitStaticBoards(e.target); });
