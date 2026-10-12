// ============ OP'S MOODS ============
// Op is white when it's just Op. Now and then it shows a feeling, and the light, its bubble and the
// Good morning dot all take that colour for a while: yellow when it's concerned, red when it's on you
// about not working, violet when it's joking, green when it's excited for you, soft blue when it's sad.
// Moods are rare; most of the time it's white.
const OP_MOODS = {
  neutral:{c:'#ffffff', label:'Op'},
  concern:{c:'#ffcf5a', label:'Concerned'},
  stern:{c:'#ff6262', label:'On you'},
  humor:{c:'#c49bff', label:'Joking'},
  excited:{c:'#5cf0b0', label:'Excited'},
  sad:{c:'#86b4ff', label:'Down'}
};
const OP_MOOD_RE = /^\s*\[(?:mood:)?\s*(neutral|concern|concerned|stern|humor|humour|funny|excited|happy|sad)\s*\]\s*/i;
function opMoodName(m){ m = String(m||'').toLowerCase(); return m==='concerned' ? 'concern' : m==='humour' || m==='funny' ? 'humor' : m==='happy' ? 'excited' : OP_MOODS[m] ? m : 'neutral'; }
// a reply can open with a mood tag, e.g. "[mood:humor] ..." (it's taken off before anything is shown or said)
function opMoodSplit(t){ const m = OP_MOOD_RE.exec(String(t||'')); return m ? {mood:opMoodName(m[1]), text:String(t).slice(m[0].length)} : {mood:null, text:String(t||'')}; }
let opMoodT = null;
function opMoodNow(){ return document.documentElement.getAttribute('data-op-mood') || 'neutral'; }
// hold: how long it lasts once Op has finished speaking (a check-in keeps its mood until it's settled)
function opMood(m, hold){
  m = opMoodName(m);
  clearTimeout(opMoodT);
  if(m==='neutral') document.documentElement.removeAttribute('data-op-mood');
  else document.documentElement.setAttribute('data-op-mood', m);
  if(m!=='neutral' && hold!==Infinity){
    const wait = function(){ opMoodT = setTimeout(function(){ if(typeof OV!=='undefined' && (OV.speaking || OV.pending)) return wait(); if(!ui.opMoodLock) opMood('neutral'); }, hold || 9000); };
    wait();
  }
}

// ============ OP'S GREETINGS: NEVER THE SAME TWICE ============
// With a key, Op writes a fresh one each time, in its own voice; without one, it picks from a list with
// some personality (never the one it used last time).
const OP_GREETS = {
  morning:['Morning, {n}. The world kept spinning without you. Rude, honestly.', 'Good morning, {n}. Rise and shine. Or at least rise.', 'Ah, {n}. Up and about. Let’s see what today brought us.',
    'Morning, {n}. Coffee first, everything else second.', 'Good morning, {n}. You look well rested. I can’t actually see you, but I’m choosing optimism.', 'Morning, {n}. New day, clean slate.',
    'Well, good morning, {n}. The day’s been waiting on you.', 'Morning, {n}. Hope you dreamed about something better than spreadsheets.'],
  work:['Alright, {n}. Office hours.', 'Here we are, {n}. Work mode.', 'Back at the desk, {n}. I’ll pretend I wasn’t counting the minutes.', 'Right then, {n}. Let’s make today look easy.', 'Ah, the office. Welcome back, {n}.'],
  hi:['Yes, {n}?', 'At your service, {n}.', 'Go on, {n}. I’m all ears. Metaphorically.', 'What’s on your mind, {n}?']
};
function opGreetFallback(kind){
  const list = OP_GREETS[kind] || OP_GREETS.hi, n = (state.profile.name || '').split(' ')[0] || 'boss';
  let i = Math.floor(Math.random()*list.length);
  if(list.length > 1 && ui.opLastGreet===kind+i) i = (i + 1) % list.length;
  ui.opLastGreet = kind+i;
  return list[i].replace(/\{n\}/g, n);
}
const OP_GREET_ASK = {
  morning:'It’s the morning and I just woke up. Greet me by name in one short spoken sentence, with personality: a bit of wit or warmth, maybe a nod to the weather, my sleep or the day of the week. Different from any greeting you’ve used. Nothing about work.',
  work:'I just sat down to work. Greet me by name in one short spoken sentence, with personality, different from any greeting you’ve used. Don’t list anything or mention specific tasks.',
  hi:'I just tapped you to talk. Say one very short thing, with personality, that invites me to talk.'
};
async function opGreet(kind, extra){
  if(AI.hasKey===true && typeof aiWrite==='function'){
    const t = await Promise.race([aiWrite(OP_GREET_ASK[kind] + (extra ? ' '+extra : ''), {max:70}), new Promise(function(r){ setTimeout(r, 4000); })]);
    if(t) return t;
  }
  return opGreetFallback(kind);
}
