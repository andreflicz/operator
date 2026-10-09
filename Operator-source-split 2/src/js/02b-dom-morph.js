
// ============ DOM MORPH (in-place re-render) ============
// Every action re-renders by building an HTML string. Swapping that string in with
// innerHTML throws away the whole subtree: entry animations replay from opacity 0 (the
// app-wide black flash), images re-decode, inner scroll positions jump to the top, and
// half-typed form fields reset. morphInto() instead patches the live DOM to match the new
// markup, so only the nodes whose content actually changed are touched.
//
// Matching: children are paired by key (id, data-key, data-task-id, or data-action+data-id)
// and otherwise by position + tag name. Form fields:
//  - default mode (views): the live value is synced to the new markup, except for the
//    field that currently has focus, so typing is never clobbered by a background re-render.
//  - opts.form (modals): a field the user has edited keeps their value as long as the
//    markup's own default for it didn't change — re-rendering a modal (e.g. toggling a
//    chip) no longer wipes edits made to other fields.
// data-selected is skipped because scroll pickers keep their live selection there.
const MORPH_SKIP_ATTRS = { 'data-selected': true };
// Classes scripts add at runtime (carousel arrows and edge fades). A re-render keeps them so
// nothing blinks off for a frame; the carousel's own update corrects them right after.
const MORPH_STICKY_CLASSES = ['can-prev', 'can-next', 'fade-l', 'fade-r'];
function withStickyClasses(oldN, value){
  let v = value;
  for(let i=0;i<MORPH_STICKY_CLASSES.length;i++){ const c = MORPH_STICKY_CLASSES[i]; if(oldN.classList.contains(c) && (' '+v+' ').indexOf(' '+c+' ')<0) v += ' '+c; }
  return v;
}
function morphKey(node){
  if(node.nodeType!==1) return null;
  if(node.id) return '#'+node.id;
  const dk = node.getAttribute('data-key'); if(dk) return 'k:'+dk;
  const tk = node.getAttribute('data-task-id'); if(tk) return 't:'+tk;
  const did = node.getAttribute('data-id'), act = node.getAttribute('data-action');
  if(did && act) return 'a:'+act+':'+did;
  return null;
}
function morphInto(container, html, opts){
  if(!container) return;
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  morphChildren(container, tpl.content, opts||{});
}
function morphChildren(oldParent, newParent, opts){
  const oldNodes = Array.prototype.slice.call(oldParent.childNodes);
  const newNodes = Array.prototype.slice.call(newParent.childNodes);
  const keyed = {};
  oldNodes.forEach(function(n){ const k = morphKey(n); if(k && !keyed[k]) keyed[k] = n; });
  const used = new Set();
  let ptr = 0;
  for(let i=0;i<newNodes.length;i++){
    const nn = newNodes[i];
    const k = morphKey(nn);
    let match = null;
    if(k && keyed[k] && !used.has(keyed[k]) && keyed[k].nodeName===nn.nodeName){
      match = keyed[k];
    } else if(!k){
      while(ptr<oldNodes.length && (used.has(oldNodes[ptr]) || morphKey(oldNodes[ptr]))) ptr++;
      // Something new appearing above (a pop-up, the selection bar) shifts every later sibling by
      // one. Matching purely by position would then morph each section into the next one — the
      // whole page rebuilds and flickers. So look a few nodes ahead for the same element first,
      // and don't reuse a node that a later new sibling is clearly the twin of.
      const cls = nn.nodeType===1 ? nn.getAttribute('class') : null;
      let pick = -1;
      if(nn.nodeType===1){
        for(let j=ptr, seen=0; j<oldNodes.length && seen<4; j++){
          const o = oldNodes[j]; if(used.has(o) || morphKey(o)) continue; seen++;
          if(o.nodeType===1 && o.nodeName===nn.nodeName && o.getAttribute('class')===cls){ pick = j; break; }
        }
      }
      if(pick>=0){ match = oldNodes[pick]; if(pick===ptr) ptr++; }
      else {
        const cand = oldNodes[ptr];
        if(cand && cand.nodeType===nn.nodeType && cand.nodeName===nn.nodeName){
          let twinLater = false;
          if(cand.nodeType===1){
            const cc = cand.getAttribute('class');
            for(let j=i+1; j<newNodes.length && j<=i+4; j++){ const f = newNodes[j]; if(f.nodeType===1 && !morphKey(f) && f.nodeName===cand.nodeName && f.getAttribute('class')===cc){ twinLater = true; break; } }
          }
          if(!twinLater){ match = cand; ptr++; }
        }
      }
    }
    const ref = oldParent.childNodes[i] || null;
    if(match){
      used.add(match);
      morphNode(match, nn, opts);
      if(match!==ref) oldParent.insertBefore(match, ref);
    } else {
      oldParent.insertBefore(nn, ref);
    }
  }
  while(oldParent.childNodes.length>newNodes.length) oldParent.removeChild(oldParent.lastChild);
}
function morphNode(oldN, newN, opts){
  if(oldN.nodeType===3 || oldN.nodeType===8){
    if(oldN.nodeValue!==newN.nodeValue) oldN.nodeValue = newN.nodeValue;
    return;
  }
  if(oldN.nodeType!==1) return;
  // Self-managed widgets (the board canvas) own their subtree; leave it untouched.
  if(oldN.hasAttribute('data-morph-ignore') && newN.getAttribute && newN.getAttribute('data-morph-ignore')===oldN.getAttribute('data-morph-ignore')) return;
  const tag = oldN.nodeName;
  const isField = tag==='INPUT' || tag==='TEXTAREA' || tag==='SELECT';
  const snap = isField ? fieldSnapshot(oldN) : null;
  // attributes
  const oldAttrs = oldN.attributes, newAttrs = newN.attributes;
  for(let i=oldAttrs.length-1;i>=0;i--){
    const name = oldAttrs[i].name;
    if(MORPH_SKIP_ATTRS[name]) continue;
    if(!newN.hasAttribute(name)) oldN.removeAttribute(name);
  }
  for(let i=0;i<newAttrs.length;i++){
    const a = newAttrs[i];
    if(MORPH_SKIP_ATTRS[a.name] && oldN.hasAttribute(a.name)) continue;
    const val = a.name==='class' && oldN.classList.length ? withStickyClasses(oldN, a.value) : a.value;
    if(oldN.getAttribute(a.name)!==val) oldN.setAttribute(a.name, val);
  }
  if(tag==='TEXTAREA'){
    const newDefault = newN.value;
    if(oldN.defaultValue!==newDefault) oldN.defaultValue = newDefault;
    restoreField(oldN, snap, newDefault, opts);
    return;
  }
  morphChildren(oldN, newN, opts);
  if(isField) restoreField(oldN, snap, tag==='INPUT' ? newN.getAttribute('value') : selectDefault(newN), opts, newN);
}
function selectDefault(sel){
  const opt = sel.querySelector('option[selected]') || sel.querySelector('option');
  return opt ? opt.value : '';
}
function fieldSnapshot(el){
  const tag = el.nodeName;
  if(tag==='SELECT') return { value:el.value, def:selectDefault(el) };
  if(tag==='INPUT' && (el.type==='checkbox' || el.type==='radio')) return { checked:el.checked, def:el.hasAttribute('checked') };
  if(tag==='INPUT' && el.type==='file') return null;
  return { value:el.value, def: tag==='TEXTAREA' ? el.defaultValue : el.getAttribute('value') };
}
function restoreField(el, snap, newDefault, opts, newN){
  if(!snap) return;
  const focused = document.activeElement===el;
  const isCheck = el.nodeName==='INPUT' && (el.type==='checkbox' || el.type==='radio');
  if(isCheck){
    const newChecked = newN ? newN.hasAttribute('checked') : snap.def;
    const dirty = snap.checked!==snap.def;
    const keep = focused || (opts.form && dirty && newChecked===snap.def);
    el.checked = keep ? snap.checked : newChecked;
    return;
  }
  const want = newDefault==null ? '' : newDefault;
  const dirty = snap.value!==(snap.def==null ? '' : snap.def);
  const keep = focused || (opts.form && dirty && (newDefault==null ? '' : newDefault)===(snap.def==null ? '' : snap.def));
  const target = keep ? snap.value : want;
  if(el.value!==target) el.value = target;
}
// Modal content cards are cleared when their overlay closes, so reopening a modal for a
// different item always starts from a clean render instead of morphing stale fields.
// Overlays also get a short fade-in — skipped when one modal hands off directly to
// another, so chained dialogs don't flicker.
(function watchOverlays(){
  let lastHiddenAt = 0;
  function setup(){
    if(!window.MutationObserver) return;
    const obs = new MutationObserver(function(muts){
      muts.forEach(function(m){
        const o = m.target;
        const nowHidden = o.classList.contains('hidden');
        const wasHidden = String(m.oldValue||'').split(/\s+/).indexOf('hidden')>=0;
        if(nowHidden && !wasHidden){
          lastHiddenAt = performance.now();
          const card = o.querySelector(':scope > [id$="Content"]');
          if(card && o.id!=='alarmOverlay') card.innerHTML = '';
        } else if(!nowHidden && wasHidden){
          const chained = performance.now()-lastHiddenAt < 150;
          o.classList.toggle('overlay-instant', chained);
          // A hidden pop-up keeps its old scroll offset; always open at the top.
          const card = o.querySelector(':scope > [id$="Content"]');
          if(card) card.scrollTop = 0;
        }
      });
    });
    document.querySelectorAll('.overlay').forEach(function(o){
      obs.observe(o, {attributes:true, attributeFilter:['class'], attributeOldValue:true});
    });
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', setup); else setup();
})();
