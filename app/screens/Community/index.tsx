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
        <Text style={styles.counterTitle}>INTERESTS REGISTERED</Text>

        <View style={styles.digitsContainer}>
          {digits.map((digit, index) => (
            <FlipDigit key={index} digit={digit} />
          ))}
        </View>

        <Text style={styles.counterLabel}>voices finding courage together</Text>
      </LinearGradient>
    </View>
  );
};

// Feature Card with soft gradients
const FeatureCard = ({
  title,
  description,
  locked,
  emoji,
  gradient,
}: {
  title: string;
  description: string;
  locked?: boolean;
  emoji: string;
  gradient: readonly [string, string, ...string[]];
}) => (
  <View style={styles.featureCard}>
    <LinearGradient
      colors={gradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.featureGradient}
    >
      <View style={styles.featureHeader}>
        <View style={styles.emojiCircle}>
          <Text style={styles.featureEmoji}>{emoji}</Text>
        </View>
        {locked && (
          <View style={styles.comingSoonBadge}>
            <Text style={styles.comingSoonText}>Soon</Text>
          </View>
        )}
      </View>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={[styles.featureDescription, locked && { opacity: 0.6 }]}>
        {description}
      </Text>
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
          <Text style={styles.title}>Your Support Circle</Text>
          <Text style={styles.subtitle}>
            A safe space to grow, practice, and celebrate together
          </Text>
        </View>

        <View style={styles.innerContainer}>
          {/* Counter with Soft Gradient */}
          <AnimatedCounter />

          {/* Friendly Illustration */}
          <View style={styles.illustrationSection}>
            <DiverseCommunityFace size={FACE_SIZE} shouldAnimate />
            <Text style={styles.illustrationCaption}>
              Every voice matters. Every step counts.
            </Text>
          </View>

          {/* Features with Pastel Gradients */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What Awaits You</Text>
            <Text style={styles.sectionSubtitle}>
              Gentle ways to build confidence at your own pace
            </Text>

            <View style={styles.featuresGrid}>
              <FeatureCard
                emoji="�"
                title="Practice Together"
                description="Join supportive group sessions where everyone's learning"
                gradient={["#ECFDF5", "#D1FAE5"]} // Mint gradient
              />
              <FeatureCard
                emoji="✨"
                title="Celebrate Wins"
                description="Share your progress and cheer others on"
                gradient={["#FEF3C7", "#FDE68A"]} // Warm yellow
                locked
              />
              <FeatureCard
                emoji="�"
                title="Gentle Guidance"
                description="Get encouragement from coaches who understand"
                gradient={["#E0E7FF", "#C7D2FE"]} // Soft indigo
                locked
              />
            </View>
          </View>

          {/* Gentle CTA */}
          <View style={styles.ctaSection}>
            <View style={styles.ctaCard}>
              <LinearGradient
                colors={["#FFFBEB", "#FEF3C7"]} // Soft amber
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.ctaCardGradient}
              >
                <View style={styles.earlyAccessBadge}>
                  <Text style={styles.earlyAccessText}>✨ Early Access</Text>
                </View>

                <Text style={styles.ctaTitle}>Join the Circle</Text>
                <Text style={styles.ctaSubtitle}>
                  Be part of something special from the start
                </Text>

                <TextInput
                  style={styles.emailInput}
                  placeholder="Your email"
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
                    colors={["#FB923C", "#F97316"]} // Warm orange
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.ctaButtonGradient}
                  >
                    <Text style={styles.ctaButtonText}>I'm Ready to Join</Text>
                  </LinearGradient>
                </TouchableOpacity>

                <Text style={styles.ctaNote}>
                  🎁 Early members get lifetime perks & exclusive access
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
    fontWeight: "700",
    letterSpacing: 2,
    marginBottom: 8,
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
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  featureGradient: {
    padding: 24,
    gap: 12,
  },
  featureHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  emojiCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "rgba(255, 255, 255, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  featureEmoji: {
    fontSize: 28,
  },
  comingSoonBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  comingSoonText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
    fontWeight: "600",
  },
  featureTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 18,
    color: theme.colors.text.title,
  },
  featureDescription: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    lineHeight: 22,
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
    shadowOpacity: 0.1,
    shadowRadius: 16,
    elevation: 4,
  },
  ctaCardGradient: {
    padding: 28,
    gap: 20,
    alignItems: "center",
  },
  earlyAccessBadge: {
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  earlyAccessText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.title,
    fontWeight: "700",
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
    borderWidth: 0,
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
    shadowColor: theme.colors.actionPrimary.default,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 12,
    elevation: 4,
  },
  ctaButtonGradient: {
    paddingVertical: 18,
    borderRadius: 16,
    alignItems: "center",
  },
  ctaButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  ctaNote: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    textAlign: "center",
  },
});
