// ============ ROUND 59 (core) ============
// The list is ROUND-59-LIST.md. This file: Op's read (short, fixed space, at the top), the talk-button cut, App
// updates as Op's summaries (his words folded under them), playbooks as SOPs with one permanent lead playbook, lead
// stage names everywhere, packages by cycle day, every client's own calendar.
const R59 = {hush:0, cut:null};

// ================= A1. Op's read: short enough for three or four lines =================
// The read has a fixed space now (it never grows and pushes the page), so Op writes to fit it: three labelled lines of
// a few words, or one or two short sentences. A read saved before this round that's too long is written again.
const R59_READ_MAX = 220;
opReadKick = function(kind, facts, ask, opts){
  opts = opts || {};
  const st = opReadStore(), cur0 = st[kind], cur = cur0 && String(cur0.text || '').length <= R59_READ_MAX ? cur0 : null;
  const sig = todayStr()+'|'+String(facts).length+'|'+String(facts).slice(0, 80);
  if(!opts.force && cur && (cur.sig===sig || (cur.day===todayStr() && !opts.fresh))) return;
  if(ui['opRead_'+kind] || AI.hasKey===false) return;
  if(!opts.force && ui['opReadFail_'+kind] && Date.now() - ui['opReadFail_'+kind] < 15*60000) return;
  aiKeyCheck(); if(AI.hasKey!==true) return;
  ui['opRead_'+kind] = true;
  const angles = OP_ANGLES[opts.angles || kind.split(':')[0]] || OP_ANGLES.work, angle = angles[Math.floor(Math.random()*angles.length)];
  const prev = (cur0 && cur0.text) || opts.prev;
  const shape = opts.triad
    ? '\nAnswer in exactly three lines, each starting with its label: "Pattern:", "Watch:", "Move:". Each line 9 words at most (it has to fit on one line). Specific to the numbers below. No greeting, no filler.'
    : '\nOne or two short sentences, 30 words at most in all: it has to fit in three lines. Spoken style, specific to the numbers below. No greeting, no filler, no hedging. End with the one move when it fits.';
  const task = ask+'\n\nAngle for this one: '+angle+'.'+(prev ? '\nYour last take was: “'+prev+'”: say something different.' : '')+shape+'\n\nNumbers:\n'+facts;
  aiWrite(task, {max:opts.triad ? 150 : 110}).then(function(t){
    ui['opRead_'+kind] = false;
    if(!t){ ui['opReadFail_'+kind] = Date.now(); document.querySelectorAll('.opi.is-busy[data-opi="'+kind+'"]').forEach(function(el){ el.remove(); }); return; }
    st[kind] = {text:String(t).trim(), sig:sig, day:todayStr(), at:Date.now()}; persist('profile');
    const els = document.querySelectorAll('.opi[data-opi="'+kind+'"]');
    els.forEach(function(el){ el.outerHTML = opReadHtml(kind, null); });
    if(!els.length && !opts.then) renderView();
    if(opts.then) opts.then(t);
  });
};

// ================= A2. Op's read at the top of the page =================
// Finances and Business → Overview had it under the tiles; it goes first, right under the tabs.
function r59ReadFirst(html, opener){
  const i = html.indexOf('<div class="opi '), at = html.indexOf(opener);
  if(i < 0 || at < 0 || i < at) return html;
  // the read is one element: find where it closes
  let depth = 0, j = i;
  const re = /<\/?div\b[^>]*>/g; re.lastIndex = i; let m;
  while((m = re.exec(html))){ depth += m[0][1]==='/' ? -1 : 1; if(depth===0){ j = re.lastIndex; break; } }
  if(j <= i) return html;
  const read = html.slice(i, j), rest = html.slice(0, i)+html.slice(j), k = rest.indexOf(opener) + opener.length;
  return rest.slice(0, k)+read+rest.slice(k);
}
renderPersonal = (function(base){ return function(){ const h = base.apply(this, arguments); return ui.personalTab==='finances' ? r59ReadFirst(h, '<div class="r44">') : h; }; })(renderPersonal);
renderBusiness = (function(base){ return function(){ const h = base.apply(this, arguments); return (ui.businessTab || 'overview')==='overview' ? r59ReadFirst(h, '<div class="hq r53-hq">') : h; }; })(renderBusiness);

// ================= A3. The talk button while Op speaks =================
// What went wrong: his reply only reached the chat after his voice finished. Stopping the voice meant it never
// "finished": the line never showed, the turn hung, and his next line started a new voice. Now a tap stops the voice
// AND lets the turn carry on silently: the line he was saying is written out in full in the chat, whatever he was doing
// still happens, and nothing else is spoken until the turn is over.
const R59_PENDING = [];
opSay = (function(base){
  return function(text, opts){
    if(R59.hush && Date.now() < R59.hush){ try{ if(opts && opts.cap==='opBubText') opCaption(String(text || '')); }catch(e){} r59ShowLine(text); return Promise.resolve(false); }
    const p = base.apply(this, arguments);
    return new Promise(function(res){ const it = {res:res}; R59_PENDING.push(it); Promise.resolve(p).then(function(v){ const k = R59_PENDING.indexOf(it); if(k >= 0) R59_PENDING.splice(k, 1); res(v); }); });
  };
})(opSay);
function r59ShowLine(text){
  const t = String(text || '').trim(); if(!t) return;
  try{ opChatLog('op', t); opChatDraw(); }catch(e){}
  setTimeout(function(){ const b = document.querySelector('#opBub .op-bub-log'); if(b) b.scrollTop = b.scrollHeight; }, 30);
}
r54TalkToggle = (function(base){
  return function(){
    if(OV.speaking || OV.pending){
      const line = R57.lastSaid;
      try{ opStop(); }catch(e){}
      OV.userCut = true; R58.cutAt = Date.now(); AI.closedAt = Date.now();
      R59.hush = Date.now() + 90000;   // quiet for the rest of this turn (cleared when it ends)
      R59_PENDING.splice(0).forEach(function(it){ it.res(false); });   // the turn goes on
      if(line){ r59ShowLine(line); R59.cut = {text:line, at:Date.now()}; }
      return;
    }
    if(R58.cutAt && Date.now() - R58.cutAt < 450){ R58.cutAt = 0; AI.closedAt = 0; R59.hush = 0; }
    return base.apply(this, arguments);
  };
})(r54TalkToggle);
aiAsk = (function(base){
  return function(){
    if(R59.hush && Date.now() - R58.cutAt > 1500) R59.hush = 0;   // a new message: he speaks again
    const r = base.apply(this, arguments);
    Promise.resolve(r).catch(function(){}).then(function(){ R59.hush = 0; });
    return r;
  };
})(aiAsk);

// ================= A4. App updates: Op's summary, his words folded under it =================
// He asked for exact words only so nothing he said would be dropped. What Op files now is a clean summary that covers
// everything he said about it; his own words are kept with it (folded) so nothing is lost.
function r59File(summary, words, at){
  summary = String(summary || '').trim(); words = String(words || '').trim();
  if(!summary && !words) return null;
  const tag = r57UpdateType(), text = summary || words;
  const dup = r58UpdateEntries().find(function(x){ return x.text===text || (words && x.said===words); });
  if(dup){
    if(summary && dup.text!==summary && arr(dup.summaries).indexOf(summary) < 0){ dup.summaries = arr(dup.summaries).concat([summary]); persist('journal'); }
    return {e:dup, isNew:false};
  }
  const e = {id:uid(), date:todayStr(at ? new Date(at) : new Date()), timestamp:at || Date.now(), title:summary.slice(0, 160) || 'Update', text:text.slice(0, 8000), said:words && words!==text ? words.slice(0, 8000) : '', type:'freeform', mood:tag, pinned:false, photos:[], by:'op'};
  state.journal.entries.push(e); persist('journal');
  if(R58.turn) R58.turn.filed = true;
  r57Note(text, 'idea', {full:text+(e.said ? '\n\nWhat you said: “'+e.said+'”' : ''), title:'Saved to App updates', entry:e.id});
  return {e:e, isNew:true};
}
// (a summary written by the app itself when Op says "logged" without filing: one short call, his words as the fallback)
function r59Summarize(words){
  if(typeof aiWrite!=='function' || AI.hasKey!==true) return Promise.resolve('');
  return aiWrite('He said this to you about his app. Write it up as an app update for the developer: what he wants changed or fixed, in clear plain sentences, covering every point he made and nothing he didn\'t. No intro, no quotes.\n\nHe said: “'+words+'”', {max:300}).then(function(t){ return String(t || '').trim(); }).catch(function(){ return ''; });
}
opRunTool = (function(base){
  return function(name, x){
    x = x || {};
    if(name==='suggest_improvement'){
      if(R58.turn) R58.turn.tools.push(name);
      const r = r59File(x.idea || x.summary, R58.turn ? r58Words() : ''); if(!r) throw new Error('nothing to file');
      return r.isNew ? 'filed in App updates (your summary; his words kept with it)' : 'already in App updates';
    }
    if(name==='add_journal' && x.tag && /^updates?$/i.test(String(x.tag).trim())){
      if(R58.turn) R58.turn.tools.push(name);
      const r = r59File(x.text || x.title, R58.turn ? r58Words() : ''); return r && r.isNew ? 'filed in App updates' : 'already in App updates';
    }
    if(name==='mark_update'){
      if(R58.turn) R58.turn.tools.push(name);
      const m = r58Find(x.contains, x.back); if(!m) throw new Error('no message of his matches that');
      const r = r59File(x.summary || '', m.t, m.at); return r.isNew ? 'filed in App updates' : 'that one was already in App updates';
    }
    if(name==='file_updates'){
      if(R58.turn) R58.turn.tools.push(name);
      let n = 0, have = 0; const miss = [];
      arr(x.items).forEach(function(it){ const m = it.contains ? r58Find(it.contains) : null; if(it.contains && !m && !it.summary){ miss.push(it.contains); return; } const r = r59File(it.summary || '', m ? m.t : '', m ? m.at : 0); if(r && r.isNew) n++; else have++; });
      return 'filed '+n+' in App updates'+(have ? ', '+have+' already there' : '')+(miss.length ? '; couldn’t find: '+miss.join(' | ') : '');
    }
    return base.apply(this, arguments);
  };
})(opRunTool);
r57Log = function(text, kind){ if(kind==='idea') return r59File(text, R58.turn ? r58Words() : ''); r57Note(text, kind); };
(function(){
  const d = {
    suggest_improvement:'File a change or fix he asked for in this app, in App updates. idea = a clear, complete write-up of what he wants: every point he made about it, in plain sentences (not his words copied, not a one-liner that drops details). The app keeps his own words with it. One call per separate thing he asked for.',
    mark_update:'File one of his EARLIER messages as an app update (when he says "mark that as an update", or you missed one). contains = a few exact words from that message (or back=1 for his message before this one); summary = your clear, complete write-up of what he wants.',
    file_updates:'File several app updates at once (after he gave you a list and said go, or asked you to log everything you missed). One item each: summary = your clear write-up of that point; contains = a few exact words from the message it came from.'
  };
  OP_TOOLS.forEach(function(t){ if(d[t.name]) t.description = d[t.name]; });
  const fu = OP_TOOLS.find(function(t){ return t.name==='file_updates'; });
  if(fu && fu.input_schema && fu.input_schema.properties && fu.input_schema.properties.items && fu.input_schema.properties.items.items){ fu.input_schema.properties.items.items.required = ['summary']; }
})();
aiSystem = (function(base){
  return function(){
    const s = base.apply(this, arguments);
    if(Array.isArray(s)) s.forEach(function(b){ if(b && typeof b.text==='string' && b.text.indexOf('App updates (his changes and feedback for this app):')===0){
      b.text = 'App updates (his changes and feedback for this app):\n'+
        '- When he asks for a change to the app or gives feedback on it, call suggest_improvement in that same reply, once per separate thing. Write each one up clearly and completely: every point he made, nothing invented. Do not copy his words; the app keeps them with your write-up.\n'+
        '- Never file a message that is only about filing (e.g. "nope, it\'s not there", "did you log it?") or small talk: file what it refers to.\n'+
        '- "Mark that as an update": call mark_update for the message he means.\n'+
        '- If he says he will give you several and to wait until he is done: hold them; when he is done, read the list back (short, numbered), wait for his yes, then call file_updates with every item.\n'+
        '- Never say you logged, marked, saved or added something unless the tool ran in this reply and said so.';
    } });
    return s;
  };
})(aiSystem);
// (the safety net: Op said "logged" and filed nothing: the app writes it up from what he said)
r58File = function(words, summary, at){
  if(summary) return r59File(summary, words, at);
  r59Summarize(words).then(function(t){ r59File(t || words, t ? words : '', at); renderView(); });
  return {isNew:true, pending:true};
};
// App updates: the write-up, and "What you said" folded under it
updateCardHtml = (function(base){
  return function(e){
    const h = base.apply(this, arguments);
    const extra = arr(e.summaries).length ? '<div class="r59-more">'+arr(e.summaries).map(function(s){ return '<p>'+escapeHtml(s)+'</p>'; }).join('')+'</div>' : '';
    const said = e.said ? '<details class="r59-said"><summary>What you said</summary><p>'+escapeHtml(e.said)+'</p></details>' : '';
    return extra || said ? h.replace(/<\/article>$/, extra+said+'</article>') : h;
  };
})(updateCardHtml);
updateCopyText = (function(base){ return function(e){ return base.apply(this, arguments)+(arr(e.summaries).length ? '\n'+arr(e.summaries).join('\n') : '')+(e.said ? '\n(His words: “'+e.said+'”)' : ''); }; })(updateCopyText);
// (Round 58's word-for-word entries become write-ups once: Op's title is the write-up, his words fold under it)
setTimeout(function(){
  try{
    let n = 0;
    r58UpdateEntries().forEach(function(e){
      if(!e.verbatim || e.said!==undefined) return;
      const t = String(e.title || '').trim();
      if(t && t!=='Update' && t!==e.text){ e.said = e.text; e.text = [t].concat(arr(e.summaries)).join('\n'); e.summaries = []; }
      else e.said = '';
      n++;
    });
    if(n) persist('journal');
  }catch(err){}
}, 0);

// ================= B. Playbooks are SOPs =================
// Posting days belong to packages, not playbooks. One playbook is permanent: the lead playbook, which IS the lead
// pipeline (its stages are the Lead Center's, renamed and reordered with them); every open lead is on it. Client
// playbooks are SOPs: several, one picked per client. New playbooks come from the + in the corner only.
// (B5: no posting days in a playbook's guide)
pb57CalHtml = (function(base){ return function(p, st){ return base.apply(this, arguments).replace(/<div class="pb57-post">[\s\S]*?<\/div>/, '').replace(/ is-post/g, ''); }; })(pb57CalHtml);
// (a client's posting days come from their package now; Mon / Wed / Fri until it has days set)
r57PostDays = function(c){ const pk = c && c.packageId ? arr(state.business.packages).find(function(p){ return p.id===c.packageId; }) : null; const d = pk && arr(pk.postDays).length ? pk.postDays : ['1', '3', '5']; return d.map(String); };
// (B6: the permanent lead playbook)
function r59LeadPb(){ return pbAll().find(function(p){ return p.master && pbFor(p)==='lead'; }) || null; }
function r59LeadSync(){
  const all = pbAll(); let P = r59LeadPb(), changed = false;
  if(!P){
    P = all.find(function(p){ return pbFor(p)==='lead' && p.star; }) || all.find(function(p){ return pbFor(p)==='lead'; });
    if(!P){ P = pbNew('lead', 'Lead pipeline', 14, {for:'lead'}); P.stages = []; all.push(P); }
    P.master = true; P.star = true; changed = true;
  }
  const crmL = crmStages('lead').filter(function(s){ return s.kind!=='won' && s.kind!=='lost'; }), cur = pbStages(P);
  const next = crmL.map(function(s){ let st = cur.find(function(x){ return x.crm===s.id; }); if(!st){ st = pb57Stage(s.label, {crm:s.id}); changed = true; } if(st.name!==s.label){ st.name = s.label; changed = true; } return st; });
  cur.forEach(function(st){ if(!st.crm && arr(st.steps).length) next.push(st); });   // (a stage of his own with steps stays, at the end)
  if(next.length!==cur.length || next.some(function(st, i){ return cur[i]!==st; })){ P.stages = next; changed = true; }
  if(P.repeats){ P.repeats = false; changed = true; }
  // every open lead is on it (a lead already on another lead playbook stays there)
  arr(state.business.pipeline).filter(leadIsOpen).forEach(function(l){ if(!l.pb || !l.pb.id || !pbById(l.pb.id)){ try{ pbStart('lead', l, P.id, null, true); changed = true; }catch(e){} } });
  if(changed) pbSave();
  return P;
}
afterRenderHooks.push(function(){ if(R59.syncing) return; R59.syncing = true; try{ const was = JSON.stringify(arr(r59LeadPb() && r59LeadPb().stages).map(function(s){ return s.name; })); r59LeadSync(); if(ui.view==='business' && ui.businessTab==='lifecycle' && was!==JSON.stringify(pbStages(r59LeadPb()).map(function(s){ return s.name; }))) setTimeout(renderView, 0); }catch(e){} R59.syncing = false; });
setTimeout(function(){ try{ r59LeadSync(); }catch(e){} }, 0);
r58Default = (function(base){ return function(kind){ return kind==='lead' ? r59LeadPb() || base.apply(this, arguments) : base.apply(this, arguments); }; })(r58Default);
ACTIONS.r58Star = (function(base){ return function(el, e, id){ const p = pbById(id); if(p && pbFor(p)==='lead') return; return base.apply(this, arguments); }; })(ACTIONS.r58Star);
function r59Locked(){ const p = pbSel && pbSel(); if(p && p.master){ showToast('This one follows your lead pipeline. Change its stages in Setup → Lead pipeline.', {icon:'&#128274;'}); return true; } return false; }
['pb57StageAdd', 'pb57StageDel', 'pb57StageMove'].forEach(function(k){ const b = ACTIONS[k]; if(b) ACTIONS[k] = function(){ if(r59Locked()) return; return b.apply(this, arguments); }; });
ACTIONS.pbDelete = (function(base){ return function(el, e, id){ const p = pbById(id); if(p && p.master){ showToast('The lead playbook stays: it’s your lead pipeline.', {icon:'&#128274;'}); return; } return base.apply(this, arguments); }; })(ACTIONS.pbDelete);
// (B8: the new-playbook sheet: a client SOP; no Clients / Leads choice)
pb6NewHtml = function(){
  const N = ui.pb6New || (ui.pb6New = {for:'client', mirror:true, ends:''}); N.for = 'client';
  const others = pbAll().filter(function(x){ return pbFor(x)==='client'; });
  return asHead('&#9776;', 'New playbook')+
    '<div class="r59-nf"><input class="input r59-nf-n" id="pb6NewName" maxlength="60" placeholder="Name it (Onboarding, VIP care…)" value="'+escapeHtml(N.name || '')+'"></div>'+
    '<div class="r59-nf-row"><span>Stages</span><div class="seg-tabs seg-sm"><button class="seg-tab'+(N.mirror!==false ? ' active' : '')+'" data-action="pb6NewSet" data-id="mirror:1">Your client stages</button><button class="seg-tab'+(N.mirror===false ? ' active' : '')+'" data-action="pb6NewSet" data-id="mirror:0">Start blank</button></div></div>'+
    '<div class="r59-nf-row"><span>When it ends</span><select class="input input-sm" id="pb6NewEnds"><option value="">It ends</option><option value="again"'+(N.ends==='again' ? ' selected' : '')+'>Starts over</option>'+others.map(function(x){ return '<option value="'+x.id+'"'+(N.ends===x.id ? ' selected' : '')+'>On to '+escapeHtml(x.name)+'</option>'; }).join('')+'</select></div>'+
    '<div class="as-f"><button class="btn btn-primary hs-go" data-action="pb6Create">Make it</button></div>';
};
ACTIONS.pb6NewOpen = (function(base){ return function(el, e){ return base.call(this, el, e, 'client'); }; })(ACTIONS.pb6NewOpen);
ACTIONS.pbNew = function(){ ACTIONS.pb6NewOpen(null, null); };
// (no "+ New playbook" buttons on the page: the + in the corner makes one)
renderBusiness = (function(base){
  return function(){
    let h = base.apply(this, arguments);
    if(ui.businessTab!=='lifecycle') return h;
    h = h.replace(/<button class="btn btn-sm btn-primary" data-action="pb6NewOpen"[^>]*>[^<]*<\/button>/g, '');
    return h;
  };
})(renderBusiness);
