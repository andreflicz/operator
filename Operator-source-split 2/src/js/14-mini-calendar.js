// ============ MINI CALENDAR DATE PICKER ============
function openDatePicker(targetId){
  const el = document.getElementById(targetId);
  const val = el && el.value ? el.value : todayStr();
  const parts = val.split('-').map(Number);
  ui.datePicker = { target: targetId, year: parts[0] || new Date().getFullYear(), month: (parts[1]||1)-1, selected: val };
  const o = document.getElementById('miniCalOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderDatePickerModalInto();
}
function closeDatePicker(){
  ui.datePicker = null;
  const o = document.getElementById('miniCalOverlay');
  if(o) o.classList.add('hidden');
}
function navigateCalMonth(delta){
  if(!ui.datePicker) return;
  let m = ui.datePicker.month + delta, y = ui.datePicker.year;
  if(m<0){ m=11; y--; } else if(m>11){ m=0; y++; }
  ui.datePicker.month = m; ui.datePicker.year = y;
  renderDatePickerModalInto();
}
function pickCalDay(day){
  if(!ui.datePicker) return;
  const dateStr = ui.datePicker.year+'-'+pad2(ui.datePicker.month+1)+'-'+pad2(day);
  const el = document.getElementById(ui.datePicker.target);
  if(el){
    el.value = dateStr;
    try{ el.dispatchEvent(new Event('change', {bubbles:true})); }catch(e){}
  }
  closeDatePicker();
}
const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DOW_NAMES = ['S','M','T','W','T','F','S'];
function renderDatePickerModal(){
  const dp = ui.datePicker; if(!dp) return '';
  const firstDow = new Date(dp.year, dp.month, 1).getDay();
  const daysInMonth = new Date(dp.year, dp.month+1, 0).getDate();
  const todayS = todayStr();
  let cells = '';
  for(let i=0;i<firstDow;i++) cells += '<div class="mini-cal-day mini-cal-empty">&middot;</div>';
  for(let d=1; d<=daysInMonth; d++){
    const dateStr = dp.year+'-'+pad2(dp.month+1)+'-'+pad2(d);
    const cls = ['mini-cal-day'];
    if(dateStr===todayS) cls.push('mini-cal-today');
    if(dateStr===dp.selected) cls.push('mini-cal-selected');
    cells += '<div class="'+cls.join(' ')+'" data-action="pickCalDay" data-day="'+d+'">'+d+'</div>';
  }
  return '<div class="mini-cal-head">'+
      '<button class="mini-cal-nav" data-action="navigateCalMonth" data-delta="-1">&#8249;</button>'+
      '<div class="mini-cal-title">'+MONTH_NAMES[dp.month]+' '+dp.year+'</div>'+
      '<button class="mini-cal-nav" data-action="navigateCalMonth" data-delta="1">&#8250;</button>'+
    '</div>'+
    '<div class="mini-cal-grid">'+DOW_NAMES.map(function(d){ return '<div class="mini-cal-dow">'+d+'</div>'; }).join('')+cells+'</div>'+
    '<div class="row" style="margin-top:16px;justify-content:space-between;">'+
      '<button class="btn btn-ghost btn-sm" data-action="pickCalToday">Today</button>'+
      '<button class="btn btn-ghost btn-sm" data-action="closeDatePicker">Close</button>'+
    '</div>';
}
function renderDatePickerModalInto(){ const el=document.getElementById('miniCalContent'); if(el) el.innerHTML = renderDatePickerModal(); }
function pickCalToday(){
  if(!ui.datePicker) return;
  const now = new Date();
  ui.datePicker.year = now.getFullYear(); ui.datePicker.month = now.getMonth();
  pickCalDay(now.getDate());
}

