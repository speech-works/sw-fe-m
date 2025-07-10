import { Platform, StyleSheet } from "react-native";
import React, { useState } from "react";
import DateTimePicker from "@react-native-community/datetimepicker";

const TimeSelector = () => {
  const [selectedTime, setSelectedTime] = useState<Date>(new Date());
  const onChangeTime = (_: any, time?: Date) => {
    if (time) {
      setSelectedTime(time);
    }
  };
  return (
    <DateTimePicker
      value={selectedTime}
      mode="time"
      display={Platform.OS === "ios" ? "spinner" : "default"}
      is24Hour={true} // Ensure 24-hour format
      onChange={onChangeTime}
      style={styles.timePicker}
    />
  );
};

export default TimeSelector;

const styles = StyleSheet.create({
  timePicker: {
    width: "100%",
  },
});
