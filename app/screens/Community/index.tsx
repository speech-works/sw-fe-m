import React, { useEffect, useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  Dimensions,
  TouchableOpacity,
  TextInput,
} from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  Easing,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import ScreenView from "../../components/ScreenView";
import CustomScrollView from "../../components/CustomScrollView";
import { theme } from "../../Theme/tokens";
import { parseTextStyle } from "../../util/functions/parseStyles";
import DiverseCommunityFace from "../../assets/sw-faces/DiverseCommunityFace";

const { width } = Dimensions.get("window");
const FACE_SIZE = width * 0.6;

// Animated Counter Component
const AnimatedCounter = () => {
  const [count, setCount] = useState(2847);

  useEffect(() => {
    const interval = setInterval(() => {
      setCount((prev) => prev + Math.floor(Math.random() * 3) + 1);
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <View style={styles.counterContainer}>
      <Text style={styles.counterNumber}>{count.toLocaleString()}</Text>
      <Text style={styles.counterLabel}>enthusiasts waiting</Text>
    </View>
  );
};

// Feature Card (Simplified)
const FeatureCard = ({
  title,
  description,
  locked,
  emoji,
}: {
  title: string;
  description: string;
  locked?: boolean;
  emoji: string;
}) => (
  <View style={styles.featureCard}>
    <Text style={styles.featureEmoji}>{emoji}</Text>
    <View style={styles.featureContent}>
      <Text style={styles.featureTitle}>{title}</Text>
      <Text style={[styles.featureDescription, locked && { opacity: 0.5 }]}>
        {description}
      </Text>
      {locked && (
        <View style={styles.lockBadge}>
          <Text style={styles.lockText}>🔒 Early Access</Text>
        </View>
      )}
    </View>
  </View>
);

// Testimonial Card (Simplified)
const TestimonialCard = ({ name, quote }: { name: string; quote: string }) => (
  <View style={styles.testimonialCard}>
    <View style={styles.testimonialAvatar}>
      <Text style={styles.testimonialInitial}>{name[0]}</Text>
    </View>
    <View style={styles.testimonialContent}>
      <Text style={styles.testimonialQuote}>"{quote}"</Text>
      <Text style={styles.testimonialName}>— {name}</Text>
    </View>
  </View>
);

const Community = () => {
  const [email, setEmail] = useState("");

  const handleJoinWaitlist = () => {
    console.log("Joining waitlist with email:", email);
    // TODO: Implement actual waitlist logic
  };

  return (
    <ScreenView style={styles.screenView}>
      {/* Background Gradient - matching Explore */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#FFF7ED", "#FFF", "#FFF"]}
          locations={[0, 0.4, 1]}
          style={{ flex: 1 }}
        />
      </View>

      <CustomScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Header - matching Explore pattern */}
        <View style={styles.header}>
          <Text style={styles.title}>Community</Text>
          <Text style={styles.subtitle}>Bringing the community together</Text>
        </View>

        <View style={styles.innerContainer}>
          {/* Counter Section */}
          <View style={styles.section}>
            <AnimatedCounter />
          </View>

          {/* Illustration */}
          <View style={styles.illustrationSection}>
            <DiverseCommunityFace size={FACE_SIZE} shouldAnimate />
            <Text style={styles.illustrationCaption}>
              Join us to support the cause
            </Text>
          </View>

          {/* Features Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>What's Inside</Text>
            <View style={styles.featuresGrid}>
              <FeatureCard
                emoji="🎯"
                title="Live Practice Sessions"
                description="Join real-time group sessions with expert coaches"
              />
              <FeatureCard
                emoji="🎉"
                title="Progress Celebrations"
                description="Share your wins with the community"
                locked
              />
              <FeatureCard
                emoji="💡"
                title="Expert Guidance"
                description="Get personalized tips from therapists"
                locked
              />
            </View>
          </View>

          {/* Social Proof */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Early Members Love It</Text>
            <View style={styles.testimonialsContainer}>
              <TestimonialCard
                name="Sarah M."
                quote="Improved 40% faster with community support"
              />
              <TestimonialCard
                name="Mike R."
                quote="Game changer for my confidence"
              />
              <TestimonialCard
                name="Priya K."
                quote="Finally found my support system"
              />
            </View>
          </View>

          {/* CTA Section */}
          <View style={styles.ctaSection}>
            <View style={styles.urgencyBadge}>
              <Text style={styles.urgencyText}>
                ⚡ Only 153 beta spots left
              </Text>
            </View>

            <Text style={styles.ctaTitle}>Secure Your Spot</Text>
            <Text style={styles.ctaSubtitle}>
              Be among the first 1,000 to get lifetime perks
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
                colors={[theme.colors.actionPrimary.default, "#EA580C"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.ctaGradient}
              >
                <Text style={styles.ctaText}>Join the Waitlist</Text>
              </LinearGradient>
            </TouchableOpacity>

            <Text style={styles.disclaimer}>
              🎁 Early members get exclusive perks & lifetime benefits
            </Text>
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
    paddingBottom: 130, // Space for Custom Tab Bar - matching Explore
    paddingHorizontal: 20, // Matching Explore
    paddingTop: 20, // Matching Explore
    gap: 24, // Matching Explore
  },
  header: {
    gap: 8, // Matching Explore
  },
  innerContainer: {
    gap: 32, // Matching Explore
    flex: 1,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading2), // Matching Explore
    color: theme.colors.text.title,
  },
  subtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  section: {
    gap: 16,
  },
  sectionTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  counterContainer: {
    alignItems: "center",
    gap: 4,
  },
  counterNumber: {
    ...parseTextStyle(theme.typography.XL),
    fontSize: 48,
    color: theme.colors.actionPrimary.default,
    fontWeight: "800",
  },
  counterLabel: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  illustrationSection: {
    alignItems: "center",
    gap: 16,
  },
  illustrationCaption: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
  },
  featuresGrid: {
    gap: 16,
  },
  featureCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    gap: 16,
    borderWidth: 1,
    borderColor: "#F3F4F6",
  },
  featureEmoji: {
    fontSize: 32,
  },
  featureContent: {
    flex: 1,
    gap: 4,
  },
  featureTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 16,
    color: theme.colors.text.title,
  },
  featureDescription: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    lineHeight: 20,
  },
  lockBadge: {
    alignSelf: "flex-start",
    backgroundColor: theme.colors.actionPrimary.default,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    marginTop: 8,
  },
  lockText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: "#FFFFFF",
    fontWeight: "600",
  },
  testimonialsContainer: {
    gap: 12,
  },
  testimonialCard: {
    flexDirection: "row",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  testimonialAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: theme.colors.actionPrimary.default,
    justifyContent: "center",
    alignItems: "center",
  },
  testimonialInitial: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 16,
    color: "#FFFFFF",
  },
  testimonialContent: {
    flex: 1,
    gap: 2,
  },
  testimonialQuote: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.title,
    fontStyle: "italic",
  },
  testimonialName: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
  ctaSection: {
    gap: 16,
    alignItems: "center",
  },
  urgencyBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "#FCA5A5",
  },
  urgencyText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#DC2626",
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
  },
  emailInput: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  ctaButton: {
    width: "100%",
    shadowColor: theme.colors.actionPrimary.default,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  ctaGradient: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
  },
  ctaText: {
    ...parseTextStyle(theme.typography.Button),
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "700",
  },
  disclaimer: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    textAlign: "center",
  },
});
