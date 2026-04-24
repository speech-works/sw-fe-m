import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import BottomSheetModal from "../../../../components/BottomSheetModal";
import CustomScrollView from "../../../../components/CustomScrollView";
import ScreenView from "../../../../components/ScreenView";
import { theme } from "../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";
import ContactSupport from "./ContactSupport";
import Feedback from "./Feedback";
import ReportProblem from "./ReportProblem";

type SettingType =
  | "Report Problem"
  | "Contact Support"
  | "Feedback";

const Support = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;
  const supportItems = [
    {
      type: "ReportProblem" as const,
      icon: "bug",
      iconColor: "#EA580C",
      bgColor: "#FFF7ED",
      title: "Report A Problem",
      desc: "Let us know what needs fixing",
    },
    {
      type: "ContactSupport" as const,
      icon: "headset",
      iconColor: "#2563EB",
      bgColor: "#EFF6FF",
      title: "Contact Support",
      desc: "Reach out to our support team",
    },
    {
      type: "Feedback" as const,
      icon: "lightbulb",
      iconColor: "#DB2777",
      bgColor: "#FDF2F8",
      title: "Feedback & Suggestions",
      desc: "How can we improve?",
    },
  ];

    return (
        <ScreenView style={[styles.screenView, { paddingHorizontal: 0 }]}>
            {/* Aurora Background */}
            <View style={StyleSheet.absoluteFillObject}>
                <LinearGradient
                    colors={["#FFF7ED", "#FFF", "#FFF"] as const}
                    locations={[0, 0.4, 1]}
                    style={{ flex: 1 }}
                />
            </View>

            <View style={styles.container}>
                {/* Header */}
                <BlurView
                    intensity={80}
                    tint="light"
                    style={[
                        styles.header,
                        { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
                    ]}
                >
                    <TouchableOpacity
                        onPress={() => navigation.goBack()}
                        style={styles.backButton}
                    >
                        <Icon
                            name="chevron-left"
                            size={16}
                            color={theme.colors.text.title}
                        />
                    </TouchableOpacity>
                    <Text style={styles.headerTitle}>Help & Support</Text>
                    <View style={{ width: 32 }} />
                </BlurView>

                <CustomScrollView
                    contentContainerStyle={[
                        styles.scrollView,
                        { paddingTop: HEADER_HEIGHT + insets.top + 20 },
                    ]}
                >
                    {/* Professional List Menu */}
                    <View style={styles.listContainer}>
                        {supportItems.map((item, index) => (
                            <TouchableOpacity
                                key={index}
                                style={styles.listItem}
                                onPress={() => {
                                    navigation.navigate(item.type as any);
                                }}
                                activeOpacity={0.7}
                            >
                                <View style={[styles.listIconContainer, { backgroundColor: item.bgColor }]}>
                                    <Icon
                                        name={item.icon}
                                        size={20}
                                        color={item.iconColor}
                                    />
                                </View>
                                <View style={styles.listTextContainer}>
                                    <Text style={styles.listItemText}>{item.title}</Text>
                                    <Text style={styles.listItemDesc}>{item.desc}</Text>
                                </View>
                                <Icon name="chevron-right" size={16} color="#94A3B8" />
                                {index < supportItems.length - 1 && <View style={styles.divider} />}
                            </TouchableOpacity>
                        ))}
                    </View>
                </CustomScrollView>
            </View>
        </ScreenView>
    );
};

export default Support;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
    backgroundColor: "#F8FAFC",
  },
  container: {
    gap: 24,
    flex: 1,
    paddingTop: 8,
  },
  topNavigation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    marginBottom: 8,
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
    paddingBottom: 40,
  },
  listContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 8,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  listItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 16,
    position: "relative",
  },
  listIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  listTextContainer: {
    flex: 1,
  },
  listItemText: {
    fontSize: 16,
    fontWeight: "700",
    color: theme.colors.text.title,
    marginBottom: 2,
  },
  listItemDesc: {
    fontSize: 13,
    color: "#64748B",
  },
  divider: {
    position: "absolute",
    bottom: 0,
    left: 76,
    right: 16,
    height: 1,
    backgroundColor: "#F1F5F9",
  },

  modalContent: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingTop: 44, // Increased to clear handle
    paddingBottom: 24,
    paddingHorizontal: 24,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    gap: 16,
    position: "relative",
    overflow: "hidden",
  },
  modalHeaderBubble: {
    position: "absolute",
    top: -20,
    right: -20,
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(255, 255, 255, 0.4)",
  },
  modalHeaderBubbleSmall: {
    position: "absolute",
    bottom: -10,
    left: 40,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.2)",
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  modalTitleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    fontSize: 20,
    fontWeight: "800",
    flex: 1,
    marginTop: 4, // Slight nudge for alignment with icon
  },
  modalBody: {
    flex: 1,
    paddingTop: 12,
  },

  // Success Modal Styles
  successContainer: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    paddingTop: 40, // Added significant top padding
    paddingBottom: 60, // Increased bottom padding for balance
  },
  successIconBox: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#ECFDF5", // Light green background
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 24,
  },
  innerCheckmarkCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  successTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginBottom: 8,
  },
  successDesc: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    marginBottom: 32,
  },
  doneButton: {
    backgroundColor: theme.colors.actionPrimary.default,
    borderRadius: 30,
    paddingVertical: 16,
    paddingHorizontal: 48,
    width: "100%",
    alignItems: "center",
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  doneButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: "#FFFFFF",
    fontWeight: "600",
  },
});
