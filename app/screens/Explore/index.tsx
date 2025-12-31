import React from "react";
import { StyleSheet, Text, View } from "react-native";
import ScreenView from "../../components/ScreenView";
import CustomScrollView from "../../components/CustomScrollView";
import { theme } from "../../Theme/tokens";
import { parseTextStyle } from "../../util/functions/parseStyles";

const Explore = () => {
  return (
    <ScreenView style={styles.screenView}>
      <CustomScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.title}>Explore</Text>
          <Text style={styles.subtitle}>
            Discover new ways to improve your speech.
          </Text>
        </View>

        {/* Placeholder Content */}
        <View style={styles.placeholderContainer}>
          <Text style={styles.placeholderText}>Coming Soon...</Text>
        </View>
      </CustomScrollView>
    </ScreenView>
  );
};

export default Explore;

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 130, // Space for Custom Tab Bar
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 24,
  },
  header: {
    gap: 8,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
  },
  subtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  placeholderContainer: {
    height: 200,
    backgroundColor: theme.colors.surface.elevated,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: theme.colors.border.default,
    borderStyle: "dashed",
  },
  placeholderText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.disabled,
  },
});
