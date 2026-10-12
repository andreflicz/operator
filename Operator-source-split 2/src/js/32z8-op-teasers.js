// ============ OP GIVES YOU A TASTE, THEN ASKS ============
// Good morning used to read you everything. Now sports and the news are a taste each: how busy it was and
// the one or two things that matter to *you* (your teams first, then the closest, wildest games; the
// stories that match what you care about), and at the end Op asks if you want more on either. Say yes,
// or name one, and it goes deeper. Nothing you didn't ask for gets piled on.
// It's all built from your own settings (the leagues and teams you follow, your interests, what you're
// building), so it's different for everyone. With an AI key Op says it in its own words.

const TEASE_HOOP = {nba:1, wnba:1, ncaab:1};
// (the same wording all morning: picked by the day, not every time the page draws)
function teasePick(k, xs){ let h = 0; const s = todayStr()+k; for(let i=0;i<s.length;i++) h = (h*31 + s.charCodeAt(i)) >>> 0; return xs[h % xs.length]; }
// the games worth mentioning: yours first, then the close ones (a 3-point NBA game, a 3-point NFL game)
function sportsTeaseFacts(){
  const sc = ui.scores; if(!sc || !sc.got || typeof sportsOn!=='function') return null;
  const now = Date.now(), busy = [], picks = [], soon = [];
  sportsOn().forEach(function(s){
    const games = arr(sc[s.id]);
    const done = games.filter(function(g){ return g.state==='post' && now - g.at < 36*3600000; });
    if(done.length >= 4) busy.push({league:s.label, n:done.length});
    games.filter(function(g){ return g.state==='in'; }).concat(done).forEach(function(g){
      const a = Number(g.home.score), b = Number(g.away.score), m = isFinite(a) && isFinite(b) ? Math.abs(a - b) : 99;
      const close = Math.max(0, 20 - m*(TEASE_HOOP[s.id] ? 1 : 2.5)), ot = /OT|overtime/i.test(g.detail||'') ? 8 : 0;
      picks.push({g:g, league:s.label, fav:isFavGame(g), rank:(isFavGame(g) ? 100 : 0) + close + ot + (g.state==='in' ? 5 : 0), margin:m, ot:!!ot});
    });
    games.filter(function(g){ return g.state==='pre' && isFavGame(g) && g.at - now < 30*3600000; }).forEach(function(g){ soon.push({g:g, league:s.label}); });
  });
  picks.sort(function(a, b){ return b.rank - a.rank; });
  return {busy:busy, picks:picks, soon:soon};
}
function teaseFavSide(g){ const ws = favWords(); const hit = function(t){ return ws.some(function(w){ return [t.name, t.short, t.abbr].some(function(x){ return String(x||'').toLowerCase().indexOf(w) >= 0; }); }); }; return hit(g.home) ? g.home : hit(g.away) ? g.away : null; }
function teaseGameLine(p){
  const g = p.g, mine = p.fav ? teaseFavSide(g) : null;
  if(g.state==='in') return (mine ? 'your '+mine.short+' are playing right now' : 'the '+g.away.short+' and '+g.home.short+' are going right now')+', '+g.away.score+' to '+g.home.score;
  const w = g.home.win ? g.home : g.away, l = g.home.win ? g.away : g.home;
  if(mine && mine===l) return 'your '+l.short+' '+teasePick('l'+g.id, ['fell to', 'lost to', 'came up short against'])+' the '+w.short+', '+w.score+' to '+l.score+(p.ot ? ' in overtime' : '');
  const verb = p.margin <= 3 ? teasePick('v1'+g.id, ['edged', 'squeaked past', 'just got by']) : p.margin <= 10 ? teasePick('v2'+g.id, ['beat', 'got past', 'took down']) : teasePick('v3'+g.id, ['ran past', 'rolled', 'handled']);
  return (mine ? 'your ' : 'the ')+w.short+' '+verb+' the '+l.short+', '+w.score+' to '+l.score+(p.ot ? ' in overtime' : '');
}
function teaseShort(){ const b = (state.profile.about||{}).brief; return b==='short' ? 1 : b==='full' ? 3 : 2; }
// one or two sentences about sports, and what to offer more of
function sportsTease(){
  const f = sportsTeaseFacts(); if(!f) return null;
  const n = teaseShort(), parts = [], topics = [];
  if(f.busy.length){ const b = f.busy.sort(function(a, c){ return c.n - a.n; })[0]; parts.push((b.n >= 7 ? 'The '+b.league+' was packed last night' : 'A busy night in the '+b.league)+'.'); }
  const picks = f.picks.slice(0, Math.min(2, n));
  if(picks.length){
    const cap = function(t){ return t.charAt(0).toUpperCase()+t.slice(1); };
    parts.push((picks[0].fav ? '' : f.busy.length ? 'Best of it: ' : 'The one worth knowing: ')+(picks[0].fav ? cap(teaseGameLine(picks[0])) : teaseGameLine(picks[0]))+'.');
    if(picks[1]) parts.push((picks[1].fav ? 'And ' : picks[0].fav ? 'Elsewhere, ' : 'And ')+teaseGameLine(picks[1])+'.');
    picks.forEach(function(p){ topics.push(p.fav ? 'the '+(p.g.home.win ? p.g.home : p.g.away).short+' game' : 'that '+p.g.away.short+'–'+p.g.home.short+' game'); });
  }
  if(f.soon.length && parts.length < 2){ const s = f.soon[0].g; parts.push('The '+(isFavGame(s) && favWords().some(function(w){ return s.home.name.toLowerCase().indexOf(w)>=0; }) ? s.home.short : s.away.short)+' play '+scoreWhen(s).replace('Today', 'today').replace('Tomorrow', 'tomorrow')+'.'); }
  if(!parts.length) return null;
  return {text:parts.join(' '), topics:topics.length ? topics : ['the games'], facts:f.picks.slice(0, 4).map(function(p){ return p.league+': '+p.g.away.name+' '+p.g.away.score+', '+p.g.home.name+' '+p.g.home.score+' ('+(p.g.detail||p.g.state)+')'+(p.fav ? ' [his team]' : ''); })};
}
// what he cares about, for picking stories: what he's building, his interests, business and tech topics
function teaseInterestWords(){
  const w = typeof wakeCfg==='function' ? wakeCfg() : {}, a = typeof aboutYou==='function' ? aboutYou() : {};
  return [w.newsTech, w.newsBiz, w.newsTopics, a.building, a.perfect].join(',').toLowerCase().split(/[^a-z0-9+#]+/)
    .filter(function(x){ return x.length > 2 && !/^(the|and|for|with|that|this|from|business|news|my|our|without|runs|me|day)$/.test(x); });
}
function newsTease(){
  const nw = ui.morningNews; if(!nw || !nw.items) return null;
  const sec = nw.sec || {}, words = teaseInterestWords();
  const pool = arr(nw.items).map(function(n){ return {n:n, k:'top'}; })
    .concat(arr(sec.tech).map(function(n){ return {n:n, k:'tech'}; }), arr(sec.business).map(function(n){ return {n:n, k:'business'}; }));
  if(!pool.length) return null;
  const score = function(x, i){ const t = (x.n.title||'').toLowerCase(); return words.filter(function(w){ return t.indexOf(w) >= 0; }).length*10 + (x.k!=='top' ? 2 : 0) - i*0.3; };
  // the top story, plus the one that's most *you* (if it isn't the same one)
  const ranked = pool.map(function(x, i){ return {x:x, s:score(x, i)}; }).sort(function(a, b){ return b.s - a.s; });
  const picks = [pool[0]]; const mine = ranked.find(function(r){ return r.x!==pool[0] && r.s > 0; }); if(mine && teaseShort() > 1) picks.push(mine.x);
  const hl = function(x){ return sayHeadline(x.n.title).replace(/[.!?]+$/, ''); };
  const text = picks.length > 1 ? 'Two worth knowing: '+hl(picks[0])+'. And '+(picks[1].k==='tech' ? 'in tech, ' : picks[1].k==='business' ? 'in business, ' : '')+hl(picks[1])+'.' : 'The big one this morning: '+hl(picks[0])+'.';
  return {text:text, topics:picks.map(function(x){ return x.k==='top' ? 'the news' : x.k; }), facts:pool.slice(0, 8).map(function(x){ return '- '+sayHeadline(x.n.title)+(x.k!=='top' ? ' ('+x.k+')' : ''); })};
}
// the last line of Good morning: the offer
function teaseOffer(){
  const s = sportsTease(), n = newsTease();
  if(!s && !n) return null;
  const opts = [];
  if(s) opts.push(s.topics[0]); if(n) opts.push(n.topics[0]==='the news' ? 'the news' : 'that '+n.topics[0]+' story');
  ui.briefOffer = {at:Date.now(), date:todayStr(), sports:s, news:n};
  const q = opts.length > 1 ? 'want more on '+opts[0]+' or '+opts[1]+'?' : 'want more on '+opts[0]+'?';
  // (it ends on the question, so the mic opens for the answer)
  return teasePick('offer', ['That’s the quick version. Do you ', 'That’s the gist. Do you ', 'Anyway, that’s the morning. Do you ', 'That’s all the headlines you need. Do you '])+q;
}
// what Op knows when you answer
function teaseContext(){
  const o = ui.briefOffer; if(!o || o.date!==todayStr() || Date.now() - o.at > 30*60000) return '';
  return 'On Good morning you just gave him a quick taste and offered more on: '+[o.sports && o.sports.topics.join(', '), o.news && o.news.topics.join(', ')].filter(Boolean).join('; ')+'. '+
    (o.sports ? 'The games: '+o.sports.facts.join(' | ')+'. ' : '')+(o.news ? 'The stories:\n'+o.news.facts.join('\n')+'\n' : '')+
    'If he says yes or names one, go a little deeper on just that (three or four spoken sentences), then ask if he wants anything else. If he passes, drop it.';
}
aiContext = (function(base){ return function(){ const t = teaseContext(); return base.apply(this, arguments)+(t ? '\n'+t : ''); }; })(aiContext);

// ---- the mic opens by itself whenever Op asks you something (not mid-narration) ----
opSay = (function(base){
  return function(text, opts){
    opts = opts || {};
    return base(text, opts).then(function(ok){
      if(ok && !opts.noListen && /\?["”’)]*\s*$/.test(String(text||'').trim()) && !OV.userCut && typeof aiAutoListen==='function')
        setTimeout(function(){ if(!AI.busy && !AI.listening && !(OV.speaking || OV.pending)) aiAutoListen(opts.cap || OV.cap || 'opBubText'); }, 350);
      return ok;
    });
  };
})(opSay);
// (the same question can't open the mic twice; a new question always can)
aiAutoListen = (function(base){ return function(cap){ const el = document.getElementById(cap || 'opBubText'), t = el ? el.textContent : ''; if(t && t===AI.autoTxt && Date.now() - (AI.autoAt||0) < 3000) return; AI.autoAt = Date.now(); AI.autoTxt = t; return base(cap); }; })(aiAutoListen);
