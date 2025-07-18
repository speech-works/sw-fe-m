// ToastConfig.tsx
import React from "react";
import Icon from "react-native-vector-icons/MaterialIcons";
import { BaseToast, ErrorToast } from "react-native-toast-message";
import { StyleSheet } from "react-native";
import { theme } from "../../Theme/tokens";

// Example brand colors (adjust to match your design)
const brandInfo = theme.colors.library.blue[400];
const bgInfo = theme.colors.library.blue[100];
const brandWarning = theme.colors.library.yellow[400];
const bgWarning = theme.colors.library.yellow[100];
const brandSuccess = theme.colors.library.green[400];
const bgSuccess = theme.colors.library.green[100];
const brandError = theme.colors.library.red[400];
const bgError = theme.colors.library.red[100];
const brandTextDark = theme.colors.text.title;
const brandTextLight = theme.colors.text.default;
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
      text2NumberOfLines={0}
      renderTrailingIcon={() => (
        <Icon name="check-circle" size={ICON_SIZE} color={brandSuccess} />
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
      text2NumberOfLines={0}
      renderTrailingIcon={() => (
        <Icon name="info" size={ICON_SIZE} color={brandInfo} />
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
      text2NumberOfLines={0}
      renderTrailingIcon={() => (
        <Icon name="error" size={ICON_SIZE} color={brandError} />
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
      text2NumberOfLines={0}
      renderTrailingIcon={() => (
        <Icon name="error" size={ICON_SIZE} color={brandError} />
      )}
    />
  ),
};

export default toastConfig;
