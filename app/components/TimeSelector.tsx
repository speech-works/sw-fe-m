import { Platform, StyleSheet } from "react-native";
import React, { useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";
import Button from "./Button";

interface TimeSelectorProps {
  onTimeChange: (time: Date) => void;
  initialTime?: Date;
}

const TimeSelector = ({ initialTime, onTimeChange }: TimeSelectorProps) => {
  const [selectedTime, setSelectedTime] = useState<Date>(
    initialTime || new Date()
  );
  const onChangeTime = (_: any, time?: Date) => {
    if (time) {
      setSelectedTime(time);
    }
  };

  return (
    <>
      <DateTimePicker
        value={selectedTime}
        mode="time"
        display={Platform.OS === "ios" ? "spinner" : "default"}
        is24Hour={true} // Ensure 24-hour format
        onChange={onChangeTime}
        style={styles.timePicker}
      />
      <Button
        text="Done"
        onPress={() => {
          onTimeChange(selectedTime);
        }}
      />
    </>
  );
};

export default TimeSelector;

const styles = StyleSheet.create({
  timePicker: {
    width: "100%",
  },
});
