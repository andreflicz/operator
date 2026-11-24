// Round 47: Social Ads by client / by ad account; GHL chats and contacts gone.
const { instrument, launch, newPage, check, report, OUT } = require('./common.js');
(async () => {
  instrument(process.argv[2], OUT+'/r47.html');
  const b = await launch();
  const p = await newPage(b, OUT+'/r47.html', {profile:{name:'Andre', xpBook:43},
    business:{clients:[{id:'jj', name:'Jay', business:'JJS', stage:'active', status:'active', mrr:3000, color:'#4FC3B8', deliverables:[]}, {id:'ki', name:'Kiko', business:'Kiko', stage:'active', status:'active', mrr:2000, color:'#9B8CFF', deliverables:[]}]},
    settings:{instagram:{accounts:[{id:'z1', src:'zernio', username:'andre', role:'business'}], cache:null}, ghl:{connected:true, locationId:'L'}}}, new Date(2026,9,25,11).getTime());
  const H = {'Access-Control-Allow-Origin':'*', 'content-type':'application/json'};
  await p.route(/127\.0\.0\.1:8935\/zn\/api/, r => {
    const u = new URL(r.request().url()), path = Buffer.from(u.searchParams.get('p'), 'hex').toString();
    if(/\/v1\/accounts\?category=ads/.test(path)) return r.fulfill({status:200, headers:H, body:JSON.stringify({accounts:[{_id:'c1', platform:'metaads', displayName:'JJS Ads'}, {_id:'c2', platform:'metaads', displayName:'Kiko Ads'}]})});
    if(/campaigns\?accountId=c1/.test(path)) return r.fulfill({status:200, headers:H, body:JSON.stringify({campaigns:[{platformCampaignId:'k1', campaignName:'JJS leads Oct', status:'ACTIVE', currency:'USD', metrics:{spend:420, impressions:30000, clicks:600, funnel:{leads:21}}}, {platformCampaignId:'k2', campaignName:'Retarget', status:'ACTIVE', currency:'USD', metrics:{spend:80, impressions:9000, clicks:90}}]})});
    if(/campaigns\?accountId=c2/.test(path)) return r.fulfill({status:200, headers:H, body:JSON.stringify({campaigns:[{platformCampaignId:'k3', campaignName:'Spring promo', status:'PAUSED', currency:'USD', metrics:{spend:250, impressions:12000, clicks:200, funnel:{leads:10}}}]})});
    return r.fulfill({status:200, headers:H, body:'{}'});
  });
  const E = c => p.evaluate(x => window.__op.ev(x), c);
  await E("document.querySelectorAll('.overlay').forEach(o => o.classList.add('hidden')); ui.view='convos'; ui.socTab='ads'; renderView()"); await p.waitForTimeout(1200);
  check('Ads reads every ad account, not just the first', await E("igCfg().znAdsCache.camps.length")===3 && await E("igCfg().znAdsCache.accts.length")===2);
  check('GoHighLevel chats and contacts are gone from Social', !/GHL chats|Contacts/.test(await p.textContent('.sx-tabs')));
  // (R50: one Zernio connection names every account the same, so it's campaigns only: you say whose each one is)
  check('no ad accounts to pick, just campaigns', !(await p.$('select[data-acctlink]')) && /Not assigned yet/.test(await p.textContent('.sx')));
  await E("ui.adClient='none'; renderView()"); await p.waitForTimeout(150);
  await p.selectOption('select[data-adlink="k2"]', 'jj'); await p.waitForTimeout(150);
  await E("ui.adClient='none'; renderView()"); await p.waitForTimeout(150);
  await p.selectOption('select[data-adlink="k3"]', 'ki'); await p.waitForTimeout(150);
  check('each campaign goes to the client you pick', await E("adClientOf({id:'k2'})")==='jj' && await E("adClientOf({id:'k3'})")==='ki' && await E("clientAdTotals('ki').spend")>0);
  await p.screenshot({path:OUT+'/r47-ads.png', fullPage:true});
  check('no page errors (round 47)', p.errors.length===0, p.errors);
  await b.close(); process.exit(report() ? 1 : 0);
})();
