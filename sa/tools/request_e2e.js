// Sends a request from the built /request/ page into the emulator, then checks it landed.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const pings=[];const fakeNtfy=r=>{const u=new URL(r.request().url());pings.push(u.pathname.slice(1)+' | '+u.searchParams.get('title')+' | '+r.request().postData());r.fulfill({status:200,body:'{}',headers:{'access-control-allow-origin':'*'}})};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const p=await b.newPage({viewport:{width:390,height:844}}); await p.route('https://ntfy.sh/**',fakeNtfy);const errs=[];
 p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/fonts/.test(m.text()))errs.push(m.text())});
 await p.goto('http://localhost:8790/request/');await p.waitForTimeout(500);
 console.log('preview note hidden:',await p.$eval('#previewNote',x=>x.hidden));
 await p.fill('#rName','Amy Lee');await p.fill('#rPhone','555-0202');await p.fill('#rTitle','Fix leaking sink');await p.fill('#rDesc','Break room sink drips.');await p.click('text=Maintenance or repair');await p.fill('#rNeed','2026-10-20');
 await p.click('#rSend');await p.waitForTimeout(3000);console.log('page says:',(await p.textContent('#card')).replace(/\s+/g,' ').trim().slice(0,120));
 const {initializeApp}=require('firebase-admin/app');const {getFirestore}=require('firebase-admin/firestore');initializeApp({projectId:'demo-tracker'});
 const s=await getFirestore().collection('requests').get();console.log('requests in db:',s.size,JSON.stringify(s.docs.map(d=>d.data())));
 console.log('phone alerts:',JSON.stringify(pings));
 console.log('errors',errs);await b.close();process.exit(0)})();
