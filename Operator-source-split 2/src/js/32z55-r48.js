// ============ ROUND 48: FIXES FROM REAL USE ============
// ---- 1. Op's voice ----
//  • Voice profiles apply in live mode too: when the voice (or his brief) changes, his ElevenLabs agent is
//    updated before the next conversation, so James sounds like James.
//  • Mood tags are never spoken: live mode's brief doesn't ask for them, and any that slip through are taken
//    out of what's shown.
//  • When he asks you something, the mic opens for the answer, in push to talk too: it's a conversation.
//  • No "Listening…" text: the light already shows it.
//  • A tap (or a release) that comes before the mic is ready isn't lost: it waits for the mic, so one tap
//    starts and one tap stops. The same words sent twice in a row only go once.
//  • With live mode on, Brain is gone from Settings (the agent's own model answers).
const OP_TAG_RE = /\[\s*mood\s*:[^\]]*\]\s*/gi;
function opNoTags(t){ return String(t || '').replace(OP_TAG_RE, '').replace(/\[(?:humor|excited|concern|stern|sad|neutral)\]\s*/gi, '').trim(); }
function opLiveRules(){ return OP_RULES.split('\n').filter(function(l){ return !/\[mood:/.test(l); }).join('\n')+'\n- Never write tags, stage directions or anything in square brackets. Everything you write is spoken.'; }
function opLiveBase(){ return opPersona()+'\n\n'+opLiveRules(); }
opLivePrompt = (function(base){ return function(){ return opNoTags(base.apply(this, arguments)).split('\n').filter(function(l){ return !/\[mood:/.test(l); }).join('\n')+'\n- Never write tags, stage directions or anything in square brackets.'; }; })(opLivePrompt);
opLiveAgentBody = (function(base){ return function(){ const b = base.apply(this, arguments); try{ b.conversation_config.agent.prompt.prompt = opLiveBase(); }catch(e){} return b; }; })(opLiveAgentBody);
function opLiveVoice(){ const w = typeof wakeCfg==='function' ? wakeCfg() || {} : {}; return w.elevenVoice && w.elevenVoice!=='paste-id' ? w.elevenVoice : 'JBFqnCBsd6RMkjVDRZzb'; }
function opLiveSig(){ const s = opLiveVoice()+'|'+opLiveBase(); let h = 0; for(let i = 0; i < s.length; i++){ h = (h*31 + s.charCodeAt(i)) | 0; } return opAgentId()+':'+h; }
async function opLiveSync(){
  if(!opAgentId() || state.settings.opAgentSig===opLiveSig()) return true;
  const body = {conversation_config:{agent:{prompt:{prompt:opLiveBase()}}, tts:{voice_id:opLiveVoice()}}};
  const r = await fetchWithin(WAKE_HELPER+'tts/agent/update?a='+encodeURIComponent(opAgentId())+'&b='+hexUtf8(JSON.stringify(body)), 20000);
  if(r && r.ok){ state.settings.opAgentSig = opLiveSig(); persist('settings'); return true; }
  return false;
}
OPRT.start = (function(base){ return async function(){ if(OPRT.state==='off'){ try{ await opLiveSync(); }catch(e){} } return base.apply(this, arguments); }; })(OPRT.start);
OPRT.onMsg = (function(base){
  return function(m){
    if(m && m.type==='agent_response' && m.agent_response_event) m.agent_response_event.agent_response = opNoTags(m.agent_response_event.agent_response);
    if(m && m.type==='agent_response_correction' && m.agent_response_correction_event) m.agent_response_correction_event.corrected_agent_response = opNoTags(m.agent_response_correction_event.corrected_agent_response);
    return base.apply(this, arguments);
  };
})(OPRT.onMsg);
// (the voice changed: the agent gets it before the next conversation, and a live one restarts with it)
opVoiceChanged = (function(base){ return function(){ const r = base.apply(this, arguments); if(OPRT.state!=='off') OPRT.stop('voice'); return r; }; })(opVoiceChanged);
// (and every caption, in case a tag slips through anywhere)
opCaption = (function(base){
  return function(txt){
    if(typeof txt==='string'){
      if(/^Listening…/.test(txt)){ if(OV.cap==='opBubText') opBubShow(); return; }
      txt = opNoTags(txt);
    }
    return base.call(this, txt);
  };
})(opCaption);
if(typeof opMeSet==='function') opMeSet = (function(base){ return function(t, wait){ if(/^Listening…/.test(String(t || ''))) return base.call(this, '', wait); return base.apply(this, arguments); }; })(opMeSet);
speakable = (function(base){ return function(t){ return base.call(this, opNoTags(t)); }; })(speakable);
// a question from him opens the mic, in either mode
aiAutoListen = (function(base){
  return function(cap){
    if(opTalkMode()==='ptt' && opOn() && !opHoldBack() && OPRT.state==='off' && !AI.listening && !AI.busy){ const was = state.profile.opTalk; state.profile.opTalk = 'free'; try{ return base.apply(this, arguments); } finally { state.profile.opTalk = was; } }
    return base.apply(this, arguments);
  };
})(aiAutoListen);
// one tap starts, one tap sends (even if the mic was still getting ready)
function opSendSoon(){
  if(AI.sendNow){ AI.sendNow(); return; }
  let n = 0; clearInterval(opSendSoon._t);
  opSendSoon._t = setInterval(function(){ n++; if(AI.sendNow){ clearInterval(opSendSoon._t); AI.sendNow(); } else if(n > 50 || !AI.listening) clearInterval(opSendSoon._t); }, 100);
}
ACTIONS.opLightTap = (function(base){
  return function(){
    if(opOn() && OPRT.state==='off' && AI.listening && !(OPX.pttUsed && Date.now() - OPX.pttUsed < 400)){ opSendSoon(); return; }
    return base.apply(this, arguments);
  };
})(ACTIONS.opLightTap);
opPttUp = function(){
  if(!OPX.ptt) return;
  OPX.ptt = false; OPX.pttUsed = Date.now(); opLightMark();
  if(OPRT.state!=='off'){ OPRT.pttSet(false); return; }
  setTimeout(opSendSoon, 300);
};
// the same words twice in a row go once
aiAsk = (function(base){
  return function(text){
    const t = String(text || '').trim().toLowerCase();
    if(t && OPX.lastAsk && OPX.lastAsk.t===t && Date.now() - OPX.lastAsk.at < 5000) return;
    OPX.lastAsk = {t:t, at:Date.now()};
    return base.apply(this, arguments);
  };
})(aiAsk);
// live mode on: no Brain (the agent's own model answers)
opSettingsHtml = (function(base){
  return function(){
    const h = base.apply(this, arguments);
    if(state.settings.opLive!==true || !opAgentId()) return h;
    const tpl = document.createElement('template'); tpl.innerHTML = h;
    tpl.content.querySelectorAll('.field.op-set').forEach(function(f){ const l = f.querySelector('label'); if(l && /^Brain/.test(l.textContent.trim())) f.remove(); });
    const d = document.createElement('div'); d.appendChild(tpl.content.cloneNode(true)); return d.innerHTML;
  };
})(opSettingsHtml);

// ---- 2. the season is the room, not a box ----
// No "Spooky season" banner on Today. October is decorations around the edges of the app, like a classroom in
// October: paper bunting along the top, paper bats hanging on strings, cobwebs in the corners, jack-o'-lanterns
// on the floor. (Thanksgiving gets leaf bunting; your birthday keeps its line, without the box.)
function holBunting(colors, n){
  let s = '<div class="hx-bunt" aria-hidden="true"><svg viewBox="0 0 1200 34" preserveAspectRatio="none"><path d="M0 3 Q300 22 600 3 T1200 3" fill="none" stroke="rgba(255,255,255,.35)" stroke-width="1.2"/></svg><div class="hx-bunt-f">';
  for(let i = 0; i < n; i++) s += '<i style="--c:'+colors[i % colors.length]+';--y:'+(Math.sin(i/(n - 1)*Math.PI*2)*-9 + 9).toFixed(1)+'px"></i>';
  return s+'</div></div>';
}
function holPumpkin(x, s, face, d){
  return '<svg class="hx-pk" style="left:'+x+'%;--s:'+s+';--dl:'+d+'s" viewBox="0 0 64 58" aria-hidden="true"><path d="M30 10 Q31 3 36 1" stroke="#3E6B2A" stroke-width="3.5" fill="none" stroke-linecap="round"/>'+
    '<ellipse cx="18" cy="34" rx="15" ry="20" fill="#D9661B"/><ellipse cx="46" cy="34" rx="15" ry="20" fill="#D9661B"/><ellipse cx="32" cy="34" rx="16" ry="22" fill="#EE7A22"/>'+
    '<path d="M32 12 Q26 34 32 56 M32 12 Q38 34 32 56" stroke="#C4541A" stroke-width="1.4" fill="none" opacity=".7"/>'+
    (face ? '<g class="hx-pk-glow" fill="#FFD36B"><path d="M20 28 l6 -6 l6 6 z"/><path d="M34 28 l6 -6 l6 6 z"/><path d="M18 38 q14 12 28 0 l-4 3 l-3 -3 l-4 4 l-3 -4 l-4 4 l-3 -4 l-3 3 z"/></g>' : '')+'</svg>';
}
function holWeb(cls){
  return '<svg class="hx-web '+cls+'" viewBox="0 0 120 120" aria-hidden="true"><g stroke="rgba(235,235,255,.32)" stroke-width="1" fill="none">'+
    '<path d="M0 0 L120 110 M0 0 L90 120 M0 0 L120 55 M0 0 L45 120 M0 0 L120 15"/>'+
    [24, 46, 70, 96].map(function(r){ return '<path d="M'+(r*.12)+' '+r+' Q'+(r*.5)+' '+(r*.62)+' '+(r*.7)+' '+(r*.72)+' Q'+(r*.85)+' '+(r*.48)+' '+r+' '+(r*.42)+' Q'+(r*.98)+' '+(r*.2)+' '+r+' '+(r*.1)+'"/>'; }).join('')+
    '</g><g class="hx-spider"><path d="M86 0 V54" stroke="rgba(235,235,255,.35)" stroke-width="1"/><circle cx="86" cy="58" r="5" fill="#1b1622"/><path d="M80 55 l-6 -4 M80 58 l-7 0 M80 61 l-6 4 M92 55 l6 -4 M92 58 l7 0 M92 61 l6 4" stroke="#1b1622" stroke-width="1.6"/></g></svg>';
}
function holHangBat(x, len, d){
  return '<span class="hx-hang" style="left:'+x+'%;--len:'+len+'px;--dl:'+d+'s"><i></i><svg viewBox="0 0 40 18" width="34" height="16"><path d="M20 6 C17 2 12 2 9 5 C7 3 4 3 1 6 C4 7 6 10 7 13 C9 11 12 11 14 13 C16 11 18 11 20 14 C22 11 24 11 26 13 C28 11 31 11 33 13 C34 10 36 7 39 6 C36 3 33 3 31 5 C28 2 23 2 20 6 Z" fill="#17121e"/><circle cx="18" cy="7" r=".9" fill="#FFB347"/><circle cx="22" cy="7" r=".9" fill="#FFB347"/></svg></span>';
}
holFxHtml = (function(base){
  return function(h){
    const sub = state.profile.holidayIntensity==='subtle';
    if(h==='halloween'){
      return holBunting(['#EE7A22', '#17121e', '#9B5DE5', '#EE7A22', '#17121e', '#7CC36B'], 22)+
        holWeb('is-tr')+holWeb('is-bl')+
        '<div class="hx-floor">'+[[36, .9, 1, 0], [41, .6, 0, -1], [60, 1, 1, -2], [65, .65, 1, -.5]].slice(0, sub ? 2 : 4).map(function(p){ return holPumpkin(p[0], p[1], p[2], p[3]); }).join('')+'</div>'+
        '<i class="hx-moon is-small"></i>'+base.apply(this, arguments).replace(/<i class="hx-moon"><\/i>/, '');
    }
    if(h==='thanksgiving') return holBunting(['#C2571A', '#E09A2D', '#8A4E2A', '#F2B33D', '#7A4424'], 22)+base.apply(this, arguments);
    return base.apply(this, arguments);
  };
})(holFxHtml);

// ---- 3. the Client backlog shows the weeks again ----
// Every recurring deliverable has its run of posting weeks in one strip: the three before, this one, the two
// after, each with how many it needs and how many got done (past weeks you missed show it). This week's
// counter and "→ Today" stay right under it. No "Client backlog" title (the tab says it).
function r48WeekStrip(c, d){
  const a = r42Alloc(d), work = r42WorkPost(), now = thisWeekKey(), posts = a.posts.filter(function(p){ return p >= addDays(now, -21) && p <= addDays(now, 14); });
  return '<div class="r48-wks">'+posts.map(function(p){
    const need = a.need[p] || 0, done = Math.min(need, a.fill[p] || 0), past = addDays(p, 6) < todayStr(), full = need && done >= need;
    const st = full ? 'is-done' : past ? (need ? 'is-miss' : 'is-none') : p===work ? 'is-work' : p===now ? 'is-post' : 'is-next';
    const t = r42TaskFor(c, d, p);
    let dots = ''; for(let i = 0; i < Math.min(need, 7); i++) dots += '<i class="'+(i < done ? 'on' : '')+'"></i>';
    return '<button class="r48-wk '+st+'"'+(t ? ' data-action="openTaskEditModal" data-id="'+t.id+'"' : ' tabindex="-1"')+'>'+
      '<small>'+(p===now ? 'Posting now' : p===work ? 'Making now' : fmtDateShort(p))+'</small>'+
      '<b>'+(need ? done+'/'+need : '–')+'</b><span class="r48-dots">'+dots+'</span></button>';
  }).join('')+'</div>';
}
clientBacklogHtml = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    h = h.replace(/<div class="lc-h"><div><div class="lc-t">Client backlog<\/div><\/div><\/div>/, '');
    // a strip of weeks at the top of each recurring deliverable
    mtActiveClients().forEach(function(c){
      arr(c.deliverables).filter(function(d){ return d.recurring; }).forEach(function(d){
        const title = '<b>'+escapeHtml(String(d.title || 'Deliverable'))+'</b><span>'+deliverableMonthCount(d)+'/'+monthlyTargetFor(d)+' this month</span></div>';
        const i = h.indexOf(title); if(i < 0) return;
        const at = i + title.length;
        h = h.slice(0, at)+r48WeekStrip(c, d)+h.slice(at);
      });
    });
    return h.replace(/<div class="kpi-sub" style="padding:6px 2px;">Nothing due this week or next\.<\/div>/g, '');
  };
})(clientBacklogHtml);

// ---- 4. Today: the date is the tile and the day, nothing else ----
thDateHtml = function(){
  const d = new Date();
  return '<div class="th-date r48-date" data-day="'+todayStr()+'">'+
    '<span class="thd-cal"><i>'+d.toLocaleDateString(undefined, {month:'short'}).toUpperCase()+'</i><b>'+d.getDate()+'</b></span>'+
    '<b class="r48-dow">'+d.toLocaleDateString(undefined, {weekday:'long'})+'</b></div>';
};

// ---- 5. Clients & leads: the card is the plan, the touch points and the ads; colour lives in the client ----
function r48PlanName(c){
  const pk = c.packageId ? arr(state.business.packages).find(function(p){ return p.id===c.packageId; }) : null;
  return pk ? pk.name : null;
}
clientCardV2 = (function(base){
  return function(c){
    const tpl = document.createElement('template'); tpl.innerHTML = base.apply(this, arguments);
    const card = tpl.content.querySelector('.cc2'); if(!card) return tpl.innerHTML;
    card.querySelectorAll('.r42-cc-color, .cc2-delivs, .r42-cc-waits').forEach(function(x){ x.remove(); });
    const top = card.querySelector('.cc2-top'), plan = r48PlanName(c);
    if(top){
      const p = document.createElement('div'); p.className = 'r48-plan'+(plan ? '' : ' is-none');
      p.innerHTML = plan ? '<span>Plan</span><b>'+escapeHtml(plan)+'</b>' : '<span>No plan yet</span>';
      top.after(p);
    }
    const d = document.createElement('div'); d.appendChild(tpl.content.cloneNode(true)); return d.innerHTML;
  };
})(clientCardV2);
renderClientModal = (function(base){
  return function(){
    const h = base.apply(this, arguments), c = arr(state.business.clients).find(function(x){ return x.id===ui.showClientModal; });
    if(!h || !c || typeof CLIENT_PALETTE==='undefined') return h;
    const cur = String(clientAccent(c)).toLowerCase();
    const row = '<div class="r48-ccol"><span>Color</span>'+CLIENT_PALETTE.map(function(col){ return '<button type="button" class="r42-sw'+(col.toLowerCase()===cur ? ' is-on' : '')+'" style="background:'+col+'" data-action="r42ClientColor" data-id="'+c.id+':'+col.slice(1)+'" aria-label="'+col+'"></button>'; }).join('')+'</div>';
    // right under the header of the client settings
    const i = h.indexOf('</div>', h.indexOf('class="cm-head') >= 0 ? h.indexOf('class="cm-head') : 0);
    return i > 0 ? h.slice(0, i + 6)+row+h.slice(i + 6) : row+h;
  };
})(renderClientModal);
// (and then simpler still: no tile at all. The date is part of the line above your greeting: OPERATOR · SUNDAY, OCT 25)
thDateHtml = function(){ return ''; };
renderToday = (function(base){
  return function(){
    const h = base.apply(this, arguments), d = new Date();
    const date = d.toLocaleDateString(undefined, {weekday:'long'})+', '+d.toLocaleDateString(undefined, {month:'short', day:'numeric'});
    return h.replace(/<div class="th-biz">([\s\S]*?)<\/div>/, function(m, biz){ return '<div class="th-biz r48-biz">'+biz+'<span class="r48-dt">'+escapeHtml(date)+'</span></div>'; });
  };
})(renderToday);

// ---- 6. the + pop-up is as wide as its choices ----
addPickHtml = (function(base){ return function(){ const n = Math.min(3, (ui.fabMenu || []).length) || 1; return base.apply(this, arguments).replace('<div class="ap-grid', '<div style="--n:'+n+'" class="r48-apg ap-grid'); }; })(addPickHtml);

// ---- 7. the Log center: a card per client with their recent log ----
// Who's due first. Each card: health, when they're due, one tap to log a touch, and what was logged with them
// lately (touches and notes), newest first. No title or explainer (the tab says it).
function r48ClientLog(c){
  const out = [];
  arr(c.touchpoints).forEach(function(t){ const tt = touchTypeById(t.type); out.push({ts:t.ts || Date.parse(t.date+'T12:00') || 0, date:t.date, icon:tt.icon, label:tt.label, note:t.note || ''}); });
  arr(c.journal).forEach(function(j){ out.push({ts:Date.parse(j.createdAt || '') || Date.parse((j.date || '')+'T12:00') || 0, date:j.date, icon:'&#128221;', label:'Note', note:j.text || ''}); });
  return out.sort(function(a, b){ return b.ts - a.ts; }).slice(0, 4);
}
logCenterHtml = function(){
  const today = todayStr();
  const cs = mtActiveClients().map(function(c){
    const n = crmOverdueDays('client', c), hs = clientHealthStatus(c), last = crmLastTouch('client', c);
    return {c:c, n:n, hs:hs, last:last, due:n!=null && n >= 0, score:(n==null ? -99 : n) + (hs.level==='red' ? 3 : hs.level==='yellow' ? 1 : 0)};
  }).sort(function(a, b){ return b.score - a.score; });
  const due = cs.filter(function(x){ return x.due; }).length;
  const card = function(x){
    const c = x.c, logged = x.last===today, log = r48ClientLog(c);
    return '<div class="r48-lc'+(x.due ? ' is-due' : '')+'" style="--cc:'+clientAccent(c)+'" data-key="lc-'+c.id+'">'+
      '<div class="r48-lch"><span class="lc-av" style="background:'+clientColor(c)+'" data-action="openContact" data-kind="client" data-id="'+c.id+'">'+escapeHtml(clientInitials(c))+'</span>'+
        '<span class="r48-lcn" data-action="openContact" data-kind="client" data-id="'+c.id+'"><b>'+escapeHtml(c.business || c.name)+'</b><small><i class="lc-hs is-'+x.hs.level+'"></i>'+escapeHtml(clientHealthLabel(x.hs))+'</small></span>'+
        '<span class="r48-lcd crm-due '+overdueLevel(x.n)+'">'+(logged ? 'Logged today &#10003;' : dueLabel(x.n, 'client', c))+'</span></div>'+
      '<div class="r48-lcb">'+TOUCH_TYPES.map(function(t){ return '<button class="r48-tb" data-action="logTouchType" data-kind="client" data-id="'+c.id+'" data-type="'+t.id+'" title="Log a '+t.label.toLowerCase()+'">'+t.icon+'<span>'+t.label+'</span></button>'; }).join('')+'</div>'+
      '<div class="r48-lcl">'+(log.length ? log.map(function(l){ return '<div class="r48-li"><span class="r48-lii">'+l.icon+'</span><span class="r48-lit"><b>'+escapeHtml(l.label)+'</b>'+(l.note ? ' '+escapeHtml(l.note.length > 90 ? l.note.slice(0, 89)+'…' : l.note) : '')+'</span><span class="r48-lid">'+(l.date===today ? 'today' : l.date ? daysAgoFrom(l.date)+'d' : '')+'</span></div>'; }).join('')
        : '<div class="r48-li is-none">Nothing logged yet</div>')+'</div>'+
    '</div>';
  };
  return '<div class="lc r48-lcw">'+
    '<div class="r48-lck"><span class="'+(due ? 'is-due' : 'is-ok')+'"><b>'+due+'</b> due a touch</span><span><b>'+(cs.length - due)+'</b> in touch</span></div>'+
    (cs.length ? '<div class="r48-lcg">'+cs.map(card).join('')+'</div>' : '<div class="empty">No active clients yet.</div>')+
  '</div>';
};
// (the card, rebuilt: who and what they pay; then three tiles: the plan, touch points, ads; the log button)
clientCardV2 = function(c){
  const active = clientStageActive(c.stage), hs = active ? clientHealthStatus(c) : null, st = crmStage('client', c.stage);
  const plan = r48PlanName(c), last = crmLastTouch('client', c), n = crmOverdueDays('client', c);
  const tp = arr(c.touchpoints).slice().sort(function(a, b){ return (b.ts || 0) - (a.ts || 0); })[0];
  const ads = typeof clientAdTotals==='function' ? clientAdTotals(c.id) : null;
  const tile = function(k, v, sub, cls){ return '<div class="r48-ct'+(cls ? ' '+cls : '')+'"><small>'+k+'</small><b>'+v+'</b>'+(sub ? '<span>'+sub+'</span>' : '')+'</div>'; };
  const lastTxt = last ? (tp ? touchTypeById(tp.type).label+' · ' : '')+(last===todayStr() ? 'today' : daysAgoFrom(last)+'d ago') : 'Never';
  return '<div class="cc2 r48-cc'+(hs ? ' hl-'+hs.level : ' is-inactive')+'" data-key="cc2-'+c.id+'">'+
    '<div class="cc2-top" data-action="openContact" data-kind="client" data-id="'+c.id+'">'+clientAvatarHtml(c, false, false)+
      '<div class="cc2-name"><div class="cc2-title">'+escapeHtml(crmName('client', c))+'</div>'+(crmSubName('client', c) ? '<div class="r48-sub">'+escapeHtml(crmSubName('client', c))+'</div>' : '')+'</div>'+
      (active ? (Number(c.mrr) ? '<span class="cc2-mrr">$'+Number(c.mrr).toLocaleString()+'<span>/mo</span></span>' : '') : '<span class="tag">'+escapeHtml(st ? st.label : 'Inactive')+'</span>')+
    '</div>'+
    '<div class="r48-cts">'+
      tile('Plan', plan ? escapeHtml(plan) : '–', '', plan ? '' : 'is-dim')+
      tile('Touch points', lastTxt, active ? '<em class="crm-due '+overdueLevel(n)+'">'+(last===todayStr() ? 'Logged today' : dueLabel(n, 'client', c))+'</em>' : '')+
      (ads ? tile('Ads · '+ads.days+'d', adsMoney(ads.spend, ads.currency), ads.leads ? ads.leads+' lead'+(ads.leads===1 ? '' : 's')+' · '+adsMoney(ads.spend/ads.leads, ads.currency)+'/lead' : (ads.results ? ads.results+' results' : '')) : '')+
    '</div>'+
    (active ? '<div class="cc2-foot r48-cf"><span class="r48-cfh"><i class="lc-hs is-'+hs.level+'"></i>'+escapeHtml(clientHealthLabel(hs))+'</span><span style="flex:1"></span>'+touchButtonsHtml('client', c)+'</div>'+touchMenuHtml('client', c) : '')+
  '</div>';
};
