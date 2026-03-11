import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
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

type SettingType = "Report Problem" | "Contact Support" | "Feedback";

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
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [openSettingType, setOpenSettingType] = useState<SettingType | null>(
    null,
  );

  const closeModal = () => setIsModalVisible(false);

  return (
    <>
      <ScreenView style={[styles.screenView, { paddingHorizontal: 0 }]}>
        {/* Aurora Background */}
        <View style={StyleSheet.absoluteFillObject}>
          <LinearGradient
            colors={[theme.colors.library.orange[100], "#FFF"]}
            locations={[0, 1]}
            style={{ flex: 1 }}
          />
        </View>

        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
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
          </View>

          <CustomScrollView contentContainerStyle={styles.scrollView}>
            {/* Report Problem Card - Orange/Red Glow */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setOpenSettingType("Report Problem");
                setIsModalVisible(true);
              }}
              style={styles.card}
            >
              <View style={styles.cardLeft}>
                <LivelyIcon name="bug" color="#EA580C" bg="#FFF7ED" />
                <View style={styles.textContainer}>
                  <Text style={styles.titleText}>Report A Problem</Text>
                  <Text style={styles.descText}>
                    Let us know what needs fixing
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Contact Support Card - Blue Glow */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setOpenSettingType("Contact Support");
                setIsModalVisible(true);
              }}
              style={styles.card}
            >
              <View style={styles.cardLeft}>
                <LivelyIcon name="headset" color="#2563EB" bg="#EFF6FF" />
                <View style={styles.textContainer}>
                  <Text style={styles.titleText}>Contact Support</Text>
                  <Text style={styles.descText}>
                    Reach out to our friendly support team
                  </Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Feedback Card - Pink Glow */}
            <TouchableOpacity
              activeOpacity={0.9}
              onPress={() => {
                setOpenSettingType("Feedback");
                setIsModalVisible(true);
              }}
              style={styles.card}
            >
              <View style={styles.cardLeft}>
                <LivelyIcon name="lightbulb" color="#DB2777" bg="#FDF2F8" />
                <View style={styles.textContainer}>
                  <Text style={styles.titleText}>Feedback & Suggestions</Text>
                  <Text style={styles.descText}>How can we improve?</Text>
                </View>
              </View>
            </TouchableOpacity>
          </CustomScrollView>
        </View>
      </ScreenView>

      <BottomSheetModal
        visible={isModalVisible}
        onClose={closeModal}
        maxHeight="90%"
      >
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitleText}>{openSettingType}</Text>
            <Text style={styles.modalDescText}>
              {openSettingType === "Report Problem"
                ? "We usually respond within 24–48 hours."
                : openSettingType === "Feedback"
                  ? "Your feedback helps us make the app better."
                  : "Get in touch with us directly"}
            </Text>
          </View>

          <View style={styles.modalBody}>
            {openSettingType === "Contact Support" && <ContactSupport />}
            {openSettingType === "Feedback" && (
              <Feedback onFeedbackSubmit={closeModal} />
            )}
            {openSettingType === "Report Problem" && (
              <ReportProblem onReportSubmit={closeModal} />
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
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 24,
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
    gap: 16,
    paddingHorizontal: 16, // Match Preferences/MoodCheck
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 24,
    paddingVertical: 24,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
    // borderColor: handles per card
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    flex: 1,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
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

  // Modal Styles
  modalContent: {
    flex: 1,
  },
  modalHeader: {
    marginTop: 20,
    marginBottom: 20,
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 24,
  },
  modalTitleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    textAlign: "center",
  },
  modalDescText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
  },
  modalBody: {
    flex: 1,
  },
});
