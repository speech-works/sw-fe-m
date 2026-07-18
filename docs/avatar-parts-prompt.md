# Avatar wardrobe — SVG generation brief

You are drawing wardrobe pieces for a character avatar in the **visual language
of Reddit's Avatar Builder** (Snoo) — reverse-engineered from Reddit's own
production SVG output, described precisely in §3. The **face and the round
container are fixed brand assets you must NOT redraw or alter** — your job is to
draw hair, headgear, eyewear, and hand-props that sit *on top of* that fixed
face, fitting it exactly. Read the whole brief before drawing anything,
especially §3 — it is the actual technique, not a vague style reference.

---

## 1. What this is

A speech-therapy app for people who stutter. Each user owns one avatar — a
friendly round-headed character on a colored disc — and dresses it. Levelling up
earns "journey gear" that tells a story: a beginner **tourist** who grows into a
**guide** planting a flag for others.

**The look, precisely:** flat color fills + confident black ink linework, no
gradients, no airbrush shading, no nose or eyebrows. Personality lives entirely
in silhouette and ink detail, not in rendering. This is deliberate and locked —
earlier rounds tried soft gradient shading (a "premium 3D" look) and it was
rejected; do not add gradients, soft light/shadow blends, or facial modeling.

Two previous hand-drawn attempts failed, and here is exactly why, so you don't
repeat it:
- **Hair drawn as a flat silhouette + a single uniform-width outline stroke
  reads as a swim cap, not hair.** The fix (confirmed against Reddit's real
  assets) is in §3: the ink is a SEPARATE filled shape with variable width —
  thick at roots/creases, tapering to a fine point at lock tips and strand
  ends — not a stroke of constant width around the mass.
- **Every hairstyle/hat/prop must be its own bespoke drawing.** Do not generate
  four hair styles by tweaking one shared formula — Reddit doesn't do that
  (every style in their builder is individually illustrated), and neither
  should you. Each of the pieces in §6 should look like a different artist
  decision, not a parameter change on the same base shape.

---

## 2. THE FIXED BRAND — do not modify, only build onto

Everything renders in a **48×48 coordinate space**, `viewBox="0 0 48 48"`. Your
parts are separate SVG layers placed over this exact face. Reproduce nothing
below — it already exists; it's here so your parts line up with it.

**The container (the round disc):** a circle, centre (24, 24), radius 24. In the
final composite it's filled with a solid backdrop color and clipped to a circle.
Nothing you draw may spill outside this disc EXCEPT hand-props (see §6).

**The head plate (the squircle face):** this exact path, filled flat with the
skin color and outlined in ink. No gradient, no drop shadow.
```
HEAD = "M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
INK  = "#241F26"   <!-- the one line color, shared by every shape -->
```
```
<path d="{HEAD}" fill="{SKIN}"/>
<path d="{HEAD}" fill="none" stroke="{INK}" stroke-width="1.2" stroke-linejoin="round"/>
```

**The eyes and smile (fixed — never cover the eyes, never add a nose or
eyebrows):**
```
Left eye:  ellipse rx=3.1 ry=4 at (16, 22), fill #FFF, ink-outlined (stroke {INK} width 0.6)
           iris circle r=2.15 fill #2E2A44 at (16.55, 23.1); pupil r=1.55 fill #0B0A10 same centre
           catchlight r=0.6 #FFF at (15.85, 22.3)
Right eye: mirrored at (32, 22) / iris centre (31.45, 23.1) / catchlight (30.75, 22.3)
Smile:     one ink stroke, "M19 30.2 Q24.675 34.6 30.35 30.2", stroke {INK} width 1.5, round cap
```

---

## 3. THE TECHNIQUE — reverse-engineered from Reddit's actual production SVGs

This is not a style guideline, it's the literal construction method, taken
directly from inspecting Reddit's shipped avatar-builder assets. Follow it.

This is exactly how Reddit's real hair asset is built (17 stacked flat shapes,
zero gradients), reverse-engineered layer by layer:

**Layer 1 — the color mass: SEVERAL flat blobs, not one silhouette.** Reddit's
hair is 3 separate `--color-hair` fill shapes — a main crown mass, a side
sweep, and a small sideburn/cowlick tuft — layered so they overlap. Composing a
part from 2–4 overlapping flat blobs (rather than one outline) is what gives it
believable dimension. Every blob shares the one user color.

**Layer 2 — flat shadow + highlight shapes (this is how they get volume WITHOUT
gradients).** A separate near-black fill (`#1d1d1b`) tucked under an overlapping
mass reads as a cast shadow; a separate white fill at ~30% opacity reads as a
shine. Solid shapes at opacity, never a `linearGradient`/`radialGradient`. Use
1–2 of each on a hero piece.

**Layer 3 — the ink linework: a FAN of individual tapered filled shapes, one
per strand/lock — never a constant-width stroke.** This is the secret to the
"premium" line. Reddit's hair has ~10 separate strand shapes fanning across the
sweep; each is a closed filled `<path>` that is THICK at the root and tapers to
a fine point at the tip (like a brush stroke, not a one-nib pen). Reddit's real
eyelid ink shape is the same: a ~40-point closed path, thick at the crease,
tapering at the corner. Draw ink shapes this way:
   - Thick (1.5–2.5 units) at roots, creases, the base of a lock, the crown of a hat.
   - Tapering to a near-zero point at lock tips, brim corners, strap/strand ends.
   - Multiple SEPARATE strand shapes for hair texture — not one outline with
     internal strokes. Plus 1–3 interior detail shapes (part line, brim seam)
     in the same filled-taper technique.

**Optional crosshatch texture** (one or two hero pieces only): a sparse scatter
of thin short curved lines at 25–35% opacity for material (knit, felt). A dozen
strokes, not a dense fill.

**What this replaces:** no `<linearGradient>`, no `<radialGradient>` — ever.
Volume comes from layered flat blobs + flat shadow/highlight shapes + a fan of
tapered ink strands. A uniform-stroke outline around a single silhouette reads
cheap; this layered construction reads premium. Confirmed against Reddit's
shipped code.

**Color convention:** exactly one shape per part carries the user's chosen
color (use `{HAIR}` / a named accent). The ink is always `{INK}` (`#241F26`)
and never recolors — same rule as Reddit's `--color-hat` (fill only, never the
line).

---

## 4. THE MEASURED HEAD CONTOUR — your anchor table

The head is a squircle, wider than it looks. These are the **real edges** (the
bezier overshoots the nominal path). Fit every part to these — a hat that stops
at the nominal path leaves the skull poking out the sides.

| Landmark | Value |
|---|---|
| Head centre (x) | **24.675** |
| Crown / top of head (y) | **8** (a hat's dome should peak at y≈6–7, above this) |
| Head width at forehead (y=20) | x spans **6.24 → 43.11** |
| Head width at ear height (y=24) | x spans **6.07 → 43.27** (the widest point) |
| Head bottom (chin, y) | ≈ 45 |
| Left eye | (16, 22) · Right eye | (32, 22) |

---

## 5. THE COVERAGE RULE (this is why the current hair fails)

Hair and hats must **cover the skull completely — no head edge or corner shows
through them.** The reliable way: start the piece from the head's own outline,
then build outward and inward from there.

- A hair mass or hat dome should be the head's crown shape, **grown slightly
  larger** (≈8–15% outward from centre 24.675, 28), so its edge sits just
  *outside* the head silhouette at every point — then styled (locks, a brim, a
  fold) on top of that base.
- Any brim, band, or hat edge must span **wider than the head's widest point**
  (past x=6.07 on the left, past x=43.27 on the right) at the height it crosses,
  or it will read as a sticker floating on the face instead of a hat on a head.
- **Never draw over the eyes** (the region around y=17–27, x=11–37). Hair stops
  at a hairline around y=12–16; glasses are the only thing that goes on the eyes.

---

## 6. WHAT TO DRAW

Draw each as a **separate, self-contained SVG snippet** (see §8 for format),
using the two-layer (flat fill + tapered ink shape) technique from §3.
Colors that vary per user use the placeholder tokens `{SKIN}`, `{HAIR}`,
`{BG}` — put those literal strings where that color goes. Fixed accent colors
(a red hat, a brass compass) you choose and hard-code. The ink is always
`{INK}` (`#241F26`).

**The `id` in bold before each piece is REQUIRED as its block label (§8) — copy
it verbatim, it's how the pieces are wired in.**

### Hair — 4 styles, must read as hair
Build each with the §3 layered method: 2–4 overlapping `{HAIR}` blobs + flat
shadow/highlight shapes + a fan of tapered ink strands. Give each a distinct,
composed silhouette (a real part/cowlick, not a symmetric formula):
1. **`hair.crop`** — short, neat, close to the head; a clean low-volume cut.
2. **`hair.swoop`** — a side-swept fringe with movement, parted, sweeping across the forehead. *(Reddit's own swept style is the reference: an asymmetric side-part with a strand fan and a small cowlick tuft.)*
3. **`hair.curls`** — textured, rounded curl clusters across the top.
4. **`hair.waves`** — soft waves at the sides. NOTE our canvas is a tight 48×48
   head-in-a-circle (not Reddit's 380×600 half-body), so hair CANNOT flow past
   the shoulders — keep it a compact medium length that hugs the head's side
   edges near the ears (y≈24–34), never long/floor-length.

### Headgear — 6 pieces
Free wardrobe:
1. **`headgear.beanie`** — snug knit cap, folded band, small pom.
2. **`headgear.cap`** — a ball cap: rounded crown + a forward brim.
3. **`headgear.headphones`** — over-ear headphones: a band arching over the crown, a padded cup on each ear at the head's side edges. *(This one already exists and fits well; match its fit: band peaks at (24.675, 7), cups centred at x≈8 and x≈41 at ear height.)*

Earned "journey" gear (this is the story — make them charming and distinct):
4. **`headgear.tourist`** (earned first) — a soft bucket/sun hat, the look of an eager beginner traveller.
5. **`headgear.explorer`** (earned next) — a wide-brim adventurer's hat (safari / pathfinder feel), a step up in confidence from the tourist hat.
6. **`headgear.cowboy`** (final) — a cowboy hat: creased tall crown, brim with upswept side curls, dark band, and a **gold four-point star** on the crown — the North Star badge for a guide who's reached the summit.

### Eyewear — 3 pieces (lenses centred exactly on the eyes at (16,22) and (32,22))
1. **`eyewear.round`** — thin metal-rim round lenses + bridge + temple arms.
2. **`eyewear.square`** — soft-square rims.
3. **`eyewear.aviator`** (earned) — classic teardrop tinted lenses, thin metal frame, a subtle glare highlight.

### Hand-props — 6 pieces (these MAY extend past the disc, into an 8-unit bleed)
Props sit *beside* the avatar (roughly bottom-left or bottom-right of the 48
space, and may run to x=-8 or x=56 / y=56), never painted on the face. Each must
read instantly as the object:
1. **`prop.mic`** — a handheld microphone (capsule head + handle).
2. **`prop.book`** — a small closed book, spine visible.
3. **`prop.camera`** (earned, tourist's kit) — a compact camera with a lens, held at the lower-left.
4. **`prop.compass`** (earned, pathfinder's kit) — a round brass compass with a needle.
5. **`prop.lantern`** (earned, catalyst's kit) — a small carried lantern with a warm glow (a solid gold shape behind it at low opacity is fine — it's the one "aura" in the system; NO gradient).
6. **`prop.flag`** (earned, north-star's kit) — a slim pole with a small white pennant carrying a **gold star**, planted at the right side rising above the head.

---

## 7. STYLE BAR

- **Flat color + confident ink, Reddit-Snoo language.** No gradients, no soft
  light/shadow blends, no airbrush. The §3 tapered-ink technique IS the
  rendering — there is no other shading pass beneath it (except the optional
  sparse crosshatch on one or two hero pieces).
- **Bespoke per piece.** Do not reuse one silhouette formula across the 4 hair
  styles or the 3 hat styles with only the ink details changed — each should
  read as its own considered drawing, the way Reddit's own hairstyle catalog
  does (dozens of individually illustrated options, not one parameterized one).
- **Legible at 48 pixels.** These render as small as a 44px avatar on a home
  screen. No fine detail that turns to mush — bold, clear silhouettes carried
  by the ink shape, not by fill color contrast alone.
- **Cohesive set.** All 19 pieces should look like one designer made them —
  same ink weight range, same taper logic, same {INK} color. Warm, friendly,
  a little playful. Nothing sharp, edgy, or corporate.
- **Inclusive + neutral.** No piece should imply a specific gender, culture, or
  body — they're worn by everyone.

---

## 8. OUTPUT FORMAT

For **each** piece, output one clearly-labelled block:

```
### hair.swoop
<g>
  ... paths for this piece only, in the 0 0 48 48 space ...
</g>
```

Rules:
- **One `<g>` per piece**, containing only that piece's paths (the flat fill
  shape + the tapered ink shape from §3, plus optional sparse crosshatch). No
  `<svg>` wrapper, no `<defs>`, no gradients.
- **48×48 coordinate space** (`viewBox 0 0 48 48`); props may use coordinates
  from -8 to 56 to sit in the bleed.
- **Parametric colors**: use the literal strings `{SKIN}`, `{HAIR}`, `{BG}` where
  a user-chosen color belongs, and `{INK}` for every line/detail shape;
  hard-code fixed accent colors (a red hat's band, a brass compass) as hex.
- **No references to the fixed face** in your output — do not include the head,
  eyes, smile, or container. Only the new piece.
- Keep path data reasonably clean (2–3 decimal places).
- Label each block with its exact id from §6 (e.g. `headgear.tourist`,
  `prop.compass`, `eyewear.aviator`).

Deliver all 19 pieces: 4 hair, 6 headgear, 3 eyewear, 6 props.
