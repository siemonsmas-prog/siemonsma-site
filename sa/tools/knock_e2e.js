// A stranger signs up, Clint sees them waiting, lets them in, and they get through.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const BASE='http://localhost:5000/';const P='demo-tracker';
async function verify(email){const j=await (await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${P}/oobCodes`)).json();
  const c=j.oobCodes.filter(x=>x.email===email&&x.requestType==='VERIFY_EMAIL').pop();await fetch(c.oobLink)}
const pings=[];const fakeNtfy=r=>{const u=new URL(r.request().url());pings.push(u.pathname.slice(1)+' | '+u.searchParams.get('title')+' | '+r.request().postData());r.fulfill({status:200,body:'{}',headers:{'access-control-allow-origin':'*'}})};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[];
 async function page(vp={width:1280,height:900}){const c=await b.newContext({viewport:vp});await c.route('https://ntfy.sh/**',fakeNtfy);const p=await c.newPage();p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/fonts|ERR_CERT|net::ERR|permission/i.test(m.text()))errs.push(m.text())});await p.goto(BASE);await p.waitForTimeout(1200);return p}
 async function signup(p,name,email){await p.click('#aSwitch');await p.fill('#aName',name);await p.fill('#aEmail',email);await p.fill('#aPass','secret123');await p.click('#authForm button[type=submit]');await p.waitForTimeout(1500);await verify(email);await p.click('#vGo');await p.waitForTimeout(2000)}
 const o=await page();await signup(o,'Clint Siemonsma','clint@example.com');
 await o.click('#wRole button[data-val="Facilities Manager"]');await o.click('[data-act="welcomeSave"]');await o.waitForTimeout(1500);
 const s=await page({width:390,height:844});await signup(s,'Adam Aasen','adam@example.com');
 console.log('stranger sees:',(await s.textContent('#app')).replace(/\s+/g,' ').trim().slice(0,200));
 await s.click('#nTry');await s.waitForTimeout(1500); // a second try must not ping again
 await o.waitForTimeout(1500);
 console.log('phone alerts:',JSON.stringify(pings));
 console.log('owner toast:',await o.textContent('.toast').catch(()=>'none'),'| bar:',(await o.textContent('.reqbar').catch(()=>'none')).replace(/\s+/g,' '));
 await o.screenshot({path:'../shots/knock_owner.png'});
 await o.click('[data-act="knocks"]');await o.waitForTimeout(300);await o.screenshot({path:'../shots/knock_sheet.png'});
 await o.click('[data-knockin]');await o.waitForTimeout(1500);console.log('after let in:',await o.textContent('.sheet h2'),'| email field',await o.inputValue('#ct_email'));
 await s.click('#nTry');await s.waitForTimeout(2500);console.log('stranger after Try again:',(await s.textContent('#app')).replace(/\s+/g,' ').trim().slice(0,90));
 await o.click('[data-act="close"]').catch(()=>{});await o.waitForTimeout(500);console.log('owner bar gone:',await o.$$eval('[data-act="knocks"]',x=>x.length)===0);
 console.log('errors',errs);await b.close();process.exit(0)})();
