import { LinearGradient } from "expo-linear-gradient";
import React, { useEffect, useState } from "react";
import { LayoutChangeEvent, StyleSheet } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withTiming,
} from "react-native-reanimated";
import { easing, useTheme } from "../../../../design-system";

/**
 * A single blade of light drawn across the avatar card, once, right after the
 * user saves a new avatar.
 *
 * WHY THIS IS ALLOWED TO EXIST. A sweep is the visual grammar of a promotional
 * banner, and on anything somebody sees daily it would be noise. This one fires
 * only in the seconds after a save — rare, earned, and about a thing the user
 * just made. That is the one frequency band where delight is the right answer.
 *
 * It reports nothing. The toast in the studio already said "Avatar saved"; this
 * is not a second confirmation, it is the card looking new. So it must be over
 * before it can be studied — anything slower turns into a status indicator, and
 * the user starts waiting for it to finish.
 */

const BLADE = {
  /** Let the pop-back transition land first. A sweep played over a screen still
   *  sliding into place is spent on a card nobody is looking at yet. */
  delay: 380,
  /** The pass itself. A highlight travelling across a surface GLIDES — the eye
   *  knows what moving light looks like and will not accept a whip. Still slower
   *  than a UI transition on purpose, because this is not responding to
   *  anything; the gentle curve below is what keeps it a glide at this speed. */
  travel: 700,
  /** Band width as a fraction of the card. Wide, because the band is not the
   *  highlight — the highlight is the thin core inside it, and the rest is the
   *  shading that makes the core read as light rather than as paint. */
  width: 0.55,
  /** Off vertical, so it rakes across the card instead of wiping it. */
  tilt: "-20deg",
};

/**
 * THE SPECULAR LOBE — where this stopped being a coloured band and started
 * being light.
 *
 * A highlight crossing a polished surface is not one bright stripe. It is a
 * bright core with the surface DARKENING either side of it, because the same
 * tilt that throws light at your eye at the centre throws it away just beside
 * it. Reproducing that shape is the whole difference between a mirror shine and
 * a gradient sliding past.
 *
 * It also happens to be what makes light mode work. The card is `#FFFEFB` —
 * there is no headroom above it, so a white core is mathematically invisible
 * there (+0, +1, +4 of 255). On paper the shine is carried ENTIRELY by the two
 * shadow lobes, with the card's own white showing through between them as the
 * highlight. That is exactly how a glint reads on white gloss in life, so the
 * same structure serves both schemes rather than each needing its own trick.
 *
 * The stops step through fully-transparent between the dark and bright lobes.
 * Interpolating black straight into white crosses a flat grey haze, which looks
 * like dirt on the card.
 */
const LOBE: readonly [number, number, ...number[]] = [
  0, 0.26, 0.38, 0.46, 0.5, 0.54, 0.62, 0.74, 1,
];

const SHEEN = {
  // Deep enough to read on ink without looking like a hole punched in the card.
  dark: { shade: [0, 0, 0], shadeA: 0.18, glowA: 0.38 },
  // Warm ink, not neutral black — a grey shadow on the paper scheme reads cold
  // and foreign on a canvas that has no neutral greys anywhere in it.
  light: { shade: [38, 34, 28], shadeA: 0.09, glowA: 1 },
} as const;

const rgba = (c: readonly number[], a: number) =>
  `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const GLOW = [255, 255, 255] as const;

export const AvatarSheen: React.FC<{
  /** Flip true exactly once, when a save has just landed. */
  play: boolean;
  /** Called when the blade has left, so the parent can drop this from the tree. */
  onDone: () => void;
}> = ({ play, onDone }) => {
  const { scheme } = useTheme();
  const [box, setBox] = useState({ w: 0, h: 0 });
  const progress = useSharedValue(0);

  const onLayout = (e: LayoutChangeEvent) => {
    const { width, height } = e.nativeEvent.layout;
    setBox({ w: width, h: height });
  };

  useEffect(() => {
    // Waits for a real measurement — travelling across a zero-width card would
    // burn the one shot we get on an animation nobody could see.
    if (!play || !box.w) return;
    progress.value = 0;
    progress.value = withDelay(
      BLADE.delay,
      // `easing.loop`, not `easing.inOut`. The system's inOut is deliberately
      // punchy — it slams through the middle, which is right for a UI element
      // morphing and wrong for light, which reads as a wipe the instant it
      // accelerates. This is the gentle symmetric curve the token set has.
      withTiming(1, { duration: BLADE.travel, easing: easing.loop }, (done) => {
        if (done) runOnJS(onDone)();
      })
    );
  }, [play, box.w, progress, onDone]);

  const band = box.w * BLADE.width;

  const style = useAnimatedStyle(() => ({
    // Starts and ends fully clear of the card, so neither edge of the blade is
    // ever visible parked at a boundary.
    transform: [
      { translateX: -band + progress.value * (box.w + band * 2) },
      { rotate: BLADE.tilt },
    ],
  }));

  // NEUTRAL, not the brand orange. Tinting it made the card look like something
  // coloured slid across it; light has no colour of its own, and the moment it
  // does the eye stops reading it as a reflection.
  const s = scheme === "dark" ? SHEEN.dark : SHEEN.light;
  const shade = (a: number) => rgba(s.shade, s.shadeA * a);
  const glow = (a: number) => rgba(GLOW, s.glowA * a);

  return (
    <Animated.View
      style={StyleSheet.absoluteFill}
      onLayout={onLayout}
      pointerEvents="none"
    >
      {box.w > 0 ? (
        <Animated.View
          style={[
            styles.blade,
            // Overhangs top and bottom so the tilt never exposes a blunt end
            // inside the card's corners.
            { width: band, top: -box.h, height: box.h * 3 },
            style,
          ]}
        >
          {/* shadow · clear · glow · clear · shadow — the shape of a highlight
              raking a polished surface, not a stripe of paint moving across it. */}
          <LinearGradient
            colors={[
              shade(0),
              shade(1),
              shade(0),
              glow(0.35),
              glow(1),
              glow(0.35),
              shade(0),
              shade(1),
              shade(0),
            ]}
            locations={LOBE}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  blade: {
    position: "absolute",
    left: 0,
  },
});
