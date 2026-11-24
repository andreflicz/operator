// ============ ROUND 44 (build 4c): HOLIDAY TAKEOVERS, AND YOUR BIRTHDAY ============
// For a holiday the whole app changes: its colors, a banner on Today, and (if you want it) something moving
// in the back: bats and fog for Halloween, turkeys and falling leaves for Thanksgiving, snow and lights for
// Christmas, balloons, bunting and confetti on your birthday. Settings → Look & Sound → Appearance:
// Off / Colors only / Colors + animations, Subtle or Full, and your birthday (the app knows how old you are).
// Motion stops by itself when the Mac is set to reduce motion.

function holThanksgiving(y){ const d = new Date(y, 10, 1); const first = (4 - d.getDay() + 7) % 7 + 1; return y+'-11-'+pad2(first + 21); }
function holAge(){ const b = state.profile.birthday; if(!b || !/^\d{4}-\d\d-\d\d$/.test(b)) return null; const t = todayStr(); let a = Number(t.slice(0, 4)) - Number(b.slice(0, 4)); if(t.slice(5) < b.slice(5)) a--; return a; }
function holOrdinal(n){ const s = ['th', 'st', 'nd', 'rd'], v = n % 100; return n+(s[(v - 20) % 10] || s[v] || s[0]); }
function holToday(d){
  d = d || todayStr(); const y = Number(d.slice(0, 4)), md = d.slice(5), p = state.profile;
  if(p.birthday && /^\d{4}-\d\d-\d\d$/.test(p.birthday) && p.birthday.slice(5)===md) return 'birthday';
  if(md >= '10-24' && md <= '10-31') return 'halloween';
  const tg = holThanksgiving(y), mon = startOfWeekStr(tg); if(d >= mon && d <= addDays(mon, 6)) return 'thanksgiving';
  if(md >= '12-18' && md <= '12-26') return 'christmas';
  return null;
}
function holMode(){ const m = state.profile.holidayMode; return m==='off' || m==='colors' ? m : 'fx'; }
function holActive(){ if(ui.holPreview) return ui.holPreview; if(holMode()==='off') return null; return holToday(); }
const HOL = {
  halloween:{k:'Spooky season', h:function(n){ return 'Scary-good week, '+n+'.'; }},
  thanksgiving:{k:'Thanksgiving week', h:function(){ return 'Grateful, and still ahead.'; }},
  christmas:{k:'Merry Christmas', h:function(){ return 'Close the year strong.'; }},
  birthday:{k:'It’s your day', h:function(n){ const a = holAge(); return a ? 'Happy '+holOrdinal(a)+', '+n+'.' : 'Happy birthday, '+n+'.'; }}
};
// the moving layer
function holFxHtml(h){
  const R = function(i, m){ return ((i*9301 + 49297) % 233280)/233280*m; };   // fixed "random" so it doesn't jump on re-render
  const many = function(n, f){ let s = ''; for(let i = 0; i < n; i++) s += f(i); return s; };
  const sub = state.profile.holidayIntensity==='subtle', k = sub ? .5 : 1;
  if(h==='halloween') return '<i class="hx-moon"></i><i class="hx-fog"></i><i class="hx-fog is-2"></i>'+many(Math.round(7*k), function(i){
    return '<svg class="hx-bat" style="--t:'+(8 + R(i, 60)).toFixed(0)+'%;--d:'+(14 + R(i + 3, 10)).toFixed(1)+'s;--dl:-'+R(i + 7, 20).toFixed(1)+'s;--s:'+(.6 + R(i + 1, .7)).toFixed(2)+'" viewBox="0 0 40 18" width="44" height="20" aria-hidden="true"><path d="M20 9 q-5 -9 -10 -3 q-4 -5 -10 1 q6 0 8 6 q3 -4 6 -2 q3 -3 6 3 q3 -6 6 -3 q3 -2 6 2 q2 -6 8 -6 q-6 -6 -10 -1 q-5 -6 -10 3z"/></svg>'; });
  if(h==='thanksgiving') return '<i class="hx-warm"></i>'+many(Math.round(16*k), function(i){ return '<i class="hx-leaf" style="--x:'+R(i, 100).toFixed(1)+'%;--d:'+(9 + R(i + 2, 8)).toFixed(1)+'s;--dl:-'+R(i + 5, 14).toFixed(1)+'s;--c:'+['#C2571A', '#E09A2D', '#8C3B12', '#D9822B'][i % 4]+';--r:'+(R(i + 9, 400) - 200).toFixed(0)+'deg"></i>'; })+
    holTurkey('', 'left:-140px;bottom:10px;--d:34s;--dl:-4s')+(sub ? '' : holTurkey('', 'left:-140px;bottom:6px;--d:42s;--dl:-23s;scale:.72'));
  if(h==='christmas') return '<svg class="hx-lights" viewBox="0 0 1200 40" preserveAspectRatio="none" aria-hidden="true"><path d="M0 6 Q75 34 150 6 T300 6 T450 6 T600 6 T750 6 T900 6 T1050 6 T1200 6" fill="none" stroke="#244232" stroke-width="2"/>'+many(24, function(i){ return '<circle class="hx-bulb" cx="'+(25 + i*50)+'" cy="'+(i % 2 ? 15 : 19)+'" r="5" fill="'+['#E8484F', '#F2C94C', '#5FD49A'][i % 3]+'" style="--dl:'+((i % 3)*.6).toFixed(1)+'s"/>'; })+'</svg>'+
    many(Math.round(60*k), function(i){ return '<i class="hx-snow" style="--x:'+R(i, 100).toFixed(1)+'%;--d:'+(8 + R(i + 4, 10)).toFixed(1)+'s;--dl:-'+R(i + 8, 16).toFixed(1)+'s;--z:'+(3 + Math.round(R(i + 1, 3)))+'px;--o:'+(.35 + R(i + 6, .5)).toFixed(2)+'"></i>'; });
  if(h==='birthday') return '<svg class="hx-strm" viewBox="0 0 1200 60" preserveAspectRatio="none" aria-hidden="true"><path d="M0 4 Q50 40 100 6 T200 6 T300 6 T400 6 T500 6 T600 6 T700 6 T800 6 T900 6 T1000 6 T1100 6 T1200 6" fill="none" stroke="#FF8FB1" stroke-width="3"/></svg>'+
    '<div class="hx-flags">'+many(16, function(i){ return '<i style="--c:'+['#FF5A8A', '#FFC83D', '#7EE0FF', '#B5E06A', '#C58FFF'][i % 5]+'"></i>'; })+'</div>'+
    many(Math.round(8*k), function(i){ return '<span class="hx-bal" style="--x:'+(4 + R(i, 92)).toFixed(1)+'%;--d:'+(13 + R(i + 2, 7)).toFixed(1)+'s;--dl:-'+R(i + 5, 14).toFixed(1)+'s;--c:'+['#FF5A8A', '#FFE066', '#7EE0FF', '#FF8FB1', '#C58FFF', '#B5E06A'][i % 6]+'"><i></i></span>'; })+
    many(Math.round(26*k), function(i){ return '<i class="hx-cf" style="--x:'+R(i, 100).toFixed(1)+'%;--d:'+(5 + R(i + 3, 5)).toFixed(1)+'s;--dl:-'+R(i + 6, 9).toFixed(1)+'s;--c:'+['#FF8FB1', '#8FDCFF', '#FFC83D', '#B5E06A', '#C58FFF'][i % 5]+';--r:'+(90 + R(i + 1, 600)).toFixed(0)+'deg"></i>'; });
  return '';
}
function holTurkey(cls, style){
  return '<svg class="hx-tk '+cls+'" style="'+style+'" viewBox="0 0 120 110" width="110" height="100" aria-hidden="true"><g class="hx-tail"><path d="M60 62 L18 18 Q30 8 42 14 Z" fill="#C2571A"/><path d="M60 62 L40 6 Q54 0 62 8 Z" fill="#E09A2D"/><path d="M60 62 L64 4 Q78 2 82 12 Z" fill="#8C3B12"/><path d="M60 62 L88 10 Q100 14 100 26 Z" fill="#D9822B"/><path d="M60 62 L106 34 Q112 46 104 54 Z" fill="#C2571A"/><path d="M60 62 L14 36 Q8 48 16 56 Z" fill="#E09A2D"/></g>'+
    '<ellipse cx="60" cy="70" rx="26" ry="24" fill="#6B3A1E"/><ellipse cx="60" cy="74" rx="16" ry="15" fill="#8A4E2A"/><g class="hx-head"><circle cx="60" cy="42" r="12" fill="#7A4424"/><circle cx="55" cy="40" r="2.4" fill="#fff"/><circle cx="65" cy="40" r="2.4" fill="#fff"/><circle cx="55.5" cy="40.5" r="1.2" fill="#111"/><circle cx="65.5" cy="40.5" r="1.2" fill="#111"/><path d="M57 45 L63 45 L60 50 Z" fill="#F2B33D"/><path d="M61 47 q4 3 1 10 q-4 -2 -3 -8 z" fill="#E8484F"/></g>'+
    '<path d="M50 92 l-3 12 M47 104 l-5 2 M47 104 l2 4 M70 92 l3 12 M73 104 l5 2 M73 104 l-2 4" stroke="#F2B33D" stroke-width="3" stroke-linecap="round" fill="none"/></svg>';
}
// apply: the colors on <html>, the moving layer behind everything
function holApply(){
  const h = holActive(), root = document.documentElement, fx = h && (ui.holPreview ? true : holMode()==='fx');
  if(h) root.setAttribute('data-holiday', h); else root.removeAttribute('data-holiday');
  let layer = document.getElementById('holFx');
  if(!h || !fx){ if(layer) layer.remove(); return; }
  const sig = h+'|'+(state.profile.holidayIntensity || 'full');
  if(layer && layer.dataset.sig===sig) return;
  if(!layer){ layer = document.createElement('div'); layer.id = 'holFx'; layer.className = 'hol-fx'; layer.setAttribute('aria-hidden', 'true'); document.body.insertBefore(layer, document.body.firstChild); }
  layer.dataset.sig = sig; layer.innerHTML = holFxHtml(h);
}
afterRenderHooks.push(function(){ try{ holApply(); }catch(e){} });
// the banner on Today
renderToday = (function(base){
  return function(){
    const h = base.apply(this, arguments), hol = holActive(); if(!hol) return h;
    const H = HOL[hol], name = (state.profile.name || '').split(' ')[0] || 'you';
    const ban = '<div class="hol-ban is-'+hol+'"><span class="hol-k">'+escapeHtml(H.k)+'</span><b>'+escapeHtml(H.h(name))+'</b>'+(hol==='birthday' && holAge() ? '<small>'+holAge()+' today</small>' : '')+(hol==='birthday' ? '<svg class="hol-hat" viewBox="0 0 60 70" width="46" height="54" aria-hidden="true"><path d="M30 4 L52 62 L8 62 Z" fill="#C58FFF"/><path d="M19 33 L41 33 M14 47 L46 47" stroke="#FFC83D" stroke-width="5"/><circle cx="30" cy="5" r="6" fill="#FF5A8A"/><ellipse cx="30" cy="63" rx="24" ry="5" fill="#9B6BE0"/></svg>' : '')+'</div>';
    const at = h.indexOf('</div>', h.indexOf('class="view-header'));
    return at > 0 ? h.slice(0, at + 6)+ban+h.slice(at + 6) : ban+h;
  };
})(renderToday);
// Settings → Appearance
themeSettingsHtml = (function(base){
  return function(){
    const m = holMode(), it = state.profile.holidayIntensity==='subtle' ? 'subtle' : 'full', b = state.profile.birthday || '', age = holAge();
    const seg = function(cur, list, act){ return '<div class="r43-seg">'+list.map(function(o){ return '<button type="button" class="'+(cur===o[0] ? 'is-on' : '')+'" data-action="'+act+'" data-id="'+o[0]+'">'+o[1]+'</button>'; }).join('')+'</div>'; };
    return base.apply(this, arguments)+'<div class="section hol-set"><div class="section-title">Holiday themes</div>'+
      seg(m, [['off', 'Off'], ['colors', 'Colors only'], ['fx', 'Colors + animations']], 'holMode')+
      (m==='fx' ? '<div class="hol-row"><span>Intensity</span>'+seg(it, [['subtle', 'Subtle'], ['full', 'Full']], 'holIntensity')+'</div>' : '')+
      '<div class="hol-row"><span>Your birthday</span><input class="input" type="date" id="holBirthday" value="'+escapeHtml(b)+'">'+(age!=null ? '<em>you’re '+age+'</em>' : '')+'</div>'+
      '<div class="hol-row"><span>Preview</span><div class="hol-prev">'+[['halloween', 'Halloween'], ['thanksgiving', 'Thanksgiving'], ['christmas', 'Christmas'], ['birthday', 'Birthday']].map(function(o){ return '<button type="button" class="'+(ui.holPreview===o[0] ? 'is-on' : '')+'" data-action="holPreview" data-id="'+o[0]+'">'+o[1]+'</button>'; }).join('')+'</div></div></div>';
  };
})(themeSettingsHtml);
ACTIONS.holMode = function(el, e, id){ state.profile.holidayMode = id; persist('profile'); renderView(); };
ACTIONS.holIntensity = function(el, e, id){ state.profile.holidayIntensity = id; persist('profile'); renderView(); };
ACTIONS.holPreview = function(el, e, id){ ui.holPreview = ui.holPreview===id ? null : id; renderView(); if(ui.holPreview) showToast('Previewing '+id+'. Tap it again to stop.', {icon:'&#127881;'}); };
document.addEventListener('change', function(e){ if(e.target && e.target.id==='holBirthday'){ state.profile.birthday = e.target.value || null; persist('profile'); renderView(); } });
