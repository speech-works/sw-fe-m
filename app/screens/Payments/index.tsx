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
import Icon from "react-native-vector-icons/MaterialCommunityIcons";
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
      if (!user?.id) {
        triggerToast("error", "Error", "User not found. Please log in.");
        return;
      }

      const response = await createRazorpayOrder({
        userId: user.id,
        amount: paymentPlan === PAYMENT_PLAN_TYPE.MONTHLY ? 1199 : 11999, // paise
        currency: "INR",
      });

      const order = response;
      if (!order?.orderId) return;

      const options: CheckoutOptions = {
        description: "SpeechWorks Premium Subscription",
        image: "https://ibb.co/YFgn6JkY",
        currency: order.currency,
        key: "rzp_test_R5etRTxWNFWDih",
        name: "Speechworks",
        order_id: order.id,
        amount: order.amount,
        prefill: {
          email: user.email || "",
          contact: "",
          name: user.name || "User",
        },
        theme: {
          color: "#D4AF37",
        },
      };

      RazorpayCheckout.open(options)
        .then((paymentData: any) => {
          triggerToast(
            "success",
            "Welcome to Premium!",
            "Your subscription is now active.",
          );
          navigation.goBack();
        })
        .catch((error: any) => {
          // Check if it's a user cancellation (error code 2)
          console.log("Razorpay Error:", error.code, error.description);
          if (error.code === 2) {
            // User cancelled, do nothing
            return;
          }

          triggerToast(
            "error",
            "Payment Failed",
            "Please try again or contact support.",
          );
        });
    } catch (err) {
      triggerToast("error", "Payment Failed", "Something went wrong.");
    }
  };

  return (
    <ScreenView style={styles.screenView}>
      {/* Background Layer */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#0F172A", "#1E293B", "#0F172A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{ flex: 1 }}
        />
        {/* Glow Orbs */}
        <View
          style={[
            styles.glowOrb,
            { top: -50, right: -50, backgroundColor: "#22D3EE", opacity: 0.1 },
          ]}
        />
        <View
          style={[
            styles.glowOrb,
            {
              bottom: 100,
              left: -50,
              width: 250,
              height: 250,
              backgroundColor: "#8B5CF6",
              opacity: 0.08,
            },
          ]}
        />
      </View>

      {/* Header NavBar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="close" size={20} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <CustomScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroContainer}>
          <View style={styles.badgeGlass}>
            <View style={styles.badgeInner}>
              <Icon name="crown" size={12} color="#D4AF37" />
              <Text style={styles.badgeText}>PREMIUM ACCESS</Text>
            </View>
          </View>
          <Text style={styles.heroTitle}>Control Your Voice.</Text>
          <Text style={styles.heroSubtitle}>
            Unlock the clinically-proven power of Speechworks and turn your
            limitations into strengths.
          </Text>
        </View>

        {/* Feature Carousel */}
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
                icon: "robot",
                desc: "Simulate pressure with AI phone calls and social challenge drills.",
              },
              {
                label: "Stamina System",
                free: "Static",
                pro: "Smart Refill",
                icon: "lightning-bolt",
                desc: "Passive regeneration means you're always ready for a breakthrough.",
              },
              {
                label: "Clinical Depth",
                free: "Preview",
                pro: "Full Access",
                icon: "folder-open",
                desc: "Unlock the entire library of clinical packs designed by Speechworks.",
              },
            ].map((slide, i) => (
              <View key={i} style={styles.carouselSlide}>
                <View
                  style={[
                    styles.slideInner,
                    { backgroundColor: "rgba(255, 255, 255, 0.04)" },
                  ]}
                >
                  <View style={styles.watermarkIcon}>
                    <Icon
                      name={slide.icon}
                      size={120}
                      color="#D4AF37"
                      style={{ opacity: 0.03 }}
                    />
                  </View>
                  <View style={styles.iconCircle}>
                    <Icon name={slide.icon} size={28} color="#D4AF37" />
                  </View>
                  <Text style={styles.slideTitle}>{slide.label}</Text>
                  <Text style={styles.slideDesc}>{slide.desc}</Text>

                  <View style={styles.compareRow}>
                    <View style={styles.compareCol}>
                      <Text style={styles.compareLabel}>FREE</Text>
                      <Text style={styles.compareValue}>{slide.free}</Text>
                    </View>
                    <View style={styles.compareDivider} />
                    <View style={styles.compareCol}>
                      <Text style={[styles.compareLabel, { color: "#D4AF37" }]}>
                        PRO
                      </Text>
                      <Text style={[styles.compareValue, { color: "#FFFFFF" }]}>
                        {slide.pro}
                      </Text>
                    </View>
                  </View>
                </View>
              </View>
            ))}
          </ScrollView>

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

        {/* Narrative Note */}
        <View style={styles.noteContainer}>
          <View style={styles.noteWatermark}>
            <Icon
              name="account-group"
              size={180}
              color="#D4AF37"
              style={{ opacity: 0.02 }}
            />
          </View>
          <Icon
            name="format-quote-open"
            size={40}
            color="#D4AF37"
            style={{ opacity: 0.2, marginBottom: 16 }}
          />
          <Text style={styles.noteText}>
            We built Premium because progress shouldn't be limited by a timer.
            It's the commitment you make to your future self—having the right
            support when anxiety hits and the real data to prove you’re winning.
          </Text>
          <View style={styles.noteSignature}>
            <View style={styles.signatureLine} />
            <Text style={styles.signatureText}>The Speechworks Team</Text>
            <View style={styles.signatureLine} />
          </View>
        </View>

        {/* Pricing Selection */}
        <View style={styles.pricingSection}>
          <Text style={styles.pricingTitle}>Simple Pricing</Text>
          <Text style={styles.pricingSubtitle}>
            Choose the plan that fits your growth journey
          </Text>

          <View style={styles.plansGap}>
            {/* Annual */}
            <TouchableOpacity
              onPress={() => setPaymentPlan(PAYMENT_PLAN_TYPE.ANNUALLY)}
              activeOpacity={0.9}
              style={[
                styles.planCard,
                paymentPlan === PAYMENT_PLAN_TYPE.ANNUALLY
                  ? styles.activePlanCard
                  : styles.inactivePlanCard,
              ]}
            >
              {paymentPlan === PAYMENT_PLAN_TYPE.ANNUALLY && (
                <LinearGradient
                  colors={["#D4AF37", "#B8860B"]}
                  style={styles.bestValueBadge}
                >
                  <Text style={styles.bestValueText}>BEST VALUE</Text>
                </LinearGradient>
              )}
              <View style={styles.planHeader}>
                <View
                  style={[
                    styles.radio,
                    paymentPlan === PAYMENT_PLAN_TYPE.ANNUALLY &&
                      styles.radioActive,
                  ]}
                >
                  {paymentPlan === PAYMENT_PLAN_TYPE.ANNUALLY && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <View style={styles.planNameRow}>
                    <Text style={styles.planName}>Annual Membership</Text>
                    <View style={styles.savingsBadge}>
                      <Text style={styles.savingsText}>SAVE 17%</Text>
                    </View>
                  </View>
                  <Text style={styles.planPrice}>
                    <Text style={styles.strikePrice}>₹14,399</Text> ₹11,999
                    <Text style={styles.pricePeriod}>/year</Text>
                  </Text>
                  <Text style={styles.planSubtext}>Roughly ₹999 / month</Text>
                </View>
              </View>
            </TouchableOpacity>

            {/* Monthly */}
            <TouchableOpacity
              onPress={() => setPaymentPlan(PAYMENT_PLAN_TYPE.MONTHLY)}
              activeOpacity={0.9}
              style={[
                styles.planCard,
                paymentPlan === PAYMENT_PLAN_TYPE.MONTHLY
                  ? styles.activePlanCard
                  : styles.inactivePlanCard,
              ]}
            >
              <View style={styles.planHeader}>
                <View
                  style={[
                    styles.radio,
                    paymentPlan === PAYMENT_PLAN_TYPE.MONTHLY &&
                      styles.radioActive,
                  ]}
                >
                  {paymentPlan === PAYMENT_PLAN_TYPE.MONTHLY && (
                    <View style={styles.radioInner} />
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planName}>Monthly Explorer</Text>
                  <Text style={styles.planPrice}>
                    ₹1,199<Text style={styles.pricePeriod}>/month</Text>
                  </Text>
                  <Text style={styles.planSubtext}>
                    Flexible, cancel anytime
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>
      </CustomScrollView>

      {/* Persistent Footer */}
      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.upgradeBtnWrapper}
          activeOpacity={0.85}
          onPress={handlePayment}
        >
          <LinearGradient
            colors={["#D4AF37", "#B8860B", "#996515"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.upgradeBtn}
          >
            <Text style={styles.upgradeBtnText}>
              {paymentPlan === PAYMENT_PLAN_TYPE.ANNUALLY
                ? "Start 7-Day Free Trial"
                : "Unlock Full Access"}
            </Text>
            <View style={styles.btnShine} />
          </LinearGradient>
        </TouchableOpacity>
        <View style={styles.guaranteeRow}>
          <Icon name="shield-check" size={14} color="rgba(255,255,255,0.4)" />
          <Text style={styles.guaranteeText}>
            Secure Payment • No Questions Asked Refund
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
    backgroundColor: "#0F172A",
  },
  scrollContent: {
    paddingBottom: 180,
  },
  glowOrb: {
    position: "absolute",
    borderRadius: 200,
    width: 300,
    height: 300,
  },
  navBar: {
    paddingTop: 50,
    paddingHorizontal: 20,
    flexDirection: "row",
    justifyContent: "flex-end",
    position: "absolute",
    top: 0,
    right: 0,
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  // Hero
  heroContainer: {
    alignItems: "center",
    paddingHorizontal: 24,
    marginTop: 80,
    marginBottom: 48,
  },
  badgeGlass: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    borderRadius: 100,
    padding: 1,
    marginBottom: 20,
  },
  badgeInner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 100,
    gap: 8,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
  },
  badgeText: {
    color: "#D4AF37",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 2,
  },
  heroTitle: {
    color: "#FFFFFF",
    fontSize: 38,
    fontWeight: "900",
    textAlign: "center",
    letterSpacing: -1,
    marginBottom: 16,
  },
  heroSubtitle: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 16,
    textAlign: "center",
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  // Carousel
  carouselSection: {
    marginBottom: 48,
  },
  carouselHeader: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 24,
  },
  carousel: {
    overflow: "visible",
  },
  carouselSlide: {
    width: theme.dimensions.screenWidth * 0.8,
    marginHorizontal: 8,
  },
  slideInner: {
    padding: 24,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    overflow: "hidden",
    height: 340, // Uniform height for benefit cards
    justifyContent: "space-between",
  },
  watermarkIcon: {
    position: "absolute",
    right: -20,
    bottom: -20,
    transform: [{ rotate: "-15deg" }],
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 20,
    backgroundColor: "rgba(212, 175, 55, 0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "rgba(212, 175, 55, 0.2)",
  },
  slideTitle: {
    color: "#FFFFFF",
    fontSize: 22,
    fontWeight: "900",
    marginBottom: 12,
  },
  slideDesc: {
    color: "rgba(255,255,255,0.6)",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 24,
  },
  compareRow: {
    flexDirection: "row",
    backgroundColor: "rgba(0,0,0,0.2)",
    borderRadius: 20,
    padding: 16,
    alignItems: "center",
  },
  compareCol: {
    flex: 1,
    alignItems: "center",
  },
  compareLabel: {
    fontSize: 9,
    fontWeight: "900",
    color: "rgba(255,255,255,0.4)",
    letterSpacing: 1,
    marginBottom: 4,
  },
  compareValue: {
    fontSize: 14,
    fontWeight: "800",
    color: "rgba(255,255,255,0.6)",
  },
  compareDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  paginationDots: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
    gap: 8,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  activeDot: {
    width: 20,
    backgroundColor: "#D4AF37",
  },
  inactiveDot: {
    width: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  // Note
  noteContainer: {
    marginHorizontal: 24,
    backgroundColor: "rgba(255,255,255,0.03)",
    padding: 32,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.06)",
    alignItems: "center",
    marginBottom: 64,
  },
  noteWatermark: {
    position: "absolute",
    bottom: -30,
    right: -30,
  },
  noteText: {
    color: "#FFFFFF",
    fontSize: 18,
    lineHeight: 28,
    textAlign: "center",
    fontWeight: "500",
    fontStyle: "italic",
    marginBottom: 24,
  },
  noteSignature: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  signatureLine: {
    width: 30,
    height: 1,
    backgroundColor: "#D4AF37",
    opacity: 0.3,
  },
  signatureText: {
    color: "#D4AF37",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 1,
  },
  // Pricing
  pricingSection: {
    paddingHorizontal: 24,
  },
  pricingTitle: {
    color: "#FFFFFF",
    fontSize: 28,
    fontWeight: "900",
    textAlign: "center",
    marginBottom: 8,
  },
  pricingSubtitle: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 32,
  },
  plansGap: {
    gap: 16,
  },
  planCard: {
    borderRadius: 24,
    padding: 24,
    borderWidth: 2,
    position: "relative",
    height: 145, // Uniform height for pricing cards
    justifyContent: "center",
  },
  activePlanCard: {
    backgroundColor: "rgba(212, 175, 55, 0.08)",
    borderColor: "#D4AF37",
  },
  inactivePlanCard: {
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  bestValueBadge: {
    position: "absolute",
    top: -12,
    right: 20,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 100,
  },
  bestValueText: {
    color: "#FFFFFF",
    fontSize: 10,
    fontWeight: "900",
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.2)",
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: {
    borderColor: "#D4AF37",
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#D4AF37",
  },
  planNameRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  planName: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
  },
  savingsBadge: {
    backgroundColor: "#D4AF37",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  savingsText: {
    color: "#000",
    fontSize: 9,
    fontWeight: "900",
  },
  planPrice: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "900",
  },
  strikePrice: {
    color: "rgba(255,255,255,0.3)",
    fontSize: 16,
    textDecorationLine: "line-through",
  },
  pricePeriod: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    fontWeight: "400",
  },
  planSubtext: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 12,
    marginTop: 4,
  },
  // Footer
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 24,
    paddingBottom: 40,
    paddingHorizontal: 24,
    backgroundColor: "rgba(15, 23, 42, 0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.1)",
  },
  upgradeBtnWrapper: {
    borderRadius: 20,
    overflow: "hidden",
    marginBottom: 16,
  },
  upgradeBtn: {
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  upgradeBtnText: {
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 0.5,
  },
  btnShine: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: "50%",
    backgroundColor: "rgba(255,255,255,0.1)",
  },
  guaranteeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  guaranteeText: {
    color: "rgba(255,255,255,0.4)",
    fontSize: 11,
    fontWeight: "600",
  },
});
