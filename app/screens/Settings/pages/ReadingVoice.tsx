import { useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/FontAwesome5";
import { LinearGradient } from "expo-linear-gradient";

import CustomScrollView from "../../../components/CustomScrollView";
import ScreenView from "../../../components/ScreenView";
import { AccentPicker } from "../../Academy/Tools/VoiceHover/AccentPicker";
import { SettingsStackNavigationProp } from "../../../navigators/stacks/SettingsStack/types";

const ReadingVoice = () => {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<SettingsStackNavigationProp<"ReadingVoice">>();

  return (
    <ScreenView style={[styles.screenView, { paddingHorizontal: 0 }]}>
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#121212", "#121212", "#121212"]}
          locations={[0, 0.4, 1]}
          style={{ flex: 1 }}
        />
      </View>

      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 10, height: 60 + insets.top },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        <CustomScrollView
          contentContainerStyle={[
            styles.scrollView,
            { paddingTop: 60 + insets.top + 20 },
          ]}
        >
          <View style={styles.intro}>
            <Text style={styles.introTitle}>What accent do you want to hear?</Text>
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
    backgroundColor: "#121212",
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
    paddingHorizontal: 20,
    backgroundColor: "transparent",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2C2C2E",
  },
  scrollView: {
    gap: 20,
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  intro: {
    gap: 4,
    marginBottom: 10,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
