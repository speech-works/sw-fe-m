import { useNavigation, useIsFocused } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  FlatList,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import Reanimated, {
  useSharedValue,
  useAnimatedStyle,
  runOnJS,
  clamp,
} from "react-native-reanimated";
import Icon from "react-native-vector-icons/FontAwesome5";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import { BlurView } from "expo-blur";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MoodType } from "../../../../api/moodCheck/types";
import {
  AcademyStackNavigationProp,
  AcademyStackParamList,
} from "../../../../navigators/stacks/AcademyStack/types";
import { theme } from "../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";

import AngryFace from "../../../../assets/mood-check/AngryFace";
import CalmFace from "../../../../assets/mood-check/CalmFace";
import HappyFace from "../../../../assets/mood-check/HappyFace";
import SadFace from "../../../../assets/mood-check/SadFace";

const { width, height } = Dimensions.get("window");

// Data
const emotions = [
  {
    id: MoodType.ANGRY,
    name: "Angry",
    icon: AngryFace,
    color: theme.colors.moodcheck.angry,
    primaryColor: "#F43F5E", // Rose 500
  },
  {
    id: MoodType.CALM,
    name: "Calm",
    icon: CalmFace,
    color: theme.colors.moodcheck.calm,
    primaryColor: "#10B981", // Emerald 500
  },
  {
    id: MoodType.HAPPY,
    name: "Happy",
    icon: HappyFace,
    color: theme.colors.moodcheck.happy,
    primaryColor: "#F59E0B", // Amber 500
  },
  {
    id: MoodType.SAD,
    name: "Sad",
    icon: SadFace,
    color: theme.colors.moodcheck.sad,
    primaryColor: "#3B82F6", // Blue 500
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
  return (
    <>
      {Array.from({ length: 40 }).map((_, i) => (
        <View
          key={i}
          style={[
            styles.rulerLine,
            i % 5 === 0 ? { height: 24, backgroundColor: "#CBD5E1" } : {},
          ]}
        />
      ))}
    </>
  );
});

const MoodCheck = () => {
  const academyNavigation =
    useNavigation<AcademyStackNavigationProp<keyof AcademyStackParamList>>();
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
  const [moodIntensity, setMoodIntensity] = useState(50);
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
    academyNavigation.navigate("MoodCheckStack", {
      screen: "FollowUpStack",
      params: { mood: activeMood.id },
    });
  };

  return (
    <View style={styles.container}>
      {/* Background Gradient */}
      <LinearGradient
        colors={[emotions[currentIndex].color, "#FFFFFF"]}
        style={StyleSheet.absoluteFillObject}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 0.6 }}
      />

      {/* Header */}
      <BlurView
        intensity={80}
        tint="light"
        style={[
          styles.header,
          { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
        ]}
      >
        <TouchableOpacity
          onPress={() => academyNavigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Log</Text>
        <View style={{ width: 32 }} />
      </BlurView>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: HEADER_HEIGHT + insets.top + 20 },
        ]}
        showsVerticalScrollIndicator={false}
        bounces={false}
      >
        <Text style={styles.questionText}>How are you feeling{"\n"}today?</Text>

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
          <Text style={styles.feedbackLabel}>I'm Feeling</Text>
          <Text
            style={[
              styles.feedbackValue,
              { color: emotions[currentIndex].primaryColor },
            ]}
          >
            {emotions[currentIndex].name}
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
                  backgroundColor: emotions[currentIndex].primaryColor,
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
          <View style={styles.pillContainer}>
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
                    backgroundColor: emo.primaryColor,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.pillText,
                    index === currentIndex && {
                      color: "white",
                      fontWeight: "700",
                    },
                  ]}
                >
                  {emo.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Main CTA */}
        <TouchableOpacity
          style={[
            styles.confirmButton,
            { backgroundColor: emotions[currentIndex].primaryColor },
          ]}
          onPress={handleSelect}
          activeOpacity={0.8}
        >
          <Text style={styles.confirmButtonText}>Submit</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
};

export default MoodCheck;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "rgba(255,255,255,0.6)",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginTop: 2,
  },
  questionText: {
    ...parseTextStyle(theme.typography.Heading1),
    textAlign: "center",
    color: theme.colors.text.title,
    marginBottom: height * 0.02,
    lineHeight: 40,
    paddingHorizontal: 20,
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
    gap: 8,
    marginBottom: height * 0.015,
  },
  feedbackLabel: {
    fontSize: Math.min(width * 0.045, 18),
    color: theme.colors.text.title,
    fontWeight: "500",
  },
  feedbackValue: {
    fontSize: Math.min(width * 0.05, 20),
    fontWeight: "800",
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
    paddingHorizontal: 20,
    position: "relative",
  },
  rulerLine: {
    width: 2,
    height: 12,
    backgroundColor: "#E2E8F0",
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
    backgroundColor: "#F1F5F9",
    borderRadius: 30,
    padding: 4,
    gap: 4,
    flexWrap: "wrap",
    justifyContent: "center",
    maxWidth: width - 40,
  },
  moodPill: {
    paddingVertical: 8,
    paddingHorizontal: Math.max(width * 0.035, 12),
    borderRadius: 24,
  },
  pillText: {
    fontSize: Math.min(width * 0.033, 13),
    color: theme.colors.text.default,
    fontWeight: "500",
  },
  confirmButton: {
    marginHorizontal: 32,
    paddingVertical: Math.max(height * 0.018, 14),
    borderRadius: 20,
    alignItems: "center",
    marginTop: height * 0.02,
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  confirmButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
});
