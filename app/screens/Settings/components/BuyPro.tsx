import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../util/functions/parseStyles";
import { theme } from "../../../Theme/tokens";
import { LinearGradient } from "expo-linear-gradient";
import {
  CompositeNavigationProp,
  useNavigation,
} from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

import { SettingsStackParamList } from "../../../navigators/stacks/SettingsStack/types";
import { AcademyStackParamList } from "../../../navigators/stacks/AcademyStack/types";

const BuyPro = () => {
  // non-generic aliases for the whole stacks (easier to compose)
  type SettingsNav = NativeStackNavigationProp<SettingsStackParamList>;
  type AcademyNav = NativeStackNavigationProp<AcademyStackParamList>;

  // composite nav prop that supports routes from either stack
  type CrossNavigationProp = CompositeNavigationProp<SettingsNav, AcademyNav>;

  // usage with useNavigation
  const navigation = useNavigation<CrossNavigationProp>();

  const onSub = () => {
    navigation.navigate("PaymentStack");
  };

  return (
    <LinearGradient
      colors={["#F97316", "#EC4899"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.card}
    >
      <View style={styles.textWrapper}>
        <Text style={styles.titeText}>Exclusive Content for PRO Members</Text>
        <Text style={styles.descText}>
          Get new exercises, early access to community features, and weekly
          progress reports that keep you improving.
        </Text>
      </View>
      <TouchableOpacity style={styles.subscribeButton} onPress={onSub}>
        <Text style={styles.subscribeButtonText}>Go PRO</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

export default BuyPro;

const styles = StyleSheet.create({
  card: {
    marginBottom: 20,
    backgroundColor: "linear-gradient(90deg, #F97316 0%, #EC4899 100%)",
    borderRadius: 16,
    ...parseShadowStyle(theme.shadow.elevation1),
    padding: 24,
    // paddingTop: 20, // This can be adjusted or removed if screenContainer's paddingTop is sufficient
  },
  titeText: {
    color: "#fff",
    ...parseTextStyle(theme.typography.Heading3),
  },
  descText: {
    color: "#fff",
    ...parseTextStyle(theme.typography.BodyDetails),
  },

  subscribeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#fff",
    gap: 12,
  },
  subscribeButtonText: {
    color: theme.colors.text.title,
    ...parseTextStyle(theme.typography.Body),
    fontWeight: "700",
  },
  textWrapper: {
    marginVertical: 20,
    gap: 8,
  },
});
