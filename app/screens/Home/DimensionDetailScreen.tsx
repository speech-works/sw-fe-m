import { MaterialCommunityIcons } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/FontAwesome5";
import { BlurView } from "expo-blur";
import { parseTextStyle } from "../../util/functions/parseStyles";
import React, { useState } from "react";
import {
  Dimensions,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Svg, Circle } from "react-native-svg";
import { theme } from "../../Theme/tokens";
import { ClinicalDomain } from "../../api/userBehaviorTrends/types";
import { useNavigation, useRoute } from "@react-navigation/native";
import { HomeStackNavigationProp, HomeStackRouteProp } from "../../navigators/index";
import ScreenView from "../../components/ScreenView";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

type DetailFamily = "combined" | "clinical" | "engagement";

type FamilyMetricData = {
  currentScore: number | null;
  previousScore: number | null;
  percentDelta: number | null;
  absoluteDelta: number | null;
  trend: "IMPROVING" | "STABLE" | "WORSENING";
};

const FAMILY_CONFIG: Record<DetailFamily, { label: string; color: string }> = {
  combined: { label: "Combined", color: theme.colors.library.orange[500] },
  clinical: { label: "Clinical", color: theme.colors.library.green[500] },
  engagement: { label: "Engagement", color: theme.colors.library.blue[500] },
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

const Gauge = ({ score, color, size = 160 }: { score: number | null; color: string; size?: number }) => {
  const strokeWidth = 14;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = score === null ? 0 : score / 100;
  const strokeDashoffset = circumference * (1 - progress);

  return (
    <View style={{ width: size, height: size, justifyContent: 'center', alignItems: 'center' }}>
      <Svg width={size} height={size}>
        <Circle cx={size / 2} cy={size / 2} r={radius} stroke="#F1F5F9" strokeWidth={strokeWidth} fill="none" />
        <Circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          transform={`rotate(-90 ${size / 2} ${size / 2})`}
        />
      </Svg>
      <View style={styles.gaugeContent}>
        <Text style={styles.gaugeLabel}>CURRENT SCORE</Text>
        <Text style={[styles.gaugeValue, { color: score === null ? '#94A3B8' : theme.colors.text.title }]}>
          {score === null ? '--' : Math.round(score)}
        </Text>
      </View>
    </View>
  );
};

const DimensionDetailScreen = () => {
  const route = useRoute<HomeStackRouteProp<"DimensionDetail">>();
  const navigation = useNavigation<HomeStackNavigationProp<"DimensionDetail">>();
  const { domain, familyData: rawFamilyData, comparisonLabel } = route.params;

  const familyData = rawFamilyData as Record<DetailFamily, FamilyMetricData>;

  const [selectedFamily, setSelectedFamily] = useState<DetailFamily>("combined");
  const insets = useSafeAreaInsets();

  if (!domain) return null;

  const config = DIMENSION_CONFIG[domain as ClinicalDomain];
  const activeMetrics = familyData[selectedFamily];
  const isUnavailable = activeMetrics.currentScore === null;
  const hasComparison = activeMetrics.previousScore !== null;
  const trend = activeMetrics.trend;
  const trendColor = trend === "IMPROVING" ? "#059669" : trend === "WORSENING" ? "#E11D48" : "#64748B";

  return (
    <ScreenView style={[styles.screen, { paddingHorizontal: 0 }]}>
      <View style={styles.globalWatermark}>
        <MaterialCommunityIcons name={config.icon as any} size={400} color={`${config.color}15`} />
      </View>

      <BlurView
        intensity={80}
        tint="light"
        style={[
          styles.header,
          { paddingTop: insets.top + 10, height: 60 + insets.top },
        ]}
      >
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Growth Profile</Text>
        <View style={{ width: 32 }} />
      </BlurView>

      <ScrollView 
        style={{ flex: 1, width: '100%' }} 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={[styles.scrollContent, { paddingTop: 60 + insets.top + 16 }]}
      >
        <View style={styles.headerContainer}>
          <View style={styles.headerTopRow}>
            <Text style={styles.titleText}>{config.label}</Text>
          </View>
          <Text style={styles.subtitleText}>{config.description}</Text>
        </View>
        <View style={styles.card}>
          <View style={styles.switcher}>
            {(Object.keys(FAMILY_CONFIG) as DetailFamily[]).map((f) => {
              const active = f === selectedFamily;
              return (
                <TouchableOpacity
                  key={f}
                  onPress={() => setSelectedFamily(f)}
                  style={[
                    styles.switcherPill,
                    active && { ...styles.switcherPillActive, backgroundColor: config.color, shadowColor: config.color }
                  ]}
                >
                  <Text style={[styles.switcherText, active && styles.switcherTextActive]}>
                    {FAMILY_CONFIG[f].label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <Text style={styles.familyDescText}>
            {FAMILY_DESCRIPTIONS[domain as ClinicalDomain][selectedFamily]}
          </Text>

          <View style={styles.gaugeWrapper}>
            <Gauge score={activeMetrics.currentScore} color={config.color} />
          </View>

          <View style={styles.trendRow}>
            <MaterialCommunityIcons
              name={!hasComparison ? "clock-outline" : trend === "IMPROVING" ? "trending-up" : trend === "WORSENING" ? "trending-down" : "minus"}
              size={16}
              color={trendColor}
            />
            <Text style={[styles.trendLabel, { color: trendColor }]}>
              {!hasComparison
                ? "Waiting for history"
                : `${(activeMetrics.percentDelta ?? 0) > 0 ? "+" : ""}${activeMetrics.percentDelta?.toFixed(1)}% since last week`}
            </Text>
          </View>

          {hasComparison && (
            <Text style={styles.previousScoreText}>
              Previously {Math.round(activeMetrics.previousScore ?? 0)}
            </Text>
          )}

          <View style={[styles.integratedInsight, { borderTopColor: `${config.color}20` }]}>
            <MaterialCommunityIcons name="lightning-bolt" size={16} color={config.color} style={styles.insightIcon} />
            <Text style={styles.integratedInsightText}>
              {isUnavailable
                ? "Reflection pending..."
                : config.recommendations[trend]}
            </Text>
          </View>
        </View>
      </ScrollView>
    </ScreenView>
  );
};

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#FAFAFA",
    position: 'relative',
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginTop: 2,
  },
  globalWatermark: {
    position: 'absolute',
    top: 40,
    right: -150,
    zIndex: -1,
    transform: [{ rotate: '-15deg' }],
  },
  scrollContent: {
    paddingHorizontal: 28,
    paddingTop: 8,
    paddingBottom: 40, 
  },
  headerContainer: {
    marginBottom: 16,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    marginBottom: 16,
  },
  headerTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  titleText: {
    fontSize: 32,
    fontWeight: '900',
    color: theme.colors.text.title,
    letterSpacing: -0.5,
  },
  subtitleText: {
    fontSize: 15,
    color: '#64748B',
    lineHeight: 22,
    fontWeight: '500',
  },
  card: {
    backgroundColor: 'rgba(255, 255, 255, 0.95)', 
    borderRadius: 36,
    padding: 24,
    alignItems: 'center',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.06,
    shadowRadius: 24,
    elevation: 6,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    width: SCREEN_WIDTH - 20, 
    alignSelf: 'center',
  },
  switcher: {
    flexDirection: 'row',
    backgroundColor: '#F8FAFC',
    borderRadius: 24,
    padding: 8,
    paddingHorizontal: 12,
    alignSelf: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#F1F5F9',
  },
  switcherPill: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
    minWidth: 92,
  },
  switcherPillActive: {
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  switcherText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#94A3B8',
    letterSpacing: 0.2,
  },
  switcherTextActive: {
    color: '#FFFFFF',
    fontWeight: '800',
  },
  familyDescText: {
    fontSize: 14,
    color: '#64748B',
    lineHeight: 20,
    textAlign: 'center',
    fontStyle: 'italic',
    paddingHorizontal: 12,
    marginBottom: 24,
  },
  gaugeWrapper: {
    marginBottom: 16,
  },
  gaugeContent: {
    position: 'absolute',
    alignItems: 'center',
  },
  gaugeLabel: {
    fontSize: 10,
    color: '#94A3B8',
    fontWeight: '800',
    letterSpacing: 1,
    marginBottom: 2,
  },
  gaugeValue: {
    fontSize: 44,
    fontWeight: '900',
    letterSpacing: -1,
  },
  trendRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  trendLabel: {
    fontSize: 13,
    fontWeight: '700',
  },
  previousScoreText: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    marginTop: 6,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  integratedInsight: {
    marginTop: 28,
    paddingTop: 20,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    width: '100%',
  },
  insightIcon: {
    marginTop: 2,
  },
  integratedInsightText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#334155',
    fontWeight: '600',
    letterSpacing: -0.1,
  },
});

export default DimensionDetailScreen;
