import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import RazorpayCheckout, { CheckoutOptions } from "react-native-razorpay";
import Icon from "react-native-vector-icons/FontAwesome5";
import { createRazorpayOrder } from "../../api/payments";
import CustomScrollView from "../../components/CustomScrollView";
import ScreenView from "../../components/ScreenView";
import { useUserStore } from "../../stores/user";
import { theme } from "../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../util/functions/parseStyles";
import { triggerToast } from "../../util/functions/toast";
import { PREMIUM_FEATURES } from "./constants";

export enum PAYMENT_PLAN_TYPE {
  MONTHLY = 0,
  ANNUALLY = 1,
}

const { width } = Dimensions.get("window");

const SubscribeScreen = () => {
  const { user } = useUserStore();
  const navigation = useNavigation();
  const [paymentPlan, setPaymentPlan] = useState<PAYMENT_PLAN_TYPE>(
    PAYMENT_PLAN_TYPE.ANNUALLY,
  );

  const handlePayment = async () => {
    try {
      console.log("⚡ Payment button pressed");

      console.log("➡️ Calling backend to create order for user:", user?.id);
      if (!user?.id) {
        console.error("❌ User ID is not available");
        return;
      }

      const response = await createRazorpayOrder({
        userId: user.id,
        amount: paymentPlan === PAYMENT_PLAN_TYPE.MONTHLY ? 1199 : 11999, // paise
        currency: "INR",
      });

      console.log("✅ Raw backend response:", response);

      const order = response;
      if (!order?.orderId) {
        console.error("❌ Backend did not return an order ID", order);
        return;
      }
      console.log("✅ Order created successfully:", order);

      // 2. Open Razorpay checkout
      const options: CheckoutOptions = {
        description: "SpeechWorks Premium Subscription",
        image: "https://ibb.co/YFgn6JkY",
        currency: order.currency,
        key: "rzp_test_R5etRTxWNFWDih", // ⚠️ replace with process.env for prod
        name: "Speechworks",
        order_id: order.id,
        amount: order.amount, // use backend-confirmed amount
        prefill: {
          email: "user@example.com",
          contact: "9999999999",
          name: "John Doe",
        },
        theme: {
          color: theme.colors.actionPrimary.default,
          backdrop_color: "red",
        },
      };

      console.log("🟢 Opening Razorpay with options:", options);

      RazorpayCheckout.open(options)
        .then((paymentData: any) => {
          console.log("🎉 Payment Success full response:", paymentData);
          triggerToast(
            "success",
            "Payment successful!",
            `Payment ID: ${paymentData.razorpay_payment_id}`,
          );
        })
        .catch((error: any) => {
          console.error("❌ Payment Failed:", error);
          triggerToast("error", "Payment failed", `Please retry payment.`);
        });
    } catch (err) {
      console.error("🔥 Error in handlePayment:", err);
      triggerToast(
        "error",
        "Payment failed. Please try again.",
        "Something went wrong with payment.",
      );
    }
  };

  return (
    <ScreenView style={styles.screenView}>
      {/* Aurora Mesh Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#FFF7ED", "#FFF", "#FFF"]}
          locations={[0, 0.4, 1]}
          style={{ flex: 1 }}
        />
        {/* Decorative Orbs */}
        <View style={styles.orbTopRight} />
        <View style={styles.orbBottomLeft} />
      </View>

      {/* Header Navigation - Sticky */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="times" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
      </View>

      <CustomScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <View style={styles.crownIconContainer}>
            <LinearGradient
              colors={["#F59E0B", "#D97706"]}
              style={styles.crownGradient}
            >
              <Icon name="crown" size={24} color="#FFF" solid />
            </LinearGradient>
          </View>
          <Text style={styles.heroTitle}>Don’t Just Practice. Transform.</Text>
          <Text style={styles.heroSubtitle}>
            Stop hitting walls and start breaking records. Unlock the full
            clinical power of SpeechWorks today.
          </Text>
        </View>

        {/* Emotional Narrative */}
        <View style={styles.narrativeContainer}>
          <Text style={styles.narrativeText}>
            You’ve done the free version. You’ve seen the potential. But
            progress shouldn't be limited by a timer. Premium isn't just a list
            of features; it's the commitment you make to your future self.
          </Text>
        </View>

        {/* Benefits List */}
        <View style={styles.benefitsContainer}>
          {PREMIUM_FEATURES.map((feature, index) => (
            <View key={index} style={styles.benefitRow}>
              <View style={styles.checkIcon}>
                <Icon name="check" size={10} color="#FFF" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.benefitText}>{feature.headline}</Text>
                <Text style={styles.benefitSubtitle}>{feature.subtitle}</Text>
              </View>
            </View>
          ))}
        </View>

        {/* Pricing Cards */}
        <View style={styles.plansContainer}>
          {/* Annual Plan */}
          <TouchableOpacity
            onPress={() => setPaymentPlan(PAYMENT_PLAN_TYPE.ANNUALLY)}
            style={[
              styles.planCard,
              paymentPlan === PAYMENT_PLAN_TYPE.ANNUALLY
                ? styles.activePlanCard
                : styles.inactivePlanCard,
            ]}
            activeOpacity={0.95}
          >
            {paymentPlan === PAYMENT_PLAN_TYPE.ANNUALLY && (
              <LinearGradient
                colors={[theme.colors.actionPrimary.default, "#EC4899"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.bestValueBadge}
              >
                <Text style={styles.bestValueText}>BEST VALUE</Text>
              </LinearGradient>
            )}
            <View style={styles.cardContent}>
              <View style={styles.radioCircle}>
                {paymentPlan === PAYMENT_PLAN_TYPE.ANNUALLY && (
                  <View style={styles.radioInner} />
                )}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <View style={styles.planHeaderRow}>
                  <Text style={styles.planName}>Annual</Text>
                  <View style={styles.savingsTag}>
                    <Text style={styles.savingsText}>SAVE 17%</Text>
                  </View>
                </View>
                <Text style={styles.planDescription}>
                  <Text style={styles.strikeThrough}>$143.88</Text> $119.99
                  /year
                </Text>
                <Text style={styles.planMath}>That’s just $9.99/month</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Monthly Plan */}
          <TouchableOpacity
            onPress={() => setPaymentPlan(PAYMENT_PLAN_TYPE.MONTHLY)}
            style={[
              styles.planCard,
              paymentPlan === PAYMENT_PLAN_TYPE.MONTHLY
                ? styles.activePlanCard
                : styles.inactivePlanCard,
            ]}
            activeOpacity={0.95}
          >
            <View style={styles.cardContent}>
              <View style={styles.radioCircle}>
                {paymentPlan === PAYMENT_PLAN_TYPE.MONTHLY && (
                  <View style={styles.radioInner} />
                )}
              </View>
              <View style={{ flex: 1, gap: 4 }}>
                <Text style={styles.planName}>Monthly</Text>
                <Text style={styles.planDescription}>$11.99 /month</Text>
                <Text style={styles.planMath}>Flexible, cancel anytime</Text>
              </View>
            </View>
          </TouchableOpacity>
        </View>
      </CustomScrollView>

      {/* Floating Bottom CTA */}
      <View style={styles.footerContainer}>
        <TouchableOpacity activeOpacity={0.9} onPress={handlePayment}>
          <LinearGradient
            colors={[theme.colors.library.orange[400], "#DB2777"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.upgradeButton}
          >
            <Text style={styles.upgradeButtonText}>
              {paymentPlan === PAYMENT_PLAN_TYPE.ANNUALLY
                ? "Start My 7-Day Free Trial" // High conversion copy
                : "Get Instant Access"}
            </Text>
          </LinearGradient>
        </TouchableOpacity>

        <View style={styles.trustRow}>
          <Icon
            name="shield-alt"
            size={12}
            color={theme.colors.text.disabled}
          />
          <Text style={styles.trustText}>
            30-Day Money-Back Guarantee • Cancel Anytime
          </Text>
        </View>
      </View>
    </ScreenView>
  );
};

export default SubscribeScreen;

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
    paddingTop: 0,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 160, // Ensure last item clears the footer
  },
  // Aurora Orbs
  orbTopRight: {
    position: "absolute",
    top: -50,
    right: -50,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(251, 146, 60, 0.15)", // Orange 400
    transform: [{ scale: 1.5 }],
  },
  orbBottomLeft: {
    position: "absolute",
    bottom: 100,
    left: -50,
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: "rgba(236, 72, 153, 0.1)", // Pink 500
    transform: [{ scale: 1.2 }],
  },

  // Navbar
  navBar: {
    position: "absolute",
    top: 20, // Adjust for safe area if needed, or use SafeAreaView
    right: 20,
    zIndex: 100,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },

  // Hero
  heroContainer: {
    alignItems: "center",
    marginBottom: 32,
    marginTop: 100, // Added margin to clear header initially
  },
  crownIconContainer: {
    marginBottom: 16,
    borderRadius: 32, // Match the gradient's radius to fix square shadow
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  crownGradient: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    fontSize: 28,
    textAlign: "center",
    color: theme.colors.text.title,
    marginBottom: 8,
  },
  heroSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    textAlign: "center",
    color: theme.colors.text.default,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  narrativeContainer: {
    paddingHorizontal: 20,
    marginBottom: 32,
    borderLeftWidth: 3,
    borderLeftColor: theme.colors.library.orange[400],
    paddingLeft: 16,
  },
  narrativeText: {
    ...parseTextStyle(theme.typography.Body),
    fontStyle: "italic",
    color: theme.colors.text.default,
    fontSize: 14,
    lineHeight: 20,
    opacity: 0.8,
  },

  // Benefits
  benefitsContainer: {
    backgroundColor: "rgba(255,255,255,0.6)",
    borderRadius: 24,
    padding: 24,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },
  benefitRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 16,
  },
  checkIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: theme.colors.actionPrimary.default,
    alignItems: "center",
    justifyContent: "center",
  },
  benefitText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    fontWeight: "600",
  },
  benefitSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },

  // Plans
  plansContainer: {
    gap: 16,
  },
  planCard: {
    borderRadius: 20,
    backgroundColor: "#FFF",
    borderWidth: 2,
    padding: 20,
    position: "relative",
    ...parseShadowStyle(theme.shadow.elevation1),
    // overflow: "hidden" REMOVED to allow badge to hang out
  },
  activePlanCard: {
    borderColor: theme.colors.actionPrimary.default,
    backgroundColor: "#FFF7ED", // Very light orange tint
  },
  inactivePlanCard: {
    borderColor: theme.colors.library.gray[200], // Subtle grey border instead of transparent
    backgroundColor: "#FFF",
  },
  bestValueBadge: {
    position: "absolute",
    top: -12,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  bestValueText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#FFF",
    fontWeight: "700",
    fontSize: 10,
  },
  cardContent: {
    flexDirection: "row",
    gap: 16,
    alignItems: "center",
  },
  radioCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: theme.colors.library.gray[300],
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: theme.colors.actionPrimary.default,
  },
  planHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  planName: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 18,
    color: theme.colors.text.title,
  },
  savingsTag: {
    backgroundColor: "#DEF7EC",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  savingsText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#03543F",
  },
  planDescription: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    fontWeight: "600",
  },
  planMath: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.disabled,
  },
  strikeThrough: {
    textDecorationLine: "line-through",
    color: theme.colors.text.disabled,
  },

  // Footer
  footerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.9)",
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  upgradeButton: {
    borderRadius: 16,
    marginBottom: 12,
    ...parseShadowStyle(theme.shadow.elevation2),
    overflow: "hidden",
    paddingVertical: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  gradientButton: {
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  upgradeButtonText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFF",
    fontSize: 18,
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  trustText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.disabled,
  },
});
