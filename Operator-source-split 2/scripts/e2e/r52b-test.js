// Round 52b: Op's live voice: the voice update goes on its own (small), a failure says why, every call sets the voice.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r52b.html');
  const b = await launch();
  const p = await newPage(b, OUT+'/r52b.html', {profile:{name:'Andre Lopez'}, settings:{opLive:true, opAgentId:'ag1'}, focus:{wake:{voiceEngine:'eleven', elevenVoice:'VIRAJ123'}}}, null);
  const bodies = []; let fail = false;
  const H = {'Access-Control-Allow-Origin':'*', 'content-type':'application/json'};
  await p.route(/127\.0\.0\.1:8935\/tts\/agent\/update/, r => { const u = new URL(r.request().url()); bodies.push(Buffer.from(u.searchParams.get('b'), 'hex').toString()); return fail ? r.fulfill({status:422, headers:H, body:JSON.stringify({detail:{message:'voice_id not found'}})}) : r.fulfill({status:200, headers:H, body:'{}'}); });
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  const ok = await E("opLiveSync()");
  const first = JSON.parse(bodies[0] || '{}');
  check('the voice goes first, on its own', first.conversation_config && first.conversation_config.tts && first.conversation_config.tts.voice_id==='VIRAJ123' && !(first.conversation_config.agent));
  check('…with permission for each call to set the voice', !!(first.platform_settings && first.platform_settings.overrides.conversation_config_override.tts.voice_id));
  check('the brief follows separately', bodies.some(x => /"prompt":\{"prompt"/.test(x) && !/voice_id/.test(x)) && ok===true);
  check('every call sets the voice too', await E("opLiveInit().conversation_config_override.tts.voice_id")==='VIRAJ123');
  check('the live brief says keep it short', /Keep it short/.test(await E("opLiveBase()")) && /Keep it short/.test(await E("opLivePrompt()")));
  // a changed voice syncs again; a failure says why
  fail = true; await E("wakeCfg().elevenVoice = 'JAMES456'; ui.r52SyncWhy = null"); const ok2 = await E("opLiveSync()");
  check('a failed update says why, instead of quietly keeping the old voice', ok2===false && /voice_id not found/.test(await E("ui.r52SyncWhy || ''")));
  check('no errors', p.errors.length===0, p.errors);
  await b.close(); process.exit(report() ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
