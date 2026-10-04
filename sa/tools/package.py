"""Builds the home page and packages the whole site for Netlify.

  python3 tools/package.py            -> ../site/ and ../site/siemonsma-site.zip
  python3 tools/package.py --preview  -> home/preview.html and request/preview.html (single files, for the claude.ai previews)

Site layout: / is the home page, /tracker/ is the project tracker (public/), /request/ is the public request form.
Run build.py and configure.py first so public/ is current.
"""
import base64, pathlib, shutil, sys

HERE = pathlib.Path(__file__).resolve().parent.parent
SRC = (HERE / "home" / "home.src.html").read_text()
REQ = (HERE / "request" / "request.src.html").read_text()
HARVARD = "data:image/png;base64," + base64.b64encode((HERE / "home/img/harvard.png").read_bytes()).decode()
IMGS = ["hero", "projects", "equipment", "facilities", "documents", "tools"]
PREVIEW_TRACKER = "https://claude.ai/artifact/MjokkX6mXjEaUNbPoZgq55"
PREVIEW_HOME = "https://claude.ai/artifact/24NUMwDYFEptnUb7mGcMkC"
PREVIEW_REQUEST = "https://claude.ai/artifact/2AWcuouVSpUqVngmJNKV5X"
NEW_TAB = ' target="_blank" rel="noopener"'

def check(s):
    assert "__" not in s.replace("__proto__", ""), "unfilled placeholder"
    return s

def fill(img, tracker, target, request):
    s = SRC.replace("__TRACKER_URL__", tracker).replace("__TRACKER_TARGET__", target).replace("__REQUEST_URL__", request)
    for k in IMGS:
        s = s.replace(f"__IMG_{k}__", img(k))
    return check(s)

def fill_request(home, tracker, target, mode):
    s = REQ
    for k, v in {"__HOME_URL__": home, "__TRACKER_URL__": tracker, "__LINK_TARGET__": target, "__HARVARD__": HARVARD, "__MODE__": mode,
                 "__CONFIG_TAG__": '<script src="../tracker/config.js"></script>' if mode == "live" else "",
                 "__FB_MODULE__": "../tracker/vendor/firebase.js"}.items():
        s = s.replace(k, v)
    return check(s)

if "--preview" in sys.argv:
    data = lambda k: "data:image/jpeg;base64," + base64.b64encode((HERE / "home/img" / f"{k}.jpg").read_bytes()).decode()
    out = HERE / "home" / "preview.html"
    out.write_text(fill(data, PREVIEW_TRACKER, NEW_TAB, PREVIEW_REQUEST))
    print("wrote", out)
    out = HERE / "request" / "preview.html"
    out.write_text(fill_request(PREVIEW_HOME, PREVIEW_TRACKER, NEW_TAB, "preview"))
    print("wrote", out)
    sys.exit()

site = HERE.parent / "site"
shutil.rmtree(site, ignore_errors=True)
(site / "assets").mkdir(parents=True)
for k in IMGS:
    shutil.copy(HERE / "home/img" / f"{k}.jpg", site / "assets" / f"{k}.jpg")
shutil.copy(HERE / "public/icons/icon-192.png", site / "assets/icon-192.png")
shutil.copy(HERE / "public/icons/icon-180.png", site / "assets/icon-180.png")
body = fill(lambda k: f"assets/{k}.jpg", "tracker/", "", "request/")
HEAD = ('<!doctype html>\n<html lang="en"><head>\n<meta charset="utf-8">\n'
        '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
        '<meta name="theme-color" content="#0b111b">\n')
(site / "request").mkdir()
req = fill_request("../", "../tracker/", "", "live")
(site / "request" / "index.html").write_text(
    HEAD + '<link rel="icon" type="image/png" href="../assets/icon-192.png">\n'
    + req.replace('<svg width="0"', '</head><body>\n<svg width="0"', 1) + "\n</body></html>\n")
(site / "index.html").write_text(
    '<!doctype html>\n<html lang="en"><head>\n<meta charset="utf-8">\n'
    '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
    '<meta name="theme-color" content="#0b111b">\n'
    '<link rel="icon" type="image/png" href="assets/icon-192.png">\n'
    '<link rel="apple-touch-icon" href="assets/icon-180.png">\n'
    + body.replace("<svg width=\"0\"", "</head><body>\n<svg width=\"0\"", 1)
    + "\n</body></html>\n")
# the tracker used to live at the site root; this retires its old service worker there
(site / "sw.js").write_text("self.addEventListener('install',()=>self.skipWaiting());\n"
                            "self.addEventListener('activate',e=>e.waitUntil(self.registration.unregister()));\n")
shutil.copytree(HERE / "public", site / "tracker", ignore=shutil.ignore_patterns("*.template"))
zipbase = HERE.parent / "siemonsma-site"
shutil.make_archive(str(zipbase), "zip", site)
shutil.move(str(zipbase) + ".zip", site / "siemonsma-site.zip")
print("built", site, "and", site / "siemonsma-site.zip")
