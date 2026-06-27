import Slider from "@react-native-community/slider";
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import FAIcon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";
import { AccentPicker } from "./AccentPicker";

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
  return (
    <View style={styles.controls}>
      <View style={styles.heroCard}>
        <View style={styles.heroHeader}>
          <View style={styles.heroHeaderText}>
            <Text style={styles.heroEyebrow}>Guide</Text>
            <Text style={styles.heroTitle}>Speech pacing</Text>
          </View>

          <View
            style={[
              styles.statusBadge,
              isSpeaking ? styles.statusBadgeReady : styles.statusBadgeIdle,
            ]}
          >
            <FAIcon
              name="volume-up"
              size={12}
              color={
                isSpeaking ? "#10B981" : theme.colors.actionPrimary.default
              }
            />
            <Text
              style={[
                styles.statusBadgeText,
                isSpeaking
                  ? styles.statusBadgeTextReady
                  : styles.statusBadgeTextIdle,
              ]}
            >
              {isSpeaking ? "Speaking" : "Ready"}
            </Text>
          </View>
        </View>

        <Text style={styles.heroText}>
          Set the guide voice and pause timing, then press start when you want
          the reading support to begin.
        </Text>
      </View>

      {/* Accent selection — same control here and in Settings; saved app-wide. */}
      <AccentPicker />

      <View style={styles.sliderCard}>
        <View style={styles.sliderHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Speech Rate</Text>
            <Text style={styles.sectionTitle}>{baseRate.toFixed(1)}×</Text>
          </View>

          <View style={styles.valueBadge}>
            <Text style={styles.valueBadgeText}>Flow</Text>
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
            minimumTrackTintColor={theme.colors.library.orange[400]}
            maximumTrackTintColor="#F1D9C6"
            thumbTintColor={theme.colors.library.orange[400]}
          />
        </View>

        <View style={styles.rowContainer}>
          <Text style={styles.paceText}>Slow</Text>
          <Text style={styles.paceText}>Fast</Text>
        </View>
      </View>

      <View style={styles.sliderCard}>
        <View style={styles.sliderHeader}>
          <View>
            <Text style={styles.sectionEyebrow}>Timing</Text>
            <Text style={styles.sectionTitle}>Chunk spacing</Text>
          </View>

          <View style={styles.valueBadge}>
            <Text style={styles.valueBadgeText}>Timing</Text>
          </View>
        </View>

        <View style={styles.controlGroup}>
          <View style={styles.controlSection}>
            <View style={styles.rowContainer}>
              <Text style={styles.infoText}>Pre-pause</Text>
              <Text style={styles.speedText}>{prePause} ms</Text>
            </View>
            <View style={styles.sliderWrapper}>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1000}
                step={50}
                value={prePause}
                onValueChange={setPrePause}
                minimumTrackTintColor={theme.colors.library.orange[400]}
                maximumTrackTintColor="#F1D9C6"
                thumbTintColor={theme.colors.library.orange[400]}
              />
            </View>
            <View style={styles.rowContainer}>
              <Text style={styles.paceText}>Short</Text>
              <Text style={styles.paceText}>Long</Text>
            </View>
          </View>

          <View style={styles.controlDivider} />

          <View style={styles.controlSection}>
            <View style={styles.rowContainer}>
              <Text style={styles.infoText}>Gap between chunks</Text>
              <Text style={styles.speedText}>{gapBetweenChunks} ms</Text>
            </View>
            <View style={styles.sliderWrapper}>
              <Slider
                style={styles.slider}
                minimumValue={0}
                maximumValue={1000}
                step={50}
                value={gapBetweenChunks}
                onValueChange={setGapBetweenChunks}
                minimumTrackTintColor={theme.colors.library.orange[400]}
                maximumTrackTintColor="#F1D9C6"
                thumbTintColor={theme.colors.library.orange[400]}
              />
            </View>
            <View style={styles.rowContainer}>
              <Text style={styles.paceText}>Short</Text>
              <Text style={styles.paceText}>Long</Text>
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
            <FAIcon
              name={isSpeaking ? "stop" : "play"}
              size={14}
              color="#FFF"
            />
            <Text style={styles.buttonText}>
              {isSpeaking ? "Stop Guide" : "Start Guide"}
            </Text>
          </View>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  controls: {
    marginVertical: 8,
    flexDirection: "column",
    gap: 14,
  },
  heroCard: {
    paddingHorizontal: 4,
    paddingTop: 2,
    paddingBottom: 0,
    gap: 14,
  },
  heroHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 12,
  },
  heroHeaderText: {
    flex: 1,
    gap: 2,
  },
  heroEyebrow: {
    ...parseTextStyle(theme.typography.LabelSmall),
    color: theme.colors.text.default,
    opacity: 0.62,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroTitle: {
    ...parseTextStyle(theme.typography.Heading4),
    color: theme.colors.text.title,
  },
  heroText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderWidth: 1,
  },
  statusBadgeReady: {
    backgroundColor: "rgba(16, 185, 129, 0.08)",
    borderColor: "rgba(16, 185, 129, 0.16)",
  },
  statusBadgeIdle: {
    backgroundColor: "#FFF4E6",
    borderColor: "rgba(255, 144, 64, 0.20)",
  },
  statusBadgeText: {
    ...parseTextStyle(theme.typography.LabelSmall),
    fontWeight: "600",
  },
  statusBadgeTextReady: {
    color: "#0F9F6E",
  },
  statusBadgeTextIdle: {
    color: theme.colors.actionPrimary.default,
  },
  sliderCard: {
    backgroundColor: theme.colors.surface.elevated,
    borderRadius: 24,
    paddingHorizontal: 18,
    paddingVertical: 18,
    gap: 16,
    borderWidth: 1,
    borderColor: "rgba(253, 182, 129, 0.22)",
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  sliderHeader: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  sectionEyebrow: {
    ...parseTextStyle(theme.typography.LabelSmall),
    color: theme.colors.text.default,
    opacity: 0.7,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  sectionTitle: {
    ...parseTextStyle(theme.typography.BodyHighLight),
    color: theme.colors.text.title,
  },
  valueBadge: {
    backgroundColor: "#FFF4E6",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: "rgba(255, 144, 64, 0.20)",
  },
  valueBadgeText: {
    ...parseTextStyle(theme.typography.LabelSmall),
    color: theme.colors.actionPrimary.default,
    fontWeight: "700",
  },
  controlGroup: {
    gap: 16,
  },
  controlSection: {
    width: "100%",
    gap: 10,
  },
  controlDivider: {
    height: 1,
    backgroundColor: "rgba(253, 182, 129, 0.18)",
  },
  rowContainer: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  infoText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.title,
  },
  speedText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.actionPrimary.default,
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
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
    opacity: 0.68,
  },
  buttonContainer: {
    marginTop: 2,
  },
  button: {
    minHeight: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle("0px 6px 16px 0px rgba(255, 144, 64, 0.18)"),
  },
  buttonStart: {
    backgroundColor: theme.colors.actionPrimary.default,
  },
  buttonStop: {
    backgroundColor: "#E85D4A",
  },
  buttonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  buttonText: {
    color: "#FFF",
    ...parseTextStyle(theme.typography.Button),
    fontWeight: "600",
  },
});
