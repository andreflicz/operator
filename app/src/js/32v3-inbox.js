// ============ THE FREE WAY IN: CSV EXPORTS, PICKED UP FROM DOWNLOADS ============
// No paid service needed. Export your Instagram insights from Meta Business Suite (Insights → Content
// → Export data) or a statement from your bank's website, and when the file lands in Downloads the
// Operator app (helper 15+) shows it to the page: insights go to Social, card purchases to Expenses.
// Anything else in Downloads is left alone. Every import can be undone from its toast.

// ---- which kind of file is it ----
const BANK_COLS = {date:/^(transaction date|trans\.? date|date|posted date|posting date|post date)$/i, amount:/^(amount|transaction amount|amount \(usd\))$/i,
  debit:/^(debit|debit amount|withdrawals?|money out)$/i, credit:/^(credit|credit amount|deposits?|money in)$/i,
  desc:/^(description|payee|merchant|name|memo|details|transaction description|original description)$/i, type:/^(type|transaction type|details)$/i};
function csvHead(rows){ return (rows[0] || []).map(function(h){ return String(h).replace(/^﻿/, '').trim(); }); }
function csvKind(rows){
  const head = csvHead(rows); if(head.length < 2 || rows.length < 2) return null;
  const has = function(re){ return head.some(function(h){ return re.test(h); }); };
  // insights have engagement columns; a statement has money columns (a statement never has likes)
  if(has(/^(likes|reactions|reach|accounts reached|views|plays|impressions|comments|permalink)/i) && has(CSV_COLS.date)) return 'social';
  if(has(BANK_COLS.date) && (has(BANK_COLS.amount) || has(BANK_COLS.debit)) && has(BANK_COLS.desc)) return 'bank';
  return null;
}
// ---- a bank statement → expenses ----
function bankDate(s){
  s = String(s||'').trim();
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s); if(m) return m[1]+'-'+m[2].padStart(2, '0')+'-'+m[3].padStart(2, '0');
  m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/.exec(s);
  if(m){ const y = m[3].length===2 ? '20'+m[3] : m[3]; return y+'-'+m[1].padStart(2, '0')+'-'+m[2].padStart(2, '0'); }
  const t = Date.parse(s); return isFinite(t) ? ds2(new Date(t)) : null;
}
function bankNum(s){ const t = String(s||'').replace(/[$,\s]/g, ''); if(!t) return null; const neg = /^\(.*\)$/.test(t) || /^-/.test(t); const v = Number(t.replace(/[()\-+]/g, '')); return isFinite(v) ? (neg ? -v : v) : null; }
function bankRowsToExpenses(rows, fileName){
  const head = csvHead(rows), idx = {};
  Object.keys(BANK_COLS).forEach(function(k){ const i = head.findIndex(function(h){ return BANK_COLS[k].test(h); }); if(i >= 0) idx[k] = i; });
  if(idx.desc===idx.type) delete idx.type;
  const body = rows.slice(1).filter(function(r){ return r.length > 1; });
  const g = function(r, k){ return idx[k]!=null ? String(r[idx[k]]||'').trim() : ''; };
  // which way round are the amounts? Most banks write purchases as negative; card exports often
  // write them positive (and payments negative). A file with no negatives at all is the second kind.
  const anyNeg = idx.amount!=null && body.some(function(r){ const v = bankNum(g(r, 'amount')); return v!=null && v < 0; });
  const anyPos = idx.amount!=null && body.some(function(r){ const v = bankNum(g(r, 'amount')); return v!=null && v > 0; });
  const cardStyle = idx.amount!=null && (!anyNeg || (/card|credit|amex|visa|mastercard/i.test(fileName||'') && anyPos && body.filter(function(r){ return bankNum(g(r, 'amount')) > 0; }).length > body.length/2));
  const out = [];
  body.forEach(function(r){
    const date = bankDate(g(r, 'date')); if(!date) return;
    const name = g(r, 'desc').replace(/\s+/g, ' ').slice(0, 80); if(!name) return;
    let amt = null;
    if(idx.debit!=null){ const d = bankNum(g(r, 'debit')); if(d) amt = Math.abs(d); }
    else if(idx.amount!=null){ const v = bankNum(g(r, 'amount')); if(v==null) return; amt = cardStyle ? (v > 0 ? v : null) : (v < 0 ? -v : null); }
    if(!amt) return;
    // money moving between your own accounts, card payments and refunds aren't spending
    if(/payment thank you|autopay|transfer (to|from)|online transfer|credit card payment|refund|reversal|interest paid/i.test(name+' '+g(r, 'type'))) return;
    out.push({date:date, amount:Math.round(amt*100)/100, name:name, cat:expGuessCat(name)});
  });
  return out;
}
function bankImportCsv(text, name){
  const rows = csvParse(text);
  if(csvKind(rows)!=='bank'){ showToast('That doesn’t look like a bank statement (it needs date, amount and description columns).', {icon:'&#9888;', duration:7000}); return 0; }
  const list = bankRowsToExpenses(rows, name), ex = finExpenses(), have = {}, batch = uid();
  ex.forEach(function(e){ if(e.txId) have[e.txId] = 1; });
  let added = 0;
  list.forEach(function(x){
    const id = 'csv:'+x.date+'|'+x.amount.toFixed(2)+'|'+x.name.toLowerCase();
    if(have[id]) return; have[id] = 1;
    ex.push({id:uid(), txId:id, date:x.date, amount:x.amount, name:x.name, cat:x.cat, src:'csv', account:'Statement', batch:batch});
    added++;
  });
  persist('finances'); renderView();
  showToast(added ? added+' expense'+(added===1?'':'s')+' from '+(name || 'your statement')+'.' : 'Nothing new in '+(name || 'that statement')+'.', added ? {icon:'&#127974;', actionLabel:'Undo', actionAction:'inboxUndoBank', actionId:batch, duration:9000} : {icon:'&#127974;'});
  return added;
}
ACTIONS.inboxUndoBank = function(el, e, id){ state.finances.expenses = finExpenses().filter(function(x){ return x.batch!==id; }); persist('finances'); renderView(); showToast('Taken back out.', {icon:'&#8617;'}); };
// by hand, from Expenses
ACTIONS.bankCsvPick = function(){
  let f = document.getElementById('bankCsvFile');
  if(!f){ f = document.createElement('input'); f.type = 'file'; f.id = 'bankCsvFile'; f.accept = '.csv,text/csv'; f.style.display = 'none'; document.body.appendChild(f); }
  f.click();
};
document.addEventListener('change', function(e){
  if(!e.target || e.target.id!=='bankCsvFile' || !e.target.files || !e.target.files[0]) return;
  const file = e.target.files[0], rd = new FileReader();
  rd.onload = function(){ bankImportCsv(String(rd.result||''), file.name); e.target.value = ''; };
  rd.readAsText(file);
});
// ---- insights → Social (undo puts back what was there) ----
function inboxSocial(text, name){
  const c = igCfg(), csvAcct = c.accounts.find(function(a){ return a.src==='csv'; });
  const role = (csvAcct && csvAcct.role) || ui.socRole || 'business', id = 'csv-'+role;
  ui.inboxSocUndo = {id:id, prev:c.csvData && c.csvData[id] ? JSON.parse(JSON.stringify(c.csvData[id])) : null, had:c.accounts.some(function(a){ return a.id===id; })};
  const was = ui.socRole; ui.socRole = role;
  const ok = socImportCsv(text, name);
  ui.socRole = was;
  if(ok) showToast('Instagram insights from '+name+' are in Social.', {icon:'&#128202;', actionLabel:'Undo', actionAction:'inboxUndoSocial', duration:9000});
  return ok;
}
ACTIONS.inboxUndoSocial = function(){
  const u = ui.inboxSocUndo; if(!u) return;
  const c = igCfg();
  if(u.prev){ c.csvData[u.id] = u.prev; } else if(c.csvData) delete c.csvData[u.id];
  if(!u.had) c.accounts = c.accounts.filter(function(a){ return a.id!==u.id; });
  if(c.cache && c.cache.data) delete c.cache.data[u.id];
  ui.inboxSocUndo = null; persist('settings'); ui.igTried = 0; if(typeof igRefresh==='function') igRefresh(true); renderView();
};
// ---- watching Downloads ----
function inboxSeen(){ const s = state.settings; if(!s.inbox || typeof s.inbox!=='object') s.inbox = {seen:[], since:0}; if(!Array.isArray(s.inbox.seen)) s.inbox.seen = []; return s.inbox; }
let inboxBusy = false, inboxLast = 0;
async function inboxScan(){
  if(inboxBusy || typeof WAKE_HELPER==='undefined') return; inboxBusy = true; inboxLast = Date.now();
  try{
    const r = await fetchWithin(WAKE_HELPER+'inbox/list', 6000);
    if(!r || !r.ok) return; // (an older Operator app: there's no inbox, and that's fine)
    let j = null; try{ j = await r.json(); }catch(e){}
    if(!j || !Array.isArray(j.files)) return;
    const box = inboxSeen();
    // the very first look only goes back three days (older exports can still be imported by hand)
    if(!box.since){ box.since = Math.floor(Date.now()/1000) - 3*86400; persist('settings'); }
    const fresh = j.files.filter(function(f){ return f && f.f && f.m >= box.since && box.seen.indexOf(f.n+'|'+f.m) < 0; }).slice(0, 6);
    for(let i = 0; i < fresh.length; i++){
      const f = fresh[i];
      box.seen.push(f.n+'|'+f.m); if(box.seen.length > 300) box.seen = box.seen.slice(-300);
      persist('settings');
      if(f.s > 4000000) continue;
      const g = await fetchWithin(WAKE_HELPER+'inbox/get?f='+f.f, 10000);
      if(!g || !g.ok) continue;
      const text = await g.text(), kind = csvKind(csvParse(text));
      if(kind==='social') inboxSocial(text, f.n);
      else if(kind==='bank') bankImportCsv(text, f.n);
    }
  } catch(e){} finally { inboxBusy = false; }
}
setTimeout(inboxScan, 6000);
setInterval(function(){ if(document.visibilityState!=='hidden') inboxScan(); }, 4*60000);
window.addEventListener('focus', function(){ if(Date.now() - inboxLast > 60000) inboxScan(); });
