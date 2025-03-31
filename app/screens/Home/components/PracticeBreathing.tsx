import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View, Image } from "react-native";
import Button from "../../../components/Button";
import { parseTextStyle } from "../../../util/functions/parseFont";
import { theme } from "../../../Theme/tokens";
import CountdownTimer from "../../../components/CountdownTimer";
import Icon from "react-native-vector-icons/MaterialIcons";
import { ScrollView } from "react-native";

// Define a constant for the slide width (you could also calculate dynamically if slides have a fixed width)
const SLIDE_WIDTH = 200;
const SLIDE_MARGIN_RIGHT = 12;
const TOTAL_SLIDE_WIDTH = SLIDE_WIDTH + SLIDE_MARGIN_RIGHT;

const PracticeBreathing = () => {
  const [breathing, setBreathing] = useState<boolean>(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [breathingCycle, setBreathingCycle] = useState(0);

  // Hard-coded slides data (could be fetched or generated)
  const slides = [
    {
      id: 1,
      image: require("../../../assets/reduceStress.png"),
      title: "REDUCE STRESS",
      desc: "Breathe in for 7 seconds",
      detail:
        "Inhale for 7 seconds – Breathe in slowly and deeply through your nose",
    },
    {
      id: 2,
      image: require("../../../assets/controlEmotions.png"),
      title: "CONTROL EMOTIONS",
      desc: "Hold your breath for 7 seconds",
      detail: "Hold for 7 seconds – Hold your breath for a count of 7 seconds",
    },
    {
      id: 3,
      image: require("../../../assets/improveMood.png"),
      title: "IMPROVE MOOD",
      desc: "Breathe out slowly for 7 seconds",
      detail:
        "Exhale for 7 seconds – Exhale slowly and completely through your mouth.",
    },
  ];

  // Auto-scroll interval in seconds; you can pass this as a prop if needed.
  const autoScrollInterval = 7; // seconds

  const handleStartBreathing = () => {
    setBreathing(true);
  };

  // Auto-scroll effect: scroll to next slide every autoScrollInterval seconds
  useEffect(() => {
    if (!breathing) return;
    const interval = setInterval(() => {
      const nextSlide = (currentSlide + 1) % slides.length;
      setCurrentSlide(nextSlide);
      scrollViewRef.current?.scrollTo({
        x: nextSlide * TOTAL_SLIDE_WIDTH,
        animated: true,
      });
    }, autoScrollInterval * 1000);
    return () => clearInterval(interval);
  }, [currentSlide, slides.length, autoScrollInterval, breathing]);

  useEffect(() => {
    return () => {
      setBreathing(false);
      setBreathingCycle(0);
    };
  }, []);

  useEffect(() => {
    if (currentSlide === 0) {
      setBreathingCycle((prev) => prev + 1);
    }
  }, [currentSlide]);

  useEffect(() => {
    if (breathingCycle >= 2) {
      setBreathing(false);
    }
  }, [breathingCycle]);

  return (
    <View style={styles.wrapperView}>
      <View style={styles.headerWrapper}>
        <Text style={styles.userNameText}>Breathing</Text>
      </View>
      <View>
        <CountdownTimer
          totalSeconds={autoScrollInterval}
          countdownFrom={autoScrollInterval}
          autoStart={breathing}
          key={currentSlide}
        />
      </View>
      <View style={styles.titleTextWrapper}>
        <Text style={styles.titleText}>7x7x7</Text>
      </View>
      {/* Slide container wrapped in horizontal ScrollView */}
      <ScrollView
        horizontal
        ref={scrollViewRef}
        showsHorizontalScrollIndicator={false}
        style={styles.slideScrollView}
        contentContainerStyle={styles.slideContainer}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={styles.slide}>
            <View style={styles.slideImg}>
              <Image source={slide.image} resizeMode="contain" />
            </View>
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideDesc}>{slide.desc}</Text>
            <Text style={styles.slideDetail}>{slide.detail}</Text>
          </View>
        ))}
      </ScrollView>
      {!breathing ? (
        <Button size="large" onPress={handleStartBreathing}>
          <View style={styles.buttonContent}>
            <Text
              style={{
                ...parseTextStyle(theme.typography.actionButton.large),
                color: theme.colors.neutral.white,
              }}
            >
              {breathingCycle > 1 ? "Breathe More" : "Start Breathing"}
            </Text>
          </View>
        </Button>
      ) : null}
      {breathingCycle > 1 ? (
        <Button size="large" onPress={() => console.log("Next pressed")}>
          <View style={styles.buttonContent}>
            <Text
              style={{
                ...parseTextStyle(theme.typography.actionButton.large),
                color: theme.colors.neutral.white,
              }}
            >
              Next
            </Text>
            <Icon name="east" size={20} color="white" />
          </View>
        </Button>
      ) : null}
    </View>
  );
};

export default PracticeBreathing;

const styles = StyleSheet.create({
  wrapperView: { paddingHorizontal: 24, gap: 24 },
  headerWrapper: {
    alignItems: "center",
    paddingTop: 36,
  },
  userNameText: {
    ...parseTextStyle(theme.typography.f1.heavy_576),
    color: theme.colors.neutral[3],
  },
  titleText: {
    ...parseTextStyle(theme.typography.f4.heavy_0),
    color: theme.colors.neutral.black,
  },
  titleTextWrapper: {
    alignItems: "center",
  },
  slideScrollView: {
    marginVertical: 12,
  },
  slideContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 24, // Ensure there's some spacing at the end
  },
  slide: {
    padding: 12,
    borderRadius: 4,
    alignItems: "center",
    width: SLIDE_WIDTH,
    height: 175,
    marginRight: SLIDE_MARGIN_RIGHT,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  slideImg: {
    height: 50,
    width: 50,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.neutral[8],
    borderRadius: 4,
    marginBottom: 12,
  },
  slideTitle: {
    ...parseTextStyle(theme.typography.paragraphTiny.heavy),
    color: theme.colors.neutral[2],
    marginBottom: 2,
  },
  slideDesc: {
    ...parseTextStyle(theme.typography.paragraphSmall.heavy),
    color: theme.colors.primary[100],
    textAlign: "center",
    marginBottom: 10,
  },
  slideDetail: {
    ...parseTextStyle(theme.typography.paragraphTiny.light),
    color: theme.colors.neutral[2],
    textAlign: "center",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
});
