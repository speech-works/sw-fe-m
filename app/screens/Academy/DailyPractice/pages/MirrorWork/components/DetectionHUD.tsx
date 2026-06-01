import React from 'react';
import { View, Text, StyleSheet, Platform } from 'react-native';
import type { ChannelDebug } from '../util/mirrorBehaviorAnalyzerV2';

interface DetectionHUDProps {
  debug?: {
    channels: ChannelDebug[];
    headPose?: { yaw: number; pitch: number; roll: number };
    deviceAngularSpeed?: number;
    fps: number;
    framesAnalyzed: number;
  };
}

// Suppress head-jerk above this device speed (mirror of analyzer DEVICE_MOTION_GATE).
const DEVICE_MOTION_GATE = 40;

// Bar scales raw/ema [0..MAX] across the track width.
const MAX_SCALE = 0.9;

const mono = Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' });

/**
 * Developer HUD overlay (spec §6.1). Shows live blendshape values vs thresholds
 * so a missed detection becomes diagnosable at a glance ("mouthPucker peaked at
 * 0.42 but T was 0.61"). Toggle from SessionScreen (dev builds only).
 */
export const DetectionHUD: React.FC<DetectionHUDProps> = ({ debug }) => {
  if (!debug) return null;

  const { channels, headPose, deviceAngularSpeed, fps, framesAnalyzed } = debug;

  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={styles.headerRow}>
        <Text style={styles.title}>DETECTION HUD</Text>
        <Text style={[styles.fps, fps < 4 && styles.fpsLow]}>{fps.toFixed(1)} fps</Text>
      </View>
      <Text style={styles.sub}>frames analyzed: {framesAnalyzed}</Text>

      {headPose && (
        <Text style={styles.pose}>
          yaw {headPose.yaw.toFixed(0)}°  pitch {headPose.pitch.toFixed(0)}°  roll {headPose.roll.toFixed(0)}°
        </Text>
      )}
      {deviceAngularSpeed !== undefined && (
        <Text style={[styles.pose, deviceAngularSpeed > DEVICE_MOTION_GATE && styles.devMoving]}>
          dev {deviceAngularSpeed.toFixed(0)}°/s {deviceAngularSpeed > DEVICE_MOTION_GATE ? '(gating)' : ''}
        </Text>
      )}

      <View style={styles.divider} />

      {channels.map((c) => {
        const max = c.scaleMax ?? MAX_SCALE;
        const rawPct = Math.min(1, c.raw / max) * 100;
        const emaPct = Math.min(1, c.ema / max) * 100;
        const threshPct = Math.min(1, c.threshold / max) * 100;
        return (
          <View key={c.key} style={styles.row}>
            <Text style={[styles.label, c.firing && styles.labelFiring]} numberOfLines={1}>
              {c.firing ? '●' : ' '} {c.key}
            </Text>
            <View style={styles.track}>
              {/* raw value (faint) */}
              <View style={[styles.rawFill, { width: `${rawPct}%` }]} />
              {/* ema value (solid, the value detection uses) */}
              <View
                style={[
                  styles.emaFill,
                  { width: `${emaPct}%` },
                  c.firing && styles.emaFillFiring,
                ]}
              />
              {/* threshold marker */}
              <View style={[styles.threshMark, { left: `${threshPct}%` }]} />
            </View>
            <Text style={styles.valText}>{c.ema.toFixed(2)}</Text>
            <Text style={styles.threshText}>/{c.threshold.toFixed(2)}</Text>
          </View>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 56 : 40,
    left: 8,
    width: 270,
    backgroundColor: 'rgba(0,0,0,0.74)',
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 8,
    zIndex: 200,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  title: {
    color: '#22D3EE',
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    fontFamily: mono,
  },
  fps: {
    color: '#34D399',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: mono,
  },
  fpsLow: {
    color: '#F87171',
  },
  sub: {
    color: 'rgba(255,255,255,0.45)',
    fontSize: 9,
    fontFamily: mono,
    marginTop: 1,
  },
  pose: {
    color: '#A78BFA',
    fontSize: 9.5,
    fontFamily: mono,
    marginTop: 3,
  },
  devMoving: {
    color: '#F87171',
    fontWeight: '700',
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.18)',
    marginVertical: 5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 1.5,
  },
  label: {
    width: 78,
    color: 'rgba(255,255,255,0.6)',
    fontSize: 8.5,
    fontFamily: mono,
  },
  labelFiring: {
    color: '#34D399',
    fontWeight: '700',
  },
  track: {
    flex: 1,
    height: 9,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 2,
    overflow: 'hidden',
    marginHorizontal: 4,
    justifyContent: 'center',
  },
  rawFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(34, 211, 238, 0.22)',
  },
  emaFill: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: 'rgba(34, 211, 238, 0.55)',
  },
  emaFillFiring: {
    backgroundColor: 'rgba(52, 211, 153, 0.8)',
  },
  threshMark: {
    position: 'absolute',
    top: -1,
    bottom: -1,
    width: 1.5,
    backgroundColor: '#FBBF24',
  },
  valText: {
    width: 30,
    textAlign: 'right',
    color: '#FFFFFF',
    fontSize: 8.5,
    fontFamily: mono,
  },
  threshText: {
    width: 32,
    color: 'rgba(251, 191, 36, 0.8)',
    fontSize: 8.5,
    fontFamily: mono,
  },
});
