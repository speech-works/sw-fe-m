import React from "react";
import { ScrollView, Text, View, StyleSheet } from "react-native";
import ScreenView from "../../components/ScreenView";
import ClinicalStatsWidget from "../../components/Dashboard/ClinicalStatsWidget";
import SmartRecommendationCard from "../../components/Dashboard/SmartRecommendationCard";
import { theme } from "../../Theme/tokens";
import { parseTextStyle } from "../../util/functions/parseStyles";
const Home = () => {
  return (
    <ScreenView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scroll}>
        <View style={styles.header}>
            <Text style={styles.greeting}>Good Morning,</Text>
            <Text style={styles.subGreeting}>Mayank</Text>
        </View>
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
        paddingBottom: 40,
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
    }
});
export default Home;