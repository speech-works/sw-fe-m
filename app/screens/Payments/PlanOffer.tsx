import React, { useState } from "react";
import { Image, Pressable, ScrollView, StyleSheet, View, useWindowDimensions } from "react-native";
import { Text, palette, radius, spacing, useTheme, withAlpha } from "../../design-system";
import type { PlanCardView, PlanKey } from "../../util/functions/paywallView";

/**
 * THE PLAN SCREEN (founder pick K3, 10 Nov 2026).
 *
 * The top is the website's orange layer: the headline, then people from the
 * program-cover art kit, cut by the website's speech-bubble edge
 * (assets/membership/plan-scene.png, built from
 * Desktop/SW-Release-2026-11-06/screens/paywall-G-2026-11-10/kit-scenes/build.cjs).
 * The space above the bubble's pointer is left empty on purpose.
 *
 * Below it: two plan rows and the dock (button and renewal terms), which
 * never scroll. At large text the art crops its sky first, then the top
 * area scrolls.
 * No sheet opens from here: a sheet over this modal froze taps on some phones.
 */
export interface PlanOfferProps {
  monthlyLabel: string;
  annualLabel: string;
  /** The yearly price per month, in the same currency, or null. */
  annualPerMonthLabel: string | null;
  annualSavingsPct: number;
  cards: Record<PlanKey, PlanCardView>;
  onPickMonthly: () => void;
  onPickAnnual: () => void;
  priceKnown: boolean;
  disabled: boolean;
  /** Restore and close, drawn on the orange layer. */
  header: React.ReactNode;
  /** Status bar height. */
  topInset: number;
  dock: React.ReactNode;
}

const SCENE = require("../../assets/membership/plan-scene.png");
// The art is 390 x 273.
const SCENE_RATIO = 390 / 273;
const ORANGE = palette.orange[400];
const INK = palette.ink.canvas;

export const PlanOffer: React.FC<PlanOfferProps> = ({
  monthlyLabel,
  annualLabel,
  annualPerMonthLabel,
  annualSavingsPct,
  cards,
  onPickMonthly,
  onPickAnnual,
  priceKnown,
  disabled,
  header,
  topInset,
  dock,
}) => {
  const { colors } = useTheme();
  const { width } = useWindowDimensions();
  const [roomH, setRoomH] = useState(0);
  const [headH, setHeadH] = useState(0);
  const fullH = width / SCENE_RATIO;
  // The top 22% of the art is empty sky (clouds and faces sit below it), so
  // that is all a short screen may crop. Past that, the top area scrolls.
  const minH = fullH * 0.78;
  const sceneH =
    roomH > 0 && headH > 0 ? Math.min(fullH, Math.max(minH, roomH - headH)) : fullH;
  const onGround = colors.premium.onGround;
  const muted = colors.premium.onGroundMuted;

  const row = (
    key: PlanKey,
    title: string,
    price: string,
    per: string,
    sub: string | null,
    badge: string | null,
    onPress: () => void,
  ) => {
    const card = cards[key];
    const on = card.selected;
    const off = disabled || !card.enabled;
    const note = card.current ? "Current plan" : card.endFootnote ?? sub;
    return (
      <Pressable
        key={key}
        onPress={onPress}
        disabled={off}
        style={[
          styles.row,
          { borderColor: withAlpha(onGround, 0.12), backgroundColor: withAlpha(onGround, 0.04) },
          on && { borderColor: ORANGE, backgroundColor: withAlpha(ORANGE, 0.1) },
          // Room for the SAVE badge on the top edge, so it never covers the price.
          badge ? styles.rowWithBadge : null,
          off && !on && { opacity: 0.6 },
        ]}
        accessibilityRole="radio"
        accessibilityState={{ selected: on, disabled: off }}
        accessibilityLabel={`${title}, ${price} ${per}${note ? `, ${note}` : ""}${badge ? `, ${badge}` : ""}`}
      >
        <View
          style={[
            styles.radio,
            { borderColor: on ? ORANGE : withAlpha(onGround, 0.35) },
            on && { borderWidth: 6 },
          ]}
        />
        <View style={styles.rowMain}>
          <Text variant="title" color={onGround} maxFontSizeMultiplier={1.3}>
            {title}
          </Text>
          {note ? (
            <Text variant="bodySm" color={muted} maxFontSizeMultiplier={1.3}>
              {note}
            </Text>
          ) : null}
        </View>
        <View style={styles.rowPrice}>
          <Text variant="title" color={onGround} style={styles.price} maxFontSizeMultiplier={1.3}>
            {price}
          </Text>
          <Text variant="bodySm" color={muted} maxFontSizeMultiplier={1.3}>
            {per}
          </Text>
        </View>
        {badge ? (
          <View style={[styles.badge, { backgroundColor: palette.lime.base }]}>
            <Text variant="label" color={palette.lime.on} allowFontScaling={false}>
              {badge}
            </Text>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View style={[styles.root, { backgroundColor: colors.premium.ground }]}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        bounces={false}
        onLayout={(e) => setRoomH(e.nativeEvent.layout.height)}
      >
        <View
          style={[styles.orange, { paddingTop: topInset }]}
          onLayout={(e) => setHeadH(e.nativeEvent.layout.height)}
        >
          {header}
          <Text
            variant="screenTitle"
            center
            color={INK}
            style={styles.headline}
            numberOfLines={2}
            adjustsFontSizeToFit
            minimumFontScale={0.7}
            maxFontSizeMultiplier={1.3}
            accessibilityRole="header"
            accessibilityLabel="Calls that run to ten minutes"
          >
            {"Calls that run\nto ten minutes"}
            <View style={styles.dot} />
          </Text>
        </View>
        <View style={[styles.grow, styles.orangeFill]} />
        {/* When space is short, the art gives up its empty sky first: it is
            cropped from the TOP, so the faces, the bubble edge and its
            pointer always show whole. Only if even that does not fit does
            this area scroll. */}
        <View style={[styles.sceneBox, { height: sceneH }]}>
          <Image
            source={SCENE}
            style={{ width, height: fullH }}
            resizeMode="stretch"
            accessible={false}
            accessibilityIgnoresInvertColors
          />
        </View>
      </ScrollView>

      {priceKnown ? (
        <View style={styles.plans} accessibilityRole="radiogroup">
          {row("monthly", "Monthly", monthlyLabel, "a month", null, null, onPickMonthly)}
          {row(
            "annual",
            "Yearly",
            annualLabel,
            "a year",
            annualPerMonthLabel ? `${annualPerMonthLabel} a month` : null,
            annualSavingsPct > 0 && !cards.annual.current ? `SAVE ${annualSavingsPct}%` : null,
            onPickAnnual,
          )}
        </View>
      ) : null}

      {dock}
    </View>
  );
};

export default PlanOffer;

const styles = StyleSheet.create({
  root: { flex: 1 },
  scroll: { flex: 1 },
  scrollContent: { flexGrow: 1 },
  // Grows to fill the space, so the art always sits right above the plans
  // and no dark gap opens under the bubble edge on a tall phone.
  orange: { backgroundColor: ORANGE },
  grow: { flexGrow: 1 },
  orangeFill: { backgroundColor: ORANGE, marginTop: -1 },
  sceneBox: { overflow: "hidden", justifyContent: "flex-end", marginTop: -1 },
  headline: {
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.sm,
    letterSpacing: -1.4,
  },
  // The website's lime blob after the headline.
  dot: {
    width: 12,
    height: 15,
    borderRadius: 7,
    marginLeft: 3,
    backgroundColor: palette.lime.base,
    borderWidth: 2,
    borderColor: INK,
  },
  // -1 tucks the art under the orange View, so no hairline shows between them.
  // Breathing room (founder, 10 Nov 2026): the rows, the gap between them and
  // the space above the button were tight.
  plans: { paddingHorizontal: spacing["2xl"], gap: spacing.lg, paddingTop: spacing.xl },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    borderWidth: 1.5,
    borderRadius: radius.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  rowWithBadge: { paddingTop: spacing.xl },
  radio: { width: 22, height: 22, borderRadius: 11, borderWidth: 2 },
  rowMain: { flex: 1 },
  rowPrice: { alignItems: "flex-end" },
  price: { fontWeight: "800" },
  badge: {
    position: "absolute",
    top: -10,
    right: spacing.lg,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
});
