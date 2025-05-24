import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  ScrollView,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { theme } from "../Theme/tokens";
import { parseTextStyle } from "../util/functions/parseStyles";
import Button from "./Button";

interface ButtonProps {
  label: string;
  onPress: () => void;
  icon?: string;
  disabled?: boolean;
}

interface ModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  icon?: string;
  children: React.ReactNode;
  primaryButton?: ButtonProps;
  secondaryButton?: ButtonProps;
}

const CustomModal: React.FC<ModalProps> = ({
  visible,
  onClose,
  title,
  icon,
  children,
  primaryButton,
  secondaryButton,
}) => {
  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.titleBar}>
            <View style={styles.titleTextWrapper}>
              {icon && (
                <Icon name={icon} size={20} color={theme.colors.neutral[3]} />
              )}
              {title && (
                <Text
                  style={styles.modalTitle}
                  numberOfLines={1}
                  ellipsizeMode="tail"
                >
                  {title}
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose}>
              <Icon name="close" size={20} color={theme.colors.neutral[3]} />
            </TouchableOpacity>
          </View>
          <ScrollView
            style={styles.modalContent}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {children}
          </ScrollView>
          <View style={styles.modalFooter}>
            <View style={styles.btnWrapper}>
              {/* Secondary Button */}
              {secondaryButton && (
                <Button
                  size="xSmall"
                  variant="ghost"
                  onPress={secondaryButton.onPress}
                  leftIcon={secondaryButton.icon}
                  disabled={secondaryButton.disabled}
                >
                  <Text>{secondaryButton.label}</Text>
                </Button>
              )}

              {/* Primary Button */}
              {primaryButton && (
                <Button
                  size="xSmall"
                  onPress={primaryButton.onPress}
                  leftIcon={primaryButton.icon}
                  disabled={primaryButton.disabled}
                >
                  <Text>{primaryButton.label}</Text>
                </Button>
              )}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent background
  },
  modalContainer: {
    width: Dimensions.get("window").width * 0.95, // 95% of screen width
    maxHeight: Dimensions.get("window").height * 0.85,
    backgroundColor: "white",
    borderRadius: 10,
  },
  titleBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderColor: theme.colors.neutral[7],
  },
  titleTextWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexShrink: 1,
    maxWidth: Dimensions.get("window").width * 0.7,
  },
  modalTitle: {
    ...parseTextStyle(theme.typography.paragraphLarge.heavy_1200),
  },
  modalContent: {
    marginBottom: 20,
    paddingHorizontal: 8,
    paddingVertical: 10,
    maxHeight: Dimensions.get("window").height * 0.7,
    overflow: "scroll",
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  modalFooter: {
    flexDirection: "row-reverse",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderColor: theme.colors.neutral[7],
    position: "absolute",
    bottom: 0,
    backgroundColor: "#fff",
    width: "100%",
  },
  btnWrapper: {
    flexDirection: "row",
    gap: 8,
  },
});

export default CustomModal;
