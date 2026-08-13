/**
 * Mode-invariant numeric scales (px/dp). Safe to import directly into static
 * StyleSheet.create — these never change between light/dark.
 */
import { StyleSheet } from "react-native";

// Spacing — 4-based ramp (absorbs the reference gaps exactly).
export const spacing = {
  none: 0,
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  "2xl": 24,
  "3xl": 32,
  "4xl": 40,
  "5xl": 48,
  "6xl": 64,
} as const;

// Semantic spacing aliases (intent-named). `iconText` + `titleSub` keep the
// "leading icon/avatar + title/subtitle" rhythm identical across every component.
export const space = {
  screenX: 16, // screen gutter — matches the rest of the app (Home, etc.)
  sectionGap: 24,
  groupGap: 16, // gap between rounded groups/cards within a screen body
  titleGap: 28, // back-bar → screen title, and title block → first content
  cardPad: 16,
  rowGap: 12,
  inlineGap: 8,
  iconText: 12, // gap between a leading icon/avatar and its text
  titleSub: 3, // gap between a title and its subtitle
} as const;

// Radius — role-based, not one-size.
export const radius = {
  none: 0,
  xs: 4,
  sm: 8,
  md: 12,
  input: 16,
  chip: 20,
  card: 24,
  sheet: 28,
  pill: 36,
  full: 9999,
} as const;

// Square/control dimensions.
export const size = {
  avatar: 64,
  avatarCompact: 52,
  control: 56,
  row: 72, // standard settings/list row height (matches ConnectedAvatarRow)
  avatarChip: 48, // leading icon chip inside a ListItem row
  // Clearance a scroll body must keep below it on tab-ROOT screens so content
  // isn't hidden behind the floating CustomTabBar (bottom:30 + height:70 + gap).
  tabBarSafe: 120,
  // The band the dock PHYSICALLY covers (bottom:30 + height:70), without the
  // 20pt breathing gap `tabBarSafe` adds on top. `tabBarSafe` answers "where may
  // content end"; this answers "what can the user actually see" — which is what
  // visibility/impression maths needs. Kept adjacent so the two can't drift.
  dockOcclusion: 100,
  backBtn: 44,
  /**
   * Icon ramp. `iconInline` and `iconXs` were added after an audit found they
   * were the app's TWO MOST-USED icon sizes (44 and 33 sites) with no token at
   * all — so two thirds of icons were raw numbers and had drifted to 13, 15,
   * 18, 22, 26 and 30. Each pairs with a type variant, which is how you pick:
   *   iconXs 12     → sits with `caption` (12/16)
   *   iconInline 14 → sits with `bodySm` (14/20) — the default inline glyph
   *   iconSm 16     → sits with `label` / `body`
   *   icon 20       → a row's leading icon
   *   tabIcon 24    → the tab dock
   *   iconLg 28     → a section or card header
   *   iconXl 32     → a feature tile
   * Anything larger is decorative (hero glyphs, watermarks) and stays a
   * one-off — a 140pt illustration is art, not an icon.
   */
  iconXl: 32,
  iconLg: 28,
  tabIcon: 24,
  icon: 20,
  iconSm: 16,
  iconInline: 14,
  iconXs: 12,
} as const;

export const hitTarget = { min: 44 } as const;

// Border widths (hairline renders the thinnest device-true 1px line).
export const borderWidth = {
  hairline: StyleSheet.hairlineWidth,
  thin: 1,
  thick: 2,
} as const;

// Opacity stops — disabled/pressed/muted states + scrim. Keep state opacity
// here so it's uniform; color-bearing scrims still live in semantic roles.
export const opacity = {
  full: 1,
  muted: 0.7,
  pressed: 0.6,
  disabled: 0.4,
  faint: 0.12,
} as const;

export const zIndex = {
  base: 0,
  raised: 1,
  sticky: 10,
  header: 10,
  tabBar: 20,
  overlay: 100,
  modal: 1000,
  toast: 2000,
} as const;
