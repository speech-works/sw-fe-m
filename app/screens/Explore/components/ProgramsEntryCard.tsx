import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import React from "react";
import { StyleSheet, View } from "react-native";
import PressableScale from "../../../components/PressableScale";
import { ExploreStackParamList } from "../../../navigators/stacks/ExploreStack/types";
import { track } from "../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../util/analytics/analyticsEvents";
import { Text, Icon, icons, useTheme, spacing, radius } from "../../../design-system";

/**
 * Entry point into the Interview Ready pack (Phase E — purchase mechanics;
 * Phase F fills in the day-by-day content). Gated by `purchasesAvailable()` at
 * the call site (Explore/index.tsx) — there's nothing to sell unless payments
 * are on AND this platform has a RevenueCat key.
 */
const ProgramsEntryCard = () => {
  const navigation =
    useNavigation<NativeStackNavigationProp<ExploreStackParamList>>();
  const { colors } = useTheme();

  return (
    <PressableScale
      onPress={() => {
        track(ANALYTICS_EVENTS.PROGRAMS_LIST_OPENED, { source: "explore_entry" });
        navigation.navigate("Programs");
      }}
      scaleTo={0.98}
    >
      <View
        style={[
          styles.card,
          { backgroundColor: colors.surface.default, borderColor: colors.border.default },
        ]}
      >
        <View style={[styles.iconCircle, { backgroundColor: colors.premium.goldTint }]}>
          <Icon name={icons.win} size={22} color={colors.premium.gold} />
        </View>
        <View style={styles.textCol}>
          <Text variant="title" color="primary">
            Interview Ready
          </Text>
          <Text variant="bodySm" color="secondary">
            A focused 14-day program for your next interview
          </Text>
        </View>
        <Icon name="chevron-right" size={20} color={colors.text.tertiary} />
      </View>
    </PressableScale>
  );
};

export default ProgramsEntryCard;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    borderRadius: radius.card,
    borderWidth: 1,
    padding: spacing.xl,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
    gap: spacing.xxs,
  },
});
