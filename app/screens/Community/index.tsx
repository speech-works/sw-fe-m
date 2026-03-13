import { useIsFocused, useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import React, { useCallback, useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import MaterialCommunityIcons from "react-native-vector-icons/MaterialCommunityIcons";
import DiverseCommunityFace from "../../assets/sw-faces/DiverseCommunityFace";
import CustomScrollView from "../../components/CustomScrollView";
import ScreenView from "../../components/ScreenView";
import { theme } from "../../Theme/tokens";
import { parseTextStyle } from "../../util/functions/parseStyles";

const { width } = Dimensions.get("window");
const FACE_SIZE = width * 0.55;

// Flip-Clock Style Counter Component
const FlipDigit = ({ digit }: { digit: string }) => (
  <View style={styles.digitBox}>
    <Text style={styles.digitText}>{digit}</Text>
    <View style={styles.digitDivider} />
  </View>
);

const AnimatedCounter = () => {
  const [count, setCount] = useState(3142);

  useFocusEffect(
    useCallback(() => {
      const interval = setInterval(() => {
        setCount((prev) => prev + Math.floor(Math.random() * 2) + 1);
      }, 5000);
      return () => clearInterval(interval);
    }, []),
  );

  const countString = count.toLocaleString().padStart(5, "0");
  const digits = countString.split("");

  return (
    <View style={styles.counterCard}>
      <LinearGradient
        colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.03)"]}
        style={styles.counterGradient}
      >
        <Text style={styles.counterTitle}>FOUNDING MEMBERS SECURED</Text>
        <View style={styles.digitsContainer}>
          {digits.map((digit, index) => (
            <FlipDigit key={index} digit={digit} />
          ))}
        </View>
        <Text style={styles.counterLabel}>future leaders in wait</Text>
      </LinearGradient>
    </View>
  );
};

// Refined Feature Card
const FeatureCard = ({
  title,
  description,
  iconName,
  iconColor,
}: {
  title: string;
  description: string;
  iconName: string;
  iconColor: string;
}) => (
  <View style={styles.featureCard}>
    <LinearGradient
      colors={["rgba(255,255,255,0.1)", "rgba(255,255,255,0.05)"]}
      style={styles.featureGradient}
    >
      <View style={styles.featureWatermark}>
        <MaterialCommunityIcons
          name={iconName}
          size={120}
          color={iconColor}
          style={{ opacity: 0.08 }}
        />
      </View>

      <View style={styles.featureContent}>
        <View style={styles.featureHeader}>
          <View style={[styles.iconBox, { backgroundColor: `${iconColor}20` }]}>
            <MaterialCommunityIcons
              name={iconName}
              size={24}
              color={iconColor}
            />
          </View>
          <View style={styles.soonBadge}>
            <Text style={styles.soonText}>SOON</Text>
          </View>
        </View>

        <View style={styles.featureTextWrapper}>
          <Text style={styles.featureTitleText}>{title}</Text>
          <Text style={styles.featureDescText}>{description}</Text>
        </View>
      </View>
    </LinearGradient>
  </View>
);

const Community = () => {
  const [email, setEmail] = useState("");
  const [carouselIndex, setCarouselIndex] = useState(0);
  const isFocused = useIsFocused();

  const handleJoinWaitlist = () => {
    console.log("Waitlist joining:", email);
  };

  const features = [
    {
      title: "Live Voice Rooms",
      description:
        "Overcome speech blocks together in safe, real-time audio spaces.",
      iconName: "microphone",
      iconColor: "#38BDF8",
    },
    {
      title: "Community Challenges",
      description:
        "Join weekly milestones with peers to build lasting confidence.",
      iconName: "trophy-outline",
      iconColor: "#FCD34D",
    },
    {
      title: "Peer Support Feed",
      description:
        "Share your Vents, celebrate Wins, and exchange Practice tips.",
      iconName: "forum-outline",
      iconColor: "#818CF8",
    },
    {
      title: "Career Growth",
      description: "Access Job opportunities and professional mentorship.",
      iconName: "briefcase-outline",
      iconColor: "#34D399",
    },
  ];

  const CARD_WIDTH = width * 0.82;
  const GAP = 16;
  const SNAP_INTERVAL = CARD_WIDTH + GAP;
  const SIDE_PADDING = (width - CARD_WIDTH) / 2;

  return (
    <ScreenView style={styles.screenView}>
      {/* Sapphire Glass Background System */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#0F172A", "#1E293B", "#0F172A"]} // Deep Slate/Sapphire
          style={{ flex: 1 }}
        />
        {/* Volumetric Glows */}
        <View style={styles.glowTopRight} />
        <View style={styles.glowBottomLeft} />
      </View>

      <CustomScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Text style={styles.comingSoonTag}>COMING SOON</Text>
          <Text style={styles.mainTitle}>Community Ecosystem</Text>
          <Text style={styles.tagline}>
            A sanctuary for voices reaching further.
          </Text>
        </View>

        <View style={styles.mainContainer}>
          <AnimatedCounter />

          <View style={styles.visualSection}>
            <DiverseCommunityFace size={FACE_SIZE} shouldAnimate={isFocused} />
            <Text style={styles.manifesto}>
              "Communication is the bridge between isolation and community."
            </Text>
          </View>

          <View style={styles.featuresSection}>
            <Text style={styles.sectionHeading}>Experience the Future</Text>

            <ScrollView
              horizontal
              pagingEnabled={false}
              showsHorizontalScrollIndicator={false}
              onScroll={(e) => {
                const x = e.nativeEvent.contentOffset.x;
                const index = Math.round(x / SNAP_INTERVAL);
                if (index !== carouselIndex) setCarouselIndex(index);
              }}
              scrollEventThrottle={16}
              snapToInterval={SNAP_INTERVAL}
              snapToAlignment="start"
              decelerationRate="fast"
              style={styles.carousel}
              contentContainerStyle={{
                paddingHorizontal: SIDE_PADDING,
              }}
            >
              {features.map((item, i) => (
                <View
                  key={i}
                  style={[
                    styles.slide,
                    {
                      width: CARD_WIDTH,
                      marginRight: i === features.length - 1 ? 0 : GAP,
                    },
                  ]}
                >
                  <FeatureCard {...item} />
                </View>
              ))}
            </ScrollView>

            <View style={styles.pagination}>
              {features.map((_, i) => (
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

          <View style={styles.ctaWrapper}>
            <LinearGradient
              colors={["rgba(255,255,255,0.08)", "rgba(255,255,255,0.03)"]}
              style={styles.ctaCard}
            >
              <Text style={styles.ctaTitle}>Claim Founding Status</Text>
              <Text style={styles.ctaSubtitle}>
                Secure early-access perks and your legacy member badge.
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.waitlistInput}
                  placeholder="name@email.com"
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  value={email}
                  onChangeText={setEmail}
                  keyboardType="email-address"
                />
                <TouchableOpacity
                  style={styles.reserveButton}
                  onPress={handleJoinWaitlist}
                >
                  <LinearGradient
                    colors={["#2563EB", "#1D4ED8"]}
                    style={styles.reserveGradient}
                  >
                    <Text style={styles.reserveText}>Join</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
              <Text style={styles.spotsLeft}>
                ✨ Strictly limited founding spots remaining.
              </Text>
            </LinearGradient>
          </View>
        </View>
      </CustomScrollView>
    </ScreenView>
  );
};

export default Community;

const styles = StyleSheet.create({
  screenView: { flex: 1, backgroundColor: "#0F172A" },
  scrollContent: { paddingBottom: 120, paddingTop: 60 },
  glowTopRight: {
    position: "absolute",
    top: -100,
    right: -100,
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(37, 99, 235, 0.15)",
  },
  glowBottomLeft: {
    position: "absolute",
    bottom: -150,
    left: -100,
    width: 400,
    height: 400,
    borderRadius: 200,
    backgroundColor: "rgba(129, 140, 248, 0.1)",
  },
  header: {
    alignItems: "center",
    gap: 8,
    marginBottom: 32,
    paddingHorizontal: 20,
  },
  comingSoonTag: {
    fontSize: 12,
    fontWeight: "800",
    color: "#38BDF8",
    letterSpacing: 2,
  },
  mainTitle: {
    ...parseTextStyle(theme.typography.Heading1),
    color: "#FFFFFF",
    textAlign: "center",
  },
  tagline: {
    ...parseTextStyle(theme.typography.Body),
    color: "rgba(255,255,255,0.6)",
    textAlign: "center",
  },
  mainContainer: { gap: 40 },
  // Counter
  counterCard: {
    marginHorizontal: 20,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    backgroundColor: "rgba(255,255,255,0.02)",
    overflow: "hidden",
  },
  counterGradient: { padding: 24, alignItems: "center", gap: 16 },
  counterTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: "rgba(255,255,255,0.5)",
    letterSpacing: 2,
  },
  digitsContainer: { flexDirection: "row", gap: 6 },
  digitBox: {
    width: 44,
    height: 60,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  digitText: {
    fontSize: 34,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  digitDivider: {
    position: "absolute",
    top: "50%",
    width: "100%",
    height: 1,
    backgroundColor: "rgba(0,0,0,0.2)",
  },
  counterLabel: {
    fontSize: 13,
    color: "rgba(255,255,255,0.4)",
    fontStyle: "italic",
  },
  // Visuals
  visualSection: { alignItems: "center", gap: 20, paddingHorizontal: 20 },
  manifesto: {
    ...parseTextStyle(theme.typography.Body),
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    fontStyle: "italic",
    paddingHorizontal: 30,
  },
  // Features Carousel
  featuresSection: { gap: 20 },
  sectionHeading: {
    ...parseTextStyle(theme.typography.Heading3),
    color: "#FFFFFF",
    paddingHorizontal: 24,
  },
  carousel: {
    width: width,
  },
  carouselContainer: {
    paddingHorizontal: 20,
  },
  slide: {
    marginRight: 0,
  },
  featureCard: {
    borderRadius: 24,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    backgroundColor: "rgba(255,255,255,0.02)",
    overflow: "hidden",
    height: 180,
  },
  featureGradient: { flex: 1, padding: 20, position: "relative" },
  featureWatermark: {
    position: "absolute",
    bottom: -20,
    right: -20,
  },
  featureContent: { zIndex: 1, flex: 1, gap: 12 },
  featureHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  soonBadge: {
    backgroundColor: "rgba(37, 99, 235, 0.2)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(37, 99, 235, 0.3)",
  },
  soonText: {
    fontSize: 10,
    fontWeight: "800",
    color: "#38BDF8",
    letterSpacing: 0.5,
  },
  featureTextWrapper: { gap: 4, flex: 1 },
  featureTitleText: {
    fontSize: 19,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  featureDescText: {
    fontSize: 14,
    color: "rgba(255,255,255,0.5)",
    lineHeight: 20,
  },
  pagination: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
    marginTop: 8,
  },
  dot: {
    height: 4,
    borderRadius: 2,
  },
  activeDot: {
    width: 20,
    backgroundColor: "#38BDF8",
  },
  inactiveDot: {
    width: 6,
    backgroundColor: "rgba(255,255,255,0.2)",
  },
  // CTA
  ctaWrapper: { marginTop: 10, paddingHorizontal: 20 },
  ctaCard: {
    padding: 28,
    borderRadius: 32,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    gap: 12,
  },
  ctaTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "#FFFFFF",
    textAlign: "center",
  },
  ctaSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: "rgba(255,255,255,0.5)",
    textAlign: "center",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    width: "100%",
    gap: 10,
  },
  waitlistInput: {
    flex: 1,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 14,
    color: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  reserveButton: {
    borderRadius: 16,
    overflow: "hidden",
  },
  reserveGradient: {
    paddingHorizontal: 24,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  reserveText: {
    color: "#FFFFFF",
    fontWeight: "800",
    fontSize: 16,
  },
  spotsLeft: {
    fontSize: 12,
    color: "#38BDF8",
    fontWeight: "600",
    marginTop: 8,
  },
});
