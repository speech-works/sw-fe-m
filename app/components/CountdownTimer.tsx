import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";
import { getSecondsUntilMidnight } from "../util/functions/time";

// Full day in seconds (24 * 60 * 60)
const FULL_DAY_SECONDS = 86400;

type CountdownTimerProps = {
  totalSeconds?: number; // Optional; if not provided, use full day seconds
  onComplete?: () => void;
  autoStart?: boolean;
  countdownFrom?: number; // Optional; if provided, use this as the starting value
};

const CountdownTimer: React.FC<CountdownTimerProps> = ({
  totalSeconds,
  onComplete,
  autoStart = true,
  countdownFrom,
}) => {
  // Determine the initial value:
  const initialValue =
    countdownFrom !== undefined ? countdownFrom : getSecondsUntilMidnight();
  const [remainingTime, setRemainingTime] = useState<number>(initialValue);

  useEffect(() => {
    if (!autoStart) return;

    const interval = setInterval(() => {
      // When countdownFrom is provided, decrement; otherwise recalc until midnight
      if (countdownFrom !== undefined) {
        setRemainingTime((prev) => {
          if (prev <= 1) {
            clearInterval(interval);
            onComplete && onComplete();
            return 0;
          }
          return prev - 1;
        });
      } else {
        const secondsLeft = getSecondsUntilMidnight();
        if (secondsLeft <= 0) {
          clearInterval(interval);
          onComplete && onComplete();
          setRemainingTime(0);
        } else {
          setRemainingTime(secondsLeft);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [autoStart, onComplete, countdownFrom]);

  const baseTotalSeconds = totalSeconds ?? FULL_DAY_SECONDS;
  const radius = 50;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const progress = (remainingTime / baseTotalSeconds) * circumference;

  const formatTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return hours > 0
      ? `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
          2,
          "0"
        )}:${String(secs).padStart(2, "0")}`
      : `${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
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
