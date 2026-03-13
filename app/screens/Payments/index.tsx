import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useState } from "react";
import {
  ScrollView,
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

const SubscribeScreen = () => {
  const { user } = useUserStore();
  const navigation = useNavigation();
  const [paymentPlan, setPaymentPlan] = useState<PAYMENT_PLAN_TYPE>(
    PAYMENT_PLAN_TYPE.ANNUALLY,
  );
  const [carouselIndex, setCarouselIndex] = useState(0);

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
          <Text style={styles.heroLabel}>PREMIUM ACCESS</Text>
          <Text style={styles.heroTitle}>Transform Your Voice.</Text>
          <Text style={styles.heroSubtitle}>
            Unlock the clinically-proven power of SpeechWorks and turn your
            limitations into strengths.
          </Text>
        </View>

        {/* Value Carousel (Replaces Table) */}
        <View style={styles.carouselSection}>
          <Text style={styles.carouselHeader}>Experience the Difference</Text>
          <ScrollView
            horizontal
            pagingEnabled={false}
            showsHorizontalScrollIndicator={false}
            onScroll={(e) => {
              const x = e.nativeEvent.contentOffset.x;
              const snapInterval = theme.dimensions.screenWidth * 0.8 + 16;
              const index = Math.round(x / snapInterval);
              if (index !== carouselIndex) setCarouselIndex(index);
            }}
            scrollEventThrottle={16}
            style={styles.carousel}
            snapToInterval={theme.dimensions.screenWidth * 0.8 + 16}
            snapToAlignment="start"
            decelerationRate="fast"
            contentContainerStyle={{
              paddingHorizontal:
                (theme.dimensions.screenWidth -
                  (theme.dimensions.screenWidth * 0.8 + 16)) /
                  2 +
                8,
            }}
          >
            {[
              {
                label: "Perf. Intelligence",
                free: "Limited",
                pro: "Deep Audit",
                icon: "chart-line",
                desc: "Deep tracking across 5 clinical domains with weekly breakthrough reports.",
              },
              {
                label: "Daily Activities",
                free: "1 / Day",
                pro: "No Limits",
                icon: "calendar-check",
                desc: "Progress shouldn't be gated. Practice as much as you need to reach your goals.",
              },
              {
                label: "Real-World Mastery",
                free: "Basic",
                pro: "Full Access",
                icon: "comment-alt",
                desc: "Simulate pressure with AI phone calls and social challenge drills.",
              },
              {
                label: "Stamina System",
                free: "Static",
                pro: "Smart Refill",
                icon: "bolt",
                desc: "Passive regeneration means you're always ready for a breakthrough.",
              },
              {
                label: "Clinical Depth",
                free: "Preview",
                pro: "Full Access",
                icon: "folder-open",
                desc: "Unlock the entire library of 14+ clinical packs designed by SLP experts.",
              },
            ].map((slide, i) => (
              <View key={i} style={styles.carouselSlide}>
                <View style={styles.slideInner}>
                  <View style={styles.watermarkContainer}>
                    <Icon
                      name={slide.icon}
                      size={140}
                      color={theme.colors.actionPrimary.default}
                    />
                  </View>
                  <Text style={styles.slideTitle}>{slide.label}</Text>
                  <Text style={styles.slideDesc}>{slide.desc}</Text>
                  <View style={styles.slideGapBox}>
                    <View style={styles.gapCol}>
                      <Text style={styles.gapLabel}>FREE</Text>
                      <Text
                        style={styles.gapValue}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {slide.free}
                      </Text>
                    </View>
                    <View style={styles.gapDivider} />
                    <View style={styles.gapCol}>
                      <Text
                        style={[
                          styles.gapLabel,
                          { color: theme.colors.actionPrimary.default },
                        ]}
                      >
                        PRO
                      </Text>
                      <Text
                        style={[
                          styles.gapValue,
                          { color: theme.colors.text.title },
                        ]}
                        numberOfLines={1}
                        adjustsFontSizeToFit
                      >
                        {slide.pro}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Pagination Dots */}
          <View style={styles.paginationDots}>
            {[0, 1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  carouselIndex === i ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            ))}
          </View>
        </View>

        {/* Note from Therapists (Narrative) */}
        <View style={styles.noteContainer}>
          <View style={styles.noteHeader}>
            <View style={styles.slpAvatar}>
              <Icon name="user-md" size={14} color="#FFF" />
            </View>
            <Text style={styles.noteHeaderText}>A Note from our SLPs</Text>
          </View>
          <Text style={styles.noteText}>
            "We built Premium because progress shouldn't be limited by a timer.
            It's the commitment you make to your future self—having the right
            support when anxiety hits and the real data to prove you’re
            winning."
          </Text>
        </View>

        {/* Pricing Cards */}
        <View style={styles.pricingHeader}>
          <Text style={styles.pricingTitle}>Simple Pricing</Text>
          <Text style={styles.pricingSubtitle}>
            Choose the plan that fits your growth journey
          </Text>
        </View>
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
    marginBottom: 56,
    marginTop: 80,
  },
  heroLabel: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.actionPrimary.default,
    fontWeight: "800",
    textTransform: "uppercase",
    letterSpacing: 2,
    marginBottom: 12,
  },
  heroTitle: {
    ...parseTextStyle(theme.typography.Heading1),
    color: theme.colors.text.title,
    textAlign: "center",
    marginBottom: 16,
    fontSize: 36,
  },
  heroSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    paddingHorizontal: 10,
    lineHeight: 24,
    opacity: 0.8,
  },

  // Carousel Section
  carouselSection: {
    marginBottom: 56,
    overflow: "visible",
  },
  carouselHeader: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginBottom: 24,
    textAlign: "center",
  },
  carousel: {
    width: theme.dimensions.screenWidth,
    alignSelf: "center",
    paddingVertical: 32,
    overflow: "visible",
  },
  carouselSlide: {
    width: theme.dimensions.screenWidth * 0.8,
    backgroundColor: "#FFF",
    borderRadius: 32,
    ...parseShadowStyle(theme.shadow.elevation3),
    marginHorizontal: 8, // Half of 16px gap
  },
  slideInner: {
    padding: 24,
    alignItems: "center",
    borderRadius: 32,
    overflow: "hidden", // Clips watermark
    width: "100%",
  },
  watermarkContainer: {
    position: "absolute",
    right: -20,
    bottom: -20,
    opacity: 0.05,
    zIndex: -1,
    transform: [{ rotate: "-15deg" }],
  },
  slideIconBox: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "rgba(251, 146, 60, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  slideTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    fontSize: 24,
    color: theme.colors.text.title,
    marginBottom: 12,
    textAlign: "center",
  },
  slideDesc: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    marginBottom: 28,
    lineHeight: 22,
    opacity: 0.8,
  },
  slideGapBox: {
    flexDirection: "row",
    backgroundColor: theme.colors.library.gray[100],
    borderRadius: 20,
    padding: 12,
    width: "100%",
    alignItems: "flex-start",
  },
  gapCol: {
    flex: 1,
    alignItems: "center",
  },
  gapLabel: {
    ...parseTextStyle(theme.typography.BodyDetails),
    fontWeight: "800",
    color: theme.colors.text.disabled,
    marginBottom: 4,
    letterSpacing: 1,
  },
  gapValue: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 15,
    color: theme.colors.text.disabled,
  },
  gapDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.colors.library.gray[200],
    marginHorizontal: 12,
  },
  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 24,
  },
  dot: {
    height: 8,
    borderRadius: 4,
  },
  activeDot: {
    width: 24,
    backgroundColor: theme.colors.actionPrimary.default,
  },
  inactiveDot: {
    width: 8,
    backgroundColor: theme.colors.library.gray[300],
  },

  // Note from SLPs
  noteContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 24,
    padding: 28, // Increased
    marginBottom: 64, // Increased
    borderStyle: "dashed",
    borderWidth: 1.5,
    borderColor: theme.colors.actionPrimary.default,
  },

  noteHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  slpAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: theme.colors.actionPrimary.default,
    alignItems: "center",
    justifyContent: "center",
  },
  noteHeaderText: {
    ...parseTextStyle(theme.typography.BodySmall),
    fontWeight: "700",
    color: theme.colors.actionPrimary.default,
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  noteText: {
    ...parseTextStyle(theme.typography.Body),
    fontStyle: "italic",
    color: theme.colors.text.title,
    lineHeight: 22,
    opacity: 0.9,
  },

  // Pricing Header
  pricingHeader: {
    alignItems: "center",
    marginBottom: 24,
  },
  pricingTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    marginBottom: 4,
  },
  pricingSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    opacity: 0.7,
  },

  // Plans
  plansContainer: {
    gap: 16,
    marginBottom: 40,
  },
  planCard: {
    borderRadius: 24,
    backgroundColor: "#FFF",
    borderWidth: 2,
    padding: 24,
    position: "relative",
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  activePlanCard: {
    borderColor: theme.colors.actionPrimary.default,
    backgroundColor: "#FFF7ED",
  },
  inactivePlanCard: {
    borderColor: theme.colors.library.gray[200],
    backgroundColor: "#FFF",
  },
  bestValueBadge: {
    position: "absolute",
    top: -12,
    right: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
  },
  bestValueText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "#FFF",
    fontWeight: "800",
    fontSize: 10,
    letterSpacing: 0.5,
  },
  cardContent: {
    flexDirection: "row",
    gap: 20,
    alignItems: "center",
  },
  radioCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 2.5,
    borderColor: theme.colors.library.gray[300],
    alignItems: "center",
    justifyContent: "center",
  },
  radioInner: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: theme.colors.actionPrimary.default,
  },
  planHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  planName: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 20,
    color: theme.colors.text.title,
  },
  savingsTag: {
    backgroundColor: "#DEF7EC",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  savingsText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#03543F",
    letterSpacing: 0.5,
  },
  planDescription: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    fontSize: 22,
    marginTop: 4,
  },
  planMath: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    opacity: 0.6,
    marginTop: 2,
  },
  strikeThrough: {
    textDecorationLine: "line-through",
    color: theme.colors.text.disabled,
    fontWeight: "400",
    fontSize: 16,
  },

  // Footer
  footerContainer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "rgba(255,255,255,0.95)",
    paddingHorizontal: 24,
    paddingTop: 20,
    paddingBottom: 44,
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.06)",
    ...parseShadowStyle(theme.shadow.elevation4),
  },
  upgradeButton: {
    borderRadius: 20,
    marginBottom: 16,
    ...parseShadowStyle(theme.shadow.elevation3),
    overflow: "hidden",
    paddingVertical: 18,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeButtonText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFF",
    fontSize: 18,
    fontWeight: "700",
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  trustText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.disabled,
    fontWeight: "500",
  },
});
