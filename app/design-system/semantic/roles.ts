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
    control: string;
    inverse: string; // a bright (white) disc — avatars, switch thumbs
    material: string; // translucent blur tint for floating chrome (toast/banner)
  };
  border: { hairline: string; default: string; strong: string; selected: string; focus: string };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    disabled: string;
    inverse: string; // dark text that sits on the brand/orange fill
    onInverse: string; // near-black text that sits on the white `surface.inverse` disc
    link: string;
  };
  action: {
    primary: string;
    primaryPressed: string;
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
  gamification: { xp: string; streak: string; stamina: string; gold: string };
  // shadow color lives in the scheme so light mode can tune it (Phase F).
  shadow: string;
};
