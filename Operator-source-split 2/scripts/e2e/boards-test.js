// Master vision board vs Milanote boards, board switcher, full screen, Milanote import.
const fs = require('fs'), path = require('path');
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
const ZIP = fs.readFileSync(path.join(__dirname, 'fixtures', 'milanote.zip')).toString('base64');
(async () => {
  instrument(process.argv[2], OUT+'/bd.html');
  const b = await launch();
  const note = (id, title) => ({id, type:'note', header:true, color:'#3FBE8E', title, body:'', x:0, y:0, w:240, h:80});
  const seed = {boards:{boards:[
    {id:'v1', kind:'vision', name:'Vision Board', parentId:null, elements:[note('e1','Mind + Body')], viewport:{x:0,y:0,zoom:1}},
    {id:'v1k', kind:'vision', name:'The Key To Life', parentId:'v1', elements:[], viewport:{x:0,y:0,zoom:1}},
    {id:'v2', kind:'vision', name:'Shoot ideas', parentId:null, elements:[note('e2','Golden hour')], viewport:{x:0,y:0,zoom:1}},
    {id:'v2a', kind:'vision', name:'Locations', parentId:'v2', elements:[], viewport:{x:0,y:0,zoom:1}},
    {id:'j1', kind:'journal', name:'Journal board 1', parentId:null, elements:[], viewport:{x:0,y:0,zoom:1}}]},
    profile:{visionSlideshow:true}};
  const p = await newPage(b, OUT+'/bd.html', seed);
  const E = (code) => p.evaluate(c => window.__op.ev(c), code);
  check('first vision board is the master', await E("state.boards.masterId")==='v1');
  check('its nested board stays with it', await E("boardById('v1k').kind")==='vision');
  check('other vision boards (and nested) moved to Milanote', await E("boardById('v2').kind")==='milanote' && await E("boardById('v2a').kind")==='milanote');
  check('journal boards untouched', await E("boardById('j1').kind")==='journal');
  check('nothing deleted', await E("state.boards.boards.length")===5);
  // Today shows the master board
  check('vision board on Today', await p.isVisible('.vision-panel .board-static') && (await p.textContent('.vision-panel')).includes('Mind + Body'));
  // vision tab
  await p.click('[data-action="nav"][data-view="personal"]'); await p.click('[data-action="personalTab"][data-tab="vision"]');
  check('Vision tab shows only the master board', await E("cv.boardId")==='v1' && (await p.$$('.board-strip')).length===0);
  check('no slideshow checkbox', (await p.$$('#setVisionSlideshow')).length===0);
  await p.click('[data-action="boardFullscreen"]');
  check('full screen', await p.isVisible('.board-shell.is-full') && await E("ui.boardFull")==='vision');
  await p.keyboard.press('Escape');
  check('Esc leaves full screen', !(await p.isVisible('.board-shell.is-full')));
  // milanote tab
  await p.click('[data-action="personalTab"][data-tab="milanote"]');
  check('Milanote tab with board cards', (await p.$$('.board-strip .board-pill[data-action="boardOpen"]')).length===1 && await E("cv.boardId")==='v2');
  check('board card shows a preview', (await p.$$('.board-pill .board-static')).length===1);
  await p.click('.board-pill-new[data-action="boardNew"]');
  check('new Milanote board', await E("boardsOfKind('milanote').filter(x=>!x.parentId).length")===2 && (await p.$$('.board-strip .board-pill[data-action="boardOpen"]')).length===2);
  await p.click('.board-pill[data-id="v2"]');
  check('switch boards from the strip', await E("cv.boardId")==='v2' && await p.isVisible('.board-pill.is-active[data-id="v2"]'));
  // import a Milanote zip export (markdown + images)
  await p.evaluate(async (b64) => {
    const bin = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
    await window.__op.ev('importMilanoteFiles')([new File([bin], 'My Board.zip', {type:'application/zip'})]);
  }, ZIP);
  await p.waitForTimeout(300);
  const imp = await E("cvBoard()");
  const types = imp.elements.map(e=>e.type+(e.header?'+h':'')).join(',');
  check('zip import makes a new Milanote board', imp.kind==='milanote' && imp.name==='My Board', imp.name);
  check('headings → labels, text → notes, bullets → list', types.startsWith('note+h,note,list') , types);
  check('list keeps its heading as title', (imp.elements.find(e=>e.type==='list')||{}).title==="What we're avoiding" && (imp.elements.find(e=>e.type==='list')||{}).items.map(i=>i.text).join('|')==='Staying stuck|More debt');
  check('linked + loose images imported from the zip', imp.elements.filter(e=>e.type==='image' && /^idb:|^data:/.test(e.ref)).length===2, types);
  check('image keeps its shape', (imp.elements.find(e=>e.type==='image')||{}).h===140);
  check('markdown links kept as text', imp.elements.some(e=>e.type==='note' && /link \(https:\/\/example.com\)/.test(e.body)));
  // markdown file on its own
  await p.evaluate(async () => { await window.__op.ev('importMilanoteFiles')([new File(['# Goals\n- Ship it\n- Rest'], 'goals.md', {type:'text/markdown'})]); });
  check('plain .md import', await E("cvBoard().name")==='goals' && await E("cvBoard().elements.length")===1);
  check('no page errors', p.errors.length===0, p.errors);
  await b.close();
  process.exit(report()?1:0);
})();
