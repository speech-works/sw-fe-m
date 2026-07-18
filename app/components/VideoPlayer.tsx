import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    ActivityIndicator,
    Animated,
    Dimensions,
    Easing,
    Image,
    LayoutAnimation,
    Modal,
    Platform,
    StatusBar,
    StyleProp,
    StyleSheet,
    Text,
    TouchableOpacity,
    TouchableWithoutFeedback,
    UIManager,
    View,
    ViewStyle,
} from "react-native";
import { ForceDark } from "../design-system";

if (
  Platform.OS === "android" &&
  UIManager.setLayoutAnimationEnabledExperimental
) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

import Slider from "@react-native-community/slider";

import { useFocusEffect, useIsFocused } from "@react-navigation/native";
import { BlurView } from "expo-blur";
import { LinearGradient } from "expo-linear-gradient";
import Icon from "react-native-vector-icons/FontAwesome5";
import Video, { VideoRef } from "react-native-video";
import { typography, useTheme } from "../design-system";
import { useRegisterNativeModal } from "../stores/nativeModal";
import Button from "./Button";
import SkeletonLoader from "./SkeletonLoader";

const iconHitSlop = { top: 12, bottom: 12, left: 12, right: 12 };

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
  const isFocused = useIsFocused();
  const { colors } = useTheme();
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
  const [playbackRate, setPlaybackRate] = useState(1.0);
  const [isFullScreen, setIsFullScreen] = useState(false);
  // The fullscreen player is a native <Modal>; register it so exclusive modals defer.
  useRegisterNativeModal(isFullScreen);
  const [volume, setVolume] = useState(1.0);
  const controlsVisibleRef = useRef(false);
  const [controlsVisible, setControlsVisible] = useState(false);

  // Animations
  const controlsAnim = useRef(new Animated.Value(0)).current;
  const centerIconOpacity = useRef(new Animated.Value(0)).current;
  const centerIconScale = useRef(new Animated.Value(0.8)).current;
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
  const isRestoringRef = useRef(false);
  const lastSetVolumeRef = useRef<number>(-1);
  const lastFullScreenToggleAt = useRef<number>(0);
  const volumeBeforeToggle = useRef<number>(1.0);
  const lastVolumeBeforeMute = useRef<number>(1.0);

  // Defensive check for VolumeManager presence
  const hasVolumeManager = useRef<boolean | null>(null);

  const checkVolumeManager = () => {
    if (hasVolumeManager.current !== null) return hasVolumeManager.current;
    try {
      // Check if the native module is actually present in NativeModules
      const { NativeModules } = require('react-native');
      const isAvailable = !!(NativeModules.VolumeManager || NativeModules.RNVolumeManager);
      hasVolumeManager.current = isAvailable;
      return isAvailable;
    } catch (e) {
      hasVolumeManager.current = false;
      return false;
    }
  };

  const getVolumeManager = () => {
    if (!checkVolumeManager()) return null;
    try {
      return require("react-native-volume-manager").VolumeManager;
    } catch (e) {
      return null;
    }
  };

  // Safe VolumeManager wrappers
  const safeGetVolume = async () => {
    try {
      const VM = getVolumeManager();
      if (!VM) return 1.0;
      const res = await VM.getVolume();
      return typeof res === 'number' ? res : res.volume;
    } catch (e) {
      return 1.0;
    }
  };

  const safeSetVolume = (val: number) => {
    try {
      const VM = getVolumeManager();
      if (VM && typeof VM.setVolume === 'function') {
        VM.setVolume(val);
      }
    } catch (e) {
      // ignore
    }
  };

  const volumeListenerRef = useRef<any>(null);

  // Sync System Volume
  useEffect(() => {
    safeGetVolume().then((v) => {
      setVolume(v);
      if (v === 0) {
        setMuted(true);
      } else {
        setMuted(false);
        lastVolumeBeforeMute.current = v;
      }
    });

    try {
      const VM = getVolumeManager();
      if (VM && typeof VM.addVolumeListener === 'function') {
        volumeListenerRef.current = VM.addVolumeListener((res: any) => {
          const newVol = typeof res === 'number' ? res : res.volume;
          
          // If the change is coming from our own manual slider change, ignore it to avoid feedback jitter
          if (lastSetVolumeRef.current !== -1 && Math.abs(newVol - lastSetVolumeRef.current) < 0.05) {
            return;
          }

          // TRANSITION PROTECTION: Ignore momentary 0 volume during full-screen transitions
          const now = Date.now();
          if (newVol === 0 && now - lastFullScreenToggleAt.current < 1000 && volumeBeforeToggle.current > 0) {
            console.log("[VideoPlayer] Ignoring momentary mute during transition");
            return;
          }
          
          // Clear the ref once we've seen an external change or enough time has passed
          lastSetVolumeRef.current = -1;
          
          setVolume(newVol);
          if (newVol > 0) {
            setMuted(false);
            lastVolumeBeforeMute.current = newVol;
          } else {
            setMuted(true);
          }
        });
      }
    } catch (e) {
      // ignore
    }

    return () => {
      if (volumeListenerRef.current && typeof volumeListenerRef.current.remove === 'function') {
        volumeListenerRef.current.remove();
      }
      clearAutoHide();
      if (skipOverlayTimeout.current) clearTimeout(skipOverlayTimeout.current);
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      return () => {
        setPaused(true);
        setIsFullScreen(false);
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
    centerIconScale.setValue(0.8);
    Animated.parallel([
      Animated.timing(centerIconOpacity, {
        toValue: 0,
        duration: 800,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.spring(centerIconScale, {
        toValue: 1.2,
        friction: 4,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();
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

  const cyclePlaybackRate = () => {
    const rates = [1.0, 1.5, 2.0, 0.5];
    const nextIdx = (rates.indexOf(playbackRate) + 1) % rates.length;
    setPlaybackRate(rates[nextIdx]);
    startAutoHide();
  };

  const toggleFullScreen = () => {
    lastFullScreenToggleAt.current = Date.now();
    volumeBeforeToggle.current = volume;
    setIsFullScreen((prev) => !prev);
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
          backgroundColor: colors.background.canvas,
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

  const renderPlayer = () => (
    <View
      style={[
        styles.container,
        { height: isFullScreen ? "100%" : computedHeight },
        isFullScreen ? styles.fullScreenContainer : style,
      ]}
      onLayout={onContainerLayout}
    >
      <Video
        ref={videoRef}
        source={{
          uri: uri || "",
          type: uri?.includes(".m3u8") ? "m3u8" : undefined,
        }}
        style={[styles.video, { opacity: isVideoLoaded ? 1 : 0 }]}
        resizeMode={isFullScreen ? "contain" : "cover"}
        paused={!isFocused ? true : paused}
        rate={playbackRate}
        volume={muted || isLocked ? 0 : 1.0}
        muted={isLocked ? true : muted}
        repeat={isLocked}
        ignoreSilentSwitch="ignore"
        playInBackground={false}
        poster={poster}
        posterResizeMode="cover"
        progressUpdateInterval={100}
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

          // Restore playback position after remount (fullscreen toggle)
          if (currentTime > 0) {
            isRestoringRef.current = true;
            setIsVideoLoaded(false); 
            videoRef.current?.seek(currentTime);
          } else {
            setIsVideoLoaded(true);
          }

          if (autoPlay && !isLocked) {
            setPaused(false);
          }

          // Force-sync volume after video loads.
          // Nudge volume prop locally to fix react-native-video's initialization bug
          // without ever mutating the user's hardware system volume!
          setVolume((prev) => {
            const nudged = prev > 0.5 ? prev - 0.001 : prev + 0.001;
            requestAnimationFrame(() => setVolume(prev));
            return nudged;
          });
        }}
        onSeek={() => {
          if (isRestoringRef.current) {
            isRestoringRef.current = false;
            setIsVideoLoaded(true);
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

      {/* Center Icon Animation - Pulse Effect */}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.centerIcon, 
          { 
            opacity: centerIconOpacity,
            transform: [{ scale: centerIconScale }]
          }
        ]}
      >
        <Icon
          name={paused ? "play" : "pause"}
          size={60}
          color="rgba(255,255,255,0.9)"
          solid
        />
      </Animated.View>

      {/* Locked Premium State Overlay */}
      {isLocked && onPressGoPremium && (
        <View style={styles.lockedOverlay}>
          <Icon name="lock" size={48} color={colors.text.primary} />
          <Text style={[styles.lockedText, { color: colors.text.primary }]}>
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

      {/* Metadata Overlay (Title/Subtitle) - Top Cinematic Gradient */}
      {(title || subtitle) && (
        <Animated.View
          style={[
            styles.videoMeta,
            {
              transform: [{ translateY: metaTranslateY }],
              opacity: metaOpacity,
            },
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={["rgba(0,0,0,0.7)", "rgba(0,0,0,0)"]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.metaTextContent}>
            {title && <Text style={[styles.videoMetaTitleText, { color: colors.text.primary }]}>{title}</Text>}
            {subtitle && <Text style={[styles.videoMetaDescText, { color: colors.text.primary }]}>{subtitle}</Text>}
          </View>
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
            isFullScreen && styles.controlsContainerFullScreen,
          ]}
          pointerEvents={controlsVisible ? "auto" : "none"}
        >
          <LinearGradient
            colors={["rgba(0,0,0,0)", "rgba(0,0,0,0.7)"]}
            style={StyleSheet.absoluteFill}
          />
          <BlurView intensity={Platform.OS === 'ios' ? 40 : 80} tint="dark" style={StyleSheet.absoluteFill} />
          
          <View style={styles.controlsContent}>
            {/* Row 1: Progress */}
            <View style={styles.progressContainer}>
              <Slider
                style={{ flex: 1 }}
                minimumValue={0}
                maximumValue={Math.max(duration, 0.01)}
                value={seeking ? tempSeekTime : currentTime}
                minimumTrackTintColor={colors.action.primary}
                maximumTrackTintColor="rgba(255,255,255,0.2)"
                thumbTintColor={colors.action.primary}
                onSlidingStart={onSlidingStart}
                onValueChange={onSliderValueChange}
                onSlidingComplete={onSlidingComplete}
                accessibilityLabel="Video progress slider"
                accessibilityRole="adjustable"
              />
              <Text style={styles.timeText}>
                {formatTime(seeking ? tempSeekTime : currentTime)} /{" "}
                {formatTime(duration)}
              </Text>
            </View>

            {/* Row 2: Volume Bar (Separated for spacing) */}
            <View style={styles.volumeRowContainer}>
               <TouchableOpacity
                  onPress={() => {
                    if (muted) {
                      // Unmuting: restore last volume
                      const restoreVol = lastVolumeBeforeMute.current || 0.5;
                      setMuted(false);
                      setVolume(restoreVol);
                      safeSetVolume(restoreVol);
                    } else {
                      // Muting: save current volume and set to 0
                      lastVolumeBeforeMute.current = volume;
                      setMuted(true);
                      setVolume(0);
                      safeSetVolume(0);
                    }
                    startAutoHide();
                  }}
                  hitSlop={iconHitSlop}
                  style={styles.volumeIconContainer}
                >
                  <Icon
                    name={muted || volume === 0 ? "volume-mute" : "volume-up"}
                    size={12}
                    color="white"
                  />
                </TouchableOpacity>
                <Slider
                   style={styles.horizontalVolumeSlider}
                   minimumValue={0}
                   maximumValue={1}
                   value={muted ? 0 : volume}
                    onValueChange={(val: number) => {
                      lastSetVolumeRef.current = val;
                      setVolume(val);
                      safeSetVolume(val);
                      if (val === 0) {
                        setMuted(true);
                      } else {
                        setMuted(false);
                        lastVolumeBeforeMute.current = val;
                      }
                      startAutoHide();
                    }}
                   minimumTrackTintColor={colors.action.primary}
                   maximumTrackTintColor="rgba(255,255,255,0.2)"
                   thumbTintColor="white"
                />
            </View>

            {/* Row 3: Buttons */}
            <View style={styles.buttonsRow}>
              <View style={styles.bottomLeftControls}>
                {/* Rate Toggle */}
                <TouchableOpacity
                  onPress={cyclePlaybackRate}
                  style={styles.rateButton}
                  hitSlop={iconHitSlop}
                  accessibilityLabel={`Playback speed ${playbackRate}x`}
                  accessibilityRole="button"
                >
                  <BlurView intensity={20} tint="light" style={StyleSheet.absoluteFill} />
                  <Text style={styles.rateText}>{playbackRate}x</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.centerControls}>
                {/* Back 10s */}
                <TouchableOpacity
                  onPress={() => handleSkipTap("left")}
                  style={styles.fixedActionButton}
                  hitSlop={iconHitSlop}
                  accessibilityLabel="Skip backward 10 seconds"
                  accessibilityRole="button"
                >
                  <Icon name="backward" size={20} color="white" />
                </TouchableOpacity>

                {/* Play/Pause */}
                <TouchableOpacity 
                  onPress={onPressPlayPause}
                  hitSlop={iconHitSlop}
                  accessibilityLabel={paused ? "Play video" : "Pause video"}
                  accessibilityRole="button"
                >
                  <Icon
                    name={paused ? "play-circle" : "pause-circle"}
                    size={54}
                    color="white"
                  />
                </TouchableOpacity>

                {/* Fwd 10s */}
                <TouchableOpacity
                  onPress={() => handleSkipTap("right")}
                  style={styles.fixedActionButton}
                  hitSlop={iconHitSlop}
                  accessibilityLabel="Skip forward 10 seconds"
                  accessibilityRole="button"
                >
                  <Icon name="forward" size={20} color="white" />
                </TouchableOpacity>
              </View>

              <View style={styles.bottomRightControls}>
                {/* FullScreen Toggle */}
                <TouchableOpacity
                  onPress={toggleFullScreen}
                  style={styles.rightSideIcon}
                  hitSlop={iconHitSlop}
                  accessibilityLabel={isFullScreen ? "Exit full screen" : "Enter full screen"}
                  accessibilityRole="button"
                >
                  <Icon
                    name={isFullScreen ? "compress" : "expand"}
                    size={18}
                    color="white"
                  />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Animated.View>
      )}

      {/* No more vertical volume bar */}
    </View>
  );

  return (
    <>
      <StatusBar hidden={isFullScreen} />
      {isFullScreen ? (
        <Modal
          visible={true}
          transparent={false}
          animationType="fade"
          supportedOrientations={[
            "portrait",
            "landscape",
            "landscape-left",
            "landscape-right",
          ]}
          onRequestClose={toggleFullScreen}
        >
          {/* Scheme-locked dark — fullscreen video is a dark surface by design. */}
          <ForceDark>{renderPlayer()}</ForceDark>
        </Modal>
      ) : (
        renderPlayer()
      )}
    </>
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
  fullScreenContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    width: Dimensions.get("window").width,
    height: Dimensions.get("window").height,
    zIndex: 1000,
    borderRadius: 0,
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
    ...typography.body,
    marginTop: 8,
    marginBottom: 8,
  },
  premiumButton: {
    minWidth: 150,
  },

   // Meta Overlay
  videoMeta: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 80,
    zIndex: 50,
  },
  metaTextContent: {
    padding: 16,
  },
  videoMetaLocked: {
    backgroundColor: "rgba(0,0,0,0.25)",
  },
  videoMetaTitleText: {
    ...typography.title,
  },
  videoMetaDescText: {
    ...typography.bodySm,
    opacity: 0.9,
  },
  // Controls
  controlsContainer: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 20,
    overflow: 'hidden',
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
  },
  controlsContent: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    paddingBottom: Platform.OS === "ios" ? 24 : 16,
  },
  controlsContainerFullScreen: {
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
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
    justifyContent: "space-between",
    marginTop: 4,
  },
  bottomLeftControls: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  centerControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 28,
    flex: 1.5,
  },
  bottomRightControls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 12,
    flex: 1,
  },
  volumeRowContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginVertical: 4,
    paddingHorizontal: 8,
  },
  volumeIconContainer: {
    width: 24,
    height: 24,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.1)",
    borderRadius: 12,
  },
  horizontalVolumeSlider: {
    flex: 1,
    height: 30,
  },
  rateButton: {
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    minWidth: 46,
    alignItems: "center",
  },
  rateText: {
    color: "white",
    fontSize: 11,
    fontWeight: "800",
  },
  rightSideIcon: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  fullScreenButton: {
    padding: 10,
  },
  fixedActionButton: {
    width: 44,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  /* ── Vertical Volume ── */
  volumeBarOuter: {
    position: "absolute",
    right: 10,
    top: "15%",
    width: 28,
    height: 170,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 10,
    gap: 4,
    zIndex: 30,
  },
  volumeSliderWrapper: {
    width: 28,
    height: 130,
    alignItems: "center",
    justifyContent: "center",
  },
  volumeSlider: {
    width: 130,
    height: 28,
    transform: [{ rotate: "-90deg" }],
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
