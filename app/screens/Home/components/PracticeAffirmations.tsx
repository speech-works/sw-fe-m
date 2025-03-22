import { StyleSheet, Text, View, Image } from "react-native";
import React from "react";
import Button from "../../../components/Button";
import { parseTextStyle } from "../../../util/functions/parseFont";
import { theme } from "../../../Theme/tokens";
import CountdownTimer from "../../../components/CountdownTimer";
import Icon from "react-native-vector-icons/MaterialIcons";

const PracticeAffirmations = () => {
  return (
    <View style={styles.wrapperView}>
      <View style={styles.headerWrapper}>
        <Text style={styles.userNameText}>Affirmations</Text>
      </View>
      <View>
        <CountdownTimer
          totalSeconds={30}
          onComplete={() => {
            // alert('Timer completed');
          }}
        />
      </View>
      <View style={styles.titleTextWrapper}>
        <Text style={styles.titleText}>Read aloud</Text>
      </View>
      <View style={styles.slideWrapper}>
        <View style={styles.slide}>
          <Image
            source={require("../../../assets/coolGuy.png")}
            resizeMode="contain"
            style={styles.slideImg}
          />

          <Text style={styles.slideTitle}>EMBRACING UNIQUENESS</Text>
          <Text style={styles.slideDesc}>
            My voice is unique, and I embrace its beauty.
          </Text>
          <Text style={styles.slideDetail}>
            Celebrate the distinctiveness of your voice. This affirmation helps
            you view your speech as a unique part of your identity, fostering
            self-love and acceptance.
          </Text>
        </View>
        <View style={styles.slide}>
          <Image
            source={require("../../../assets/musicCel.png")}
            resizeMode="contain"
            style={styles.slideImg}
          />
          <Text style={styles.slideTitle}>SPEAKING WITH CONFIDENCE</Text>
          <Text style={styles.slideDesc}>
            I am confident in expressing myself, no matter the pace.
          </Text>
          <Text style={styles.slideDetail}>
            Remind yourself that your confidence doesn’t depend on the speed of
            your speech. You are empowered to share your thoughts at your own
            rhythm.
          </Text>
        </View>
        <View style={styles.slide}>
          <Image
            source={require("../../../assets/wearMask.png")}
            resizeMode="contain"
            style={styles.slideImg}
          />
          <Text style={styles.slideTitle}>VALUE IN COMMUNICATION</Text>
          <Text style={styles.slideDesc}>
            Each word I speak brings me closer to being heard and understood.
          </Text>
          <Text style={styles.slideDetail}>
            Acknowledge the importance of your words. This affirmation
            highlights the power of communication, no matter the delivery.
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

export default PracticeAffirmations;

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
    height: 225,
    boxShadow: "0 0.96 2.87 0 rgba(0, 0, 0, 0.22)",
  },
  slideImg: {
    height: 50,
    width: 50,
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
