"""Build a single-file preview of the CalcMonkey app (for a private Claude preview page).
Usage: python3 tools/build_preview.py OUT.html"""
import os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
css = open(os.path.join(ROOT, 'assets', 'calcmonkey.css')).read()
js = open(os.path.join(ROOT, 'assets', 'calcmonkey.js')).read()
markup = open(os.path.join(ROOT, 'tools', 'app-markup.html')).read()
import re
hook = 'refreshLogo();updStats();render();'
assert js.count(hook) == 1
# preview-only testing helper (never part of the live site)
js = js.replace(hook, 'window.__cmPreviewBananas=function(n){S.bananas=Math.max(0,n===0?0:S.bananas+n);store.set("bananas",S.bananas);updStats("ban");render();};' + hook)
markup = re.sub(r'<link id="cm-css"[^>]*>', '<style id="cm-css">' + css + '</style>', markup)
markup = markup.replace('<a href="/contact/">', '<a href="https://www.calcmonkey.com/contact/" target="_blank" rel="noopener">')
page = ('<title>CalcMonkey Preview</title>\n'
 '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
 '<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@500;700;800;900&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">\n'
 '<style>:root{--pv-bg:#f4f8ff}html,body{background:var(--pv-bg)}body{padding:16px 12px 24px;padding-left:max(12px,env(safe-area-inset-left,0px));padding-right:max(12px,env(safe-area-inset-right,0px))}'
 '.pv-bar{max-width:1100px;margin:0 auto 12px;font:700 13px/1.4 system-ui,sans-serif;color:#2b2350;background:#fef9c3;border:2px solid #2b2350;border-radius:12px;padding:8px 12px;text-align:center}'
 '.pv-tools{display:inline-flex;gap:6px;margin-left:10px;flex-wrap:wrap;vertical-align:middle}.pv-tools button{font:800 13px system-ui,sans-serif;background:#fff;color:#2b2350;border:2px solid #2b2350;border-radius:999px;padding:3px 10px;cursor:pointer}.pv-tools button:hover{background:#ffd23f}'
 '@media(max-width:560px){body{padding:8px 6px 16px}.pv-tools{margin:6px 0 0}}</style>\n'
 '<div class="pv-bar">👀 Preview — changes here are not on calcmonkey.com yet. Bananas and dress-up saved here are separate from the real site.'
 '<span class="pv-tools"><button type="button" id="pv-add">🍌 +500 bananas</button><button type="button" id="pv-zero">Reset bananas to 0</button></span></div>\n'
 '<script>document.addEventListener("click",function(e){var b=e.target.closest&&e.target.closest("#pv-add,#pv-zero");if(!b||!window.__cmPreviewBananas)return;window.__cmPreviewBananas(b.id==="pv-add"?500:0);});</script>\n'
 + markup + '\n<script>\n' + js + '\n</script>\n')
open(sys.argv[1], 'w').write(page)
print('wrote', sys.argv[1], round(len(page)/1024), 'KB')
