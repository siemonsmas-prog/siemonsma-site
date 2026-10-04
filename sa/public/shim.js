// Connects the tracker to Firebase: sign-in, database, file storage and downloads.
// The app talks to window.claude.use(...) exactly as it did on claude.ai; this file answers those calls.
import {initializeApp,getAuth,onAuthStateChanged,signInWithEmailAndPassword,createUserWithEmailAndPassword,sendEmailVerification,sendPasswordResetEmail,signOut,updateProfile,connectAuthEmulator,
  initializeFirestore,persistentLocalCache,persistentMultipleTabManager,connectFirestoreEmulator,doc,collection,query,where,orderBy,limit,onSnapshot,getDoc,getDocs,setDoc,deleteDoc,addDoc,
  getStorage,connectStorageEmulator,ref as sref,uploadBytes,getDownloadURL,deleteObject} from "./vendor/firebase.js";

const CFG=window.APP_CONFIG||{};
const OWNER=String(CFG.ownerEmail||"").trim().toLowerCase();
const fbApp=initializeApp(CFG.firebase);
const auth=getAuth(fbApp);
let fs;try{fs=initializeFirestore(fbApp,{localCache:persistentLocalCache({tabManager:persistentMultipleTabManager()})})}catch(e){fs=initializeFirestore(fbApp,{})}
const st=CFG.firebase.storageBucket?getStorage(fbApp):null;
const local=["localhost","127.0.0.1"].includes(location.hostname);
if(CFG.useEmulators&&local){connectAuthEmulator(auth,"http://127.0.0.1:9099",{disableWarnings:true});connectFirestoreEmulator(fs,"127.0.0.1",8080);if(st)connectStorageEmulator(st,"127.0.0.1",9199)}

/* ---------- database: same calls the app already makes ---------- */
const plain=d=>JSON.parse(JSON.stringify(d??{}));
const mapErr=e=>({code:e?.code==="permission-denied"?"invalid_argument":e?.code==="resource-exhausted"?"quota_exceeded":(e?.code||"unavailable"),message:e?.message||String(e)});
const fail=e=>{throw mapErr(e)};
const wdoc=s=>({id:s.id,exists:s.exists(),data:()=>s.data()});
const wq=q=>{const docs=q.docs.map(wdoc);return{docs,size:docs.length,empty:!docs.length}};
function D(path){const r=doc(fs,path);return{id:r.id,path,
  get:async()=>{try{return wdoc(await getDoc(r))}catch(e){fail(e)}},
  set:d=>setDoc(r,plain(d)).catch(fail),
  update:d=>setDoc(r,plain(d),{merge:true}).catch(fail), // nested objects merge, arrays replace
  delete:()=>deleteDoc(r).catch(fail),
  onSnapshot:(f,err)=>onSnapshot(r,s=>f(wdoc(s)),e=>err&&err(mapErr(e))),
  collection:c=>C(path+"/"+c)}}
function C(path,cons=[]){const q=()=>cons.length?query(collection(fs,path),...cons):collection(fs,path);return{path,
  where:(a,o,v)=>C(path,[...cons,where(a,o,v)]),orderBy:(a,d)=>C(path,[...cons,orderBy(a,d||"asc")]),limit:n=>C(path,[...cons,limit(n)]),
  get:async()=>{try{return wq(await getDocs(q()))}catch(e){fail(e)}},
  onSnapshot:(f,err)=>onSnapshot(q(),s=>f(wq(s)),e=>err&&err(mapErr(e))),
  doc:id=>D(id?path+"/"+id:doc(collection(fs,path)).path),
  add:async d=>{try{const r=await addDoc(collection(fs,path),plain(d));return D(r.path)}catch(e){fail(e)}}}}
const db={doc:D,collection:C};

/* ---------- files ---------- */
const MAX=20*1024*1024;
const assets=st&&{
  async upload(file,opts){if(file.size>MAX)throw{code:"too_large"};const type=opts?.type||file.type||"application/octet-stream";
    const id="uploads/"+Date.now().toString(36)+Math.random().toString(36).slice(2,7)+"-"+String(file.name||"file").replace(/[^\w.\-]+/g,"_").slice(-80);
    try{const r=sref(st,id);await uploadBytes(r,file,{contentType:type});return{id,url:await getDownloadURL(r),sizeBytes:file.size,contentType:type}}
    catch(e){throw{code:e?.code==="storage/quota-exceeded"?"quota_or_state":"unavailable",message:e?.message}}},
  async delete(id){try{await deleteObject(sref(st,id))}catch(e){}return{deleted:true}}};
const downloads={async save({filename,data}){const blob=data instanceof Blob?data:new Blob([data]);const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),60000);return{status:"saved"}}};

/* ---------- sign-in screen ---------- */
const appEl=document.getElementById("app");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const AUTH_ERR={"auth/invalid-credential":"That email and password don't match. Try again, or tap Forgot password.","auth/wrong-password":"That password isn't right. Try again, or tap Forgot password.",
  "auth/user-not-found":"There's no account with that email yet. Tap Create your account.","auth/email-already-in-use":"That email already has an account. Sign in instead, or tap Forgot password.",
  "auth/weak-password":"Use at least 6 characters for your password.","auth/invalid-email":"Check the email address.","auth/too-many-requests":"Too many tries. Wait a few minutes and try again.","auth/network-request-failed":"No connection. Check your signal and try again."};
const authMsg=e=>AUTH_ERR[e?.code]||"Something went wrong. Try again.";
let mode="in";
function screen(html){appEl.innerHTML=`<section class="section" style="max-width:440px">${html}</section>`}
function note(t,bad){const n=document.getElementById("authNote");if(n){n.textContent=t;n.style.color=bad?"var(--bad)":"var(--ok)"}}
function signInScreen(){
  screen(`<h2 style="font-size:2rem">${mode==="up"?"Create your account":"Sign in"}</h2>
    <p class="meta" style="margin:0">${mode==="up"?"Use the email your facilities manager has for you.":"Facilities projects, updates and questions in one place."}</p>
    <form id="authForm" class="stack" style="margin-top:4px">
      ${mode==="up"?`<div class="field"><label for="aName">Your name</label><input type="text" id="aName" autocomplete="name" required></div>`:""}
      <div class="field"><label for="aEmail">Email</label><input type="text" id="aEmail" inputmode="email" autocomplete="email" autocapitalize="off" required></div>
      <div class="field"><label for="aPass">Password</label><input type="password" id="aPass" autocomplete="${mode==="up"?"new-password":"current-password"}" required minlength="6" style="width:100%;border:1px solid var(--line);background:var(--surface);border-radius:8px;padding:10px 12px;min-height:44px"></div>
      <div class="row"><button class="btn primary" type="submit">${mode==="up"?"Create account":"Sign in"}</button>
        ${mode==="in"?`<button class="btn ghost" type="button" id="aForgot">Forgot password?</button>`:""}</div>
      <div id="authNote" class="meta" role="status"></div>
    </form>
    <p class="meta" style="margin:0">${mode==="up"?`Already have an account? <button class="btn ghost small" id="aSwitch" style="padding:0">Sign in</button>`:`First time here? <button class="btn ghost small" id="aSwitch" style="padding:0">Create your account</button>`}</p>`);
  const v=id=>document.getElementById(id)?.value.trim()||"";
  document.getElementById("aSwitch").onclick=()=>{mode=mode==="up"?"in":"up";signInScreen()};
  const fg=document.getElementById("aForgot");if(fg)fg.onclick=async()=>{const e=v("aEmail");if(!e)return note("Type your email above first.",true);
    try{await sendPasswordResetEmail(auth,e);note("Check your email for a link to set a new password.")}catch(err){note(authMsg(err),true)}};
  document.getElementById("authForm").onsubmit=async ev=>{ev.preventDefault();const btn=ev.target.querySelector("button[type=submit]");btn.disabled=true;note("");
    const name=v("aName"),email=v("aEmail"),pass=document.getElementById("aPass").value; // read before the screen changes
    try{if(mode==="up"){if(name){try{localStorage.setItem("pendingName",name)}catch(e){}}const c=await createUserWithEmailAndPassword(auth,email,pass);
        if(name)await updateProfile(c.user,{displayName:name}).catch(()=>{});await sendEmailVerification(c.user).catch(()=>{});gate(c.user)}
      else await signInWithEmailAndPassword(auth,email,pass)}
    catch(err){note(authMsg(err),true);btn.disabled=false}}}
function verifyScreen(u){
  screen(`<h2 style="font-size:2rem">Check your email</h2>
    <p style="margin:0">We sent a link to <b>${esc(u.email)}</b>. Open it to confirm your email, then come back and tap Continue.</p>
    <p class="meta" style="margin:0">Don't see it? Check your junk folder.</p>
    <div class="row"><button class="btn primary" id="vGo">Continue</button><button class="btn" id="vResend">Send it again</button><button class="btn ghost" id="vOut">Sign out</button></div>
    <div id="authNote" class="meta" role="status"></div>`);
  document.getElementById("vGo").onclick=async()=>{await u.reload();if(auth.currentUser.emailVerified){await auth.currentUser.getIdToken(true);gate(auth.currentUser)}else note("Not confirmed yet. Open the link in the email first.",true)};
  document.getElementById("vResend").onclick=async()=>{try{await sendEmailVerification(u);note("Sent. Check your email.")}catch(e){note(authMsg(e),true)}};
  document.getElementById("vOut").onclick=()=>signOut(auth)}
function noAccessScreen(u){
  screen(`<h2 style="font-size:2rem">Almost there</h2>
    <p style="margin:0">You're signed in as <b>${esc(u.email)}</b>, but that email isn't on the project list yet.</p>
    <p class="meta" style="margin:0">We've let your facilities manager know you're trying to get in. Once they let you in, tap Try again.</p>
    <div class="row"><button class="btn primary" id="nTry">Try again</button><button class="btn ghost" id="nOut">Sign out</button></div>`);
  knock(u);
  document.getElementById("nTry").onclick=()=>gate(u);document.getElementById("nOut").onclick=()=>signOut(auth)}

// phone alert to the facilities manager through ntfy.sh. Says only what happened, never who, since anyone can read a topic.
function pingOwner(title,msg){const t=window.APP_CONFIG?.notifyTopic;if(!t)return;
  const q=new URLSearchParams({title,click:new URL("/tracker/",location.href).href,tags:"bell"}); // query params keep it a simple request (no CORS preflight)
  fetch("https://ntfy.sh/"+encodeURIComponent(t)+"?"+q,{method:"POST",body:msg,keepalive:true}).catch(()=>{})}
window.pingOwner=pingOwner;

// tells the facilities manager someone is waiting (only the first try is kept; they can't overwrite it)
function knock(u){const email=String(u.email).toLowerCase();
  const name=u.displayName||(()=>{try{return localStorage.getItem("pendingName")||""}catch(e){return""}})();
  setDoc(doc(fs,"knock/"+email),{email,name:name.slice(0,100),uid:u.uid,at:new Date().toISOString()})
    .then(()=>pingOwner("Someone is waiting to sign in","Open your tracker to let them in or ignore them.")).catch(()=>{})}

/* ---------- hand the app its tools once someone is signed in and allowed ---------- */
let started=false;const resolveReady=window.__resolveReady; // window.claude is stubbed in index.html so the app can ask for tools before this file loads
window.__signOut=()=>signOut(auth);
async function gate(u){
  if(!u)return signInScreen();
  if(!u.emailVerified)return verifyScreen(u);
  const email=String(u.email).toLowerCase(),isOwner=!!OWNER&&email===OWNER;
  if(!isOwner){try{const a=await getDoc(doc(fs,"access/"+email));if(!a.exists())return noAccessScreen(u)}catch(e){return noAccessScreen(u)}}
  if(started)return;started=true;
  appEl.innerHTML=`<div class="section"><div class="empty">Loading your projects…</div></div>`;
  const meInfo=()=>({id:u.uid,name:auth.currentUser?.displayName||(()=>{try{return localStorage.getItem("pendingName")||""}catch(e){return""}})(),email:u.email,avatarUrl:"",isOwner});
  const user={id:async()=>u.uid,me:async()=>meInfo(),
    profiles:async ids=>Object.fromEntries([].concat(ids).map(i=>[i,i===u.uid?meInfo():{id:i,name:"",avatarUrl:""}])),
    isOwner:()=>isOwner,canEdit:()=>isOwner}; // other people's names come from people/{id}
  resolveReady({db,user,assets,downloads,sample:null});
}
let lastUid;
onAuthStateChanged(auth,u=>{if(started&&(!u||u.uid!==lastUid))return location.reload();lastUid=u?.uid;gate(u)});
