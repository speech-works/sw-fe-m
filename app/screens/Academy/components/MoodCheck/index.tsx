import React, { useState, useRef, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  FlatList,
  NativeSyntheticEvent,
  NativeScrollEvent,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useNavigation } from "@react-navigation/native";
import {
  AcademyStackNavigationProp,
  AcademyStackParamList,
} from "../../../../navigators/stacks/AcademyStack/types";
import { MoodType } from "../../../../api/moodCheck/types";
import { theme } from "../../../../Theme/tokens";
import {
  parseTextStyle,
  parseShadowStyle,
} from "../../../../util/functions/parseStyles";

import AngryFace from "../../../../assets/mood-check/AngryFace";
import CalmFace from "../../../../assets/mood-check/CalmFace";
import HappyFace from "../../../../assets/mood-check/HappyFace";
import SadFace from "../../../../assets/mood-check/SadFace";

const { width } = Dimensions.get("window");

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

// Constants
const ITEM_WIDTH = width * 0.6;
const SPACING = (width - ITEM_WIDTH) / 2;

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
              { backgroundColor: emotions[currentIndex].primaryColor },
            ]}
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
          hitSlop={12}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={20} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Log</Text>
        <View style={{ width: 40 }} />
      </View>

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
                    width={180}
                    height={180}
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
                flatListRef.current?.scrollToIndex({ index, animated: true });
              }}
              style={[
                styles.moodPill,
                index === currentIndex && { backgroundColor: emo.primaryColor },
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
    </View>
  );
};

export default MoodCheck;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
    paddingTop: 60,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 24,
    marginBottom: 24,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#fff",
    justifyContent: "center",
    alignItems: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 16,
    color: theme.colors.text.default,
  },
  questionText: {
    ...parseTextStyle(theme.typography.Heading1),
    textAlign: "center",
    color: theme.colors.text.title,
    marginBottom: 20,
    lineHeight: 40,
  },
  carouselContainer: {
    height: 250,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  feedbackContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
  },
  feedbackLabel: {
    fontSize: 18,
    color: theme.colors.text.title,
    fontWeight: "500",
  },
  feedbackValue: {
    fontSize: 20,
    fontWeight: "800",
  },
  rulerContainer: {
    height: 60,
    width: "100%",
    justifyContent: "center",
    marginBottom: 30,
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
    marginBottom: 30,
  },
  pillContainer: {
    flexDirection: "row",
    backgroundColor: "#F1F5F9",
    borderRadius: 30,
    padding: 4,
    gap: 4,
  },
  moodPill: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 24,
  },
  pillText: {
    fontSize: 13,
    color: theme.colors.text.default,
    fontWeight: "500",
  },
  confirmButton: {
    marginHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 20,
    alignItems: "center",
    marginBottom: 40,
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  confirmButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
  },
});
