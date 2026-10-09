
// ============ MILANOTE IMPORT ============
// Brings a Milanote export into a new board in the Milanote section. Accepts what Milanote
// gives you: a Markdown / text export, images, an HTML page, or a .zip of any of those.
// Headings become colored label cards, paragraphs become notes, bullet lists become list
// cards, images (linked or inside the zip) become image cards — laid out in columns.
ACTIONS.boardImport = function(){
  const inp = document.createElement('input');
  inp.type = 'file'; inp.multiple = true;
  inp.accept = '.zip,.md,.markdown,.txt,.html,.htm,image/*';
  inp.onchange = function(){ importMilanoteFiles(Array.prototype.slice.call(inp.files||[])); };
  inp.click();
};
// ---- minimal zip reader (stored + deflate), using the browser's DecompressionStream ----
async function inflateRaw(bytes){
  const ds = new DecompressionStream('deflate-raw');
  const out = new Response(new Blob([bytes]).stream().pipeThrough(ds));
  return new Uint8Array(await out.arrayBuffer());
}
async function unzipEntries(buf){
  const dv = new DataView(buf), u8 = new Uint8Array(buf);
  let eocd = -1;
  for(let i=buf.byteLength-22; i>=Math.max(0, buf.byteLength-65557); i--){ if(dv.getUint32(i, true)===0x06054b50){ eocd = i; break; } }
  if(eocd<0) throw new Error('Not a zip file');
  const count = dv.getUint16(eocd+10, true);
  let p = dv.getUint32(eocd+16, true);
  const dec = new TextDecoder();
  const out = [];
  for(let n=0; n<count; n++){
    if(dv.getUint32(p, true)!==0x02014b50) break;
    const method = dv.getUint16(p+10, true), csize = dv.getUint32(p+20, true);
    const nameLen = dv.getUint16(p+28, true), extraLen = dv.getUint16(p+30, true), commentLen = dv.getUint16(p+32, true);
    const local = dv.getUint32(p+42, true);
    const name = dec.decode(u8.subarray(p+46, p+46+nameLen));
    p += 46+nameLen+extraLen+commentLen;
    if(/\/$/.test(name) || /(^|\/)(__MACOSX|\.DS_Store)/.test(name)) continue;
    const dataStart = local+30+dv.getUint16(local+26, true)+dv.getUint16(local+28, true);
    const raw = u8.subarray(dataStart, dataStart+csize);
    let data = null;
    if(method===0) data = raw.slice();
    else if(method===8) data = await inflateRaw(raw);
    else continue;
    out.push({name:name, data:data});
  }
  return out;
}
function mimeFor(name){
  const ext = (name.split('.').pop()||'').toLowerCase();
  return {png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', gif:'image/gif', webp:'image/webp', avif:'image/avif', svg:'image/svg+xml', heic:'image/heic'}[ext] || '';
}
function baseName(path){ return decodeURIComponent(String(path||'').split(/[\\/]/).pop()||'').toLowerCase(); }
// ---- text → cards ----
function cleanMd(s){
  return String(s||'')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, function(m, t, u){ return t===u ? u : t+' ('+u+')'; })
    .replace(/(\*\*|__)(.*?)\1/g, '$2').replace(/(^|\s)[*_](\S[^*_]*)[*_]/g, '$1$2')
    .replace(/`([^`]*)`/g, '$1').trim();
}
function parseMarkdownCards(text){
  const cards = [];
  const lines = String(text||'').replace(/\r\n?/g, '\n').split('\n');
  let para = [], list = null, lastHeading = null;
  const flushPara = function(){ const t = cleanMd(para.join('\n')); if(t) cards.push({type:'note', body:t}); para = []; };
  const flushList = function(){ if(list && list.items.length) cards.push({type:'list', title:list.title, items:list.items}); list = null; };
  lines.forEach(function(raw){
    const line = raw.replace(/\s+$/, '');
    const imgRe = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g; let m;
    while((m = imgRe.exec(line))){ flushPara(); flushList(); cards.push({type:'image', src:m[2], alt:m[1]}); }
    const htmlImg = /<img[^>]+src=["']([^"']+)["']/gi; let hm;
    while((hm = htmlImg.exec(line))){ flushPara(); flushList(); cards.push({type:'image', src:hm[1]}); }
    const bare = line.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/<img[^>]*>/gi, '').trim();
    if(!bare){ flushPara(); return; }
    const h = /^(#{1,6})\s+(.*)$/.exec(bare);
    if(h){ flushPara(); flushList(); lastHeading = cleanMd(h[2]); cards.push({type:'label', title:lastHeading, level:h[1].length}); return; }
    const li = /^\s*(?:[-*+]|\d+[.)])\s+(?:\[[ xX]\]\s+)?(.*)$/.exec(bare);
    if(li){ flushPara(); if(!list) list = {title:lastHeading && cards.length && cards[cards.length-1].type==='label' ? (cards.pop(), lastHeading) : 'List', items:[]}; list.items.push(cleanMd(li[1])); return; }
    if(/^(-{3,}|\*{3,}|_{3,})$/.test(bare)){ flushPara(); flushList(); return; }
    flushList();
    para.push(bare.replace(/^>\s?/, ''));
  });
  flushPara(); flushList();
  return cards;
}
function htmlToMarkdownish(html){
  const doc = new DOMParser().parseFromString(html, 'text/html');
  const out = [];
  const walk = function(node){
    node.childNodes.forEach(function(n){
      if(n.nodeType===3){ const t = n.textContent.trim(); if(t) out.push(t); return; }
      if(n.nodeType!==1) return;
      const tag = n.tagName.toLowerCase();
      if(tag==='script' || tag==='style') return;
      if(/^h[1-6]$/.test(tag)){ out.push('\n'+'#'.repeat(Number(tag[1]))+' '+n.textContent.trim()+'\n'); return; }
      if(tag==='li'){ out.push('- '+n.textContent.trim()); return; }
      if(tag==='img'){ out.push('![]('+(n.getAttribute('src')||'')+')'); return; }
      if(tag==='p' || tag==='div' || tag==='section' || tag==='article'){ out.push(''); walk(n); out.push(''); return; }
      walk(n);
    });
  };
  walk(doc.body||doc);
  return out.join('\n');
}
async function imageSize(blob){
  try{ const bm = await createImageBitmap(blob); const r = {w:bm.width, h:bm.height}; bm.close && bm.close(); return r; }
  catch(e){ return {w:4, h:3}; }
}
async function importMilanoteFiles(files){
  if(!files.length) return;
  showToast('Importing '+(files.length===1 ? files[0].name : files.length+' files')+'…', {icon:'&#11014;', duration:2500});
  try{
    // expand zips
    let entries = [];
    for(const f of files){
      if(/\.zip$/i.test(f.name) || f.type==='application/zip'){
        const inner = await unzipEntries(await f.arrayBuffer());
        inner.forEach(function(e){ entries.push({name:e.name, blob:new Blob([e.data], {type:mimeFor(e.name)})}); });
      } else entries.push({name:f.name, blob:f});
    }
    const imagesByName = {};
    entries.forEach(function(e){ if(mimeFor(e.name) || /^image\//.test(e.blob.type)) imagesByName[baseName(e.name)] = e; });
    const usedImages = new Set();
    let cards = [];
    for(const e of entries){
      if(/\.(md|markdown|txt)$/i.test(e.name)) cards = cards.concat(parseMarkdownCards(await e.blob.text()));
      else if(/\.html?$/i.test(e.name)) cards = cards.concat(parseMarkdownCards(htmlToMarkdownish(await e.blob.text())));
    }
    cards.forEach(function(c){ if(c.type==='image' && !/^https?:/i.test(c.src) && imagesByName[baseName(c.src)]) usedImages.add(baseName(c.src)); });
    Object.keys(imagesByName).forEach(function(k){ if(!usedImages.has(k)) cards.push({type:'image', src:k, loose:true}); });
    if(!cards.length){ showToast('Nothing to import in that file.', {icon:'&#9888;'}); return; }
    // build elements in a 4-column masonry
    const COLS = 4, W = 280, GAP = 28;
    const colY = [0,0,0,0];
    const els = [];
    let colorIdx = 0, z = 1;
    const place = function(el, h){
      let c = 0; for(let i=1;i<COLS;i++) if(colY[i]<colY[c]) c = i;
      el.x = c*(W+GAP); el.y = colY[c]; el.w = W; el.h = h; el.z = z++; el.id = uid();
      colY[c] += h+GAP; els.push(el);
    };
    let imported = 0, skipped = 0;
    for(const c of cards){
      if(c.type==='label'){ place({type:'note', header:true, color:BOARD_COLORS[colorIdx++ % 7], title:c.title, body:''}, 56); }
      else if(c.type==='note'){ const lines = Math.ceil(c.body.length/34) + (c.body.match(/\n/g)||[]).length; place({type:'note', header:false, title:'', body:c.body}, Math.min(420, 30+lines*20)); }
      else if(c.type==='list'){ place({type:'list', title:c.title, color:'#3a3f4d', items:c.items.map(function(t){ return {id:uid(), text:t}; })}, 48+c.items.length*22); }
      else if(c.type==='image'){
        let ref = null, size = {w:4, h:3};
        if(/^https?:/i.test(c.src)) ref = c.src;
        else {
          const e = imagesByName[baseName(c.src)];
          if(e){ const blob = e.blob.type ? e.blob : new Blob([e.blob], {type:mimeFor(e.name)||'image/png'}); size = await imageSize(blob); ref = await storeImageFile(new File([blob], baseName(e.name), {type:blob.type})); }
        }
        if(!ref){ skipped++; continue; }
        place({type:'image', ref:ref}, Math.round(W*size.h/Math.max(1,size.w)));
      }
      imported++;
    }
    const first = files[0].name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' ').trim();
    const b = createBoard('milanote', first || 'Milanote import');
    b.elements = els;
    persist('boards');
    ui.view = 'personal'; ui.personalTab = 'milanote';
    openBoard('milanote', b.id);
    setTimeout(fitBoard, 80);
    playPositive();
    showToast('Imported '+imported+' card'+(imported===1?'':'s')+' into “'+b.name+'”'+(skipped?' ('+skipped+' image'+(skipped===1?'':'s')+' not found)':''), {icon:'&#128204;', duration:6000});
  }catch(err){
    showToast('Couldn\'t read that file: '+(err && err.message || err), {icon:'&#9888;', duration:6000});
  }
}
