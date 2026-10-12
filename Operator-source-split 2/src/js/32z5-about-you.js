// ============ SETTINGS → YOU: EVERYTHING ABOUT YOU, IN ONE PLACE ============
// Your world (places, teams and the leagues you follow, interests, the news) and a few questions that make
// the app yours: what to call you, what you're building, how Op should push you and how funny it should
// be, what resets you (those become bubbles on Inspiration), the music you love, and what Op should never
// bring up. Op reads all of it; nothing here leaves the Mac except as context for Op's replies.
function aboutYou(){ const p = state.profile; if(!p.about || typeof p.about!=='object') p.about = {}; return p.about; }
const ABOUT_QS = [
  ['call', 'What should Op call you?', 'e.g. Andre, Dre, boss'],
  ['building', 'What are you building, in a sentence?', 'e.g. a video agency that runs without me'],
  ['why', 'Who or what are you doing it for?', 'e.g. my mom, freedom, proving it to myself'],
  ['perfect', 'What does a perfect day look like?', 'e.g. early gym, four hours of deep work, dinner with friends'],
  ['reset', 'What resets you when you’re fried?', 'e.g. a drive, the beach, cooking, the gym (separate with commas)'],
  ['music', 'Music you love', 'e.g. Frank Ocean, lo-fi, old soul'],
  ['avoid', 'Anything Op should never bring up?', 'e.g. my ex, crypto prices']
];
const ABOUT_SEGS = [
  ['push', 'How should Op push you?', [['gentle', 'Gently'], ['balanced', 'Balanced'], ['tough', 'Tough love']]],
  ['humor', 'How funny should Op be?', [['low', 'Keep it straight'], ['some', 'Some'], ['lots', 'Make me laugh']]],
  ['brief', 'Mornings: how much should Op say?', [['short', 'Short'], ['normal', 'Normal'], ['full', 'Tell me everything']]]
];
function yourWorldHtml(){
  const w = wakeCfg() || {}, a = aboutYou();
  const picked = typeof sportsOn==='function' ? sportsOn().map(function(s){ return s.id; }) : [];
  const leagues = typeof SPORTS!=='undefined' ? SPORTS : [];
  return '<div class="card section yw" id="setYourWorld"><div class="section-title">Your world'+tip('Good morning and Op use these: walks to places you like, your teams’ scores, the news you care about.')+'</div>'+
      '<div class="yw-k">&#127944; Sports you follow</div>'+
      '<div class="yw-leagues">'+leagues.map(function(s){ const on = picked.indexOf(s.id) >= 0; return '<button class="yw-lg'+(on ? ' is-on' : '')+'" data-action="aboutLeague" data-id="'+s.id+'"><span>'+s.icon+'</span>'+escapeHtml(s.label)+'</button>'; }).join('')+'</div>'+
      '<div class="grid grid-2" style="margin-top:12px;">'+
        '<div class="field"><label>Your teams'+tip('They go first on the scoreboard and Op knows them. Separate with commas.')+'</label><input class="input" data-wake="newsSports" placeholder="e.g. Knicks, Giants" value="'+escapeHtml(w.newsSports!=null ? w.newsSports : 'NBA, NFL')+'"></div>'+
        '<div class="field"><label>Places you like</label><input class="input" data-wake="places" placeholder="e.g. a park, a coffee spot" value="'+escapeHtml(w.places||'')+'"></div>'+
        '<div class="field"><label>Interests</label><input class="input" data-wake="newsTech" placeholder="e.g. AI, Apple, marketing" value="'+escapeHtml(w.newsTech!=null ? w.newsTech : 'AI, Apple, startups')+'"></div>'+
        '<div class="field"><label>Business news'+tip('Woven into the headlines with a Business tag. Separate with commas.')+'</label><input class="input" data-wake="newsBiz" placeholder="e.g. markets, startups, marketing" value="'+escapeHtml(w.newsBiz!=null ? w.newsBiz : 'business, markets, startups')+'"></div>'+
        '<div class="field"><label>News topics</label><input class="input" data-wake="newsTopics" placeholder="Top stories" value="'+escapeHtml(w.newsTopics||'')+'"></div>'+
        '<div class="field"><label>Hide news about</label><input class="input" data-wake="newsMute" placeholder="e.g. celebrity" value="'+escapeHtml(w.newsMute!=null ? w.newsMute : 'Wyoming')+'"></div>'+
      '</div></div>'+
    '<div class="card section yw yq"><div class="section-title">Make it yours'+tip('A few things only you can tell it. Op reads these before it talks to you; what resets you shows up on Inspiration. Saved as you type.')+'</div>'+
      '<div class="yq-segs">'+ABOUT_SEGS.map(function(q){ const v = a[q[0]] || q[2][1][0]; return '<div class="field"><label>'+q[1]+'</label><div class="seg-tabs" style="margin:0;">'+q[2].map(function(o){ return '<button class="seg-tab'+(v===o[0] ? ' active' : '')+'" data-action="aboutSeg" data-k="'+q[0]+'" data-id="'+o[0]+'">'+o[1]+'</button>'; }).join('')+'</div></div>'; }).join('')+'</div>'+
      '<div class="grid grid-2 yq-qs">'+ABOUT_QS.map(function(q){ return '<div class="field"><label>'+q[1]+'</label><input class="input" data-about="'+q[0]+'" maxlength="200" placeholder="'+escapeHtml(q[2])+'" value="'+escapeHtml(a[q[0]]||'')+'"></div>'; }).join('')+'</div>'+
    '</div>';
}
ACTIONS.aboutLeague = function(el, e, id){
  const w = wakeCfg(), cur = typeof sportsOn==='function' ? sportsOn().map(function(s){ return s.id; }) : [], i = cur.indexOf(id);
  if(i >= 0){ if(cur.length > 1) cur.splice(i, 1); } else cur.push(id);
  w.sports = cur; if(typeof saveWake==='function') saveWake(); else persist('focus');
  ui.scores = null; renderView();
};
ACTIONS.aboutSeg = function(el){ aboutYou()[el.dataset.k] = el.dataset.id; persist('profile'); renderView(); };
document.addEventListener('input', function(e){
  const k = e.target && e.target.dataset && e.target.dataset.about; if(!k) return;
  aboutYou()[k] = String(e.target.value).slice(0, 200); clearTimeout(ui._aboutT); ui._aboutT = setTimeout(function(){ persist('profile'); }, 400);
});
// what Op reads (a line in its context)
function aboutYouContext(){
  const a = aboutYou(), bits = [];
  if(a.call) bits.push('call him "'+a.call+'"');
  if(a.building) bits.push('he’s building: '+a.building);
  if(a.why) bits.push('he’s doing it for: '+a.why);
  if(a.perfect) bits.push('his perfect day: '+a.perfect);
  if(a.reset) bits.push('what resets him: '+a.reset);
  if(a.music) bits.push('music he loves: '+a.music);
  const push = {gentle:'push him gently and encourage more than you criticise', balanced:'be balanced: honest, supportive, direct when it counts', tough:'tough love: blunt, high standards, no coddling'}[a.push || 'balanced'];
  const humor = {low:'keep humor to a minimum', some:'some humor when it fits', lots:'be genuinely funny, joke often'}[a.humor || 'some'];
  bits.push('how to push him: '+push); bits.push('humor: '+humor);
  if(a.avoid) bits.push('never bring up: '+a.avoid);
  return 'About him, in his own words: '+bits.join('; ')+'.';
}
// what resets you becomes ideas on Inspiration
function aboutResetActs(){
  return String(aboutYou().reset || '').split(',').map(function(x){ return x.trim(); }).filter(Boolean).slice(0, 5).map(function(x, i){
    return {id:'mine'+i, e:'&#10024;', label:x.charAt(0).toUpperCase()+x.slice(1), cat:'mind', pts:2, why:'One of yours. You said it resets you.', mine:true};
  });
}
