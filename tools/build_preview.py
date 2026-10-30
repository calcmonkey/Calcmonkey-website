"""Build a single-file preview of the CalcMonkey app (for a private Claude preview page).
Usage: python3 tools/build_preview.py OUT.html"""
import os, sys
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
css = open(os.path.join(ROOT, 'assets', 'calcmonkey.css')).read()
js = open(os.path.join(ROOT, 'assets', 'calcmonkey.js')).read()
markup = open(os.path.join(ROOT, 'tools', 'app-markup.html')).read()
import re
markup = re.sub(r'<link id="cm-css"[^>]*>', '<style id="cm-css">' + css + '</style>', markup)
markup = markup.replace('<a href="/contact/">', '<a href="https://www.calcmonkey.com/contact/" target="_blank" rel="noopener">')
page = ('<title>CalcMonkey Preview</title>\n'
 '<link rel="preconnect" href="https://fonts.googleapis.com">\n'
 '<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@500;700;800;900&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">\n'
 '<style>:root{--pv-bg:#f4f8ff}html,body{background:var(--pv-bg)}body{padding:16px 12px 24px;padding-left:max(12px,env(safe-area-inset-left,0px));padding-right:max(12px,env(safe-area-inset-right,0px))}'
 '.pv-bar{max-width:1100px;margin:0 auto 12px;font:700 13px/1.4 system-ui,sans-serif;color:#2b2350;background:#fef9c3;border:2px solid #2b2350;border-radius:12px;padding:8px 12px;text-align:center}'
 '@media(max-width:560px){body{padding:8px 6px 16px}}</style>\n'
 '<div class="pv-bar">👀 Preview — changes here are not on calcmonkey.com yet. Bananas and dress-up saved here are separate from the real site.</div>\n'
 + markup + '\n<script>\n' + js + '\n</script>\n')
open(sys.argv[1], 'w').write(page)
print('wrote', sys.argv[1], round(len(page)/1024), 'KB')
