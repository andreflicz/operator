// ============ SCROLL PICKER ============
function buildScrollPicker(id, options, selectedValue){
  const items = options.map(function(o){ return '<div class="picker-item" data-value="'+o.value+'">'+o.label+'</div>'; }).join('');
  return '<div class="picker-frame"><div class="scroll-picker" id="'+id+'" data-selected="'+selectedValue+'">'+
    '<div class="picker-spacer"></div>'+items+'<div class="picker-spacer"></div>'+
  '</div></div>';
}
function initScrollPicker(id, defaultValue){
  const el = document.getElementById(id);
  if(!el) return;
  function updateCenter(){
    const rect = el.getBoundingClientRect();
    const centerY = rect.top + rect.height/2;
    let closest = null, closestDist = Infinity;
    el.querySelectorAll('.picker-item').forEach(function(item){
      const r = item.getBoundingClientRect();
      const itemCenter = r.top + r.height/2;
      const dist = Math.abs(itemCenter-centerY);
      if(dist<closestDist){ closestDist=dist; closest=item; }
    });
    el.querySelectorAll('.picker-item').forEach(function(item){ item.classList.remove('picker-center'); });
    if(closest){ closest.classList.add('picker-center'); el.dataset.selected = closest.dataset.value; }
  }
  // Re-renders morph the picker in place, so only wire the scroll listener once per element.
  if(!el._pickerWired){
    el._pickerWired = true;
    let t;
    el.addEventListener('scroll', function(){ clearTimeout(t); t=setTimeout(updateCenter, 90); });
  }
  const target = el.querySelector('.picker-item[data-value="'+defaultValue+'"]');
  if(target){ try{ el.scrollTop = target.offsetTop - el.clientHeight/2 + target.offsetHeight/2; }catch(e){} }
  updateCenter();
}
function getPickerValue(id){
  const el = document.getElementById(id);
  return el ? Number(el.dataset.selected) : null;
}

