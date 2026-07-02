import Slider from "@react-native-community/slider";
import React from "react";
import { TouchableOpacity, View } from "react-native";
import {
  borderWidth,
  Icon,
  icons,
  makeStyles,
  radius,
  space,
  spacing,
  Text,
  useTheme,
} from "../../../../design-system";

interface VoiceHoverConfigProps {
  baseRate: number;
  setBaseRate: (val: number) => void;
  prePause: number;
  setPrePause: (val: number) => void;
  gapBetweenChunks: number;
  setGapBetweenChunks: (val: number) => void;
  isSpeaking: boolean;
  onToggleSpeech: () => void;
}

export function VoiceHoverConfigPanel({
  baseRate,
  setBaseRate,
  prePause,
  setPrePause,
  gapBetweenChunks,
  setGapBetweenChunks,
  isSpeaking,
  onToggleSpeech,
}: VoiceHoverConfigProps) {
  const { colors } = useTheme();
  const styles = useStyles();
  return (
    <View style={styles.controls}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroHeaderText}>
            <Text variant="label" style={styles.heroEyebrow}>
              Guide
            </Text>
            <Text variant="h3" style={styles.heroTitle}>
              Speech pacing
            </Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              isSpeaking ? styles.statusBadgeReady : styles.statusBadgeIdle,
            ]}
          >
            <Icon
              name={icons.volume}
              size={12}
              color={
                isSpeaking
                  ? colors.feedback.successText
                  : colors.action.primary
              }
            />
            <Text
              style={[
                styles.statusBadgeText,
                isSpeaking
                  ? styles.statusBadgeTextReady
                  : styles.statusBadgeTextIdle,
              ]}
              variant="label"
            >
              {isSpeaking ? "Speaking" : "Ready"}
            </Text>
          </View>
        </View>

        <View style={styles.heroTextGroup}>
          <Text variant="bodySm" style={styles.heroText}>
            Set the pace and pause timing, then press start when you want the
            reading support to begin.
          </Text>
          {/* The accent lives in one place (Settings) so it can't drift between
              the sheet and Preferences; point the user there to change it. */}
          <Text variant="caption" color="tertiary">
            Voice accent is chosen in Settings › Reading voice.
          </Text>
        </View>
      </View>

      <View style={styles.sliderCard}>
        <View style={styles.sliderHeader}>
          <View>
            <Text variant="label" style={styles.sectionEyebrow}>
              Speech Rate
            </Text>
            <Text variant="title" style={styles.sectionTitle}>
              {baseRate.toFixed(1)}×
            </Text>
          </View>

          <View style={styles.valueBadge}>
            <Text variant="label" style={styles.valueBadgeText}>
              Flow
            </Text>
          </View>
        </View>

        <View style={styles.sliderWrapper}>
          <Slider
            style={styles.slider}
            minimumValue={0.5}
            maximumValue={2.0}
            step={0.1}
            value={baseRate}
            onValueChange={setBaseRate}
            minimumTrackTintColor={colors.action.primary}
            maximumTrackTintColor={colors.border.default}
            thumbTintColor={colors.action.primary}
          />
        </View>

        <View style={styles.rowContainer}>
          <Text variant="caption" style={styles.paceText}>Slow</Text>
          <Text variant="caption" style={styles.paceText}>Fast</Text>
        </View>
      </View>

      <View style={styles.sliderCard}>
        <View style={styles.sliderHeader}>
          <View>
            <Text variant="label" style={styles.sectionEyebrow}>
              Timing
            </Text>
            <Text variant="title" style={styles.sectionTitle}>
              Chunk spacing
            </Text>
          </View>

          <View style={styles.valueBadge}>
            <Text variant="label" style={styles.valueBadgeText}>
              Timing
            </Text>
          </View>
        </View>

        <View style={styles.controlGroup}>
          <View style={styles.controlSection}>
            <View style={styles.rowContainer}>
              <Text variant="bodySm" style={styles.infoText}>
                Pre-pause
              </Text>
              <Text variant="bodySm" style={styles.speedText}>
                {prePause} ms
              </Text>
            </View>
            <View style={styles.sliderWrapper}>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1000}
                step={50}
                value={prePause}
                onValueChange={setPrePause}
                minimumTrackTintColor={colors.action.primary}
                maximumTrackTintColor={colors.border.default}
                thumbTintColor={colors.action.primary}
              />
            </View>
            <View style={styles.rowContainer}>
              <Text variant="caption" style={styles.paceText}>Short</Text>
              <Text variant="caption" style={styles.paceText}>Long</Text>
            </View>
          </View>

          <View style={styles.controlDivider} />

          <View style={styles.controlSection}>
            <View style={styles.rowContainer}>
              <Text variant="bodySm" style={styles.infoText}>
                Gap between chunks
              </Text>
              <Text variant="bodySm" style={styles.speedText}>
                {gapBetweenChunks} ms
              </Text>
            </View>
            <View style={styles.sliderWrapper}>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1000}
                step={50}
                value={gapBetweenChunks}
                onValueChange={setGapBetweenChunks}
                minimumTrackTintColor={colors.action.primary}
                maximumTrackTintColor={colors.border.default}
                thumbTintColor={colors.action.primary}
              />
            </View>
            <View style={styles.rowContainer}>
              <Text variant="caption" style={styles.paceText}>Short</Text>
              <Text variant="caption" style={styles.paceText}>Long</Text>
            </View>
          </View>
        </View>
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          onPress={onToggleSpeech}
          activeOpacity={0.85}
          style={[
            styles.button,
            isSpeaking ? styles.buttonStop : styles.buttonStart,
          ]}
        >
          <View style={styles.buttonContent}>
            <Icon
              name={isSpeaking ? icons.stop : icons.play}
              size={14}
              color={colors.action.onPrimary}
            />
            <Text variant="title" style={styles.buttonText}>
              {isSpeaking ? "Stop Guide" : "Start Guide"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const useStyles = makeStyles((colors) => ({
  controls: {
    marginVertical: spacing.sm,
    flexDirection: "column",
    gap: 14,
  },
  heroCard: {
    paddingHorizontal: spacing.xs,
    paddingTop: spacing.xxs,
    paddingBottom: 0,
    gap: 14,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: space.rowGap,
  },
  heroHeaderText: {
    flex: 1,
    gap: spacing.xxs,
  },
  heroEyebrow: {
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: {
    color: colors.text.primary,
  },
  heroTextGroup: {
    gap: 4,
  },
  heroText: {
    color: colors.text.secondary,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xxs,
    borderRadius: radius.full,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xxs,
    borderWidth: borderWidth.thin,
  },
  statusBadgeReady: {
    backgroundColor: colors.accentTint.success,
    borderColor: colors.accent.success,
  },
  statusBadgeIdle: {
    backgroundColor: colors.action.primaryTint,
    borderColor: colors.border.default,
  },
  statusBadgeText: {
    fontWeight: "600",
  },
  statusBadgeTextReady: {
    color: colors.feedback.successText,
  },
  statusBadgeTextIdle: {
    color: colors.action.primary,
  },
  sliderCard: {
    backgroundColor: colors.surface.elevated,
    borderRadius: radius.card,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: spacing.lg,
    borderWidth: borderWidth.thin,
    borderColor: colors.border.default,
  },
  sliderHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionEyebrow: {
    color: colors.text.secondary,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionTitle: {
    color: colors.text.primary,
  },
  valueBadge: {
    backgroundColor: colors.action.primaryTint,
    borderRadius: radius.full,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xxs,
    borderWidth: borderWidth.thin,
    borderColor: colors.border.default,
  },
  valueBadgeText: {
    color: colors.action.primary,
    fontWeight: "700",
  },
  controlGroup: {
    gap: spacing.lg,
  },
  controlSection: {
    width: "100%",
    gap: spacing.xs,
  },
  controlDivider: {
    height: 1,
    backgroundColor: colors.border.default,
  },
  rowContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoText: {
    color: colors.text.primary,
  },
  speedText: {
    color: colors.action.primary,
    fontWeight: "700",
  },
  sliderWrapper: {
    width: "100%",
    justifyContent: "center",
    overflow: "visible",
  },
  slider: {
    width: "100%",
    height: 22,
  },
  paceText: {
    color: colors.text.tertiary,
  },
  buttonContainer: {
    marginTop: spacing.xxs,
  },
  button: {
    minHeight: 52,
    borderRadius: radius.input,
    alignItems: "center",
    justifyContent: "center",
  },
  buttonStart: {
    backgroundColor: colors.action.primary,
  },
  buttonStop: {
    backgroundColor: colors.accent.danger,
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  buttonText: {
    color: colors.action.onPrimary,
    fontWeight: "600",
  },
}));
