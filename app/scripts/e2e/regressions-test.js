// Bugs found while testing, kept so they stay fixed.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/rg.html');
  const b = await launch();
  const p = await newPage(b, OUT+'/rg.html', {business:{pipeline:[], packages:[], clients:[{id:'c1', name:'Nina', business:'Nina Co', status:'active', touches:[], deliverables:[], journal:[]},{id:'c2', name:'Bo', business:'Bo Co', status:'active', touches:[], deliverables:[], journal:[]}]}});
  const E = (code) => p.evaluate(c => window.__op.ev(c), code);
  await p.click('[data-action="nav"][data-view="business"]'); await p.click('[data-action="businessTab"][data-tab="clients"]');
  // pop-ups open at the top even if the previous one was scrolled down
  await p.click('.cc2[data-key="cc2-c1"] .cc2-top'); await p.waitForTimeout(150);
  // round 13: the modal is split into sections and the section pane is what scrolls; Contact is tall enough to scroll
  const modalScroll = () => p.evaluate(()=>{ const pn = document.querySelector('#clientModalContent .cm-pane'); return document.getElementById('clientModalContent').scrollTop + (pn ? pn.scrollTop : 0); });
  await p.click('#clientModalContent [data-action="clientSec"][data-id="contact"]'); await p.waitForTimeout(100);
  await p.evaluate(()=>{ document.getElementById('clientModalContent').scrollTop = 2000; const pn = document.querySelector('#clientModalContent .cm-pane'); if(pn) pn.scrollTop = 2000; });
  check('(setup) the first pop-up really was scrolled down', (await modalScroll()) > 0);
  await p.click('[data-action="closeClientModalAndSave"]'); await p.waitForTimeout(150);
  await p.click('.cc2[data-key="cc2-c2"] .cc2-top'); await p.waitForTimeout(150);
  const top1 = await modalScroll();
  await p.click('#clientModalContent [data-action="clientSec"][data-id="contact"]'); await p.waitForTimeout(100);
  check('pop-up opens scrolled to top (and its Contact section too)', top1===0 && (await modalScroll())===0);
  await p.click('[data-action="closeClientModalAndSave"]');
  // a client without progress data (older add path) can start a cycle without crashing
  await E("state.business.clients.push({id:'c3', name:'Raw', business:'Raw Co', status:'active', stage:'active', touches:[], deliverables:[], journal:[]}); renderView();");
  await E("openClientModal('c3', true)");
  await p.click('#clientModalContent [data-action="clientSec"][data-id="cycle"]'); await p.waitForTimeout(100); // cycle has its own section now
  await p.click('#clientModalContent [data-action="lcStartCycle"]');
  check('client without progress data can start a cycle', (await E("!!clientStep(state.business.clients.find(c=>c.id==='c3'))")));
  // switching cycles and back resumes the step
  const c3 = "state.business.clients.find(c=>c.id==='c3')";
  await E("setClientStep("+c3+", clientCycle("+c3+").steps[2].id)");
  const first = await E(c3+".cycleId");
  await E("assignCycle("+c3+", cycles()[1].id)");
  await E("assignCycle("+c3+", '"+first+"')");
  check('switching cycles back resumes the step', (await E("clientStep("+c3+").label"))===(await E("cycleById('"+first+"').steps[2].label")));
  check('no page errors', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report()?1:0);
})();
