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
import HeadphoneFace from "../../../../assets/sw-faces/HeadphoneFace";
import ReportFace from "../../../../assets/sw-faces/ReportFace";
import IceSportFace from "../../../../assets/sw-faces/IceSportFace";

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
        <IceSportFace size={48} />
        <Text style={styles.tileTitleText}>Challenges</Text>
        <Text style={styles.descText}>4/10</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tile} onPress={moveToLibrary}>
        <HeadphoneFace size={48} />
        <Text style={styles.tileTitleText}>Library</Text>
        <Text style={styles.descText}>120+</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.tile} onPress={moveToProgressDetail}>
        <ReportFace size={48} />
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
    paddingVertical: 16,
    paddingHorizontal: 12,
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
