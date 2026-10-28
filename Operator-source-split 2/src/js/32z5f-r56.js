// ============ ROUND 56 ============
// The Calendar fits the screen it's on: the month's rows share whatever height is left under the header, so the
// week/month numbers under the grid are never pushed off the bottom (on a 1440-high ultrawide or a laptop alike).
function r56CalFit(){
  if(ui.view!=='calendar') return;
  const month = document.querySelector('.calx .cx-month'), grid = month && month.querySelector('.cx-grid'); if(!grid) return;
  const cells = grid.querySelectorAll('.cx-d'); if(!cells.length) return;
  const rows = Math.ceil(cells.length/7) || 5;
  for(let pass = 0; pass < 3; pass++){
    const main = document.querySelector('main'), extra = main ? Math.max(0, main.scrollHeight - main.clientHeight) : 0;
    const rh = cells[cells.length - 1].getBoundingClientRect().height, over = Math.max(month.getBoundingClientRect().bottom - (window.innerHeight - 22), extra);
    if(Math.abs(over) < 2) break;
    const want = Math.max(54, Math.min(210, Math.floor(rh - over/rows)));
    grid.style.setProperty('grid-auto-rows', want+'px', 'important');
  }
}
afterRenderHooks.push(function(){ try{ r56CalFit(); }catch(e){} });
window.addEventListener('resize', function(){ clearTimeout(r56CalFit._t); r56CalFit._t = setTimeout(function(){ try{ r56CalFit(); }catch(e){} }, 80); });
