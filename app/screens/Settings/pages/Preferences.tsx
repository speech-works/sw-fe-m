import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import ScreenView from "../../../components/ScreenView";
import CustomScrollView from "../../../components/CustomScrollView";
import { theme } from "../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../util/functions/parseStyles";
import BottomSheetModal from "../../../components/BottomSheetModal";

const ProgressDetail = () => {
  const navigation = useNavigation();
  const [targetMins, setTargetMins] = useState(15);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const [selectedGoalType, setSelectedGoalType] = useState("");

  const closeModal = () => setIsModalVisible(false);

  const handleGoalChange = (goalText: string) => {
    setSelectedGoalType(goalText);
  };

  const handleIncrement = () => {
    setTargetMins((prevMins) => prevMins + 5);
  };

  const handleDecrement = () => {
    setTargetMins((prevMins) => Math.max(5, prevMins - 5));
  };

  const practiceGoalTypeData: Array<{
    name: string;
    desc: string;
    icon: string;
    disabled?: boolean;
  }> = [
    {
      name: "Time based",
      desc: "Set a daily time target like 20 mins",
      icon: "clock",
    },
    {
      name: "Task based",
      desc: "Set a goal to complete a number of tasks",
      icon: "tasks",
    },
  ];

  const SelectGoalType = () => (
    <BottomSheetModal
      visible={isModalVisible}
      onClose={closeModal}
      maxHeight="40%"
    >
      <View style={styles.modalContent}>
        <View style={styles.modalTitleContainer}>
          <Text style={styles.modalTiteText}>Goal</Text>
        </View>
        <View style={styles.goalListContanier}>
          {practiceGoalTypeData.map((goal, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.goalCard,
                selectedGoalType === goal.name && styles.selectedGoalCard,
                goal.disabled && styles.disabledCard,
              ]}
              disabled={goal.disabled}
              onPress={() => {
                if (goal.disabled) return;
                handleGoalChange(goal.name);
                setSelectedGoalType(goal.name);
                closeModal();
              }}
            >
              <View
                style={[
                  styles.goalIconContainer,
                  styles.goalIconContainer2,
                  goal.disabled ? styles.disabledIconContainer : null,
                ]}
              >
                <Icon
                  solid
                  name={goal.icon}
                  size={24}
                  color={
                    goal.disabled
                      ? theme.colors.library.gray[100]
                      : theme.colors.actionPrimary.default
                  }
                />
              </View>
              <View style={styles.goalDescContainer}>
                <Text
                  style={[
                    styles.goalNameText,
                    goal.disabled && styles.disabledText,
                    selectedGoalType === goal.name &&
                      !goal.disabled &&
                      styles.selectedCardText,
                  ]}
                >
                  {goal.name}
                </Text>
                <Text
                  style={[
                    styles.goalDetailText,
                    goal.disabled && styles.disabledText,
                    selectedGoalType === goal.name &&
                      !goal.disabled &&
                      styles.selectedCardText,
                  ]}
                >
                  {goal.disabled ? "coming soon" : goal.desc}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </BottomSheetModal>
  );

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
            <Text style={styles.topNavigationText}>Preferences</Text>
          </TouchableOpacity>
          <CustomScrollView contentContainerStyle={styles.scrollView}>
            <View style={styles.card}>
              <View style={styles.textContainer}>
                <Text style={styles.titleText}>Preferred practice time</Text>
                <Text style={styles.descText}>When should we remind you?</Text>
              </View>
              <TouchableOpacity style={styles.preferredTimeValue}>
                <Text style={styles.valueText}>08:00 AM</Text>
                <Icon
                  name="chevron-right"
                  size={12}
                  color={theme.colors.actionPrimary.default}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.card}>
              <View style={styles.textContainer}>
                <Text style={styles.titleText}>Practice goal type</Text>
                <Text style={styles.descText}>
                  How would you like to train?
                </Text>
              </View>
              <TouchableOpacity
                style={styles.preferredTimeValue}
                onPress={() => setIsModalVisible(true)}
              >
                <Text style={styles.valueText}>{selectedGoalType}</Text>
                <Icon
                  name="chevron-right"
                  size={12}
                  color={theme.colors.actionPrimary.default}
                />
              </TouchableOpacity>
            </View>
            {selectedGoalType === "Time based" && (
              <View style={styles.card}>
                <View style={styles.textContainer}>
                  <Text style={styles.titleText}>Daily practice limit</Text>
                  <Text style={styles.descText}>
                    Set your target practice minutes
                  </Text>
                </View>
                <View style={styles.valueControlContainer}>
                  {/* Chevron Up */}
                  <TouchableOpacity
                    onPress={handleIncrement}
                    style={styles.chevronButton}
                  >
                    <Icon
                      name="chevron-up"
                      size={12}
                      color={theme.colors.actionPrimary.default}
                    />
                  </TouchableOpacity>
                  {/* The Value */}
                  <Text style={styles.valueText}>{targetMins}</Text>
                  {/* Chevron Down */}
                  <TouchableOpacity
                    onPress={handleDecrement}
                    style={styles.chevronButton}
                  >
                    <Icon
                      name="chevron-down"
                      size={12}
                      color={theme.colors.actionPrimary.default}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
            {selectedGoalType === "Task based" && (
              <View style={styles.card}>
                <View style={styles.textContainer}>
                  <Text style={styles.titleText}>Daily task count</Text>
                  <Text style={styles.descText}>
                    e.g., complete 3 tasks/day
                  </Text>
                </View>
                <View style={styles.valueControlContainer}>
                  {/* Chevron Up */}
                  <TouchableOpacity
                    onPress={handleIncrement}
                    style={styles.chevronButton}
                  >
                    <Icon
                      name="chevron-up"
                      size={12}
                      color={theme.colors.actionPrimary.default}
                    />
                  </TouchableOpacity>
                  {/* The Value */}
                  <Text style={styles.valueText}>{targetMins}</Text>
                  {/* Chevron Down */}
                  <TouchableOpacity
                    onPress={handleDecrement}
                    style={styles.chevronButton}
                  >
                    <Icon
                      name="chevron-down"
                      size={12}
                      color={theme.colors.actionPrimary.default}
                    />
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </CustomScrollView>
        </View>
      </ScreenView>
      {SelectGoalType && <SelectGoalType />}
    </>
  );
};

export default ProgressDetail;

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
  valueText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.actionPrimary.default,
    marginHorizontal: 8,
  },
  valueControlContainer: {
    flexDirection: "column",
    alignItems: "center",
    width: 75,
  },
  chevronButton: {
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  preferredTimeValue: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
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
  },
  modalContent: {
    paddingVertical: 24,
    width: "100%",
    flex: 1, // ← valid because the parent Animated.View has a fixed height
    flexDirection: "column",
    gap: 32,
  },
  goalListContanier: {
    gap: 16,
    alignItems: "center",
    width: "100%",
  },
  goalCard: {
    width: "100%",
    borderRadius: 16,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  disabledCard: {
    backgroundColor: theme.colors.surface.disabled,
    opacity: 1,
    elevation: 0, // Android
    shadowColor: "transparent", // iOS
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0,
    shadowRadius: 0,
  },
  disabledText: {
    color: theme.colors.text.disabled,
  },
  selectedGoalCard: {
    backgroundColor: theme.colors.actionPrimary.default,
  },
  selectedCardText: {
    color: theme.colors.text.onDark,
    fontWeight: "600",
  },
  goalIconContainer2: {
    height: 40,
    width: 40,
  },
  disabledIconContainer: {
    backgroundColor: theme.colors.library.gray[200],
  },
  goalDescContainer: {
    gap: 4,
  },
  goalNameText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  goalDetailText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
  goalIconContainer: {
    height: 40,
    width: 40,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 20,
    backgroundColor: theme.colors.surface.default,
  },
});
