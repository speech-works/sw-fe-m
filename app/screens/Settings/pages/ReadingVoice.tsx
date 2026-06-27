import { useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import CustomScrollView from "../../../components/CustomScrollView";
import ScreenView from "../../../components/ScreenView";
import { AccentPicker } from "../../Academy/Tools/VoiceHover/AccentPicker";
import { SettingsStackNavigationProp } from "../../../navigators/stacks/SettingsStack/types";
import { useTheme, spacing, Text, IconButton } from "../../../design-system";

const ReadingVoice = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<SettingsStackNavigationProp<"ReadingVoice">>();

  return (
    <ScreenView style={[styles.screenView, { paddingHorizontal: 0, backgroundColor: colors.background.canvas }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 10, height: 60 + insets.top },
        ]}
      >
        <IconButton name="arrow-left" onPress={() => navigation.goBack()} />
      </View>

      <View style={styles.container}>
        <CustomScrollView
          contentContainerStyle={[
            styles.scrollView,
            { paddingTop: 60 + insets.top + 20 },
          ]}
        >
          <View style={styles.intro}>
            <Text variant="h1">What accent do you want to hear?</Text>
          </View>

          <AccentPicker />
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default ReadingVoice;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    backgroundColor: "transparent",
  },
  scrollView: {
    gap: spacing.xl,
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing["5xl"],
  },
  intro: {
    marginBottom: spacing.sm,
  },
});
