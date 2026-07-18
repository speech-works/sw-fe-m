import { useNavigation, useIsFocused } from "@react-navigation/native";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  clamp,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MoodType } from "../../../../api/moodCheck/types";
import {
  ExploreStackNavigationProp,
  ExploreStackParamList,
} from "../../../../navigators/stacks/ExploreStack/types";
import {
  SchemeStatusBar,
  Button,
  Gradient,
  IconButton,
  Text,
  icons,
  radius,
  spacing,
  useTheme,
  withAlpha,
} from "../../../../design-system";
import type { SemanticColors } from "../../../../design-system";

import AngryFace from "../../../../assets/mood-check/AngryFace";
import CalmFace from "../../../../assets/mood-check/CalmFace";
import HappyFace from "../../../../assets/mood-check/HappyFace";
import SadFace from "../../../../assets/mood-check/SadFace";

const { width, height } = Dimensions.get("window");

type AccentKey = keyof SemanticColors["accent"];
type FeedbackTextKey = keyof SemanticColors["feedback"];

// Emotion → DS accent mapping: angry→danger, calm→success, happy→warning, sad→info.
const emotions = [
  {
    id: MoodType.ANGRY,
    name: "Angry",
    icon: AngryFace,
    accentKey: "danger" as AccentKey,
    feedbackTextKey: "dangerText" as FeedbackTextKey,
  },
  {
    id: MoodType.CALM,
    name: "Calm",
    icon: CalmFace,
    accentKey: "success" as AccentKey,
    feedbackTextKey: "successText" as FeedbackTextKey,
  },
  {
    id: MoodType.HAPPY,
    name: "Happy",
    icon: HappyFace,
    accentKey: "warning" as AccentKey,
    feedbackTextKey: "warningText" as FeedbackTextKey,
  },
  {
    id: MoodType.SAD,
    name: "Sad",
    icon: SadFace,
    accentKey: "info" as AccentKey,
    feedbackTextKey: "infoText" as FeedbackTextKey,
  },
];

// Constants - Responsive sizing
const ITEM_WIDTH = width * 0.6;
const SPACING = (width - ITEM_WIDTH) / 2;
const ICON_SIZE = Math.min(width * 0.45, 180); // Scale icon based on screen width, max 180
const CAROUSEL_HEIGHT = Math.min(height * 0.28, 250); // Scale carousel based on screen height, max 250

// --- Memoized Components ---

const MoodItem = React.memo(
  ({
    item,
    index,
    currentIndex,
    scrollX,
    isFocused,
  }: {
    item: (typeof emotions)[0];
    index: number;
    currentIndex: number;
    scrollX: Animated.Value;
    isFocused: boolean;
  }) => {
    const inputRange = [
      (index - 1) * ITEM_WIDTH,
      index * ITEM_WIDTH,
      (index + 1) * ITEM_WIDTH,
    ];

    const scale = scrollX.interpolate({
      inputRange,
      outputRange: [0.6, 1.1, 0.6],
      extrapolate: "clamp",
    });

    const opacity = scrollX.interpolate({
      inputRange,
      outputRange: [0.4, 1, 0.4],
      extrapolate: "clamp",
    });

    return (
      <View
        style={{
          width: ITEM_WIDTH,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Animated.View style={{ transform: [{ scale }], opacity }}>
          <item.icon
            width={ICON_SIZE}
            height={ICON_SIZE}
            // Only trigger inner SVG animations if this is the active item and screen is focused
            shouldAnimate={isFocused && index === currentIndex}
          />
        </Animated.View>
      </View>
    );
  },
);

const RulerTicks = React.memo(() => {
  const { colors } = useTheme();
  return (
    <>
      {Array.from({ length: 40 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.rulerLine,
            { backgroundColor: colors.border.default },
            i % 5 === 0
              ? { height: 24, backgroundColor: colors.border.strong }
              : {},
          ]}
        />
      ))}
    </>
  );
});

const MoodCheck = () => {
  const { colors } = useTheme();
  const exploreNavigation =
    useNavigation<ExploreStackNavigationProp<keyof ExploreStackParamList>>();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;
  const isFocused = useIsFocused();

  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-scroll to center index 0 on mount if needed, or just let it start there.
  // We start at index 0, but centering logic handles the padding.

  const handleScroll = useRef(
    Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
      useNativeDriver: true,
    }),
  ).current;

  // Replaced highly active viewability callback with MomentumScrollEnd for JS Thread savings
  const handleMomentumScrollEnd = (event: any) => {
    const offsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(offsetX / ITEM_WIDTH);
    if (index >= 0 && index < emotions.length && index !== currentIndex) {
      setCurrentIndex(index);
    }
  };

  // Mood Intensity State (0-100)
  const [, setMoodIntensity] = useState(50);
  const rulerWidth = width - 40; // Approx ruler track width (paddingHorizontal: 20 * 2)

  // Reanimated shared values
  const activeIntensity = useSharedValue(50);

  const updateMoodState = (val: number) => {
    setMoodIntensity(Math.round(val));
  };

  const panGesture = Gesture.Pan()
    .onStart((event) => {
      let pct = (event.x / rulerWidth) * 100;
      activeIntensity.value = clamp(pct, 0, 100);
      runOnJS(updateMoodState)(activeIntensity.value);
    })
    .onUpdate((event) => {
      let pct = (event.x / rulerWidth) * 100;
      activeIntensity.value = clamp(pct, 0, 100);
    })
    .onEnd(() => {
      runOnJS(updateMoodState)(activeIntensity.value);
    });

  const rIndicatorStyle = useAnimatedStyle(() => {
    return {
      left: `${activeIntensity.value}%`,
    };
  });

  const handleSelect = () => {
    const activeMood = emotions[currentIndex];
    exploreNavigation.navigate("MoodCheckStack", {
      screen: "FollowUpStack",
      params: { mood: activeMood.id },
    });
  };

  const currentEmotion = emotions[currentIndex];
  const currentAccentKey = currentEmotion.accentKey;

  return (
    <View
      style={[styles.container, { backgroundColor: colors.background.canvas }]}
    >
      <SchemeStatusBar />

      {/* Background glow — subtle top wash of the current mood accent on the dark canvas */}
      <Gradient
        colors={[
          withAlpha(colors.accent[currentAccentKey], 0.16),
          colors.background.canvas,
        ]}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
        style={StyleSheet.absoluteFillObject}
        pointerEvents="none"
      />

      {/* Header — standard back button, no title (matches every other screen). */}
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
        ]}
      >
        <IconButton name={icons.back} onPress={() => exploreNavigation.goBack()} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: HEADER_HEIGHT + insets.top + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text variant="h1" color="primary" center style={styles.questionText}>
          How are you feeling{"\n"}today?
        </Text>

        {/* Carousel */}
        <View style={styles.carouselContainer}>
          <Animated.FlatList
            ref={flatListRef}
            data={emotions}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            snapToInterval={ITEM_WIDTH}
            decelerationRate="fast"
            contentContainerStyle={{
              paddingHorizontal: SPACING,
            }}
            onScroll={handleScroll}
            onMomentumScrollEnd={handleMomentumScrollEnd}
            extraData={{ currentIndex, isFocused }}
            renderItem={({ item, index }) => (
              <MoodItem
                item={item}
                index={index}
                currentIndex={currentIndex}
                scrollX={scrollX}
                isFocused={isFocused}
              />
            )}
          />
        </View>

        {/* Indicator Text */}
        <View style={styles.feedbackContainer}>
          <Text variant="body" color="secondary">
            I'm Feeling
          </Text>
          <Text variant="title" color={colors.feedback[currentEmotion.feedbackTextKey]}>
            {currentEmotion.name}
          </Text>
        </View>

        {/* Ruler Track (Memoized out of render loop) */}
        <View style={styles.rulerContainer}>
          <View style={styles.rulerTrack}>
            <RulerTicks />
            {/* Active Indicator Line */}
            <Reanimated.View
              style={[
                styles.activeIndicator,
                {
                  backgroundColor: colors.accent[currentAccentKey],
                },
                rIndicatorStyle,
              ]}
            />

            {/* Transparent Overlay for Gestures */}
            <GestureDetector gesture={panGesture}>
              <Reanimated.View style={StyleSheet.absoluteFill} />
            </GestureDetector>
          </View>
        </View>

        {/* Bottom Tabs/Button */}
        <View style={styles.bottomControls}>
          <View
            style={[
              styles.pillContainer,
              { backgroundColor: colors.surface.control },
            ]}
          >
            {emotions.map((emo, index) => (
              <TouchableOpacity
                key={emo.id}
                onPress={() => {
                  flatListRef.current?.scrollToIndex({
                    index,
                    animated: true,
                    viewPosition: 0.5, // Center the item
                  });
                }}
                style={[
                  styles.moodPill,
                  index === currentIndex && {
                    backgroundColor: colors.accent[emo.accentKey],
                  },
                ]}
              >
                <Text
                  variant={index === currentIndex ? "label" : "bodySm"}
                  color={
                    index === currentIndex
                      ? colors.accentOn[emo.accentKey]
                      : "secondary"
                  }
                >
                  {emo.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Main CTA */}
        <View style={styles.confirmButton}>
          <Button
            label="Submit"
            onPress={handleSelect}
            accentColor={colors.accent[currentAccentKey]}
            onAccentColor={colors.accentOn[currentAccentKey]}
          />
        </View>
      </ScrollView>
    </View>
  );
};

export default MoodCheck;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: spacing.lg,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
  },
  headerTitle: {
    marginTop: 2,
  },
  questionText: {
    marginBottom: height * 0.02,
    lineHeight: 40,
    paddingHorizontal: spacing.lg,
  },
  carouselContainer: {
    height: CAROUSEL_HEIGHT,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: height * 0.02,
  },
  feedbackContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    marginBottom: height * 0.015,
  },
  rulerContainer: {
    height: 60,
    width: "100%",
    justifyContent: "center",
    marginBottom: height * 0.025,
    overflow: "hidden",
  },
  rulerTrack: {
    flexDirection: "row",
    justifyContent: "space-evenly",
    alignItems: "flex-end",
    height: 40,
    paddingHorizontal: spacing.lg,
    position: "relative",
  },
  rulerLine: {
    width: 2,
    height: 12,
    borderRadius: 1,
  },
  activeIndicator: {
    position: "absolute",
    left: "50%",
    bottom: 0,
    width: 4,
    height: 50,
    borderRadius: 2,
    marginLeft: -2, // Center it
  },
  bottomControls: {
    alignItems: "center",
    marginBottom: height * 0.025,
  },
  pillContainer: {
    flexDirection: "row",
    borderRadius: radius.pill,
    padding: 4,
    gap: 4,
    flexWrap: "wrap",
    justifyContent: "center",
    maxWidth: width - 40,
  },
  moodPill: {
    paddingVertical: spacing.sm,
    paddingHorizontal: Math.max(width * 0.035, 12),
    borderRadius: radius.card,
  },
  confirmButton: {
    marginHorizontal: 32,
    marginTop: height * 0.02,
  },
});
