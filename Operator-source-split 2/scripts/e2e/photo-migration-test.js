// Old journal photos stored inline (data: URLs) must move to IndexedDB and still display.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/pm.html');
  const b = await launch();
  const png = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAQAAAADCAIAAAA7ljmRAAAAFklEQVR4nGP8z8DAwMDAxMDAwMDAAAAWBAEB3n1ZGwAAAABJRU5ErkJggg==';
  const p = await newPage(b, OUT+'/pm.html', {journal:{entries:[{id:'j1', date:'2026-10-01', timestamp:Date.now(), text:'old entry', photos:[png]}]}});
  await p.waitForTimeout(4500);
  const ref = await p.evaluate(() => JSON.parse(localStorage.getItem('opsdash:journal')).entries[0].photos[0]);
  check('inline photo moved to image store', typeof ref==='string' && ref.startsWith('idb:'), ref && ref.slice(0,30));
  await p.reload(); await p.waitForTimeout(500);
  await p.click('[data-action="nav"][data-view="personal"]'); await p.click('[data-action="personalTab"][data-tab="journal"]');
  // the image store loads asynchronously; give it a few seconds on a busy machine
  const shown = await p.waitForFunction(() => { const i = document.querySelector('.journal-entry .journal-photo-thumb'); return !!i && i.src.startsWith('blob:') && i.naturalWidth===4; }, null, {timeout:5000}).then(()=>true, ()=>false);
  check('photo still displays after reload', shown);
  check('no page errors', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report()?1:0);
})();
