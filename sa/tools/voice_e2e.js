// Records with a fake microphone on the built /voice/ page, sends it to the emulators, then checks the file, the report and the phone alert.
const {chromium}=require('/opt/node22/lib/node_modules/playwright');
const pings=[];
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];
 await p.route('https://ntfy.sh/**',r=>{const u=new URL(r.request().url());pings.push(u.pathname.slice(1)+' | '+u.searchParams.get('title')+' | '+r.request().postData());r.fulfill({status:200,body:'{}',headers:{'access-control-allow-origin':'*'}})});
 await p.route('**/tracker/config.js',async r=>{const res=await r.fetch();r.fulfill({response:res,body:(await res.text())+'\nwindow.APP_CONFIG.notifyTopic="test-topic";'})});
 p.on('pageerror',e=>errs.push(e.message));p.on('console',m=>{if(m.type()==='error'&&!/fonts|ERR_CERT/.test(m.text()))errs.push(m.text())});
 await p.goto('http://localhost:8790/voice/');await p.waitForTimeout(500);
 console.log('send disabled before recording:',await p.$eval('#vSend',x=>x.disabled));
 await p.click('#mic');await p.waitForTimeout(3300);console.log('timer:',await p.textContent('#timer'),'| mic says:',(await p.textContent('#mic')).trim());
 await p.click('#mic');await p.waitForTimeout(800);
 console.log('take shown:',await p.$eval('#take',x=>!x.hidden),'| hint:',await p.textContent('#recHint'));
 await p.click('#vSend');await p.waitForTimeout(300);console.log('no name error:',await p.textContent('#eSend'));
 await p.fill('#vName','Agent Amy');await p.selectOption('#vBldg','K');await p.fill('#vMach','Press 4');
 await p.click('#vSend');await p.waitForTimeout(3500);console.log('page says:',(await p.textContent('#card')).replace(/\s+/g,' ').trim());
 await p.screenshot({path:process.env.SHOT||'/dev/null'});
 const {initializeApp}=require('firebase-admin/app');const {getFirestore}=require('firebase-admin/firestore');const {getStorage}=require('firebase-admin/storage');
 initializeApp({projectId:'demo-tracker',storageBucket:'demo-tracker.appspot.com'});
 const s=await getFirestore().collection('voice').get();const docs=s.docs.map(d=>d.data());console.log('reports in db:',s.size,JSON.stringify(docs));
 for(const d of docs)if(d.audio&&d.via==='web'&&d.secs!==12){const [m]=await getStorage().bucket().file(d.audio).getMetadata();console.log('stored audio:',d.audio,m.contentType,m.size,'bytes')}
 console.log('phone alerts:',JSON.stringify(pings));
 console.log('errors',errs);await b.close();process.exit(0)})();
