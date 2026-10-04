"""Builds the standalone app (public/index.html) from the claude.ai version of the tracker.

Run after any change to ../project-tracker.html so both versions stay the same app.
"""
import pathlib, sys

HERE = pathlib.Path(__file__).parent
SRC = next(p for p in [HERE.parent / "project-tracker.html", HERE.parent / "project-tracker" / "project-tracker.html"] if p.exists())
src = SRC.read_text()
s = src

def rep(old, new, count=1):
    global s
    n = s.count(old)
    if n != count:
        sys.exit(f"build: expected {count} of {old[:70]!r}, found {n}")
    s = s.replace(old, new)

HEAD = """<!doctype html>
<html lang="en"><head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="theme-color" content="#0b111b">
<meta name="apple-mobile-web-app-capable" content="yes">
<meta name="mobile-web-app-capable" content="yes">
<meta name="apple-mobile-web-app-title" content="Projects">
<link rel="manifest" href="manifest.webmanifest">
<link rel="apple-touch-icon" href="icons/icon-180.png">
<link rel="icon" type="image/png" href="icons/icon-192.png">
"""
rep("<title>Facilities Project Tracker</title>", HEAD + "<title>Facilities Project Tracker</title>")
rep('<header class="bar">', '</head><body>\n<header class="bar">')
rep("\n<script>\n/* ---------- reference data ---------- */",
    '\n<script src="config.js"></script>\n'
    '<script>window.__readyP=new Promise(r=>window.__resolveReady=r);window.claude={use:n=>window.__readyP.then(a=>a[n]??null)};</script>\n'
    "<script>\n/* ---------- reference data ---------- */")
rep("boot();\n</script>",
    "boot();\n</script>\n"
    '<script type="module" src="shim.js"></script>\n'
    "<script>if(\"serviceWorker\" in navigator&&location.protocol===\"https:\")navigator.serviceWorker.register(\"sw.js\").catch(()=>{});</script>\n"
    "</body></html>")

# on the live site the home page is one level up
rep('href="https://claude.ai/artifact/24NUMwDYFEptnUb7mGcMkC" target="_blank" rel="noopener"', 'href="../"', 2)
# ...and so is the public request page
rep('href="https://claude.ai/artifact/2AWcuouVSpUqVngmJNKV5X" target="_blank" rel="noopener"', 'href="../request/"')
rep('const REQ_URL="https://claude.ai/artifact/2AWcuouVSpUqVngmJNKV5X";', 'const REQ_URL=new URL("../request/",location.href).href;')

# wording that only made sense inside claude.ai
rep('"Your access is view-only. Ask the facilities manager to share this app with you as an Editor so you can ask questions."',
    '"You don\'t have permission to do that."')
rep('fatal("Open this app from its claude.ai link while signed in.")', 'fatal("Couldn\'t start the app. Reload the page to try again.")')
rep('fatal("Sign in to claude.ai to see your projects. If you\'re signed in, ask Clint to share this app with you.")', 'fatal("Couldn\'t connect. Check your connection and reload.")')
rep("Sign in to claude.ai and reopen the link.", "Sign out and sign in again.")
rep("Uploading isn't available in this view. Open the app from its claude.ai link to add files.", "File uploads aren't set up yet.")
rep("They'll see them once they open the app (share it as an Editor from the Share menu) and enter the same name or email you have for them.",
    "Give a contact an email address and they can create an account and sign in. They'll see the projects and groups you give them.")
rep("People who haven't signed in yet will see the project once they open the app and enter the same name or email you have for them.",
    "People who haven't signed in yet need an email on their contact. They'll see the project once they create an account with that email.")
rep("They'll see projects once they open the app and enter the same name or email as above.",
    "Add their email above so they can create an account and sign in.")

# uploads live in Firebase Storage; keep the download link on the file record
rep('const fileUrl=f=>f.link||("/_blob/"+f.assetId);', 'const fileUrl=f=>f.link||f.url||("/_blob/"+f.assetId);')
rep("assetId:a.id,name:file.name,", "assetId:a.id,url:a.url,name:file.name,")
# the PDF library ships with the app instead of coming from a CDN
rep('"https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"', '"vendor/jspdf.umd.min.js"')
rep('"https://cdnjs.cloudflare.com/ajax/libs/jspdf-autotable/3.8.2/jspdf.plugin.autotable.min.js"', '"vendor/jspdf.plugin.autotable.min.js"')

# welcome form starts with the email they signed in with; profile gets a sign-out button
rep('${profileFields({name:prof?.name||""})}', '${profileFields({name:prof?.name||"",email:prof?.email||""})}')
rep('<div class="stack">${profileFields(S.meDoc)}<div><button class="btn primary" data-act="welcomeSave">Save</button></div></div>',
    '<div class="stack">${profileFields(S.meDoc)}<div class="row"><button class="btn primary" data-act="welcomeSave">Save</button><button class="btn ghost" data-act="signOut">Sign out</button></div></div>')
rep('    case"profile":return openProfile();', '    case"profile":return openProfile();\n    case"signOut":return window.__signOut&&window.__signOut();')

# a contact's email is what lets them sign in (access/{email})
rep('if(key==="new"){const ref=await S.db.collection("contacts").add(full);await savePersonAccess("c:"+ref.id)}else{await S.db.doc("contacts/"+key.slice(2)).set(full);await savePersonAccess(key)}}',
    'const oldEmail=key==="new"?"":low(S.contacts[key.slice(2)]?.email);let cid;'
    'if(key==="new"){const ref=await S.db.collection("contacts").add(full);cid=ref.id}else{cid=key.slice(2);await S.db.doc("contacts/"+cid).set(full)}'
    'await savePersonAccess("c:"+cid);await syncAccess(cid,oldEmail,low(full.email),full.name)}')
rep("async function deleteContact(id){try{",
    'async function syncAccess(cid,oldEmail,email,name){ // the sign-in allow list follows the contact\'s email\n'
    '  if(oldEmail&&oldEmail!==email)await S.db.doc("access/"+oldEmail).delete().catch(()=>{});\n'
    '  if(email&&/^[^\\s@\\/]+@[^\\s@\\/]+$/.test(email))await S.db.doc("access/"+email).set({contact:cid,name:name||"",at:now()})}\n'
    "async function deleteContact(id){try{const em=low(S.contacts[id]?.email);if(em)await S.db.doc(\"access/\"+em).delete().catch(()=>{});")


# one-time import of the claude.ai data, from a file the owner picks (keeps that data off the public site)
rep('S.isOwner?"No projects yet. Start one with <b>New project</b>."',
    'S.isOwner?`No projects yet. Start one with <b>New project</b>.<div style="margin-top:14px"><b>Moving over from the claude.ai version?</b><div class="meta" style="margin:4px 0 10px">Pick the export file Claude sent you and everything comes across: projects, updates, contacts and groups.</div><label class="btn primary" for="importFile">Choose export file</label><input type="file" id="importFile" accept=".json,application/json" hidden><div id="importProg" class="meta" style="margin-top:8px"></div></div>`')
rep("async function deleteContact(id){try{",
    'async function importOld(file){\n'
    '  const prog=document.getElementById("importProg"),say=t=>{if(prog)prog.textContent=t};\n'
    '  let data;try{data=JSON.parse(await file.text())}catch(e){return toast("That file isn\'t an export file.")}\n'
    '  if(!data.projects)return toast("That file isn\'t an export file.");\n'
    '  const old=data.oldOwnerId||"u_k0UxCXmdoxJQCo30c3Hgqg",swap=v=>JSON.parse(JSON.stringify(v).split(old).join(S.me));\n'
    '  const w=[];for(const [id,p] of Object.entries(data.projects)){const {_updates,...d}=p;w.push(["projects/"+id,{...d,owner:S.me}]);for(const [u,x] of Object.entries(_updates||{}))w.push(["projects/"+id+"/updates/"+u,x])}\n'
    '  for(const c of ["contacts","groups","questions","files"])for(const [id,d] of Object.entries(data[c]||{}))w.push([c+"/"+id,d]);\n'
    '  for(const [id,d] of Object.entries(data.people||{}))if(id!==old)w.push(["people/"+id,d]);else if(!S.meDoc)w.push(["people/"+S.me,{...d,email:S.profiles[S.me]?.email||""}]);\n'
    '  for(const [id,c] of Object.entries(data.contacts||{})){const em=low(c.email);if(em)w.push(["access/"+em,{contact:id,name:c.name||"",at:now()}])}\n'
    '  try{for(const [i,[path,d]] of w.entries()){say("Copying "+(i+1)+" of "+w.length+"…");await S.db.doc(path).set(swap(d))}say("");toast("Imported "+Object.keys(data.projects).length+" projects")}catch(e){say("");toast(friendly(e))}}\n'
    "async function deleteContact(id){try{")
rep('if(e.target.id==="fileIn"&&e.target.files.length)', 'if(e.target.id==="importFile"&&e.target.files.length)return importOld(e.target.files[0]);if(e.target.id==="fileIn"&&e.target.files.length)')

(HERE / "public" / "index.html").write_text(s)
print("built public/index.html", len(s), "bytes")
