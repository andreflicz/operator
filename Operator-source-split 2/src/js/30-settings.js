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
    integrations: ghlSettingsHtml(),
    updates: '<div class="upd-panel">'+renderUpdatesTab()+'</div>',
    data: '<div class="section"><div class="section-title">Your Data'+tip(hasCloud ? 'Saved to your Claude account — it follows you back to this artifact.' : 'Saved on this Mac in Operator\'s own storage — export a copy now and then as a backup.')+'</div><div class="card">'+
        '<div class="row"><button class="btn" data-action="exportData">Export Data (.json)</button>'+
        '<label class="btn" style="cursor:pointer;">Import Data<input type="file" id="importFile" accept=".json" style="display:none;"></label>'+
        deleteResetBtn()+'</div>'+
        '<textarea class="input" id="exportArea" style="width:100%;min-height:80px;margin-top:10px;display:none;" readonly></textarea>'+
      '</div></div>'+
      '<div class="section"><div class="section-title">Reset Specific Data'+tip('Handy while testing — clears just that part and leaves everything else alone.')+'</div><div class="card">'+
        '<div class="task-list">'+RESET_TARGETS.map(function(t){ return '<div class="task-item-v2"><div class="task-title" style="flex:1;">'+t.label+'</div>'+resetPartBtn(t)+'</div>'; }).join('')+'</div>'+
      '</div></div>',

    display: themeSettingsHtml()+skyLookSettingsHtml()+sceneSettingsHtml()+weatherSettingsHtml()+cardLayoutSettingsHtml()+'<div class="section"><div class="section-title">Accent color'+tip('Recolors the UI accent — it won\'t change MRR, pipeline, debt or goal colors.')+'</div><div class="card">'+
        '<div class="row">'+SWATCHES.map(function(sw){ return '<span class="swatch '+(p.accentColor===sw?'sel':'')+'" style="background:'+sw+';" data-action="pickThemeColor" data-color="'+sw+'"></span>'; }).join('')+'</div>'+
      '</div></div>'+
      '<div class="card section"><div class="section-title">Today Header Style</div>'+
        '<label class="row" style="font-size:13px;color:var(--text-dim);cursor:pointer;"><input type="checkbox" id="setBigClock" '+(p.bigClockOnToday?'checked':'')+' style="margin-right:8px;">Show a big clock + mini calendar instead of the plain date on the Today page</label>'+
      '</div>'+
      '<div class="card section"><div class="section-title">Cursor</div>'+
        '<label class="row" style="font-size:13px;color:var(--text-dim);cursor:pointer;"><input type="checkbox" id="setCrosshair" '+(p.crosshairCursor!==false?'checked':'')+' style="margin-right:8px;">Crosshair cursor (accent-colored, app-wide)</label>'+
      '</div>'+
      '<div class="section"><div class="section-title">Goal Color'+tip('Goals glow brighter in this color the closer they get to done.')+'</div><div class="card">'+
        '<div class="row">'+SWATCHES.map(function(sw){ return '<span class="swatch '+(p.goalAccentColor===sw?'sel':'')+'" style="background:'+sw+';" data-action="pickGoalColor" data-color="'+sw+'"></span>'; }).join('')+'</div>'+
      '</div></div>'+
      '<div class="section"><div class="section-title">Today Dashboard Panels'+tip('Choose what shows on your Today page, and in what order. Each panel is taken straight from its own page.')+'</div><div class="card">'+
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
      '<div class="section"><div class="section-title">Task Categories'+tip('Give task types their own color — shown as a left border on the card. Untick “Time counts as deep work” for types that shouldn\'t add to deep work.')+'<div class="row"><input class="input" id="newTaskCatLabel" placeholder="e.g. Video Idea" style="width:160px;"><button class="btn btn-sm" data-action="addTaskCategory">Add</button></div></div>'+
        '<div class="card">'+
          '<div class="row" style="margin-bottom:10px;">'+SWATCHES.map(function(sw){ return '<span class="swatch'+(pickedSwatch===sw?' swatch-active':'')+'" style="background:'+sw+';" data-action="pickSwatch" data-color="'+sw+'"></span>'; }).join('')+'</div>'+
          '<div class="task-list">'+(arr(state.tasks.categories).map(function(c){ return '<div class="task-item-v2">'+
            '<span class="swatch" style="background:'+c.color+';width:18px;height:18px;cursor:pointer;" data-action="cycleTaskCategoryColor" data-id="'+c.id+'" title="Click to change color"></span>'+
            '<input class="input" data-task-cat-label="'+c.id+'" value="'+escapeHtml(c.label)+'" style="flex:1;max-width:220px;">'+
            '<label class="row kpi-sub" style="gap:4px;cursor:pointer;" title="Time on tasks in this category counts toward deep work"><input type="checkbox" data-task-cat-deep="'+c.id+'" '+(c.countsDeepWork!==false?'checked':'')+'>Time counts as deep work</label>'+
            deleteBtn('taskcat', c.id)+
          '</div>'; }).join('') || '<div class="empty">Nothing yet.</div>')+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="section"><div class="section-title">&#127916; Video Idea Types'+tip('Optional type tag shown on video idea cards.')+'<div class="row"><input class="input" id="newVideoTypeLabel" placeholder="e.g. Tutorial" style="width:160px;"><button class="btn btn-sm" data-action="addVideoType">Add</button></div></div>'+
        '<div class="card">'+
          '<div class="task-list">'+(arr(state.tasks.videoTypes).map(function(vt){ return '<div class="task-item-v2">'+
            '<input class="input" data-video-type-label="'+vt.id+'" value="'+escapeHtml(vt.label)+'" style="flex:1;max-width:220px;">'+
            deleteBtn('videotype', vt.id)+
          '</div>'; }).join('') || '<div class="empty">Nothing yet.</div>')+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="card section" id="quickLinksSettingsAnchor"><div class="section-title">Quick Links'+tip('Your quick-access links — the ☰ button at the bottom right of the Today page.')+'</div><div class="grid grid-2">'+
        '<div class="field"><label>Open links in'+tip('Force Safari opens a new tab with a special link — the first time, choose “Always Allow” when macOS asks, and it\'ll stop needing a second click.')+'</label><select class="input" id="setLinkBrowser"><option value="default" '+((p.linkBrowser||'default')==='default'?'selected':'')+'>System Default</option><option value="safari" '+(p.linkBrowser==='safari'?'selected':'')+'>Force Safari</option></select></div>'+
        '<div class="field"><label>Business files folder (path on this Mac)</label><input class="input" id="setQuickFiles" placeholder="/Users/you/Documents/Business" value="'+escapeHtml(state.settings.quickLinks.businessFilesPath||'')+'"></div>'+
        '<div class="field"><label>GoHighLevel URL</label><input class="input" id="setQuickGhl" value="'+escapeHtml(state.settings.quickLinks.ghlUrl||'')+'"></div>'+
        '<div class="field"><label>Google Drive URL</label><input class="input" id="setQuickDrive" value="'+escapeHtml(state.settings.quickLinks.driveUrl||'')+'"></div>'+
        '<div class="field"><label>Meta Ads Manager URL</label><input class="input" id="setQuickMeta" value="'+escapeHtml(state.settings.quickLinks.metaAdsUrl||'')+'"></div>'+
      '</div>'+
      '<div class="kind-label" style="margin-top:16px;margin-bottom:10px;">Icons'+tip('Upload your own logo for any of these — it\'s used as the circle icon. Otherwise a plain default is shown.')+'</div>'+
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

    focus: '<div class="card section"><div class="section-title">App Tracking'+tip('Sees which app (and, in browsers, which website) is in front on this Mac — nothing leaves the machine.')+'</div><div class="grid grid-2">'+
        '<div class="field"><label>Track foreground app</label><select class="input" id="setAppTrackingEnabled"><option value="on" '+(state.settings.appTracking.enabled!==false?'selected':'')+'>On</option><option value="off" '+(state.settings.appTracking.enabled===false?'selected':'')+'>Off</option></select></div>'+
        '<div class="field"><label>Auto lock-in when steady on work apps</label><select class="input" id="setAppTrackingAutoLockIn"><option value="on" '+(state.settings.appTracking.autoLockIn!==false?'selected':'')+'>On</option><option value="off" '+(state.settings.appTracking.autoLockIn===false?'selected':'')+'>Off</option></select></div>'+
        '<div class="field"><label>Minutes on one app before auto lock-in</label><input class="input" type="number" min="3" max="120" id="setAppTrackingThreshold" value="'+state.settings.appTracking.thresholdMinutes+'"></div>'+
        '<div class="field"><label>Stop any session after (minutes away)'+tip('No keyboard or mouse for this long — or the Mac asleep — and the session stops at the last moment you were active, so only active time counts. Coming back, you can add the time back if you were working away from the keys.')+'</label><input class="input" type="number" min="3" max="120" id="setAppTrackingAway" value="'+(state.settings.appTracking.awayMinutes||10)+'"></div>'+
        '<div class="field"><label>Minutes off work apps before ending an auto session'+tip('For sessions Operator started on its own: how long on non-work apps before it ends them.')+'</label><input class="input" type="number" min="1" max="60" id="setAppTrackingGrace" value="'+state.settings.appTracking.graceMinutes+'"></div>'+
        '<div class="field"><label>Cooldown after you lock out (minutes)'+tip('Auto lock-in stays off this long after you stop a session yourself.')+'</label><input class="input" type="number" min="0" max="240" id="setAppTrackingCooldown" value="'+state.settings.appTracking.cooldownMinutes+'"></div>'+
        '<div class="field"><label>Day recap ready at'+tip('A small nudge at this time says your recap is ready — what you did, your work habits, and any sessions that started on their own. Open it any time from Today or Analytics.')+'</label><input class="input" type="time" id="setRecapTime" value="'+(state.settings.appTracking.recapTime||'21:30')+'"></div>'+
        '<div class="field"><label>Idle after (seconds without keyboard/mouse)'+tip('Idle time doesn\'t count toward auto lock-in or app time.')+'</label><input class="input" type="number" min="15" max="900" id="setAppTrackingIdle" value="'+state.settings.appTracking.idleSeconds+'"></div>'+
      '</div></div>'+saveBtn+
      workAppsSettingsHtml()+
      wakeSettingsCardHtml()+
      '<div class="card section" id="alarmsSettingsSection"><div class="section-title">Other alarms</div>'+
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
      '<div class="section"><div class="section-title">Before-You-Start Reminders'+tip('Shown as a note before every focus session.')+'<div class="row"><input class="input" id="newPrepLabel" placeholder="e.g. Water bottle filled" style="width:200px;"><button class="btn btn-sm" data-action="addPrepItem">Add</button></div></div>'+
        '<div class="card">'+
        '<div class="task-list">'+(prepItems.map(function(item){ return '<div class="task-item-v2"><div class="task-title" style="flex:1;">'+escapeHtml(item.label)+'</div>'+deleteBtn('prep', item.id)+'</div>'; }).join('') || '<div class="empty">Nothing yet — add one above.</div>')+'</div>'+
        '</div>'+
      '</div>'+
      '',

    you: '<div class="card section"><div class="section-title">About you</div><div class="grid grid-2">'+
        '<div class="field"><label>Name</label><input class="input" id="setName" value="'+escapeHtml(p.name)+'"></div>'+
        '<div class="field"><label>Business name</label><input class="input" id="setBusinessName" value="'+escapeHtml(p.businessName||'')+'" placeholder="e.g. Rivera Media Co."></div>'+
      '</div></div>'+
      '<div class="card section"><div class="section-title">Preferences</div><div class="grid grid-2">'+
        '<div class="field"><label>Sound effects</label><div class="row" style="gap:6px;"><select class="input" id="setSound"><option value="modern" '+(p.soundEnabled!==false && p.soundPack!=='classic'?'selected':'')+'>Modern</option><option value="classic" '+(p.soundEnabled!==false && p.soundPack==='classic'?'selected':'')+'>Classic beeps</option><option value="off" '+(p.soundEnabled===false?'selected':'')+'>Off</option></select><button class="btn btn-ghost btn-sm" data-action="previewSounds" title="Hear them">&#9654;</button></div></div>'+
        '<div class="field"><label>Note field after finishing a task in Focus</label><select class="input" id="setFocusNote"><option value="on" '+(p.focusNotePromptEnabled!==false?'selected':'')+'>Enabled</option><option value="off" '+(p.focusNotePromptEnabled===false?'selected':'')+'>Disabled</option></select></div>'+
        '<div class="field"><label>Notify when a focus timer ends</label><select class="input" id="setNotifyEnd"><option value="on" '+(p.notifyOnFocusEnd!==false?'selected':'')+'>On</option><option value="off" '+(p.notifyOnFocusEnd===false?'selected':'')+'>Off</option></select></div>'+
      '</div></div>'+
      wakeSettingsCardHtml()+
      '<div class="section"><div class="section-title">Why You\'re Doing This</div><div class="card"><div class="grid grid-2">'+
        '<div><div class="kind-label" style="color:var(--good);">Getting</div>'+
          '<div class="task-list">'+(toward.map(function(m){ return '<div class="task-item-v2"><div class="task-title" style="flex:1;">'+escapeHtml(m.text)+'</div>'+deleteBtn('motivation', m.id)+'</div>'; }).join('') || '<div class="empty">Nothing yet.</div>')+'</div>'+
          '<div class="row" style="margin-top:8px;"><input class="input" id="newMotivToward" placeholder="e.g. Pay off debt" style="flex:1;min-width:100px;"><button class="btn btn-sm" data-action="addMotivation" data-kind="toward">Add</button></div>'+
        '</div>'+
        '<div><div class="kind-label" style="color:var(--danger);">Avoiding</div>'+
          '<div class="task-list">'+(away.map(function(m){ return '<div class="task-item-v2"><div class="task-title" style="flex:1;">'+escapeHtml(m.text)+'</div>'+deleteBtn('motivation', m.id)+'</div>'; }).join('') || '<div class="empty">Nothing yet.</div>')+'</div>'+
          '<div class="row" style="margin-top:8px;"><input class="input" id="newMotivAway" placeholder="e.g. More debt" style="flex:1;min-width:100px;"><button class="btn btn-sm" data-action="addMotivation" data-kind="away">Add</button></div>'+
        '</div>'+
      '</div></div></div>'+
      '<div class="card section"><div class="section-title">Targets — health &amp; deep work</div><div class="grid grid-2">'+
        '<div class="field"><label>Daily calorie target</label><input class="input" type="number" id="setCalories" value="'+p.calorieTarget+'"></div>'+
        '<div class="field"><label>Goal weight</label><input class="input" type="number" step="0.1" id="setGoalWeight" value="'+(p.goalWeight!=null?p.goalWeight:'')+'"></div>'+
        '<div class="field"><label>Workout days per week (goal)</label><input class="input" type="number" id="setWeeklyWorkout" value="'+p.weeklyWorkoutTarget+'"></div>'+
        '<div class="field"><label>Deep work target per day</label><select class="input" id="setDeepWorkTarget">'+deepWorkOptions.map(function(m){ return '<option value="'+m+'" '+(state.standards.deepWorkTargetMinutes===m?'selected':'')+'>'+fmtDurationLabel(m)+'</option>'; }).join('')+'</select></div>'+
      '</div></div>'+
      '<div class="card section"><div class="section-title">Streak Rules</div><div class="grid grid-2">'+
        '<div class="field"><label>Days off allowed per week'+tip('More than this in any 7-day stretch turns the streak red.')+'</label><input class="input" type="number" min="0" max="6" id="setDaysOffAllowed" value="'+state.standards.daysOffAllowedPerWeek+'"></div>'+
      '</div>'+
      '</div>'+saveBtn+
      '<div class="section"><div class="section-title">Daily Standard'+tip('These plus your deep work target must be done for a day to count toward the streak.')+'<div class="row"><input class="input" id="newStandardLabel" placeholder="e.g. Read for 10 minutes" style="width:200px;"><button class="btn btn-sm" data-action="addStandardItem">Add</button></div></div>'+
        '<div class="card">'+
        '<div class="task-list">'+(standardItems.map(function(it){ return '<div class="task-item-v2"><div class="task-title" style="flex:1;">'+escapeHtml(it.label)+'</div>'+deleteBtn('standard', it.id)+'</div>'; }).join('') || '<div class="empty">Nothing yet — add one above.</div>')+'</div>'+
        '</div>'+
      '</div>',

    business: '<div class="card section"><div class="section-title">Business Info</div><div class="grid grid-2">'+
        '<div class="field"><label>Monthly revenue goal</label><input class="input" type="number" id="setRevGoal" value="'+p.revenueGoalMonthly+'"></div>'+
      '</div>'+
      '</div>'+saveBtn+renderCrmSettings(),

    calendarJournal: '<div class="section"><div class="section-title">Calendar Categories'+tip('Rename a category by editing its label — it saves automatically. Deleting one that\'s still in use re-labels those events as “Other”. Auto-alarm rings at the start of every event in that category.')+'<div class="row"><input class="input" id="newCatLabel" placeholder="e.g. Client call" style="width:160px;"><button class="btn btn-sm" data-action="addCalCategory">Add</button></div></div>'+
        '<div class="card">'+
          '<div class="row" style="margin-bottom:10px;">'+SWATCHES.map(function(sw){ return '<span class="swatch" style="background:'+sw+';" data-action="pickSwatch" data-color="'+sw+'"></span>'; }).join('')+'</div>'+
          '<div class="task-list">'+(categories.map(function(c){ return '<div class="task-item-v2"><span class="cal-dot" style="background:'+c.color+';width:12px;height:12px;"></span><input class="input" data-cal-cat-label="'+c.id+'" value="'+escapeHtml(c.label)+'" style="flex:1;max-width:220px;"><label class="row" style="font-size:11.5px;color:var(--text-dim);white-space:nowrap;"><input type="checkbox" data-cal-cat-autoremind="'+c.id+'" '+(c.autoRemind?'checked':'')+' style="margin-right:4px;">Auto-alarm</label>'+deleteBtn('calcat', c.id)+'</div>'; }).join('') || '<div class="empty">Nothing yet.</div>')+'</div>'+
        '</div>'+
      '</div>'+
      '<div class="section"><div class="section-title">Journal Types'+tip('Add your own moods/types — pick a color, an emoji and a name. “Starred” is built in for the glow effect and can\'t be removed.')+'</div>'+
        '<div class="card">'+
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
    {id:'you', label:'You', icon:'&#128100;'},
    {id:'display', label:'Display', icon:'&#127912;'},
    {id:'focus', label:'Focus &amp; Alarms', icon:'&#9201;'},
    {id:'business', label:'Business', icon:'&#9635;'},
    {id:'calendarJournal', label:'Calendar &amp; Journal', icon:'&#9638;'},
    {id:'integrations', label:'Integrations', icon:'&#128279;'},
    {id:'data', label:'Data', icon:'&#128190;'},
    {id:'updates', label:'App updates', icon:'&#128227;'}
  ];
  // Standards and General (preferences) now live under You; export / reset under Data
  const tab = (ui.settingsTab==='standards' || ui.settingsTab==='general') ? 'you' : ui.settingsTab;
  const active = sections[tab] ? tab : 'you';
  return '<div class="view-header"><div>'+businessNameTagHtml()+'<div class="view-title">Settings</div></div></div>'+
  '<div class="settings-shell is-compact">'+
    '<div class="settings-sidenav">'+navDefs.map(function(n){ return '<button class="settings-nav-item'+(active===n.id?' active':'')+'" data-action="settingsTab" data-tab="'+n.id+'"><span style="margin-right:8px;">'+n.icon+'</span>'+n.label+'</button>'; }).join('')+'</div>'+
    '<div class="settings-content tab-panel" data-key="settings-'+active+'">'+sections[active]+'</div>'+
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
  const soundEl = document.getElementById('setSound'); if(soundEl){ state.profile.soundEnabled = soundEl.value!=='off'; if(soundEl.value!=='off') state.profile.soundPack = soundEl.value==='classic' ? 'classic' : 'modern'; }
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
  const atAwayEl = document.getElementById('setAppTrackingAway'); if(atAwayEl) state.settings.appTracking.awayMinutes = clamp(Number(atAwayEl.value)||10, 3, 120);
  const atCooldownEl = document.getElementById('setAppTrackingCooldown');
  if(atCooldownEl){ const v = Number(atCooldownEl.value); state.settings.appTracking.cooldownMinutes = (isNaN(v) || atCooldownEl.value==='') ? 15 : clamp(v,0,240); }
  const rtEl = document.getElementById('setRecapTime');
  if(rtEl && rtEl.value) state.settings.appTracking.recapTime = rtEl.value;
  const atIdleEl = document.getElementById('setAppTrackingIdle');
  if(atIdleEl) state.settings.appTracking.idleSeconds = clamp(Number(atIdleEl.value)||60, 15, 900);
  persist('profile'); persist('standards'); persist('settings'); renderView();
}
async function exportData(){
  // Images and files live in IndexedDB; bundle them into the export so it's complete.
  const out = JSON.parse(JSON.stringify(state));
  const refs = Array.from(collectBlobRefs(state));
  if(refs.length){
    out.__blobs = {};
    for(const ref of refs){
      const b = await blobFetch(ref);
      if(b){ try{ out.__blobs[ref] = await readAsDataUrl(b); }catch(e){} }
    }
  }
  const data = JSON.stringify(out, null, 2);
  try{
    const blob = new Blob([data], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'operator-data.json';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }catch(e){}
  const area = document.getElementById('exportArea');
  if(area){ area.style.display='block'; area.value = data.length > 400000 ? data.slice(0,400000)+'\n… (truncated here — the downloaded file is complete)' : data; }
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
  state.personal = normalizePersonal(state.personal);
  state.boards = normalizeBoards(state.boards);
}
async function importDataFile(file){
  try{
    const text = await file.text();
    const parsed = JSON.parse(text);
    if(parsed.__blobs && typeof parsed.__blobs==='object'){
      for(const ref of Object.keys(parsed.__blobs)){
        if(!isBlobRef(ref)) continue;
        try{ await blobStore(dataUrlToBlob(parsed.__blobs[ref]), ref.slice(4)); }catch(e){}
      }
    }
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
  state = { profile:defaultProfile(), tasks:{items:[]}, focus:defaultFocus(), health:{gymLog:[],weightLog:[],calorieEntries:[]}, meals:defaultMeals(), journal:{entries:[], types:defaultJournalTypes()}, finances:{debts:[],payments:[],income:[],invoices:[]}, business:{pipeline:[],clients:[]}, calendar:defaultCalendar(), standards:defaultStandards(), daysOff:defaultDaysOff(), goals:defaultGoals(), dashboardPanels:defaultDashboardPanels(), modes:defaultModes(), settings:defaultSettings(), appActivity:defaultAppActivity(), personal:defaultPersonal(), boards:defaultBoards() };
  normalizeAll();
  applyTheme();
  for(const k of STATE_KEYS) await persist(k);
  renderView();
}

