// TutorialPage.tsx

import { theme } from "../../../../../Theme/tokens";
import {
    getGlimpseVideoUrl,
    getPremiumVideoUrl,
    getTutorialByTechnique,
} from "../../../../../api/library";
import { TECHNIQUES_ENUM, Tutorial } from "../../../../../api/library/types";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";

import { useNavigation } from "@react-navigation/native";
import { useEffect, useMemo, useState } from "react";
import {
    ActivityIndicator,
    Platform,
    StyleSheet,
    Text,
    View,
} from "react-native";
import CustomScrollView from "../../../../../components/CustomScrollView";
import { VideoPlayer } from "../../../../../components/VideoPlayer";
import {
    LibStackNavigationProp,
    LibStackParamList,
} from "../../../../../navigators/stacks/AcademyStack/LibraryStack/types";
import { useUserStore } from "../../../../../stores/user";

interface TutorialPageProps {
  techniqueId: TECHNIQUES_ENUM;
  setActiveStageIndex: React.Dispatch<React.SetStateAction<number>>;
}

const TutorialPage = ({ techniqueId }: TutorialPageProps) => {
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();
  const { user } = useUserStore();

  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Derive a BunnyCDN thumbnail URL from the video stream URL
  // e.g., https://vz-xxx.b-cdn.net/{id}/playlist.m3u8 → https://vz-xxx.b-cdn.net/{id}/thumbnail.jpg
  const posterUrl = useMemo(() => {
    if (!videoUrl) return undefined;
    try {
      return videoUrl.replace(/\/playlist\.m3u8.*$/, "/thumbnail.jpg");
    } catch {
      return undefined;
    }
  }, [videoUrl]);

  // Load tutorial + paywall
  useEffect(() => {
    let cancelled = false;

    const load = async () => {
      try {
        setIsLoading(true);
        const tut = await getTutorialByTechnique(techniqueId);
        if (cancelled) return;

        setTutorial(tut);
        if (!tut) throw new Error("No tutorial");

        if (tut.isFree || user?.isPaid) {
          const r = await getPremiumVideoUrl(tut.id);
          if (cancelled) return;
          setVideoUrl(r.videoUrl);
          setIsLocked(false);
        } else {
          const r = await getGlimpseVideoUrl(tut.id);
          if (cancelled) return;
          setVideoUrl(r.videoUrl);
          setIsLocked(true);
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [techniqueId, user?.isPaid]);

  // Loading
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.text.default} />
      </View>
    );
  }

  return (
    <CustomScrollView contentContainerStyle={styles.scrollContent}>
      <View style={{ gap: 16 }}>
        <View style={styles.videoContainer}>
          <VideoPlayer
            uri={videoUrl!}
            poster={posterUrl}
            title={tutorial?.title}
            subtitle={isLocked ? "15-Second Glimpse" : "Full Lesson"}
            isLocked={isLocked}
            autoPlay={true}
            onPressGoPremium={() => navigation.navigate("PremiumModal" as any)}
          />
        </View>

        {/* Learning Path */}
        <View style={styles.learningPathContainer}>
          <Text style={styles.learningPathTitleText}>Your Learning Path</Text>
          <View style={styles.learningPathObjectives}>
            {tutorial?.learningPath.map((o, i) => {
              // Pseudo-random bubble variations (Simplified from Roleplay)
              const bubbles = [
                [
                  { top: -20, right: -20, width: 90, height: 90 },
                  { bottom: -10, left: 10, width: 40, height: 40 },
                ],
                [
                  { bottom: -30, right: -10, width: 100, height: 100 },
                  { top: 10, left: -20, width: 50, height: 50 },
                ],
                [
                  { top: -40, left: -20, width: 110, height: 110 },
                  { bottom: 20, right: -10, width: 30, height: 30 },
                ],
              ];
              const activeBubbles = bubbles[i % bubbles.length];

              return (
                <View key={i} style={styles.objective}>
                  {/* Bubbles */}
                  <View
                    style={[
                      styles.bubble,
                      activeBubbles[0],
                      {
                        backgroundColor: theme.colors.library.orange[500],
                        opacity: 0.05,
                      },
                    ]}
                  />
                  <View
                    style={[
                      styles.bubble,
                      activeBubbles[1],
                      {
                        backgroundColor: theme.colors.library.orange[500],
                        opacity: 0.03,
                      },
                    ]}
                  />

                  {/* Watermark Number */}
                  <View style={styles.watermarkContainer}>
                    <Text style={styles.watermarkText}>
                      {(i + 1).toString().padStart(2, "0")}
                    </Text>
                  </View>

                  {/* Content */}
                  <View style={styles.objectiveTextContainer}>
                    <Text style={styles.stepLabel}>Step {i + 1}</Text>
                    <Text style={styles.objectiveText}>{o}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </CustomScrollView>
  );
};

export default TutorialPage;

// ---- STYLES ----
const styles = StyleSheet.create({
  // innerContainer style removed as handled by scroll wrapper
  scrollContent: {
    padding: 2,
    flexGrow: 1,
  },
  loadingContainer: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: theme.colors.background.default,
    justifyContent: "center",
    alignItems: "center",
  },

  videoContainer: {
    width: "100%",
    borderRadius: 16,
    backgroundColor: theme.colors.background.default,
    overflow: "hidden",
    position: "relative",
    justifyContent: "flex-start",
  },

  /* Learning path */
  learningPathContainer: {
    padding: 24,
    gap: 20,
    // Removed background color to blend with parent glass
    marginTop: 8,
  },
  learningPathTitleText: {
    ...parseTextStyle(theme.typography.Heading3), // Specific concise header
    color: theme.colors.text.title,
    marginBottom: 8,
    fontWeight: "700",
    letterSpacing: -0.5,
  },
  learningPathObjectives: {
    gap: 0, // Handled by item layout
    position: "relative",
  },

  // Card Item
  objective: {
    backgroundColor: "#FFF",
    borderRadius: 24,
    padding: 24,
    paddingHorizontal: 28,
    marginBottom: 16,
    ...Platform.select({
      ios: {
        shadowColor: theme.colors.library.orange[200],
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, // Slightly more pronounced
        shadowRadius: 10,
      },
      android: {
        elevation: 3,
      },
    }),
    justifyContent: "center",
    minHeight: 100,
    position: "relative",
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.8)",
  },

  // Watermark (Background Number)
  watermarkContainer: {
    position: "absolute",
    right: -12,
    bottom: -24,
    zIndex: 0,
    opacity: 0.08, // Subtle opacity
  },
  watermarkText: {
    fontSize: 90,
    fontWeight: "900",
    color: theme.colors.library.orange[600],
    includeFontPadding: false,
    letterSpacing: -4,
  },

  // Background Bubbles
  bubble: {
    position: "absolute",
    borderRadius: 999,
    zIndex: 0,
  },

  // Content
  objectiveTextContainer: {
    zIndex: 1,
    maxWidth: "85%", // Avoid overlap with visual weight of number
    gap: 4,
  },

  // Small label above title (optional, good for structure)
  stepLabel: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.library.orange[500],
    fontWeight: "700",
    fontSize: 10,
    letterSpacing: 1,
    textTransform: "uppercase",
  },

  objectiveText: {
    ...parseTextStyle(theme.typography.Heading3), // Use a bolder Heading style
    color: theme.colors.text.title,
    fontSize: 18,
    lineHeight: 24,
    fontWeight: "700",
  },
});
