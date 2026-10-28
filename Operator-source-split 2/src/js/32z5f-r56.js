// ============ ROUND 56 ============
// The Calendar fits the screen it's on: the month's rows share whatever height is left under the header, so the
// week/month numbers under the grid are never pushed off the bottom (on a 1440-high ultrawide or a laptop alike).
// One measure, one change, one check. On a phone, or a window too short for rows of a usable height, it leaves the
// page to scroll as it always did.
const R56_ROW_MIN = 52, R56_ROW_MAX = 210;
function r56CalFit(){
  if(ui.view!=='calendar') return;
  const month = document.querySelector('.calx .cx-month'), grid = month && month.querySelector('.cx-grid'); if(!grid) return;
  const cells = grid.querySelectorAll('.cx-d'); if(!cells.length) return;
  const root = document.documentElement, clear = function(){ root.classList.remove('r56-fit'); root.style.removeProperty('--r56-rh'); };
  if(window.innerWidth < 900){ clear(); return; }
  const rows = Math.ceil(cells.length/7) || 5, main = document.querySelector('main');
  // how much too tall (or too short) the page is, with the rows as they are now
  // (one target: the month ends where the window's own bottom padding starts, so the page never scrolls)
  const pad = main ? parseFloat(getComputedStyle(main).paddingBottom) || 0 : 0;
  const off = function(){ return month.getBoundingClientRect().bottom - (window.innerHeight - Math.max(22, pad) - 1); };
  for(let pass = 0; pass < 3; pass++){
    const over = off(); if(Math.abs(over) < 3) return;
    const rh = cells[cells.length - 1].getBoundingClientRect().height, want = Math.floor(rh - over/rows);
    if(want < R56_ROW_MIN){ clear(); return; }
    const next = Math.min(R56_ROW_MAX, want); if(Math.abs(next - rh) < 2) return;
    // (on the page root, not the grid: the calendar redraws every second and would drop it)
    root.style.setProperty('--r56-rh', next+'px'); root.classList.add('r56-fit');
  }
}
afterRenderHooks.push(function(){ try{ r56CalFit(); }catch(e){} });
window.addEventListener('resize', function(){ clearTimeout(r56CalFit._t); r56CalFit._t = setTimeout(function(){ try{ r56CalFit(); }catch(e){} }, 80); });
