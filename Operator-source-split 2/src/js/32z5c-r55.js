// ============ ROUND 55 ============
// ---- 1. Rank up: every rank says something of its own ----
// What the rank means, what it took (your numbers, how long since the last one), what's ahead, and a line
// worth keeping. Each rank's words only show up when you earn it.
const R55_RANK = [
  null,
  {say:'You stopped waiting to feel ready. This is the rank where showing up stops being an event and starts being who you are. Most people never get here, because most people quit in the first month.',
    q:'Success is the sum of small efforts, repeated day in and day out.', by:'Robert Collier'},
  {say:'You’re not trying things anymore; you’re good at one. Clients can feel it in the work. This is where the reps you didn’t post about start paying rent.',
    q:'I fear not the man who has practiced 10,000 kicks once, but the man who has practiced one kick 10,000 times.', by:'Bruce Lee'},
  {say:'Deals close because you ask, follow up and don’t flinch at the number. Revenue is a decision you keep making. The pipeline answers to you now.',
    q:'Opportunities don’t happen. You create them.', by:'Chris Grosser'},
  {say:'People are counting on you: clients, maybe a team. You set the pace and the standard. The work gets bigger than your own two hands, and that’s the point.',
    q:'A leader is one who knows the way, goes the way, and shows the way.', by:'John C. Maxwell'},
  {say:'You run the field. Systems do what willpower used to. Your week has a shape, your clients have a path, and nothing important depends on you remembering.',
    q:'Discipline equals freedom.', by:'Jocko Willink'},
  {say:'Built to last. You’re making decisions for the business you’ll have in three years, not the week you’re in. The machine runs; you point it.',
    q:'Someone’s sitting in the shade today because someone planted a tree a long time ago.', by:'Warren Buffett'},
  {say:'You own the game you used to play. Money is a tool now, not a scoreboard. The question isn’t whether you can; it’s what’s worth building.',
    q:'Formal education will make you a living; self-education will make you a fortune.', by:'Jim Rohn'},
  {say:'A million a year. Remember the first day you locked in and nobody was watching. This is what every one of those days added up to.',
    q:'The man who moves a mountain begins by carrying away small stones.', by:'Confucius'}
];
rankUpFx = (function(base){
  return function(from, to){
    base.apply(this, arguments);
    const d = document.getElementById('rankFx'); if(!d) return;
    const m = R55_RANK[to], next = RANKS[to + 1], p = state.profile;
    const was = p.rankClaimedAt && p.rankClaimedAt[from], days = was ? Math.max(1, Math.round((Date.now() - Date.parse(was+'T12:00'))/86400000)) : null;
    // the glow sits behind the badge on its own, so nothing clips it
    const bz = d.querySelector('.rfx-badges'); if(bz) bz.insertAdjacentHTML('afterbegin', '<span class="rfx-glow"></span><span class="rfx-wave"></span><span class="rfx-wave is-2"></span>');
    const life = d.querySelector('.rfx-life'), go = d.querySelector('.rfx-go');
    const html = (m ? '<div class="rfx-say">'+escapeHtml(m.say)+'</div>' : '')+
      (days ? '<div class="rfx-days">'+days+' day'+(days===1 ? '' : 's')+' since '+escapeHtml(RANKS[from].name)+'.</div>' : '')+
      (m ? '<figure class="rfx-q"><blockquote>“'+escapeHtml(m.q)+'”</blockquote><figcaption>'+escapeHtml(m.by)+'</figcaption></figure>' : '')+
      (next ? '<div class="rfx-next"><small>Next</small><b>'+escapeHtml(next.name)+'</b><span>Level '+next.level+' · '+money(next.mrr)+' a month · Health '+next.health+'</span></div>' : '<div class="rfx-next is-top"><b>The top.</b><span>There’s no rank above this one.</span></div>');
    if(life) life.insertAdjacentHTML('afterend', html); else if(go) go.insertAdjacentHTML('beforebegin', html);
  };
})(rankUpFx);
