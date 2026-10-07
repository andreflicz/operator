// ============ FINANCES ============
function renderFinances(){
  const debts = state.finances.debts;
  const totalDebt = debts.reduce(function(a,d){ return a+Number(d.balance||0); },0);
  const totalOriginal = debts.reduce(function(a,d){ return a+Number(d.originalAmount||d.balance||0); },0);
  const income = state.finances.income.slice().sort(function(a,b){ return b.date.localeCompare(a.date); });
  const thisMonthIncome = income.filter(function(i){ return monthKeyOf(i.date)===thisMonthKey(); }).reduce(function(a,i){ return a+Number(i.amount||0); },0);
  const thisMonthInvoiced = arr(state.finances.invoices).filter(function(inv){ return monthKeyOf(inv.date)===thisMonthKey(); }).reduce(function(a,inv){ return a+Number(inv.amount||0); },0);
  const thisMonthTotal = thisMonthIncome + thisMonthInvoiced;
  const pct = clamp(Math.round((thisMonthTotal/(state.profile.revenueGoalMonthly||1))*100),0,100);
  return '<div class="grid grid-3 section">'+
    '<div class="card" style="min-height:128px;display:flex;flex-direction:column;justify-content:center;"><div class="kpi-label">Total Debt</div><div class="kpi-value" style="color:#E8636B;">$'+totalDebt.toLocaleString()+'</div></div>'+
    '<div class="card" style="min-height:128px;display:flex;flex-direction:column;justify-content:center;"><div class="kpi-label">This Month</div><div class="kpi-value">$'+thisMonthTotal.toLocaleString()+'</div>'+
      '<div class="progress" style="margin-top:8px;"><div class="progress-bar" style="width:'+pct+'%;background:'+goalColor()+';'+goalGlowStyle(pct)+'"></div></div>'+
      '<div class="kpi-sub">of $'+(state.profile.revenueGoalMonthly||0).toLocaleString()+' goal &middot; includes $'+thisMonthInvoiced.toLocaleString()+' invoiced to clients</div>'+
    '</div>'+
    '<div class="card" style="min-height:128px;display:flex;flex-direction:column;justify-content:center;"><div class="kpi-label">Paid Off So Far</div><div class="kpi-value" style="color:#3FBE8E;">$'+(totalOriginal-totalDebt).toLocaleString()+'</div></div>'+
  '</div>'+
  '<div class="grid grid-2 section" style="align-items:start;">'+
  '<div class="section" style="margin-bottom:0;"><div class="section-title">Debts<button class="btn btn-sm" data-action="toggleForm" data-form="debt">'+(ui.forms.debt?'Close':'+ Add Debt')+'</button></div>'+
    (ui.forms.debt ? '<div class="card" style="margin-bottom:10px;">'+
      '<input class="input" id="debtName" placeholder="Name (e.g. Car Loan)" style="width:100%;">'+
      '<div class="grid grid-2" style="margin-top:8px;">'+
        '<input class="input" id="debtCreditor" placeholder="Who it\'s from">'+
        '<input class="input" type="number" id="debtAmount" placeholder="Balance owed">'+
      '</div>'+
      '<textarea class="input" id="debtDescription" placeholder="What is this debt for?" style="width:100%;min-height:56px;margin-top:8px;"></textarea>'+
      '<button class="btn btn-primary btn-sm" style="margin-top:8px;" data-action="addDebt">Add Debt</button>'+
    '</div>' : '')+
    '<div class="task-list">'+(debts.map(debtRow).join('') || '<div class="empty">No debts tracked. Add one above.</div>')+'</div></div>'+
  '<div class="section" style="margin-bottom:0;"><div class="section-title">Income<button class="btn btn-sm" data-action="toggleForm" data-form="income">'+(ui.forms.income?'Close':'+ Add Income')+'</button></div>'+
    (ui.forms.income ? '<div class="card" style="margin-bottom:10px;">'+
      '<div class="row"><input class="input" type="date" id="incomeDate" value="'+todayStr()+'" style="width:140px;">'+
      '<button class="btn btn-ghost btn-sm" data-action="openDatePicker" data-target="incomeDate">&#128197;</button>'+
      '<button class="btn btn-ghost btn-sm" data-action="setFieldToday" data-target="incomeDate">Today</button></div>'+
      '<div class="grid grid-2" style="margin-top:8px;">'+
        '<input class="input" id="incomeSource" placeholder="Source">'+
        '<input class="input" type="number" id="incomeAmount" placeholder="Amount">'+
      '</div>'+
      '<button class="btn btn-good btn-sm" style="margin-top:8px;" data-action="addIncome">Add Income</button>'+
    '</div>' : '')+
    '<div class="task-list">'+(income.slice(0,12).map(incomeRow).join('') || '<div class="empty">No income logged. Add one above.</div>')+'</div></div>'+
  '</div>'+
  renderInvoicesSection();
}
function invoicePaid(inv){ return !!inv.attachmentData; }
function clientInvoicedThisMonth(clientId){
  const mk = thisMonthKey();
  return state.finances.invoices.some(function(i){ return i.client===clientId && monthKeyOf(i.date)===mk; });
}
function retainerClientRow(c){
  const todayDay = new Date().getDate();
  const thisMonthName = MONTH_NAMES[new Date().getMonth()];
  const hasMrr = Number(c.mrr)>0;
  const invoiced = hasMrr && clientInvoicedThisMonth(c.id);
  const billingDay = c.billingDay||1;
  const overdue = hasMrr && !invoiced && todayDay>=billingDay;
  const statusTag = !hasMrr ? '<span class="tag tag-personal">No retainer set</span>' : (invoiced ? '<span class="tag tag-general">Invoiced this month</span>' : (overdue ? '<span class="tag tag-high">Overdue</span>' : '<span class="tag tag-med">Bills the '+ordinal(billingDay)+'</span>'));
  return '<div class="task-item-v2">'+
    '<div style="flex:1;min-width:140px;">'+
      '<div class="task-title-row">'+statusTag+'<span class="task-title">'+escapeHtml(c.business||c.name||'Client')+'</span></div>'+
      '<div class="task-notes">'+(hasMrr?'$'+Number(c.mrr).toLocaleString()+'/mo':'No amount set yet')+'</div>'+
    '</div>'+
    '<button class="btn btn-ghost btn-sm" data-action="openRetainerEdit" data-id="'+c.id+'" title="Edit retainer &amp; billing day">&#9998; Edit</button>'+
    (hasMrr && !invoiced ? '<button class="btn btn-good btn-sm" data-action="openInvoiceModal" data-client="'+c.id+'" data-amount="'+c.mrr+'" data-desc="'+escapeHtml(thisMonthName+' retainer')+'">+ Invoice</button>' : '')+
  '</div>';
}
function openRetainerEdit(clientId){
  ui.editingRetainerClientId = clientId;
  const o = document.getElementById('retainerEditOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderRetainerEditModalInto();
}
function closeRetainerEdit(){ ui.editingRetainerClientId = null; const o=document.getElementById('retainerEditOverlay'); if(o) o.classList.add('hidden'); }
function renderRetainerEditModal(){
  const c = state.business.clients.find(function(x){ return x.id===ui.editingRetainerClientId; });
  if(!c) return '';
  return '<div class="section-title" style="margin-bottom:14px;">'+escapeHtml(c.business||c.name||'Client')+' — Retainer</div>'+
    '<div class="field"><label>Monthly retainer</label><input class="input" type="number" id="retainerMrr" value="'+(c.mrr||0)+'" placeholder="0.00"></div>'+
    '<div class="field" style="margin-top:10px;"><label>Bills on day of month</label><input class="input" type="number" min="1" max="28" id="retainerBillingDay" value="'+(c.billingDay||1)+'"></div>'+
    '<div class="row" style="margin-top:20px;justify-content:flex-end;">'+
      '<button class="btn btn-ghost" data-action="closeRetainerEdit">Cancel</button>'+
      '<button class="btn btn-good" data-action="saveRetainerEdit">Save</button>'+
    '</div>';
}
function renderRetainerEditModalInto(){ const el=document.getElementById('retainerEditContent'); if(el) morphInto(el, renderRetainerEditModal(), {form:true}); }
function saveRetainerEdit(){
  const c = state.business.clients.find(function(x){ return x.id===ui.editingRetainerClientId; }); if(!c) return;
  c.mrr = Number(document.getElementById('retainerMrr').value)||0;
  c.billingDay = clamp(Number(document.getElementById('retainerBillingDay').value)||1, 1, 28);
  closeRetainerEdit();
  playPositive();
  persist('business'); renderView();
}
function renderInvoicesSection(){
  const invoices = state.finances.invoices.slice().sort(function(a,b){ return (b.date||'').localeCompare(a.date||''); });
  const retainerClients = arr(state.business.clients).filter(function(c){ return c.status==='active'; });
  const byClient = {};
  const noClient = [];
  invoices.forEach(function(inv){
    if(inv.client && byClient[inv.client]===undefined) byClient[inv.client] = [];
    if(inv.client) byClient[inv.client].push(inv); else noClient.push(inv);
  });
  const clientGroups = Object.keys(byClient).map(function(cid){
    const c = arr(state.business.clients).find(function(x){ return x.id===cid; });
    const list = byClient[cid];
    return '<div class="card" style="margin-bottom:10px;">'+
      '<div class="task-title-row" style="margin-bottom:8px;">'+clientTagHtml(cid)+'<span class="kpi-sub">'+list.length+' invoice'+(list.length===1?'':'s')+'</span></div>'+
      '<div class="task-list">'+list.map(invoiceRow).join('')+'</div>'+
    '</div>';
  }).join('');
  return '<div class="section"><div class="section-title">Client Payments &amp; Invoices<button class="btn btn-sm" data-action="openInvoiceModal">+ Add Invoice</button></div>'+
    '<div class="kpi-sub" style="margin-bottom:14px;">An invoice logged here counts as revenue collected for the month right away. The tax receipt attachment is just your paperwork — attach it whenever you get to it, nothing is marked paid manually. Paying off a debt above only reduces the balance, it stays listed until you remove it.</div>'+
    (retainerClients.length ? '<div class="task-list" style="margin-bottom:14px;">'+retainerClients.map(retainerClientRow).join('')+'</div>' : '')+
    (clientGroups || (invoices.length ? '' : (retainerClients.length ? '' : '<div class="empty">Add a client above, then log invoices as you bill them.</div>')))+
    (noClient.length ? '<div class="card" style="margin-bottom:10px;"><div class="task-title-row" style="margin-bottom:8px;"><span class="task-title">Other</span></div><div class="task-list">'+noClient.map(invoiceRow).join('')+'</div></div>' : '')+
  '</div>';
}
function openInvoiceModal(clientId, amount, description){
  if(clientId){ ui.invoiceClient = clientId; ui.invoicePrefillAmount = amount!=null?amount:null; ui.invoicePrefillDesc = description||null; }
  const o = document.getElementById('invoiceModalOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderInvoiceModalInto();
}
function closeInvoiceModal(){ ui.invoicePrefillAmount=null; ui.invoicePrefillDesc=null; const o=document.getElementById('invoiceModalOverlay'); if(o) o.classList.add('hidden'); }
function renderInvoiceModal(){
  return '<div class="section-title" style="margin-bottom:14px;">Add Invoice / Payment</div>'+
    '<div class="grid grid-2">'+
      '<div class="field"><label>Client</label><select class="input" id="invClient">'+clientOptionsHtml(ui.invoiceClient)+'</select></div>'+
      '<div class="field"><label>Description</label><input class="input" id="invDesc" placeholder="e.g. October retainer" value="'+escapeHtml(ui.invoicePrefillDesc||'')+'"></div>'+
    '</div>'+
    '<div class="grid grid-2" style="margin-top:10px;">'+
      '<div class="field"><label>Amount</label><input class="input" type="number" id="invAmount" placeholder="0.00" value="'+(ui.invoicePrefillAmount!=null?ui.invoicePrefillAmount:'')+'"></div>'+
      '<div class="field"><label>Date</label><div class="row"><input class="input" type="date" id="invDate" value="'+todayStr()+'"><button class="btn btn-ghost btn-sm" data-action="openDatePicker" data-target="invDate">&#128197;</button><button class="btn btn-ghost btn-sm" data-action="setFieldToday" data-target="invDate">Today</button></div></div>'+
    '</div>'+
    '<div class="field" style="margin-top:10px;"><label>Attach invoice / receipt (for taxes)</label><input class="input" type="file" id="invFile" accept="image/*,.pdf" style="width:100%;"></div>'+
    '<div class="row" style="margin-top:20px;justify-content:flex-end;">'+
      '<button class="btn btn-ghost" data-action="closeInvoiceModal">Cancel</button>'+
      '<button class="btn btn-good" data-action="addInvoice">Save</button>'+
    '</div>';
}
function renderInvoiceModalInto(){ const el=document.getElementById('invoiceModalContent'); if(el) morphInto(el, renderInvoiceModal(), {form:true}); }
function invoiceRow(inv){
  const paid = invoicePaid(inv);
  return '<div class="task-item-v2 '+(paid?'done':'')+'">'+
    '<div style="flex:1;min-width:140px;">'+
      '<div class="task-title-row"><span class="tag '+(paid?'tag-general':'tag-high')+'">'+(paid?'Receipt attached':'Needs tax receipt')+'</span>'+clientTagHtml(inv.client)+'<span class="task-title">'+escapeHtml(inv.description||'Invoice')+'</span></div>'+
      '<div class="task-notes">'+fmtDateShort(inv.date)+' &middot; $'+Number(inv.amount||0).toLocaleString()+(inv.attachmentName?' &middot; 📎 '+escapeHtml(inv.attachmentName):'')+'</div>'+
    '</div>'+
    (inv.attachmentData ? '<a class="btn btn-ghost btn-sm" href="'+inv.attachmentData+'" download="'+escapeHtml(inv.attachmentName||'attachment')+'" target="_blank" rel="noopener">Download</a>' : '')+
    (!paid ? '<button class="btn btn-good btn-sm" data-action="openAttachReceiptModal" data-id="'+inv.id+'">Attach Tax Receipt</button>' : '')+
    deleteBtn('invoice', inv.id)+
  '</div>';
}
function openAttachReceiptModal(id){
  ui.attachingInvoiceId = id;
  const o = document.getElementById('attachReceiptOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderAttachReceiptModalInto();
}
function closeAttachReceiptModal(){ ui.attachingInvoiceId = null; const o=document.getElementById('attachReceiptOverlay'); if(o) o.classList.add('hidden'); }
function renderAttachReceiptModal(){
  const inv = state.finances.invoices.find(function(x){ return x.id===ui.attachingInvoiceId; });
  if(!inv) return '';
  return '<div class="section-title" style="margin-bottom:8px;">Attach Receipt / Tax Invoice</div>'+
    '<div class="kpi-sub" style="margin-bottom:14px;">'+escapeHtml(inv.description||'Invoice')+' &middot; $'+Number(inv.amount||0).toLocaleString()+' — already counted as revenue collected. This just files your tax paperwork for it, and it\'s the only way this gets attached (never marked manually).</div>'+
    '<div class="field"><input class="input" type="file" id="receiptFile" accept="image/*,.pdf" style="width:100%;"></div>'+
    '<div class="row" style="margin-top:20px;justify-content:flex-end;">'+
      '<button class="btn btn-ghost" data-action="closeAttachReceiptModal">Cancel</button>'+
      '<button class="btn btn-good" data-action="confirmAttachReceipt">Attach Receipt</button>'+
    '</div>';
}
function renderAttachReceiptModalInto(){ const el=document.getElementById('attachReceiptContent'); if(el) morphInto(el, renderAttachReceiptModal(), {form:true}); }
function confirmAttachReceipt(){
  const inv = state.finances.invoices.find(function(x){ return x.id===ui.attachingInvoiceId; }); if(!inv) return;
  const fileInput = document.getElementById('receiptFile');
  const file = fileInput && fileInput.files && fileInput.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(){
    inv.attachmentName = file.name;
    inv.attachmentData = reader.result;
    inv.paidDate = todayStr();
    closeAttachReceiptModal();
    playPositive();
    persist('finances'); renderView();
  };
  reader.readAsDataURL(file);
}
async function addInvoice(){
  const client = document.getElementById('invClient').value;
  const description = document.getElementById('invDesc').value.trim();
  const amount = Number(document.getElementById('invAmount').value);
  const date = document.getElementById('invDate').value || todayStr();
  if(!amount) return;
  const fileInput = document.getElementById('invFile');
  const file = fileInput && fileInput.files && fileInput.files[0];
  const invoice = {id:uid(), client:client, description:description, amount:amount, date:date, status:'unpaid', attachmentName:null, attachmentData:null};
  ui.invoiceClient = client;
  function finish(){
    state.finances.invoices.push(invoice);
    closeInvoiceModal();
    playPositive();
    persist('finances'); renderView();
  }
  if(file){
    const reader = new FileReader();
    reader.onload = function(){
      invoice.attachmentName = file.name;
      invoice.attachmentData = reader.result;
      finish();
    };
    reader.onerror = finish;
    reader.readAsDataURL(file);
  } else {
    finish();
  }
}
function incomeRow(i){
  return '<div class="card" style="margin-bottom:10px;">'+
    '<div class="row" style="justify-content:space-between;align-items:flex-start;">'+
      '<div>'+
        '<div class="task-title">'+escapeHtml(i.source)+'</div>'+
        '<div class="kpi-sub">'+fmtDateShort(i.date)+'</div>'+
      '</div>'+
      deleteBtn('income', i.id)+
    '</div>'+
    '<div class="row" style="justify-content:space-between;align-items:center;margin-top:8px;">'+
      '<span class="kpi-value" style="font-size:18px;color:#3FBE8E;">$'+Number(i.amount).toLocaleString()+'</span>'+
    '</div>'+
  '</div>';
}
function debtRow(d){
  const pct = d.originalAmount ? clamp(Math.round((1-(d.balance/d.originalAmount))*100),0,100) : 0;
  return '<div class="card" style="margin-bottom:10px;">'+
    '<div class="row" style="justify-content:space-between;align-items:flex-start;">'+
      '<div>'+
        '<div class="task-title">'+escapeHtml(d.name)+'</div>'+
        (d.creditor ? '<div class="kpi-sub">From '+escapeHtml(d.creditor)+'</div>' : '')+
      '</div>'+
      deleteBtn('debt', d.id)+
    '</div>'+
    (d.description ? '<div class="kpi-sub" style="margin-top:6px;line-height:1.5;">'+escapeHtml(d.description)+'</div>' : '')+
    '<div class="progress" style="margin-top:10px;"><div class="progress-bar good" style="width:'+pct+'%"></div></div>'+
    '<div class="row" style="justify-content:space-between;align-items:center;margin-top:8px;">'+
      '<span class="kpi-sub">$'+Number(d.balance).toLocaleString()+' left'+(d.originalAmount?' of $'+Number(d.originalAmount).toLocaleString():'')+'</span>'+
      '<button class="btn btn-good btn-sm" data-action="openLogPaymentModal" data-id="'+d.id+'">Log Payment</button>'+
    '</div>'+
  '</div>';
}
function addDebt(){
  const name = document.getElementById('debtName').value.trim();
  const balance = Number(document.getElementById('debtAmount').value);
  const creditor = document.getElementById('debtCreditor').value.trim();
  const description = document.getElementById('debtDescription').value.trim();
  if(!name || !balance) return;
  state.finances.debts.push({id:uid(), name:name, balance:balance, originalAmount:balance, creditor:creditor, description:description});
  ui.forms.debt = false;
  persist('finances'); renderView();
}
function openLogPaymentModal(debtId){
  ui.loggingPaymentDebtId = debtId;
  const o = document.getElementById('logPaymentOverlay');
  if(!o) return;
  o.classList.remove('hidden');
  renderLogPaymentModalInto();
}
function closeLogPaymentModal(){ ui.loggingPaymentDebtId = null; const o=document.getElementById('logPaymentOverlay'); if(o) o.classList.add('hidden'); }
function renderLogPaymentModal(){
  const d = state.finances.debts.find(function(x){ return x.id===ui.loggingPaymentDebtId; });
  if(!d) return '';
  return '<div class="section-title" style="margin-bottom:8px;">Log Payment</div>'+
    '<div class="kpi-sub" style="margin-bottom:14px;">'+escapeHtml(d.name)+' &middot; $'+Number(d.balance).toLocaleString()+' left</div>'+
    '<div class="field"><label>Payment amount</label><input class="input" type="number" id="paymentAmount" placeholder="0.00" autofocus></div>'+
    '<div class="row" style="margin-top:20px;justify-content:flex-end;">'+
      '<button class="btn btn-ghost" data-action="closeLogPaymentModal">Cancel</button>'+
      '<button class="btn btn-good" data-action="confirmLogPayment">Log Payment</button>'+
    '</div>';
}
function renderLogPaymentModalInto(){ const el=document.getElementById('logPaymentContent'); if(el) morphInto(el, renderLogPaymentModal(), {form:true}); }
function confirmLogPayment(){
  const d = state.finances.debts.find(function(x){ return x.id===ui.loggingPaymentDebtId; }); if(!d) return;
  const amount = Number(document.getElementById('paymentAmount').value);
  if(!amount) return;
  d.balance = Math.max(0, Number(d.balance) - amount);
  state.finances.payments.push({id:uid(), debtId:d.id, amount:amount, date:todayStr()});
  playPositive();
  closeLogPaymentModal();
  persist('finances'); renderView();
}
function addIncome(){
  const date = document.getElementById('incomeDate').value || todayStr();
  const source = document.getElementById('incomeSource').value.trim();
  const amount = Number(document.getElementById('incomeAmount').value);
  if(!amount) return;
  state.finances.income.push({id:uid(), date:date, source:source||'Income', amount:amount});
  ui.forms.income = false;
  playPositive();
  persist('finances'); renderView();
}

