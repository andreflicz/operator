
// ============ IN-APP DIALOGS (round 41) ============
// Operator never uses the browser's own prompt() / confirm() / alert(): they show Chrome's grey bar at
// the top of the window, and the desktop app can't show them at all. These two do the same jobs in the
// app's own style and return a Promise:
//   uiAsk({title, text, value, placeholder, ok})          -> the typed text, or null when cancelled
//   uiConfirm({title, text, ok, danger})                  -> true / false
// Enter confirms, Escape cancels, a click outside cancels.
function uiDialog(opts){
  return new Promise(function(resolve){
    const prev = document.getElementById('uiDialogOverlay'); if(prev) prev.remove();
    const o = document.createElement('div');
    o.id = 'uiDialogOverlay'; o.className = 'overlay ui-dlg-ov';
    const input = opts.input ? '<input class="ui-dlg-in" id="uiDialogInput" type="text" autocomplete="off" spellcheck="false" placeholder="'+escapeHtml(opts.placeholder||'')+'" value="'+escapeHtml(opts.value==null ? '' : String(opts.value))+'">' : '';
    o.innerHTML = '<div class="card ui-dlg" role="dialog" aria-modal="true" aria-labelledby="uiDialogTitle">'+
      '<h3 class="ui-dlg-t" id="uiDialogTitle">'+escapeHtml(opts.title||'')+'</h3>'+
      (opts.text ? '<p class="ui-dlg-p">'+escapeHtml(opts.text)+'</p>' : '')+
      input+
      '<div class="ui-dlg-a"><button class="btn btn-ghost" data-ui-dlg="no">'+escapeHtml(opts.cancel||'Cancel')+'</button>'+
      '<button class="btn '+(opts.danger ? 'ui-dlg-danger' : 'btn-primary')+'" data-ui-dlg="yes">'+escapeHtml(opts.ok||'OK')+'</button></div>'+
      '</div>';
    document.body.appendChild(o);
    const inp = o.querySelector('#uiDialogInput');
    let done = false;
    const finish = function(yes){
      if(done) return; done = true;
      document.removeEventListener('keydown', onKey, true);
      const val = inp ? inp.value : null;
      o.classList.add('is-closing'); setTimeout(function(){ o.remove(); }, 140);
      resolve(opts.input ? (yes ? val : null) : !!yes);
    };
    const onKey = function(e){
      if(e.key==='Escape'){ e.preventDefault(); e.stopPropagation(); finish(false); }
      else if(e.key==='Enter' && !e.shiftKey){ e.preventDefault(); e.stopPropagation(); finish(true); }
    };
    document.addEventListener('keydown', onKey, true);
    o.addEventListener('click', function(e){
      const b = e.target.closest('[data-ui-dlg]');
      if(b){ e.stopPropagation(); finish(b.getAttribute('data-ui-dlg')==='yes'); return; }
      if(e.target===o) finish(false);
    });
    setTimeout(function(){ if(inp){ inp.focus(); inp.select(); } else { const y = o.querySelector('[data-ui-dlg="yes"]'); if(y) y.focus(); } }, 30);
  });
}
function uiAsk(opts){ return uiDialog(Object.assign({input:true, ok:'Save'}, opts||{})); }
function uiConfirm(opts){ return uiDialog(Object.assign({input:false, ok:'OK'}, opts||{})); }
