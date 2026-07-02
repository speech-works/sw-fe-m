// TutorialPage.tsx

import {
  getGlimpseVideoUrl,
  getPremiumVideoUrl,
  getTutorialByTechnique,
} from "../../../../../api/library";
import { TECHNIQUES_ENUM, Tutorial } from "../../../../../api/library/types";

import { useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import CustomScrollView from "../../../../../components/CustomScrollView";
import { VideoPlayer } from "../../../../../components/VideoPlayer";
import { useUserStore } from "../../../../../stores/user";
import { useEventStore } from "../../../../../stores/events";
import { EVENT_NAMES } from "../../../../../stores/events/constants";
import {
  Text,
  Surface,
  Spinner,
  ErrorState,
  useTheme,
  spacing,
  space,
  radius,
} from "../../../../../design-system";

interface TutorialPageProps {
  techniqueId: TECHNIQUES_ENUM;
  setActiveStageIndex: React.Dispatch<React.SetStateAction<number>>;
  header?: React.ReactNode;
}

const TutorialPage = ({
  techniqueId,
  setActiveStageIndex,
  header,
}: TutorialPageProps) => {
  const { colors } = useTheme();
  const { user } = useUserStore();
  const { emit } = useEventStore();

  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
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
        setError(null);
        console.log(`[TutorialPage] Loading tutorial for technique: ${techniqueId}`);

        const tut = await getTutorialByTechnique(techniqueId);
        if (cancelled) return;

        if (!tut) {
          console.error(`[TutorialPage] No tutorial found for technique: ${techniqueId}`);
          setError("Tutorial content not found.");
          return;
        }

        setTutorial(tut);

        try {
          if (tut.isFree || user?.isPaid) {
            console.log(`[TutorialPage] Fetching premium video URL for tutorial: ${tut.id}`);
            try {
              const r = await getPremiumVideoUrl(tut.id);
              if (cancelled) return;
              setVideoUrl(r.videoUrl);
              setIsLocked(false);
            } catch (error: any) {
              if (error?.response?.status === 403) {
                console.log(
                  `[TutorialPage] Premium access denied (403). Falling back to glimpse video for: ${tut.id}`,
                );
                const r = await getGlimpseVideoUrl(tut.id);
                if (cancelled) return;
                setVideoUrl(r.videoUrl);
                setIsLocked(true);
              } else {
                throw error; // Re-throw other errors
              }
            }
          } else {
            console.log(`[TutorialPage] Fetching glimpse video URL for tutorial: ${tut.id}`);
            const r = await getGlimpseVideoUrl(tut.id);
            if (cancelled) return;
            setVideoUrl(r.videoUrl);
            setIsLocked(true);
          }
        } catch (err) {
          console.error("[TutorialPage] Error fetching video URL:", err);
          setError("Failed to load video. Please try again later.");
        }
      } catch (err) {
        console.error("[TutorialPage] Error loading tutorial:", err);
        setError("Failed to load tutorial data.");
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
      <View style={styles.stateContainer}>
        <Spinner />
      </View>
    );
  }

  // Error
  if (error) {
    return (
      <View style={styles.stateContainer}>
        <ErrorState title="Tutorial unavailable" message={error} />
      </View>
    );
  }

  return (
    <CustomScrollView contentContainerStyle={styles.scrollContent}>
      {header}
      <View style={{ gap: spacing.lg }}>
        <View style={styles.videoContainer}>
          <VideoPlayer
            uri={videoUrl!}
            poster={posterUrl}
            title={tutorial?.title}
            subtitle={isLocked ? "15-Second Glimpse" : "Full Lesson"}
            isLocked={isLocked}
            autoPlay={true}
            onPressGoPremium={() => emit(EVENT_NAMES.SHOW_LIBRARY_UPSELL)}
          />
        </View>

        {/* Learning Path */}
        <View style={styles.learningPathContainer}>
          <Text variant="h3" color="primary" style={styles.learningPathTitle}>
            Your Learning Path
          </Text>
          <View style={styles.learningPathObjectives}>
            {tutorial?.learningPath.map((o, i) => (
              <Surface
                key={i}
                level="elevated"
                rounded="card"
                style={styles.objective}
              >
                {/* Step number chip — soft orange tint on the dark surface. */}
                <View
                  style={[
                    styles.stepChip,
                    { backgroundColor: colors.action.primaryTint },
                  ]}
                >
                  <Text variant="title" color="primary">
                    {(i + 1).toString().padStart(2, "0")}
                  </Text>
                </View>

                {/* Content */}
                <View style={styles.objectiveTextContainer}>
                  <Text variant="label" color="tertiary">
                    Step {i + 1}
                  </Text>
                  <Text variant="title" color="primary" style={styles.objectiveText}>
                    {o}
                  </Text>
                </View>
              </Surface>
            ))}
          </View>
        </View>
      </View>
    </CustomScrollView>
  );
};

export default TutorialPage;

// ---- STYLES ----
const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: space.screenX,
    paddingBottom: spacing["2xl"],
    flexGrow: 1,
  },
  stateContainer: {
    justifyContent: "center",
    alignItems: "center",
    minHeight: 200,
  },
  videoContainer: {
    width: "100%",
    borderRadius: radius.input,
    overflow: "hidden",
    position: "relative",
    justifyContent: "flex-start",
  },

  /* Learning path */
  learningPathContainer: {
    paddingHorizontal: spacing.xs,
    gap: spacing.xl,
    marginTop: spacing.sm,
  },
  learningPathTitle: {
    marginBottom: spacing.sm,
  },
  learningPathObjectives: {
    gap: spacing.md,
  },

  // Card Item
  objective: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.lg,
    padding: spacing.xl,
    minHeight: 92,
  },
  stepChip: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  objectiveTextContainer: {
    flex: 1,
    gap: spacing.xs,
  },
  objectiveText: {
    lineHeight: 24,
  },
});
