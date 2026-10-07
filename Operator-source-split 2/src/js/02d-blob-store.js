
// ============ BLOB STORE (images + files) ============
// localStorage holds ~5 MB total, which a handful of screenshots would fill (and a failed
// save silently loses data). Binary content — journal photos, client/lead files, vision
// board images, wish list images — goes into IndexedDB instead, and the JSON state only
// keeps a small reference string "idb:<id>". Older inline data: URLs keep working as-is.
// If IndexedDB isn't available the content falls back to an inline data: URL.
const BLOB_DB_NAME = 'operator-blobs';
const BLANK_IMG = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
let blobDbPromise = null;
const blobUrlCache = {};
const blobLoading = {};
function blobDb(){
  if(!blobDbPromise){
    blobDbPromise = new Promise(function(resolve, reject){
      try{
        if(!window.indexedDB) return reject(new Error('no indexedDB'));
        const req = indexedDB.open(BLOB_DB_NAME, 1);
        req.onupgradeneeded = function(){ req.result.createObjectStore('blobs'); };
        req.onsuccess = function(){ resolve(req.result); };
        req.onerror = function(){ reject(req.error); };
      }catch(e){ reject(e); }
    });
  }
  return blobDbPromise;
}
function blobTx(mode, fn){
  return blobDb().then(function(db){
    return new Promise(function(resolve, reject){
      const tx = db.transaction('blobs', mode);
      const store = tx.objectStore('blobs');
      const req = fn(store);
      tx.oncomplete = function(){ resolve(req ? req.result : undefined); };
      tx.onerror = function(){ reject(tx.error); };
      tx.onabort = function(){ reject(tx.error); };
    });
  });
}
function isBlobRef(ref){ return typeof ref==='string' && ref.indexOf('idb:')===0; }
function readAsDataUrl(blob){
  return new Promise(function(resolve, reject){
    const r = new FileReader();
    r.onload = function(){ resolve(r.result); };
    r.onerror = function(){ reject(r.error); };
    r.readAsDataURL(blob);
  });
}
function dataUrlToBlob(dataUrl){
  const parts = String(dataUrl).split(',');
  const mime = (parts[0].match(/data:([^;]+)/)||[])[1] || 'application/octet-stream';
  const bin = atob(parts[1]||'');
  const bytes = new Uint8Array(bin.length);
  for(let i=0;i<bin.length;i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], {type:mime});
}
// Stores a Blob/File and resolves to a reference string to keep in state.
async function blobStore(blob, idOverride){
  const id = idOverride || ('b'+uid());
  try{
    await blobTx('readwrite', function(store){ return store.put(blob, id); });
    blobUrlCache[id] = URL.createObjectURL(blob);
    return 'idb:'+id;
  }catch(e){
    return await readAsDataUrl(blob);
  }
}
async function blobFetch(ref){
  if(!ref) return null;
  if(!isBlobRef(ref)){
    if(ref.indexOf('data:')===0) return dataUrlToBlob(ref);
    return null;
  }
  try{ return await blobTx('readonly', function(store){ return store.get(ref.slice(4)); }) || null; }
  catch(e){ return null; }
}
function blobRemove(ref){
  if(!isBlobRef(ref)) return;
  const id = ref.slice(4);
  if(blobUrlCache[id]){ try{ URL.revokeObjectURL(blobUrlCache[id]); }catch(e){} delete blobUrlCache[id]; }
  blobTx('readwrite', function(store){ return store.delete(id); }).catch(function(){});
}
// Synchronous URL for rendering. Unloaded refs return a transparent pixel and trigger a
// load; once it lands the view re-renders with the real URL (stable from then on).
function blobUrl(ref){
  if(!ref) return BLANK_IMG;
  if(!isBlobRef(ref)) return ref;
  const id = ref.slice(4);
  if(blobUrlCache[id]) return blobUrlCache[id];
  if(!blobLoading[id]){
    blobLoading[id] = true;
    blobFetch(ref).then(function(b){
      if(b){ blobUrlCache[id] = URL.createObjectURL(b); scheduleRender(); }
    });
  }
  return BLANK_IMG;
}
// Very large images are scaled down (longest side 2400px) so boards and journals stay
// fast; everything else is kept byte-for-byte.
async function prepareImageBlob(file){
  if(!file || !file.type || file.type.indexOf('image/')!==0) return file;
  if(file.size <= 6*1024*1024 || file.type==='image/gif' || file.type==='image/svg+xml') return file;
  try{
    const url = URL.createObjectURL(file);
    const img = await new Promise(function(res, rej){ const i = new Image(); i.onload=function(){ res(i); }; i.onerror=rej; i.src=url; });
    const scale = Math.min(1, 2400/Math.max(img.naturalWidth, img.naturalHeight));
    const c = document.createElement('canvas');
    c.width = Math.round(img.naturalWidth*scale); c.height = Math.round(img.naturalHeight*scale);
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    URL.revokeObjectURL(url);
    return await new Promise(function(res){ c.toBlob(function(b){ res(b||file); }, 'image/jpeg', 0.88); });
  }catch(e){ return file; }
}
async function storeImageFile(file){ return blobStore(await prepareImageBlob(file)); }
// Images from a paste or drop event (clipboard screenshots, files dragged from Finder).
function imageFilesFromTransfer(dt){
  const out = [];
  if(!dt) return out;
  if(dt.files && dt.files.length){
    Array.prototype.forEach.call(dt.files, function(f){ if(f.type && f.type.indexOf('image/')===0) out.push(f); });
  }
  if(!out.length && dt.items){
    Array.prototype.forEach.call(dt.items, function(it){
      if(it.kind==='file' && it.type.indexOf('image/')===0){ const f = it.getAsFile(); if(f) out.push(f); }
    });
  }
  return out;
}
function transferHasFiles(dt){
  return !!(dt && dt.types && Array.prototype.indexOf.call(dt.types, 'Files')>=0);
}
// Every "idb:" reference anywhere in state (for export).
function collectBlobRefs(obj, out){
  out = out || new Set();
  if(typeof obj==='string'){ if(isBlobRef(obj)) out.add(obj); }
  else if(Array.isArray(obj)) obj.forEach(function(v){ collectBlobRefs(v, out); });
  else if(obj && typeof obj==='object') Object.keys(obj).forEach(function(k){ collectBlobRefs(obj[k], out); });
  return out;
}
