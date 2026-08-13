/**
 * Raw color primitives — the ONLY file allowed to hold color hex literals.
 * Warm "Vivid" dark-first palette (locked rev-4). Nothing outside `semantic/`
 * should import these for color; screens consume semantic roles via useTheme().
 */
export const palette = {
  // Neutral "ink" ramp (warm) — dominant surfaces + text greys (dark scheme).
  ink: {
    canvas: "#141311",
    panel: "#1C1A17",
    card: "#24211B", // e1
    row: "#2E2A24",
    // A panel nested inside a card — see `paper.inset` for the full story. On ink
    // the nested step is a step DOWN from `row` (the card these sit in), which is
    // the value `ProgressDetail/insetSurface` already used, so promoting it to a
    // token changes nothing on this scheme.
    inset: "#24211B",
    skeleton: "#2E2A24", // = `row`, the value Skeleton already used on ink
    control: "#393430",
    sunken: "#0E0D0B",
    textPrimary: "#FFFFFF",
    textSecondary: "#ADA7A0",
    textTertiary: "#9E988F", // AA on card surfaces (≥4.5:1), still dimmer than secondary
    textDisabled: "#5C574F",
    // Unfilled part of a progress ring/bar — 3.17:1 on `row`, the card fill these
    // sit on. `control` (#393430) is only 1.16:1 there, which is why a partial
    // arc read as a floating crescent with no circle behind it. This is a
    // NON-TEXT contrast job (WCAG 1.4.11), so 3:1 is the target, not 4.5:1.
    track: "#7D766B",
  },

  // Warm "paper" ramp — the light-scheme mirror of `ink`. Every neutral carries
  // the SAME warm hue (~37°) for temperature cohesion; even the top elevated step
  // is a warm-white (never pure #FFF, which reads as a cold "hole" on cream).
  //
  // THE BUDGET. `canvas` → pure white is 1.16:1 in TOTAL. The ink ramp has
  // unlimited headroom above #141311 and spends it on five rungs; paper cannot,
  // so the ladder here is deliberately short and the work is handed to shadow
  // (elevationLight), edge (border.*) and recess (`inset`). Do not try to buy
  // room by darkening `canvas`: bright accents sit NEAR the canvas in luminance,
  // so a deeper ground separates them LESS, and `textTertiary` runs out of AA
  // headroom first. `canvas` is frozen.
  paper: {
    canvas: "#F7F2EA",
    panel: "#FBF8F2",
    card: "#FFFDF8", // e1
    row: "#FFFEFB", // top elevated step — warm-white, not pure #FFF
    // A panel nested INSIDE a card. On ink "nested" means a step up; on paper
    // there is no up, so it is a step DOWN — 1.13:1 (ΔE 5.8) inside `card` and
    // inside `row`, which is the dark scheme's own nested step (1.13:1) matched
    // exactly. The pair it replaces (`row` inside `card`) measured 1.01:1.
    inset: "#F5EFE4",
    // Skeleton bars. Deliberately deeper than `inset`: a loading bar has no
    // border and no content, so the fill is the ONLY thing drawing it, and at
    // `row` (the old value, ΔE 1.1 on a card) it was not drawn at all.
    skeleton: "#EDE5D5",
    control: "#E4D8C1", // deeper warm taupe — a control fill needs real presence on paper
    sunken: "#EFE8DC",
    textPrimary: "#26221C", // warm near-black ink (~14:1 on canvas)
    textSecondary: "#57514A",
    textTertiary: "#6E675C", // AA on canvas/card/row/inset (≥4.5:1) — same "cards only, not control" rule as dark
    textDisabled: "#A8A196",
    // The paper cut of `ink.track`. DARKER than the dark scheme's, because here
    // the track has to sit under a near-white card rather than over a near-black
    // one. Tuned against the DARKEST paper fill, which is the binding
    // constraint — and that changed: it used to be `canvas`, and `inset` is now
    // deeper than the canvas, which put the old #928A7C at 2.98:1 there. The
    // audit caught it, the same way it caught #948C7E at 2.99:1 before that.
    // Clears 3:1 on canvas, card, elevated AND inset.
    track: "#8E8678",
  },

  // Warm shadow + border/scrim ink for the LIGHT scheme. A shadow/border must
  // share the paper's temperature — a cold #000 shadow on warm cream is the #1
  // cheap-light-mode tell. `shadowWarm` is a deep warm-brown; `inkA` is the warm
  // near-black ink at a given alpha (matches black's luminance, adds warmth).
  shadowWarm: "#2A2018",
  inkA: (a: number) => `rgba(42,32,24,${a})`,

  // Brand orange (kept). textOnLight = hue used AS text/link ink on a light surface.
  orange: {
    100: "#FFF0E5",
    200: "#FFDABF",
    300: "#FFB580",
    400: "#FF9040", // hero
    500: "#FF6B00", // pressed
    600: "#BF5000",
    700: "#803600",
    800: "#401B00",
    on: "#2A1505", // dark text on an orange fill (AA)
    textOnLight: "#A84600", // link/emphasis ink on paper surfaces (≥5.3:1)
    // The 1px boundary the orange FILL needs on paper. #FF9040 measures 2.02:1
    // against the canvas, so a filled primary button has no identifiable edge
    // (WCAG 1.4.11 asks 3:1). This clears it at 3.13:1 while still reading as
    // the brand orange rather than a second colour. Transparent on ink, where
    // the fill is already 8.24:1 above the ground.
    edgeLight: "#D96A1A",
  },

  // Energy accents. base = fill · on = dark text on fill · textOnDark = hue used AS
  // text on a dark surface · textOnLight = hue used AS text on a light surface ·
  // tint = 12% wash for soft chips/icon-bgs on INK.
  //
  // tintLight / edgeLight exist because a fill hue behaves differently on the two
  // grounds and a scheme-invariant value cannot be right on both:
  //
  //  · tintLight — 12% of a bright hue DARKENS toward the accent on ink (ΔE 11–17)
  //    but WASHES toward white on paper, and how much survives depends on the
  //    hue's own luminance (lime kept ΔE 10.0 of its 16.9, danger 9.1 of 11.4).
  //    The six accents therefore read as one family on ink and split into
  //    "visible" and "barely there" on paper. Each alpha below is tuned so the
  //    light chip carries the SAME perceived weight (ΔE) as its dark counterpart,
  //    capped by keeping `textOnLight` on it at AA. That cap is why success,
  //    warning, danger and info were deepened here (4.79–5.27:1 → 5.45–5.53:1 on
  //    the canvas): tuned against the BARE canvas they had no margin left, so the
  //    moment a chip put any wash under them they fell below 4.5. The two changes
  //    are one change — do not raise a tintLight without re-checking its cut.
  //  · edgeLight — a mix toward the text cut, far enough that the edge clears
  //    3:1 against the paper canvas (WCAG 1.4.11 — most of these fills are on
  //    pressable cards) while still separating from its own fill. A filled
  //    accent object sits at 1.1–3.0:1 on paper, so the hue reads but the SHAPE
  //    does not, and the object bleeds into the page.
  //
  //    THE MIX IS NOT UNIFORM, and could not be: the six hues start at wildly
  //    different luminances, so the same percentage lands anywhere from 2.6:1 to
  //    4.3:1. 60% covers four of them; lime (70%) and warning (65%) are the two
  //    bright yellows and need to travel further to reach the same place. The
  //    schemeAudit is what caught this — it registers every edge at the 3:1 bar.
  lime: { base: "#C8F750", on: "#20300A", textOnDark: "#C8F750", textOnLight: "#4E6E00", tint: "rgba(200,247,80,0.12)", tintLight: "rgba(200,247,80,0.20)", edgeLight: "#739718" },
  purple: { base: "#8B7BF0", on: "#18123A", textOnDark: "#B5A8F5", textOnLight: "#5D4FC4", tint: "rgba(139,123,240,0.12)", tintLight: "rgba(139,123,240,0.16)", edgeLight: "#6F61D6" },
  success: { base: "#5BD98A", on: "#08351F", textOnDark: "#7DE6A3", textOnLight: "#1C703F", tint: "rgba(91,217,138,0.12)", tintLight: "rgba(91,217,138,0.20)", edgeLight: "#359A5D" },
  warning: { base: "#FFC53D", on: "#3A2A00", textOnDark: "#FFD66B", textOnLight: "#875900", tint: "rgba(255,197,61,0.12)", tintLight: "rgba(255,197,61,0.21)", edgeLight: "#B17F15" },
  danger: { base: "#FF5A5F", on: "#3A0608", textOnDark: "#FF9296", textOnLight: "#B43236", tint: "rgba(255,90,95,0.12)", tintLight: "rgba(255,90,95,0.16)", edgeLight: "#D24246" },
  info: { base: "#5B9DF9", on: "#06203F", textOnDark: "#8FBEFF", textOnLight: "#265EBC", tint: "rgba(91,157,249,0.12)", tintLight: "rgba(91,157,249,0.18)", edgeLight: "#3B77D4" },

  // Category hues (muted; legible as icon-tint on the card surface). on = dark text
  // on a full fill. edgeLight = the paper boundary (a 30% mix toward its own ink) —
  // same job as the accents' `edgeLight`, derived from the ink each hue already owns.
  category: {
    reading: { base: "#5FB3AB", on: "#06302C", edgeLight: "#448C85" }, // teal
    breathing: { base: "#A2B57E", on: "#1E2A0E", edgeLight: "#7A8B5C" }, // sage
    mirror: { base: "#B084AA", on: "#2E1B2A", edgeLight: "#896484" }, // plum
    exposure: { base: "#C9805F", on: "#3A1B0E", edgeLight: "#9E6247" }, // terracotta
    fun: { base: "#D6B86F", on: "#3A2C0A", edgeLight: "#A78E51" }, // sand
    realLife: { base: "#CB8398", on: "#2E1119", edgeLight: "#9C6172" }, // rose (hero full-fill)
  },

  // Paper cuts of the DECORATIVE gradient stops. Each is the deepest value that
  // still keeps its own `on` ink at AA (≥4.5:1), so the dark-on-bright invariant
  // survives the deepening — see `schemeGradients.light`.
  gradientLight: {
    orange: "#CC7333",
    orangePressed: "#D95B00",
    danger: "#E65156",
    purple: "#8475E4",
    info: "#528DE0",
    lime: "#82A134",
    success: "#49AE6E",
  },

  // Input surfaces (slightly distinct from the ink/paper ramps).
  inputBg: "#201E1A",
  inputBorder: "#423D37",
  inputBgLight: "#FFFDF8",
  inputBorderLight: "#D9D1C3",

  // Premium tier — a deliberately distinct gold-on-slate identity (NOT the orange
  // system). Scoped to the BuyPro upsell card.
  premium: {
    slate: "#0F172A",
    slateMid: "#1E293B",
    gold: "#D4AF37",
    goldDeep: "#996515",
    goldTint: "rgba(212,175,55,0.15)",
    // Ink for text/icons ON a gold fill. The slate is the tier's own dark, and
    // it measures 8.49:1 on `gold` — white was 2.10:1, which is the same
    // dark-on-bright rule the rest of the app already follows.
    onGold: "#0F172A",
    goldBorder: "rgba(212,175,55,0.3)",
    cyan: "#22D3EE",
    purple: "#8B5CF6",
  },

  white: "#FFFFFF",
  black: "#000000",
  whiteA: (a: number) => `rgba(255,255,255,${a})`,
  blackA: (a: number) => `rgba(0,0,0,${a})`,
  orangeA: (a: number) => `rgba(255,144,64,${a})`,
  paperA: (a: number) => `rgba(251,248,242,${a})`, // light material/capsule translucency
} as const;

export type Palette = typeof palette;
