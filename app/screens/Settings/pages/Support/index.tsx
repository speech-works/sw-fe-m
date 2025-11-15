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

type SettingType = "Report Problem" | "Contact Support" | "Feedback";

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
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.topNavigation}
            onPress={() => navigation.goBack()}
          >
            <Icon
              name="chevron-left"
              size={16}
              color={theme.colors.text.default}
            />
            <Text style={styles.topNavigationText}>Help & Support</Text>
          </TouchableOpacity>
          <CustomScrollView contentContainerStyle={styles.scrollView}>
            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                setOpenSettingType("Report Problem");
                setIsModalVisible(true);
              }}
            >
              <View style={styles.textContainer}>
                <Text style={styles.titleText}>Report A Problem</Text>
                <Text style={styles.descText}>
                  Let us know what needs fixing
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                setOpenSettingType("Contact Support");
                setIsModalVisible(true);
              }}
            >
              <View style={styles.textContainer}>
                <Text style={styles.titleText}>Contact Support</Text>
                <Text style={styles.descText}>
                  Reach out to our friendly support team
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.card}
              onPress={() => {
                setOpenSettingType("Feedback");
                setIsModalVisible(true);
              }}
            >
              <View style={styles.textContainer}>
                <Text style={styles.titleText}>Feedback & Suggestions</Text>
                <Text style={styles.descText}>
                  How can we improve SpeechWorks?
                </Text>
              </View>
            </TouchableOpacity>
          </CustomScrollView>
        </View>
      </ScreenView>
      <BottomSheetModal
        visible={isModalVisible}
        onClose={closeModal}
        maxHeight="70%"
      >
        <View style={styles.modalContent}>
          <View style={styles.modalTitleContainer}>
            <Text style={styles.modalTiteText}>{openSettingType}</Text>
            <Text style={styles.modalDescText}>
              {openSettingType === "Report Problem"
                ? "We usually respond within 24–48 hours. Thank you for helping improve SpeechWorks"
                : openSettingType === "Feedback"
                ? "Your feedback is valuable! Share your thoughts to help us make the app better for everyone"
                : null}
            </Text>
          </View>
          <CustomScrollView>
            {openSettingType === "Contact Support" && <ContactSupport />}
            {openSettingType === "Feedback" && (
              <Feedback onFeedbackSubmit={closeModal} />
            )}
            {openSettingType === "Report Problem" && (
              <ReportProblem onReportSubmit={closeModal} />
            )}
          </CustomScrollView>
        </View>
      </BottomSheetModal>
    </>
  );
};

export default Support;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    gap: 32,
    flex: 1,
  },
  topNavigation: {
    position: "relative",
    top: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topNavigationText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  scrollView: {
    gap: 16,
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  card: {
    gap: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textContainer: {
    gap: 4,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  descText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    fontWeight: "400",
  },

  // modal
  modalTitleContainer: {
    gap: 12,
    alignItems: "center",
  },
  modalTiteText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  modalDescText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    textAlign: "center",
  },
  modalContent: {
    paddingVertical: 24,
    width: "100%",
    flex: 1, // ← valid because the parent Animated.View has a fixed height
    flexDirection: "column",
    gap: 32,
  },
});
