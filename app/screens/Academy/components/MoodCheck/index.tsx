import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useRef, useState } from "react";
import {
    Animated,
    Dimensions,
    FlatList,
    NativeScrollEvent,
    NativeSyntheticEvent,
    PanResponder,
    ScrollView,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
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

const MoodCheck = () => {
  const academyNavigation =
    useNavigation<AcademyStackNavigationProp<keyof AcademyStackParamList>>();

  const scrollX = useRef(new Animated.Value(0)).current;
  const flatListRef = useRef<FlatList>(null);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Auto-scroll to center index 0 on mount if needed, or just let it start there.
  // We start at index 0, but centering logic handles the padding.

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], {
      useNativeDriver: false,
    })(event);
  };

  const onViewableItemsChanged = useRef(({ viewableItems }: any) => {
    if (viewableItems.length > 0) {
      setCurrentIndex(viewableItems[0].index ?? 0);
    }
  }).current;

  // Mood Intensity State (0-100)
  const [moodIntensity, setMoodIntensity] = useState(50);
  const rulerWidth = width - 40; // Approx ruler track width (paddingHorizontal: 20 * 2)

  // We need a ref for the initial value on gesture start to make the sliding smooth

  // Let's rewrite the PanResponder to be properly self-contained
  const panResponderRef = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      // Handle both GranT (Tap) and Move (Drag) with same logic
      onPanResponderGrant: (evt) => {
        const { locationX } = evt.nativeEvent;
        // locationX is now relative to the Overlay View, which matches the ruler width
        const effectiveX = locationX - 20; // 20 is left padding
        const pct = (effectiveX / rulerWidth) * 100;
        const clamped = Math.max(0, Math.min(100, pct));

        setMoodIntensity(clamped);
      },
      onPanResponderMove: (evt) => {
        const { locationX } = evt.nativeEvent;
        const effectiveX = locationX - 20;
        const pct = (effectiveX / rulerWidth) * 100;
        const clamped = Math.max(0, Math.min(100, pct));

        setMoodIntensity(clamped);
      },
    })
  ).current;

  // Update initial ref when state changes outside of gesture (rare here but good practice)

  // Ruler Component
  const Ruler = () => {
    const lines = Array.from({ length: 40 }); // Ruler Lines
    return (
      <View style={styles.rulerContainer}>
        <View style={styles.rulerTrack}>
          {lines.map((_, i) => (
            <View
              key={i}
              style={[
                styles.rulerLine,
                // Make center line (approx) colored/taller?
                // Getting visually close to the image, standard uniform lines is safer first.
                i % 5 === 0 ? { height: 24, backgroundColor: "#CBD5E1" } : {},
              ]}
            />
          ))}
          {/* Active Indicator Line */}
          <View
            style={[
              styles.activeIndicator,
              {
                backgroundColor: emotions[currentIndex].primaryColor,
                left: `${moodIntensity}%`, // Use percentage for positioning
              },
            ]}
          />

          {/* Transparent Overlay for Gestures */}
          <View
            style={StyleSheet.absoluteFill}
            {...panResponderRef.panHandlers}
          />
        </View>
      </View>
    );
  };

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
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => academyNavigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Log</Text>
        <View style={{ width: 32 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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
            onViewableItemsChanged={onViewableItemsChanged}
            viewabilityConfig={{ itemVisiblePercentThreshold: 50 }}
            renderItem={({ item, index }) => {
              const inputRange = [
                (index - 1) * ITEM_WIDTH,
                index * ITEM_WIDTH,
                (index + 1) * ITEM_WIDTH,
              ];

              const scale = scrollX.interpolate({
                inputRange,
                outputRange: [0.6, 1.1, 0.6], // Active item is larger
                extrapolate: "clamp",
              });

              const opacity = scrollX.interpolate({
                inputRange,
                outputRange: [0.4, 1, 0.4], // Active item is opaque
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
                      shouldAnimate={index === currentIndex}
                    />
                  </Animated.View>
                </View>
              );
            }}
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

        {/* Ruler */}
        <Ruler />

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
          <Text style={styles.confirmButtonText}>Continue</Text>
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
    paddingTop: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 10,
    marginBottom: height * 0.02,
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
