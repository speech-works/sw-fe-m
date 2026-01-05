import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  TextInput,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import ScreenView from "../../components/ScreenView";
import CustomScrollView from "../../components/CustomScrollView";
import { theme } from "../../Theme/tokens";
import { parseTextStyle } from "../../util/functions/parseStyles";
import DiverseCommunityFace from "../../assets/sw-faces/DiverseCommunityFace";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";

const { width } = Dimensions.get("window");
const FACE_SIZE = width * 0.55;

// Flip-Clock Style Counter Component
const FlipDigit = ({ digit }: { digit: string }) => (
  <View style={styles.digitBox}>
    <Text style={styles.digitText}>{digit}</Text>
  </View>
);

const AnimatedCounter = () => {
  const [count, setCount] = useState(2847);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => prev + Math.floor(Math.random() * 3) + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  const countString = count.toLocaleString().replace(/,/g, "");
  const digits = countString.split("");

  return (
    <View style={styles.counterCard}>
      <LinearGradient
        colors={["#FFF7ED", "#FFE4E6", "#FFEEF8"]} // Peach → Pink → Lavender
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.counterGradient}
      >
        <Text style={styles.counterTitle}>FOUNDING MEMBERS WAITING</Text>

        <View style={styles.digitsContainer}>
          {digits.map((digit, index) => (
            <FlipDigit key={index} digit={digit} />
          ))}
        </View>

        <Text style={styles.counterLabel}>
          future leaders joining the revolution
        </Text>
      </LinearGradient>
    </View>
  );
};

// Feature Card with Octalysis Gamification Elements
const FeatureCard = ({
  title,
  description,
  iconName,
  gradient,
  watermarkColor,
  locked,
}: {
  title: string;
  description: string;
  iconName: string;
  gradient: readonly [string, string, ...string[]];
  watermarkColor: string;
  locked?: boolean;
}) => (
  <View style={styles.featureCard}>
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.featureGradient}
    >
      <View style={styles.watermarkContainer}>
        <MaterialCommunityIcons
          name={iconName}
          size={140}
          color={watermarkColor}
          style={{ opacity: 0.15 }}
        />
      </View>

      <View style={styles.featureContent}>
        <View style={styles.featureHeader}>
          <View style={styles.iconCircle}>
            <MaterialCommunityIcons name={iconName} size={28} color="#1F2937" />
          </View>
          {locked && (
            <View style={styles.comingSoonBadge}>
              <Text style={styles.comingSoonText}>SOON</Text>
            </View>
          )}
        </View>

        <View style={styles.featureTextContainer}>
          <Text style={styles.featureTitle}>{title}</Text>
          <Text style={styles.featureDescription}>{description}</Text>
        </View>
      </View>
    </LinearGradient>
  </View>
);

const Community = () => {
  const [email, setEmail] = useState("");

  const handleJoinWaitlist = () => {
    console.log("Joining waitlist with email:", email);
  };

  return (
    <ScreenView style={styles.screenView}>
      {/* Soft Multi-Stop Gradient Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#FFF7ED", "#FFEEF8", "#F0F9FF", "#FFFFFF"]} // Peach → Lavender → Sky → White
          locations={[0, 0.3, 0.6, 1]}
          style={{ flex: 1 }}
        />
      </View>

      <CustomScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Gentle Header */}
        <View style={styles.header}>
          <Text style={styles.title}>The Speechworks Community</Text>
          <Text style={styles.subtitle}>
            A global movement of speakers finding their voice.
          </Text>
        </View>

        <View style={styles.innerContainer}>
          {/* Counter with Soft Gradient */}
          <AnimatedCounter />

          {/* Friendly Illustration */}
          <View style={styles.illustrationSection}>
            <DiverseCommunityFace size={FACE_SIZE} shouldAnimate />
            <Text style={styles.illustrationCaption}>
              "The most powerful way to change the world is to change how you
              speak to it."
            </Text>
          </View>

          {/* Call for Purpose Section */}
          <View style={styles.purposeSection}>
            <Text style={styles.purposeTitle}>Join the Revolution</Text>
            <Text style={styles.purposeText}>
              We are democratizing public speaking for everyone, everywhere. Be
              part of the first cohort to access these game-changing features.
            </Text>
          </View>

          {/* Features with Pastel Gradients & Gamification */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Unlockable Achievements</Text>
            <Text style={styles.sectionSubtitle}>
              Coming soon to your journey
            </Text>

            <View style={styles.featuresGrid}>
              <FeatureCard
                iconName="trophy-award"
                title="Leaderboards & Leagues"
                description="Compete with friends and rise through the ranks. Claim your spot atop the Global Speaker Hall of Fame."
                gradient={["#FEF3C7", "#FCD34D"]} // Amber Gold
                watermarkColor="#B45309"
                locked
              />
              <FeatureCard
                iconName="account-group"
                title="Practice Pods"
                description="Join exclusive real-time practice rooms. Give feedback, get inspired, and grow together."
                gradient={["#E0E7FF", "#A5B4FC"]} // Indigo
                watermarkColor="#4338CA"
                locked
              />
              <FeatureCard
                iconName="star-four-points"
                title="Mentor Matching"
                description="Get paired with expert speakers for 1:1 coaching. Unlock wisdom from the best."
                gradient={["#ECFDF5", "#6EE7B7"]} // Emerald
                watermarkColor="#047857"
                locked
              />
            </View>
          </View>

          {/* Gentle CTA - Scarcity & Ownership */}
          <View style={styles.ctaSection}>
            <View style={styles.ctaCard}>
              <LinearGradient
                colors={["#FFFBEB", "#FEF3C7"]} // Soft amber
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaCardGradient}
              >
                <View style={styles.earlyAccessBadge}>
                  <Text style={styles.earlyAccessText}>
                    ✨ LIMITED SPOTS AVAILABLE
                  </Text>
                </View>

                <Text style={styles.ctaTitle}>
                  Claim Founding Member Status
                </Text>
                <Text style={styles.ctaSubtitle}>
                  Secure your legacy badge and lifetime perks before we launch.
                </Text>

                <TextInput
                  style={styles.emailInput}
                  placeholder="Enter your email"
                  placeholderTextColor="#9CA3AF"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                  autoCapitalize="none"
                />

                <TouchableOpacity
                  style={styles.ctaButton}
                  activeOpacity={0.8}
                  onPress={handleJoinWaitlist}
                >
                  <LinearGradient
                    colors={["#EA580C", "#C2410C"]} // Darker Orange/Red for urgency
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaButtonGradient}
                  >
                    <Text style={styles.ctaButtonText}>Reserve My Spot</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.ctaNote}>
                  🎁 Only 153 spots left for this month.
                </Text>
              </LinearGradient>
            </View>
          </View>
        </View>
      </CustomScrollView>
    </ScreenView>
  );
};

export default Community;

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 130,
    paddingHorizontal: 20,
    paddingTop: 20,
    gap: 24,
  },
  header: {
    gap: 8,
  },
  innerContainer: {
    gap: 32,
    flex: 1,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
  },
  subtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    lineHeight: 24,
  },
  // Counter Card
  counterCard: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  counterGradient: {
    padding: 32,
    alignItems: "center",
    gap: 16,
  },
  counterTitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    fontWeight: "800",
    letterSpacing: 1.5,
    marginBottom: 4,
  },
  digitsContainer: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  digitBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    minWidth: 48,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  digitText: {
    ...parseTextStyle(theme.typography.XL),
    fontSize: 48,
    color: theme.colors.text.title,
    fontWeight: "800",
    lineHeight: 52,
  },
  counterLabel: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    opacity: 0.8,
  },
  // Illustration
  illustrationSection: {
    alignItems: "center",
    gap: 16,
  },
  illustrationCaption: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    fontStyle: "italic",
    paddingHorizontal: 20,
  },
  // Purpose Section
  purposeSection: {
    gap: 8,
    paddingHorizontal: 10,
  },
  purposeTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    textAlign: "center",
  },
  purposeText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    lineHeight: 24,
  },
  // Section
  section: {
    gap: 16,
  },
  sectionTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  sectionSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    marginTop: -8,
  },
  // Features
  featuresGrid: {
    gap: 16,
  },
  featureCard: {
    borderRadius: 24,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
    minHeight: 160,
  },
  featureGradient: {
    flex: 1,
    padding: 24,
    position: "relative",
  },
  watermarkContainer: {
    position: "absolute",
    bottom: -20,
    right: -20,
    zIndex: 0,
    transform: [{ rotate: "-10deg" }],
  },
  featureContent: {
    zIndex: 1,
    gap: 12,
  },
  featureHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  comingSoonBadge: {
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  comingSoonText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "#FFF",
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 1,
  },
  featureTextContainer: {
    gap: 6,
  },
  featureTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 20,
    color: "#1F2937", // Dark gray almost black
  },
  featureDescription: {
    ...parseTextStyle(theme.typography.Body),
    color: "#374151", // Gray 700
    lineHeight: 22,
    fontWeight: "500",
  },

  // CTA Section
  ctaSection: {
    marginTop: 8,
  },
  ctaCard: {
    borderRadius: 28,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 5,
  },
  ctaCardGradient: {
    padding: 28,
    gap: 20,
    alignItems: "center",
  },
  earlyAccessBadge: {
    backgroundColor: "#FEF3C7",
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#F59E0B",
  },
  earlyAccessText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#B45309",
    fontWeight: "800",
    fontSize: 12,
  },
  ctaTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    textAlign: "center",
  },
  ctaSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    marginTop: -8,
  },
  emailInput: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  ctaButton: {
    width: "100%",
    shadowColor: "#EA580C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 5,
  },
  ctaButtonGradient: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  ctaButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: "#FFFFFF",
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  ctaNote: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#B45309",
    textAlign: "center",
    fontWeight: "600",
  },
});
