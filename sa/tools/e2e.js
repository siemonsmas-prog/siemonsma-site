const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const {execSync}=require('child_process');const fs=require('fs');
const BASE='http://localhost:5000/';const P='demo-tracker';
const env={...process.env,FIRESTORE_EMULATOR_HOST:'127.0.0.1:8080',FIREBASE_AUTH_EMULATOR_HOST:'127.0.0.1:9099',GCLOUD_PROJECT:P};
async function verify(email){const r=await fetch(`http://127.0.0.1:9099/emulator/v1/projects/${P}/oobCodes`);const j=await r.json();
  const c=j.oobCodes.filter(x=>x.email===email&&x.requestType==='VERIFY_EMAIL').pop();await fetch(c.oobLink);}
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium'});const errs=[];const shots='../shots/sa_';
 async function page(vp={width:1280,height:900}){const c=await b.newContext({viewport:vp});const p=await c.newPage();p.on('pageerror',e=>errs.push('pageerror '+e.message));p.on('console',m=>{if(m.type()==='error'&&!/fonts|ERR_CERT|net::ERR/.test(m.text()))errs.push(m.text())});await p.goto(BASE);await p.waitForTimeout(1200);return p}
 async function signup(p,name,email,pw){await p.click('#aSwitch');await p.fill('#aName',name);await p.fill('#aEmail',email);await p.fill('#aPass',pw);await p.click('#authForm button[type=submit]');await p.waitForTimeout(1500);
   console.log(' after signup:',(await p.textContent('#app')).slice(0,80).replace(/\s+/g,' '));await verify(email);await p.click('#vGo');await p.waitForTimeout(2000)}
 // 1 owner signs up
 let o=await page();await o.screenshot({path:shots+'signin.png'});
 await signup(o,'Clint Siemonsma','clint@example.com','secret123');
 console.log('owner first view:',(await o.textContent('#app')).slice(0,60).replace(/\s+/g,' '));
 // 2 import
 await o.click('#wRole button[data-val="Facilities Manager"]');await o.click('[data-act="welcomeSave"]');await o.waitForTimeout(1500);
 await o.screenshot({path:shots+'owner-empty.png'});
 await o.setInputFiles('#importFile','data/export.json');await o.waitForTimeout(6000);console.log('toast:',await o.textContent('.toast').catch(()=>'none'));
 console.log('owner rows:',await o.$$eval('table.list tbody tr',x=>x.length),'header:',await o.textContent('#me'));
 await o.screenshot({path:shots+'owner.png',fullPage:true});
 // 3 owner adds contact with email -> access doc
 await o.click('[data-act="groups"]');await o.waitForTimeout(400);await o.click('[data-cedit="new"]');await o.waitForTimeout(300);
 await o.fill('#ct_name','Jim Carter');await o.fill('#ct_email','Jim@Example.com');await o.click('[data-csave="new"]');await o.waitForTimeout(1200);
 await o.click('[data-act="close"]');await o.waitForTimeout(300);
 console.log('jim access doc:',execSync(`node -e 'const {initializeApp}=require("firebase-admin/app");const {getFirestore}=require("firebase-admin/firestore");initializeApp({projectId:"${P}"});getFirestore().doc("access/jim@example.com").get().then(d=>{console.log(d.exists,JSON.stringify(d.data()));process.exit(0)})'`,{env}).toString().trim());
 // owner posts update + uploads file on Building I
 await o.click('tr[data-open="imp02"]');await o.waitForTimeout(600);await o.click('[data-update="imp02"]');await o.waitForTimeout(400);
 await o.fill('#uDone','Header framed.');fs.writeFileSync('/tmp/claude-0/-home-claude/a3ed3eff-4d9b-5844-9a86-992b03332626/scratchpad/test.png',Buffer.from('89504E470D0A1A0A0000000D49484452000000010000000108060000001F15C4890000000D49444154789C6360000000000500010D0A2DB40000000049454E44AE426082','hex'));
 await o.setInputFiles('#uFiles','/tmp/claude-0/-home-claude/a3ed3eff-4d9b-5844-9a86-992b03332626/scratchpad/test.png');await o.click('[data-act="saveUpdate"]');await o.waitForTimeout(3000);
 console.log('owner update tab:',(await o.textContent('.timeline')).slice(0,120).replace(/\s+/g,' '),'| thumbs:',await o.$$eval('.minithumbs a',x=>x.map(a=>a.href.slice(0,60))));
 // checklist
 await o.click('[data-tab="checklist"]');await o.waitForTimeout(300);await o.click('[data-cktpl="Structure"]');await o.waitForTimeout(800);
 await o.check('details.ph.cur .item input >> nth=0');await o.waitForTimeout(800);
 // 4 a contact from the imported data signs up (use an email that's on a contact in data/export.json)
 const m=await page({width:390,height:844});await signup(m,'Test Contact',process.env.CONTACT_EMAIL||'contact@example.com','secret456');
 console.log('contact:',(await m.textContent('#app')).slice(0,70).replace(/\s+/g,' '));
 const em=await m.inputValue('#wEmail').catch(()=>'(no email field)');console.log(' welcome email prefilled:',em);
 console.log(' me():',JSON.stringify(await m.evaluate(async()=>(await (await claude.use('user')).me()))),await m.evaluate(()=>localStorage.getItem('pendingName')));console.log(' name prefilled:',JSON.stringify(await m.inputValue('#wName')));if(!(await m.inputValue('#wName')))await m.fill('#wName','Test Contact');await m.click('#wRole button[data-val="Other"]');await m.click('[data-act="welcomeSave"]');await m.waitForTimeout(300);console.log(' toast:',await m.textContent('.toast').catch(()=>'none'),'role pressed:',await m.$eval('#wRole',x=>x.innerHTML.slice(0,300)).catch(()=>'no wRole'));await m.waitForTimeout(2200);
 console.log(' contact sees:',await m.$$eval('.card h3',x=>[...new Set(x.map(t=>t.textContent))]),'|',(await m.textContent('#app')).slice(0,200).replace(/\s+/g,' '),errs);
 await m.screenshot({path:shots+'contact.png',fullPage:true});
 // she asks a question
 await m.click('.card[data-open="imp02"]');await m.waitForTimeout(600);await m.click('[data-tab="questions"]');await m.fill('#qText','When is the door going in?');await m.click('[data-act="askTeam"]');await m.waitForTimeout(1200);
 console.log(' question posted:',await m.$$eval('.timeline .entry',x=>x.length));
 // she tries to change a project directly
 const hack=await m.evaluate(async()=>{const db=await claude.use('db');try{await db.doc('projects/imp02').update({name:'hacked'});return 'WROTE'}catch(e){return 'blocked '+e.code}});console.log(' write attempt:',hack);
 const hack2=await m.evaluate(async()=>{const db=await claude.use('db');try{await db.doc('access/evil@x.com').set({a:1});return 'WROTE'}catch(e){return 'blocked '+e.code}});console.log(' access write attempt:',hack2);
 // owner sees question
 await o.click('[data-act="close"]').catch(()=>{});await o.waitForTimeout(1500);console.log('owner questions section:',await o.$$eval('[data-openq]',x=>x.length));
 // 5 stranger
 const s=await page({width:390,height:844});await signup(s,'Random','random@nowhere.com','secret789');console.log('stranger:',(await s.textContent('#app')).slice(0,90).replace(/\s+/g,' '));
 const read=await s.evaluate(async()=>'ok');
 // 6 sign out
 await m.click('[data-act="close"]');await m.waitForTimeout(300);await m.click('#me');await m.waitForTimeout(300);await m.click('[data-act="signOut"]');await m.waitForTimeout(2000);console.log('after sign out:',(await m.textContent('#app')).slice(0,30).replace(/\s+/g,' '));
 console.log('ERRORS',errs);await b.close();process.exit(0)})().catch(e=>{console.error(e);process.exit(1)});
