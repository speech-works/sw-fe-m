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
  { label: string; description: string; color: string }
> = {
  combined: {
    label: "Combined",
    description: "Blended view of clinical foundation and recent momentum.",
    color: theme.colors.library.orange[500],
  },
  clinical: {
    label: "Clinical",
    description: "Clinically anchored baseline derived from validated signals.",
    color: theme.colors.library.green[500],
  },
  engagement: {
    label: "Engagement",
    description:
      "Recent momentum signals when enough engagement data is available.",
    color: theme.colors.library.blue[500],
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
    description: "Belief in your ability to speak freely.",
    recommendations: {
      IMPROVING: "Your self-belief is moving in the right direction. Keep stacking small wins.",
      STABLE: "A steadier week still counts. Reinforce it with one low-pressure speaking win.",
      WORSENING: "Try resetting with a simpler speaking task before you push intensity again.",
    },
  },
  [ClinicalDomain.AVOIDANCE_BEHAVIOR]: {
    label: "Courage",
    color: "#E11D48",
    icon: "fire",
    description: "Your willingness to face speaking situations without pulling back.",
    recommendations: {
      IMPROVING: "You’re stepping forward more often. Keep that exposure ladder active.",
      STABLE: "Choose one slightly challenging moment this week and meet it on purpose.",
      WORSENING: "Scale the exposure down, not away. Smaller reps will rebuild traction.",
    },
  },
  [ClinicalDomain.IMPAIRMENT_STRUGGLE]: {
    label: "Mastery",
    color: "#0284C7",
    icon: "target",
    description: "How effectively you’re managing speech tools and technique.",
    recommendations: {
      IMPROVING: "Technique use is translating more cleanly. Stay consistent with practice reps.",
      STABLE: "A focused reading or technique block can help convert stability into progress.",
      WORSENING: "Return to one dependable technique and practice it in a controlled setting first.",
    },
  },
  [ClinicalDomain.FUNCTIONAL_LIMITATION]: {
    label: "Ease",
    color: "#8B5CF6",
    icon: "water",
    description: "How comfortable everyday speaking is starting to feel.",
    recommendations: {
      IMPROVING: "Speech is feeling easier in day-to-day moments. Keep that rhythm alive.",
      STABLE: "Keep your reps gentle and regular so comfort can build without pressure.",
      WORSENING: "Dial the environment down and lead with relaxation before speaking tasks.",
    },
  },
  [ClinicalDomain.PARTICIPATION_RESTRICTION]: {
    label: "Social",
    color: "#EA580C",
    icon: "account-group",
    description: "How freely you’re participating in conversations and social life.",
    recommendations: {
      IMPROVING: "You’re showing up more fully in conversation. Keep leaning into that.",
      STABLE: "One small initiation this week can shift a steady line into progress.",
      WORSENING: "Reconnect through safe conversations first, then widen the social circle again.",
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
  const trendIcon =
    activeMetrics.trend === "IMPROVING"
      ? "trending-up"
      : activeMetrics.trend === "WORSENING"
        ? "trending-down"
        : "trending-neutral";
  const trendColor =
    activeMetrics.trend === "IMPROVING"
      ? theme.colors.library.green[500]
      : activeMetrics.trend === "WORSENING"
        ? theme.colors.library.red[500]
        : theme.colors.text.default;
  const isUnavailable = activeMetrics.currentScore === null;

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

            <View style={styles.body}>
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>WHAT IT MEASURES</Text>
                <Text style={styles.description}>{config.description}</Text>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>VIEW THIS DIMENSION</Text>
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
                  {activeFamily.description}
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
                      style={[
                        styles.scoreValue,
                        { color: activeFamily.color },
                      ]}
                    >
                      {isUnavailable
                        ? "--"
                        : Math.round(activeMetrics.currentScore ?? 0)}
                    </Text>
                    <Text style={styles.statusCardSubtext}>
                      {activeFamily.label.toUpperCase()} THIS WEEK
                    </Text>
                  </View>

                  <View style={styles.statusCard}>
                    <Text style={styles.statusCardLabel}>PREVIOUS</Text>
                    <Text style={styles.scoreValue}>
                      {activeMetrics.previousScore === null
                        ? "--"
                        : Math.round(activeMetrics.previousScore)}
                    </Text>
                    <Text style={styles.statusCardSubtext}>
                      LAST WEEK
                    </Text>
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
                      {activeMetrics.trend === "IMPROVING"
                        ? "Improving"
                        : activeMetrics.trend === "WORSENING"
                          ? "Needs attention"
                          : "Holding steady"}
                    </Text>
                  </View>

                  {activeMetrics.percentDelta === null ? (
                    <Text style={styles.deltaText}>
                      {isUnavailable
                        ? "Not enough engagement data yet for this dimension."
                        : "No last-week comparison is available yet for this view."}
                    </Text>
                  ) : (
                    <Text style={styles.deltaText}>
                      {activeMetrics.percentDelta > 0 ? "+" : ""}
                      {activeMetrics.percentDelta.toFixed(1)}% and{" "}
                      {activeMetrics.absoluteDelta && activeMetrics.absoluteDelta > 0
                        ? "+"
                        : ""}
                      {(activeMetrics.absoluteDelta ?? 0).toFixed(1)} pts{" "}
                      {comparisonLabel.toLowerCase()}.
                    </Text>
                  )}
                </View>
              </View>

              <View style={styles.section}>
                <Text style={styles.sectionLabel}>KEEP GROWING</Text>
                <View style={styles.recommendationCard}>
                  <MaterialCommunityIcons
                    name="lightbulb-outline"
                    size={20}
                    color={theme.colors.library.orange[500]}
                  />
                  <Text style={styles.recommendationText}>
                    {isUnavailable
                      ? "Keep checking in with activities and reflections so we can build a clearer engagement picture here."
                      : config.recommendations[activeMetrics.trend]}
                  </Text>
                </View>
              </View>
            </View>

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
  doneButton: {
    margin: 20,
    marginTop: 4,
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
