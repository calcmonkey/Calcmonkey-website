#!/usr/bin/env python3
"""Builds the CalcMonkey pages.

Shared code lives in assets/calcmonkey.js and assets/calcmonkey.css.
The app markup lives in tools/app-markup.html.
Each landing page below gets its own title, description, start section and
search-friendly intro text. Run:  python3 tools/build_pages.py
"""
import json, os, datetime
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SITE = 'https://www.calcmonkey.com'
import hashlib
def _ver(rel):
    return hashlib.md5(open(os.path.join(ROOT, rel), 'rb').read()).hexdigest()[:10]
JSV, CSSV = _ver('assets/calcmonkey.js'), _ver('assets/calcmonkey.css')
# version the shared files so browsers always load the newest game code after an update
MARKUP = open(os.path.join(ROOT, 'tools', 'app-markup.html')).read().replace('href="/assets/calcmonkey.css"', 'href="/assets/calcmonkey.css?v=' + CSSV + '"')

PAGES = [
  dict(path='/', start='home',
    title='CalcMonkey — Free Math Games for Kids & Step-by-Step Math Help',
    desc='Free, fun math games for kids in grades 1–6, plus free step-by-step math help, solvers and brain games for 7th grade through college. No sign-up needed.',
    h='Free math games and math help for every grade',
    intro='CalcMonkey is a free math website for kids, teens and adults. Younger kids practice addition, subtraction, multiplication and division with fun math games, then dress up their monkey and send it on adventures. Older students get step-by-step math help for algebra, geometry, trigonometry, calculus, statistics and linear algebra — with instant solvers and hands-on math games. There’s no sign-up needed.',
    bullets=[('Free math games for kids (grades 1–6)','Banana Grab, Balloon Pop, Jungle Race and Feed the Monkeys build fast math facts. Think-it-through games teach place value, carrying and borrowing, long division, fractions, order of operations and word problems.','/kids-math-games/'),
             ('Step-by-step math help (grade 7 – college)','Lessons by grade and topic with worked examples and unlimited practice problems: equations, slope, systems, quadratics, the Pythagorean theorem, logarithms, derivatives, integrals and more.','/math-help/'),
             ('Free math solvers','Type in your own homework problem and see every step: linear equations, the quadratic formula, systems of equations, lines, right triangles, derivatives and statistics.','/math-solvers/'),
             ('Math games for teens and adults','Equation Builder, Shape Lab, Tangent Hunter and Area Hunter turn algebra, geometry and calculus into hands-on challenges.','/math-games-for-teens/')],
    ld='home'),
  dict(path='/kids-math-games/', start='kids',
    title='Free Fun Math Games for Kids (Grades 1–6) | CalcMonkey',
    desc='Free, fun math games for kids in 1st through 6th grade: addition, subtraction, times tables, division, place value, fractions, long division and word problems — with a monkey to dress up!',
    h='Free, fun math games for kids in grades 1–6',
    intro='Kids learn math best when it feels like play. In the CalcMonkey Kids Jungle, every right answer earns a banana, and bananas unlock trips for your monkey — the beach, a birthday party, outer space and more — with new outfits to try on. Pick a grade, then choose a quick-facts game or a step-by-step puzzle. If a child gets stuck, Coach Monkey shows them how with a short lesson.',
    bullets=[('Quick math facts games','Addition and subtraction facts for 1st and 2nd grade, times tables and division facts for 3rd–6th grade, in Banana Grab, Balloon Pop, Jungle Race and Feed the Monkeys.',None),
             ('Step-by-step math puzzles','Number line hopping, tens and ones, carrying and borrowing, the area model for multiplication, long division, fractions, order of operations and two-step word problems — matched to each grade.',None),
             ('Built-in help','Answers flash for younger kids who are stuck, and Coach Monkey teaches tricks like counting on, making ten and skip counting.',None),
             ('Free and safe','No sign-up and nothing to download. Progress is saved on your own device.',None)],
    ld=dict(level='Grades 1–6', kind='Game', about=['Addition','Subtraction','Multiplication','Division','Place value','Fractions','Word problems'])),
  dict(path='/math-help/', start='lab',
    title='Free Step-by-Step Math Help: Algebra, Geometry, Calculus & More | CalcMonkey',
    desc='Free step-by-step math help for grade 7 through college: pre-algebra, algebra 1 and 2, geometry, trigonometry, precalculus, calculus, statistics and linear algebra with worked examples and unlimited practice.',
    h='Free step-by-step math help, grade 7 through college',
    intro='Stuck on homework? The CalcMonkey Big Brain Lab explains math one step at a time. Choose your grade or search for a topic to see the big idea, the key formula and a worked example you can reveal one step at a time. Most topics generate unlimited new practice problems with full solutions.',
    bullets=[('Pre-algebra and Algebra 1','Integers, order of operations, percents, solving equations, slope and lines, systems of equations, factoring and the quadratic formula.',None),
             ('Geometry, Algebra 2 and Trigonometry','The Pythagorean theorem, triangles, circles, volume, logarithms, complex numbers, the unit circle and the law of sines.',None),
             ('Calculus, Statistics and Linear Algebra','Limits, derivatives, the chain rule, integrals, mean and standard deviation, probability, z-scores, matrices and vectors.',None),
             ('Practice that never runs out','Generate a brand-new problem anytime and check your work step by step.',None)],
    ld=dict(level='Grade 7 – College', kind='Interactive resource', about=['Algebra','Geometry','Trigonometry','Calculus','Statistics','Linear algebra'])),
  dict(path='/math-solvers/', start='tools',
    title='Free Step-by-Step Math Solvers | CalcMonkey',
    desc='Free math solvers that show every step: linear equations, the quadratic formula, systems of equations, slope and line equations, right triangles, derivatives and statistics.',
    h='Free math solvers that show every step',
    intro='Enter your own numbers and CalcMonkey shows the full solution, step by step — so you learn how to do it, not just the answer.',
    bullets=[('Equations','Linear equations, systems of equations and the quadratic formula, including exact answers with square roots and complex numbers.',None),
             ('Lines and triangles','Slope, y-intercept, distance and midpoint between two points, plus right-triangle sides and angles with the Pythagorean theorem.',None),
             ('Calculus and statistics','Derivatives of polynomials with the power rule, and mean, median, mode, range and standard deviation.',None)],
    ld=dict(level='Grade 7 – College', kind='Interactive resource', about=['Equation solving','Quadratic formula','Pythagorean theorem','Derivatives','Statistics'])),
  dict(path='/math-games-for-teens/', start='arcade',
    title='Math Games for Teens & Adults: Algebra, Geometry & Calculus | CalcMonkey',
    desc='Free hands-on math games for middle school, high school and college: balance equations, build shapes, find tangent lines and estimate area under curves. Earn stars for understanding.',
    h='Hands-on math games for teens and adults',
    intro='Big kids like to have fun too. The CalcMonkey Lab Arcade turns algebra, geometry and calculus into hands-on challenges where you actually do the math — and earn stars for finishing, working efficiently and understanding why it works.',
    bullets=[('Equation Builder','Solve equations one move at a time by doing the same thing to both sides, and try to beat par.',None),
             ('Shape Lab','Drag triangle and quadrilateral corners to hit targets for area, angles and side lengths.',None),
             ('Tangent Hunter and Area Hunter','Discover derivatives by tilting tangent lines, and integrals by stacking rectangles under curves.',None)],
    ld=dict(level='Grade 7 – College', kind='Game', about=['Algebra','Geometry','Derivatives','Integrals'])),
]
NAV = [('Free math games for kids','/kids-math-games/'),('Math help','/math-help/'),('Math solvers','/math-solvers/'),('Math games for teens','/math-games-for-teens/'),('Contact','/contact/'),('Privacy','/privacy/')]

SEO_CSS = """<style>
html,body{margin:0;padding:0}body{background:#f4f8ff;padding:16px 12px 24px}@media(max-width:560px){body{padding:8px 6px 16px}}
.seo{max-width:1200px;margin:22px auto 0;box-sizing:border-box;background:#fff;border:3px solid #2b2350;border-radius:28px;padding:26px 28px;font-family:'Nunito',system-ui,-apple-system,Segoe UI,sans-serif;color:#2b2350;line-height:1.6}
.seo h1{font-family:'Baloo 2','Nunito',sans-serif;font-size:clamp(26px,4vw,36px);line-height:1.15;margin:0 0 10px}
.seo p{margin:0 0 16px;font-size:17px;font-weight:600}
.seo ul{list-style:none;margin:0;padding:0;display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}
.seo li{background:#fffbe8;border:2px solid #2b2350;border-radius:18px;padding:14px 16px}
.seo h2{font-family:'Baloo 2','Nunito',sans-serif;font-size:20px;line-height:1.2;margin:0 0 6px}
.seo h2 a{color:#2b2350}
.seo li p{font-size:15px;margin:0}
.seo nav{margin-top:18px;padding-top:14px;border-top:2px dashed #d8d2ee;display:flex;flex-wrap:wrap;gap:8px 18px;font-weight:800}
.seo nav a{color:#6d4aff;text-decoration:none}.seo nav a:hover{text-decoration:underline}
.seo small{display:block;margin-top:12px;opacity:.7;font-weight:700}
@media(max-width:560px){.seo{padding:20px 16px;border-radius:20px}}
</style>"""

def ldjson(pg):
    url = SITE + pg['path']
    org = {"@type":"Organization","@id":SITE+"/#org","name":"Calc Monkey LLC","url":SITE+"/","logo":SITE+"/assets/calcmonkey-app-icon.png","email":"info@calcmonkey.com","description":"Calc Monkey LLC makes mobile and desktop apps, including free math games and math help."}
    if pg['ld'] == 'home':
        graph = [org, {"@type":"WebSite","@id":SITE+"/#site","name":"CalcMonkey","url":SITE+"/","publisher":{"@id":SITE+"/#org"},"inLanguage":"en"}]
    else:
        L = pg['ld']
        graph = [org, {"@type":["WebPage","LearningResource"],"name":pg['title'],"url":url,"description":pg['desc'],"isPartOf":{"@id":SITE+"/#site"},
                 "publisher":{"@id":SITE+"/#org"},"educationalLevel":L['level'],"learningResourceType":L['kind'],"isAccessibleForFree":True,
                 "about":[{"@type":"Thing","name":a} for a in L['about']],"inLanguage":"en"}]
    return '<script type="application/ld+json">' + json.dumps({"@context":"https://schema.org","@graph":graph}, ensure_ascii=False) + '</script>'

def esc(s): return s.replace('&','&amp;').replace('"','&quot;').replace('<','&lt;')

def page(pg):
    url = SITE + pg['path']
    items = ''.join('<li><h2>' + (f'<a href="{l}">{esc(t)}</a>' if l else esc(t)) + f'</h2><p>{esc(d)}</p></li>' for t,d,l in pg['bullets'])
    nav = ''.join(f'<a href="{h}">{t}</a>' for t,h in NAV if h != pg['path'])
    if pg['path'] != '/': nav = '<a href="/">CalcMonkey home</a>' + nav
    seo = f'<section class="seo"><h1>{esc(pg["h"])}</h1><p>{esc(pg["intro"])}</p><ul>{items}</ul><nav aria-label="More from CalcMonkey">{nav}</nav><small>© {datetime.date.today().year} Calc Monkey LLC · Free math games &amp; step-by-step math help</small></section>'
    app = MARKUP.replace('data-start="home"', f'data-start="{pg["start"]}"').replace('class="cm-t-home"', 'class="cm-t-' + ('kids' if pg['start']=='kids' else 'lab' if pg['start'] in ('lab','tools','arcade') else 'home') + '"')
    head = f'''<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{esc(pg["title"])}</title>
<meta name="description" content="{esc(pg["desc"])}">
<link rel="canonical" href="{url}">
<meta name="robots" content="index,follow">
<meta name="google-site-verification" content="Vf-iQBoaQ2gMOSYRkQLpvMV1r0GQvJIDkxXGD0jtucw">
<link rel="icon" href="/favicon.png" type="image/png">
<link rel="icon" href="/assets/calcmonkey-app-icon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">
<meta name="theme-color" content="#1f1d3a">
<meta property="og:type" content="website">
<meta property="og:site_name" content="CalcMonkey">
<meta property="og:title" content="{esc(pg["title"])}">
<meta property="og:description" content="{esc(pg["desc"])}">
<meta property="og:image" content="{SITE}/assets/social-share.jpg">
<meta property="og:url" content="{url}">
<meta name="twitter:card" content="summary_large_image">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Baloo+2:wght@600;700;800&family=Nunito:wght@500;700;800;900&family=Space+Grotesk:wght@400;500;700&display=swap" rel="stylesheet">
{ldjson(pg)}
{SEO_CSS}
<!-- Cloudflare Web Analytics --><script type='module' src='https://static.cloudflareinsights.com/beacon.min.js' data-cf-beacon='{{"token": "3e894d27e1da44148ed0e715fde9fe50"}}'></script><!-- End Cloudflare Web Analytics -->
</head>
<body>
'''
    return head + app + '\n' + seo + '\n<script src="/assets/calcmonkey.js?v=' + JSV + '"></script>\n</body>\n</html>\n'

for pg in PAGES:
    d = os.path.join(ROOT, pg['path'].strip('/'))
    os.makedirs(d, exist_ok=True)
    open(os.path.join(d, 'index.html'), 'w').write(page(pg))
today = datetime.date.today().isoformat()
urls = [p['path'] for p in PAGES] + ['/contact/']
open(os.path.join(ROOT,'sitemap.xml'),'w').write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + ''.join(f'  <url><loc>{SITE}{u}</loc><lastmod>{today}</lastmod></url>\n' for u in urls) + '</urlset>\n')
open(os.path.join(ROOT,'robots.txt'),'w').write(f'User-agent: *\nAllow: /\nDisallow: /tools/\n\nSitemap: {SITE}/sitemap.xml\n')
print('built', len(PAGES), 'pages')
