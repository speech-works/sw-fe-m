import { StyleSheet, Text, View } from "react-native";
import React, { useEffect } from "react";
import Button from "../../components/Button";
import { parseTextStyle } from "../../util/functions/parseFont";
import { theme } from "../../Theme/tokens";
import CountdownTimer from "../../components/CountdownTimer";
import Stepper from "../../components/Stepper";
import { useUserStore } from "../../stores/user";

const Home = () => {
  const user = useUserStore((state) => state.user);
  console.log("user in home", user);
  useEffect(() => {
    console.log("Home screen mounted");
  }, []);
  return (
    <View style={styles.wrapperView}>
      <View style={styles.userNameWrapper}>
        <Text style={styles.userNameText}>
          Hi, {`${user?.name.split(" ")[0]}`}
        </Text>
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
        <Text style={styles.titleText}>Today's practice</Text>
      </View>
      <View>
        <Stepper
          steps={[
            { name: "[B] Breathing", completed: true },
            { name: "[A] Affirmation", completed: true },
            { name: "[S] Smooth Speech", completed: false },
            { name: "[E] Exposure", completed: false },
          ]}
        />
      </View>
      <View style={styles.buttonWrapper}>
        <Button size="large" variant="ghost" onPress={() => console.log("")}>
          <Text>Resume practice</Text>
        </Button>
        <Button size="large" onPress={() => console.log("")}>
          <Text>Restart practice</Text>
        </Button>
      </View>
    </View>
  );
};

export default Home;

const styles = StyleSheet.create({
  wrapperView: {
    paddingHorizontal: 24,
    gap: 24,
    backgroundColor: theme.colors.neutral.white,
  },
  userNameWrapper: {
    alignItems: "center",
    paddingTop: 36,
  },
  userNameText: {
    ...parseTextStyle(theme.typography.f1.heavy_576),
    color: theme.colors.neutral[3],
  },
  buttonWrapper: {
    gap: 12,
  },
  titleText: {
    ...parseTextStyle(theme.typography.f4.heavy_0),
    color: theme.colors.neutral.black,
  },
  titleTextWrapper: {
    alignItems: "center",
  },
});
