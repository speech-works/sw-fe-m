import React, { useEffect } from "react";
import { View } from "react-native";
import Animated, {
    Easing,
    interpolate,
    useAnimatedProps,
    useSharedValue,
    withRepeat,
    withTiming,
    cancelAnimation,
} from "react-native-reanimated";
import Svg, {
    Circle,
    ClipPath,
    Defs,
    Ellipse,
    G,
    Line,
    Path,
    Rect,
    SvgProps,
} from "react-native-svg";

const AnimatedG = Animated.createAnimatedComponent(G);
const AnimatedPath = Animated.createAnimatedComponent(Path);

const BASE_FACE_PATH =
    "M8.075 10.075c0-2.767 33.199-2.767 33.199 0 2.767 0 2.767 38.736 0 38.736 0 2.766-33.2 2.766-33.2 0-2.766 0-2.766-38.736 0-38.736";

// Palette derived from the "Mirror Work" UI card
const THEME = {
    bg: "#4F80F3", // Royal Blue Background
    face: "#C6D8FB", // Soft Periwinkle Skin
    features: "#2A56C6", // Deep Blue Eyes/Mouth (Play button color)
    mFrame: "#FFFFFF", // White Mirror Frame
    mHandle: "#9FBEF8", // Light Blue Handle
    mGlass: "#EAF1FE", // Soft Blue Glass Reflection
};

interface SparkleMirrorFaceProps extends SvgProps {
    size?: number | string;
    shouldAnimate?: boolean;
}

const SparkleMirrorFace: React.FC<SparkleMirrorFaceProps> = ({
    size = 140,
    shouldAnimate = true,
    style,
    ...props
}) => {
    // Shared values for our animations
    const mirrorProgress = useSharedValue(0);
    const sparkleProgress = useSharedValue(0);

    useEffect(() => {
        if (shouldAnimate) {
            // 1. Subtle, natural breathing for the mirror (4s cycle)
            mirrorProgress.value = withRepeat(
                withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.sin) }),
                -1, // infinite
                true // reverse to create a smooth back-and-forth
            );

            // 2. Sparkle Pop timing (3s cycle)
            sparkleProgress.value = withRepeat(
                withTiming(1, { duration: 3000, easing: Easing.linear }),
                -1,
                false
            );
        } else {
            mirrorProgress.value = 0;
            sparkleProgress.value = 0;
        }

        return () => {
            cancelAnimation(mirrorProgress);
            cancelAnimation(sparkleProgress);
        };
    }, [shouldAnimate]);

    // Mirror floating/breathing animation props
    const mirrorProps = useAnimatedProps(() => {
        // Translates to (34, 24) -> (34, 23) and rotates -8deg -> -7deg
        const translateY = interpolate(mirrorProgress.value, [0, 1], [24, 23]);
        const rotate = interpolate(mirrorProgress.value, [0, 1], [-8, -7]);

        return {
            transform: [
                { translateX: 34 },
                { translateY: translateY },
                { rotate: `${rotate}deg` },
            ] as any,
        };
    });

    // Sparkle popping animation props
    const sparkleProps = useAnimatedProps(() => {
        // Keyframes map: 0%, 10%, 20%, 90%, 100%
        const scale = interpolate(
            sparkleProgress.value,
            [0, 0.1, 0.2, 0.9, 1],
            [0, 1.2, 1, 1, 0]
        );
        const rotate = interpolate(
            sparkleProgress.value,
            [0, 0.1, 0.2, 0.9, 1],
            [0, 45, 90, 90, 0]
        );
        const opacity = interpolate(
            sparkleProgress.value,
            [0, 0.1, 0.2, 0.9, 1],
            [0, 1, 0, 0, 0]
        );

        return {
            opacity,
            transform: [
                { translateX: 13 }, // Move to the sparkle's center
                { translateY: 12 },
                { scale: scale },
                { rotate: `${rotate}deg` },
                { translateX: -13 }, // Move back
                { translateY: -12 },
            ] as any,
        };
    });

    const clipId = "sparkle-mirror-clip";

    return (
        <View
            style={[
                {
                    width: size as any,
                    height: size as any,
                    borderRadius: (Number(size) || 140) / 2,
                    overflow: "hidden",
                    backgroundColor: THEME.bg,
                    shadowColor: "#000",
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.1,
                    shadowRadius: 6,
                    elevation: 3,
                },
                style,
            ]}
        >
            <Svg viewBox="0 0 48 48" width="100%" height="100%" {...props}>
                <Defs>
                    <ClipPath id={clipId}>
                        <Ellipse cx="0" cy="0" rx="7.5" ry="11.5" />
                    </ClipPath>
                </Defs>

                {/* --- MAIN FACE --- */}
                <G>
                    {/* Base Face */}
                    <Path d={BASE_FACE_PATH} fill={THEME.face} />

                    {/* Eyes looking right */}
                    <Path
                        d="M 12 24 Q 16 22 20 24 M 28 24 Q 32 22 36 24"
                        stroke={THEME.features}
                        strokeWidth="1.5"
                        fill="none"
                    />
                    <Circle cx="18" cy="24" r="1.5" fill={THEME.features} />
                    <Circle cx="34" cy="24" r="1.5" fill={THEME.features} />

                    {/* Confident Smile */}
                    <Path
                        d="M 17 33 Q 24 39 31 33"
                        stroke={THEME.features}
                        strokeWidth="2"
                        fill="none"
                        strokeLinecap="round"
                    />

                    {/* Animated Sparkle */}
                    <AnimatedPath
                        d="M 10 12 Q 13 12 13 9 Q 13 12 16 12 Q 13 12 13 15 Q 13 12 10 12 Z"
                        fill="#FFFFFF"
                        animatedProps={sparkleProps}
                    />
                </G>

                {/* --- FLOATING MIRROR PROP --- */}
                <AnimatedG animatedProps={mirrorProps}>
                    {/* Tapered Handle */}
                    <Path d="M -2 12 L 2 12 L 3.5 24 L -3.5 24 Z" fill={THEME.mHandle} />
                    {/* Handle connector accent */}
                    <Rect x="-3" y="11" width="6" height="3" fill={THEME.mFrame} rx="1" />

                    {/* Mirror Frame Outer */}
                    <Ellipse cx="0" cy="0" rx="9" ry="13" fill={THEME.mFrame} />
                    {/* Inner Frame shadow/depth */}
                    <Ellipse cx="0" cy="0" rx="8" ry="12" fill={THEME.features} opacity="0.08" />

                    {/* Mirror Glass */}
                    <Ellipse cx="0" cy="0" rx="7.5" ry="11.5" fill={THEME.mGlass} />

                    {/* Practice Alignment Grid */}
                    <G opacity="0.4">
                        <Line
                            x1="-7.5"
                            y1="0"
                            x2="7.5"
                            y2="0"
                            stroke={THEME.mHandle}
                            strokeWidth="0.5"
                            strokeDasharray="1 1"
                        />
                        <Line
                            x1="0"
                            y1="-11.5"
                            x2="0"
                            y2="11.5"
                            stroke={THEME.mHandle}
                            strokeWidth="0.5"
                            strokeDasharray="1 1"
                        />
                    </G>

                    {/* Reflection Content (Clipping the elements inside the glass bounds) */}
                    <G clipPath={`url(#${clipId})`}>
                        {/* The face itself doesn't need to be duplicated here since the user 
                is looking *at* the mirror, but if you wanted a reflection, 
                it would go inside this group! */}
                    </G>
                </AnimatedG>
            </Svg>
        </View>
    );
};

export default React.memo(SparkleMirrorFace);