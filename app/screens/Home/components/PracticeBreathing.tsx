import { StyleSheet, Text, View, Image } from "react-native";
import React from "react";
import Button from "../../../components/Button";
import { parseTextStyle } from "../../../util/functions/parseFont";
import { theme } from "../../../Theme/tokens";
import CountdownTimer from "../../../components/CountdownTimer";
import Icon from "react-native-vector-icons/MaterialIcons";

const PracticeBreathing = () => {
  return (
    <View style={styles.wrapperView}>
      <View style={styles.headerWrapper}>
        <Text style={styles.userNameText}>Breathing</Text>
      </View>
      <View>
        <CountdownTimer
          totalSeconds={30}
          onComplete={() => alert("complete")}
        />
      </View>
      <View style={styles.titleTextWrapper}>
        <Text style={styles.titleText}>7x7x7</Text>
      </View>
      <View style={styles.slideWrapper}>
        <View style={styles.slide}>
          <View style={styles.slideImg}>
            <Image
              source={require("../../../assets/reduceStress.png")}
              resizeMode="contain"
            />
          </View>

          <Text style={styles.slideTitle}>REDUCE STRESS</Text>
          <Text style={styles.slideDesc}>Breathe in for 7 seconds</Text>
          <Text style={styles.slideDetail}>
            Inhale for 7 seconds – Breathe in slowly and deeply through your
            nose
          </Text>
        </View>
        <View style={styles.slide}>
          <View style={styles.slideImg}>
            <Image
              source={require("../../../assets/controlEmotions.png")}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.slideTitle}>CONTROL EMOTIONS</Text>
          <Text style={styles.slideDesc}>Hold your breath for 7 seconds</Text>
          <Text style={styles.slideDetail}>
            Hold for 7 seconds – Hold your breath for a count of 7 seconds
          </Text>
        </View>
        <View style={styles.slide}>
          <View style={styles.slideImg}>
            <Image
              source={require("../../../assets/improveMood.png")}
              resizeMode="contain"
            />
          </View>
          <Text style={styles.slideTitle}>IMPROVE MOOD</Text>
          <Text style={styles.slideDesc}>Breathe out slowly for 7 seconds</Text>
          <Text style={styles.slideDetail}>
            Exhale for 7 seconds – Exhale slowly and completely through your
            mouth.
          </Text>
        </View>
      </View>
      <Button size="large" onPress={() => console.log("")} disabled>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: 8,
          }}
        >
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
  slideWrapper: {
    gap: 12,
    flexDirection: "row",
  },
  slide: {
    padding: 12,
    borderRadius: 4,
    alignItems: "center",
    width: 200,
    height: 175,
    boxShadow: "0 0.96 2.87 0 rgba(0, 0, 0, 0.22)",
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
});
