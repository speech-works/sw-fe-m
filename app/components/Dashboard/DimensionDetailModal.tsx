import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { theme } from "../../Theme/tokens";
import { parseShadowStyle } from "../../util/functions/parseStyles";
import { ClinicalDomain } from "../../api/userBehaviorTrends/types";

type DetailFamily = "combined" | "clinical" | "engagement";

type FamilyMetricData = {
  currentScore: number | null;
  previousScore: number | null;
  percentDelta: number | null;
  absoluteDelta: number | null;
  trend: "IMPROVING" | "STABLE" | "WORSENING";
};

const FAMILY_CONFIG: Record<
  DetailFamily,
  { label: string; color: string }
> = {
  combined: {
    label: "Combined",
    color: theme.colors.library.orange[500],
  },
  clinical: {
    label: "Clinical",
    color: theme.colors.library.green[500],
  },
  engagement: {
    label: "Engagement",
    color: theme.colors.library.blue[500],
  },
};

const FAMILY_DESCRIPTIONS: Record<
  ClinicalDomain,
  Record<DetailFamily, string>
> = {
  [ClinicalDomain.AFFECTIVE_DISTRESS]: {
    combined:
      "Overall view combining your steadier baseline with how communication has felt lately.",
    clinical:
      "Steadier baseline based on validated clinical responses about confidence and speech impact.",
    engagement:
      "Short-term signal from recent check-ins about confidence, anxiety, and stress.",
  },
  [ClinicalDomain.AVOIDANCE_BEHAVIOR]: {
    combined:
      "Overall view combining your steadier baseline with how much you have been approaching speaking lately.",
    clinical:
      "Steadier baseline based on validated clinical responses related to avoidance.",
    engagement:
      "Short-term signal from recent check-ins about your urge to avoid speaking moments.",
  },
  [ClinicalDomain.IMPAIRMENT_STRUGGLE]: {
    combined:
      "Overall view combining your steadier baseline with recent signs of how manageable speech has felt.",
    clinical:
      "Steadier baseline based on validated clinical responses about speech struggle and control.",
    engagement:
      "Short-term signal from recent secondary-behavior patterns. It does not capture all of your skill use on its own.",
  },
  [ClinicalDomain.FUNCTIONAL_LIMITATION]: {
    combined:
      "Overall view combining your steadier baseline with how manageable speaking has felt lately.",
    clinical:
      "Steadier baseline based on validated clinical responses about everyday speaking impact.",
    engagement:
      "Short-term signal from recent check-ins about tension, body awareness, and comfort.",
  },
  [ClinicalDomain.PARTICIPATION_RESTRICTION]: {
    combined:
      "Overall view combining your steadier baseline with your recent participation activity.",
    clinical:
      "Steadier baseline based on validated clinical responses about participation and social impact.",
    engagement:
      "Short-term signal from recent exposure practice activity. It is not a full measure of your social life yet.",
  },
};

const DIMENSION_CONFIG: Record<
  ClinicalDomain,
  {
    label: string;
    color: string;
    icon: string;
    description: string;
    recommendations: {
      IMPROVING: string;
      STABLE: string;
      WORSENING: string;
    };
  }
> = {
  [ClinicalDomain.AFFECTIVE_DISTRESS]: {
    label: "Confidence",
    color: "#059669",
    icon: "shield-check",
    description:
      "How confident you feel communicating, even when speech is not perfect.",
    recommendations: {
      IMPROVING:
        "Confidence seems to be building. Keep choosing speaking moments that feel meaningful and manageable.",
      STABLE:
        "A steady week still matters. One small speaking win can help strengthen trust in your voice.",
      WORSENING:
        "If confidence dips, step back to a simpler speaking situation and rebuild from there.",
    },
  },
  [ClinicalDomain.AVOIDANCE_BEHAVIOR]: {
    label: "Courage",
    color: "#E11D48",
    icon: "fire",
    description:
      "How willing you are to enter speaking moments instead of avoiding them.",
    recommendations: {
      IMPROVING:
        "You’re approaching more speaking moments. Keep the next step small, specific, and repeatable.",
      STABLE:
        "A steady stretch can still be progress. Pick one speaking moment next that is slightly outside your comfort zone.",
      WORSENING:
        "If avoidance is growing, shrink the challenge rather than stopping. Smaller, supported reps help rebuild momentum.",
    },
  },
  [ClinicalDomain.IMPAIRMENT_STRUGGLE]: {
    label: "Mastery",
    color: "#0284C7",
    icon: "target",
    description:
      "How reliably you’re using helpful tools and strategies to manage speech.",
    recommendations: {
      IMPROVING:
        "Your tools seem to be helping more reliably. Keep practicing them in real situations, not just drills.",
      STABLE:
        "A steady week is a good time to sharpen one dependable strategy instead of changing everything at once.",
      WORSENING:
        "If speech feels harder to manage, return to one dependable strategy and practice it in a lower-pressure setting.",
    },
  },
  [ClinicalDomain.FUNCTIONAL_LIMITATION]: {
    label: "Ease",
    color: "#8B5CF6",
    icon: "water",
    description:
      "How manageable and less effortful speaking feels in everyday moments.",
    recommendations: {
      IMPROVING:
        "Speaking seems to be feeling a little easier. Keep your practice regular and low-pressure so that comfort can carry over.",
      STABLE:
        "Steady ease still counts. Gentle repetition can help comfort build over time.",
      WORSENING:
        "If speaking feels harder lately, lower the pressure and pair speaking with a calming routine that works for you.",
    },
  },
  [ClinicalDomain.PARTICIPATION_RESTRICTION]: {
    label: "Social",
    color: "#EA580C",
    icon: "account-group",
    description:
      "How much you’re taking part in conversations and speaking situations that matter to you.",
    recommendations: {
      IMPROVING:
        "You’re participating more. Keep choosing speaking moments that matter to you, not just more moments.",
      STABLE:
        "A steady week can still be a foundation. One small initiation or response can help widen participation.",
      WORSENING:
        "If participation is shrinking, start with safer conversations and build outward from there.",
    },
  },
};

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface DimensionDetailModalProps {
  visible: boolean;
  domain: ClinicalDomain | null;
  familyData: Record<DetailFamily, FamilyMetricData>;
  comparisonLabel: string;
  onClose: () => void;
}

const DimensionDetailModal: React.FC<DimensionDetailModalProps> = ({
  visible,
  domain,
  familyData,
  comparisonLabel,
  onClose,
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [isMounted, setIsMounted] = useState(visible);
  const [selectedFamily, setSelectedFamily] = useState<DetailFamily>("combined");
  const insets = useSafeAreaInsets();

  useEffect(() => {
    if (visible) {
      setSelectedFamily("combined");
      setIsMounted(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 350,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(opacityAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start(() => {
        setIsMounted(false);
      });
    }
  }, [visible, opacityAnim, slideAnim]);

  if (!isMounted || !domain) {
    return null;
  }

  const config = DIMENSION_CONFIG[domain];
  const activeFamily = FAMILY_CONFIG[selectedFamily];
  const activeMetrics = familyData[selectedFamily];
  const isUnavailable = activeMetrics.currentScore === null;
  const hasComparison =
    activeMetrics.previousScore !== null &&
    activeMetrics.percentDelta !== null &&
    activeMetrics.absoluteDelta !== null;
  const trendIcon = !hasComparison
    ? "clock-outline"
    : activeMetrics.trend === "IMPROVING"
      ? "trending-up"
      : activeMetrics.trend === "WORSENING"
        ? "trending-down"
        : "trending-neutral";
  const trendColor = !hasComparison
    ? theme.colors.text.default
    : activeMetrics.trend === "IMPROVING"
      ? theme.colors.library.green[500]
      : activeMetrics.trend === "WORSENING"
        ? theme.colors.library.red[500]
        : theme.colors.text.default;
  const recommendationText = isUnavailable
    ? "Use the app for a few days and complete a few check-ins so this view can start to reflect your recent patterns."
    : hasComparison
      ? config.recommendations[activeMetrics.trend]
      : "We’re still building a comparison history here. Keep checking in so this view becomes more meaningful over time.";
  const footerBottomPadding = Math.max(insets.bottom, 12);

  return (
    <Modal
      visible={isMounted}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <Animated.View style={[styles.overlay, { opacity: opacityAnim }]}>
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={onClose}
        />
        <Animated.View
          style={[
            styles.modalContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View
            style={[styles.header, { backgroundColor: `${config.color}15` }]}
          >
            <View style={[styles.iconCircle, { backgroundColor: config.color }]}>
              <MaterialCommunityIcons
                name={config.icon as any}
                size={24}
                color="white"
              />
            </View>
            <Text style={[styles.title, { color: config.color }]}>
              {config.label}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <MaterialCommunityIcons
                name="close"
                size={18}
                color={theme.colors.text.title}
              />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.contentScroll}
            contentContainerStyle={styles.body}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.section}>
              <Text style={styles.description}>{config.description}</Text>
            </View>

            <View style={styles.section}>
              <View style={styles.familySwitcher}>
                {(Object.keys(FAMILY_CONFIG) as DetailFamily[]).map((family) => {
                  const familyConfig = FAMILY_CONFIG[family];
                  const isActive = family === selectedFamily;

                  return (
                    <TouchableOpacity
                      key={family}
                      onPress={() => setSelectedFamily(family)}
                      style={[
                        styles.familyChip,
                        isActive && {
                          backgroundColor: familyConfig.color,
                          borderColor: familyConfig.color,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.familyChipText,
                          isActive && styles.familyChipTextActive,
                        ]}
                      >
                        {familyConfig.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
              <Text style={styles.familyDescription}>
                {FAMILY_DESCRIPTIONS[domain][selectedFamily]}
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionLabel}>YOUR STATUS</Text>
              <View style={styles.statusBento}>
                <View
                  style={[
                    styles.statusCard,
                    {
                      backgroundColor: `${activeFamily.color}14`,
                      borderColor: `${activeFamily.color}35`,
                    },
                  ]}
                >
                  <Text style={styles.statusCardLabel}>CURRENT</Text>
                  <Text
                    style={[styles.scoreValue, { color: activeFamily.color }]}
                  >
                    {isUnavailable
                      ? "--"
                      : Math.round(activeMetrics.currentScore ?? 0)}
                  </Text>
                  <Text style={styles.statusCardSubtext}>
                    {activeFamily.label.toUpperCase()} SCORE
                  </Text>
                </View>

                <View style={styles.statusCard}>
                  <Text style={styles.statusCardLabel}>PREVIOUS</Text>
                  <Text style={styles.scoreValue}>
                    {activeMetrics.previousScore === null
                      ? "--"
                      : Math.round(activeMetrics.previousScore)}
                  </Text>
                  <Text style={styles.statusCardSubtext}>PREVIOUS WEEK</Text>
                </View>
              </View>

              <View style={styles.deltaCard}>
                <View style={styles.deltaHeader}>
                  <MaterialCommunityIcons
                    name={trendIcon as any}
                    size={18}
                    color={trendColor}
                  />
                  <Text style={[styles.deltaTitle, { color: trendColor }]}>
                    {!hasComparison
                      ? isUnavailable
                        ? "Not enough data yet"
                        : "Waiting for previous week"
                      : activeMetrics.trend === "IMPROVING"
                        ? "Improving"
                        : activeMetrics.trend === "WORSENING"
                          ? "Needs attention"
                          : "Holding steady"}
                  </Text>
                </View>

                {!hasComparison ? (
                  <Text style={styles.deltaText}>
                    {isUnavailable
                      ? "Not enough recent data is available yet for this view."
                      : "We need one previous week before we can show change for this view."}
                  </Text>
                ) : (
                  <Text style={styles.deltaText}>
                    {(activeMetrics.percentDelta ?? 0) > 0 ? "+" : ""}
                    {(activeMetrics.percentDelta ?? 0).toFixed(1)}% and{" "}
                    {(activeMetrics.absoluteDelta ?? 0) > 0
                      ? "+"
                      : ""}
                    {(activeMetrics.absoluteDelta ?? 0).toFixed(1)} pts{" "}
                    {comparisonLabel.toLowerCase()}.
                  </Text>
                )}
              </View>
            </View>

            <View style={styles.section}>
              <View style={styles.recommendationCard}>
                <MaterialCommunityIcons
                  name="lightbulb-outline"
                  size={20}
                  color={theme.colors.library.orange[500]}
                />
                <Text style={styles.recommendationText}>
                  {recommendationText}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={[styles.footer, { paddingBottom: footerBottomPadding }]}>
            <TouchableOpacity style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneButtonText}>Got it</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
};

const { width } = Dimensions.get("window");

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    backgroundColor: "white",
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: "90%",
    width,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: 20,
    gap: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    fontSize: 20,
    fontWeight: "800",
    flex: 1,
  },
  closeBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  body: {
    padding: 20,
    gap: 24,
  },
  contentScroll: {
    flexShrink: 1,
    minHeight: 0,
  },
  section: {
    gap: 10,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.text.default,
    letterSpacing: 0.5,
  },
  description: {
    fontSize: 15,
    color: theme.colors.text.default,
    lineHeight: 22,
  },
  familySwitcher: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
  },
  familyChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: theme.colors.library.gray[200],
    backgroundColor: "#fff",
  },
  familyChipText: {
    fontSize: 12,
    fontWeight: "700",
    color: theme.colors.text.default,
  },
  familyChipTextActive: {
    color: "#fff",
  },
  familyDescription: {
    fontSize: 13,
    color: theme.colors.text.default,
    lineHeight: 18,
  },
  statusBento: {
    flexDirection: "row",
    gap: 12,
    marginTop: 2,
  },
  statusCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.library.gray[100],
    backgroundColor: "#fff",
  },
  statusCardLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: theme.colors.text.default,
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: "800",
    color: theme.colors.text.title,
  },
  statusCardSubtext: {
    fontSize: 11,
    color: theme.colors.text.default,
    marginTop: 6,
  },
  deltaCard: {
    borderRadius: 18,
    padding: 16,
    backgroundColor: "#F8FAFC",
    borderWidth: 1,
    borderColor: theme.colors.library.gray[100],
    gap: 8,
  },
  deltaHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  deltaTitle: {
    fontSize: 14,
    fontWeight: "800",
  },
  deltaText: {
    fontSize: 14,
    color: theme.colors.text.default,
    lineHeight: 20,
  },
  recommendationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    borderRadius: 18,
    padding: 16,
    backgroundColor: `${theme.colors.library.orange[100]}40`,
  },
  recommendationText: {
    flex: 1,
    fontSize: 15,
    color: theme.colors.text.default,
    lineHeight: 22,
  },
  footer: {
    backgroundColor: "#fff",
    paddingHorizontal: 20,
    paddingTop: 4,
  },
  doneButton: {
    height: 52,
    borderRadius: 26,
    backgroundColor: theme.colors.library.orange[500],
    alignItems: "center",
    justifyContent: "center",
  },
  doneButtonText: {
    fontSize: 16,
    fontWeight: "800",
    color: "#fff",
  },
});

export default DimensionDetailModal;
