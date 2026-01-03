import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useState } from "react";
import ScreenView from "../../../../components/ScreenView";
import Icon from "react-native-vector-icons/FontAwesome5";
import CustomScrollView from "../../../../components/CustomScrollView";
import { theme } from "../../../../Theme/tokens";
import { useNavigation } from "@react-navigation/native";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";
import BottomSheetModal from "../../../../components/BottomSheetModal";
import ReportProblem from "./ReportProblem";
import ContactSupport from "./ContactSupport";
import Feedback from "./Feedback";
import { LinearGradient } from "expo-linear-gradient";

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
    null
  );

  const closeModal = () => setIsModalVisible(false);

  return (
    <>
      <ScreenView style={styles.screenView}>
        {/* Aurora Background */}
        <View style={StyleSheet.absoluteFillObject}>
          <LinearGradient
            colors={["#FFF7ED", "#FFFFFF", "#F8FAFC"]}
            locations={[0, 0.4, 1]}
            style={{ flex: 1 }}
          />
        </View>

        <View style={styles.container}>
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Icon name="chevron-left" size={16} color="#1E293B" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Help & Support</Text>
            <View style={{ width: 40 }} />
          </View>

          <CustomScrollView contentContainerStyle={styles.scrollView}>
            {/* Report Problem Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.card}
              onPress={() => {
                setOpenSettingType("Report Problem");
                setIsModalVisible(true);
              }}
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
              <Icon name="chevron-right" size={14} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Contact Support Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.card}
              onPress={() => {
                setOpenSettingType("Contact Support");
                setIsModalVisible(true);
              }}
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
              <Icon name="chevron-right" size={14} color="#CBD5E1" />
            </TouchableOpacity>

            {/* Feedback Card */}
            <TouchableOpacity
              activeOpacity={0.8}
              style={styles.card}
              onPress={() => {
                setOpenSettingType("Feedback");
                setIsModalVisible(true);
              }}
            >
              <View style={styles.cardLeft}>
                <LivelyIcon name="lightbulb" color="#DB2777" bg="#FDF2F8" />
                <View style={styles.textContainer}>
                  <Text style={styles.titleText}>Feedback & Suggestions</Text>
                  <Text style={styles.descText}>
                    How can we improve SpeechWorks?
                  </Text>
                </View>
              </View>
              <Icon name="chevron-right" size={14} color="#CBD5E1" />
            </TouchableOpacity>
          </CustomScrollView>
        </View>
      </ScreenView>

      <BottomSheetModal
        visible={isModalVisible}
        onClose={closeModal}
        maxHeight="90%" // Maximize height for immersion
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
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#1E293B",
    fontWeight: "700",
  },
  scrollView: {
    gap: 16,
    padding: 24, // Consistent padding
  },
  card: {
    backgroundColor: "#FFFFFF",
    ...parseShadowStyle(theme.shadow.elevation1),
    borderRadius: 24, // More rounded
    padding: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1,
    borderColor: "#F1F5F9",
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
    fontSize: 16,
    fontWeight: "600",
    color: "#1E293B",
  },
  descText: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 18,
  },

  // Modal Styles
  modalContent: {
    flex: 1,
    // Removed paddingHorizontal to let children control it for better scroll UX
  },
  modalHeader: {
    marginTop: 20,
    marginBottom: 20,
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 24,
  },
  modalTitleText: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1E293B",
    textAlign: "center",
  },
  modalDescText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 20,
  },
  modalBody: {
    flex: 1,
  },
});
