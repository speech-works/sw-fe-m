import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { theme } from "../../../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";
import StarRating from "../../../../../components/StarRating";

const CompletedList = () => {
  return (
    <View style={styles.container}>
      {["Sunshine", "Morning"].map((w) => (
        <View style={styles.row}>
          <View style={styles.word}>
            <View style={styles.circle}>
              <Icon
                name="check"
                color={theme.colors.library.orange[400]}
                size={16}
              />
            </View>
            <Text style={styles.wordText}>{w}</Text>
          </View>
          <StarRating sizeOfEachStar={16} howManyStarsFilled={2} interactive />
        </View>
      ))}
    </View>
  );
};

export default CompletedList;

const styles = StyleSheet.create({
  container: {
    width: "100%",
    gap: 12,
  },
  row: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 12,
    backgroundColor: theme.colors.background.default,
  },
  word: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  wordText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  circle: {
    height: 32,
    width: 32,
    borderRadius: "50%",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: theme.colors.library.orange[200],
  },
});
