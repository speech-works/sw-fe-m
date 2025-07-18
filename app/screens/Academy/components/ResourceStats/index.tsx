import { StyleSheet, Text, View } from "react-native";
import React, { useState, useEffect, useCallback } from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";
import { theme } from "../../../../Theme/tokens";
import ProgressBar from "../../../../components/ProgressBar";
import { useUserStore } from "../../../../stores/user";
import { getMyUser } from "../../../../api/users";

const MAX_STAMINA = 80;
const STAMINA_RECHARGE_RATE_MINUTES = 18; // 1 stamina point every 18 minutes

// Helper function to format the last updated time
const formatLastUpdated = (date: Date | null) => {
  if (!date) {
    return "Never";
  }

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  const updatedDate = new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate()
  );

  const options = {
    hour: "2-digit" as const,
    minute: "2-digit" as const,
    hour12: true,
  };
  const timeString = date.toLocaleTimeString("en-US", options);

  if (updatedDate.getTime() === today.getTime()) {
    return `Today, ${timeString}`;
  } else if (updatedDate.getTime() === yesterday.getTime()) {
    return `Yesterday, ${timeString}`;
  } else {
    // For dates older than yesterday
    const dateOptions = {
      month: "short" as const,
      day: "numeric" as const,
      year: "numeric" as const,
    };
    const dateString = date.toLocaleDateString("en-US", dateOptions);
    return `${dateString}, ${timeString}`;
  }
};

interface ResourceStatsProps {
  refreshing: boolean;
}

const ResourceStats = ({ refreshing }: ResourceStatsProps) => {
  const { user, setUser } = useUserStore();
  const [remainingRechargeMinutes, setRemainingRechargeMinutes] = useState<
    number | null
  >(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const fetchAndSetUser = useCallback(() => {
    getMyUser()
      .then((user) => {
        console.log("user fetched in Academy:", user);
        setUser(user);
        setLastUpdated(new Date());
      })
      .catch((error) => {
        console.error("Error fetching current user:", error);
      });
  }, [setUser]);

  useEffect(() => {
    fetchAndSetUser();
  }, [fetchAndSetUser]);

  useEffect(() => {
    if (refreshing) {
      console.log("Refreshing ResourceStats component");
      fetchAndSetUser();
    }
  }, [refreshing, fetchAndSetUser]);

  useEffect(() => {
    const calculateAndSetRechargeMinutes = () => {
      if (
        user?.currentStamina === undefined ||
        user.currentStamina >= MAX_STAMINA
      ) {
        setRemainingRechargeMinutes(0); // Fully recharged
        return;
      }

      const staminaNeeded = MAX_STAMINA - user.currentStamina;
      const totalRechargeMinutes =
        staminaNeeded * STAMINA_RECHARGE_RATE_MINUTES;
      setRemainingRechargeMinutes(totalRechargeMinutes);
    };

    calculateAndSetRechargeMinutes();

    const interval = setInterval(() => {
      setRemainingRechargeMinutes((prevMinutes) => {
        if (prevMinutes === null || prevMinutes <= 0) {
          clearInterval(interval);
          return 0;
        }
        return prevMinutes - 1;
      });
    }, 60 * 1000);

    return () => clearInterval(interval);
  }, [user?.currentStamina]);

  // Format the remaining minutes into "Hh Mm" string for display
  const formatRechargeTime = (minutes: number | null) => {
    if (minutes === null) {
      return "Calculating...";
    }
    if (minutes <= 0) {
      return "Fully recharged ⚡";
    }

    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;

    if (hours > 0) {
      return `Recharges fully in ${hours}h ${remainingMinutes}m`;
    } else {
      return `Recharges fully in ${remainingMinutes}m`;
    }
  };

  const staminaPercentage = user?.currentStamina
    ? Math.floor((user.currentStamina / MAX_STAMINA) * 100)
    : 0;

  return (
    <View style={styles.wrapper}>
      <View style={styles.titleRow}>
        <Text style={styles.titleText}>Your Stats</Text>
      </View>

      <Text style={styles.descText}>
        Last updated: {formatLastUpdated(lastUpdated)}
      </Text>

      <View style={styles.statsContainer}>
        <View
          style={[
            styles.card,
            {
              justifyContent: "space-between",
            },
          ]}
        >
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
              <Text style={styles.valueText}>{staminaPercentage}%</Text>
            </View>
            <Icon
              solid
              name="bolt"
              size={32}
              color={theme.colors.actionPrimary.default}
            />
          </View>
          <ProgressBar
            currentStep={user?.currentStamina || 0}
            totalSteps={MAX_STAMINA}
            showStepIndicator={false}
            showPercentage={false}
            themeStyle="light"
          />
          <Text style={styles.descText}>
            {formatRechargeTime(remainingRechargeMinutes)}
          </Text>
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
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  card: {
    borderRadius: 16,
    padding: 14,
    flex: 1, // Added flex: 1 to make cards share space equally
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
