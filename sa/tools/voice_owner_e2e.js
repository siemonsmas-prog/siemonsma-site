// After voice_e2e.js: the owner signs in to the tracker, sees the voice report, plays it, marks it handled and deletes one.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');const P='demo-tracker';
async function verify(email){const j=await (await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${P}/oobCodes`)).json();
  const c=j.oobCodes.filter(x=>x.email===email&&x.requestType==='VERIFY_EMAIL').pop();await fetch(c.oobLink)}
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--autoplay-policy=no-user-gesture-required']});const errs=[];
 const p=await b.newPage({viewport:{width:1280,height:900}});p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/fonts|ERR_CERT|net::ERR/.test(m.text()))errs.push(m.text())});
 await p.goto('http://localhost:8790/tracker/');await p.waitForTimeout(1500);
 await p.click('#aSwitch');await p.fill('#aName','Clint Siemonsma');await p.fill('#aEmail','clint@example.com');await p.fill('#aPass','secret123');await p.click('#authForm button[type=submit]');await p.waitForTimeout(1500);
 await verify('clint@example.com');await p.click('#vGo');await p.waitForTimeout(2000);
 await p.click('#wRole button[data-val="Facilities Manager"]');await p.click('[data-act="welcomeSave"]');await p.waitForTimeout(1500);
 console.log('voice bar:',(await p.textContent('.reqbar[data-act="voice"]').catch(()=>'none')).replace(/\s+/g,' '),'| button:',(await p.textContent('.btn[data-act="voice"]')).replace(/\s+/g,' '));
 await p.click('.reqbar[data-act="voice"]');await p.waitForTimeout(1500);
 console.log('sheet:',(await p.textContent('.sheet')).replace(/\s+/g,' ').slice(0,400));
 const a=await p.$('audio[data-vpath]');const src=await a.getAttribute('src');console.log('audio src set:',!!src,(src||'').slice(0,60));
 const dur=await p.evaluate(()=>new Promise(r=>{const a=document.querySelector('audio[data-vpath]');a.preload='auto';const done=()=>r({ready:a.readyState,err:a.error&&a.error.code});a.onloadedmetadata=done;a.onerror=done;a.load();setTimeout(done,5000)}));
 console.log('audio loads:',JSON.stringify(dur));
 await p.screenshot({path:process.env.SHOT||'/dev/null'});
 await p.click('[data-vdone]');await p.waitForTimeout(800);console.log('tabs after handled:',await p.$$eval('[data-vtab]',x=>x.map(t=>t.textContent).join(' | ')));
 await p.click('[data-vtab="handled"]');await p.waitForTimeout(300);
 const del=await p.$('[data-vdel]');await del.click();await del.click();await p.waitForTimeout(1200);
 console.log('tabs after delete:',await p.$$eval('[data-vtab]',x=>x.map(t=>t.textContent).join(' | ')));
 const {initializeApp}=require('firebase-admin/app');const {getStorage}=require('firebase-admin/storage');initializeApp({projectId:P,storageBucket:'demo-tracker.appspot.com'});
 const [files]=await getStorage().bucket().getFiles({prefix:'voice/'});console.log('recordings left in storage:',files.map(f=>f.name));
 console.log('errors',errs);await b.close();process.exit(0)})();
