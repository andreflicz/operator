// ============ THE OPERATOR'S VOICE ============
// Good morning is spoken: the Operator greets you, tells you the time, the weather and the day, and
// mentions (never reads) the note you left. The blue line is its captions, word for word as it
// speaks. After that you can ask it for the sports, the news, tech, or a quick business brief —
// and the brief plays by itself when you go straight from Good morning to work.
// One voice, always the same one. Where it comes from (Settings → alarm → The Operator's voice):
//   "mac"     the Mac's own speech through the Operator app (`say`): your system voice — a Siri voice
//             or a Premium one sounds far more human than what the browser gets — or one you pick
//   "eleven"  ElevenLabs, the most natural; the key is saved by the Operator app on this Mac only
//             (never in Operator's data, exports or backups)
//   "browser" the browser's built-in voices (what it falls back to when the app can't speak)
// What it says is put together from your data (no AI service).
const OV = {speaking:false, pending:false, broken:false, helperDown:false, idx:-1, voice:null, cap:null, token:0, audio:null};
function opEngine(){ const e = wakeCfg().voiceEngine; return e==='mac' || e==='browser' ? e : 'eleven'; }
function opUseHelper(){ return opEngine()!=='browser' && !OV.helperDown; }
function opBrowserOk(){ return typeof window.speechSynthesis!=='undefined' && !OV.broken; }
// (if nothing can speak — no app, no voices — it switches itself off for the session and the typed captions take over)
function opVoiceOn(){ return wakeCfg().voice!==false && (opUseHelper() || opBrowserOk()); }

// ---- the browser's voices: one good one, picked the same way every time ----
// novelty and old robotic voices never get picked
const OP_VOICE_BAD = /^(Albert|Bad News|Bahh|Bells|Boing|Bubbles|Cellos|Good News|Jester|Organ|Pipe Organ|Superstar|Trinoids|Whisper|Wobble|Zarvox|Fred|Junior|Ralph|Kathy|Princess|Deranged|Hysterical|Eddy|Flo|Grandma|Grandpa|Reed|Rocko|Sandy|Shelley)\b/i;
function opVoiceScore(v){
  const n = v.name || '', l = String(v.lang||'').replace('_', '-');
  if(!/^en/i.test(l)) return -999;
  if(OP_VOICE_BAD.test(n)) return -500;
  let s = /en-GB/i.test(l) ? 30 : /en-(AU|IE|NZ)/i.test(l) ? 14 : /en-US/i.test(l) ? 10 : 4;
  if(/Premium/i.test(n)) s += 45; else if(/Natural|Neural/i.test(n)) s += 40; else if(/Enhanced/i.test(n)) s += 32;
  // a butler: calm, male, British first
  if(/^(Jamie|Daniel|Oliver|Arthur|Malcolm|Evan|Nathan|Tom|Aaron|Alex)\b/i.test(n) || /UK English Male/i.test(n)) s += 20;
  if(/^Google/i.test(n)) s += 6;
  return s;
}
function opBrowserVoices(){
  const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
  return vs.filter(function(v){ return opVoiceScore(v) > -100; }).sort(function(a, b){ return opVoiceScore(b) - opVoiceScore(a) || a.name.localeCompare(b.name); });
}
function opPickVoice(){
  if(OV.voice) return OV.voice;
  const vs = opBrowserVoices(), want = wakeCfg().browserVoice;
  OV.voice = (want && vs.find(function(v){ return v.name===want; })) || vs[0] || null;
  return OV.voice;
}
// the voices load a moment after the page does — speaking before then is what gave you two
// different voices (the system default first, then the one picked). So it waits for them.
function opVoicesReady(){
  return new Promise(function(resolve){
    if(typeof window.speechSynthesis==='undefined') return resolve();
    if(speechSynthesis.getVoices().length) return resolve();
    let done = false; const fin = function(){ if(!done){ done = true; resolve(); } };
    try{ speechSynthesis.addEventListener('voiceschanged', fin, {once:true}); }catch(e){}
    setTimeout(fin, 1200);
  });
}
if(typeof window.speechSynthesis!=='undefined') try{ speechSynthesis.addEventListener('voiceschanged', function(){ if(!OV.speaking) OV.voice = null; }); }catch(e){}

// written → spoken: degrees, hours and minutes, symbols
function speakable(t){
  return String(t||'').replace(/&[a-z#0-9]+;/gi, ' ').replace(/(\d+)°/g, '$1 degrees')
    .replace(/(\d+)h (\d+)m\b/g, '$1 hours $2 minutes').replace(/(\d+)h\b/g, '$1 hours').replace(/(\d+)m\b/g, '$1 minutes')
    .replace(/·/g, ',').replace(/\s+/g, ' ').trim();
}
function opCaption(txt){
  if(OV.cap==='opBubText') opBubShow();
  const el = OV.cap ? document.getElementById(OV.cap) : null;
  if(el && el.textContent!==txt) el.textContent = txt;
  if(OV.cap==='opBubText') opBubHideLater();
}
// ---- the Operator's bubble: what it says (and your reply box) floats over the page, bottom centre,
// so nothing on the page ever moves; it slips away a few seconds after it's done ----
function opBubShow(){
  let b = document.getElementById('opBub');
  if(!b){
    b = document.createElement('div'); b.id = 'opBub'; b.className = 'op-bub';
    b.innerHTML = '<div class="op-bub-h"><span class="op-bub-dot"></span><b>OPERATOR</b><button class="op-bub-x" data-action="opBubClose" title="Close">&#10005;</button></div>'+
      '<div class="op-bub-t" id="opBubText"></div>'+
      '<div class="op-bub-in"><input class="op-type" id="opBubInput" placeholder="Ask the Operator…" autocomplete="off"><button class="op-talk" data-action="opTalk" title="Talk (mic)">&#127897;&#65039;</button></div>';
    document.body.appendChild(b);
    b.addEventListener('mouseenter', function(){ b._hover = true; clearTimeout(opBubHideLater._t); });
    b.addEventListener('mouseleave', function(){ b._hover = false; opBubHideLater(); });
  }
  if(!b.classList.contains('is-in')){ void b.offsetWidth; b.classList.add('is-in'); }
  return b;
}
function opBubHideLater(){
  clearTimeout(opBubHideLater._t);
  opBubHideLater._t = setTimeout(function(){
    const b = document.getElementById('opBub'); if(!b) return;
    const typing = document.activeElement && document.activeElement.id==='opBubInput' && document.activeElement.value;
    if(b._hover || typing || OV.speaking || OV.pending || AI.busy || AI.listening){ opBubHideLater(); return; }
    b.classList.remove('is-in');
  }, 9000);
}
ACTIONS.opBubClose = function(){ opStop(); const b = document.getElementById('opBub'); if(b) b.classList.remove('is-in'); };
function opTtsUrl(text){
  const w = wakeCfg(), e = opEngine();
  return WAKE_HELPER+'tts/say?e='+e+'&v='+hexUtf8(e==='eleven' ? (w.elevenVoice||'') : (w.macVoice||''))+'&t='+hexUtf8(text);
}
// warm the next line up while this one is being said, so there's no gap between them
function opPrefetch(text){ if(!opVoiceOn() || !opUseHelper()) return; try{ fetch(opTtsUrl(speakable(text))).catch(function(){}); }catch(e){} }
function opStarted(tok, opts){ OV.pending = false; OV.speaking = true; if(opts.onstart) opts.onstart(); opCaption(''); document.body.classList.add('op-speaking'); }
function opFinished(tok, said){ OV.pending = false; if(tok===OV.token){ OV.speaking = false; OV.audio = null; opCaption(said); document.body.classList.remove('op-speaking'); } }
// say something; captions follow the words as they're spoken
function opSay(text, opts){
  opts = opts || {};
  return new Promise(function(resolve){
    if(!opVoiceOn()){ resolve(false); return; }
    const said = speakable(text), tok = ++OV.token;
    OV.cap = opts.cap || 'brVoice'; OV.pending = true;
    if(opUseHelper()) opSayAudio(said, opts, tok, resolve);
    else opVoicesReady().then(function(){ if(tok!==OV.token){ resolve(false); return; } opSayBrowser(said, opts, tok, resolve); });
  });
}
// through the Operator app: it hands back the spoken line as audio
function opSayAudio(said, opts, tok, resolve){
  const a = new Audio(opTtsUrl(said)), words = said.split(' ');
  OV.audio = a;
  let started = false, capT = null, settled = false;
  const finish = function(ok){ if(settled) return; settled = true; clearTimeout(startT); clearInterval(capT); opFinished(tok, said); resolve(ok); };
  // the app isn't there (or can't speak): this line and the rest of the session use the browser's voice
  const fallBack = function(){
    if(settled) return; settled = true; clearTimeout(startT);
    try{ a.pause(); a.removeAttribute('src'); }catch(e){}
    OV.helperDown = true; OV.audio = null;
    if(tok!==OV.token || !opBrowserOk()){ OV.pending = false; resolve(false); return; }
    opVoicesReady().then(function(){ if(tok!==OV.token){ OV.pending = false; resolve(false); return; } opSayBrowser(said, opts, tok, resolve); });
  };
  const startT = setTimeout(function(){ if(!started) fallBack(); }, opEngine()==='eleven' ? 15000 : 9000);
  a.addEventListener('playing', function(){
    if(started || settled) return; started = true; clearTimeout(startT);
    if(tok!==OV.token){ try{ a.pause(); }catch(e){} finish(false); return; }
    opStarted(tok, opts);
    capT = setInterval(function(){
      if(tok!==OV.token) return;
      const d = a.duration && isFinite(a.duration) ? a.duration : words.length*0.36;
      opCaption(words.slice(0, Math.min(words.length, Math.floor(a.currentTime/d*words.length)+1)).join(' '));
    }, 100);
  });
  a.addEventListener('ended', function(){ finish(true); });
  a.addEventListener('error', function(){ if(started) finish(false); else fallBack(); });
  const p = a.play(); if(p && p.catch) p.catch(function(){ if(!started) fallBack(); });
}
function opSayBrowser(said, opts, tok, resolve){
  if(!opBrowserOk()){ OV.pending = false; resolve(false); return; }
  const u = new SpeechSynthesisUtterance(said);
  const v = opPickVoice(); if(v){ u.voice = v; u.lang = v.lang; }
  u.rate = 0.98; u.pitch = 1; u.volume = 1;
  let gotBoundary = false, t0 = 0, est = null;
  OV.pending = true;
  // (a voice can take a few seconds to wake up the first time; only give up on it after two misses)
  const startTimer = setTimeout(function(){ if(OV.pending && tok===OV.token){ OV.pending = false; OV.misses = (OV.misses||0) + 1; if(OV.misses >= 2) OV.broken = true; try{ speechSynthesis.cancel(); }catch(e){} opCaption(said); resolve(false); } }, 6000);
  u.onstart = function(){ clearTimeout(startTimer); OV.misses = 0; t0 = Date.now(); opStarted(tok, opts);
    // some voices don't report word boundaries: follow along by time instead
    est = setInterval(function(){ if(gotBoundary || tok!==OV.token) return; const words = said.split(' '), n = Math.min(words.length, Math.floor((Date.now()-t0)/330)+1); opCaption(words.slice(0, n).join(' ')); }, 120); };
  u.onboundary = function(e){ if(tok!==OV.token) return; gotBoundary = true; const end = said.indexOf(' ', e.charIndex + (e.charLength||1)); opCaption(end<0 ? said : said.slice(0, end)); };
  const done = function(ok){ clearTimeout(startTimer); clearInterval(est); opFinished(tok, said); resolve(ok); };
  u.onend = function(){ done(true); };
  u.onerror = function(e){ if(e && e.error && e.error!=='interrupted' && e.error!=='canceled' && !t0) OV.broken = true; done(false); };
  speechSynthesis.speak(u);
}
function opStop(){
  OV.token++; OV.speaking = false; OV.pending = false;
  if(OV.audio){ try{ OV.audio.pause(); }catch(e){} OV.audio = null; }
  try{ speechSynthesis.cancel(); }catch(e){}
  document.body.classList.remove('op-speaking');
}
// unlock speech on the "I'm up" click (browsers want a click before anything talks)
function opUnlock(){
  if(!opVoiceOn()) return;
  try{ const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); }catch(e){}
  opPickVoice();
}

// ---- Good morning, spoken: one line per piece, each piece appears as it's said ----
function opBriefLine(lines, i){ const name = state.profile.name || ''; return (i===0 ? 'Good morning'+(name ? ', '+name : '')+'. ' : '')+lines[i].text; }
function opBriefTick(lines, t){
  if(!opVoiceOn() || ui.briefSkipped || !lines.length) return false;
  if(OV.speaking || OV.pending) return true;
  const next = OV.idx + 1; if(next >= lines.length) return true;
  if(t < lines[next].at) return true;
  OV.idx = next;
  opSay(opBriefLine(lines, next), {cap:'brVoice', onstart:function(){
    if(lines[next+1]) opPrefetch(opBriefLine(lines, next+1));
    // bring the matching piece in now if the clock hasn't got there yet
    const now = Date.now() - (ui.briefT0||0), need = lines[next].at + 380 - now;
    if(need > 0){ ui.briefT0 -= need; ui.briefShift = (ui.briefShift||0) + need; renderWakeOverlayInto(); }
  }});
  return true;
}
function opBriefReset(){ OV.idx = -1; opStop(); }

// ---- what you can ask for: short, spoken like a person would say it ----
const pickOne = function(xs){ return xs[Math.floor(Math.random()*xs.length)]; };
// a headline, made sayable: no "LIVE:", no "| Source", no trailing source, no shouting
function sayHeadline(t){
  return String(t||'').replace(/^(LIVE|WATCH|BREAKING|UPDATE|EXCLUSIVE|OPINION|ANALYSIS)\s*[:|-]\s*/i, '').replace(/\s+[|–—-]\s+[^|–—-]{2,40}$/, '')
    .replace(/[“”"]/g, '').replace(/\s+/g, ' ').trim().replace(/[.!?:;,]+$/, '');
}
function listSay(xs){ return xs.length<=1 ? (xs[0]||'') : xs.slice(0, -1).join(', ')+' and '+xs[xs.length-1]; }
function gameDaySay(g){
  const d = new Date(g.at), today = todayStr(), ds = ds2(d), tm = d.toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'}).replace(':00', '');
  if(ds===today) return (d.getHours() >= 17 ? 'tonight at ' : 'today at ')+tm;
  if(ds===addDays(today, 1)) return (d.getHours() >= 17 ? 'tomorrow night at ' : 'tomorrow at ')+tm;
  return 'on '+d.toLocaleDateString(undefined, {weekday:'long'});
}
// sports: last night's results, then what's coming up (tonight, tomorrow, this week) — your teams first
function opSportsScript(){
  const sc = ui.scores || {}, out = [];
  const favFirst = function(xs){ return xs.filter(isFavGame).concat(xs.filter(function(g){ return !isFavGame(g); })); };
  SPORTS.forEach(function(s){
    const list = arr(sc[s.id]);
    if(!list.length) return;
    const done = favFirst(list.filter(function(g){ return g.state==='post' && Date.now() - g.at < 3*86400000; }).sort(function(a, b){ return b.at - a.at; }));
    const live = favFirst(list.filter(function(g){ return g.state==='in'; }));
    const next = favFirst(list.filter(function(g){ return g.state==='pre'; }).sort(function(a, b){ return a.at - b.at; }));
    const bits = [];
    if(live.length){ const g = live[0]; bits.push(g.away.short+' and '+g.home.short+' are going right now — '+g.away.score+' to '+g.home.score+'.'); }
    done.slice(0, 2).forEach(function(g, i){
      const w = g.home.win ? g.home : g.away, l = g.home.win ? g.away : g.home;
      const margin = Math.abs(Number(w.score) - Number(l.score));
      const verb = margin >= 20 ? 'ran away from' : margin <= 3 ? 'edged' : 'beat';
      bits.push((i===0 ? (ds2(new Date(g.at))===addDays(todayStr(), -1) ? 'Last night' : 'Most recently')+', the ' : 'And the ')+w.short+' '+verb+' the '+l.short+', '+w.score+' to '+l.score+'.');
    });
    const up = next.filter(function(g){ return g.at - Date.now() < 7*86400000; }).slice(0, 2);
    if(up.length) bits.push((done.length || live.length ? 'Coming up, ' : 'Coming up in the '+s.label+', ')+listSay(up.map(function(g){ return g.away.short+' at '+g.home.short+' '+gameDaySay(g); }))+'.');
    if(bits.length) out.push((out.length ? 'Over in the '+s.label+'. ' : 'In the '+s.label+'. ')+bits.join(' '));
  });
  const hl = arr(ui.morningNews && ui.morningNews.sec && ui.morningNews.sec.sports).slice(0, 1).map(function(n){ return sayHeadline(n.title); });
  if(!out.length && !hl.length) return 'I couldn’t reach the scores just now. Give me a minute and ask again.';
  if(!out.length) return 'No games to talk about right now. In the headlines — '+hl[0]+'.';
  return out.join(' ')+(hl.length ? ' And one more — '+hl[0]+'.' : '');
}
// the news: a quick rundown (three stories, under half a minute), like a person telling you
function opNewsScript(kind){
  const nw = ui.morningNews || {}, list = kind==='tech' ? arr(nw.sec && nw.sec.tech) : arr(nw.items);
  const hs = list.map(function(n){ return sayHeadline(n.title); }).filter(function(h){ return h && h.split(' ').length <= 22; }).slice(0, 3);
  if(!hs.length) return kind==='tech' ? 'Tech’s quiet this morning — nothing worth your time yet.' : 'I couldn’t pull the news just now. I’ll try again in a bit.';
  if(kind==='tech'){
    return pickOne(['Here’s what’s moving in tech.', 'Quick one from the tech world.', 'In tech this morning.'])+' '+hs[0]+'.'+
      (hs[1] ? ' '+pickOne(['Also —', 'Meanwhile,', 'And —'])+' '+hs[1]+'.' : '')+(hs[2] ? ' And finally, '+hs[2]+'.' : '')+' '+pickOne(['That’s tech.', 'That’s the tech side.', 'That’s it from tech.']);
  }
  return pickOne(['Here’s your quick rundown.', 'Alright, here’s what’s going on.', 'Quick look at the world this morning.'])+' '+hs[0]+'.'+
    (hs[1] ? ' '+pickOne(['Also making news —', 'Meanwhile,', 'Elsewhere,'])+' '+hs[1]+'.' : '')+
    (hs[2] ? ' And '+pickOne(['one more —', 'lastly,', 'finally,'])+' '+hs[2]+'.' : '')+' '+pickOne(['That’s the news.', 'That’s what’s out there.', 'That’s the world this morning.']);
}
// business: just what you've got today — then a word to get you going
function opBusinessScript(){
  const plan = typeof todaysPlan==='function' ? todaysPlan().filter(function(t){ return t.status!=='done'; }) : [];
  const today = todayStr(), events = state.calendar.events.filter(function(e){ return e.date===today && e.time; }).sort(function(a, c){ return (a.time||'').localeCompare(c.time||''); });
  const target = state.standards.deepWorkTargetMinutes || 180, yDeep = deepWorkMinutesFor(addDays(today, -1));
  const dow = new Date().getDay(), yWork = typeof isWorkDay==='function' ? isWorkDay(addDays(today, -1)) : dow!==1 && dow!==0;
  const parts = [];
  if(!plan.length) parts.push('Nothing’s lined up yet — pick your first move when you lock in.');
  else if(plan.length===1) parts.push('Today it’s just one thing: '+plan[0].title+'.');
  else {
    const names = plan.slice(0, 3).map(function(t){ return t.title; });
    parts.push('Today you’ve got '+plan.length+' things. '+(plan.length > 3 ? 'Starting with '+listSay(names)+', plus '+(plan.length-3)+' more.' : listSay(names)+'.'));
  }
  if(events.length) parts.push(events.length===1 ? 'And '+events[0].title+' at '+fmt12Hour(events[0].time)+'.' : 'On the calendar: '+listSay(events.slice(0, 2).map(function(e){ return e.title+' at '+fmt12Hour(e.time); }))+'.');
  if(nightNote().work) parts.push('You left yourself a note, too — it’s on the screen.');
  let end;
  if(dow===1) end = 'Let’s start the week strong.';
  else if(dow===5) end = 'Let’s finish the week strong.';
  else if(yWork && yDeep < target*0.6) end = pickOne(['Yesterday was a little light, so let’s get more in today.', 'We came up short yesterday. Let’s try to do more work today.']);
  else if(yWork && yDeep >= target) end = pickOne(['You hit your number yesterday — let’s do it again.', 'Strong day yesterday. Same again.']);
  else if(dow===0 || dow===6) end = 'Weekend work counts double. Let’s keep it tight.';
  else if(dow===3) end = 'Middle of the week. Keep the momentum.';
  else end = pickOne(['Let’s get to it.', 'Let’s have a good one.', 'Let’s make it count.']);
  parts.push(end);
  return parts.join(' ');
}
// asking: the bits that need fetching are fetched first (it says so if that takes a moment)
ACTIONS.opAsk = async function(el, e, id){
  opStop(); OV.idx = 999; // the spoken greeting is done once you ask for something
  const cap = 'opBubText';
  const tok = OV.token;
  const wait = function(p){ return Promise.race([p, new Promise(function(r){ setTimeout(r, 7000); })]); };
  if(id==='sports' && typeof loadScores==='function' && !(ui.scores && ui.scores.got && (ui.scores.nfl || ui.scores.nba))){ OV.cap = cap; opCaption('One moment — getting the scores…'); await wait(loadScores(true)); }
  if((id==='news' || id==='tech' || id==='sports') && !(ui.morningNews && ui.morningNews.items)){ OV.cap = cap; opCaption('One moment…'); await wait(loadMorningNews(true)); }
  if(id==='tech' && !arr(ui.morningNews && ui.morningNews.sec && ui.morningNews.sec.tech).length){
    // nothing came through for tech with the morning's news: ask for it on its own
    const t = newsSections().find(function(x){ return x.id==='tech'; });
    if(t){ OV.cap = cap; opCaption('One moment…'); const got = await wait(fetchNews(t.q)); if(got && got.length && ui.morningNews){ ui.morningNews.sec = ui.morningNews.sec || {}; ui.morningNews.sec.tech = got; } }
  }
  if(tok!==OV.token) return; // you asked for something else meanwhile
  const s = id==='sports' ? opSportsScript() : id==='news' ? opNewsScript('top') : id==='tech' ? opNewsScript('tech') : opBusinessScript();
  if(!opVoiceOn()){ OV.cap = cap; opCaption(s); return; }
  opSay(s, {cap:cap});
};
ACTIONS.opMute = function(){ const w = wakeCfg(); w.voice = w.voice===false; persist('focus'); if(w.voice===false) opStop(); if(overlayOpen('wakeOverlay')) renderWakeOverlayInto(); if(overlayOpen('planOverlay')) renderPlanRevealInto(); };
// the mute lives in the top bar of Good morning and the work preview
function opMuteHtml(){
  const off = wakeCfg().voice===false;
  return '<button class="op-mute-top'+(off?' is-off':'')+'" data-action="opMute" title="'+(off ? 'Turn the Operator’s voice on' : 'Mute the Operator')+'">'+(off ? '&#128263;' : '&#128266;')+'</button>';
}
function opAskHtml(where){
  const chip = function(id, icon, label){ return '<button class="op-ask" data-action="opAsk" data-id="'+id+'">'+icon+' '+label+'</button>'; };
  return '<div class="op-asks">'+

    (where==='work' ? chip('business', '&#128188;', 'Brief me') : chip('sports', '&#127944;', 'Sports')+chip('news', '&#128240;', 'News')+chip('tech', '&#128187;', 'Tech')+chip('business', '&#128188;', 'Business'))+
    aiTalkHtml()+
    '</div>';
}
// the business brief plays by itself when you go straight from Good morning to work
function opAutoBusinessBrief(){ if(!opVoiceOn()) return; setTimeout(function(){ if(overlayOpen('planOverlay')) { opStop(); opSay(opBusinessScript(), {cap:'opBubText'}); } }, 900); }

// ---- choosing the voice (in the alarm settings, under "The Operator's voice") ----
const ELEVEN_VOICES = [['JBFqnCBsd6RMkjVDRZzb', 'George — British, warm (the butler)'], ['onwK4e9ZLuTAKqWW03F9', 'Daniel — British, crisp'], ['nPczCjzI2devNBz1zQrb', 'Brian — deep, American']];
function opLoadMacVoices(){
  if(ui.ttsVoices && ui.ttsVoices.at && Date.now() - ui.ttsVoices.at < 60000) return;
  ui.ttsVoices = {at:Date.now(), list:(ui.ttsVoices && ui.ttsVoices.list) || null};
  fetchWithin(WAKE_HELPER+'tts/voices', 6000).then(function(r){ return r && r.ok ? r.json() : null; }).then(function(j){
    ui.ttsVoices = {at:Date.now(), list: j && Array.isArray(j.voices) ? j.voices : [], down: !j};
    if(document.getElementById('opVoiceSet')) renderView();
  }).catch(function(){ ui.ttsVoices = {at:Date.now(), list:[], down:true}; });
  fetchWithin(WAKE_HELPER+'tts/status', 6000).then(function(r){ return r && r.ok ? r.json() : null; }).then(function(j){ ui.ttsKey = !!(j && j.hasKey); if(document.getElementById('opVoiceSet')) renderView(); }).catch(function(){});
}
function opVoiceSettingsHtml(){
  const w = wakeCfg(), e = opEngine();
  if(e!=='browser') opLoadMacVoices();
  const seg = function(id, label){ return '<button class="seg-tab'+(e===id?' active':'')+'" data-action="opEngineSet" data-id="'+id+'">'+label+'</button>'; };
  // (ElevenLabs is the voice; the Mac's and the browser's are there as backups)
  let body = '';
  if(e==='mac'){
    const vs = (ui.ttsVoices && ui.ttsVoices.list) || [];
    const best = vs.slice().sort(function(a, b){ return opVoiceScore({name:b.n, lang:b.l}) - opVoiceScore({name:a.n, lang:a.l}); }).filter(function(v){ return opVoiceScore({name:v.n, lang:v.l}) > -100; });
    body = '<select class="input" id="opMacVoice"><option value="">System voice (Spoken Content)</option>'+best.map(function(v){ return '<option value="'+escapeHtml(v.n)+'"'+(w.macVoice===v.n?' selected':'')+'>'+escapeHtml(v.n)+' &middot; '+escapeHtml(v.l.replace('_', '-'))+'</option>'; }).join('')+'</select>'+
      '<div class="op-set-help">For a voice that sounds like a person: <b>System Settings → Accessibility → Spoken Content → System voice</b> and pick a Siri voice, or <b>Manage Voices…</b> → English → download <b>Jamie (Premium)</b> or <b>Daniel (Enhanced)</b>. Then choose it here (or leave “System voice”).'+
      (ui.ttsVoices && ui.ttsVoices.down ? '<br><span class="op-set-warn">The Operator app isn’t answering — open Operator from its icon (the newest version) to use the Mac’s voices.</span>' : '')+'</div>';
  } else if(e==='eleven'){
    const known = ELEVEN_VOICES.some(function(v){ return v[0]===w.elevenVoice; });
    body = (ui.ttsKey ? '<div class="op-set-key"><span>&#128274; Key saved on this Mac</span><button class="btn btn-ghost btn-sm" data-action="opElevenForget">Remove key</button></div>'
        : '<div class="op-set-key"><input class="input" type="password" id="opElevenKey" placeholder="ElevenLabs API key" autocomplete="off"><button class="btn btn-sm btn-primary" data-action="opElevenSave">Save key</button></div>')+
      '<select class="input" id="opElevenVoice">'+ELEVEN_VOICES.map(function(v){ return '<option value="'+v[0]+'"'+((w.elevenVoice||ELEVEN_VOICES[0][0])===v[0]?' selected':'')+'>'+v[1]+'</option>'; }).join('')+'<option value="custom"'+(w.elevenVoice && !known ? ' selected' : '')+'>Another voice (paste its ID)…</option></select>'+
      (w.elevenVoice && !known ? '<input class="input" id="opElevenCustom" value="'+escapeHtml(w.elevenVoice)+'" placeholder="Voice ID" style="margin-top:6px;">' : '')+
      '<div class="op-set-help">The most natural voice. Get a key at elevenlabs.io (Profile → API keys). It’s saved by the Operator app on this Mac only — not in Operator’s data, exports or backups. Each line is made once and kept for two days.</div>';
  } else {
    const vs = opBrowserVoices(), cur = opPickVoice();
    body = '<select class="input" id="opBrowserVoice">'+(vs.length ? vs.map(function(v){ return '<option value="'+escapeHtml(v.name)+'"'+(cur && cur.name===v.name?' selected':'')+'>'+escapeHtml(v.name)+'</option>'; }).join('') : '<option>No voices found</option>')+'</select>'+
      '<div class="op-set-help">The browser’s own voices — the simplest, and the most robotic. Premium and Enhanced voices you download on the Mac show up here too.</div>';
  }
  return '<div class="field op-set" id="opVoiceSet"><label>Voice</label>'+opLauncherLineHtml()+
    '<div class="seg-tabs" style="margin:0 0 8px;">'+seg('eleven', 'ElevenLabs')+seg('mac', 'Mac voice')+seg('browser', 'Browser')+'</div>'+body+
    '<div class="op-set-test"><button class="btn btn-sm" data-action="opTest">&#9654; Test the voice</button><span id="opTestCap" class="op-set-cap"></span></div></div>'+aiKeyHtml();
}
function opVoiceChanged(){ OV.voice = null; OV.helperDown = false; OV.broken = false; persist('focus'); }
ACTIONS.opEngineSet = function(el, e, id){ wakeCfg().voiceEngine = id; opStop(); opVoiceChanged(); ui.ttsVoices = null; renderView(); };
ACTIONS.opTest = function(){
  opStop(); opVoiceChanged();
  const name = state.profile.name || '';
  const h = new Date().getHours(), greet = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening';
  const w = wakeCfg(), was = w.voice; w.voice = true;
  opSay(greet+(name ? ', '+name : '')+'. Everything’s in order — your plan is set, and the coffee won’t make itself. Ready when you are.', {cap:'opTestCap'}).then(function(ok){
    w.voice = was;
    if(!ok) showToast('Couldn’t speak — '+(opEngine()==='browser' ? 'no voice is available.' : 'the Operator app didn’t answer.'), {icon:'&#9888;'});
    else if(OV.helperDown && opEngine()!=='browser') showToast('The Operator app didn’t answer, so that was the browser’s voice. Open Operator from its icon to use the '+(opEngine()==='eleven' ? 'ElevenLabs' : 'Mac')+' voice.', {icon:'&#9888;', duration:8000});
  });
};
ACTIONS.opElevenSave = function(){
  const i = document.getElementById('opElevenKey'), v = i ? i.value.trim() : '';
  if(!v){ if(i) i.focus(); return; }
  if(i) i.value = '';
  // straight to the Operator app (it keeps the key in its own file); never into Operator's data
  fetchWithin(WAKE_HELPER+'tts/key?t='+hexUtf8(v), 6000).then(function(r){
    if(r && r.ok){ ui.ttsKey = true; showToast('ElevenLabs key saved on this Mac.', {icon:'&#128274;'}); opVoiceChanged(); renderView(); }
    else opLauncherWhy().then(function(why){ showToast('Couldn’t save the key — '+why, {icon:'&#9888;', duration:10000}); });
  });
};
ACTIONS.opElevenForget = function(){ fetchWithin(WAKE_HELPER+'tts/forget', 6000).then(function(){ ui.ttsKey = false; renderView(); }); };
document.addEventListener('change', function(e){
  const t = e.target; if(!t || !t.id) return;
  const w = wakeCfg();
  if(t.id==='opMacVoice'){ w.macVoice = t.value; opVoiceChanged(); }
  else if(t.id==='opBrowserVoice'){ w.browserVoice = t.value; opVoiceChanged(); }
  else if(t.id==='opElevenVoice'){ if(t.value==='custom'){ w.elevenVoice = w.elevenVoice && !ELEVEN_VOICES.some(function(v){ return v[0]===w.elevenVoice; }) ? w.elevenVoice : 'paste-id'; } else w.elevenVoice = t.value; opVoiceChanged(); renderView(); }
  else if(t.id==='opElevenCustom'){ w.elevenVoice = t.value.replace(/[^0-9a-zA-Z]/g, ''); opVoiceChanged(); }
});

// ============ TALK TO THE OPERATOR ============
// Press the mic (or type), say anything — "what's my day look like", "how am I doing this week",
// "give me a reason to get up" — and it answers out loud. Your words go to Claude through the
// Operator app (the API key lives only in the app's own file on this Mac), with a short summary of
// your day so it knows what it's talking about. It remembers the conversation until you close Operator.
const AI = {busy:false, listening:false, rec:null, model:null, history:[], hasKey:null};
function aiContext(){
  const today = todayStr(), lines = [];
  const plan = typeof todaysPlan==='function' ? todaysPlan() : [];
  const left = plan.filter(function(t){ return t.status!=='done'; }), done = plan.filter(function(t){ return t.status==='done'; });
  const ev = state.calendar.events.filter(function(e){ return e.date===today; });
  const target = state.standards.deepWorkTargetMinutes || 180;
  lines.push('Plan today: '+(left.length ? left.map(function(t){ return t.title; }).join('; ') : 'nothing lined up')+(done.length ? ' (done: '+done.map(function(t){ return t.title; }).join('; ')+')' : '')+'.');
  if(ev.length) lines.push('Calendar: '+ev.map(function(e){ return (e.time ? fmt12Hour(e.time)+' ' : '')+e.title; }).join('; ')+'.');
  lines.push('Deep work today '+fmtDurationLabel(deepWorkMinutesTodayLive())+' (target '+fmtDurationLabel(target)+'), yesterday '+fmtDurationLabel(deepWorkMinutesFor(addDays(today, -1)))+'. Streak '+computeStreak()+' days.');
  const cs = arr(state.business.clients).filter(function(c){ return clientStageActive(c.stage); });
  lines.push('Business: MRR '+money(xpMrr())+(state.profile.revenueGoalMonthly ? ' (goal '+money(state.profile.revenueGoalMonthly)+')' : '')+', '+cs.length+' active clients, '+arr(state.business.pipeline).filter(leadIsOpen).length+' open leads.');
  if(typeof xpSummary==='function'){ const x = xpSummary(); lines.push('Game: level '+x.level+', rank '+x.rank+' "'+RANKS[x.rank].name+'", overall '+x.ovr+' (Business '+x.attrs.BUS.v+', Personal '+x.attrs.PER.v+', Health '+x.attrs.HLT.v+', Discipline '+x.attrs.DIS.v+').'); }
  const wx = typeof wxNow==='function' ? wxNow() : null; if(wx) lines.push('Weather: '+wx.temp+'° and '+wxLabel(wx.code).toLowerCase()+(wx.hi!=null ? ', high '+wx.hi+'°' : '')+'.');
  const nw = ui.morningNews; if(nw && nw.items) lines.push('Headlines: '+arr(nw.items).slice(0, 5).map(function(n){ return sayHeadline(n.title); }).join(' | ')+'.');
  if(nw && nw.sec && nw.sec.tech) lines.push('Tech: '+arr(nw.sec.tech).slice(0, 3).map(function(n){ return sayHeadline(n.title); }).join(' | ')+'.');
  const sp = typeof scoresSpoken==='function' ? scoresSpoken() : ''; if(sp) lines.push('Sports: '+sp);
  return lines.join('\n');
}
function aiSystem(){
  const name = state.profile.name || 'the user', now = new Date();
  return 'You are the Operator — the voice inside '+name+'’s Operator app. Think Jarvis: a calm, sharp, warm butler with a dry wit, '+
    'completely on '+name+'’s side. He is an entrepreneur building his business, and he wants to stay consistent, stay locked in and not slip into brain fog. '+
    'Everything you write is spoken out loud: answer in one to four short sentences with a natural rhythm. No lists, no markdown, no emoji, no headings. '+
    'Be direct and specific to his day; encourage without being cheesy; use his name only now and then. If you don’t know something, say so in a sentence.\n\n'+
    'It is '+now.toLocaleDateString(undefined, {weekday:'long', month:'long', day:'numeric'})+', '+now.toLocaleTimeString(undefined, {hour:'numeric', minute:'2-digit'})+'.\n'+
    'What you know right now:\n'+aiContext();
}
async function aiPickModel(){
  if(AI.model) return AI.model;
  const r = await fetchWithin(WAKE_HELPER+'ai/models', 15000);
  if(!r || !r.ok) return null;
  let j = null; try{ j = await r.json(); }catch(e){}
  const ids = arr(j && j.data).map(function(m){ return m.id; });
  // the newest Sonnet (quick enough to talk to, smart enough to be worth it); the newest of anything if none
  AI.model = ids.find(function(id){ return /sonnet/i.test(id); }) || ids[0] || null;
  return AI.model;
}
async function aiAsk(text, cap){
  text = String(text||'').trim(); if(!text || AI.busy) return;
  AI.busy = true; opStop(); OV.idx = 999; OV.cap = cap; opCaption('…');
  aiUiRefresh();
  try{
    const model = await aiPickModel();
    if(!model){ AI.hasKey = false; opCaption('To talk with me, add an Anthropic API key in Settings → Alarm → The Operator’s voice.'); return; }
    AI.history.push({role:'user', content:text});
    AI.history = AI.history.slice(-12);
    const body = JSON.stringify({model:model, max_tokens:300, system:aiSystem(), messages:AI.history});
    const r = await fetchWithin(WAKE_HELPER+'ai/chat?b='+hexUtf8(body), 50000);
    let j = null; try{ j = r ? await r.json() : null; }catch(e){}
    const reply = j && arr(j.content).filter(function(c){ return c.type==='text'; }).map(function(c){ return c.text; }).join(' ').trim();
    if(!reply){ AI.history.pop(); opCaption(r && r.status===401 ? 'To talk with me, add an Anthropic API key in Settings → Alarm → The Operator’s voice.' : 'I couldn’t reach my brain just now — '+((j && j.error && j.error.message) || 'the Operator app didn’t answer')+'.'); return; }
    AI.history.push({role:'assistant', content:reply});
    if(opVoiceOn()) await opSay(reply, {cap:cap}); else opCaption(reply);
  } finally { AI.busy = false; aiUiRefresh(); }
}
// the mic: Chrome's speech recognition; it stops by itself when you stop talking
function aiCanHear(){ return !!(window.SpeechRecognition || window.webkitSpeechRecognition); }
function aiListen(cap){
  if(AI.listening){ try{ AI.rec.stop(); }catch(e){} return; }
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if(!SR){ aiTypeFocus(); return; }
  opStop();
  const rec = new SR(); AI.rec = rec;
  rec.lang = navigator.language || 'en-US'; rec.interimResults = true; rec.continuous = false;
  let said = '';
  OV.cap = cap;
  rec.onstart = function(){ AI.listening = true; opCaption('Listening…'); aiUiRefresh(); };
  rec.onresult = function(e){ let s = ''; for(let i=0;i<e.results.length;i++) s += e.results[i][0].transcript; said = s; opCaption('“'+s+'”'); };
  rec.onerror = function(e){ AI.listening = false; aiUiRefresh(); opCaption(e && e.error==='not-allowed' ? 'I need the microphone — allow it when Chrome asks (or type instead).' : e && e.error==='no-speech' ? 'Didn’t catch that.' : 'The mic isn’t working — type instead.'); };
  rec.onend = function(){ AI.listening = false; aiUiRefresh(); if(said.trim()) aiAsk(said, cap); };
  try{ rec.start(); }catch(e){ AI.listening = false; aiTypeFocus(); }
}
function aiTypeFocus(){ OV.cap = 'opBubText'; opBubShow(); const i = document.getElementById('opBubInput'); if(i) setTimeout(function(){ i.focus(); }, 60); }
function aiUiRefresh(){
  document.querySelectorAll('.op-talk').forEach(function(b){ b.classList.toggle('is-on', AI.listening); b.classList.toggle('is-busy', AI.busy); });
}
function aiCapFor(){ return 'opBubText'; }
ACTIONS.opTalk = function(el){ OV.cap = 'opBubText'; opBubShow(); aiListen('opBubText'); };
document.addEventListener('keydown', function(e){
  const t = e.target; if(!t || !t.classList || !t.classList.contains('op-type') || e.key!=='Enter') return;
  e.preventDefault(); const v = t.value; t.value = ''; aiAsk(v, aiCapFor(t));
});
function aiTalkHtml(){
  return '<button class="op-talk" data-action="opTalk" title="Talk to the Operator">&#127897;&#65039;</button>';
}
// the key: straight to the Operator app, never into Operator's data
ACTIONS.aiKeySave = function(){
  const i = document.getElementById('aiKey'), v = i ? i.value.trim() : '';
  if(!v){ if(i) i.focus(); return; }
  if(i) i.value = '';
  fetchWithin(WAKE_HELPER+'ai/key?t='+hexUtf8(v), 6000).then(function(r){
    if(r && r.ok){ AI.hasKey = true; AI.model = null; showToast('Anthropic key saved on this Mac. Say hello.', {icon:'&#128274;'}); renderView(); }
    else opLauncherWhy().then(function(why){ showToast('Couldn’t save the key — '+why, {icon:'&#9888;', duration:10000}); });
  });
};
ACTIONS.aiKeyForget = function(){ fetchWithin(WAKE_HELPER+'ai/forget', 6000).then(function(){ AI.hasKey = false; AI.model = null; renderView(); }); };
function aiKeyHtml(){
  if(AI.hasKey==null){ AI.hasKey = false; fetchWithin(WAKE_HELPER+'ai/status', 6000).then(function(r){ return r && r.ok ? r.json() : null; }).then(function(j){ AI.hasKey = !!(j && j.hasKey); if(AI.hasKey && document.getElementById('opVoiceSet')) renderView(); }).catch(function(){}); }
  return '<div class="field op-set"><label>Talk to it'+tip('Press the mic on Good morning, the work preview or the minimal Focus page and just talk. The answers come from Claude; the key is saved by the Operator app on this Mac only — not in Operator’s data, exports or backups.')+'</label>'+
    (AI.hasKey ? '<div class="op-set-key"><span>&#128274; Anthropic key saved on this Mac</span><button class="btn btn-ghost btn-sm" data-action="aiKeyForget">Remove key</button></div>'
      : '<div class="op-set-key"><input class="input" type="password" id="aiKey" placeholder="Anthropic API key (sk-ant-…)" autocomplete="off"><button class="btn btn-sm btn-primary" data-action="aiKeySave">Save key</button></div>')+
    '<div class="op-set-help">Get a key at console.anthropic.com → API keys.</div></div>';
}

// ---- is the Operator launcher there, and is it the new one? (keys, voices and talking need it) ----
const OP_HELPER_NEEDS = 10;
async function opLauncherInfo(){
  const r = await fetchWithin(WAKE_HELPER+'ping', 3000);
  if(!r) return {up:false, v:0};
  let j = null; try{ j = await r.json(); }catch(e){}
  return {up:true, v:Number(j && j.helper)||0};
}
async function opLauncherWhy(){
  const i = await opLauncherInfo();
  if(!i.up) return 'the Operator launcher isn’t running. Quit Operator (⌘Q) and open it from its icon in Applications (not from Chrome).';
  if(i.v < OP_HELPER_NEEDS) return 'an older Operator (launcher v'+i.v+') is still running. Quit Operator fully (⌘Q), make sure only the new Operator app is in Applications, and open it again.';
  return 'the launcher answered but couldn’t write the key. Try again in a moment.';
}
function opLauncherLineHtml(){
  if(!ui.opLauncher){ ui.opLauncher = {checking:true}; opLauncherInfo().then(function(i){ ui.opLauncher = i; if(document.getElementById('opVoiceSet')) renderView(); }); }
  const i = ui.opLauncher;
  if(i.checking) return '';
  if(!i.up) return '<div class="op-set-warn">&#9888; The Operator launcher isn’t running — quit Operator (⌘Q) and open it from its icon. Keys and voices need it.</div>';
  if(i.v < OP_HELPER_NEEDS) return '<div class="op-set-warn">&#9888; An older Operator launcher (v'+i.v+') is running. Quit Operator fully (⌘Q) and open the new one — then the keys will save.</div>';
  return '<div class="op-set-ok">&#10003; Operator launcher v'+i.v+' is running.</div>';
}
