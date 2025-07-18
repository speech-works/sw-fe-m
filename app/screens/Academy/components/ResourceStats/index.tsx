import { StyleSheet, Text, View } from "react-native";
import React from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";
import { theme } from "../../../../Theme/tokens";
import ProgressBar from "../../../../components/ProgressBar";
import { useUserStore } from "../../../../stores/user";

const ResourceStats = () => {
  const { user } = useUserStore();
  return (
    <View style={styles.wrapper}>
      <Text style={styles.titleText}>Your Stats</Text>
      <Text style={styles.descText}>Last updated: Today, 9:30 AM</Text>
      <View style={styles.statsContainer}>
        <View style={styles.card}>
          <View style={styles.innerCardWrapper}>
            <View style={styles.cardInfo}>
              <Text style={styles.statsTitleText}>Free Tasks</Text>
              <Text style={styles.valueText}>{user?.freeTasksRemaining}</Text>
            </View>
          </View>
          <Text style={styles.descText}>Resets tomorrow</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.innerCardWrapper}>
            <View style={styles.cardInfo}>
              <Text style={styles.statsTitleText}>Stamina</Text>
              <Text style={styles.valueText}>{user?.currentStamina}</Text>
            </View>
            <Icon
              solid
              name="bolt"
              size={32}
              color={theme.colors.actionPrimary.default}
            />
          </View>
          <ProgressBar
            currentStep={75}
            totalSteps={100}
            showStepIndicator={false}
            showPercentage={false}
            themeStyle="light"
          />
          <Text style={styles.descText}>Recharges fully in 2h 40m</Text>
        </View>
      </View>
      <View style={styles.card}>
        <View style={styles.innerCardWrapper}>
          <View style={styles.cardInfo}>
            <Text style={styles.statsTitleText}>XP Earned</Text>
            <Text style={styles.valueText}>{user?.totalXp}</Text>
          </View>
          <Icon
            solid
            name="star"
            size={32}
            color={theme.colors.actionPrimary.default}
          />
        </View>
        <Text style={styles.descText}>Level {user?.level}</Text>
        <ProgressBar
          currentStep={(user?.totalXp || 0) * 25}
          totalSteps={100}
          showStepIndicator={false}
          showPercentage={false}
          themeStyle="light"
        />
        <Text style={styles.descText}>
          You are 75% towards your next level!
        </Text>
      </View>
    </View>
  );
};

export default ResourceStats;

const styles = StyleSheet.create({
  wrapper: { gap: 16 },
  card: {
    borderRadius: 16,
    padding: 14,
    gap: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  innerCardWrapper: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardInfo: {},
  cardIcon: {},
  titleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  descText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  valueText: {
    color: theme.colors.text.title,
    ...parseTextStyle(theme.typography.Heading2),
  },
  statsTitleText: {
    ...parseTextStyle(theme.typography.Body),
    fontWeight: "600",
    color: theme.colors.text.default,
  },
  statsContainer: {
    flexDirection: "row",
    gap: 16,
  },
});
