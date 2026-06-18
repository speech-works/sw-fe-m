import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedProps,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from "react-native-reanimated";
import Svg, { Circle, Ellipse, G, Path, SvgProps } from "react-native-svg";

const AnimatedPath = Animated.createAnimatedComponent(Path) as any;
const AnimatedG = Animated.createAnimatedComponent(G) as any;
const AnimatedEllipse = Animated.createAnimatedComponent(Ellipse) as any;

const FACE_BLOB =
  "M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736";

interface EditProfileFaceProps extends SvgProps {
  shouldAnimate?: boolean;
  size?: number | string;
  transparentBg?: boolean;
}

const EditProfileFace: React.FC<EditProfileFaceProps> = ({
  size = 100,
  shouldAnimate = true,
  transparentBg = false,
  style,
  ...props
}) => {
  // Shared values for driving animations entirely on the UI thread
  const drawProgress = useSharedValue(0);
  const wobble = useSharedValue(0);
  const blink = useSharedValue(1);

  useEffect(() => {
    let blinkTimeout: NodeJS.Timeout;

    if (shouldAnimate) {
      // 1. Draw the line (progress 0 to 1 and back)
      drawProgress.value = withRepeat(
        withTiming(1, {
          duration: 1500,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );

      // 2. Fast wobble for the pencil tip while drawing
      wobble.value = withRepeat(
        withTiming(1, {
          duration: 120,
          easing: Easing.inOut(Easing.ease),
        }),
        -1,
        true,
      );

      // 3. Periodic Blink Animation
      const triggerBlink = () => {
        blink.value = withSequence(
          withTiming(0, { duration: 100, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 100, easing: Easing.inOut(Easing.ease) }),
        );
        blinkTimeout = setTimeout(triggerBlink, 3000 + Math.random() * 5000);
      };

      triggerBlink();
    } else {
      drawProgress.value = withTiming(1, { duration: 300 });
      wobble.value = withTiming(0, { duration: 150 });
      blink.value = withTiming(1, { duration: 300 });
    }

    return () => {
      cancelAnimation(drawProgress);
      cancelAnimation(wobble);
      cancelAnimation(blink);
      if (blinkTimeout) clearTimeout(blinkTimeout);
    };
  }, [shouldAnimate]);

  // Reveal the line by animating its strokeDashoffset
  const lineProps = useAnimatedProps(() => {
    // 30 represents the approximate length of the quadratic bezier curve
    const offset = 30 - drawProgress.value * 30;
    return {
      strokeDashoffset: offset,
    };
  }, []);

  // Float the pencil along the drawn line path and wobble it
  const pencilProps = useAnimatedProps(() => {
    // The curve goes roughly from (12, 36) to (36, 34)
    // The base pencil tip is located at (16, 24).
    // Offsets calculate how much we need to translate the tip to trace the line.
    const startX = -4; // 12 - 16
    const startY = 12; // 36 - 24
    const endX = 20; // 36 - 16
    const endY = 10; // 34 - 24

    const currentX = startX + drawProgress.value * (endX - startX);
    // Add a slight arc to the Y movement to fake the Q (bezier) curve tracking
    const arcOffset = Math.sin(drawProgress.value * Math.PI) * 2;
    const currentY = startY + drawProgress.value * (endY - startY) + arcOffset;

    const currentRotation = -10 + wobble.value * 20; // Wobble between -10deg and +10deg

    return {
      transform: [
        { translateX: currentX },
        { translateY: currentY },
        // Manual translation pivot around the pencil tip (16, 24) to avoid SVG originY bugs
        { translateX: 16 },
        { translateY: 24 },
        { rotate: `${currentRotation}deg` },
        { translateX: -16 },
        { translateY: -24 },
      ],
    };
  }, []);

  const blinkProps = useAnimatedProps(() => {
    return {
      ry: 2 * blink.value,
    };
  }, []);

  return (
    <View
      style={[
        {
          width: size as any,
          height: size as any,
          borderRadius: (Number(size) || 100) / 2,
          ...(transparentBg ? {} : { overflow: "hidden", backgroundColor: "#000" }),
        },
        style as any,
      ]}
    >
      <Svg
        viewBox="0 0 48 48"
        width="100%"
        height="100%"
        fill="none"
        {...({ overflow: "visible" } as any)}
        {...props}
      >
        {!transparentBg && <Circle cx="24" cy="24" r="24" fill="#4DB6AC" />}
        <Path d={FACE_BLOB} fill="#FFF9C4" />

        {/* Eyes */}
        <AnimatedEllipse cx="16" cy="24" rx="2" ry="2" fill="#3E2723" animatedProps={blinkProps} />
        <AnimatedEllipse cx="32" cy="24" rx="2" ry="2" fill="#3E2723" animatedProps={blinkProps} />

        {/* Drawn Mouth Curve */}
        <AnimatedPath
          d="M 12 36 Q 24 40 36 34"
          stroke="#795548"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeDasharray="30"
          animatedProps={lineProps}
        />

        {/* Floating Pencil */}
        <AnimatedG animatedProps={pencilProps}>
          {/* Pencil Body */}
          <Path d="M 28 8 L 32 12 L 22 22 L 18 18 Z" fill="#FFCA28" />
          {/* Wood tip */}
          <Path d="M 18 18 L 22 22 L 16 24 Z" fill="#FFE0B2" />
          {/* Lead tip */}
          <Path d="M 17 21 L 19 23 L 16 24 Z" fill="#424242" />
          {/* Eraser */}
          <Path d="M 28 8 L 32 12 L 34 10 L 30 6 Z" fill="#F48FB1" />
        </AnimatedG>
      </Svg>
    </View>
  );
};

export default React.memo(EditProfileFace);
