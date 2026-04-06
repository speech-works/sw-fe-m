import { MaterialCommunityIcons } from "@expo/vector-icons";
import React, { useEffect, useRef, useState } from "react";
import {
  Animated,
  Dimensions,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { theme } from "../../Theme/tokens";
import { parseShadowStyle } from "../../util/functions/parseStyles";
import { ClinicalDomain } from "../../api/userBehaviorTrends/types";

// Domain config with descriptions and recommendations
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
    color: "#059669", // Emerald 600
    icon: "shield-check",
    description: "How confident you feel about your speaking abilities.",
    recommendations: {
      IMPROVING: "Your self-belief is growing! Celebrate your wins.",
      STABLE: "Try journaling about recent speaking successes.",
      WORSENING: "Revisit the Affirmations exercises to rebuild positivity.",
    },
  },
  [ClinicalDomain.AVOIDANCE_BEHAVIOR]: {
    label: "Courage",
    color: "#E11D48", // Rose 600
    icon: "fire",
    description: "Your willingness to face challenging speaking situations.",
    recommendations: {
      IMPROVING: "You're facing more challenging situations. Keep pushing!",
      STABLE: "Try an exposure practice slightly outside your comfort zone.",
      WORSENING: "Start with easier exposure exercises to rebuild confidence.",
    },
  },
  [ClinicalDomain.IMPAIRMENT_STRUGGLE]: {
    label: "Mastery",
    color: "#0284C7", // Sky 600
    icon: "target",
    description: "How naturally you speak without focusing on technique.",
    recommendations: {
      IMPROVING: "Great progress! Keep practicing your speaking techniques.",
      STABLE: "Try the Reading Practice exercises to build fluency.",
      WORSENING:
        "Focus on basic breathing exercises to rebuild your foundation.",
    },
  },
  [ClinicalDomain.FUNCTIONAL_LIMITATION]: {
    label: "Ease",
    color: "#8B5CF6", // Violet 500
    icon: "water",
    description: "How comfortable speaking feels in everyday situations.",
    recommendations: {
      IMPROVING: "Speaking feels more natural. Keep the momentum!",
      STABLE: "Practice in low-stakes situations to build comfort.",
      WORSENING: "Focus on relaxation techniques before speaking.",
    },
  },
  [ClinicalDomain.PARTICIPATION_RESTRICTION]: {
    label: "Social",
    color: "#EA580C", // Orange 600
    icon: "account-group",
    description: "How freely you participate in social conversations.",
    recommendations: {
      IMPROVING: "You're engaging more in conversations. Wonderful!",
      STABLE: "Try initiating one small conversation today.",
      WORSENING: "Start with familiar people in safe environments.",
    },
  },
};

const SCREEN_HEIGHT = Dimensions.get("window").height;

interface DimensionDetailModalProps {
  visible: boolean;
  domain: ClinicalDomain | null;
  currentScore: number;
  baselineScore: number | null;
  change: number;
  trend: "IMPROVING" | "STABLE" | "WORSENING";
  onClose: () => void;
}

const DimensionDetailModal: React.FC<DimensionDetailModalProps> = ({
  visible,
  domain,
  currentScore,
  baselineScore,
  change,
  trend,
  onClose,
}) => {
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;
  const opacityAnim = useRef(new Animated.Value(0)).current;
  const [isMounted, setIsMounted] = useState(visible);

  useEffect(() => {
    if (visible) {
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
  }, [visible]);

  if (!isMounted || !domain) return null;

  const config = DIMENSION_CONFIG[domain];
  const trendIcon =
    trend === "IMPROVING"
      ? "trending-up"
      : trend === "WORSENING"
        ? "trending-down"
        : "trending-neutral";
  const trendColor =
    trend === "IMPROVING"
      ? theme.colors.library.green[500]
      : trend === "WORSENING"
        ? theme.colors.library.red[500]
        : theme.colors.text.default;

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
          <TouchableOpacity activeOpacity={1}>
            {/* Header */}
            <View
              style={[styles.header, { backgroundColor: `${config.color}15` }]}
            >
              <View
                style={[styles.iconCircle, { backgroundColor: config.color }]}
              >
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

            {/* Body */}
            <View style={styles.body}>
              {/* Description */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>WHAT IT MEASURES</Text>
                <Text style={styles.description}>{config.description}</Text>
              </View>

              {/* Current Status */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>YOUR STATUS</Text>
                
                <View style={styles.statusBento}>
                  {/* Current Combined Progress (Orange) */}
                  <View style={[styles.statusCard, { backgroundColor: theme.colors.library.orange[100] + '30', borderColor: theme.colors.library.orange[100] }]}>
                    <Text style={styles.statusCardLabel}>CURRENT TREND</Text>
                    <View style={styles.statusValueRow}>
                      <Text style={[styles.scoreValue, { color: theme.colors.library.orange[500] }]}>
                        {Math.round(currentScore)}
                      </Text>
                      <View style={styles.trendRow}>
                        <MaterialCommunityIcons name={trendIcon} size={14} color={trendColor} />
                        <Text style={[styles.trendTextSmall, { color: trendColor }]}>
                          {change > 0 ? "+" : ""}{change.toFixed(1)}%
                        </Text>
                      </View>
                    </View>
                  </View>

                  {/* Clinical Baseline (Green) */}
                  <View style={[styles.statusCard, { backgroundColor: theme.colors.library.green[100] + '30', borderColor: theme.colors.library.green[100] }]}>
                    <Text style={styles.statusCardLabel}>CLINICAL FOUNDATION</Text>
                    <View style={styles.statusValueRow}>
                      <Text style={[styles.scoreValue, { color: theme.colors.library.green[500] }]}>
                        {baselineScore ? Math.round(baselineScore) : "--"}
                      </Text>
                      <Text style={styles.statusCardSubtext}>OASES BASELINE</Text>
                    </View>
                  </View>
                </View>

                {/* Performance Comparison */}
                {baselineScore !== null && (
                  <View style={styles.comparisonBadge}>
                    <Text style={styles.comparisonText}>
                      {currentScore >= baselineScore 
                        ? `Outperforming baseline by ${(currentScore - baselineScore).toFixed(0)} pts` 
                        : `Building back to baseline`}
                    </Text>
                  </View>
                )}
              </View>

              {/* Recommendation */}
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>KEEP GROWING</Text>
                <View style={styles.recommendationCard}>
                  <MaterialCommunityIcons
                    name="lightbulb-outline"
                    size={20}
                    color={theme.colors.library.orange[500]}
                  />
                  <Text style={styles.recommendationText}>
                    {config.recommendations[trend]}
                  </Text>
                </View>
              </View>
            </View>

            {/* Footer */}
            <TouchableOpacity style={styles.doneButton} onPress={onClose}>
              <Text style={styles.doneButtonText}>Got it</Text>
            </TouchableOpacity>
          </TouchableOpacity>
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
    width: width,
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
  section: {
    gap: 8,
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
  statusBento: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  statusCard: {
    flex: 1,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    justifyContent: "space-between",
  },
  statusCardLabel: {
    fontSize: 9,
    fontWeight: "800",
    color: theme.colors.text.default,
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 8,
  },
  statusValueRow: {
    flexDirection: "column",
    alignItems: "flex-start",
  },
  scoreValue: {
    fontSize: 32,
    fontWeight: "900",
    lineHeight: 38,
  },
  trendRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  trendTextSmall: {
    fontSize: 12,
    fontWeight: "700",
  },
  statusCardSubtext: {
    fontSize: 10,
    fontWeight: "600",
    color: theme.colors.text.default,
    opacity: 0.6,
  },
  comparisonBadge: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  comparisonText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#64748B",
  },
  recommendationCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    backgroundColor: theme.colors.library.orange[500] + '10', // Light tint of orange
    padding: 16,
    borderRadius: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: theme.colors.library.orange[500] + '20',
  },
  recommendationText: {
    flex: 1,
    fontSize: 14,
    color: theme.colors.text.default,
    lineHeight: 20,
  },
  doneButton: {
    backgroundColor: theme.colors.library.orange[400],
    marginHorizontal: 20,
    marginBottom: 40, // Increased for standard bottom sheet safe area
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
  },
  doneButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default DimensionDetailModal;
