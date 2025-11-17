// TutorialPage.tsx
import {
  ImageBackground,
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  TouchableWithoutFeedback,
  TouchableOpacity,
  Animated,
  Easing,
} from "react-native";
import React, { useEffect, useState, useRef } from "react";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";
import { theme } from "../../../../../Theme/tokens";
import {
  getGlimpseVideoUrl,
  getPremiumVideoUrl,
  getTutorialByTechnique,
} from "../../../../../api/library";
import { TECHNIQUES_ENUM, Tutorial } from "../../../../../api/library/types";
import Icon from "react-native-vector-icons/FontAwesome5";
import Button from "../../../../../components/Button";
import Video from "react-native-video";
import Slider from "@react-native-community/slider";
import { useNavigation } from "@react-navigation/native";
import {
  LibStackNavigationProp,
  LibStackParamList,
} from "../../../../../navigators/stacks/AcademyStack/LibraryStack/types";
import { useUserStore } from "../../../../../stores/user";

const formatTime = (sec: number) => {
  if (!sec || isNaN(sec)) return "0:00";
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
};

interface TutorialPageProps {
  techniqueId: TECHNIQUES_ENUM;
  setActiveStageIndex: React.Dispatch<React.SetStateAction<number>>;
}

const AUTO_HIDE_MS = 3000;
const DOUBLE_TAP_THRESHOLD = 300;
const SKIP_SECONDS = 10;

const TutorialPage = ({
  techniqueId,
  setActiveStageIndex,
}: TutorialPageProps) => {
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();
  const { user } = useUserStore();

  const [tutorial, setTutorial] = useState<Tutorial | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLocked, setIsLocked] = useState(false);

  // Player states
  const videoRef = useRef<React.ElementRef<typeof Video>>(null);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [seeking, setSeeking] = useState(false);
  const [tempSeekTime, setTempSeekTime] = useState(0);

  // Layout & Loading states
  const [videoAspectRatio, setVideoAspectRatio] = useState<number>(16 / 9);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false); // NEW: Controls visibility

  // Controls visibility
  const controlsVisibleRef = useRef(false);
  const [controlsVisible, setControlsVisible] = useState(false);
  const controlsAnim = useRef(new Animated.Value(0)).current;
  const metaAnim = useRef(new Animated.Value(1)).current;

  // Double-tap detection
  const [lastTapAt, setLastTapAt] = useState<number | null>(null);
  const [skipOverlay, setSkipOverlay] = useState<null | {
    dir: "left" | "right";
    ts: number;
  }>(null);
  const skipOverlayTimeout = useRef<number | undefined>(undefined);

  // Center icon animation
  const centerIconOpacity = useRef(new Animated.Value(0)).current;

  // Auto-hide timer
  const hideTimer = useRef<number | undefined>(undefined);

  const clearAutoHide = () => {
    if (hideTimer.current) {
      clearTimeout(hideTimer.current);
      hideTimer.current = undefined;
    }
  };

  const startAutoHide = () => {
    if (!controlsVisibleRef.current) return;
    clearAutoHide();
    hideTimer.current = setTimeout(() => {
      toggleControls(false);
    }, AUTO_HIDE_MS) as unknown as number;
  };

  const animateControls = (show: boolean) => {
    Animated.parallel([
      Animated.timing(controlsAnim, {
        toValue: show ? 1 : 0,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(metaAnim, {
        toValue: show ? 0 : 1,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start();
  };

  const toggleControls = (show?: boolean) => {
    const next = typeof show === "boolean" ? show : !controlsVisibleRef.current;
    controlsVisibleRef.current = next;
    setControlsVisible(next);
    animateControls(next);

    if (next) startAutoHide();
    else clearAutoHide();
  };

  // double-tap skip + single tap toggle
  const onTapVideo = (evt: any) => {
    const now = Date.now();
    const x = evt?.nativeEvent?.locationX ?? 0;
    const containerWidth = videoContainerWidth.current || 1;
    const isLeft = x < containerWidth / 2;

    if (lastTapAt && now - lastTapAt < DOUBLE_TAP_THRESHOLD) {
      const dir = isLeft ? "left" : "right";
      handleSkipTap(dir);
      setLastTapAt(null);
      toggleControls(true);
      flashCenterIcon(dir === "left" ? "backward" : "forward");
      return;
    }
    setLastTapAt(now);
    toggleControls();
  };

  const handleSkipTap = (dir: "left" | "right") => {
    const jump = dir === "left" ? -SKIP_SECONDS : SKIP_SECONDS;
    const target = Math.max(0, Math.min(duration, currentTime + jump));
    videoRef.current?.seek(target);
    setCurrentTime(target);

    setSkipOverlay({ dir, ts: Date.now() });
    if (skipOverlayTimeout.current) clearTimeout(skipOverlayTimeout.current);

    skipOverlayTimeout.current = setTimeout(() => {
      setSkipOverlay(null);
    }, 700) as unknown as number;
  };

  const flashCenterIcon = (type: "play" | "pause" | "forward" | "backward") => {
    centerIconOpacity.setValue(1);
    Animated.timing(centerIconOpacity, {
      toValue: 0,
      duration: 700,
      useNativeDriver: true,
    }).start();
  };

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

        // Reset video loaded state when fetching new video
        setIsVideoLoaded(false);

        if (tut.isFree || user?.isPaid) {
          const r = await getPremiumVideoUrl(tut.id);
          if (cancelled) return;
          setVideoUrl(r.videoUrl);
          setIsLocked(false);
          setMuted(false);
        } else {
          const r = await getGlimpseVideoUrl(tut.id);
          if (cancelled) return;
          setVideoUrl(r.videoUrl);
          setIsLocked(true);
          setMuted(true);
        }
        setPaused(false);
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };

    load();
    return () => {
      cancelled = true;
      clearAutoHide();
      if (skipOverlayTimeout.current) clearTimeout(skipOverlayTimeout.current);
    };
  }, [techniqueId, user?.isPaid]);

  // Slider
  const onSlidingStart = () => {
    setSeeking(true);
    clearAutoHide();
  };
  const onValueChange = (val: number) => {
    setTempSeekTime(val);
  };
  const onSlidingComplete = (val: number) => {
    setSeeking(false);
    videoRef.current?.seek(val);
    setCurrentTime(val);
    startAutoHide();
  };

  // Button handlers
  const onPressPlayPause = () => {
    if (isLocked) return;
    setPaused((p) => !p);
    startAutoHide();
  };
  const onPressRestart = () => {
    videoRef.current?.seek(0);
    setPaused(false);
    setCurrentTime(0);
    startAutoHide();
  };
  const onPressSkip = (sec: number) => {
    const t = Math.max(0, Math.min(duration, currentTime + sec));
    videoRef.current?.seek(t);
    setCurrentTime(t);
    startAutoHide();
  };
  const onToggleMute = () => {
    if (isLocked) return;
    setMuted((m) => !m);
    startAutoHide();
  };

  const videoContainerWidth = useRef<number>(0);
  const onContainerLayout = (ev: any) => {
    videoContainerWidth.current = ev.nativeEvent.layout.width;
  };

  // Animations
  const controlsTranslateY = controlsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [60, 0],
  });

  const controlsOpacity = controlsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  const metaTranslateY = metaAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [80, 0],
  });

  const metaOpacity = metaAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 1],
  });

  // Loading
  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={theme.colors.text.default} />
      </View>
    );
  }

  return (
    <View style={styles.innerContainer}>
      <View style={styles.videoContainer} onLayout={onContainerLayout}>
        <View style={{ width: "100%", height: "100%" }}>
          {/* 1. Video Layer - Opacity 0 until loaded */}
          {videoUrl && (
            <Video
              ref={videoRef}
              source={{ uri: videoUrl, type: "m3u8" }}
              // CHANGED: Hide video (opacity 0) until isVideoLoaded is true
              style={[
                styles.videoPlayer,
                {
                  aspectRatio: videoAspectRatio,
                  opacity: isVideoLoaded ? 1 : 0,
                },
              ]}
              paused={isLocked ? false : paused}
              muted={isLocked ? true : muted}
              repeat={isLocked}
              resizeMode="contain"
              controls={false}
              onLoad={(meta) => {
                setDuration(meta.duration || 0);
                const { width, height } = meta.naturalSize || meta;
                if (width && height) {
                  setVideoAspectRatio(width / height);
                }
                // CHANGED: Reveal video only after aspect ratio is set
                setIsVideoLoaded(true);
              }}
              onProgress={(p) => {
                if (!seeking && !isLocked) setCurrentTime(p.currentTime);
              }}
            />
          )}

          {/* 2. Loading Overlay - Visible until video is loaded */}
          {(!isVideoLoaded || !videoUrl) && (
            <View style={[StyleSheet.absoluteFill, styles.loaderOverlay]}>
              {/* Use your image placeholder or just a spinner */}
              <ActivityIndicator
                size="large"
                color={theme.colors.text.default}
              />
            </View>
          )}

          {/* 3. The Tap Catcher */}
          <TouchableWithoutFeedback onPress={onTapVideo}>
            <View style={styles.fullscreenTapCatcher} />
          </TouchableWithoutFeedback>

          {/* 4. UI Overlays */}
          {skipOverlay && (
            <View style={styles.skipOverlay}>
              <View style={styles.skipBubble}>
                <Icon
                  name={skipOverlay.dir === "left" ? "undo-alt" : "redo-alt"}
                  size={28}
                  color="white"
                />
                <Text style={styles.skipText}>{`${SKIP_SECONDS}s`}</Text>
              </View>
            </View>
          )}

          <Animated.View
            pointerEvents="none"
            style={[styles.centerIcon, { opacity: centerIconOpacity }]}
          >
            <Icon
              name={paused ? "pause" : "play"}
              size={72}
              color="rgba(255,255,255,0.96)"
              solid
            />
          </Animated.View>

          {isLocked && (
            <View style={styles.lockedOverlay}>
              <Icon name="lock" size={48} color={theme.colors.text.onDark} />
              <Text style={styles.lockedText}>
                Unlock this video with Premium
              </Text>
              <Button
                text="Go Premium"
                onPress={() => navigation.navigate("PaymentStack")}
                style={styles.premiumButton}
              />
            </View>
          )}

          <Animated.View
            style={[
              styles.videoMeta,
              {
                transform: [{ translateY: metaTranslateY }],
                opacity: metaOpacity,
              },
              isLocked && styles.videoMetaLocked,
            ]}
          >
            <Text style={styles.videoMetaTitleText}>{tutorial?.title}</Text>
            <Text style={styles.videoMetaDescText}>
              {isLocked ? "15-Second Glimpse" : "Full Lesson"}
            </Text>
          </Animated.View>

          {/* Controls */}
          {!isLocked && (
            <Animated.View
              pointerEvents={controlsVisible ? "auto" : "none"}
              style={[
                styles.controlsContainer,
                {
                  transform: [{ translateY: controlsTranslateY }],
                  opacity: controlsOpacity,
                  zIndex: 10,
                },
              ]}
            >
              <View style={styles.progressContainer}>
                <Slider
                  style={{ flex: 1 }}
                  minimumValue={0}
                  maximumValue={duration}
                  value={seeking ? tempSeekTime : currentTime}
                  minimumTrackTintColor={theme.colors.actionPrimary.default}
                  maximumTrackTintColor="#aaa"
                  thumbTintColor={theme.colors.actionPrimary.default}
                  onSlidingStart={onSlidingStart}
                  onValueChange={onValueChange}
                  onSlidingComplete={onSlidingComplete}
                />
                <Text style={styles.timeText}>
                  {formatTime(seeking ? tempSeekTime : currentTime)} /{" "}
                  {formatTime(duration)}
                </Text>
              </View>

              {/* Playback controls */}
              <View style={styles.buttonsRow}>
                <TouchableOpacity
                  onPress={onPressRestart}
                  style={styles.fixedActionButton}
                >
                  <Icon name="redo-alt" size={22} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => onPressSkip(-SKIP_SECONDS)}
                  style={styles.fixedActionButton}
                >
                  <Icon name="backward" size={22} color="white" />
                </TouchableOpacity>

                <TouchableOpacity onPress={onPressPlayPause}>
                  <Icon
                    name={paused ? "play-circle" : "pause-circle"}
                    size={52}
                    color="white"
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => onPressSkip(SKIP_SECONDS)}
                  style={styles.fixedActionButton}
                >
                  <Icon name="forward" size={22} color="white" />
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={onToggleMute}
                  style={styles.fixedActionButton}
                >
                  <Icon
                    name={muted ? "volume-mute" : "volume-up"}
                    size={22}
                    color="white"
                  />
                </TouchableOpacity>
              </View>
            </Animated.View>
          )}
        </View>
      </View>

      {/* Learning Path */}
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

      <Button
        text="Begin Practice Session"
        onPress={() => setActiveStageIndex(1)}
        disabled={isLocked}
      />
    </View>
  );
};

export default TutorialPage;

// ---- STYLES ----
const styles = StyleSheet.create({
  innerContainer: { gap: 16 },
  loadingContainer: {
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
    backgroundColor: theme.colors.background.default,
    overflow: "hidden",
    position: "relative",
    justifyContent: "flex-start",
  },

  videoPlayer: {
    width: "100%",
    // aspect ratio handled inline
  },

  // NEW: Loading overlay style
  loaderOverlay: {
    backgroundColor: "#000", // or theme.colors.background.default
    justifyContent: "center",
    alignItems: "center",
    zIndex: 2, // ensure it sits above the (invisible) video but below controls
  },

  imgStyle: {
    borderRadius: 16,
  },

  /* Tap catcher */
  fullscreenTapCatcher: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1,
  },

  /* Locked */
  lockedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 200,
  },
  lockedText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.onDark,
    marginTop: 8,
    marginBottom: 8,
  },

  premiumButton: {
    minWidth: 150,
    backgroundColor: theme.colors.actionPrimary.default,
  },

  /* Metadata */
  videoMeta: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 16,
    backgroundColor: "rgba(0,0,0,0.6)",
    zIndex: 50,
  },
  videoMetaLocked: {
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  videoMetaTitleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.onDark,
  },
  videoMetaDescText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.onDark,
  },

  /* Controls */
  controlsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  timeText: {
    color: "white",
    fontSize: 12,
    width: 70,
    textAlign: "right",
  },
  buttonsRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-around",
    marginTop: 8,
  },
  fixedActionButton: {
    width: 40,
    alignItems: "center",
    justifyContent: "center",
  },

  /* Center icon */
  centerIcon: {
    position: "absolute",
    alignSelf: "center",
    top: "40%",
    transform: [{ translateY: -36 }],
    zIndex: 150,
  },

  /* Skip overlay */
  skipOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "35%",
    alignItems: "center",
    zIndex: 140,
  },
  skipBubble: {
    backgroundColor: "rgba(0,0,0,0.6)",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  skipText: {
    color: "white",
    fontSize: 16,
  },

  /* Learning path */
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
  learningPathObjectives: { gap: 12 },
  objective: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  objectiveText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
});
