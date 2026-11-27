// a realistic money seed for Round 79 (three months of charges, bills that repeat, Other, transfers, debts)
module.exports = function(){
  const d = (y, m, day) => y+'-'+String(m).padStart(2, '0')+'-'+String(day).padStart(2, '0');
  const now = new Date(), Y = now.getFullYear(), M = now.getMonth() + 1;
  const mm = (k) => { let y = Y, m = M - k; while(m < 1){ m += 12; y--; } return [y, m]; };
  const ex = []; let n = 0;
  const add = (ym, day, name, amount, cat) => { const date = d(ym[0], ym[1], Math.min(day, 28)); if(date > new Date().toISOString().slice(0, 10)) return; ex.push({id:'e'+(n++), date, name, amount, cat, src:'bank', account:'Chase Checking'}); };
  for(let k = 0; k < 4; k++){
    const ym = mm(k);
    add(ym, 3, 'VERIZON WIRELESS PAYMENTS', 92.40, 'bills');
    add(ym, 9, 'HIGHLEVEL INC GOHIGHLEVEL.COM', 97.00, 'subs');
    add(ym, 14, 'GOOGLE *Workspace_jjsm', 14.40, 'subs');
    add(ym, 5, 'SQ *JOES COFFEE #1234 NEW YORK', 6.25, 'food');
    add(ym, 12, 'SQ *JOES COFFEE #1234 NEW YORK', 5.75, 'food');
    add(ym, 7, 'ONLINE TRANSFER TO SAV XXXX4412', 500, 'move');
    add(ym, 2, 'B&H PHOTO 800-606-6969', 189.99 + k*10, 'other');
    add(ym, 18, 'BODEGA 181 DELI CORP', 12.50, 'other');
    add(ym, 20, 'MTA*NYCT PAYGO', 2.90, 'transport');
  }
  add(mm(0), 1, 'SQ *JOES COFFEE #1234 NEW YORK', 4.75, 'food');
  add(mm(0), 1, 'KINGS BARBER SHOP', 45, 'other');
  add(mm(0), 1, 'KINGS BARBER SHOP', 10, 'other');
  return {
    finances:{expenses:ex, debts:[{id:'d1', name:'Car loan', balance:8400, minPayment:310, dueDay:15, apr:6.9}, {id:'d2', name:'Capital One', balance:2400, minPayment:80, dueDay:22, apr:28.99}, {id:'d3', name:'Mom', balance:600}, {id:'d4', name:'Affirm', balance:1200, minPayment:110, apr:15}], bills:[], income:[], invoices:[], payments:[], done:{}},
    business:{clients:[{id:'c1', name:'Batusha Corp', business:'Batusha Corp', status:'active', stage:'active', mrr:1200, billingDay:1}], pipeline:[]}
  };
};
