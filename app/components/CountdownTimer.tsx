// CountdownTimer.tsx
import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { getSecondsUntilMidnight } from "../util/functions/time";

// Full day in seconds (24 * 60 * 60)
const FULL_DAY_SECONDS = 86400;

type CountdownTimerProps = {
  totalSeconds?: number; // Optional; if not provided, we use the full day constant
  onComplete: () => void;
};

const CountdownTimer: React.FC<CountdownTimerProps> = ({
  totalSeconds,
  onComplete,
}) => {
  // Use the provided totalSeconds or default to FULL_DAY_SECONDS
  const baseTotalSeconds = totalSeconds ?? FULL_DAY_SECONDS;
  const [remainingTime, setRemainingTime] = useState<number>(
    getSecondsUntilMidnight()
  );

  useEffect(() => {
    const interval = setInterval(() => {
      const secondsLeft = getSecondsUntilMidnight();
      if (secondsLeft <= 0) {
        clearInterval(interval);
        onComplete();
        setRemainingTime(0);
      } else {
        setRemainingTime(secondsLeft);
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [onComplete]);

  const radius = 50;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  // Calculate progress based on the full day constant
  const progress = (remainingTime / baseTotalSeconds) * circumference;

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    // If there are hours, format as HH:MM:SS; otherwise MM:SS
    if (hours > 0) {
      return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
        2,
        "0"
      )}:${String(secs).padStart(2, "0")}`;
    } else {
      return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(
        2,
        "0"
      )}`;
    }
  };

  return (
    <View style={styles.container}>
      <Svg width={120} height={120} viewBox="0 0 120 120">
        <Circle
          cx="60"
          cy="60"
          r={radius}
          stroke="#DFF6E6"
          strokeWidth={strokeWidth}
          fill="none"
        />
        <Circle
          cx="60"
          cy="60"
          r={radius}
          stroke="#A8E6CF"
          strokeWidth={strokeWidth}
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - progress}
          strokeLinecap="round"
        />
      </Svg>
      <Text style={styles.timerText}>{formatTime(remainingTime)}</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  timerText: {
    position: "absolute",
    fontSize: 17,
    fontWeight: "bold",
    color: "#4A4A4A",
    fontFamily: "Courier",
  },
});

export default CountdownTimer;
