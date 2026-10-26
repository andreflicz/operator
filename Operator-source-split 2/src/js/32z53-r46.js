// ============ ROUND 46 (build 6): THE MAC APP ============
// Inside Operator for Mac (window.operatorApp), the page:
//  • hears you through ElevenLabs Scribe (Chrome's speech recognition doesn't exist outside Chrome); the
//    "Hey Operator" ear, which needs it, stays off;
//  • tells the menu bar what to show: your session time while you're locked in, a dot when Op is holding
//    something for you;
//  • has an app card in Settings: open at login, ⌥O, import.
const OPAPP = typeof window!=='undefined' && window.operatorApp && window.operatorApp.isApp ? window.operatorApp : null;
if(OPAPP){
  document.documentElement.classList.add('is-mac-app');
  if(typeof scribeWanted==='function') scribeWanted = function(){ return !!SCR.on; };
  if(typeof aiCanHear==='function') aiCanHear = (function(base){ return function(){ return !!(typeof SCR!=='undefined' && SCR.on); }; })(aiCanHear);
  if(typeof heyOpOn==='function') heyOpOn = function(){ return false; };
  // (no key yet: the mic button says what it needs instead of failing)
  aiListen = (function(base){
    return function(cap){
      if(typeof SCR!=='undefined' && SCR.on===false && !(typeof opLiveOn==='function' && opLiveOn())){ OV.cap = cap || 'opBubText'; opBubShow(); opCaption('To talk out loud in the Mac app, add your ElevenLabs key in Settings → Connections & data → Op’s voice. Typing works now.'); return; }
      return base.apply(this, arguments);
    };
  })(aiListen);
  const opAppStatus = function(){
    try{
      const s = state.focus.activeSession, m = state.modes.active, held = typeof OPX!=='undefined' ? OPX.held.length : 0;
      let label = '', tip = 'Operator';
      if(s){ const mins = Math.floor((Date.now() - s.startedAt)/60000); label = (s.onBreak ? 'Break ' : '')+(mins >= 60 ? Math.floor(mins/60)+'h '+pad2(mins % 60)+'m' : mins+'m'); tip = 'Locked in'; }
      else if(m && m.type==='shooting') label = 'Shooting';
      if(held) label = (label ? label+' ' : '')+'•';
      OPAPP.status({label:label, tip:tip, locked:!!s, opOn:typeof opOn==='function' ? opOn() : true, busy:typeof opBusyNow==='function' && opBusyNow() ? fmtTimeShort(state.focus.opBusyUntil) : ''});
    }catch(e){}
  };
  setInterval(opAppStatus, 5000); setTimeout(opAppStatus, 1500);
  afterRenderHooks.push(function(){ clearTimeout(opAppStatus._t); opAppStatus._t = setTimeout(opAppStatus, 300); });
  // ---- Settings → Connections & data: the app card ----
  operatorAppCardHtml = function(){
    if(ui.opLoginItem==null){ ui.opLoginItem = false; OPAPP.loginItem().then(function(v){ ui.opLoginItem = !!v; if(document.getElementById('opAppCard')) renderView(); }); }
    const ico = (document.querySelector('link[rel=icon]') || {}).href || '';
    return '<div class="card section op-settings r46-app" id="opAppCard"><div class="section-title"><img class="op-app-ico" src="'+ico+'" alt=""> Operator for Mac <span class="kpi-sub">'+escapeHtml(OPAPP.version || '')+'</span></div>'+
      '<div class="r45-row r46-line"><span>Open at login</span><button class="r45-sw'+(ui.opLoginItem ? ' on' : '')+'" data-action="opAppLogin"><span></span></button></div>'+
      '<div class="r45-row r46-line"><span>Show or hide from anywhere</span><kbd class="r46-kbd">⌥ O</kbd></div>'+
      '<div class="r45-row r46-line"><span>Bring data over</span><button class="btn btn-sm" data-action="opAppImport">Import…</button></div>'+
    '</div>';
  };
  // what the menu bar and the app menu can ask the page to do (the page's code is closed off otherwise)
  window.operatorPage = Object.freeze({
    lockIn: function(){ try{ opRunTool('lock_in', {}); }catch(e){} renderView(); },
    lockOut: function(){ if(ACTIONS.openStopFocus) ACTIONS.openStopFocus(); },
    talk: function(){ if(ACTIONS.opTalk) ACTIONS.opTalk(); },
    power: function(){ ACTIONS.opPower(); },
    busy: function(m){ opBusy(Number(m) || 60, 'Busy'); },
    busyEnd: function(){ ACTIONS.opBusyEnd(); },
    settings: function(){ ui.view = 'settings'; renderView(); },
    exportData: function(){ exportData(); },
    importText: function(t){ return importDataFile({text:function(){ return Promise.resolve(String(t)); }}); },
    hasData: function(){ try{ return !!(state.profile && state.profile.name && state.profile.name!=='Operator') || state.tasks.items.length > 0 || state.business.clients.length > 0; }catch(e){ return false; } },
    peek: function(){ return {name:state.profile.name, tasks:state.tasks.items.map(function(t){ return t.title; }), view:ui.view, card:!!document.getElementById('opAppCard')}; }
  });
  ACTIONS.opAppLogin = function(){ OPAPP.setLoginItem(!ui.opLoginItem).then(function(v){ ui.opLoginItem = !!v; renderView(); }); };
  ACTIONS.opAppImport = function(){ OPAPP.importFile(); };
}
