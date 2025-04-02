// ToastConfig.tsx
import React from "react";
import Icon from "react-native-vector-icons/MaterialIcons";
import { BaseToast, ErrorToast } from "react-native-toast-message";
import { StyleSheet } from "react-native";
import { theme } from "../../Theme/tokens";

// Example brand colors (adjust to match your design)
const brandInfo = theme.colors.status.info;
const bgInfo = theme.colors.status.infoBG;
const brandWarning = theme.colors.status.warning;
const bgWarning = theme.colors.status.warningBG;
const brandSuccess = theme.colors.status.success;
const bgSuccess = theme.colors.status.successBG;
const brandError = theme.colors.status.error;
const bgError = theme.colors.status.errorBG;
const brandTextDark = theme.colors.neutral.black;
const brandTextLight = theme.colors.neutral[3];
const ICON_SIZE = 32;

const styles = StyleSheet.create({
  baseToast: {
    borderLeftWidth: 4,
    borderRadius: 8,
    marginHorizontal: 8,
    marginTop: 10,
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
    elevation: 2,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 15,
  },
  contentContainer: {
    paddingHorizontal: 15,
  },
  text1: {
    fontSize: 16,
    fontWeight: "600",
    color: brandTextDark,
  },
  text2: {
    fontSize: 14,
    color: brandTextLight,
  },
});

const toastConfig = {
  success: (props: any) => (
    <BaseToast
      {...props}
      style={[
        styles.baseToast,
        { borderLeftColor: brandSuccess, backgroundColor: bgSuccess },
      ]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      renderTrailingIcon={() => (
        <Icon
          name="check-circle"
          size={ICON_SIZE}
          color={theme.colors.status.success}
        />
      )}
    />
  ),
  info: (props: any) => (
    <BaseToast
      {...props}
      style={[
        styles.baseToast,
        { borderLeftColor: brandInfo, backgroundColor: bgInfo },
      ]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      renderTrailingIcon={() => (
        <Icon name="info" size={ICON_SIZE} color={theme.colors.status.info} />
      )}
    />
  ),
  warning: (props: any) => (
    <BaseToast
      {...props}
      style={[
        styles.baseToast,
        { borderLeftColor: brandWarning, backgroundColor: bgWarning },
      ]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      renderTrailingIcon={() => (
        <Icon
          name="error"
          size={ICON_SIZE}
          color={theme.colors.status.warning}
        />
      )}
    />
  ),
  error: (props: any) => (
    <ErrorToast
      {...props}
      style={[
        styles.baseToast,
        { borderLeftColor: brandError, backgroundColor: bgError },
      ]}
      contentContainerStyle={styles.contentContainer}
      text1Style={styles.text1}
      text2Style={styles.text2}
      renderTrailingIcon={() => (
        <Icon name="error" size={ICON_SIZE} color={theme.colors.status.error} />
      )}
    />
  ),
};

export default toastConfig;
