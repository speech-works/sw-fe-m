import React, { useState } from "react";
import { View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { parseTextStyle } from "../util/functions/parseFont";
import { theme } from "../Theme/tokens";

interface TopTabsProps {
  tabs: { tabName: string; tabContent: React.ReactElement }[];
}

const TopTabs = ({ tabs }: TopTabsProps) => {
  const [activeTab, setActiveTab] = useState(tabs[0].tabName);

  return (
    <View style={styles.container}>
      {/* Tab Headers */}
      <View style={styles.tabHeader}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.tabName}
            onPress={() => setActiveTab(tab.tabName)}
            style={[styles.tab, activeTab === tab.tabName && styles.activeTab]}
          >
            <Text
              style={[
                styles.tabText,
                activeTab === tab.tabName && styles.activeTabText,
              ]}
            >
              {tab.tabName}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {tabs.map((tab) =>
          activeTab === tab.tabName ? (
            <React.Fragment key={tab.tabName}>{tab.tabContent}</React.Fragment>
          ) : null
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff", padding: 20 },
  tabHeader: { flexDirection: "row", marginBottom: 20 },
  tab: {
    //flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    ...parseTextStyle(theme.typography.actionButton.small),
    color: theme.colors.actionNeutral.default,
  },
  activeTabText: { color: theme.colors.actionPrimary.hover },
  activeTab: { borderBottomColor: theme.colors.actionPrimary.hover },
  content: { alignItems: "center", justifyContent: "center", flex: 1 },
});

export default TopTabs;
