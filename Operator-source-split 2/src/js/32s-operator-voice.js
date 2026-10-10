// ============ THE OPERATOR'S VOICE ============
// Good morning is spoken: the Operator greets you, tells you the time, the weather and the day, and
// mentions (never reads) the note you left. The blue line is its captions, word for word as it
// speaks. After that you can ask it for the sports, the news, tech, or a quick business brief —
// and the brief plays by itself when you go straight from Good morning to work.
// It's the Mac's own text-to-speech; what it says is put together from your data (no AI service).
const OV = {speaking:false, pending:false, broken:false, idx:-1, voice:null, cap:null, token:0};
// (if speech never starts — no voices, or the system blocks it — it switches itself off for the session
// and the typed captions take over)
function opVoiceOn(){ return wakeCfg().voice!==false && typeof window.speechSynthesis!=='undefined' && !OV.broken; }
function opPickVoice(){
  if(OV.voice) return OV.voice;
  const vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
  const want = ['Daniel', 'Arthur', 'Oliver', 'Google UK English Male', 'Malcolm', 'Alex', 'Aaron', 'Fred'];
  for(let i=0;i<want.length;i++){ const v = vs.find(function(x){ return x.name.indexOf(want[i])===0; }); if(v){ OV.voice = v; return v; } }
  OV.voice = vs.find(function(x){ return /en[-_]GB/i.test(x.lang); }) || vs.find(function(x){ return /^en/i.test(x.lang); }) || null;
  return OV.voice;
}
if(typeof window.speechSynthesis!=='undefined') speechSynthesis.onvoiceschanged = function(){ OV.voice = null; opPickVoice(); };
// written → spoken: degrees, hours and minutes, symbols
function speakable(t){
  return String(t||'').replace(/&[a-z#0-9]+;/gi, ' ').replace(/(\d+)°/g, '$1 degrees')
    .replace(/(\d+)h (\d+)m\b/g, '$1 hours $2 minutes').replace(/(\d+)h\b/g, '$1 hours').replace(/(\d+)m\b/g, '$1 minutes')
    .replace(/·/g, ',').replace(/\s+/g, ' ').trim();
}
function opCaption(txt){
  const el = OV.cap ? document.getElementById(OV.cap) : null;
  if(el && el.textContent!==txt) el.textContent = txt;
}
// say something; captions follow the words as they're spoken
function opSay(text, opts){
  opts = opts || {};
  return new Promise(function(resolve){
    if(!opVoiceOn()){ resolve(false); return; }
    const said = speakable(text), u = new SpeechSynthesisUtterance(said), tok = ++OV.token;
    const v = opPickVoice(); if(v) u.voice = v;
    u.rate = 1.0; u.pitch = 0.95; u.volume = 1;
    OV.cap = opts.cap || 'brVoice';
    let gotBoundary = false, t0 = 0, est = null;
    OV.pending = true;
    const startTimer = setTimeout(function(){ if(OV.pending && tok===OV.token){ OV.pending = false; OV.broken = true; try{ speechSynthesis.cancel(); }catch(e){} resolve(false); } }, 1500);
    u.onstart = function(){ clearTimeout(startTimer); OV.pending = false; OV.speaking = true; t0 = Date.now(); if(opts.onstart) opts.onstart(); opCaption(''); document.body.classList.add('op-speaking');
      // some voices don't report word boundaries: follow along by time instead
      est = setInterval(function(){ if(gotBoundary || tok!==OV.token) return; const words = said.split(' '), n = Math.min(words.length, Math.floor((Date.now()-t0)/330)+1); opCaption(words.slice(0, n).join(' ')); }, 120); };
    u.onboundary = function(e){ if(tok!==OV.token) return; gotBoundary = true; const end = said.indexOf(' ', e.charIndex + (e.charLength||1)); opCaption(end<0 ? said : said.slice(0, end)); };
    const done = function(ok){ clearTimeout(startTimer); OV.pending = false; clearInterval(est); if(tok===OV.token){ OV.speaking = false; opCaption(said); document.body.classList.remove('op-speaking'); } resolve(ok); };
    u.onend = function(){ done(true); };
    u.onerror = function(e){ if(e && e.error && e.error!=='interrupted' && e.error!=='canceled' && !t0) OV.broken = true; done(false); };
    speechSynthesis.speak(u);
  });
}
function opStop(){ OV.token++; OV.speaking = false; try{ speechSynthesis.cancel(); }catch(e){} document.body.classList.remove('op-speaking'); }
// unlock speech on the "I'm up" click (browsers want a click before anything talks)
function opUnlock(){ if(!opVoiceOn()) return; try{ const u = new SpeechSynthesisUtterance(' '); u.volume = 0; speechSynthesis.speak(u); }catch(e){} opPickVoice(); }

// ---- Good morning, spoken: one line per piece, each piece appears as it's said ----
function opBriefTick(lines, t){
  if(!opVoiceOn() || ui.briefSkipped || !lines.length) return false;
  if(OV.speaking || OV.pending) return true;
  const next = OV.idx + 1; if(next >= lines.length) return true;
  if(t < lines[next].at) return true;
  OV.idx = next;
  const name = state.profile.name || '';
  const text = (next===0 ? 'Good morning'+(name ? ', '+name : '')+'. ' : '')+lines[next].text;
  opSay(text, {cap:'brVoice', onstart:function(){
    // bring the matching piece in now if the clock hasn't got there yet
    const now = Date.now() - (ui.briefT0||0), need = lines[next].at + 380 - now;
    if(need > 0){ ui.briefT0 -= need; ui.briefShift = (ui.briefShift||0) + need; renderWakeOverlayInto(); }
  }});
  return true;
}
function opBriefReset(){ OV.idx = -1; opStop(); }

// ---- what you can ask for ----
function opSportsScript(){
  const s = typeof scoresSpoken==='function' ? scoresSpoken() : '';
  const sec = ui.morningNews && ui.morningNews.sec && ui.morningNews.sec.sports;
  const hl = arr(sec).slice(0, 2).map(function(n){ return n.title; });
  if(!s && !hl.length) return 'I don’t have anything from sports yet this morning.';
  return (s ? s+' ' : '')+(hl.length ? 'In the headlines: '+hl.join('. ')+'.' : '');
}
function opNewsScript(kind){
  const nw = ui.morningNews || {}, list = kind==='tech' ? arr(nw.sec && nw.sec.tech) : arr(nw.items);
  if(!list.length) return kind==='tech' ? 'Nothing new in tech yet.' : 'The news hasn’t come in yet.';
  return (kind==='tech' ? 'In tech this morning. ' : 'Here’s the news. ')+list.slice(0, 3).map(function(n){ return n.title; }).join('. ')+'.';
}
function opBusinessScript(){
  const plan = typeof todaysPlan==='function' ? todaysPlan().filter(function(t){ return t.status!=='done'; }) : [];
  const cs = arr(state.business.clients).filter(function(c){ return clientStageActive(c.stage); });
  const mrr = cs.reduce(function(a, c){ return a + Number(c.mrr||0); }, 0), goal = Number(state.profile.revenueGoalMonthly)||0;
  const open = arr(state.business.pipeline).filter(leadIsOpen), pipe = open.reduce(function(a, p){ return a + Number(p.value||0); }, 0);
  const yDeep = deepWorkMinutesFor(addDays(todayStr(), -1));
  const red = cs.filter(function(c){ return clientHealthStatus(c).level==='red'; }).map(function(c){ return crmName('client', c); });
  const nn = nightNote();
  const parts = [];
  parts.push(plan.length ? 'You’ve got '+plan.length+' thing'+(plan.length===1?'':'s')+' lined up, starting with '+plan[0].title+'.' : 'Nothing’s lined up yet — pick your first move when you lock in.');
  if(nn.work) parts.push('You left yourself a note for before you lock in. It’s on the screen.');
  if(mrr || goal) parts.push('Monthly recurring is '+money(mrr)+(goal ? ', '+Math.round(mrr/goal*100)+' percent of your '+money(goal)+' goal' : '')+'.');
  if(open.length) parts.push(open.length+' open lead'+(open.length===1?'':'s')+(pipe ? ', '+money(pipe)+' in the pipeline' : '')+'.');
  if(red.length) parts.push(red.slice(0, 2).join(' and ')+' could use you today.');
  parts.push(yDeep ? 'Yesterday you put in '+fmtDurationLabel(yDeep)+' of deep work.' : 'No deep work logged yesterday — today’s a clean slate.');
  parts.push('Let’s get to it.');
  return parts.join(' ');
}
ACTIONS.opAsk = function(el, e, id){
  opStop(); OV.idx = 999; // the spoken greeting is done once you ask for something
  const s = id==='sports' ? opSportsScript() : id==='news' ? opNewsScript('top') : id==='tech' ? opNewsScript('tech') : opBusinessScript();
  opSay(s, {cap: overlayOpen('planOverlay') ? 'wiCap' : 'brVoice'});
};
ACTIONS.opMute = function(){ const w = wakeCfg(); w.voice = w.voice===false; persist('focus'); if(w.voice===false) opStop(); if(overlayOpen('wakeOverlay')) renderWakeOverlayInto(); if(overlayOpen('planOverlay')) renderPlanRevealInto(); };
function opAskHtml(where){
  if(typeof window.speechSynthesis==='undefined') return '';
  const on = opVoiceOn();
  const chip = function(id, icon, label){ return '<button class="op-ask" data-action="opAsk" data-id="'+id+'">'+icon+' '+label+'</button>'; };
  return '<div class="op-asks">'+
    '<span class="op-name">The Operator</span>'+
    (where==='work' ? chip('business', '&#128188;', 'Brief me') : chip('sports', '&#127944;', 'Sports')+chip('news', '&#128240;', 'News')+chip('tech', '&#128187;', 'Tech')+chip('business', '&#128188;', 'Business'))+
    '<button class="op-mute" data-action="opMute" title="'+(on ? 'Mute the voice' : 'Turn the voice on')+'">'+(on ? '&#128266;' : '&#128263;')+'</button></div>';
}
// the business brief plays by itself when you go straight from Good morning to work
function opAutoBusinessBrief(){ if(!opVoiceOn()) return; setTimeout(function(){ if(overlayOpen('planOverlay')) { opStop(); opSay(opBusinessScript(), {cap:'wiCap'}); } }, 900); }
