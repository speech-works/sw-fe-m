import React, { useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity } from "react-native";
import { useNavigation } from "@react-navigation/native";
import * as SecureStore from "expo-secure-store";
import axios from "axios";
import * as WebBrowser from "expo-web-browser";
import { SECURE_KEYS_NAME } from "../../constants/secureStorageKeys";
import ScreenView from "../../components/ScreenView";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../util/functions/parseStyles";
import { theme } from "../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
import { LinearGradient } from "expo-linear-gradient";

// export const SubscribeScreen = () => {
//   const handleSubscribe = async () => {
//     const token = await SecureStore.getItemAsync(
//       SECURE_KEYS_NAME.SW_APP_JWT_KEY
//     );
//     console.log("handleSubscribe:", { token });
//     const res = await axios.post(
//       `${process.env.EXPO_PUBLIC_API_URL}/stripe/create-checkout-session`,
//       { priceId: "price_xyz" },
//       {
//         headers: {
//           Authorization: `Bearer ${token}`,
//         },
//       }
//     );
//     console.log("handleSubscribe response:", { res });
//     const { url } = res.data;
//     await WebBrowser.openBrowserAsync(url);
//   };

//   return <Button title="Subscribe Now" onPress={handleSubscribe} />;
// };

export enum PAYMENT_PLAN_TYPE {
  MONTHLY = 0,
  ANNUALLY = 1,
}

const SubscribeScreen = () => {
  const navigation = useNavigation();
  const [paymentPlan, setPaymentPlan] = useState<PAYMENT_PLAN_TYPE>(
    PAYMENT_PLAN_TYPE.MONTHLY
  );
  return (
    <LinearGradient
      colors={["#F97316", "#EC4899"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.screenView}
    >
      <View style={styles.topNavigationContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.topNavigation}
        >
          <Icon name="chevron-left" size={16} color={"#fff"} />
          <Text style={styles.topNavigationText}>Back</Text>
        </TouchableOpacity>
      </View>
      <View style={styles.innerContainer}>
        <View style={styles.headerWrapper}>
          <Text style={styles.headerText}>Upgrade to PRO</Text>
          <Icon
            solid
            name="crown"
            size={22}
            color={theme.colors.library.orange[300]}
          />
        </View>

        <View style={styles.tileWraper}>
          <TouchableOpacity
            style={[
              styles.tile,
              paymentPlan === PAYMENT_PLAN_TYPE.MONTHLY && styles.selectedTile,
            ]}
            onPress={() => {
              setPaymentPlan(PAYMENT_PLAN_TYPE.MONTHLY);
            }}
          >
            <View style={styles.tileInfo}>
              <View style={styles.tileHeader}>
                <Text
                  style={[
                    styles.tileHeaderText,
                    paymentPlan !== PAYMENT_PLAN_TYPE.MONTHLY &&
                      styles.unSelectedText,
                  ]}
                >
                  Monthly
                </Text>
                {paymentPlan === PAYMENT_PLAN_TYPE.MONTHLY && (
                  <Icon
                    solid
                    name="check-circle"
                    size={16}
                    color={theme.colors.library.orange[400]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.priceText,
                  paymentPlan !== PAYMENT_PLAN_TYPE.MONTHLY &&
                    styles.unselectedPriceText,
                ]}
              >
                $11.99
              </Text>
            </View>
            <Text
              style={[
                styles.tileFooterText,
                paymentPlan !== PAYMENT_PLAN_TYPE.MONTHLY &&
                  styles.unSelectedText,
              ]}
            >
              Billed Monthly
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.tile,
              paymentPlan === PAYMENT_PLAN_TYPE.ANNUALLY && styles.selectedTile,
            ]}
            onPress={() => {
              setPaymentPlan(PAYMENT_PLAN_TYPE.ANNUALLY);
            }}
          >
            <View style={styles.tileInfo}>
              <View style={styles.tileHeader}>
                <Text
                  style={[
                    styles.tileHeaderText,
                    paymentPlan !== PAYMENT_PLAN_TYPE.ANNUALLY &&
                      styles.unSelectedText,
                  ]}
                >
                  Annually
                </Text>
                {paymentPlan === PAYMENT_PLAN_TYPE.ANNUALLY && (
                  <Icon
                    solid
                    name="check-circle"
                    size={16}
                    color={theme.colors.library.orange[400]}
                  />
                )}
              </View>
              <Text
                style={[
                  styles.priceText,
                  paymentPlan !== PAYMENT_PLAN_TYPE.ANNUALLY &&
                    styles.unselectedPriceText,
                ]}
              >
                $119.99
              </Text>
              <View
                style={[
                  styles.saveTag,
                  paymentPlan !== PAYMENT_PLAN_TYPE.ANNUALLY &&
                    styles.saveTagUnselected,
                ]}
              >
                <Text
                  style={[
                    styles.saveTagText,
                    paymentPlan !== PAYMENT_PLAN_TYPE.ANNUALLY &&
                      styles.saveTagTextUnselected,
                  ]}
                >
                  Save 17%
                </Text>
              </View>
            </View>
            <Text
              style={[
                styles.tileFooterText,
                paymentPlan !== PAYMENT_PLAN_TYPE.ANNUALLY &&
                  styles.unSelectedText,
              ]}
            >
              $9.99/month Billed Annually
            </Text>
          </TouchableOpacity>
        </View>
      </View>
      <TouchableOpacity style={styles.subscribeButton}>
        <Text style={styles.subscribeButtonText}>Upgrade Now</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

export default SubscribeScreen;

const styles = StyleSheet.create({
  screenView: {
    paddingVertical: 20,
    paddingHorizontal: 20,
    justifyContent: "space-around",
    flex: 1,
  },
  topNavigationContainer: {
    position: "relative",
    top: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 64,
  },
  topNavigation: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topNavigationText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#fff",
  },
  innerContainer: {
    gap: 32,
    flex: 1,
  },
  headerWrapper: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  headerText: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "#fff",
    textAlign: "center",
  },
  tileWraper: {
    flexDirection: "row",
    gap: 8,
  },
  tile: {
    width: "50%",
    padding: 20,
    gap: 36,
    justifyContent: "space-between",
    borderWidth: 1,
    borderRadius: 8,
    borderColor: "#fff",
  },
  selectedTile: {
    borderColor: "#fff",
    ...parseShadowStyle(theme.shadow.elevation1),
    backgroundColor: theme.colors.background.light,
  },
  tileHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  tileHeaderText: {
    ...parseTextStyle(theme.typography.Body),
  },
  tileInfo: {
    gap: 5,
  },
  priceText: {
    ...parseTextStyle(theme.typography.Heading1),
    color: theme.colors.text.title,
    fontWeight: "800",
  },
  unselectedPriceText: {
    color: theme.colors.library.gray[200],
  },
  tileFooterText: {
    ...parseTextStyle(theme.typography.Body),
  },
  subscribeButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    justifyContent: "center",
    padding: 16,
    borderRadius: 8,
    backgroundColor: "#000",
    gap: 12,
  },
  subscribeButtonText: {
    color: "#fff",
    ...parseTextStyle(theme.typography.Body),
    fontWeight: "700",
  },
  saveTag: {
    backgroundColor: theme.colors.actionPrimary.default,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 12,
    alignSelf: "flex-start",
  },
  saveTagUnselected: {
    backgroundColor: theme.colors.background.light,
  },
  saveTagText: {
    color: "#fff",
    textAlign: "center",
  },
  saveTagTextUnselected: {
    color: theme.colors.text.title,
  },
  unSelectedText: {
    color: "#fff",
  },
});
