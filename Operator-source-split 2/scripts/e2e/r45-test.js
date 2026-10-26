// Round 45 (build 5): Op. On/off, quiet while you work, "I'm busy", the wrap-up and goodnight, push to talk,
// no memory list, and the live ElevenLabs agent (against a stand-in server).
const { instrument, newPage, check, report, OUT } = require('./common.js');
const { chromium } = require('playwright');
const fs = require('fs');
function chromePath(){ try{ const d = fs.readdirSync('/opt/pw-browsers').filter(n => /^chromium-\d+$/.test(n)).sort().pop(); for(const sub of ['chrome-linux/chrome', 'chrome-linux64/chrome']){ const f = '/opt/pw-browsers/'+d+'/'+sub; if(fs.existsSync(f)) return f; } }catch(e){} return undefined; }
(async () => {
  instrument(process.argv[2], OUT+'/r45.html');
  const b = await chromium.launch({args:['--no-sandbox', '--autoplay-policy=no-user-gesture-required']});
  const T = new Date(2026, 9, 26, 11, 0).getTime();   // Mon Oct 26, work hours
  const p = await newPage(b, OUT+'/r45.html', {profile:{name:'Andre Lopez', xpBook:43, xpLevel:0, opMemory:[{id:'m1', text:'Andre runs a video agency.', at:1}]},
    tasks:{items:[{id:'t1', title:'Edit JJS reel', status:'done', completedAt:'2026-10-26'}, {id:'t2', title:'Send Kiko invoice', status:'today'}]},
    focus:{wake:{voice:false, enabled:true, time:'07:30', days:[0,1,2,3,4,5,6]}}}, T);
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  const bub = async () => (await p.$('#opBubText')) ? (await p.textContent('#opBubText')) : '';
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); AI.hasKey = false; ui.view='today'; renderView()"); await p.waitForTimeout(300);

  // on / off
  await E("ACTIONS.opPower()");
  await E("opNotify('Off test line.')"); await p.waitForTimeout(100);
  check('off: he says nothing, and his light dims', !(await E("opOn()")) && !/Off test line/.test(await bub()) && await E("document.body.classList.contains('op-off')"));
  await E("ACTIONS.opLightTap()");
  check('tapping the light turns him back on', await E("opOn()") && !(await E("document.body.classList.contains('op-off')")));

  // quiet while you work
  await E("OPX.userAt = 0; state.focus.activeSession = {startedAt:Date.now() - 50*60000, plannedMinutes:90, completedTasks:[], breaks:[], onBreak:false}; renderView()");
  await E("opNotify('Edit JJS reel is due today and it’s still open.')"); await p.waitForTimeout(100);
  check('locked in: what he’d say waits', !/still open/.test(await bub()) && await E("OPX.held.length")===1 && !(await E("typeof opPressDue==='function' ? opPressDue() : false")));
  check('…and the light shows something is waiting', await E("document.getElementById('opLight').classList.contains('has-held')"));
  await E("OPX.userAt = Date.now(); opNotify('Answering you.')"); await p.waitForTimeout(100);
  check('talk to him while locked in and he answers', /Answering you/.test(await bub()));
  await E("OPX.userAt = 0; state.focus.activeSession = null; renderView()"); await p.waitForTimeout(6000);
  check('come out of it and you get what waited, in one line', /still open/.test(await bub()) && await E("OPX.held.length")===0, await bub());

  // I'm busy
  const says = JSON.parse(await E("JSON.stringify(['I’m busy', 'im on a call', 'busy, give me 30 min', 'not now', 'I’m busy tomorrow at 3, add a meeting', 'what’s next'].map(t => [opBusySays(t), opBusyMins(t)]))"));
  check('he hears busy (and how long), not a request that happens to say busy', says[0][0] && says[1][0] && says[2][0] && says[2][1]===30 && says[3][0] && !says[4][0] && !says[5][0], says);
  await E("const a = acct(); a.log.push({id:'ck1', status:'pending', at:Date.now(), date:todayStr(), facts:{}}); a.pending = {id:'ck1', stage:'ping', at:Date.now()}");
  await E("aiAsk('I’m busy, on a call')"); await p.waitForTimeout(150);
  check('“I’m busy” settles the check-in as a real reason', await E("acct().log.find(e => e.id==='ck1').status")==='excused' && await E("acct().pending")===null && await E("acct().log.find(e => e.id==='ck1').why")==='Busy');
  check('…and he backs off for an hour', await E("Math.round((state.focus.opBusyUntil - Date.now())/60000)")===60 && /Back in 1 hour/.test(await bub()));
  await E("OPX.userAt = 0; opNotify('Busy test line.')");
  check('while you’re busy he holds it', !/Busy test line/.test(await bub()) && await E("OPX.held.some(h => /Busy test/.test(h.t))"));
  await E("ACTIONS.opBusyEnd()");
  check('Busy has a way back', !(await E("opBusyNow()")));
  check('the bubble has Busy and the off switch', !!(await p.$('#opBub .op-bub-busy')) && !!(await p.$('#opBub .op-bub-pw')));

  // wrap-up and goodnight
  await E("OPX.held = []; OPX.userAt = 0; workDayState().wrapSaid = 0; opNotify('That’s the end of your work hours. Wrap up what you’re on, then clock out.')"); await p.waitForTimeout(300);
  const wrap = await bub();
  check('end of work hours: a real wrap-up, by name', /That’s the day/.test(wrap) && /Edit JJS reel/.test(wrap) && /Send Kiko invoice/.test(wrap), wrap);
  await E("opCaption('x'); opWrapUp('clockout')"); await p.waitForTimeout(200);
  check('…once a day', !/That’s the day/.test(await bub()));
  await E("opGoodnight()"); await p.waitForTimeout(300);
  check('going to sleep: goodnight, with the alarm', /Goodnight, Andre/.test(await bub()) && /7:30 AM/.test(await bub()), await bub());

  // settings: no memory list; the switch, talking, live
  await E("ui.view='settings'; ui.settingsTab='connections'; renderView()"); await p.waitForTimeout(200);
  const sh = await E("opSettingsHtml()");
  check('Settings: what he remembers is gone from the screen (the memory still works)', !/What Op remembers/.test(sh) && !/Andre runs a video agency/.test(sh) && await E("opMemory().length")===1);
  check('Settings: the switch, how you talk, quiet while you work, live', /r45-pw/.test(sh) && /Hands-free/.test(sh) && /Push to talk/.test(sh) && /Quiet while you work/.test(sh) && /Live conversation/.test(sh));

  // push to talk
  await E("state.profile.opTalk='ptt'; renderView()");
  await p.keyboard.down('AltRight'); await p.waitForTimeout(150);
  check('push to talk: hold Right ⌥ and he listens, without cutting you off', await E("OPX.ptt") && await E("opPauseMs()")===600000);
  await p.keyboard.up('AltRight'); await p.waitForTimeout(150);
  check('…let go and it sends', !(await E("OPX.ptt")));
  check('in push to talk the mic never opens on its own', await E("(function(){ let hit = false; const was = AI.listening; aiAutoListen('opBubText'); return AI.listening===was; })()"));
  await E("if(AI.cancelListen) AI.cancelListen(); state.profile.opTalk='free'");

  // live: an ElevenLabs agent, against a stand-in
  const got = [];
  let srv = null;
  await p.routeWebSocket(/mock\.eleven/, ws => {
    srv = ws;
    ws.onMessage(m => { let j = null; try{ j = JSON.parse(m); }catch(e){} got.push(j || m);
      if(j && j.type==='conversation_initiation_client_data') ws.send(JSON.stringify({type:'conversation_initiation_metadata', conversation_initiation_metadata_event:{conversation_id:'c1', agent_output_audio_format:'pcm_16000', user_input_audio_format:'pcm_16000'}})); });
  });
  let createBody = null;
  await p.route(/127\.0\.0\.1:8935\/tts\/agent\//, r => {
    const u = new URL(r.request().url());
    if(u.pathname.startsWith('/tts/agent/url')) return r.fulfill({status:200, headers:{'Access-Control-Allow-Origin':'*', 'content-type':'application/json'}, body:JSON.stringify({signed_url:'wss://mock.eleven/v1/convai/conversation?agent_id='+u.searchParams.get('a')+'&token=t'})});
    createBody = Buffer.from(u.searchParams.get('b') || '', 'hex').toString('utf8');
    return r.fulfill({status:200, headers:{'Access-Control-Allow-Origin':'*', 'content-type':'application/json'}, body:JSON.stringify({agent_id:'agent_new'})});
  });
  await E("persistFlush()"); await p.reload(); await p.waitForTimeout(600);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); AI.hasKey = false");
  await E("ACTIONS.opLiveCreate()"); await p.waitForTimeout(500);
  let cb = null; try{ cb = JSON.parse(createBody); }catch(e){}
  check('“Make his agent”: his brief, his voice and every tool, as client tools, with overrides allowed', await E("state.settings.opAgentId")==='agent_new' && await E("state.settings.opLive")===true &&
    !!cb && cb.conversation_config.agent.prompt.tools.some(t => t.type==='client' && t.name==='add_task' && t.parameters.properties.title) && cb.platform_settings.overrides.conversation_config_override.agent.prompt.prompt===true);
  await E("navigator.mediaDevices.getUserMedia = async () => { const ac = new AudioContext(), o = ac.createOscillator(), d = ac.createMediaStreamDestination(); o.connect(d); o.start(); return d.stream; }");
  await E("OPX.userAt = Date.now(); aiListen('opBubText')"); await p.waitForTimeout(900);
  const init = got.find(g => g && g.type==='conversation_initiation_client_data');
  check('live: it connects on a signed link and sends his brief and the day', await E("OPRT.state")==='live' && !!init && /Background from the app/.test(init.conversation_config_override.agent.prompt.prompt) && init.dynamic_variables.user_name==='Andre');
  await E("OPRT.ctxIn && OPRT.ctxIn.resume()"); await p.waitForTimeout(800);
  check('your voice streams to it as audio chunks', got.some(g => g && g.user_audio_chunk));
  if(!srv){ report(); process.exit(1); }
  srv.send(JSON.stringify({type:'ping', ping_event:{event_id:7, ping_ms:0}})); await p.waitForTimeout(200);
  check('it answers pings', got.some(g => g && g.type==='pong' && g.event_id===7));
  srv.send(JSON.stringify({type:'client_tool_call', client_tool_call:{tool_name:'add_task', tool_call_id:'tc1', parameters:{title:'Call Kiko back', list:'today'}}})); await p.waitForTimeout(300);
  check('he uses his tools live: the task is added and the result goes back', await E("state.tasks.items.some(t => t.title==='Call Kiko back')") && got.some(g => g && g.type==='client_tool_result' && g.tool_call_id==='tc1' && !g.is_error));
  srv.send(JSON.stringify({type:'agent_response', agent_response_event:{agent_response:'Added it. Kiko’s on today.'}}));
  srv.send(JSON.stringify({type:'audio', audio_event:{audio_base_64:Buffer.alloc(3200).toString('base64'), event_id:1}})); await p.waitForTimeout(300);
  check('his words show as he speaks them', /Kiko’s on today/.test(await bub()));
  srv.send(JSON.stringify({type:'interruption', interruption_event:{reason:'user'}})); await p.waitForTimeout(100);
  check('talk over him and he stops', await E("OPRT.nodes.length")===0 && !(await E("OV.speaking")));
  await E("aiAsk('typed hello')"); await p.waitForTimeout(150);
  check('typing while live goes to the same conversation', got.some(g => g && g.type==='user_message' && g.text==='typed hello'));
  srv.send(JSON.stringify({type:'user_transcript', user_transcription_event:{user_transcript:'I’m busy, give me 20 minutes'}})); await p.waitForTimeout(400);
  check('“I’m busy” live: he hangs up and backs off', await E("OPRT.state")==='off' && await E("Math.round((state.focus.opBusyUntil - Date.now())/60000)")===20);
  await E("ACTIONS.opBusyEnd()");
  await p.screenshot({path:OUT+'/r45-op.png'});
  check('no page errors (round 45)', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report() ? 1 : 0);
})();
