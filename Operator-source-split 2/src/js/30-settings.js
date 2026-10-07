// ============ SETTINGS ============
function renderSettings(){
  const p = state.profile;
  const prepItems = arr(state.focus.prepItems);
  const toward = arr(state.focus.motivations.toward);
  const away = arr(state.focus.motivations.away);
  const standardItems = arr(state.standards.items);
  const categories = arr(state.calendar.categories);
  const panelOrder = arr(state.dashboardPanels.order);
  const deepWorkOptions = [30,60,120,180,240,300,360,420,480,540,600,660,720];
  const saveBtn = '<button class="btn btn-primary section" data-action="saveProfile">Save Changes</button>';

  const sections = {
    general: '<div class="card section"><div class="section-title">Personal Info</div><div class="grid grid-2">'+
        '<div class="field"><label>Name</label><input class="input" id="setName" value="'+escapeHtml(p.name)+'"></div>'+
        '<div class="field"><label>Business name</label><input class="input" id="setBusinessName" value="'+escapeHtml(p.businessName||'')+'" placeholder="e.g. Rivera Media Co."></div>'+
        '<div class="field"><label>Sound effects</label><select class="input" id="setSound"><option value="on" '+(p.soundEnabled!==false?'selected':'')+'>On</option><option value="off" '+(p.soundEnabled===false?'selected':'')+'>Off</option></select></div>'+
        '<div class="field"><label>Note field after finishing a task in Focus</label><select class="input" id="setFocusNote"><option value="on" '+(p.focusNotePromptEnabled!==false?'selected':'')+'>Enabled</option><option value="off" '+(p.focusNotePromptEnabled===false?'selected':'')+'>Disabled</option></select></div>'+
        '<div class="field"><label>Notify when a focus timer ends</label><select class="input" id="setNotifyEnd"><option value="on" '+(p.notifyOnFocusEnd!==false?'selected':'')+'>On</option><option value="off" '+(p.notifyOnFocusEnd===false?'selected':'')+'>Off</option></select></div>'+
      '</div></div>'+saveBtn+
      '<div class="section"><div class="section-title">Your Data</div><div class="card">'+
        '<div class="kpi-sub" style="margin-bottom:10px;">'+(hasCloud ? 'Saved to your Claude account — it follows you back to this artifact.' : 'Saved locally in this browser only. Open this same file, in this same browser, to see it again.')+'</div>'+
        '<div class="row"><button class="btn" data-action="exportData">Export Data (.json)</button>'+
        '<label class="btn" style="cursor:pointer;">Import Data<input type="file" id="importFile" accept=".json" style="display:none;"></label>'+
        deleteResetBtn()+'</div>'+
        '<textarea class="input" id="exportArea" style="width:100%;min-height:80px;margin-top:10px;display:none;" readonly></textarea>'+
      '</div></div>'+
      '<div class="section"><div class="section-title">Reset Specific Data<span class="kpi-sub">Handy while testing — clears just that part</span></div><div class="card">'+
        '<div class="task-list">'+RESET_TARGETS.map(function(t){ return '<div class="task-item-v2"><div class="task-title" style="flex:1;">'+t.label+'</div>'+resetPartBtn(t)+'</div>'; }).join('')+'</div>'+
      '</div></div>',

    display: '<div class="section"><div class="section-title">Appearance<span class="kpi-sub">Recolors the UI accent — won\'t change MRR, pipeline, debt, or goal colors</span></div><div class="card">'+
        '<div class="row">'+SWATCHES.map(function(sw){ return '<span class="swatch '+(p.accentColor===sw?'sel':'')+'" style="background:'+sw+';" data-action="pickThemeColor" data-color="'+sw+'"></span>'; }).join('')+'</div>'+
      '</div></div>'+
      '<div class="card section"><div class="section-title">Today Header Style</div>'+
        '<label class="row" style="font-size:13px;color:var(--text-dim);cursor:pointer;"><input type="checkbox" id="setBigClock" '+(p.bigClockOnToday?'checked':'')+' style="margin-right:8px;">Show a big clock + mini calendar instead of the plain date on the Today page</label>'+
      '</div>'+
      '<div class="section"><div class="section-title">Goal Color<span class="kpi-sub">Glows brighter the closer a goal gets to done</span></div><div class="card">'+
        '<div class="row">'+SWATCHES.map(function(sw){ return '<span class="swatch '+(p.goalAccentColor===sw?'sel':'')+'" style="background:'+sw+';" data-action="pickGoalColor" data-color="'+sw+'"></span>'; }).join('')+'</div>'+
      '</div></div>'+
      '<div class="section"><div class="section-title">Today Dashboard Panels<span class="kpi-sub">Taken straight from their own pages</span></div><div class="card">'+
        '<div class="kpi-sub" style="margin-bottom:10px;">Choose what shows on your main dashboard, and in what order.</div>'+
        '<div class="task-list">'+panelOrder.map(function(pid,idx){
          const def = PANEL_DEFS.find(function(pd){return pd.id===pid;});
          const enabled = state.dashboardPanels.enabled[pid]!==false;
          return '<div class="task-item-v2"><div class="task-title" style="flex:1;">'+(def?def.label:pid)+'</div>'+
            '<button class="btn btn-ghost btn-sm" data-action="movePanel" data-id="'+pid+'" data-dir="-1" '+(idx===0?'disabled':'')+'>&uarr;</button>'+
            '<button class="btn btn-ghost btn-sm" data-action="movePanel" data-id="'+pid+'" data-dir="1" '+(idx===panelOrder.length-1?'disabled':'')+'>&darr;</button>'+
            '<button class="btn '+(enabled?'btn-good':'btn-ghost')+' btn-sm" data-action="togglePanel" data-id="'+pid+'">'+(enabled?'On':'Off')+'</button>'+
          '</div>';
        }).join('')+'</div>'+
      '</div></div>'+
      '<div class="section"><div class="section-title">Task Categories<span class="kpi-sub">Give task types their own color/accent — shown as a left border on the card</span><div class="row"><input class="input" id="newTaskCatLabel" placeholder="e.g. Video Idea" style="width:160px;"><button class="btn btn-sm" data-action="addTaskCategory">Add</button></div></div>'+
        '<div class="card">'+
          '<div class="row" style="margin-bottom:10px;">'+SWATCHES.map(function(sw){ return '<span class="swatch'+(pickedSwatch===sw?' swatch-active':'')+'" style="background:'+sw+';" data-action="pickSwatch" data-color="'+sw+'"></span>'; }).join('')+'</div>'+
          '<div class="task-list">'+(arr(state.tasks.categories).map(function(c){ return '<div class="task-item-v2">'+
            '<span class="swatch" style="background:'+c.color+';width:18px;height:18px;cursor:pointer;" data-action="cycleTaskCategoryColor" data-id="'+c.id+'" title="Click to change color"></span>'+
            '<input class="input" data-task-cat-label="'+c.id+'" value="'+escapeHtml(c.label)+'" style="flex:1;max-width:220px;">'+
            deleteBtn('taskcat', c.id)+
          '</div>'; }).join('') || '<div class="empty">Nothing yet.</div>')+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="section"><div class="section-title">&#127916; Video Idea Types<span class="kpi-sub">Optional type tag shown on video idea cards</span><div class="row"><input class="input" id="newVideoTypeLabel" placeholder="e.g. Tutorial" style="width:160px;"><button class="btn btn-sm" data-action="addVideoType">Add</button></div></div>'+
        '<div class="card">'+
          '<div class="task-list">'+(arr(state.tasks.videoTypes).map(function(vt){ return '<div class="task-item-v2">'+
            '<input class="input" data-video-type-label="'+vt.id+'" value="'+escapeHtml(vt.label)+'" style="flex:1;max-width:220px;">'+
            deleteBtn('videotype', vt.id)+
          '</div>'; }).join('') || '<div class="empty">Nothing yet.</div>')+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="card section" id="quickLinksSettingsAnchor"><div class="section-title">Quick Links<span class="kpi-sub">shown on the Today dashboard while locked in</span></div><div class="grid grid-2">'+
        '<div class="field"><label>Open links in</label><select class="input" id="setLinkBrowser"><option value="default" '+((p.linkBrowser||'default')==='default'?'selected':'')+'>System Default</option><option value="safari" '+(p.linkBrowser==='safari'?'selected':'')+'>Force Safari</option></select><div class="kpi-sub">Force Safari opens a new tab with a special link — the first time, choose "Always Allow" when macOS asks, and it\'ll stop needing a second click.</div></div>'+
        '<div class="field"><label>Business files folder (path on this Mac)</label><input class="input" id="setQuickFiles" placeholder="/Users/you/Documents/Business" value="'+escapeHtml(state.settings.quickLinks.businessFilesPath||'')+'"></div>'+
        '<div class="field"><label>GoHighLevel URL</label><input class="input" id="setQuickGhl" value="'+escapeHtml(state.settings.quickLinks.ghlUrl||'')+'"></div>'+
        '<div class="field"><label>Google Drive URL</label><input class="input" id="setQuickDrive" value="'+escapeHtml(state.settings.quickLinks.driveUrl||'')+'"></div>'+
        '<div class="field"><label>Meta Ads Manager URL</label><input class="input" id="setQuickMeta" value="'+escapeHtml(state.settings.quickLinks.metaAdsUrl||'')+'"></div>'+
      '</div>'+
      '<div class="kpi-sub" style="margin-top:14px;margin-bottom:8px;">Custom icons — upload your own logo for any of these (used as the circle icon). Otherwise a plain default is shown.</div>'+
      '<div class="row" style="gap:16px;flex-wrap:wrap;">'+
        QUICK_LINK_DEFS.concat(AI_TOOLS).map(function(t){
          return '<div style="text-align:center;">'+
            '<span class="quick-link-circle" style="display:flex;margin:0 auto;">'+quickLinkIconInnerHtml(t.key||t.id, t.emoji, t.bg)+'</span>'+
            '<div class="kpi-sub" style="margin-top:4px;">'+escapeHtml(t.label)+'</div>'+
            '<label class="btn btn-ghost btn-sm" style="margin-top:4px;cursor:pointer;">Upload<input type="file" accept="image/*" data-icon-upload="'+(t.key||t.id)+'" style="display:none;"></label>'+
            (state.settings.quickLinks.icons && state.settings.quickLinks.icons[t.key||t.id] ? '<button class="btn btn-ghost btn-sm" data-action="resetQuickLinkIcon" data-value="'+(t.key||t.id)+'">Reset</button>' : '')+
          '</div>';
        }).join('')+
      '</div></div>'+saveBtn,

    focus: '<div class="card section"><div class="section-title">App Tracking<span class="kpi-sub">Sees which app is in the foreground on this Mac — nothing leaves the machine</span></div><div class="grid grid-2">'+
        '<div class="field"><label>Track foreground app</label><select class="input" id="setAppTrackingEnabled"><option value="on" '+(state.settings.appTracking.enabled!==false?'selected':'')+'>On</option><option value="off" '+(state.settings.appTracking.enabled===false?'selected':'')+'>Off</option></select></div>'+
        '<div class="field"><label>Auto lock-in when steady on one app</label><select class="input" id="setAppTrackingAutoLockIn"><option value="on" '+(state.settings.appTracking.autoLockIn!==false?'selected':'')+'>On</option><option value="off" '+(state.settings.appTracking.autoLockIn===false?'selected':'')+'>Off</option></select></div>'+
        '<div class="field"><label>Minutes on one app before auto lock-in</label><input class="input" type="number" min="3" max="120" id="setAppTrackingThreshold" value="'+state.settings.appTracking.thresholdMinutes+'"></div>'+
        '<div class="field"><label>Minutes away before auto-ending it</label><input class="input" type="number" min="1" max="60" id="setAppTrackingGrace" value="'+state.settings.appTracking.graceMinutes+'"><div class="kpi-sub">Only applies to sessions Operator started automatically — it never auto-ends a session you started yourself</div></div>'+
      '</div></div>'+saveBtn+
      '<div class="card section" id="alarmsSettingsSection"><div class="section-title">Alarms</div>'+
        '<div class="row" style="flex-wrap:wrap;align-items:flex-end;">'+
          '<div class="field" style="flex:1;min-width:160px;"><label>What?</label><input class="input" id="newAlarmLabel" placeholder="e.g. Kitchen closes"></div>'+
          '<div class="field"><label>Time</label><input class="input" type="time" id="newAlarmTime" value="09:00" style="width:120px;"></div>'+
          '<button class="btn btn-primary" data-action="addAlarm">Add Alarm</button>'+
        '</div>'+
        '<div class="task-list" style="margin-top:14px;">'+(arr(state.focus.alarms).map(alarmRow).join('') || '<div class="empty">No alarms set.</div>')+'</div>'+
        '<div class="row" style="justify-content:space-between;margin-top:10px;">'+
          '<button class="btn btn-ghost btn-sm" data-action="requestNotifs">Enable Notifications</button>'+
          '<button class="btn btn-ghost btn-sm" data-action="testAlarmSound">Test Alarm Sound</button>'+
        '</div>'+
      '</div>'+
      '<div class="card section"><div class="section-title">Alarm Sound</div><div class="row">'+
        ['standard','peaceful','loud'].map(function(s){ return '<button class="btn '+(p.alarmSound===s?'btn-primary':'')+' btn-sm" data-action="pickAlarmSound" data-sound="'+s+'">'+s[0].toUpperCase()+s.slice(1)+'</button>'; }).join('')+
        '<button class="btn btn-ghost btn-sm" data-action="previewAlarmSound">Preview</button>'+
      '</div></div>'+
      '<div class="section"><div class="section-title">Before-You-Start Reminders<div class="row"><input class="input" id="newPrepLabel" placeholder="e.g. Water bottle filled" style="width:200px;"><button class="btn btn-sm" data-action="addPrepItem">Add</button></div></div>'+
        '<div class="card"><div class="kpi-sub" style="margin-bottom:8px;">Shown as a note before every focus session.</div>'+
        '<div class="task-list">'+(prepItems.map(function(item){ return '<div class="task-item-v2"><div class="task-title" style="flex:1;">'+escapeHtml(item.label)+'</div>'+deleteBtn('prep', item.id)+'</div>'; }).join('') || '<div class="empty">Nothing yet — add one above.</div>')+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="section"><div class="section-title">Why You\'re Doing This</div><div class="card"><div class="grid grid-2">'+
        '<div><div class="kind-label" style="color:var(--good);">Getting</div>'+
          '<div class="task-list">'+(toward.map(function(m){ return '<div class="task-item-v2"><div class="task-title" style="flex:1;">'+escapeHtml(m.text)+'</div>'+deleteBtn('motivation', m.id)+'</div>'; }).join('') || '<div class="empty">Nothing yet.</div>')+'</div>'+
          '<div class="row" style="margin-top:8px;"><input class="input" id="newMotivToward" placeholder="e.g. Pay off debt" style="flex:1;min-width:100px;"><button class="btn btn-sm" data-action="addMotivation" data-kind="toward">Add</button></div>'+
        '</div>'+
        '<div><div class="kind-label" style="color:var(--danger);">Avoiding</div>'+
          '<div class="task-list">'+(away.map(function(m){ return '<div class="task-item-v2"><div class="task-title" style="flex:1;">'+escapeHtml(m.text)+'</div>'+deleteBtn('motivation', m.id)+'</div>'; }).join('') || '<div class="empty">Nothing yet.</div>')+'</div>'+
          '<div class="row" style="margin-top:8px;"><input class="input" id="newMotivAway" placeholder="e.g. More debt" style="flex:1;min-width:100px;"><button class="btn btn-sm" data-action="addMotivation" data-kind="away">Add</button></div>'+
        '</div>'+
      '</div></div></div>',

    standards: '<div class="card section"><div class="section-title">Fitness &amp; Deep Work</div><div class="grid grid-2">'+
        '<div class="field"><label>Daily calorie target</label><input class="input" type="number" id="setCalories" value="'+p.calorieTarget+'"></div>'+
        '<div class="field"><label>Goal weight</label><input class="input" type="number" step="0.1" id="setGoalWeight" value="'+(p.goalWeight!=null?p.goalWeight:'')+'"></div>'+
        '<div class="field"><label>Workout days per week (goal)</label><input class="input" type="number" id="setWeeklyWorkout" value="'+p.weeklyWorkoutTarget+'"></div>'+
        '<div class="field"><label>Deep work target per day</label><select class="input" id="setDeepWorkTarget">'+deepWorkOptions.map(function(m){ return '<option value="'+m+'" '+(state.standards.deepWorkTargetMinutes===m?'selected':'')+'>'+fmtDurationLabel(m)+'</option>'; }).join('')+'</select></div>'+
      '</div></div>'+
      '<div class="card section"><div class="section-title">Streak Rules</div><div class="grid grid-2">'+
        '<div class="field"><label>Days off allowed per week</label><input class="input" type="number" min="0" max="6" id="setDaysOffAllowed" value="'+state.standards.daysOffAllowedPerWeek+'"><div class="kpi-sub">More than this in a trailing 7-day window turns the streak red</div></div>'+
      '</div>'+
      '</div>'+saveBtn+
      '<div class="section"><div class="section-title">Daily Standard<div class="row"><input class="input" id="newStandardLabel" placeholder="e.g. Read for 10 minutes" style="width:200px;"><button class="btn btn-sm" data-action="addStandardItem">Add</button></div></div>'+
        '<div class="card"><div class="kpi-sub" style="margin-bottom:8px;">These plus your deep work target must be complete for a day to count.</div>'+
        '<div class="task-list">'+(standardItems.map(function(it){ return '<div class="task-item-v2"><div class="task-title" style="flex:1;">'+escapeHtml(it.label)+'</div>'+deleteBtn('standard', it.id)+'</div>'; }).join('') || '<div class="empty">Nothing yet — add one above.</div>')+'</div>'+
        '</div>'+
      '</div>',

    business: '<div class="card section"><div class="section-title">Business Info</div><div class="grid grid-2">'+
        '<div class="field"><label>Monthly revenue goal</label><input class="input" type="number" id="setRevGoal" value="'+p.revenueGoalMonthly+'"></div>'+
      '</div></div>'+
      '<div class="card section"><div class="section-title">Client Care Timing<span class="kpi-sub">Controls when a client\'s status tag turns amber or red</span></div><div class="grid grid-2">'+
        '<div class="field"><label>Amber after (hours since last touch)</label><input class="input" type="number" min="1" id="setClientCareYellow" value="'+state.settings.clientCare.yellowHours+'"></div>'+
        '<div class="field"><label>Red after (hours since last touch)</label><input class="input" type="number" min="1" id="setClientCareRed" value="'+state.settings.clientCare.redHours+'"></div>'+
      '</div></div>'+saveBtn,

    calendarJournal: '<div class="section"><div class="section-title">Calendar Categories<div class="row"><input class="input" id="newCatLabel" placeholder="e.g. Client call" style="width:160px;"><button class="btn btn-sm" data-action="addCalCategory">Add</button></div></div>'+
        '<div class="card">'+
          '<div class="kpi-sub" style="margin-bottom:8px;">Rename a category by editing its label — it saves automatically. Deleting a category still in use re-labels those events as "Other".</div>'+
          '<div class="row" style="margin-bottom:10px;">'+SWATCHES.map(function(sw){ return '<span class="swatch" style="background:'+sw+';" data-action="pickSwatch" data-color="'+sw+'"></span>'; }).join('')+'</div>'+
          '<div class="task-list">'+(categories.map(function(c){ return '<div class="task-item-v2"><span class="cal-dot" style="background:'+c.color+';width:12px;height:12px;"></span><input class="input" data-cal-cat-label="'+c.id+'" value="'+escapeHtml(c.label)+'" style="flex:1;max-width:220px;"><label class="row" style="font-size:11.5px;color:var(--text-dim);white-space:nowrap;"><input type="checkbox" data-cal-cat-autoremind="'+c.id+'" '+(c.autoRemind?'checked':'')+' style="margin-right:4px;">Auto-alarm</label>'+deleteBtn('calcat', c.id)+'</div>'; }).join('') || '<div class="empty">Nothing yet.</div>')+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="section"><div class="section-title">Journal Types</div>'+
        '<div class="card">'+
          '<div class="kpi-sub" style="margin-bottom:8px;">Add your own moods/types — pick a color, an emoji, and a name. "Starred" is built in for the glow effect and can\'t be removed.</div>'+
          '<div class="row" style="margin-bottom:10px;">'+
            '<input class="input" id="newJournalTypeEmoji" placeholder="&#128077;" maxlength="4" style="width:56px;text-align:center;">'+
            '<input class="input" id="newJournalTypeLabel" placeholder="e.g. Gratitude" style="flex:1;min-width:140px;">'+
            '<button class="btn btn-sm" data-action="addJournalType">Add</button>'+
          '</div>'+
          '<div class="row" style="margin-bottom:14px;">'+SWATCHES.map(function(sw){ return '<span class="swatch'+(pickedJournalTypeSwatch===sw?' swatch-active':'')+'" style="background:'+sw+';" data-action="pickJournalTypeSwatch" data-color="'+sw+'"></span>'; }).join('')+'</div>'+
          '<div class="task-list">'+(arr(state.journal.types).map(function(t){ return '<div class="task-item-v2">'+
            '<span class="swatch" style="background:'+t.color+';width:18px;height:18px;cursor:pointer;" data-action="cycleJournalTypeColor" data-id="'+t.id+'" title="Click to change color"></span>'+
            '<input class="input" data-journal-type-emoji="'+t.id+'" value="'+escapeHtml(t.emoji)+'" maxlength="4" style="width:48px;text-align:center;">'+
            '<input class="input" data-journal-type-label="'+t.id+'" value="'+escapeHtml(t.label)+'" style="flex:1;max-width:220px;">'+
            (t.id==='starred' ? '<span class="kpi-sub">Built in</span>' : deleteBtn('journaltype', t.id))+
          '</div>'; }).join('') || '<div class="empty">Nothing yet.</div>')+'</div>'+
        '</div>'+
      '</div>'
  };
  const navDefs = [
    {id:'general', label:'General', icon:'&#9881;'},
    {id:'display', label:'Display', icon:'&#127912;'},
    {id:'focus', label:'Focus &amp; Alarms', icon:'&#9201;'},
    {id:'standards', label:'Standards', icon:'&#127939;'},
    {id:'business', label:'Business', icon:'&#9635;'},
    {id:'calendarJournal', label:'Calendar &amp; Journal', icon:'&#9638;'}
  ];
  const active = sections[ui.settingsTab] ? ui.settingsTab : 'general';
  return '<div class="view-header"><div>'+businessNameTagHtml()+'<div class="view-title">Settings</div></div></div>'+
  '<div class="settings-shell">'+
    '<div class="settings-sidenav">'+navDefs.map(function(n){ return '<button class="settings-nav-item'+(active===n.id?' active':'')+'" data-action="settingsTab" data-tab="'+n.id+'"><span style="margin-right:8px;">'+n.icon+'</span>'+n.label+'</button>'; }).join('')+'</div>'+
    '<div class="settings-content tab-panel">'+sections[active]+'</div>'+
  '</div>';
}
function deleteResetBtn(){
  const key='reset:all';
  if(armed.has(key)) return '<button class="btn btn-danger" data-action="confirmReset">Confirm Reset — Erases Everything</button>';
  return '<button class="btn btn-ghost" data-action="armReset">Reset All Data</button>';
}
function pickSwatch(color){ pickedSwatch = color; renderView(); }
function pickThemeColor(color){
  state.profile.accentColor = color;
  applyTheme();
  persist('profile'); renderView();
}
function pickGoalColor(color){
  state.profile.goalAccentColor = color;
  persist('profile'); renderView();
}
function addVideoType(){
  const el = document.getElementById('newVideoTypeLabel');
  const label = el ? el.value.trim() : '';
  if(!label) return;
  state.tasks.videoTypes.push({id:uid(), label:label});
  el.value='';
  persist('tasks'); renderView();
}
function renameVideoType(id, label){
  const vt = taskVideoTypeById(id);
  if(!vt) return;
  const trimmed = (label||'').trim();
  if(!trimmed) return;
  vt.label = trimmed;
  persist('tasks');
}
function addTaskCategory(){
  const el = document.getElementById('newTaskCatLabel');
  const label = el ? el.value.trim() : '';
  if(!label) return;
  state.tasks.categories.push({id:uid(), label:label, color:pickedSwatch});
  el.value='';
  persist('tasks'); renderView();
}
function renameTaskCategory(id, label){
  const c = taskCategoryById(id);
  if(!c) return;
  const trimmed = (label||'').trim();
  if(!trimmed) return;
  c.label = trimmed;
  persist('tasks');
}
function cycleTaskCategoryColor(id){
  const c = taskCategoryById(id);
  if(!c) return;
  const idx = SWATCHES.indexOf(c.color);
  c.color = SWATCHES[(idx+1+SWATCHES.length) % SWATCHES.length];
  persist('tasks'); renderView();
}
function addCalCategory(){
  const el = document.getElementById('newCatLabel');
  const label = el ? el.value.trim() : '';
  if(!label) return;
  state.calendar.categories.push({id:uid(), label:label, color:pickedSwatch, autoRemind:false});
  persist('calendar'); renderView();
}
function renameCalCategory(id, label){
  const c = categoryById(id);
  if(!c) return;
  const trimmed = (label||'').trim();
  if(!trimmed) return;
  c.label = trimmed;
  persist('calendar');
}
function pickJournalTypeSwatch(color){ pickedJournalTypeSwatch = color; renderView(); }
function cycleJournalTypeColor(id){
  const t = arr(state.journal.types).find(function(x){ return x.id===id; });
  if(!t) return;
  const idx = SWATCHES.indexOf(t.color);
  t.color = SWATCHES[(idx+1+SWATCHES.length) % SWATCHES.length];
  persist('journal'); renderView();
}
function addJournalType(){
  const el = document.getElementById('newJournalTypeLabel');
  const label = el ? el.value.trim() : '';
  if(!label) return;
  const emojiEl = document.getElementById('newJournalTypeEmoji');
  const emoji = (emojiEl && emojiEl.value.trim()) || '\u{1F539}';
  if(!Array.isArray(state.journal.types)) state.journal.types = defaultJournalTypes();
  state.journal.types.push({id:uid(), label:label, color:pickedJournalTypeSwatch, emoji:emoji});
  el.value = '';
  if(emojiEl) emojiEl.value = '';
  persist('journal'); renderView();
}
function renameJournalTypeEmoji(id, emoji){
  const t = arr(state.journal.types).find(function(x){ return x.id===id; });
  if(!t) return;
  const trimmed = (emoji||'').trim();
  if(!trimmed) return;
  t.emoji = trimmed;
  persist('journal');
}
function renameJournalType(id, label){
  const t = arr(state.journal.types).find(function(x){ return x.id===id; });
  if(!t) return;
  const trimmed = (label||'').trim();
  if(!trimmed) return;
  t.label = trimmed;
  persist('journal');
}
function addStandardItem(){
  const el = document.getElementById('newStandardLabel');
  const label = el ? el.value.trim() : '';
  if(!label) return;
  state.standards.items.push({id:uid(), label:label, createdAt:todayStr()});
  persist('standards'); renderView();
}
function togglePanel(id){
  state.dashboardPanels.enabled[id] = !(state.dashboardPanels.enabled[id]!==false);
  persist('dashboardPanels'); renderView();
}
function movePanel(id, dir){
  const order = state.dashboardPanels.order;
  const idx = order.indexOf(id);
  const newIdx = idx+dir;
  if(newIdx<0 || newIdx>=order.length) return;
  const tmp = order[idx]; order[idx]=order[newIdx]; order[newIdx]=tmp;
  persist('dashboardPanels'); renderView();
}
function saveProfile(){
  const nameEl = document.getElementById('setName'); if(nameEl) state.profile.name = nameEl.value.trim() || 'Operator';
  const bizNameEl = document.getElementById('setBusinessName');
  if(bizNameEl) state.profile.businessName = bizNameEl.value.trim();
  const soundEl = document.getElementById('setSound'); if(soundEl) state.profile.soundEnabled = soundEl.value === 'on';
  const focusNoteEl = document.getElementById('setFocusNote'); if(focusNoteEl) state.profile.focusNotePromptEnabled = focusNoteEl.value === 'on';
  const notifyEl = document.getElementById('setNotifyEnd'); if(notifyEl) state.profile.notifyOnFocusEnd = notifyEl.value === 'on';
  const calEl = document.getElementById('setCalories'); if(calEl) state.profile.calorieTarget = Number(calEl.value)||2000;
  const gw = document.getElementById('setGoalWeight');
  if(gw) state.profile.goalWeight = gw.value ? Number(gw.value) : null;
  const wwEl = document.getElementById('setWeeklyWorkout'); if(wwEl) state.profile.weeklyWorkoutTarget = Number(wwEl.value)||5;
  const dwEl = document.getElementById('setDeepWorkTarget'); if(dwEl) state.standards.deepWorkTargetMinutes = Number(dwEl.value)||180;
  const doaEl = document.getElementById('setDaysOffAllowed'); if(doaEl) state.standards.daysOffAllowedPerWeek = clamp(Number(doaEl.value),0,6);
  const revEl = document.getElementById('setRevGoal'); if(revEl) state.profile.revenueGoalMonthly = Number(revEl.value)||0;
  const linkBrowserEl = document.getElementById('setLinkBrowser'); if(linkBrowserEl) state.profile.linkBrowser = linkBrowserEl.value;
  const ccYellowEl = document.getElementById('setClientCareYellow');
  const ccRedEl = document.getElementById('setClientCareRed');
  if(ccYellowEl) state.settings.clientCare.yellowHours = Number(ccYellowEl.value)||48;
  if(ccRedEl) state.settings.clientCare.redHours = Number(ccRedEl.value)||72;
  const qFiles = document.getElementById('setQuickFiles');
  const qGhl = document.getElementById('setQuickGhl');
  const qDrive = document.getElementById('setQuickDrive');
  const qMeta = document.getElementById('setQuickMeta');
  if(qFiles) state.settings.quickLinks.businessFilesPath = qFiles.value.trim();
  if(qGhl) state.settings.quickLinks.ghlUrl = qGhl.value.trim() || 'https://app.gohighlevel.com';
  if(qDrive) state.settings.quickLinks.driveUrl = qDrive.value.trim() || 'https://drive.google.com';
  if(qMeta) state.settings.quickLinks.metaAdsUrl = qMeta.value.trim() || 'https://adsmanager.facebook.com';
  const atEnabledEl = document.getElementById('setAppTrackingEnabled');
  const atAutoEl = document.getElementById('setAppTrackingAutoLockIn');
  const atThreshEl = document.getElementById('setAppTrackingThreshold');
  const atGraceEl = document.getElementById('setAppTrackingGrace');
  if(atEnabledEl) state.settings.appTracking.enabled = atEnabledEl.value === 'on';
  if(atAutoEl) state.settings.appTracking.autoLockIn = atAutoEl.value === 'on';
  if(atThreshEl) state.settings.appTracking.thresholdMinutes = Number(atThreshEl.value)||12;
  if(atGraceEl) state.settings.appTracking.graceMinutes = Number(atGraceEl.value)||3;
  persist('profile'); persist('standards'); persist('settings'); renderView();
}
function exportData(){
  const data = JSON.stringify(state, null, 2);
  try{
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'operator-data.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }catch(e){}
  const area = document.getElementById('exportArea');
  area.style.display='block'; area.value = data;
}
function normalizeAll(){
  state.profile = normalizeProfile(state.profile);
  state.tasks = normalizeTasks(state.tasks);
  state.focus = normalizeFocus(state.focus);
  state.health = normalizeHealth(state.health);
  state.meals = normalizeMeals(state.meals);
  state.journal = normalizeJournal(state.journal);
  state.finances = normalizeFinances(state.finances);
  state.business = normalizeBusiness(state.business);
  state.calendar = normalizeCalendar(state.calendar);
  state.standards = normalizeStandards(state.standards);
  state.daysOff = normalizeDaysOff(state.daysOff);
  state.goals = normalizeGoals(state.goals);
  state.dashboardPanels = normalizeDashboardPanels(state.dashboardPanels);
  state.modes = normalizeModes(state.modes);
  state.settings = normalizeSettings(state.settings);
  state.appActivity = normalizeAppActivity(state.appActivity);
}
async function importDataFile(file){
  try{
    const text = await file.text();
    const parsed = JSON.parse(text);
    STATE_KEYS.forEach(function(k){ if(parsed[k]!=null) state[k]=parsed[k]; });
    normalizeAll();
    applyTheme();
    for(const k of STATE_KEYS) await persist(k);
    renderView();
  }catch(e){ inlineNotice('Could not read that file.'); }
}
function inlineNotice(msg){
  const el = document.getElementById('viewRoot');
  const div = document.createElement('div');
  div.className='note'; div.style.marginBottom='10px'; div.style.borderColor='rgba(232,99,107,.4)'; div.textContent=msg;
  el.prepend(div);
  setTimeout(function(){ div.remove(); }, 4000);
}
function armReset(){
  armed.add('reset:all'); renderView();
  setTimeout(function(){ if(armed.has('reset:all')){ armed.delete('reset:all'); renderView(); } }, 3000);
}
async function confirmReset(){
  armed.delete('reset:all');
  state = { profile:defaultProfile(), tasks:{items:[]}, focus:defaultFocus(), health:{gymLog:[],weightLog:[],calorieEntries:[]}, meals:defaultMeals(), journal:{entries:[], types:defaultJournalTypes()}, finances:{debts:[],payments:[],income:[],invoices:[]}, business:{pipeline:[],clients:[]}, calendar:defaultCalendar(), standards:defaultStandards(), daysOff:defaultDaysOff(), goals:defaultGoals(), dashboardPanels:defaultDashboardPanels(), modes:defaultModes(), settings:defaultSettings() };
  applyTheme();
  for(const k of STATE_KEYS) await persist(k);
  renderView();
}

