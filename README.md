# siemonsma.org

The site Netlify serves at siemonsma.org: a home page, the facilities project tracker and a public project request page.

| Path | What it is |
| --- | --- |
| `site/` | The published site, ready to serve. Netlify publishes this folder on every push to `main`. |
| `project-tracker.html` | The tracker's source. The claude.ai test copy runs this file directly. |
| `sa/` | Turns the source into the live site: Firebase connection, home page, request page, database rules and tests. |
| `fb-live.json` | The Firebase web settings. They're public by design; the database rules control access. |
| `notify-topic.txt` | The ntfy.sh topic Clint's phone subscribes to. New requests and sign-in attempts ping it (no names, just what happened). Leave the file out to turn alerts off. |

## Making a change

1. Edit `project-tracker.html` (tracker), `sa/home/home.src.html` (home page) or `sa/request/request.src.html` (request page).
2. Rebuild:
   ```sh
   cd sa
   python3 build.py
   python3 tools/configure.py csiemonsma@harvardintegrations.com ../fb-live.json
   python3 tools/package.py
   ```
3. Commit and push to `main`. Netlify publishes `site/` within a minute or two.

Database rule changes (`sa/firestore.rules`) aren't published by Netlify. Paste them into the Firebase console under Firestore Database → Rules and click Publish.
