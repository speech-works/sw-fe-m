import React, { useEffect, useRef, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Image,
  ScrollView,
  NativeScrollEvent,
  NativeSyntheticEvent,
} from "react-native";
import Button from "../../../components/Button";
import { parseTextStyle } from "../../../util/functions/parseFont";
import { theme } from "../../../Theme/tokens";
import CountdownTimer from "../../../components/CountdownTimer";
import Icon from "react-native-vector-icons/MaterialIcons";
import { useNavigation } from "@react-navigation/native";
import {
  HomeStackNavigationProp,
  HomeStackParamList,
} from "../../../navigators";

const SLIDE_WIDTH = 200;
const SLIDE_MARGIN_RIGHT = 12;
const TOTAL_SLIDE_WIDTH = SLIDE_WIDTH + SLIDE_MARGIN_RIGHT;

const PracticeAffirmations = () => {
  const navigation =
    useNavigation<HomeStackNavigationProp<keyof HomeStackParamList>>();
  const scrollViewRef = useRef<ScrollView>(null);
  const [currentSlide, setCurrentSlide] = useState(0);
  const [autoScrollActive, setAutoScrollActive] = useState(true);
  const AUTO_SCROLL_INTERVAL_SECS = 10;

  const slides = [
    {
      id: 1,
      image: require("../../../assets/coolGuy.png"),
      title: "EMBRACING UNIQUENESS",
      desc: "My voice is unique, and I embrace its beauty.",
      detail:
        "Celebrate the distinctiveness of your voice, fostering self-love and acceptance.",
    },
    {
      id: 2,
      image: require("../../../assets/musicCel.png"),
      title: "SPEAKING WITH CONFIDENCE",
      desc: "I am confident in expressing myself, no matter the pace.",
      detail:
        "Your confidence doesn’t depend on speed. Express thoughts at your own rhythm.",
    },
    {
      id: 3,
      image: require("../../../assets/wearMask.png"),
      title: "VALUE IN COMMUNICATION",
      desc: "Each word I speak brings me closer to being heard and understood.",
      detail: "Acknowledge the power of communication, no matter the delivery.",
    },
  ];

  const handleNextClick = () => {
    navigation.navigate("PracticeSmoothSpeech");
  };

  const handleScrollBeginDrag = (
    e: NativeSyntheticEvent<NativeScrollEvent>
  ) => {
    setAutoScrollActive(false);
  };

  useEffect(() => {
    if (!autoScrollActive) return;
    const interval = setInterval(() => {
      const nextSlide = (currentSlide + 1) % slides.length;
      setCurrentSlide(nextSlide);
      scrollViewRef.current?.scrollTo({
        x: nextSlide * TOTAL_SLIDE_WIDTH,
        animated: true,
      });
    }, AUTO_SCROLL_INTERVAL_SECS * 1000);
    return () => clearInterval(interval);
  }, [currentSlide, slides.length, autoScrollActive]);

  return (
    <View style={styles.wrapperView}>
      <View style={styles.headerWrapper}>
        <Text style={styles.userNameText}>Affirmations</Text>
      </View>
      <CountdownTimer
        totalSeconds={5 * 60}
        countdownFrom={5 * 60}
        key={currentSlide}
      />
      <View style={styles.titleTextWrapper}>
        <Text style={styles.titleText}>Read aloud</Text>
      </View>
      <ScrollView
        horizontal
        ref={scrollViewRef}
        showsHorizontalScrollIndicator={false}
        style={styles.slideScrollView}
        contentContainerStyle={styles.slideContainer}
        onScrollBeginDrag={handleScrollBeginDrag}
      >
        {slides.map((slide) => (
          <View key={slide.id} style={styles.slide}>
            <Image
              source={slide.image}
              resizeMode="contain"
              style={styles.slideImg}
            />
            <Text style={styles.slideTitle}>{slide.title}</Text>
            <Text style={styles.slideDesc}>{slide.desc}</Text>
            <Text style={styles.slideDetail}>{slide.detail}</Text>
          </View>
        ))}
      </ScrollView>
      <Button size="large" onPress={handleNextClick}>
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
    </View>
  );
};

export default PracticeAffirmations;

const styles = StyleSheet.create({
  wrapperView: { paddingHorizontal: 24, gap: 24 },
  headerWrapper: { alignItems: "center", paddingTop: 36 },
  userNameText: {
    ...parseTextStyle(theme.typography.f1.heavy_576),
    color: theme.colors.neutral[3],
  },
  titleText: {
    ...parseTextStyle(theme.typography.f4.heavy_0),
    color: theme.colors.neutral.black,
  },
  titleTextWrapper: { alignItems: "center" },
  slideScrollView: { marginVertical: 12 },
  slideContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 24,
  },
  slide: {
    padding: 12,
    borderRadius: 4,
    alignItems: "center",
    width: SLIDE_WIDTH,
    height: 200,
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
  buttonContent: { flexDirection: "row", alignItems: "center", gap: 8 },
});
