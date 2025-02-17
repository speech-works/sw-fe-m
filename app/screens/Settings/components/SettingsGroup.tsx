import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import { parseTextStyle } from "../../../util/functions/parseFont";
import { theme } from "../../../Theme/tokens";
import Icon from "react-native-vector-icons/MaterialIcons";

interface SettingsGroupProps {
  title: string;
  items: {
    title: string;
    icon: string;
    color?: string;
    callback: () => void;
  }[];
}

const SettingsGroup = ({ title, items }: SettingsGroupProps) => {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.titleText}>{title}</Text>
      {items.map((item) => (
        <TouchableOpacity
          key={item.title}
          style={styles.itemWrapper}
          onPress={item.callback}
        >
          <Icon
            name={item.icon}
            size={16}
            color={item.color || theme.colors.neutral[3]}
          />
          <Text
            style={[
              styles.itemText,
              {
                color: item.color,
              },
            ]}
          >
            {item.title}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

export default SettingsGroup;

const styles = StyleSheet.create({
  wrapper: {
    alignSelf: "stretch",
  },
  titleText: {
    ...parseTextStyle(theme.typography.paragraphSmall.heavy),
    marginBottom: 2,
  },
  itemWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 2,
    paddingVertical: 8,
  },
  itemText: {
    ...parseTextStyle(theme.typography.paragraphXSmall.heavy),
    color: theme.colors.neutral[3],
  },
});
