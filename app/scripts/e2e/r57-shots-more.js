// more Round 57 screens (loaded by r57-shots.js)
module.exports = async function(p, E, shot){
  await E(`(function(){
    const jj = crmFind('client', 'jj'); jj.deliverables[0].weeklyTarget = 2; jj.deliverables[0].completedDates = ['2026-10-02', '2026-10-06', '2026-10-09', '2026-10-14', '2026-10-21'];
    state.health.calorieEntries.push({id:'f1', date:addDays(todayStr(), -1), name:'Chicken bowl', calories:720}, {id:'f2', date:addDays(todayStr(), -1), name:'Protein shake', calories:280}, {id:'f3', date:addDays(todayStr(), -1), name:'Pasta', calories:900}, {id:'f4', date:todayStr(), name:'Oats', calories:420}, {id:'f5', date:addDays(todayStr(), -2), name:'Burrito', calories:1100});
    state.health.weightLog.push({id:'w1', date:addDays(todayStr(), -20), weight:186}, {id:'w2', date:addDays(todayStr(), -10), weight:184.2}, {id:'w3', date:addDays(todayStr(), -1), weight:183.1});
    const st = opReadStore(); st.health = {text:'Pattern: You train three times a week and the scale is moving the right way. Watch: Food logging drops off on weekends. Move: Log Saturday and Sunday, even roughly.', sig:'x', day:todayStr(), at:Date.now()};
    st['analytics:week'] = {text:'Three solid mornings this week, then the afternoons fell apart after calls. Protect 9 to 12 tomorrow and put the calls after lunch.', sig:'x', day:todayStr(), at:Date.now()};
    for(let i = 1; i < 9; i++){ const d = addDays(todayStr(), -i); state.focus.sessions.push({id:'s'+i, type:'deep', date:d, startedAt:new Date(d+'T09:00').getTime(), endedAt:new Date(d+'T11:00').getTime(), minutes:60 + (i*37 % 150), completedTasks:[]}); }
    state.journal.entries.push({id:'je9', date:'2026-09-01', timestamp:new Date(2026, 8, 1).getTime(), text:'I want the business to run without me on Fridays.', title:'Fridays', type:'freeform', mood:null, pinned:false, photos:[], thread:[{id:'t1', date:'2026-10-01', text:'Thursday is half a day now.'}], back:{mode:'month', repeat:true, next:pbMonths(todayStr(), 1)}});
    persist('business'); persist('health'); persist('journal'); persist('focus');
    AI.hasKey = true; aiKeyCheck = function(){}; opReadKick = function(){};
  })()`);
  await p.waitForTimeout(800); await E("xpSystemShow = function(){}; const w = document.getElementById('sysWin'); if(w) w.remove()");
  await E("xpSystemShow = function(){}");
  await shot('social-clients', "ui.view='convos'; ui.socTab='clients'; ui.r57Cli='jj'; renderView()");
  await shot('health', "ui.view='personal'; ui.personalTab='fitness'; ui.healthSub='overview'; renderView()");
  await shot('health-fuel-yesterday', "ui.view='personal'; ui.personalTab='fitness'; ui.healthSub='overview'; ui.r57FuelDay=addDays(todayStr(), -1); renderView(); document.getElementById('bodyFuel').scrollIntoView()");
  await shot('analytics', "ui.r57FuelDay=null; ui.view='focus'; ui.focusTab='analytics'; ui.analyticsRange='week'; renderView()");
  await shot('op-bubble', "ui.view='today'; renderView(); AI.hasKey=false; opVoiceOn=function(){ return false; }; opBubShow(); opCaption('Done. It’s on your list for tomorrow morning. Anything else?'); ACTIONS.r57OpOffMenu()");
  await shot('settings-op', "document.querySelectorAll('.r57-offm').forEach(m => m.remove()); ACTIONS.opBubClose(); ui.view='settings'; ui.settingsTab='op'; renderView()");
  await shot('journal-thread', "ui.view='personal'; ui.personalTab='journal'; renderView(); r57ThreadOpen('je9')");
  await shot('op-note', "addSheetClose('r57ThreadSheet'); ui.view='today'; renderView(); r57Note('Added “Call the printer” to today.', 'did'); r57Note('Let me drag tasks between days on the calendar.', 'idea')");
};
