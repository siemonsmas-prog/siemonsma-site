"""Make a link that opens the tracker's New project form already filled in.

    python3 tools/newlink.py project.json        (or JSON on stdin)
    python3 tools/newlink.py --update update.json

An update link (#upd=) opens the update form for one project already filled in. Keys: project (name) or
projectId, status, percent, phase, nextMilestone, milestoneDate, done, next, blockers.

Keys: category, name, jobNumber, department, lead, building, address, area, priority, phase,
startDate, dueDate (YYYY-MM-DD), nextMilestone, milestoneDate, description, notes,
details {category field: value}, groups [names], people [names]. Nothing is saved until
the owner reviews the form and taps Create project."""
import base64, json, sys

BASE = "https://siemonsma.org/tracker/"

def link(d, base=BASE, kind="new"):
    raw = json.dumps(d, separators=(",", ":"), ensure_ascii=False).encode()
    return base + "#" + kind + "=" + base64.urlsafe_b64encode(raw).decode().rstrip("=")

if __name__ == "__main__":
    args = sys.argv[1:]
    kind = "upd" if "--update" in args else "new"
    args = [a for a in args if a != "--update"]
    src = open(args[0]) if args else sys.stdin
    print(link(json.load(src), kind=kind))
