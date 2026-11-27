"""
SHELVED (founder, 2026-11-27): the Thought Traps scene as the loader when a
program opens. The app side is on the local branch feat/thought-traps-scene.

The site's cage scene (sw-landing CageAvatar.tsx, captured as
inputs/scenes/cage-raw-<ms>.svg) cut into layers, each drawn alone by the same
Chrome as the cover, cropped, and written as PNGs into the app with a manifest.
The app (ProgramScene) moves the layers with transforms and opacity only; its
last frame is the Breaking Thought Traps cover.

Run from the repo root:  python3 design/program-covers/tools/app-scene-thought-traps.py
"""
import copy, json, os, re, subprocess, sys, tempfile
import xml.etree.ElementTree as ET
from PIL import Image

NS = 'http://www.w3.org/2000/svg'
ET.register_namespace('', NS)
HERE = os.path.dirname(os.path.abspath(__file__))
COVERS = os.path.dirname(HERE)
APP = os.path.dirname(os.path.dirname(COVERS))
OUT_PNG = os.path.join(APP, 'app/assets/program-scenes/breaking_thought_traps')
OUT_TS = os.path.join(APP, 'app/components/ProgramScene/thoughtTraps.generated.ts')

K = 900 / 800
TOP = 776 - (298 + 300) * K          # the cover's placement of the scene box (scenes/breaking_thought_traps.cjs)
WRAP = f'translate(0 {TOP}) scale({K}) translate(240 300)'
def to_cover(x, y):                    # scene units -> cover units (900 x 1200)
    return [round((x + 240) * K, 2), round(TOP + (y + 300) * K, 2)]

def load(ms):
    s = open(os.path.join(COVERS, 'inputs/scenes', f'cage-raw-{ms}.svg')).read().replace('<svg ', f'<svg xmlns="{NS}" ', 1)
    return ET.fromstring(s)
A, B, C = load(1500), load(2600), load(4800)

def ids(root):
    return {e.get('id'): e for e in root.iter() if e.get('id')}

def needed_defs(root, el):
    """Every clipPath/mask/filter/gradient the element points at, followed through."""
    by = ids(root); seen, out = set(), []
    todo = re.findall(r'url\(#([^)]+)\)', ET.tostring(el, encoding='unicode'))
    while todo:
        i = todo.pop()
        if i in seen or i not in by: continue
        seen.add(i); d = by[i]
        if el.find(f".//*[@id='{i}']") is not None: continue   # already inside the element
        out.append(d); todo += re.findall(r'url\(#([^)]+)\)', ET.tostring(d, encoding='unicode'))
    return out

def by_id(root, i):
    return copy.deepcopy(ids(root)[i])

def svg_of(parts_xml, defs_xml=''):
    return f'<svg xmlns="{NS}" viewBox="0 0 900 1200" width="900" height="1200"><defs>{defs_xml}</defs><g transform="{WRAP}">{parts_xml}</g></svg>'

def piece(root, i, **attrs):
    el = by_id(root, i)
    for k, v in attrs.items():
        if v is None: el.attrib.pop(k, None)
        else: el.set(k, v)
    defs = ''.join(ET.tostring(d, encoding='unicode') for d in needed_defs(root, ids(root)[i]))
    return svg_of(ET.tostring(el, encoding='unicode'), defs)

layers = {}
# her figure, three faces (thinking in the cage, looking up as it creaks, laughing as it breaks)
for name, root in (('figThink', A), ('figUp', B), ('figLaugh', C)):
    fig = copy.deepcopy(root[2]); mask = copy.deepcopy(root[0])
    layers[name] = svg_of(ET.tostring(fig, encoding='unicode'), ET.tostring(mask, encoding='unicode'))
ident = 'translate(0 0) rotate(0)'
layers['floorLBack'] = piece(A, 'cg-fL', transform=ident, opacity='1')
layers['floorRBack'] = piece(A, 'cg-fR', transform=ident, opacity='1')
layers['floorLFront'] = piece(A, 'cg-lL', transform=ident, opacity='1')
layers['floorRFront'] = piece(A, 'cg-lR', transform=ident, opacity='1')
layers['shadow'] = piece(C, 'cg-shadow')
layers['cage'] = piece(A, 'cg-all', style=None)
for p in ('cg-pT', 'cg-pL', 'cg-pR'):
    layers[p[3:]] = piece(C, p, transform=ident, opacity='1', style=None)
# the bottom stubs pass behind her shoulders (the cover's mask)
pb = by_id(C, 'cg-pB'); pb.set('transform', ident); pb.set('opacity', '1'); pb.attrib.pop('style', None)
pbdefs = ''.join(ET.tostring(d, encoding='unicode') for d in needed_defs(C, ids(C)['cg-pB']))
layers['pB'] = svg_of('<g mask="url(#cgbehind)">' + ET.tostring(pb, encoding='unicode') + '</g>',
    pbdefs + '<mask id="cgbehind" maskUnits="userSpaceOnUse" x="-400" y="-400" width="1200" height="1200"><rect x="-400" y="-400" width="1200" height="1200" fill="#fff"/><path d="M118 218 L202 218 C240 236 270 258 292 300 L28 300 C50 258 80 236 118 218 Z" fill="#000"/></mask>')
layers['rain'] = svg_of(''.join(ET.tostring(by_id(A, f'cg-d{i}'), encoding='unicode') for i in range(8)))
layers['cloud'] = piece(A, 'cg-cloud')                                     # where it starts, over the cage
layers['sun'] = piece(C, 'cg-sun', opacity='1', transform='translate(400 -150) scale(0.8)')

# render every layer, then crop to what it draws
tmp = tempfile.mkdtemp()
jobs = []
for name, svg in layers.items():
    f = os.path.join(tmp, name + '.svg'); open(f, 'w').write(svg)
    jobs += [f, os.path.join(tmp, name + '.png'), '900', '1200']
bg_svg = subprocess.check_output(['node', '-e', "process.stdout.write(require('./scenes/breaking_thought_traps.cjs')('bg'))"], cwd=COVERS, text=True)
open(os.path.join(tmp, 'bg.svg'), 'w').write(bg_svg)
jobs += [os.path.join(tmp, 'bg.svg'), os.path.join(tmp, 'bg.png'), '900', '1200']
render = "const {renderSvg}=require('./lib/render.cjs');const fs=require('fs');const a=process.argv.slice(1);for(let i=0;i<a.length;i+=4)renderSvg(fs.readFileSync(a[i],'utf8'),a[i+1],+a[i+2],+a[i+3]);"
subprocess.run(['node', '-e', render] + jobs, check=True, cwd=COVERS)

os.makedirs(OUT_PNG, exist_ok=True)
manifest = {}
for name in ['bg'] + list(layers):
    im = Image.open(os.path.join(tmp, name + '.png')).convert('RGBA')
    box = (0, 0, 900, 1200) if name == 'bg' else im.getchannel('A').getbbox()
    if box is None: raise SystemExit(f'layer {name} is empty')
    pad = 3
    box = (max(0, box[0] - pad), max(0, box[1] - pad), min(900, box[2] + pad), min(1200, box[3] + pad))
    crop = im.crop(box)
    if name == 'bg': crop = crop.convert('RGB')
    crop.save(os.path.join(OUT_PNG, name + '.png'), optimize=True)
    manifest[name] = {'x': box[0], 'y': box[1], 'w': box[2] - box[0], 'h': box[3] - box[1]}

# where each moving part turns, and where it ends (the cover), in cover units
motion = {
    'floorL': {'pivot': to_cover(0, 300), 'to': {'x': -4.8 * K, 'y': 3.6 * K, 'r': -1.26}},
    'floorR': {'pivot': to_cover(320, 300), 'to': {'x': 4.8 * K, 'y': 3.6 * K, 'r': 1.26}},
    'cage': {'pivot': to_cover(160, 312)},
    'pT': {'pivot': to_cover(160, -60), 'to': {'x': 0, 'y': -89.8 * K, 'r': 14.02}},
    'pL': {'pivot': to_cover(-40, 160), 'to': {'x': -80.2 * K, 'y': 31.0 * K, 'r': -22.13}},
    'pR': {'pivot': to_cover(380, 160), 'to': {'x': 84.2 * K, 'y': 31.0 * K, 'r': 20.13}},
    'pB': {'pivot': to_cover(160, 300), 'to': {'x': 0, 'y': 5.1 * K, 'r': 0}},
    # the cloud starts at translate(160 -302) scale(1.15) and ends at the cover's translate(-120 -296) scale(0.8)
    'cloud': {'pivot': to_cover(160, -302), 'to': {'x': (-120 - 160) * K, 'y': (-296 + 302) * K, 's': 0.8 / 1.15}},
    'sun': {'pivot': to_cover(400, -150)},
}
names = ['bg', 'sun'] + [n for n in layers if n != 'sun']
order = ['bg', 'sun', 'shadow', 'floorLBack', 'floorRBack', 'figThink', 'figUp', 'figLaugh', 'floorLFront', 'floorRFront', 'cage', 'pT', 'pL', 'pR', 'pB', 'rain', 'cloud']
assert sorted(order) == sorted(names), (order, names)
os.makedirs(os.path.dirname(OUT_TS), exist_ok=True)
req = '\n'.join(f'  {n}: require("../../assets/program-scenes/breaking_thought_traps/{n}.png"),' for n in order)
open(OUT_TS, 'w').write(f'''// GENERATED by design/program-covers/tools/app-scene-thought-traps.py. Do not edit by hand.
// The layers of the site's cage scene (CageAvatar.tsx) for the Breaking Thought Traps cover, in cover units (900 x 1200),
// back to front, and where each moving part turns and ends. The last frame is the cover.
import type {{ ImageSourcePropType }} from "react-native";

export const ORDER = {json.dumps(order)} as const;
export type LayerName = (typeof ORDER)[number];

export const SOURCES: Record<LayerName, ImageSourcePropType> = {{
{req}
}};

export const BOXES: Record<LayerName, {{ x: number; y: number; w: number; h: number }}> = {json.dumps(manifest, indent=2)};

export const MOTION = {json.dumps(motion, indent=2)} as const;
''')
print('wrote', len(order), 'layers to', OUT_PNG)
