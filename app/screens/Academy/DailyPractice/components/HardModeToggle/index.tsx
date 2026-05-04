import React from "react";
import { StyleSheet, Text, View, ViewStyle, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { LinearGradient } from "expo-linear-gradient";
import AnimatedToggle from "../../../../../components/AnimatedToggle";
import { theme } from "../../../../../Theme/tokens";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";
import BottomSheetModal from "../../../../../components/BottomSheetModal";
import { useNavigation } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";

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
        {/* Decorative Glass Bubbles */}
        <View style={[styles.bubble, styles.bubbleLarge]} />
        <View style={[styles.bubble, styles.bubbleSmall]} />

        {/* Watermark Icon */}
        <View style={styles.watermark}>
          <Icon
            name="fire"
            size={100}
            color={value ? theme.colors.library.orange[500] : "#E2E8F0"}
            style={{ opacity: value ? 0.08 : 0.15 }}
            solid
          />
        </View>

        <View style={styles.content}>
          <View style={styles.headerRow}>
            {/* Chip Style Label */}
            <View style={[styles.chip, value ? styles.chipActive : styles.chipInactive]}>
              <Icon
                name="fire"
                size={10}
                color={value ? "#EA580C" : "#64748B"}
                solid={value}
              />
              <Text style={[styles.chipText, value ? styles.chipTextActive : styles.chipTextInactive]}>
                HARD MODE
              </Text>
            </View>

            <AnimatedToggle
              value={value}
              onValueChange={handlePress}
              activeColor={theme.colors.library.orange[500]}
              inactiveColor="#CBD5E1"
            />
          </View>

          <View style={styles.textBody}>
            <Text style={styles.title}>
              Phonetic Focus
            </Text>
            <Text style={styles.description}>
              Intensify your practice by focusing exclusively on your most difficult sounds.
            </Text>
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
    borderRadius: 24,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: "rgba(0,0,0,0.03)",
  },
  cardBase: {
    padding: 24,
    minHeight: 140,
    position: "relative",
    overflow: "hidden",
    borderRadius: 24,
  },
  shadowActive: {
    borderColor: "rgba(249, 115, 22, 0.3)", // Subtle orange border
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
  shadowInactive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
  },
  // Decorations
  bubble: {
    position: "absolute",
    borderRadius: 999,
    backgroundColor: "rgba(249, 115, 22, 0.03)",
  },
  bubbleLarge: {
    width: 140,
    height: 140,
    top: -40,
    right: -20,
  },
  bubbleSmall: {
    width: 80,
    height: 80,
    bottom: -20,
    left: -20,
  },
  watermark: {
    position: "absolute",
    bottom: -15,
    right: -10,
    transform: [{ rotate: "-15deg" }],
  },
  // Content
  content: {
    zIndex: 2,
    gap: 16,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 6,
  },
  chipActive: {
    backgroundColor: "rgba(234, 88, 12, 0.1)",
  },
  chipInactive: {
    backgroundColor: "#F1F5F9",
  },
  chipText: {
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 1.2,
  },
  chipTextActive: {
    color: "#EA580C",
  },
  chipTextInactive: {
    color: "#64748B",
  },
  textBody: {
    gap: 6,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 20,
    fontWeight: "800",
    color: theme.colors.text.title,
  },
  description: {
    ...parseTextStyle(theme.typography.BodyDetails),
    fontSize: 14,
    lineHeight: 20,
    color: theme.colors.text.default,
    opacity: 0.8,
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
