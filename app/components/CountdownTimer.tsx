import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet } from "react-native";
import Svg, { Circle } from "react-native-svg";

type CountdownTimerProps = {
  totalSeconds: number;
  onComplete: () => void;
};

const CountdownTimer: React.FC<CountdownTimerProps> = ({
  totalSeconds,
  onComplete,
}) => {
  const [remainingTime, setRemainingTime] = useState<number>(totalSeconds);

  useEffect(() => {
    if (remainingTime <= 0) return;

    const interval = setInterval(() => {
      setRemainingTime((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [remainingTime, onComplete]);

  const radius = 50;
  const strokeWidth = 10;
  const circumference = 2 * Math.PI * radius;
  const progress = (remainingTime / totalSeconds) * circumference;

  const formatTime = (seconds: number): string => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(minutes).padStart(2, "0")}:${String(secs).padStart(
      2,
      "0"
    )}`;
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
    fontSize: 20,
    fontWeight: "bold",
    color: "#4A4A4A",
  },
});

export default CountdownTimer;
