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
  screenX: 20,
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
  backBtn: 44,
  tabIcon: 24,
  iconLg: 28,
  icon: 20,
  iconSm: 16,
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
