# Mirror Work — clinical review sheet

**Status: awaiting review. The numbers below are live in production.**
Weight table version `1.0.0` · this document last revised 2026-08-13.

---

## For the reviewer

You do not need to read any code. This is a one-page summary of ten numbers,
what they do, and four questions we would like answered.

### What the feature does

The user props their phone up and speaks to themselves in the camera for a few
minutes. On-device face tracking watches for ten facial behaviours associated
with physical concomitants of stuttering. Nothing is recorded or uploaded — no
video, no images, no audio leave the device. Only the derived counts do.

Afterwards the app shows a short, plain-language reflection: *"Your jaw may have
tensed a few times."* It is explicitly framed as noticing, not assessment. The
line **"None of this is a diagnosis. It's a mirror with a memory"** appears both
before and after every session.

### What these numbers decide

Each of the ten behaviours carries two weights:

- **`w_detection`** — how reliably a phone camera can actually see it. This is an
  engineering number, derived from published per-blendshape F1 scores. **It is
  not what we are asking you to review.**
- **`w_clinical`** — how much the behaviour matters clinically. **This is the
  column we need you to confirm.**

Their product decides three things:

1. **The session score** (0–100). The user **never sees this number** — it feeds
   the wording and a longitudinal trend stored on the backend.
2. **How firmly each observation is worded** — "we noticed" vs "may have" vs
   "informational only".
3. **Whether a "multiple cues" moment is recorded** — when two or more
   sufficiently-weighted behaviours overlap in time.

---

## The table

| # | Behaviour | What the camera measures | SSI-4 category | `w_det` | **`w_clin`** | Combined | Tier |
|---|---|---|---|---|---|---|---|
| 1 | Jaw tensing | AU24 + AU17 (lip press + closed jaw) | Facial grimace | 0.75 | **1.00** | 0.75 | A |
| 2 | Lip pressing / pursing | AU18 (+AU22) | Facial grimace | 0.85 | **1.00** | 0.85 | A |
| 3 | Mouth held open (tonic block) | AU26/27 held frozen | Facial grimace | 1.00 | **0.95** | 0.95 | A |
| 4 | Hard / prolonged blinking | AU45 | Facial grimace | 1.00 | **0.85** | 0.85 | A |
| 5 | General grimacing | AU20 + AU27 | Facial grimace | 0.72 | **0.80** | 0.58 | B |
| 6 | Brow tension | AU4 (corrugator) | Facial grimace | 0.82 | **0.75** | 0.62 | B |
| 7 | Cheek puffing | cheekPuff | Facial grimace | 0.70 | **0.70** | 0.49 | B |
| 8 | Looking away | head yaw + eye direction | Head movement | 0.70 | **0.65** | 0.46 | C |
| 9 | Head jerking | head-pose angular velocity | Head movement | 0.60 | **0.60** | 0.36 | C |
| 10 | Nostril flare | AU9 | Facial grimace | 0.65 | **0.50** | 0.33 | B |

**Tier** governs wording firmness and whether a behaviour counts toward a
"multiple cues" moment. A and B count; C does not.

Nothing is ever zeroed — the weakest signal still contributes about a third as
much as the strongest, rather than being discarded.

---

## What we need you to confirm

### Q1 — Are the `w_clinical` values right?

Specifically the ones we are least sure of:

- **Jaw tensing and lip pressing are both set to the maximum (1.00).** Should
  they really be equal, or does one outrank the other?
- **Nostril flare at 0.50.** SSI-4 does not list it among its examples. We
  included it because the camera can detect it. Should it be lower, or dropped?
- **Looking away at 0.65.** Gaze aversion is arguably more about the social and
  emotional side of stuttering than physical struggle. Is 0.65 too high, too
  low, or the wrong kind of measure to include here at all?

### Q2 — Is SSI-4 the right anchor, used correctly?

We should be transparent about a limitation. SSI-4's physical concomitants scale
rates *observed severity and distractingness* on a 0–5 scale across four
categories. **It does not publish per-behaviour importance weights.** The
`w_clinical` column is therefore our interpretation layered on top of SSI-4's
category structure, not a lookup from the instrument.

The mapping of behaviours to SSI-4 categories (columns above) we are confident
about. The numbers are ours. Is that a defensible basis, or should the weighting
be anchored differently?

### Q3 — Should nostril flare count toward a "multiple cues" moment?

This is a genuine internal inconsistency and we would rather you settle it than
we guess.

The code documents a **numeric** rule — Tier A at 0.70 and above, Tier B from
0.40 to 0.69. By that rule nostril flare (0.33) falls below Tier B and should
not count.

The code implements an **anatomical** rule — facial behaviours are A or B, head
movements are C. By that rule nostril flare is facial, so it counts.

Nostril flare is the only behaviour where the two rules disagree. The practical
consequence: today, nostril flare plus one other mid-weight behaviour is enough
for the app to record a "multiple cues" moment, while looking away — which
scores higher (0.46) — can never contribute to one.

### Q4 — Is the composite threshold right?

Two or more overlapping A/B behaviours record a "multiple cues" moment. Is two
the right number, or should it be three?

---

## What happens after you answer

Changing any weight is cheap and safe. Every session stores its **raw
per-behaviour measurements** alongside the **weight table version** used. The
score is computed as a derived view, never baked into stored data. So revised
weights can be applied retrospectively to existing sessions with no data
migration and nothing lost.

We would bump the table to `1.1.0` and note your review here.

---

## Safeguards already in place

- No video, image or audio leaves the device.
- The user is never shown a numeric score.
- All user-facing wording follows an NSA-compliant voice: no severity numbers,
  no diagnosis, no clinical labels. Region observations are deliberately hedged
  ("may have", "seemed to", "possibly").
- "None of this is a diagnosis" appears before and after every session.
- The heaviest overall reading is a warm amber, never red, and the accompanying
  face stays neutral rather than sad — the app must never appear to grade
  someone on their own face.

---

## Reviewer

| | |
|---|---|
| Name | |
| Credentials | |
| Date | |
| Q1 — `w_clinical` values | ☐ confirmed as-is ☐ revised (below) |
| Q2 — SSI-4 basis | ☐ defensible ☐ needs a different anchor |
| Q3 — nostril flare | ☐ counts (Tier B) ☐ does not count (Tier C) |
| Q4 — composite threshold | ☐ two ☐ three ☐ other |

**Revisions:**
