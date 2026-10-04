"""Packs a folder of ArtifactData JSON dumps (live2/) into data/export.json for the importer."""
import json, pathlib, sys
src = pathlib.Path(sys.argv[1]); out = {"projects": {}, "contacts": {}, "groups": {}, "people": {}, "questions": {}, "files": {}}
for col in out:
    d = src / col
    if not d.exists(): continue
    for f in sorted(d.glob("*.json")):
        out[col][f.stem] = json.loads(f.read_text())
for pid, p in out["projects"].items():
    ud = src / "projects" / pid / "updates"
    p["_updates"] = {f.stem: json.loads(f.read_text()) for f in sorted(ud.glob("*.json"))} if ud.exists() else {}
pathlib.Path(sys.argv[2]).write_text(json.dumps(out, indent=1))
print({k: len(v) for k, v in out.items()}, "updates:", sum(len(p["_updates"]) for p in out["projects"].values()))
