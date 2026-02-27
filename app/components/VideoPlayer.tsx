import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    Image,
    LayoutAnimation,
    Platform,
    StyleProp,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    UIManager,
    View,
    ViewStyle,
} from "react-native";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import Slider from "@react-native-community/slider";
import { useFocusEffect } from "@react-navigation/native";
import Icon from "react-native-vector-icons/FontAwesome5";
import Video, { VideoRef } from "react-native-video";
import { theme } from "../Theme/tokens";
import { parseTextStyle } from "../util/functions/parseStyles";
import Button from "./Button";
import SkeletonLoader from "./SkeletonLoader";

interface VideoPlayerProps {
  uri: string;
  style?: StyleProp<ViewStyle>;
  poster?: string;
  autoPlay?: boolean;
  title?: string;
  subtitle?: string;
  isLocked?: boolean;
  onPressGoPremium?: () => void;
  hideControls?: boolean;
  /** If known ahead of time, pass the aspect ratio to avoid any layout shift */
  initialAspectRatio?: number;
}

const AUTO_HIDE_MS = 3000;
const SKIP_SECONDS = 10;
const DOUBLE_TAP_THRESHOLD = 300;

const formatTime = (sec: number) => {
  if (!sec || isNaN(sec)) return "0:00";
  const minutes = Math.floor(sec / 60);
  const seconds = Math.floor(sec % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
};

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  uri,
  style,
  poster,
  autoPlay = false,
  title,
  subtitle,
  isLocked = false,
  onPressGoPremium,
  hideControls = false,
  initialAspectRatio,
}) => {
  // Video State
  const videoRef = useRef<VideoRef>(null);
  const [paused, setPaused] = useState(!autoPlay);
  const [muted, setMuted] = useState(false);
  const [duration, setDuration] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const [videoAspectRatio, setVideoAspectRatio] = useState(
    initialAspectRatio || 16 / 9,
  );
  const [aspectRatioReady, setAspectRatioReady] =
    useState(!!initialAspectRatio);

  // Pre-measure poster/thumbnail to get correct aspect ratio BEFORE video loads
  useEffect(() => {
    if (initialAspectRatio) {
      // Already have it, no need to measure
      setAspectRatioReady(true);
      return;
    }
    if (poster) {
      Image.getSize(
        poster,
        (width, height) => {
          if (width && height) {
            setVideoAspectRatio(width / height);
            setAspectRatioReady(true);
          }
        },
        () => {
          // If thumbnail fetch fails, just proceed with default 16:9
          setAspectRatioReady(true);
        },
      );
    } else {
      setAspectRatioReady(true);
    }
  }, [poster, initialAspectRatio]);

  // Controls State
  const [seeking, setSeeking] = useState(false);
  const [tempSeekTime, setTempSeekTime] = useState(0);
  const controlsVisibleRef = useRef(false);
  const [controlsVisible, setControlsVisible] = useState(false);

  // Animations
  const controlsAnim = useRef(new Animated.Value(0)).current;
  const centerIconOpacity = useRef(new Animated.Value(0)).current;
  const metaAnim = useRef(new Animated.Value(1)).current;

  // Double Tap State
  const [lastTapAt, setLastTapAt] = useState<number | null>(null);
  const [skipOverlay, setSkipOverlay] = useState<null | {
    dir: "left" | "right";
    ts: number;
  }>(null);
  const skipOverlayTimeout = useRef<NodeJS.Timeout | undefined>(undefined);
  const hideTimer = useRef<NodeJS.Timeout | undefined>(undefined);
  const videoContainerWidth = useRef<number>(0);

  useEffect(() => {
    return () => {
      clearAutoHide();
      if (skipOverlayTimeout.current) clearTimeout(skipOverlayTimeout.current);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setPaused(true);
      };
    }, []),
  );

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
    }, AUTO_HIDE_MS);
  };

  const animateControls = (show: boolean) => {
    Animated.parallel([
      Animated.timing(controlsAnim, {
        toValue: show ? 1 : 0,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(metaAnim, {
        toValue: show ? 0 : 1,
        duration: 200,
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

  const flashCenterIcon = () => {
    centerIconOpacity.setValue(1);
    Animated.timing(centerIconOpacity, {
      toValue: 0,
      duration: 700,
      useNativeDriver: true,
    }).start();
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
    }, 700);
  };

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
      flashCenterIcon();
      return;
    }
    setLastTapAt(now);
    toggleControls();
  };

  const onPressPlayPause = () => {
    setPaused((p) => !p);
    startAutoHide();
  };

  const onSlidingStart = () => {
    setSeeking(true);
    clearAutoHide();
  };

  const onSlidingComplete = (val: number) => {
    setSeeking(false);
    videoRef.current?.seek(val);
    setCurrentTime(val);
    startAutoHide();
  };

  const onSliderValueChange = (val: number) => {
    setTempSeekTime(val);
  };

  const onContainerLayout = (ev: any) => {
    videoContainerWidth.current = ev.nativeEvent.layout.width;
  };

  const controlsTranslateY = controlsAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
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

  // Show a light skeleton placeholder until we know the correct aspect ratio
  if (!aspectRatioReady) {
    return (
      <SkeletonLoader
        width="100%"
        height={380}
        style={{
          borderRadius: 16,
          backgroundColor: theme.colors.background.default,
        }}
      />
    );
  }

  const screenHeight = Dimensions.get("window").height;
  const screenWidth = Dimensions.get("window").width;
  const maxVideoHeight = screenHeight * 0.65;
  // Compute height from full screen width, capped at maxHeight
  const computedHeight = Math.min(
    screenWidth / videoAspectRatio,
    maxVideoHeight,
  );

  return (
    <View
      style={[styles.container, { height: computedHeight }, style]}
      onLayout={onContainerLayout}
    >
      <Video
        ref={videoRef}
        source={{
          uri,
          type: uri.includes(".m3u8") ? "m3u8" : undefined,
        }}
        style={[styles.video, { opacity: isVideoLoaded ? 1 : 0 }]}
        resizeMode="cover"
        paused={isLocked ? false : paused}
        muted={isLocked ? true : muted}
        repeat={isLocked}
        poster={poster}
        posterResizeMode="cover"
        onLoad={(meta) => {
          setDuration(meta.duration);
          if (meta.naturalSize) {
            const newAspectRatio =
              meta.naturalSize.width / meta.naturalSize.height;
            if (Math.abs(newAspectRatio - videoAspectRatio) > 0.05) {
              LayoutAnimation.configureNext(
                LayoutAnimation.Presets.easeInEaseOut,
              );
            }
            setVideoAspectRatio(newAspectRatio);
          }
          setIsVideoLoaded(true);

          if (autoPlay && !isLocked) {
            setPaused(false);
          }
        }}
        onError={(e) => {
          console.error("[VideoPlayer] Playback error:", e);
          console.error("[VideoPlayer] URI was:", uri);
        }}
        onProgress={(data) => {
          if (!seeking && !isLocked) setCurrentTime(data.currentTime);
        }}
        onEnd={() => {
          setPaused(true);
          toggleControls(true);
          videoRef.current?.seek(0);
        }}
      />

      {/* Loading Overlay */}
      {!isVideoLoaded && (
        <View style={[StyleSheet.absoluteFill, styles.loaderOverlay]}>
          <ActivityIndicator size="large" color="white" />
        </View>
      )}

      {/* Tap Area */}
      <TouchableWithoutFeedback onPress={onTapVideo}>
        <View style={styles.fullscreenTapCatcher} />
      </TouchableWithoutFeedback>

      {/* Skip Overlay */}
      {skipOverlay && (
        <View style={styles.skipOverlay}>
          <View style={styles.skipBubble}>
            <Icon
              name={skipOverlay.dir === "left" ? "undo-alt" : "redo-alt"}
              size={24}
              color="white"
            />
            <Text style={styles.skipText}>{SKIP_SECONDS}s</Text>
          </View>
        </View>
      )}

      {/* Center Icon Animation */}
      <Animated.View
        pointerEvents="none"
        style={[styles.centerIcon, { opacity: centerIconOpacity }]}
      >
        <Icon
          name={paused ? "pause" : "play"}
          size={50}
          color="rgba(255,255,255,0.8)"
          solid
        />
      </Animated.View>

      {/* Locked Premium State Overlay */}
      {isLocked && onPressGoPremium && (
        <View style={styles.lockedOverlay}>
          <Icon name="lock" size={48} color={theme.colors.text.onDark} />
          <Text style={styles.lockedText}>
            Unlock this tutorial with Premium
          </Text>
          <Button
            text="Go Premium"
            onPress={onPressGoPremium}
            style={styles.premiumButton}
          />
        </View>
      )}

      {/* Centered Play Button (when paused and controls visible) */}
      {paused && isVideoLoaded && controlsVisible && !isLocked && (
        <View pointerEvents="none" style={styles.centerPlayButton}>
          <Icon name="play-circle" size={64} color="rgba(255,255,255,0.9)" />
        </View>
      )}

      {/* Metadata Overlay (Title/Subtitle) - visible when controls are HIDDEN */}
      {(title || subtitle) && (
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
          {title && <Text style={styles.videoMetaTitleText}>{title}</Text>}
          {subtitle && <Text style={styles.videoMetaDescText}>{subtitle}</Text>}
        </Animated.View>
      )}

      {/* Controls */}
      {!isLocked && !hideControls && (
        <Animated.View
          style={[
            styles.controlsContainer,
            {
              transform: [{ translateY: controlsTranslateY }],
              opacity: controlsOpacity,
            },
          ]}
          pointerEvents={controlsVisible ? "auto" : "none"}
        >
          {/* Row 1: Progress */}
          <View style={styles.progressContainer}>
            <Slider
              style={{ flex: 1 }}
              minimumValue={0}
              maximumValue={Math.max(duration, 0.01)}
              value={seeking ? tempSeekTime : currentTime}
              minimumTrackTintColor={theme.colors.actionPrimary.default}
              maximumTrackTintColor="#aaa"
              thumbTintColor={theme.colors.actionPrimary.default}
              onSlidingStart={onSlidingStart}
              onValueChange={onSliderValueChange}
              onSlidingComplete={onSlidingComplete}
            />
            <Text style={styles.timeText}>
              {formatTime(seeking ? tempSeekTime : currentTime)} /{" "}
              {formatTime(duration)}
            </Text>
          </View>

          {/* Row 2: Buttons */}
          <View style={styles.buttonsRow}>
            {/* Restart */}
            <TouchableOpacity
              onPress={() => {
                videoRef.current?.seek(0);
                setCurrentTime(0);
                startAutoHide();
              }}
              style={styles.fixedActionButton}
            >
              <Icon name="redo-alt" size={22} color="white" />
            </TouchableOpacity>

            {/* Back 10s */}
            <TouchableOpacity
              onPress={() => handleSkipTap("left")}
              style={styles.fixedActionButton}
            >
              <Icon name="backward" size={22} color="white" />
            </TouchableOpacity>

            {/* Play/Pause */}
            <TouchableOpacity onPress={onPressPlayPause}>
              <Icon
                name={paused ? "play-circle" : "pause-circle"}
                size={52}
                color="white"
              />
            </TouchableOpacity>

            {/* Fwd 10s */}
            <TouchableOpacity
              onPress={() => handleSkipTap("right")}
              style={styles.fixedActionButton}
            >
              <Icon name="forward" size={22} color="white" />
            </TouchableOpacity>

            {/* Mute */}
            <TouchableOpacity
              onPress={() => {
                setMuted(!muted);
                startAutoHide();
              }}
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
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "black",
    borderRadius: 16,
    overflow: "hidden",
    position: "relative",
    justifyContent: "center",
    width: "100%",
    minHeight: 220, // Strict fallback until aspect ratio propagates
  },
  video: {
    width: "100%",
    height: "100%",
    position: "absolute",
    top: 0,
    left: 0,
  },
  loaderOverlay: {
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  fullscreenTapCatcher: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 5,
  },
  /* Locked Overlay */
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

  // Meta Overlay
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
    fontWeight: "600",
  },
  videoMetaDescText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.onDark,
    opacity: 0.9,
  },
  // Controls
  controlsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "rgba(0,0,0,0.45)",
    zIndex: 20,
    paddingBottom: 16,
  },
  progressContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  timeText: {
    color: "white",
    fontSize: 12,
    width: 70,
    textAlign: "right",
    fontVariant: ["tabular-nums"],
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
  skipOverlay: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    alignItems: "center",
    marginTop: -20,
    zIndex: 15,
  },
  skipBubble: {
    backgroundColor: "rgba(0,0,0,0.7)",
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  skipText: {
    color: "white",
    fontWeight: "bold",
  },
  centerIcon: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 15,
  },
  centerPlayButton: {
    position: "absolute",
    alignSelf: "center",
    zIndex: 14,
  },
});
