// ============ HARD-CONFIRM: CLEAR JOURNAL ============
function openJournalClearConfirm(){
  armed.delete('resetpart:journal');
  ui.journalClearArmed = false;
  ui.journalClearText = '';
  const o = document.getElementById('journalClearOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderJournalClearModalInto();
}
function closeJournalClearConfirm(){
  ui.journalClearArmed = false;
  ui.journalClearText = '';
  const o = document.getElementById('journalClearOverlay'); if(o) o.classList.add('hidden');
}
function updateJournalClearText(val){
  ui.journalClearText = val;
  const btn = document.querySelector('#journalClearContent [data-action="confirmJournalClearFinal"]');
  if(btn) btn.disabled = val.trim().toUpperCase()!=='DELETE';
}
function renderJournalClearModal(){
  const count = state.journal.entries.length;
  const ready = (ui.journalClearText||'').trim().toUpperCase()==='DELETE';
  return '<div class="section-title" style="margin-bottom:8px;color:var(--danger);">Delete All Journal Entries?</div>'+
    '<div class="kpi-sub" style="margin-bottom:14px;">This permanently erases all '+count+' journal entr'+(count===1?'y':'ies')+'. This can\'t be undone.</div>'+
    '<div class="field"><label>Type DELETE to confirm</label><input class="input" id="journalClearInput" value="'+escapeHtml(ui.journalClearText||'')+'" placeholder="DELETE" style="width:100%;"></div>'+
    '<div class="row" style="margin-top:20px;justify-content:flex-end;">'+
      '<button class="btn btn-ghost" data-action="closeJournalClearConfirm">Cancel</button>'+
      '<button class="btn btn-danger" data-action="confirmJournalClearFinal" '+(ready?'':'disabled')+'>Yes, Delete Everything</button>'+
    '</div>';
}
function renderJournalClearModalInto(){ const el=document.getElementById('journalClearContent'); if(el) el.innerHTML = renderJournalClearModal(); }
function confirmJournalClearFinal(){
  if((ui.journalClearText||'').trim().toUpperCase()!=='DELETE') return;
  resetPart('journal');
  closeJournalClearConfirm();
}

