# Program covers

The source of the ten program covers the app ships in `app/assets/program-covers/`
(900 x 1200, 3:4). Only the app uses covers; the website does not.

## Build

```
node design/program-covers/build.cjs                 # all ten, into app/assets/program-covers
node design/program-covers/build.cjs word_swap       # one
node design/program-covers/build.cjs --out /tmp/c    # somewhere else, to compare
```

Needs Google Chrome (`CHROME=` for another binary); nothing to install. A
rebuild gives the shipped covers back pixel for pixel. `build.cjs` lists the
scene variant each program ships.

## Layout

- `scenes/<program>.cjs` – one scene per program; returns the cover's SVG. Some
  take a variant (`'blob'` puts the figure on its kit blob; the shipped picks are
  in `build.cjs`).
- `lib/fig.cjs` – places a kit figure, on its blob or with the body running on
  below the box so a scene edge can end it.
- `lib/draw.cjs`, `lib/tools.cjs` – drawing helpers and the toolbox's tools.
- `lib/render.cjs` – SVG to PNG in headless Chrome.
- `inputs/` – the exact character files the approved covers were built from (below).
- `tools/` – make or refresh inputs from sw-characters.
- `references/` – the founder's reference pictures for the scenes.

## Inputs: the characters come from sw-characters

The characters are sw-characters' kit. The covers keep a copy of the exact files
they were approved with, so a rebuild never changes a cover by itself. Refresh one
on purpose, then rebuild and review.

| Input | What | Made by (sw-characters) |
|---|---|---|
| `inputs/avatars/*.svg` | banker, phone-call, headphones, coils, hijab, turban | `web/scripts/run_site_stills.mjs` (the site stills) |
| `inputs/blobs.json` | each figure's kit blob | `web/scripts/patch_blobs5.py` |
| `inputs/faces/braids-laugh.svg`, `flower-warm-look.svg`, `cap-warm-look.svg` | a kit face and gaze on a figure | `tools/rig-still.cjs` from `web/out/face-rig/<name>.json` (`web/scripts/export_face_rig.mjs`) |
| `inputs/faces/braids-laugh-wave2.svg` | braids laughing, both hands waving | `tools/hands-still.cjs` (+ `tools/hand-frame.mjs`) from `inputs/hands/braids.json` |
| `inputs/hands/braids.json` | braids' hand rig | the hands-rig page of `web/scripts/export_hands.mjs` (name=braids) |
| `tools/hands-core.generated.ts` | the kit's hand maths | `web/scripts/export_hands.mjs` |
| `inputs/faces/beanie-scared.svg` | beanie with the site's custom "scared" face | captured from the site's panic scene (sw-landing TigerAvatar.tsx) |
| `inputs/scenes/cage-*.svg` | the site's cage scene, captured as stills | sw-landing CageAvatar.tsx |

## Rules every cover keeps

- Every avatar shows its full collar, and never the bottom edge of its body: the
  body ends on its kit blob, or runs on behind a scene edge (screen, porthole,
  sign ring, photo frame, toolbox rim, ruff, wall, bubble heap) just under the
  collar. Nothing sits over a collar.
- The Home "For you" card crops each cover to its middle strip: y 422–778 of
  1200 on the widest phone (430 pt). Each figure, collar included, stays in it.
- Kit outline ink `#242329`; no text on the art except the iceberg's labels.

## History

Round 3 (October 2026) drew the covers with the old pre-kit cast. Round 4
(2026-11-27) redrew all ten with the kit cast and the founder approved each one
on before/after review pages (kept outside the repo, in
`speechworks-2/_archive/program-covers-review-2026-11-27/`).

`tools/app-scene-thought-traps.py` belongs to a shelved idea: the Thought Traps
scene playing as the loader when a program opens (local branch
`feat/thought-traps-scene`).
