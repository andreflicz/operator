// Round 53b: talking to Op live, press after press: nothing said while he connects is lost, one connection at
// a time, a tap in push-to-talk mode still hears you, taps stop him and hang up.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r53b.html');
  const b = await launch();
  const p = await newPage(b, OUT+'/r53b.html', {profile:{name:'Andre', opTalk:'ptt'}, settings:{opLive:true, opAgentId:'agent_x'}}, null);
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  let conns = 0, got = [], srv = null;
  await p.routeWebSocket(/mock\.eleven/, ws => {
    conns++; srv = ws;
    ws.onMessage(m => { let j = null; try{ j = JSON.parse(m); }catch(e){} got.push(j || m);
      if(j && j.type==='conversation_initiation_client_data') ws.send(JSON.stringify({type:'conversation_initiation_metadata', conversation_initiation_metadata_event:{conversation_id:'c1', agent_output_audio_format:'pcm_16000', user_input_audio_format:'pcm_16000'}})); });
  });
  await p.route(/127\.0\.0\.1:8935\//, async r => {
    const u = new URL(r.request().url());
    if(u.pathname.startsWith('/tts/agent/url')){ await new Promise(res => setTimeout(res, 1200)); return r.fulfill({status:200, headers:{'Access-Control-Allow-Origin':'*', 'content-type':'application/json'}, body:JSON.stringify({signed_url:'wss://mock.eleven/v1/convai/conversation?token=t'})}); }
    return r.fulfill({status:200, headers:{'Access-Control-Allow-Origin':'*', 'content-type':'application/json'}, body:'{}'});
  });
  await p.reload(); await p.waitForTimeout(600);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); AI.hasKey = false; navigator.mediaDevices.getUserMedia = async () => { const ac = new AudioContext(), o = ac.createOscillator(), d = ac.createMediaStreamDestination(); o.connect(d); o.start(); return d.stream; }");

  // hold the key: the mic is open at once, while he's still connecting
  await p.keyboard.down('AltRight'); await p.waitForTimeout(150);
  await E("OPRT.ctxIn && OPRT.ctxIn.resume()"); await p.waitForTimeout(500);
  check('the mic opens the moment you press', await E("OPRT.state")==='connecting' && await E("OPRT.pre.length") > 0);
  await p.keyboard.up('AltRight'); await p.keyboard.down('AltRight'); await p.waitForTimeout(80); await p.keyboard.up('AltRight');
  await p.waitForTimeout(1600);
  check('pressing again while he connects: still one connection', conns===1 && await E("OPRT.state")==='live', conns);
  await p.waitForTimeout(400);
  check('what you said while he connected is sent', got.filter(g => g && g.user_audio_chunk).length >= 2);
  // tap the light while live: he hangs up
  await E("ACTIONS.opLightTap()"); await p.waitForTimeout(200);
  check('tap while he’s listening: he hangs up', await E("OPRT.state")==='off');

  // push-to-talk mode, but a tap on the button: he listens hands-free (so he hears you)
  got = [];
  await E("ACTIONS.opTalk()"); await p.waitForTimeout(150);
  check('a tap starts him hands-free even in push-to-talk mode', await E("OPRT.ptt")===false);
  await E("ACTIONS.opTalk()"); await p.waitForTimeout(100);
  check('a second tap while he connects cancels it, nothing left hanging', await E("OPRT.state")==='off' && await E("!OPRT.stream && !OPRT.proc"));
  await p.waitForTimeout(1600);
  check('and the cancelled one never connects', await E("OPRT.state")==='off' && conns===1, conns);
  await E("ACTIONS.opTalk()"); await p.waitForTimeout(1700); await E("OPRT.ctxIn && OPRT.ctxIn.resume()"); await p.waitForTimeout(400);
  check('tap again: live, and your voice goes through', await E("OPRT.state")==='live' && got.some(g => g && g.user_audio_chunk));
  // he's talking; a tap stops him, and the rest of that answer doesn't play
  if(!srv){ report(); process.exit(1); }
  srv.send(JSON.stringify({type:'audio', audio_event:{audio_base_64:Buffer.alloc(32000).toString('base64'), event_id:1}})); await p.waitForTimeout(150);
  check('he is speaking', await E("OV.speaking"));
  await E("ACTIONS.opTalk()"); await p.waitForTimeout(50);
  srv.send(JSON.stringify({type:'audio', audio_event:{audio_base_64:Buffer.alloc(32000).toString('base64'), event_id:2}})); await p.waitForTimeout(150);
  check('tap while he talks: he stops, and stays stopped', !(await E("OV.speaking")) && await E("OPRT.state")==='live');
  srv.send(JSON.stringify({type:'user_transcript', user_transcription_event:{user_transcript:'ok next thing'}}));
  srv.send(JSON.stringify({type:'audio', audio_event:{audio_base_64:Buffer.alloc(32000).toString('base64'), event_id:3}})); await p.waitForTimeout(150);
  check('your next turn, he answers again', await E("OV.speaking"));
  check('his live brief says: use a tool, then one line', /don’t say what you’re about to do/.test(await E("opLiveRules()")));
  await E("OPRT.stop('t')");
  check('no errors', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
