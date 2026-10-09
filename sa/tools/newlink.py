"""Make a link that opens the tracker's New project form already filled in.

    python3 tools/newlink.py project.json        (or JSON on stdin)

Keys: category, name, jobNumber, department, lead, building, address, area, priority, phase,
startDate, dueDate (YYYY-MM-DD), nextMilestone, milestoneDate, description, notes,
details {category field: value}, groups [names], people [names]. Nothing is saved until
the owner reviews the form and taps Create project."""
import base64, json, sys

BASE = "https://siemonsma.org/tracker/"

def link(d, base=BASE):
    raw = json.dumps(d, separators=(",", ":"), ensure_ascii=False).encode()
    return base + "#new=" + base64.urlsafe_b64encode(raw).decode().rstrip("=")

if __name__ == "__main__":
    src = open(sys.argv[1]) if len(sys.argv) > 1 else sys.stdin
    print(link(json.load(src)))
