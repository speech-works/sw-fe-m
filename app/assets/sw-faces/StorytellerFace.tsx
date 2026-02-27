import * as React from "react";
import Svg, {
  ClipPath,
  Path,
  G,
  Defs,
  SvgProps,
  Circle,
  Rect } from "react-native-svg";
import Animated, {
  useSharedValue,
  useAnimatedProps,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  Easing,
  cancelAnimation } from "react-native-reanimated";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

interface SvgIconProps extends SvgProps {
  shouldAnimate?: boolean;
  loop?: boolean;
  repeatCount?: number;
  size?: number | string;
}

const StorytellerFace = ({
  size = 48,
  width,
  height,
  shouldAnimate,
  loop,
  repeatCount,
  ...props
}: SvgIconProps) => {
  const activeWidth = width || size;
  const activeHeight = height || size;

  // Animation Values
  const glassesRotation = useSharedValue(0);
  const scrollY = useSharedValue(0);

  React.useEffect(() => {
    if (!shouldAnimate) {
      scrollY.value = 0;
      return;
    }

    // 2. Chatbox Scrolling Text
    // Lines slide up endlessly. We reset cleanly by scrolling a full "block" height.
    scrollY.value = withRepeat(
      withTiming(-12, { duration: 6000, easing: Easing.linear }), // 6s duration
      -1,
      false
    );

    return () => {
      cancelAnimation(scrollY);
    };
  }, [shouldAnimate]);

  const scrollProps = useAnimatedProps(() => ({
    transform: [{ translateY: scrollY.value }] }));

  return (
    <Svg
      width={activeWidth}
      height={activeHeight}
      viewBox="0 0 48 48"
      fill="none"
      {...props}
    >
      <Defs>
        <ClipPath
          id="storyteller_mask"
          x="0"
          y="0"
          width="48"
          height="48"
          maskUnits="userSpaceOnUse"
        >
          <Path
            fill="#fff"
            d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
          />
        </ClipPath>
        <ClipPath id="chat_clip">
          {/* Clip to inside of bubble rect (local coords relative to center of bubble) */}
          <Rect x="-12" y="-6" width="24" height="10" />
        </ClipPath>
      </Defs>

      <G clipPath="url(#storyteller_mask)">
        {/* Background */}
        <Path
          fill="#80CBC4" /* Muted Teal/Turquoise */
          d="M48 24C48 10.745 37.255 0 24 0S0 10.745 0 24s10.745 24 24 24 24-10.745 24-24"
        />

        {/* Shadow - Vector approximation */}
        <Path
          fill="black"
          opacity={0.25}
          transform="translate(4, 4)"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />
        {/* The Brand Face Shape */}
        <Path
          fill="#FFCCBC"
          d="M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736"
        />

        {/* Static Glasses (Combined again) */}
        <G stroke="#BF360C" strokeWidth="4" fill="none" strokeLinecap="round">
          {/* Left Frame */}
          <Circle cx="16.8" cy="24" r="8" />
          {/* Right Frame */}
          <Circle cx="31.2" cy="24" r="8" />
          {/* Bridge */}
          <Path d="M24.8 24 L 23.2 24" />
          {/* Arms - Full length again */}
          <Path d="M10 24 L 7 24" />
          <Path d="M38 24 L 41 24" />
        </G>

        {/* Eyes (Inside Glasses) */}
        <Circle cx="16.8" cy="24" r="2.5" fill="#BF360C" />
        <Circle cx="31.2" cy="24" r="2.5" fill="#BF360C" />
        {/* Highlights */}
        <Circle cx="17.5" cy="23" r="0.7" fill="#FFF" opacity="0.8" />
        <Circle cx="31.9" cy="23" r="0.7" fill="#FFF" opacity="0.8" />

        {/* Speech Bubble Container */}
        <G transform="translate(24, 38)">
          {/* Main Bubble Shape */}
          <Path
            d="M-12 -6 H 12 V 4 H 0 L -2 7 L -4 4 H -12 Z"
            fill="#FFFFFF"
            stroke="#BF360C"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />

          {/* Scrolling Text Lines Masked */}
          <G clipPath="url(#chat_clip)">
            {/* Won't work easily with transform, using local coords */}
            {/* 
               Actually, SVG clipping is absolute. 
               Let's just manual-mask or ensure lines are only drawn inside.
               Simpler: Draw the lines inside the bubble area coordinates.
               Bubble Top: -6, Bottom: 4. (Height 10). 
               We need lines moving from 4 up to -18 (to loop).
             */}
            <AnimatedG animatedProps={scrollProps}>
              {/* Block 1 */}
              <Path
                stroke="#BF360C"
                strokeWidth="1"
                strokeLinecap="round"
                d="M-8 0 L 8 0"
              />
              <Path
                stroke="#BF360C"
                strokeWidth="1"
                strokeLinecap="round"
                d="M-6 3 L 6 3"
              />
              <Path
                stroke="#BF360C"
                strokeWidth="1"
                strokeLinecap="round"
                d="M-9 6 L 3 6"
              />
              <Path
                stroke="#BF360C"
                strokeWidth="1"
                strokeLinecap="round"
                d="M-5 9 L 5 9"
              />

              {/* Block 2 (Duplicate for seamless loop) - Shifted down by 12 units */}
              <G transform="translate(0, 12)">
                <Path
                  stroke="#BF360C"
                  strokeWidth="1"
                  strokeLinecap="round"
                  d="M-8 0 L 8 0"
                />
                <Path
                  stroke="#BF360C"
                  strokeWidth="1"
                  strokeLinecap="round"
                  d="M-6 3 L 6 3"
                />
                <Path
                  stroke="#BF360C"
                  strokeWidth="1"
                  strokeLinecap="round"
                  d="M-9 6 L 3 6"
                />
                <Path
                  stroke="#BF360C"
                  strokeWidth="1"
                  strokeLinecap="round"
                  d="M-5 9 L 5 9"
                />
              </G>
            </AnimatedG>
          </G>
        </G>
      </G>
    </Svg>
  );
};
export default React.memo(StorytellerFace);
