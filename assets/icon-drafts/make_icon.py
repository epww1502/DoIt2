"""Rebuilds the DoIt2 icon candidates (m1..m6) and the chosen design #5 outputs.
All SVG strings and transforms are copied verbatim from the original session's
tool calls (2026-11-05 06:37-06:46 UTC); only file paths and the BSD `sed -i`
step (redone with re.sub) were adapted. Writes only into this directory."""
import re, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))

# --- z.svg (06:37:01, heredoc, verbatim) ---
Z = '''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024">
<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86C7FF"/><stop offset="1" stop-color="#5AB0FF"/></linearGradient></defs>
<rect width="1024" height="1024" fill="url(#bg)"/>
<g id="glyph">
<path d="M660 495 C745 495 805 560 805 650 C805 750 750 800 660 800 C570 800 525 750 525 650 C525 560 575 495 660 495 Z" fill="#FFD84D"/>
<path d="M290 405 C470 395 610 480 610 610 C610 740 520 800 380 800 L300 800 C240 800 215 775 213 720 C208 640 208 560 213 490 C216 430 240 407 290 405 Z" fill="#FFFFFF"/>
<circle cx="350" cy="590" r="22" fill="#2B3A55"/><circle cx="470" cy="590" r="22" fill="#2B3A55"/>
<path d="M380 640 Q410 670 440 640" fill="none" stroke="#2B3A55" stroke-width="15" stroke-linecap="round"/>
<ellipse cx="305" cy="640" rx="34" ry="22" fill="#FFB3C7"/><ellipse cx="515" cy="640" rx="34" ry="22" fill="#FFB3C7"/>
<circle cx="680" cy="630" r="20" fill="#2B3A55"/><circle cx="755" cy="630" r="20" fill="#2B3A55"/>
<path d="M696 676 Q718 700 740 676" fill="none" stroke="#2B3A55" stroke-width="14" stroke-linecap="round"/>
<ellipse cx="782" cy="676" rx="22" ry="16" fill="#FF9EB8" opacity="0.85"/>
<path d="M590 400 c0 -40 58 -54 74 -16 c16 -38 74 -24 74 16 c0 46 -74 82 -74 82 s-74 -36 -74 -82z" fill="#FF7A9A" transform="rotate(-8 664 420)"/>
</g>
<path d="M200 280 l12 30 30 12 -30 12 -12 30 -12 -30 -30 -12 30 -12z" fill="#FFFFFF"/>
<path d="M830 330 l9 22 22 9 -22 9 -9 22 -9 -22 -22 -9 22 -9z" fill="#FFFFFF" opacity="0.85"/>
</svg>
'''
open('z.svg', 'w').write(Z)

# --- six candidates (06:41:49, verbatim python) ---
s = Z
s = re.sub(r'</g>\n<path d="M200 280.*?</svg>', '</g>\n</svg>', s, flags=re.S)
s = re.sub(r'<path d="M590 400 c[^>]*/>\n', '', s)
H = 'M0 32 C-62 -8 -74 -58 -38 -76 C-16 -86 0 -72 0 -56 C0 -72 16 -86 38 -76 C74 -58 62 -8 0 32 Z'
P = '#FF7A9A'
def g(inner, x=668, y=432, sc=1.15, rot=-8):
    return f'<g transform="translate({x} {y}) rotate({rot}) scale({sc})">{inner}</g>'
L = lambda d, c, w: f'<path d="{d}" fill="none" stroke="{c}" stroke-width="{w}" stroke-linecap="round" stroke-linejoin="round"/>'
v = {
'1. 하트에 받침': g(f'<path d="{H}" fill="{P}"/>' + L('M0 30 L70 30', P, 26)),
'2. 하트 위에 2 선': g(f'<path d="{H}" fill="#FFC6D4"/>' + L('M-62 -40 C-74 -62 -50 -84 -30 -80 C-14 -77 -4 -68 0 -56 C4 -68 14 -77 30 -80 C58 -84 74 -58 58 -28 C46 -6 22 12 0 30 L72 30', '#FF5C86', 20)),
'3. 하트에 큰 2 구멍': g(f'<path d="{H}" fill="{P}"/>' + L('M-26 -34 Q-24 -56 0 -56 Q24 -56 24 -36 Q24 -18 -24 12 L28 12', '#FFFFFF', 17)),
'4. 하트로 그린 2': g(L('M-58 -30 C-80 -70 -20 -96 0 -58 C20 -96 84 -74 60 -26 C46 2 -2 20 -42 34 L60 34', P, 28), y=440),
'5. 하트 두 개': g(f'<g transform="translate(-26 4) rotate(-10) scale(0.8)"><path d="{H}" fill="#FFFFFF"/></g><g transform="translate(30 -6) rotate(10) scale(0.8)"><path d="{H}" fill="{P}"/></g>'),
'6. 하트²': g(f'<path d="{H}" fill="{P}"/>' + L('M50 -92 Q52 -112 70 -112 Q88 -112 88 -96 Q88 -82 52 -62 L92 -62', '#FFD84D', 13), x=650),
}
cells = ''
for i, (name, mark) in enumerate(v.items()):
    fn = f'm{i+1}.svg'
    m = s.replace('</g>\n</svg>', mark + '\n</g>\n</svg>')
    # follow-up step (06:41:49): sed -E enlarging the heart marks
    m = re.sub(r'translate\((6[0-9]{2}) (4[0-9]{2})\) rotate\(-8\) scale\(1\.15\)', r'translate(\1 405) rotate(-8) scale(1.45)', m)
    open(fn, 'w').write(m)
    cells += f'<div style="text-align:center"><img src="{fn}" style="width:240px;border-radius:54px"><h3 style="margin:10px 0 6px">{name}</h3><img src="{fn}" style="width:60px;border-radius:14px"></div>'
open('candidates.html', 'w').write(f'<html><head><meta charset="utf-8"></head><body style="margin:0;background:#F4F7FB;font-family:-apple-system;width:1000px"><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:30px 20px;padding:30px">{cells}</div></body></html>')

# --- chosen glyph (06:44:05) ---
inner = re.search(r'<g id="glyph">(.*)</g>\s*</svg>', open('m5.svg').read(), re.S).group(1)
open('glyph-inner.txt', 'w').write(inner)

# --- final outputs (06:44:24) ---
BG = '<defs><linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#86C7FF"/><stop offset="1" stop-color="#5AB0FF"/></linearGradient></defs><rect width="1024" height="1024" fill="url(#bg)"/>'
def svg(w, bg=False, body=None):
    k = w / 596
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">{BG if bg else ""}<g transform="translate(512 512) scale({k:.4f}) translate(-507 -548.5)">{body or inner}</g></svg>'
mono = inner
for c in ['#FFFFFF', '#FFD84D', '#FF7A9A']: mono = mono.replace(f'fill="{c}"', 'fill="#FFFFFF"')
for c in ['#2B3A55', '#FFB3C7', '#FF9EB8']: mono = mono.replace(f'fill="{c}"', 'fill="#000000"').replace(f'stroke="{c}"', 'stroke="#000000"')
mono = mono.replace('opacity="0.85"', '')
ms = svg(560, body=mono)
# mono fix-up (06:44:52)
ms = ms.replace('<ellipse cx="305"', '<ellipse fill-opacity="0" cx="305"')
ms = re.sub(r'(<ellipse[^>]*?)fill="#000000"', r'\1fill="none"', ms)
ms = ms.replace('<path d="M290 405', '<path stroke="#000000" stroke-width="18" d="M290 405', 1)
ms = re.sub(r'(<g transform="translate\(30 -6\)[^>]*><path d="[^"]*") fill="#FFFFFF"', r'\1 fill="#FFFFFF" stroke="#000000" stroke-width="12"', ms)
out = {'icon5.svg': svg(640, True), 'glyph5.svg': svg(640), 'foreground5.svg': svg(560), 'mono5.svg': ms, 'splash5.svg': svg(760)}
# final splash with wordmark (06:46:25; original was splash2.html using Pretendard-ExtraBold from the repo)
k = 400 / 596
out['splash5-final.svg'] = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024" style="display:block">
<g transform="translate(512 455) scale({k:.4f}) translate(-507 -548.5)">{inner}</g>
<text x="512" y="728" text-anchor="middle" font-family="P" font-size="118" letter-spacing="-2" fill="#FFFFFF">Doit<tspan fill="#FFD84D">2</tspan></text>
</svg>'''
for n, t in out.items():
    open(n, 'w').write(t)
