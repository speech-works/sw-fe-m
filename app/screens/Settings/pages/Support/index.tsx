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
  | "Feedback"
  | "Success";

// Helper for consistent lovely icons
const LivelyIcon = ({
  name,
  color,
  bg,
}: {
  name: string;
  color: string;
  bg: string;
}) => (
  <View style={[styles.iconContainer, { backgroundColor: bg }]}>
    <Icon solid name={name} size={16} color={color} />
  </View>
);

const Support = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [openSettingType, setOpenSettingType] = useState<SettingType | null>(
    null,
  );

  const closeModal = () => setIsModalVisible(false);

  const handleSuccess = () => {
    setOpenSettingType("Success");
  };

  return (
    <>
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
            {/* Report Problem Card */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setOpenSettingType("Report Problem");
                setIsModalVisible(true);
              }}
              style={styles.cardWrapper}
            >
              <LinearGradient
                colors={["#FFD8B5", "#FFAB76"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.watermarkContainer}>
                  <Icon name="bug" size={120} color="rgba(255,255,255,0.15)" />
                </View>
                <View style={styles.cardHeader}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>HELP</Text>
                  </View>
                  <Text style={styles.cardTitle}>Report A Problem</Text>
                  <Text style={styles.cardDesc}>
                    Let us know what needs fixing
                  </Text>
                </View>
                <View style={styles.cardFooter}>
                  <LivelyIcon name="bug" color="#EA580C" bg="white" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Contact Support Card */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setOpenSettingType("Contact Support");
                setIsModalVisible(true);
              }}
              style={styles.cardWrapper}
            >
              <LinearGradient
                colors={["#Cbf0f0", "#98E6E6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.watermarkContainer}>
                  <Icon
                    name="headset"
                    size={120}
                    color="rgba(255,255,255,0.15)"
                  />
                </View>
                <View style={styles.cardHeader}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>SUPPORT</Text>
                  </View>
                  <Text style={styles.cardTitle}>Contact Support</Text>
                  <Text style={styles.cardDesc}>
                    Reach out to our friendly support team
                  </Text>
                </View>
                <View style={styles.cardFooter}>
                  <LivelyIcon name="headset" color="#2563EB" bg="white" />
                </View>
              </LinearGradient>
            </TouchableOpacity>

            {/* Feedback Card */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setOpenSettingType("Feedback");
                setIsModalVisible(true);
              }}
              style={styles.cardWrapper}
            >
              <LinearGradient
                colors={["#FFC8C8", "#FF9E9E"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.cardGradient}
              >
                <View style={styles.watermarkContainer}>
                  <Icon
                    name="lightbulb"
                    size={120}
                    color="rgba(255,255,255,0.15)"
                  />
                </View>
                <View style={styles.cardHeader}>
                  <View style={styles.badge}>
                    <Text style={styles.badgeText}>FEEDBACK</Text>
                  </View>
                  <Text style={styles.cardTitle}>Feedback & Suggestions</Text>
                  <Text style={styles.cardDesc}>How can we improve?</Text>
                </View>
                <View style={styles.cardFooter}>
                  <LivelyIcon name="lightbulb" color="#DB2777" bg="white" />
                </View>
              </LinearGradient>
            </TouchableOpacity>
          </CustomScrollView>
        </View>
      </ScreenView>

      <BottomSheetModal
        visible={isModalVisible}
        onClose={closeModal}
        maxHeight="90%"
        showCloseButton={true}
      >
        <View style={styles.modalContent}>
          {openSettingType !== "Success" &&
            (() => {
              const isReport = openSettingType === "Report Problem";
              const isContact = openSettingType === "Contact Support";
              const iconName = isReport
                ? "bug"
                : isContact
                  ? "headset"
                  : "lightbulb";
              const iconColor = isReport
                ? "#EA580C"
                : isContact
                  ? "#2563EB"
                  : "#DB2777";
              const headerBg = isReport
                ? "#FFF7ED"
                : isContact
                  ? "#EFF6FF"
                  : "#FDF2F8";

              return (
                <LinearGradient
                  colors={[headerBg, "#FFF"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 0, y: 1 }}
                  style={styles.modalHeader}
                >
                  {/* Header Decorative Bubbles */}
                  <View style={styles.modalHeaderBubble} />
                  <View style={styles.modalHeaderBubbleSmall} />

                  <View
                    style={[styles.iconCircle, { backgroundColor: iconColor }]}
                  >
                    <Icon name={iconName} size={20} color="white" solid />
                  </View>
                  <Text style={styles.modalTitleText}>{openSettingType}</Text>
                </LinearGradient>
              );
            })()}

          <View style={styles.modalBody}>
            {openSettingType === "Contact Support" && <ContactSupport />}
            {openSettingType === "Feedback" && (
              <Feedback onFeedbackSubmit={handleSuccess} />
            )}
            {openSettingType === "Report Problem" && (
              <ReportProblem onReportSubmit={handleSuccess} />
            )}
            {openSettingType === "Success" && (
              <View style={styles.successContainer}>
                <View style={styles.successIconBox}>
                  <LinearGradient
                    colors={["#10B981", "#059669"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.innerCheckmarkCircle}
                  >
                    <Icon name="check" size={32} color="#FFFFFF" />
                  </LinearGradient>
                </View>
                <Text style={styles.successTitle}>Thank You!</Text>
                <Text style={styles.successDesc}>
                  Your submission has been received successfully.
                </Text>
                <TouchableOpacity
                  style={styles.doneButton}
                  onPress={closeModal}
                >
                  <Text style={styles.doneButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </BottomSheetModal>
    </>
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
  cardWrapper: {
    borderRadius: 32,
    ...parseShadowStyle(theme.shadow.elevation2),
    overflow: "hidden",
  },
  cardGradient: {
    padding: 24,
    minHeight: 160,
    justifyContent: "space-between",
    position: "relative",
  },
  watermarkContainer: {
    position: "absolute",
    right: -20,
    bottom: -20,
    transform: [{ rotate: "-15deg" }],
    opacity: 0.8,
  },
  cardHeader: {
    zIndex: 1,
  },
  badge: {
    backgroundColor: "rgba(255,255,255,0.4)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
  },
  badgeText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(0,0,0,0.6)",
    letterSpacing: 1,
  },
  cardTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "rgba(0,0,0,0.8)",
    fontSize: 22,
    marginBottom: 4,
  },
  cardDesc: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "rgba(0,0,0,0.6)",
    fontSize: 14,
    lineHeight: 20,
    fontWeight: "600",
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 16,
    zIndex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  textContainer: {
    gap: 4,
    flex: 1,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading3), // Match Preferences
    color: theme.colors.library.orange[800],
    fontSize: 18,
    fontWeight: "700",
  },
  descText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.library.gray[500],
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
    paddingBottom: 40,
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
