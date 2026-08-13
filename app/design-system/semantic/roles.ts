/**
 * The semantic color contract — the role names every screen consumes via
 * useTheme().colors. Dark and (future) light schemes both implement this exact
 * shape, so adding light mode is a value swap, never a rename.
 */
export type SemanticColors = {
  background: { canvas: string; raised: string; sunken: string };
  surface: {
    default: string;
    elevated: string;
    row: string;
    rowSelected: string;
    /**
     * A panel nested INSIDE a card (a stat block, a ring well, a quoted remark).
     *
     * NOT `elevated`, which is a CARD on the canvas — the audit that produced
     * this role found ~76 `surface.elevated` call sites and almost all of them
     * are top-level cards, so repointing it would have been wrong for the
     * majority. This is the other case, and it is the one that broke: `row`
     * inside `card` measures 1.01:1 (ΔE 1.1) on paper, so every nested block
     * merged into one white slab.
     *
     * The direction of the step differs by scheme and that is the point. Ink has
     * headroom above the card, paper has none, so on paper the nested panel is
     * RECESSED. Both land at 1.13:1 against the card they sit in.
     */
    inset: string;
    /**
     * Skeleton/shimmer bars. Deeper than `inset` because a loading bar has no
     * border and no content — the fill is the only thing drawing it.
     */
    skeleton: string;
    control: string;
    /**
     * The unfilled remainder of a progress ring or bar.
     *
     * Deliberately NOT `control`, which is a pressable-surface fill and lands at
     * ~1.2:1 on the cards these sit on — enough for a button you can see the
     * edge of, not enough for the part of a ring that has to communicate "of
     * how much". WCAG 1.4.11 asks 3:1 for meaningful non-text graphics, and an
     * unfilled track is exactly that: without it a 33% arc is a mark, not a
     * third.
     */
    track: string;
    inverse: string; // a bright (white) disc — avatars, switch thumbs
    /**
     * The one high-contrast card fill: near-black on paper, near-white on ink.
     *
     * NOT `inverse`, which despite the name is WHITE IN BOTH SCHEMES and is
     * relied on that way by ~30 call sites (avatar discs, the toggle thumb,
     * every practice-icon housing, and eight cards that write
     * `isDark ? action.secondary : surface.inverse` to get a white pill on a
     * coloured fill). Repointing it would break all of them, several twice.
     *
     * Use sparingly — at most one per screen. It is the loudest object the
     * system has, and it earns its place only on something that is genuinely
     * about the user rather than about the app.
     */
    contrast: string;
    material: string; // translucent blur tint for floating chrome (toast/banner)
    /**
     * The boundary a BRIGHT DISC needs when it sits on the neutral ground — an
     * icon housing, a glyph avatar, a switch thumb. `"transparent"` on ink.
     *
     * `surface.inverse` stays white in both schemes and that is correct where
     * the disc sits on a COLOURED fill (a white pill on an orange card). On the
     * paper ground the same white is 1.11:1 and the disc simply has no shape.
     * An edge fixes the on-ground case without touching the ~23 on-fill call
     * sites that are already right.
     */
    discEdge: string;
  };
  border: { hairline: string; default: string; strong: string; selected: string; focus: string };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    disabled: string;
    inverse: string; // dark text that sits on the brand/orange fill
    onInverse: string; // near-black text that sits on the white `surface.inverse` disc
    /** Body text on `surface.contrast`. Flips with it, unlike `onInverse`. */
    onContrast: string;
    /** Muted text on `surface.contrast` — labels under a hero number. */
    onContrastMuted: string;
    link: string;
    // The brand orange used AS foreground (text / small meaningful icon) on a
    // surface — per-scheme: bright orange on dark, AA-legible amber on light.
    // Use for orange labels/numbers/info-icons; the bright `action.primary` fill
    // hue collapses to ~2.2:1 as foreground on the paper canvas.
    accent: string;
  };
  action: {
    primary: string;
    primaryPressed: string;
    /** Faint orange wash for soft chips/badges on a dark surface (not a fill). */
    primaryTint: string;
    /**
     * The 1px boundary a FILLED primary control needs on paper. `primary` is
     * 2.02:1 against the light canvas, so the button's edge — the thing WCAG
     * 1.4.11 asks 3:1 for — is not there. `"transparent"` on ink, where the
     * fill already sits 8.24:1 above the ground.
     *
     * The scheme had already made this exact call once, for `border.selected`
     * ("orange[400/500] miss the 3:1 non-text bar on paper; 600 clears it").
     * This generalises it to fills.
     */
    primaryEdge: string;
    onPrimary: string;
    secondary: string;
    onSecondary: string;
    disabledBg: string;
    disabledText: string;
  };
  accent: { lime: string; purple: string; success: string; warning: string; danger: string; info: string };
  // dark text/icon that sits ON an accent fill (the AA-correct foreground) —
  // mirrors `categoryOn`. Use this instead of white on any bright accent.
  accentOn: { lime: string; purple: string; success: string; warning: string; danger: string; info: string };
  // 12% accent wash for soft chips / icon-backgrounds on a dark surface (not a fill).
  accentTint: { lime: string; purple: string; success: string; warning: string; danger: string; info: string };
  // An accent used AS colored TEXT / thin line / small icon ON a surface (not a
  // fill). Per-scheme: the lighter cut on dark, the darker cut on light — always
  // AA. Covers ALL SIX accents (unlike feedback.*Text, which is only the four
  // status tones). Use this for decorative accent text/lines/icons; NEVER the
  // bright `accent.*` base (that's a fill, and it collapses on the light canvas).
  accentText: { lime: string; purple: string; success: string; warning: string; danger: string; info: string };
  /**
   * The 1px boundary a FILLED accent object needs on paper — a hero card, an
   * accent chip, a category tile. `"transparent"` on ink.
   *
   * The fill still reads on paper (a lime card is unmistakably lime, ΔE 77 from
   * the canvas) — what disappears is the SHAPE, because luminance is what draws
   * an edge and these hues are 1.1–3.0:1 against the page. Without it the object
   * bleeds into the canvas and the composition loses its architecture.
   *
   * This is a boundary, NOT a second fill and NOT a text colour: it is a mix
   * toward the accent's own `accentText` cut, so it reads as the same colour
   * with an edge on it. For colored TEXT use `accentText`; for a thin LINE or
   * dot use `accentText` as well (an edge role is meaningless at 2px).
   */
  accentEdge: { lime: string; purple: string; success: string; warning: string; danger: string; info: string };
  // feedback fills (= accent base) + text variants (lighter, for messages on dark)
  feedback: {
    success: string;
    warning: string;
    danger: string;
    info: string;
    successText: string;
    warningText: string;
    dangerText: string;
    infoText: string;
  };
  overlay: { scrim: string; pressed: string };
  input: { bg: string; border: string; borderFocus: string; placeholder: string; error: string };
  nav: { capsule: string; activePill: string; onActive: string; inactive: string; badge: string };
  category: { reading: string; breathing: string; mirror: string; exposure: string; fun: string; realLife: string };
  categoryOn: { reading: string; breathing: string; mirror: string; exposure: string; fun: string; realLife: string };
  /** The paper boundary for a filled category tile — see `accentEdge`. */
  categoryEdge: { reading: string; breathing: string; mirror: string; exposure: string; fun: string; realLife: string };
  gamification: { xp: string; streak: string; stamina: string; gold: string };
  // Premium tier (gold-on-slate) accents — scoped to the BuyPro upsell card.
  premium: {
    slate: string;
    slateMid: string;
    gold: string;
    goldDeep: string;
    goldTint: string;
    goldBorder: string;
    onGold: string;
    orbCyan: string;
    orbPurple: string;
  };
  // shadow color lives in the scheme so light mode can tune it (Phase F).
  shadow: string;
};
