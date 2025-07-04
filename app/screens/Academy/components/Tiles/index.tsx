import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import { theme } from "../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";
import { useNavigation } from "@react-navigation/native";
import {
  AcademyStackNavigationProp,
  AcademyStackParamList,
} from "../../../../navigators/stacks/AcademyStack/types";

const Tiles = () => {
  const navigation =
    useNavigation<AcademyStackNavigationProp<keyof AcademyStackParamList>>();
  const moveToLibrary = () => {
    navigation.navigate("LibraryStack");
  };
  const moveToChallenges = () => {
    navigation.navigate("ChallengesStack");
  };
  const moveToProgressDetail = () => {
    navigation.navigate("ProgressDetailStack");
  };
  return (
    <View style={styles.container}>
      <TouchableOpacity style={styles.tile} onPress={moveToChallenges}>
        <Icon
          name="trophy"
          color={theme.colors.library.yellow[500]}
          size={24}
        />
        <Text style={styles.tileTitleText}>Challenges</Text>
        <Text style={styles.descText}>4/10</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tile} onPress={moveToLibrary}>
        <Icon name="book" color={theme.colors.library.blue[400]} size={24} />
        <Text style={styles.tileTitleText}>Library</Text>
        <Text style={styles.descText}>120+</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tile} onPress={moveToProgressDetail}>
        <Icon
          name="chart-line"
          color={theme.colors.library.green[400]}
          size={24}
        />
        <Text style={styles.tileTitleText}>Progress</Text>
        <Text style={styles.descText}>View</Text>
      </TouchableOpacity>
    </View>
  );
};

export default Tiles;

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "row",
    gap: 12,
  },
  tile: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    padding: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderRadius: 12,
    flex: 1,
  },
  tileTitleText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.title,
  },
  descText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
});
