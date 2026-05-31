# Mirror Work — Detection Rebuild Spec (v2.1)

> Status: **DRAFT FOR REVIEW** — no code changed yet.
> Goal: production-grade facial-tension detection, accurate enough to show users, on **both iOS and Android**.
> Foundation: MediaPipe Face Landmarker (kept) + a FACS-grounded analyzer (rebuilt).

---

## 0. Why the current build fails

| # | Severity | Problem | Evidence |
|---|----------|---------|----------|
| 1 | 🔴 Blocker | **iOS runs no detection at all.** No `FrameProcessorPlugin` is registered on iOS, so `faceLandmarkerPlugin` is `null`; the worklet `return`s every frame. Calibration still "completes" on a wall-clock timer, so it *looks* like it works. | `ios/ExpoFaceLandmarkerModule.swift` has only `detectFaces`/`detectFacesSync`; no frame-processor registration anywhere under `ios/`. `useFaceDetectionV2.ts:166`. |
| 2 | 🔴 | **Invalid signal→muscle mapping.** "Jaw tension" detected as `jawOpen < baseline` — but a clench and a relaxed closed mouth both give `jawOpen ≈ 0`. No signal room. | `mirrorBehaviorAnalyzerV2.ts:206-209` |
| 3 | 🔴 | **Thresholds collapse to the noise floor.** `margin = max(stddev·n, mean·0.05)`; at rest `mean ≈ 0`, so the floor is ~0 → noise trips signals. | `mirrorBehaviorAnalyzerV2.ts:106-109` |
| 4 | 🔴 | **Too sluggish → false negatives.** 5 fps × 12–18 frame hold = 2.5–3.6 s of sustained tension required, plus EMA α=0.3 ramp (~1 s). Most secondary behaviors are < 1 s. | `useFaceDetectionV2.ts:164`, `mirrorBehaviorAnalyzerV2.ts:188-256` |
| 5 | 🟡 | **Gaze/head signals unreliable.** Gaze via hardcoded `eyeLook > 0.4` (normal gaze trips it); head jerk via raw `landmark[1]` translation (leaning in == jerk). | `mirrorBehaviorAnalyzerV2.ts:239-289` |
| 6 | 🟡 | **Silence gate backwards.** Jaw/lip fire only when *silent*, so tension during audible speech is ignored and thinking pauses false-trip. | `mirrorBehaviorAnalyzerV2.ts:182,209,224` |
| 7 | 🟡 | **Mesh flipped & distorted.** Overlay maps `x·viewW` with no front-camera mirror and no cover-crop transform. | `FacialOutlines.tsx:65-67` |
| 8 | 🟡 | **Weakest signals drive clinical data.** `overallEaseScore` = avg(jawEase, lipEase, gazeMaintained) → JAW + GAZE (least detectable) feed the backend `IMPAIRMENT_STRUGGLE` trend. | `useMirrorSession.ts:147-156` |
| 9 | 🟡 | **Rules-of-hooks violation.** `handleReadyToCalibrate` `useCallback` declared after early `return`s → crashes when permission/device state flips. | `SessionScreen.tsx:140,148,160` |

---

## 1. FACS foundation

MediaPipe outputs 52 ARKit-style blendshapes that **loosely** map to FACS Action Units. Detection must be built on the AUs that (a) blendshapes can actually express and (b) the stuttering literature flags as secondary behaviors (SSI-4 physical concomitants; lip + cheek muscles most predictive).

### 1.1 Blendshape → FACS AU mapping (the basis for every signal)

| Blendshape(s) | FACS AU | Muscle / movement | Reliable? |
|---|---|---|---|
| `jawOpen` | AU26 jaw drop / AU27 mouth stretch | masseter relax / forced open | ✅ high |
| `mouthStretchL/R` | **AU20 lip stretcher** | risorius (horizontal pull) | ✅ high — the strain disambiguator |
| `mouthPressL/R` | **AU24 lip pressor** | orbicularis oris (clamp) | ✅ high |
| `mouthClose` | AU8 / co-sign of AU17 chin raise | lips toward each other | ✅ |
| `mouthPucker` | **AU18 lip pucker** | incisivii | ✅ high |
| `mouthFunnel` | AU22 lip funneler | orbicularis oris | ✅ |
| `browDownL/R` | **AU4 brow lowerer** | corrugator/depressor (furrow) | ✅ high |
| `browInnerUp` | AU1 inner brow raiser | frontalis medialis | ✅ |
| `eyeBlinkL/R` | AU45 blink / AU43 closed | orbicularis oculi | ✅ high |
| `eyeSquintL/R` | AU7 lid tightener | orbicularis oculi | ✅ |
| `cheekPuff` | AD34 puff | buccinator (air) | ✅ (rare) |
| `cheekSquintL/R` | AU6 cheek raiser | orbicularis oculi | ✅ |
| `noseSneerL/R` | AU9 nose wrinkler | levator labii alaeque nasi | ⚠️ moderate |
| `mouthSmileL/R` | AU12 lip corner puller | zygomatic major | ✅ (for asymmetry) |
| — (no blendshape) | **AU31 jaw clencher** | masseter contraction | ❌ not observable → proxy via AU24+AU17 |

### 1.2 The jaw / open-mouth disambiguation (resolves the open review question)

Three distinct patterns the old code conflated:

| Pattern | FACS | Blendshape test | Signal |
|---|---|---|---|
| **Strained wide-open** (block/grimace) | AU27 + AU20 | `jawOpen` high **AND** `mouthStretch` high, held | `FACIAL_GRIMACING` (strained-open) |
| **Relaxed open** (talking/yawning) | AU26 | `jawOpen` high **AND** `mouthStretch` low | **not a signal** |
| **Open-mouth freeze** (tonic hold) | AU26/27 | `jawOpen` high + **low variance** (frozen) ≥ ~700 ms | `OPEN_MOUTH_HOLD` |
| **Jaw/lip clench** | AU31 → AU24(+AU17) | `mouthPress` high (+`mouthClose`), `jawOpen` low | `JAW_TENSION` (redefined) |

The decisive new test the old analyzer lacked: **`mouthStretch` co-activation separates a struggle-open from a relaxed-open.**

---

## 2. Signal catalogue (v2)

Enum values are **unchanged** (`MirrorBehaviorSignal` in `types.ts`) → no backend break. Only the detection basis changes. Each signal: FACS AU, blendshape expression, fire rule. Thresholds are **starting points to be tuned on-device** (see §6).

> Notation: `T(sig) = max(FLOOR[sig], baseline.mean + K·baseline.stddev)`, `K = 3`. Hysteresis: enter at `T`, stay active until value `< 0.8·T`. Hold time in **ms** (frame-rate independent), evaluated at ~12 fps.

### Tier A — high reliability (drive the clinical score)

1. **LIP_PURSING** — AU18 (+AU22)
   `mouthPucker > T(0.40)` (optionally OR `mouthFunnel > T(0.40)`), held ≥ 400 ms, and *not* rapidly changing (stillness guard distinguishes a held purse from the transient /u//o/ of speech).

2. **JAW_TENSION** (redefined = lip/jaw clamp, AU24 + AU17) — masseter clench proxy
   `mouthPress > T(0.35)` AND `mouthClose > T(0.30)` AND `jawOpen < 0.15`, held ≥ 400 ms.

3. **BROW_TENSION** — AU4
   `browDown > T(0.40)`, held ≥ 400 ms.

4. **OPEN_MOUTH_HOLD** — AU26/27 frozen
   `jawOpen > T(0.40)` AND `variance(jawOpen, last ~700 ms) < ε` AND `mouthStretch` low, held ≥ 700 ms.

5. **EYE_BLINKING_STRUGGLE** — AU45/43
   Prolonged: `eyeBlink > T(0.50)` held ≥ 600 ms. OR cluster: blink rate ≥ 2× calibrated baseline rate over a 5 s window.

### Tier B — moderate (surfaced with softer language, not in clinical score)

6. **FACIAL_GRIMACING** (strained-open / lip stretch) — AU20 (+AU27)
   `mouthStretch > T(0.40)` (bilateral) OR L/R smile asymmetry `> 0.30`, held ≥ 400 ms.

7. **CHEEK_PUFFING** — AD34
   `cheekPuff > T(0.40)`, held ≥ 400 ms.

8. **NOSTRIL_FLARE** — AU9
   `noseSneer > T(0.45)`, held ≥ 400 ms. (Marked moderate; sneer ≈ flare.)

### Tier C — head pose (built properly, see §3)

9. **GAZE_AVERSION** — sustained eye/head yaw
   From facial transformation matrix: head **yaw** > 20° sustained ≥ 2.5 s, OR iris-landmark horizontal offset beyond a calibrated band. (Replaces hardcoded `eyeLook > 0.4`.)

10. **HEAD_JERKING** — angular velocity
    From transformation matrix: yaw/pitch angular velocity spike beyond a threshold, debounced ≥ 1 s. (Replaces raw `landmark[1]` translation, which conflated leaning in with jerking.)

### Composite

11. **FACIAL_TENSION_COMPOSITE** — ≥ 2 Tier-A/B signals simultaneously active (unchanged logic).

---

## 3. Native changes

### 3.1 iOS frame processor (NEW — the blocker)
- Add `s.dependency 'VisionCamera'` to `ExpoFaceLandmarker.podspec` (currently absent).
- New Swift `FrameProcessorPlugin` subclass `ExpoFaceLandmarkerFrameProcessorPlugin` + Obj-C++ registration:
  `VISION_EXPORT_SWIFT_FRAME_PROCESSOR(detectFacesFromFrame, ExpoFaceLandmarkerFrameProcessorPlugin)`.
- `callback(frame:)`: `CMSampleBuffer` → `CVPixelBuffer` → `MPImage(sampleBuffer:orientation:)` with the correct front-camera orientation; run the **shared** landmarker; return the same map shape as Android **plus** `imageWidth`/`imageHeight`.
- Reuse a single `FaceLandmarker` instance (don't re-create per frame).

### 3.2 Both platforms — landmarker options
- `outputFaceBlendshapes = true` (already on).
- **`outputFacialTransformationMatrixes = true`** (currently off on iOS, absent on Android) → enables Tier-C head pose. Extract yaw/pitch/roll from the 4×4 matrix.
- **`runningMode = VIDEO`** (currently `IMAGE`) with monotonically increasing timestamps → internal temporal coherence, less jitter at the source (lets us lighten our own EMA).
- Return `{ blendshapes, landmarks, imageWidth, imageHeight, headPose?: {yaw,pitch,roll} }`.

### 3.3 Android (`ExpoFaceLandmarkerPlugin.kt`)
- Add `imageWidth`/`imageHeight` (post-rotation) and `headPose` to the returned map.
- Verify front-camera handling: rotation is applied; confirm whether a mirror is needed so landmark coords match what the user sees (coordinate space documented for the overlay in §4).
- Keep the downsample-by-2; fine for landmarks.

### 3.4 Anti-silent-failure (both)
- If `faceLandmarkerPlugin` is `null`, `useFaceDetectionV2` exposes a hard `detectionUnavailable` flag; `SessionScreen` shows an explicit error state instead of a fake-working calibration ring.
- Dev HUD (see §6) shows live fps + frames-analyzed so a dead pipeline is never invisible again.

---

## 4. Frame-processor hook & analyzer changes

### 4.1 `useFaceDetectionV2.ts`
- `runAtTargetFps(5 → 12)`.
- Pass `headPose` and `imageWidth/Height` through to the analyzer and overlay.
- Keep the wall-clock calibration timer **but** require a minimum number of *real* collected frames AND adequate face coverage before accepting the baseline. **If insufficient (resolves Q3): do not build a degraded/zero baseline — prompt "Let's calibrate again" with a retry button and a warning haptic.** Never proceed on a bad baseline.

### 4.2 `mirrorBehaviorAnalyzerV2.ts` (rewrite)
- New threshold model with **absolute FLOORs** per signal + per-user `mean + K·stddev` + **hysteresis** (§2).
- Hold timers in **milliseconds** using frame timestamps, not frame counts.
- Light EMA (α ≈ 0.4) or rely on VIDEO-mode smoothing.
- Add **stillness/variance guards** to distinguish held tension from transient speech articulation (replaces the silence gate).
- Calibration computes, per blendshape: mean, stddev, **and** baseline blink rate (for the cluster test). Reject calibration if the face was absent for too much of the window.

### 4.3 Speech gate
- Remove the hard "only when silent" gate on jaw/lip.
- Use speech state only as *soft context* (e.g. require an extra ~100 ms hold during active speech to avoid phoneme false-positives), driven by duration + stillness rather than silence.

---

## 5. UI / scoring changes

### 5.1 `FacialOutlines.tsx`
- **Mirror** front-camera x: `xView = (1 - lm.x) · scale + offsetX` for the front camera.
- **Cover-crop transform**: compute `scale = max(viewW/imgW, viewH/imgH)` and center offsets so the mesh tracks the cropped preview (currently raw `x·W`, `y·H` distorts when aspects differ).
- Update region highlight map for the new signal semantics (strained-open → lips+jaw, etc.).

### 5.2 `useMirrorSession.ts` — confidence-weighted composite score (resolves Q1)

**Decision:** the overall score is a **bounded reliability-weighted composite**, not Tier-A-only and not a flat average. Grounded in psychometric composite theory (over-weighting the most reliable component *raises reliability but lowers validity*), SSI-4 (impact-weighted, additive, no category zeroed), and per-AU detection-reliability findings.

Per signal, three factors — none ever zero:
```
contribution(s) = w_detection(s) · w_clinical(s) · timeInSignal(s) · meanConfidence(s)
overallStruggle = Σ contribution(s) / Σ ( w_detection(s) · w_clinical(s) · exposure(s) )
overallEaseScore = round( 100 − overallStruggle )   // clamped 0..100
```

#### `w_detection` — per-signal detection reliability (research-derived)

Each weight is derived from published per-blendshape F1 scores, activation-range analysis, and cross-domain AU benchmarks — **not heuristic**.

| Signal | Primary blendshape(s) | Published evidence | **w_detection** | Source |
|---|---|---|---|---|
| EYE_BLINKING_STRUGGLE | eyeBlinkL/R | F1 = **1.00** ("same subjective impression as ARKit") | **1.00** | Yan et al. 2026 |
| OPEN_MOUTH_HOLD | jawOpen | F1 = **1.00**, wide activation range, mean ~0.5 | **1.00** | Yan et al. 2026 + Attrah distribution analysis |
| LIP_PURSING | mouthPucker (+funnel) | Same activation class as mouthSmile (F1 = 0.88–0.94); wide range, mean ~0.5 | **0.85** | Yan et al. 2026, conservative lower bound of class |
| BROW_TENSION | browDownL/R | F1 = **0.77–0.87** | **0.82** | Yan et al. 2026 (midpoint of range) |
| JAW_TENSION (redefined) | mouthPressL/R + mouthClose | mouthPress "highly correlated with mouthShrug" = cross-talk risk | **0.75** | Attrah correlation analysis, downrated for documented cross-talk |
| FACIAL_GRIMACING | mouthStretchL/R + smile asymmetry | mouthStretch: "not statistically significant" in oromotor study; smile: F1 = 0.88–0.94 | **0.72** | Geometric mean of weak (0.65) + strong (0.91) component |
| CHEEK_PUFFING | cheekPuff | Wide activation range BUT "not statistically significant differences" in oromotor performance study | **0.70** | PMC12899966 range data + oromotor non-significance |
| GAZE_AVERSION | headPose.yaw + eyeLook* | eyeLook variants: F1 = **0.66–0.76**; head-pose fusion adds robustness | **0.70** | Yan et al. 2026 (eyeLook midpoint) + head-pose bonus |
| NOSTRIL_FLARE | noseSneerL/R | Narrow activation range (mean <0.25 class), not individually benchmarked | **0.65** | Attrah distribution (narrow-range = higher noise-to-signal) |
| HEAD_JERKING | headPose angular velocity | Derivative of pose = inherently amplifies noise; no direct benchmark | **0.60** | Signal-processing principle (derivatives amplify noise) |

Additional findings baked in:
- Left-side blendshapes less accurate than right → we average L/R (documented mitigation)
- Upper dynamic range (>0.8) shows "pronounced jitter" → hysteresis exit at 0.8×threshold addresses this
- "Significant landmark jitter under edge conditions" → FaceFrameGuard + calibration retry handles partial occlusion

#### `w_clinical` — per-signal clinical importance (SSI-4 + stuttering literature)

SSI-4 rates physical concomitants 0–5 by severity/distraction across 4 categories. Within facial grimaces, stuttering-prediction literature (arXiv:2010.01231, PMC3314730) reports lip + cheek muscles as most predictive.

| Signal | SSI-4 category | Literature evidence | **w_clinical** | Source |
|---|---|---|---|---|
| JAW_TENSION | Facial grimace — jaw tensing | Core SSI-4, "jaw jerking/tensing" explicitly listed | **1.00** | SSI-4 manual |
| LIP_PURSING | Facial grimace — lip pressing | Core SSI-4, "lip pressing" explicitly listed, highest predictive power in ML study | **1.00** | SSI-4 + arXiv:2010.01231 |
| OPEN_MOUTH_HOLD | Facial grimace — tonic block | Core SSI-4, high diagnostic value for blocks | **0.95** | SSI-4 + Van Riper identification |
| EYE_BLINKING_STRUGGLE | Facial grimace — eye squeeze | SSI-4 facial, commonly reported secondary behavior | **0.85** | SSI-4 + AIS secondary behaviors |
| FACIAL_GRIMACING | Facial grimace — general | SSI-4 facial, broad indicator | **0.80** | SSI-4 |
| BROW_TENSION | Facial grimace — corrugator | SSI-4 facial, moderate; not top-cited in stuttering literature | **0.75** | SSI-4 |
| CHEEK_PUFFING | Facial grimace — cheek | "Significantly high prevalence of cheek muscles" in stuttering prediction | **0.70** | arXiv:2010.01231 |
| GAZE_AVERSION | Head movement — poor eye contact | SSI-4 head movement category (separate from facial) | **0.65** | SSI-4 |
| HEAD_JERKING | Head movement — jerk | SSI-4 head movement category | **0.60** | SSI-4 |
| NOSTRIL_FLARE | Facial grimace — nose | Incidental, not specifically cited in SSI-4 examples | **0.50** | SSI-4 (by omission) |

#### Combined effective weight `w_detection × w_clinical`

| Signal | w_det | w_clin | **Combined** | Note |
|---|---|---|---|---|
| OPEN_MOUTH_HOLD | 1.00 | 0.95 | **0.95** | Highest combined — both detection and clinical are strong |
| LIP_PURSING | 0.85 | 1.00 | **0.85** | |
| EYE_BLINKING_STRUGGLE | 1.00 | 0.85 | **0.85** | |
| JAW_TENSION | 0.75 | 1.00 | **0.75** | Detection downrated for cross-talk; clinical importance keeps it high |
| BROW_TENSION | 0.82 | 0.75 | **0.62** | |
| FACIAL_GRIMACING | 0.72 | 0.80 | **0.58** | |
| CHEEK_PUFFING | 0.70 | 0.70 | **0.49** | |
| GAZE_AVERSION | 0.70 | 0.65 | **0.46** | |
| HEAD_JERKING | 0.60 | 0.60 | **0.36** | |
| NOSTRIL_FLARE | 0.65 | 0.50 | **0.33** | Lowest — but still contributes (not zeroed) |

The ~3× natural spread (0.95 → 0.33) gives high-reliability + high-clinical signals ~3× the influence of low-reliability + low-clinical signals, without zeroing anything. **Tier labels are now emergent from the data, not preset.**

#### `meanConfidence ∈ [0,1]` — per-detection instance uncertainty weighting

```
meanConfidence = clamp01( (value - threshold) / (threshold × 0.5) ) × clamp01( holdMs / requiredHoldMs )
```

A barely-above-threshold, briefly-held detection contributes less than a strongly-above-threshold, sustained one. This implements the "uncertainty weighting" principle from composite psychometrics — "giving extra weight to the more reliable of the observed scores tends to improve the reliability of the composite" (Applied Measurement in Education 17(3)).

**Data contract (important):** store the **raw per-signal components + per-signal mean confidence + the weight table used**, and compute the composite as a *derived view*. Never bake an irreversible weighting into stored data → clinical team can re-tune weights with no data migration. Keep `jawEase`/`lipEase`/`gazeMaintained` fields for payload compatibility; `overallEaseScore` becomes the weighted composite above.

⚠️ **Backend coordination:** payload shape unchanged; add optional `signalConfidence` + `weightTableVersion` fields. The `IMPAIRMENT_STRUGGLE` trend now reflects a validity-preserving composite. Confirm weight tables with the clinical owner before shipping.

### 5.3 `SessionScreen.tsx`
- Move `handleReadyToCalibrate` `useCallback` above the early returns (fix hooks violation).
- Add the `detectionUnavailable` error state.
- **Haptics (resolves Q3):** add `expo-haptics` — light impact on calibration **start**, success notification on **complete**, warning notification when prompting **recalibration**.

### 5.4 Confidence color system + pre-calibration education (resolves Q2)
Two-level visual confidence so users aren't alarmed by lower-surety flags:
- **High-confidence (Tier A)** — solid amber glow `rgba(255,122,51,…)` + firm nudge wording ("Your jaw tightened just then").
- **Lower-confidence (Tier B)** — dimmer/dashed outline, cooler amber-yellow + soft wording ("You may have… ").
- **Tier C (head pose)** — distinct hue (violet), informational only.
- **Pre-calibration explainer:** before the "I'm Ready" tap, a short legend screen shows the two colors and says high-confidence cues are firm, soft cues are gentle observations. Mirrors `DETECTION_MAP.svg`. Never show severity numbers (NSA compliance).

---

## 6. Verification & tuning (cannot be done from a dev machine alone)

Native changes require real device builds (`expo run:ios`, `expo run:android`) on **physical** phones — simulator cameras won't exercise this. **Phones only (resolves Q4)** — no tablets.

### 6.0 Device matrix & cross-OEM concerns (Q4)
Target: Apple + Samsung, Oppo, Vivo, Motorola Android. Implications baked into the build:
- **Adaptive frame rate:** target 12 fps; measure per-frame processing time and degrade gracefully (→ 8 fps) on low-end SoCs (common in Oppo/Vivo/Motorola MediaTek tiers) so the UI never stalls. Hold-times are in **ms**, so detection stays correct as fps varies.
- **Camera quirks:** front-camera mirroring and sensor `rotationDegrees` vary by OEM — overlay mapping (§5.1) must be validated per device, not assumed.
- **OEM "beautify"/HDR:** many Chinese-OEM front cameras apply smoothing/auto-HDR that can flatten subtle AUs. Disable post-processing where VisionCamera allows; note residual risk in tuning.
- **MediaPipe delegate:** GPU delegate availability is inconsistent across OEMs — default to **CPU delegate** for deterministic behavior, feature-detect GPU as an opt-in.
- **Tuning/acceptance baseline devices (min set):** iPhone SE/12-class + iPhone 14/15-class; one Samsung mid + one flagship; one MediaTek-based Oppo/Vivo; one Motorola. Capture calibration + each behavior on each.

1. **Dev HUD overlay** (debug builds): live table of the ~12 key blendshape values, current `T(sig)`, which signals are active, head-pose yaw/pitch, fps, frames-analyzed.
2. **Tuning protocol:** record neutral, then deliberately perform each behavior (purse, clamp, furrow, strained-open, prolonged blink, cheek puff, gaze away, head jerk) and read the HUD to set each `FLOOR` and hold time. Capture values for 2–3 faces to avoid overfitting one person.
3. **Acceptance gates (proposed):**
   - Neutral 60 s → ≤ 1 false signal.
   - Each deliberate behavior detected within ≤ 600 ms, ≥ 9/10 times.
   - Normal conversational speech (no struggle) → ≤ 2 false signals/min.
   - Mesh visually locked to the face (no flip/drift) on both platforms.

---

## 7. Build order

1. **Phase 1 — iOS frame processor** (unblocks iOS; nothing works there without it).
2. **Phase 2 — native options**: transformation matrix + VIDEO mode + `imageWidth/Height` on both platforms.
3. **Phase 3 — analyzer rewrite**: FACS signal catalogue, threshold model, ms timing, head-pose signals.
4. **Phase 4 — UI/scoring**: overlay mirror+crop, hooks fix, ease-score recompute, error state.
5. **Phase 5 — dev HUD + on-device tuning** to the acceptance gates.

---

## 8. Decisions (resolved)

- **Q1 — Scoring → RESOLVED (§5.2):** bounded **reliability-weighted composite** (Tier A=1.0, B=0.5, C=0.4) × clinical-impact weight × per-detection confidence. Store raw components + confidence + weight-table version; composite is a derived view. Final `w_clinical` table to be confirmed with the clinical owner — *this is the one remaining external sign-off*.
- **Q2 — Confidence UX → RESOLVED (§5.4):** soft language for lower-confidence signals + two-level color coding (solid amber = high / dimmed = low / violet = head pose), explained on a pre-calibration legend screen.
- **Q3 — Calibration UX → RESOLVED (§4.1, §5.3):** bad baseline → prompt "calibrate again" (no degraded baseline). Haptics on calibration start / success / recalibration prompt via `expo-haptics`.
- **Q4 — Devices → RESOLVED (§6.0):** phones only (Apple + Samsung/Oppo/Vivo/Motorola). Adaptive fps, CPU delegate default, per-OEM camera validation, defined tuning device matrix.

**Only blocker left:** clinical owner sign-off on the `w_clinical` weight table (everything else can proceed in parallel).

## 9. References
- FACS Action Units overview — [iMotions](https://imotions.com/blog/learning/research-fundamentals/facial-action-coding-system/)
- ARKit/MediaPipe blendshape → FACS AU cheat sheet — [Melinda Ozel](https://melindaozel.com/arkit-to-facs-cheat-sheet/)
- MediaPipe blendshape model card — [Google](https://storage.googleapis.com/mediapipe-assets/Model%20Card%20Blendshape%20V2.pdf)
- SSI-4 physical concomitants — [Global Speech Therapy](https://globalspeechtherapy.com/giving-the-ssi4/)
- Facial muscle attribution for stuttering prediction — [arXiv:2010.01231](https://arxiv.org/pdf/2010.01231)
- Reliability/validity of weighted composite scores (basis for §5.2) — [Applied Measurement in Education 17(3)](https://www.tandfonline.com/doi/abs/10.1207/s15324818ame1703_1)
- Cross-domain automated AU detection reliability — [Sensors 21(12):4222](https://www.mdpi.com/1424-8220/21/12/4222)
- OpenFace AU detection (per-AU coverage/accuracy) — [OpenFace AU wiki](https://github.com/TadasBaltrusaitis/OpenFace/wiki/Action-Units)
- Per-blendshape F1 vs ARKit ground truth (w_detection source) — [Yan et al. 2026, Statistical Blendshape Calculation and Analysis](https://arxiv.org/html/2601.08234v1)
- ARKit blendshape activation ranges + emotion recognition per-blendshape — [PMC12899966](https://pmc.ncbi.nlm.nih.gov/articles/PMC12899966/)
- MediaPipe blendshape distribution characterization (17/52 near-zero, class grouping) — [Attrah — MediaPipe recording & filtering](https://medium.com/@samiratra95/mediapipe-blendshapes-recording-and-filtering-29bd6243924e)
- Per-AU cross-domain F1 (DISFA/BP4D) — [FG-Net WACV2024](https://ar5iv.labs.arxiv.org/html/2308.12380)
- AU occurrence rate vs F1-binary correlation — [PMC11290352 — Time to retire F1-binary](https://pmc.ncbi.nlm.nih.gov/articles/PMC11290352/)
- Stuttering secondary behaviors (AIS overview) — [AIS Secondary Characteristics](https://www.stutteringtreatment.org/blog/secondary-characteristics-of-stuttering)
