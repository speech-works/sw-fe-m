import React from "react";
import { StyleSheet, Text, View, ViewStyle, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import AnimatedToggle from "../../../../../components/AnimatedToggle";
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";
import BottomSheetModal from "../../../../../components/BottomSheetModal";
import { useNavigation } from "@react-navigation/native";

interface HardModeToggleProps {
  value: boolean;
  onValueChange: (val: boolean) => void;
  style?: ViewStyle;
  canUseHardMode?: boolean;
}

const HardModeToggle: React.FC<HardModeToggleProps> = ({
  value,
  onValueChange,
  style,
  canUseHardMode = true,
}) => {
  const [showSheet, setShowSheet] = React.useState(false);
  const navigation = useNavigation<any>();

  const handlePress = () => {
    if (!value && !canUseHardMode) {
      setShowSheet(true);
      return;
    }
    onValueChange(!value);
  };

  return (
    <>
    <TouchableOpacity
      activeOpacity={0.9}
      onPress={handlePress}
      style={[
        styles.container,
        value ? styles.shadowActive : styles.shadowInactive,
        style
      ]}
    >
      <View style={styles.cardBase}>
        <View style={styles.content}>
          <View style={styles.textBody}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <Icon
                name="fire"
                size={16}
                color={value ? "#EA580C" : "#94A3B8"}
                solid={value}
              />
              <Text style={[styles.title, value && { color: "#EA580C" }]}>
                Hard Mode
              </Text>
            </View>
            <Text style={styles.description}>
              Intensify your practice by focusing exclusively on your feared sounds.
            </Text>
          </View>
          <View style={styles.toggleContainer}>
            <AnimatedToggle
              value={value}
              onValueChange={handlePress}
              activeColor={theme.colors.library.orange[500]}
              inactiveColor="#E2E8F0"
            />
          </View>
        </View>
      </View>
    </TouchableOpacity>

    <BottomSheetModal
      visible={showSheet}
      onClose={() => setShowSheet(false)}
      fitContent
      showCloseButton
      hasBottomSafePadding
    >
      <View style={styles.sheetContent}>
        <View style={styles.sheetIconContainer}>
          <Icon name="exclamation-circle" size={32} color="#EA580C" />
        </View>
        <Text style={styles.sheetTitle}>Action Required</Text>
        <Text style={styles.sheetDesc}>
          Please add feared sounds in Settings to use Hard mode.
        </Text>
        <View style={styles.sheetActions}>
          <TouchableOpacity 
            style={styles.sheetCancelBtn} 
            onPress={() => setShowSheet(false)}
          >
            <Text style={styles.sheetCancelTxt}>Cancel</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.sheetConfirmBtn} 
            onPress={() => {
              setShowSheet(false);
              navigation.navigate("Root", {
                screen: "SETTINGS",
                params: { screen: "FearedSounds" }
              });
            }}
          >
            <Text style={styles.sheetConfirmTxt}>Go to Settings</Text>
          </TouchableOpacity>
        </View>
      </View>
    </BottomSheetModal>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    borderRadius: 20,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB", // Hairline border for Bento
  },
  cardBase: {
    padding: 20,
    position: "relative",
    overflow: "hidden",
    borderRadius: 20,
  },
  shadowActive: {
    borderColor: "rgba(234, 88, 12, 0.4)",
    backgroundColor: "rgba(255, 247, 237, 0.5)", // Faint orange tint
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 4,
  },
  shadowInactive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  // Content
  content: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 16,
  },
  textBody: {
    flex: 1,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 18,
    fontWeight: "700",
    color: "#111827",
  },
  description: {
    ...parseTextStyle(theme.typography.BodyDetails),
    fontSize: 14,
    lineHeight: 20,
    color: "#6B7280",
  },
  toggleContainer: {
    justifyContent: "center",
  },
  // Bottom Sheet Styles
  sheetContent: {
    padding: 24,
    paddingTop: 48,
    alignItems: "center",
  },
  sheetIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "rgba(234, 88, 12, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 22,
    fontWeight: "800",
    color: theme.colors.text.title,
    marginBottom: 8,
    textAlign: "center",
  },
  sheetDesc: {
    ...parseTextStyle(theme.typography.BodyDetails),
    fontSize: 16,
    color: theme.colors.text.default,
    textAlign: "center",
    lineHeight: 24,
    marginBottom: 32,
    paddingHorizontal: 12,
  },
  sheetActions: {
    flexDirection: "row",
    width: "100%",
    gap: 12,
  },
  sheetCancelBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#F1F5F9",
    alignItems: "center",
    justifyContent: "center",
  },
  sheetCancelTxt: {
    ...parseTextStyle(theme.typography.Heading4),
    fontSize: 16,
    fontWeight: "700",
    color: "#64748B",
  },
  sheetConfirmBtn: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#EA580C",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  sheetConfirmTxt: {
    ...parseTextStyle(theme.typography.Heading4),
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});

export default HardModeToggle;
