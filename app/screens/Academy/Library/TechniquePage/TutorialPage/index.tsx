import {
  ImageBackground,
  StyleSheet,
  Text,
  View,
  ActivityIndicator, // <-- ADDED
  TouchableOpacity, // <-- ADDED
} from "react-native";
import React, { useEffect, useState } from "react";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";
import { theme } from "../../../../../Theme/tokens";
import {
  getGlimpseVideoUrl, // <-- ADDED
  getPremiumVideoUrl, // <-- ADDED
  getTutorialByTechnique,
} from "../../../../../api/library";
import { TECHNIQUES_ENUM, Tutorial } from "../../../../../api/library/types";
import Icon from "react-native-vector-icons/FontAwesome5";
import Button from "../../../../../components/Button";
import Video from "react-native-video";
import { useNavigation } from "@react-navigation/native";
import {
  LibStackNavigationProp,
  LibStackParamList,
} from "../../../../../navigators/stacks/AcademyStack/LibraryStack/types";

interface TutorialPageProps {
  techniqueId: TECHNIQUES_ENUM;
  setActiveStageIndex: React.Dispatch<React.SetStateAction<number>>;
}

const TutorialPage = ({
  techniqueId,
  setActiveStageIndex,
}: TutorialPageProps) => {
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();
  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [isLoading, setIsLoading] = useState(true); // <-- ADDED
  // (Placeholder) Get user's subscription status
  // const { user } = useAuth();
  // FOR TESTING, let's pretend the user is a free user:
  const user = { isPaid: false }; // <--!! (PLACEHOLDER) !!

  // State to hold the final video URL (either full or glimpse)
  const [videoUrl, setVideoUrl] = useState<string | null>(null); // <-- ADDED
  // State to know if we should show a "locked" overlay
  const [isLocked, setIsLocked] = useState(false); // <-- ADDED

  useEffect(() => {
    const fetchTutorialDetails = async () => {
      try {
        setIsLoading(true);
        setIsLocked(false);
        setVideoUrl(null);

        // 1. Fetch the tutorial metadata (which includes `isFree` and `id`)
        const tut = await getTutorialByTechnique(techniqueId);
        setTutorial(tut);

        if (!tut) {
          throw new Error("Tutorial not found");
        }

        // --- PAYWALL LOGIC ---
        // Check if the video is free OR if the user is a paid member
        if (tut.isFree || user.isPaid) {
          // User has access
          const response = await getPremiumVideoUrl(tut.id);
          setVideoUrl(response.videoUrl);
          setIsLocked(false);
        } else {
          // User is free and content is premium, show the glimpse
          const response = await getGlimpseVideoUrl(tut.id);
          setVideoUrl(response.videoUrl);
          setIsLocked(true); // Show the lock/upgrade button
        }
        // ---------------------
      } catch (error) {
        console.error("Failed to fetch tutorial video:", error);
        // Handle error (e.g., show a toast message)
      } finally {
        setIsLoading(false);
      }
    };

    fetchTutorialDetails();
  }, [techniqueId, user.isPaid]); // Re-run if technique or user status changes

  // Shows a loading spinner while we fetch the video URL
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.text.default} />
      </View>
    );
  }

  return (
    <View style={styles.innerContainer}>
      {/* --- VIDEO PLAYER --- */}
      <View style={styles.videoContainer}>
        {videoUrl ? (
          <Video
            source={{ uri: videoUrl }}
            style={styles.videoPlayer}
            controls={!isLocked} // Show controls only if video is unlocked
            repeat={isLocked} // Loop the glimpse video
            muted={isLocked} // Mute the glimpse video
            resizeMode="cover"
          />
        ) : (
          // Fallback in case videoUrl is null
          <ImageBackground
            source={require("../../../../../assets/demo-tut-img.png")}
            style={styles.videoContainer}
            imageStyle={styles.imgStyle}
          />
        )}

        {/* --- LOCKED OVERLAY --- */}
        {isLocked && (
          <View style={styles.lockedOverlay}>
            <Icon name="lock" size={48} color={theme.colors.text.onDark} />
            <Text style={styles.lockedText}>
              Unlock this video with Premium
            </Text>
            <Button
              text="Go Premium"
              onPress={() => {
                navigation.navigate("PaymentStack");
              }}
              style={styles.premiumButton}
            />
          </View>
        )}

        {/* --- VIDEO METADATA --- */}
        <View style={[styles.videoMeta, isLocked && styles.videoMetaLocked]}>
          <Text style={styles.videoMetaTitleText}>{tutorial?.title}</Text>
          <Text style={styles.videoMetaDescText}>
            {isLocked ? "15-Second Glimpse" : "Full Lesson"}
          </Text>
        </View>
      </View>

      {/* --- LEARNING PATH (no changes) --- */}
      <View style={styles.learningPathContainer}>
        <Text style={styles.learningPathTitleText}>Your Learning Path</Text>
        <View style={styles.learningPathObjectives}>
          {tutorial?.learningPath.map((o, i) => (
            <View key={i} style={styles.objective}>
              <Icon
                solid
                name="check-circle"
                size={14}
                color={theme.colors.actionPrimary.default}
              />
              <Text style={styles.objectiveText}>{o}</Text>
            </View>
          ))}
        </View>
      </View>

      {/* --- BUTTON (Disabled if locked) --- */}
      <Button
        text="Begin Practice Session"
        onPress={() => {
          setActiveStageIndex(1);
        }}
        disabled={isLocked} // Disable "Practice" if video is locked
      />
    </View>
  );
};

export default TutorialPage;

const styles = StyleSheet.create({
  // ... (All your existing styles) ...
  innerContainer: {
    gap: 16,
  },
  loadingContainer: {
    // <-- ADDED
    height: 420,
    width: "100%",
    borderRadius: 16,
    backgroundColor: theme.colors.background.default,
    justifyContent: "center",
    alignItems: "center",
  },
  videoContainer: {
    height: 420,
    width: "100%",
    borderRadius: 16,
    backgroundColor: theme.colors.background.default, // Background for the player
    position: "relative",
    overflow: "hidden", // <-- ADDED
  },
  videoPlayer: {
    // <-- ADDED
    position: "absolute",
    top: 0,
    left: 0,
    bottom: 0,
    right: 0,
  },
  imgStyle: {
    borderRadius: 16,
  },
  videoMeta: {
    position: "absolute",
    bottom: 0,
    width: "100%",
    padding: 16,
    backgroundColor: "rgba(0, 0, 0, 0.6)", // Darker overlay
    borderBottomEndRadius: 16,
    borderBottomStartRadius: 16,
    zIndex: 1, // <-- ADDED
  },
  videoMetaLocked: {
    // <-- ADDED
    backgroundColor: "rgba(0, 0, 0, 0.2)", // Make it more subtle when locked
  },
  videoMetaTitleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.onDark,
  },
  videoMetaDescText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.onDark, // <-- Changed to onDark for better contrast
  },
  learningPathContainer: {
    padding: 16,
    gap: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.background.default,
  },
  learningPathTitleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  learningPathObjectives: {
    gap: 12,
  },
  objective: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  objectiveText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  // --- STYLES FOR LOCKED OVERLAY ---
  lockedOverlay: {
    // <-- ADDED
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
    borderRadius: 16,
    zIndex: 2,
  },
  lockedText: {
    // <-- ADDED
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.onDark,
  },
  premiumButton: {
    // <-- ADDED
    minWidth: 150,
    backgroundColor: theme.colors.actionPrimary.default,
  },
});
