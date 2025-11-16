import React, { useState } from "react";
import { Text, View, StyleSheet, TouchableOpacity, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/FontAwesome5";

import { theme } from "../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../util/functions/parseStyles";

import Qonversion, { Product } from "@qonversion/react-native-sdk";
import { useProducts } from "../../hooks/useProducts";
import { useUserStore } from "../../stores/user";
import { getMyUser } from "../../api/users";

// --------------------------------------------------------
// ENUM: Payment plan selection
// --------------------------------------------------------
export enum PAYMENT_PLAN_TYPE {
  MONTHLY = 0,
  ANNUALLY = 1,
}

const PaywallScreen = () => {
  const navigation = useNavigation();
  const [paymentPlan, setPaymentPlan] = useState<PAYMENT_PLAN_TYPE>(
    PAYMENT_PLAN_TYPE.MONTHLY
  );

  const { products, loading } = useProducts();
  const setUser = useUserStore((s) => s.setUser);

  // 👉 Your actual Qonversion product IDs (MUST match dashboard)
  const PRODUCT_ID_MONTHLY = "speechworks_monthly";
  const PRODUCT_ID_ANNUAL = "speechworks_annual";

  // --------------------------------------------------------
  // Find matching product for selected plan
  // --------------------------------------------------------
  const getSelectedProduct = (): Product | undefined => {
    if (!products || products.length === 0) return undefined;

    const wantedId =
      paymentPlan === PAYMENT_PLAN_TYPE.MONTHLY
        ? PRODUCT_ID_MONTHLY
        : PRODUCT_ID_ANNUAL;

    return products.find(
      (p) =>
        p.qonversionId === wantedId ||
        (p as any).productId === wantedId ||
        (p as any).storeId === wantedId
    );
  };

  // --------------------------------------------------------
  // Handle Qonversion Payment
  // --------------------------------------------------------
  const handlePayment = async () => {
    try {
      const product = getSelectedProduct();
      if (!product) {
        Alert.alert(
          "Error",
          "Subscription product not found — check Qonversion IDs."
        );
        return;
      }

      let entitlementsMap =
        await Qonversion.getSharedInstance().purchaseProduct(product);

      const premiumEnt = entitlementsMap.get("premium");
      const isPremium = premiumEnt?.isActive === true;

      if (!isPremium) {
        Alert.alert(
          "Purchase processed",
          "Premium was not activated. Contact support."
        );
        return;
      }

      // Optimistic update
      const currentUser = useUserStore.getState().user;
      if (currentUser) {
        setUser({ ...currentUser, isPaid: true });
      }

      // Sync with backend
      try {
        const updated = await getMyUser();
        setUser(updated);
      } catch (e) {
        console.warn("⚠️ Backend sync failed after purchase:", e);
      }

      Alert.alert("🎉 Success", "You are now a Premium member!");
      navigation.goBack();
    } catch (err: any) {
      console.error("Qonversion purchase error:", err);
      Alert.alert("Purchase Failed", err?.message || "Something went wrong.");
    }
  };

  // --------------------------------------------------------
  // Loading UI
  // --------------------------------------------------------
  if (loading) {
    return (
      <View style={{ padding: 32 }}>
        <Text style={{ color: "white" }}>Loading subscription options...</Text>
      </View>
    );
  }

  // --------------------------------------------------------
  // MAIN UI
  // --------------------------------------------------------
  return (
    <LinearGradient
      colors={["#F97316", "#EC4899"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.screenView}
    >
      {/* Top Navigation */}
      <View style={styles.topNavigationContainer}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.topNavigation}
        >
          <Icon name="chevron-left" size={16} color={"#fff"} />
          <Text style={styles.topNavigationText}>Back</Text>
        </TouchableOpacity>
      </View>

      {/* Header */}
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

        {/* Plan Selection */}
        <View style={styles.tileWraper}>
          {/* MONTHLY */}
          <TouchableOpacity
            style={[
              styles.tile,
              paymentPlan === PAYMENT_PLAN_TYPE.MONTHLY && styles.selectedTile,
            ]}
            onPress={() => setPaymentPlan(PAYMENT_PLAN_TYPE.MONTHLY)}
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

          {/* ANNUAL */}
          <TouchableOpacity
            style={[
              styles.tile,
              paymentPlan === PAYMENT_PLAN_TYPE.ANNUALLY && styles.selectedTile,
            ]}
            onPress={() => setPaymentPlan(PAYMENT_PLAN_TYPE.ANNUALLY)}
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
              $9.99/month billed annually
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Button */}
      <TouchableOpacity style={styles.subscribeButton} onPress={handlePayment}>
        <Text style={styles.subscribeButtonText}>Upgrade Now</Text>
      </TouchableOpacity>
    </LinearGradient>
  );
};

export default PaywallScreen;

// --------------------------------------------------------
// Styles (unchanged from your original)
// --------------------------------------------------------
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
