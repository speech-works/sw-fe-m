import DateTimePicker from "@react-native-community/datetimepicker";
import React, { useState } from "react";
import { Platform, StyleSheet } from "react-native";
import Button from "./Button";

interface TimeSelectorProps {
  onTimeChange: (time: Date) => void;
  initialTime?: Date;
}

const TimeSelector = ({ initialTime, onTimeChange }: TimeSelectorProps) => {
  const [selectedTime, setSelectedTime] = useState<Date>(
    initialTime || new Date()
  );
  const [showPicker, setShowPicker] = useState(true);

  const onChangeTime = (event: any, time?: Date) => {
    if (Platform.OS === "android") {
      setShowPicker(false);
    }
    if (time) {
      setSelectedTime(time);
    }
  };

  return (
    <>
      {(showPicker || Platform.OS === "ios") && (
        <DateTimePicker
          value={selectedTime}
          mode="time"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          is24Hour={true} // Ensure 24-hour format
          onChange={onChangeTime}
          style={styles.timePicker}
        />
      )}
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
