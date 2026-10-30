# calcmonkey.com

The CalcMonkey website by Calc Monkey LLC — free math games (grades 1–6) and step-by-step math help (grade 7 through college).

## Pages
- `/` — home
- `/kids-math-games/` — Kids Jungle (grades 1–6)
- `/math-help/` — Big Brain Lab lessons (grade 7 – college)
- `/math-solvers/` — step-by-step solvers
- `/math-games-for-teens/` — Lab Arcade
- `/contact/` — Calc Monkey LLC contact page

## How it's built
- `assets/calcmonkey.js` and `assets/calcmonkey.css` — the app itself, shared by every page
- `tools/app-markup.html` — the app's HTML frame
- `tools/build_pages.py` — creates each page (titles, descriptions, search-friendly text), `sitemap.xml` and `robots.txt`. Run `python3 tools/build_pages.py` after changing it.

## How updates work
Ask Claude for a change → Claude saves it to this repository → Netlify publishes it to www.calcmonkey.com in about a minute.

## Preview first, publish later
- Day-to-day changes go to the **`preview`** branch. Netlify builds it for free at
  https://preview--meek-cajeta-caa7b7.netlify.app (branch deploys cost 0 credits).
- Publishing = merging `preview` into **`main`**, which updates www.calcmonkey.com
  (each production deploy costs 15 Netlify credits, so we publish once per work session).
