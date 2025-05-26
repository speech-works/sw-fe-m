import { StyleSheet, View, Text } from "react-native";
import React from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../../Theme/tokens";
import Button from "../../../../../components/Button";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";
import { useNavigation } from "@react-navigation/native";
import {
  AcademyStackNavigationProp,
  AcademyStackParamList,
} from "../../../../../navigators/stacks/AcademyStack/types";

const DonePractice = () => {
  const navigation =
    useNavigation<AcademyStackNavigationProp<keyof AcademyStackParamList>>();
  return (
    <View style={styles.container}>
      <View style={styles.okContainer}>
        <Icon name="check" size={52} color={theme.colors.library.green[400]} />
      </View>
      <View style={styles.textContainer}>
        <Text style={styles.titleText}>Great Job!</Text>
        <Text style={styles.descText}>
          You've completed practice for the day. Don’t forget to come back for
          more tomorrow
        </Text>
      </View>
      <View style={styles.buttonContainer}>
        <Button text="Set Reminder" onPress={() => {}} />
        <Button
          variant="ghost"
          text="Home"
          onPress={() => {
            navigation.navigate("Academy");
          }}
          style={{
            backgroundColor: theme.colors.surface.elevated,
            borderColor: "transparent",
          }}
        />
      </View>
    </View>
  );
};

export default DonePractice;

const styles = StyleSheet.create({
  container: {
    justifyContent: "center",
    alignItems: "center",
    gap: 32,
  },
  okContainer: {
    height: 128,
    width: 128,
    justifyContent: "center",
    alignItems: "center",
    alignSelf: "center",
    borderRadius: "50%",
    backgroundColor: theme.colors.library.green[200],
  },
  textContainer: {
    gap: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading1),
    color: theme.colors.text.title,
  },
  descText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
  },
  buttonContainer: {
    width: "100%",
    gap: 12,
  },
});
