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
