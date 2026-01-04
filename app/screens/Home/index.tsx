import React, { useState, useCallback } from "react";
import {
  ScrollView,
  Text,
  View,
  StyleSheet,
  RefreshControl,
} from "react-native";
import ScreenView from "../../components/ScreenView";
import ClinicalStatsWidget from "../../components/Dashboard/ClinicalStatsWidget";
import SmartRecommendationCard from "../../components/Dashboard/SmartRecommendationCard";
import { theme } from "../../Theme/tokens";
import { parseTextStyle } from "../../util/functions/parseStyles";
import ResourceStats from "../Academy/components/ResourceStats";
import { useUserStore } from "../../stores/user";
import { getMyUser } from "../../api/users";

const Home = () => {
  const { setUser } = useUserStore();
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const user = await getMyUser();
      setUser(user);
    } catch (error) {
      console.error("Failed to refresh home:", error);
    } finally {
      setRefreshing(false);
    }
  }, [setUser]);

  return (
    <ScreenView style={styles.container}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <Text style={styles.greeting}>Good Morning,</Text>
          <Text style={styles.subGreeting}>Mayank</Text>
        </View>

        <ResourceStats refreshing={refreshing} />

        <View style={{ height: 24 }} />

        <SmartRecommendationCard />

        <ClinicalStatsWidget />
      </ScrollView>
    </ScreenView>
  );
};
const styles = StyleSheet.create({
  container: {
    paddingTop: 16,
  },
  scroll: {
    paddingBottom: 130, // Space for Custom Tab Bar
  },
  header: {
    marginBottom: 8,
  },
  greeting: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.default,
  },
  subGreeting: {
    ...parseTextStyle(theme.typography.Heading1),
    color: theme.colors.text.title,
  },
});
export default Home;
