// Copies the projects, contacts, groups and people from the claude.ai version into Firebase.
// Usage: node tools/import.js data/export.json owner@example.com
// Needs GOOGLE_APPLICATION_CREDENTIALS (service account) or the emulator env vars. Safe to run again: it overwrites the same documents.
const {initializeApp}=require("firebase-admin/app");const {getFirestore}=require("firebase-admin/firestore");const {getAuth}=require("firebase-admin/auth");const fs=require("fs");
const [file,ownerEmailArg]=process.argv.slice(2);
if(!file||!ownerEmailArg){console.error("usage: node tools/import.js data/export.json owner@email");process.exit(1)}
const ownerEmail=ownerEmailArg.trim().toLowerCase();
const OLD_OWNER=process.env.OLD_OWNER_ID||"u_k0UxCXmdoxJQCo30c3Hgqg";
initializeApp(process.env.GCLOUD_PROJECT?{projectId:process.env.GCLOUD_PROJECT}:undefined);
const db=getFirestore();const auth=getAuth();
(async()=>{
  const data=JSON.parse(fs.readFileSync(file,"utf8"));
  let owner;try{owner=await auth.getUserByEmail(ownerEmail)}catch(e){owner=await auth.createUser({email:ownerEmail,emailVerified:true});console.log("created owner account (set a password with Forgot password):",ownerEmail)}
  const swap=v=>JSON.parse(JSON.stringify(v).split(OLD_OWNER).join(owner.uid)); // old claude.ai id -> new account id, in values and keys
  const writes=[];
  const put=(path,doc)=>writes.push([path,swap(doc)]);
  for(const [id,p] of Object.entries(data.projects)){const {_updates,...doc}=p;put("projects/"+id,{...doc,owner:owner.uid});for(const [uid,u] of Object.entries(_updates||{}))put(`projects/${id}/updates/${uid}`,u)}
  for(const col of ["contacts","groups","questions","files"])for(const [id,d] of Object.entries(data[col]||{}))put(col+"/"+id,d);
  for(const [id,d] of Object.entries(data.people||{}))put("people/"+(id===OLD_OWNER?owner.uid:id),id===OLD_OWNER?{...d,email:d.email||ownerEmail}:d);
  for(const [id,c] of Object.entries(data.contacts||{})){const em=String(c.email||"").trim().toLowerCase();if(em)put("access/"+em,{contact:id,name:c.name||"",at:new Date().toISOString()})}
  for(let i=0;i<writes.length;i+=400){const b=db.batch();writes.slice(i,i+400).forEach(([p,d])=>b.set(db.doc(p),d));await b.commit()}
  const n={};writes.forEach(([p])=>{const k=p.split("/")[0]+(p.includes("/updates/")?"/updates":"");n[k]=(n[k]||0)+1});
  console.log("imported",n,"owner uid",owner.uid);process.exit(0)
})().catch(e=>{console.error(e);process.exit(1)});
