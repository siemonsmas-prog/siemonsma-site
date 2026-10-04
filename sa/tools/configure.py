"""Fills in the owner email and Firebase settings: writes firestore.rules, storage.rules and public/config.js.
Usage: python3 tools/configure.py owner@email firebase-config.json [--emulators]"""
import json, pathlib, sys
root = pathlib.Path(__file__).parent.parent
owner, cfg_path = sys.argv[1].strip().lower(), sys.argv[2]
cfg = json.loads(pathlib.Path(cfg_path).read_text())
emu = "--emulators" in sys.argv
# phone alerts (ntfy.sh): the topic lives in notify-topic.txt at the repo root; tests never ping the real phone
topic_file = root.parent / "notify-topic.txt"
topic = "" if emu or not topic_file.exists() else topic_file.read_text().strip()
for name in ["firestore.rules", "storage.rules"]:
    (root / name).write_text((root / (name + ".template")).read_text().replace("__OWNER_EMAIL__", owner))
(root / "public/config.js").write_text((root / "public/config.js.template").read_text()
    .replace("__OWNER_EMAIL__", owner).replace("__FIREBASE_CONFIG__", json.dumps(cfg)) .replace("__NOTIFY_TOPIC__", topic).replace("useEmulators: false", f"useEmulators: {'true' if emu else 'false'}"))
print("configured for", owner, "project", cfg.get("projectId"), "(emulators)" if emu else "")
