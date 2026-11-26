/**
 * The owned program page in the "Two beats" look (mock 13, system.md section 6).
 *
 * Two layers, like the day screens: an orange zone (the cover stands in it) and a rounded sheet that holds the name,
 * the paragraph, the owned line and the days. Scrolling moves the sheet up under a slim orange header; the big title
 * hands over to the header title as it leaves. The one orange button is pinned to the bottom.
 *
 * RULES
 * - A part that can go owns its gap: the extra block, the owned line and the days list each carry their own top gap and
 *   render nothing when empty. No dividers between rows; rows are separated by their own height.
 * - Motion: the cover and the sheet scroll natively; only the header title's opacity is animated (reanimated).
 *   Flat colours, no blur. Reduced motion changes nothing here (it only fades).
 * - Text is never cut: the title wraps; the header title shrinks to its line.
 */
import React, { useState } from "react";
import { Platform, StatusBar, StyleSheet, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import Animated, {
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Path } from "react-native-svg";
import {
  Button,
  Gradient,
  Icon,
  IconButton,
  Text,
  icons,
  radius,
  size,
  spacing,
  useTheme,
  withAlpha,
} from "../../design-system";
import type { IconName } from "../../design-system";
import { CoverBook } from "../../components/ProgramCoverArt";
import type { ProgramCover } from "../../util/packs/programCover";

/** Text on the orange zone (system.md section 4): fixed in both schemes. */
const ON_ORANGE = "#2A1505";
const ON_ORANGE_MUTED = "rgba(42,21,5,.74)";
const BACK_DISC = "rgba(42,21,5,.12)";

const COVER_W = 180;
const COVER_H = (COVER_W * 4) / 3;
const SHEET_PAD_X = 24;
/** The sheet's top edge when scrolled: slim header = status bar + back disc row. */
const SLIM_BELOW_INSET = 68;
const COVER_TOP_BELOW_INSET = 16;
const COVER_TO_SHEET = 28;
const BUTTON_H = 56;

export interface OwnedProgramPageProps {
  cover: ProgramCover | null;
  eyebrow: string | null;
  title: string;
  description: string | null;
  /** "7 days · 7 sessions", or null. */
  meta: string | null;
  /** "You own this. It's unlocked." Null: the line and its gap are not drawn. */
  ownedLine: string | null;
  /** Anything else the sheet shows between the owned line and the days (retry text, countdown, spinner). */
  extra: React.ReactNode;
  /** Heading above the days, or null when there are no days (the heading and its gap go with the list). */
  daysHeading: string | null;
  days: React.ReactNode;
  /** The one pinned button. Null: no button, no dock. */
  cta: { label: string; icon: IconName; loading?: boolean; onPress: () => void } | null;
  onBack: () => void;
}

export const OwnedProgramPage: React.FC<OwnedProgramPageProps> = ({
  cover,
  eyebrow,
  title,
  description,
  meta,
  ownedLine,
  extra,
  daysHeading,
  days,
  cta,
  onBack,
}) => {
  const { colors, scheme } = useTheme();
  const insets = useSafeAreaInsets();
  const sheetBg = scheme === "dark" ? colors.surface.default : colors.background.canvas;
  const orange = colors.action.primary;

  const top = insets.top;
  const slimTop = top + SLIM_BELOW_INSET;
  const zoneH = cover ? top + COVER_TOP_BELOW_INSET + COVER_H + COVER_TO_SHEET : slimTop + 12;
  const dockH = cta ? BUTTON_H + 24 + Math.max(insets.bottom, 12) : 0;

  const [box, setBox] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [titleBlock, setTitleBlock] = useState<{ y: number; h: number } | null>(null);
  const [daysY, setDaysY] = useState<number | null>(null);
  const scrollY = useSharedValue(0);
  const onScroll = useAnimatedScrollHandler((e) => {
    scrollY.value = e.contentOffset.y;
  });

  // The header title shows once the big title has gone under the slim header.
  const titleGone = titleBlock ? zoneH + titleBlock.y + titleBlock.h - slimTop : 9999;
  const headerTitleSt = useAnimatedStyle(
    () => ({ opacity: interpolate(scrollY.value, [titleGone - 36, titleGone - 6], [0, 1], "clamp") }),
    [titleGone],
  );

  // The header's orange fill comes in as the page starts to scroll, so at the top the cover stands free in the zone.
  const headerBgSt = useAnimatedStyle(() => ({ opacity: interpolate(scrollY.value, [0, 24], [0, 1], "clamp") }));

  const onRootLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox((o) => (o.w === Math.round(width) && o.h === Math.round(height) ? o : { w: Math.round(width), h: Math.round(height) }));
  };

  // Tall enough that the page can scroll until "The days" is at the top, under the slim header (mock 13, scrolled).
  const sheetMin = Math.max(0, box.h - slimTop, daysY != null ? daysY - slimTop - 24 + box.h : 0);

  return (
    <View style={[s.root, { backgroundColor: orange }]} onLayout={onRootLayout}>
      <StatusBar barStyle="dark-content" />

      <Animated.ScrollView
        onScroll={onScroll}
        scrollEventThrottle={16}
        bounces={false}
        overScrollMode="never"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 0 }}
      >
        {/* the zone: the cover scrolls up with it and goes under the slim header */}
        <View style={{ height: zoneH, alignItems: "center" }}>
          {cover ? (
            <CoverBook
              cover={cover}
              width={COVER_W}
              radius={20}
              describe
              style={[{ marginTop: top + COVER_TOP_BELOW_INSET }, s.flat]}
            />
          ) : null}
        </View>

        <View style={[s.sheet, { backgroundColor: sheetBg, minHeight: sheetMin, paddingBottom: dockH + 24 }]}>
          <View onLayout={(e) => setTitleBlock({ y: e.nativeEvent.layout.y, h: e.nativeEvent.layout.height })}>
            {eyebrow ? (
              <Text variant="eyebrow" color={colors.text.accent} style={s.eyebrow}>
                {eyebrow}
              </Text>
            ) : null}
            <Text variant="screenTitle" color="primary" accessibilityRole="header" style={s.title}>
              {title}
            </Text>
          </View>

          {description ? (
            <Text variant="body" color="secondary" style={s.description}>
              {description}
            </Text>
          ) : null}

          {meta ? (
            <Text variant="caption" color="secondary" style={s.meta}>
              {meta}
            </Text>
          ) : null}

          {ownedLine ? (
            <View style={s.ownedRow}>
              <Icon name={icons.success} size={size.iconSm} color={colors.feedback.successText} />
              <Text variant="title" color={colors.feedback.successText} style={s.ownedText}>
                {ownedLine}
              </Text>
            </View>
          ) : null}

          {extra ? <View style={s.extra}>{extra}</View> : null}

          {daysHeading && days ? (
            <View style={s.daysBlock} onLayout={(e) => setDaysY(e.nativeEvent.layout.y)}>
              <Text variant="h2" color="primary" accessibilityRole="header" style={s.daysHeading}>
                {daysHeading}
              </Text>
              {days}
            </View>
          ) : null}
        </View>
      </Animated.ScrollView>

      {/* the slim header: opaque orange over the scrolling cover and sheet */}
      <View pointerEvents="box-none" style={[s.header, { height: slimTop }]}>
        <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: orange }, headerBgSt]} />
        <View style={[s.backWrap, { top: top + 8 }]}>
          <View style={s.disc}>
            <IconButton name="arrow-left" variant="ghost" onPress={onBack} color={ON_ORANGE} accessibilityLabel="Back" />
          </View>
        </View>
        <Animated.View
          pointerEvents="none"
          style={[s.headerText, { top: top + 10 }, headerTitleSt]}
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
        >
          <Text variant="title" color={ON_ORANGE} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.8}>
            {title}
          </Text>
          {meta ? (
            <Text variant="caption" color={ON_ORANGE_MUTED} numberOfLines={1}>
              {meta}
            </Text>
          ) : null}
        </Animated.View>
      </View>

      {/* the sheet's rounded corners at the slim edge (the real sheet's own corners are scrolled under the header) */}
      <View pointerEvents="none" style={[s.corner, { top: slimTop, left: 0 }]}>
        <Svg width={radius.sheet} height={radius.sheet} viewBox="0 0 28 28">
          <Path d="M0 0 H28 A28 28 0 0 0 0 28 Z" fill={orange} />
        </Svg>
      </View>
      <View pointerEvents="none" style={[s.corner, { top: slimTop, right: 0 }]}>
        <Svg width={radius.sheet} height={radius.sheet} viewBox="0 0 28 28">
          <Path d="M28 0 H0 A28 28 0 0 1 28 28 Z" fill={orange} />
        </Svg>
      </View>

      {/* the pinned button: one block anchored to the bottom, so nothing above it leaves a hole */}
      {cta ? (
        <View pointerEvents="box-none" style={[s.dock, { height: dockH + 36 }]}>
          <Gradient
            colors={[withAlpha(sheetBg, 0), sheetBg]}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
            style={s.fade}
          />
          <View style={[s.dockBody, { backgroundColor: sheetBg, paddingBottom: Math.max(insets.bottom, 12) + 12 }]}>
            <Button label={cta.label} leftIcon={cta.icon} loading={cta.loading} onPress={cta.onPress} />
          </View>
        </View>
      ) : null}
    </View>
  );
};

const s = StyleSheet.create({
  root: { flex: 1, overflow: "hidden" },
  flat: Platform.select({
    web: { boxShadow: "none" } as object,
    default: { shadowOpacity: 0, elevation: 0 },
  }) as object,
  header: { position: "absolute", top: 0, left: 0, right: 0, zIndex: 3 },
  disc: { width: 44, height: 44, borderRadius: 22, backgroundColor: BACK_DISC },
  backWrap: { position: "absolute", left: 16 },
  headerText: { position: "absolute", left: 72, right: 20 },
  corner: { position: "absolute", width: radius.sheet, height: radius.sheet, zIndex: 3 },
  sheet: {
    borderTopLeftRadius: radius.sheet,
    borderTopRightRadius: radius.sheet,
    paddingTop: SHEET_PAD_X,
    paddingHorizontal: SHEET_PAD_X,
  },
  eyebrow: { fontSize: 12, lineHeight: 16, letterSpacing: 1 },
  title: { fontSize: 30, lineHeight: 36, letterSpacing: -0.7, marginTop: 6 },
  description: { marginTop: spacing.md, fontSize: 15, lineHeight: 23 },
  meta: { marginTop: 14, fontSize: 13, lineHeight: 18 },
  ownedRow: { marginTop: 10, flexDirection: "row", alignItems: "center", gap: spacing.sm },
  ownedText: { flex: 1, fontSize: 14, lineHeight: 20 },
  extra: { marginTop: spacing.lg, gap: spacing.lg },
  daysBlock: { marginTop: spacing["2xl"] },
  daysHeading: { fontSize: 22, lineHeight: 28, marginBottom: spacing.sm },
  dock: { position: "absolute", left: 0, right: 0, bottom: 0, zIndex: 4 },
  fade: { position: "absolute", left: 0, right: 0, top: 0, height: 36 },
  dockBody: { position: "absolute", left: 0, right: 0, bottom: 0, paddingTop: 12, paddingHorizontal: 16 },
});
