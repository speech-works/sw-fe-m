import { useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Icon from "react-native-vector-icons/FontAwesome5";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";

import CustomScrollView from "../../../components/CustomScrollView";
import ScreenView from "../../../components/ScreenView";
import { theme } from "../../../Theme/tokens";
import { parseTextStyle } from "../../../util/functions/parseStyles";
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
          colors={["#FFF7ED", "#FFF", "#FFF"]}
          locations={[0, 0.4, 1]}
          style={{ flex: 1 }}
        />
      </View>

      <BlurView
        intensity={80}
        tint="light"
        style={[
          styles.header,
          { paddingTop: insets.top + 10, height: 60 + insets.top },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Reading voice</Text>
        <View style={{ width: 32 }} />
      </BlurView>

      <View style={styles.container}>
        <CustomScrollView
          contentContainerStyle={[
            styles.scrollView,
            { paddingTop: 60 + insets.top + 20 },
          ]}
        >
          <View style={styles.intro}>
            <Text style={styles.introTitle}>Choose your accent</Text>
            <Text style={styles.introDesc}>
              Tap an accent to hear it and set it as your reading guide. It
              applies everywhere the Voice Hover tool is used.
            </Text>
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
    backgroundColor: "#F8FAFC",
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
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginTop: 2,
  },
  scrollView: {
    gap: 20,
    paddingHorizontal: 20,
    paddingBottom: 60,
  },
  intro: {
    gap: 6,
  },
  introTitle: {
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.text.title,
  },
  introDesc: {
    fontSize: 14,
    lineHeight: 20,
    color: "#64748B",
  },
});
