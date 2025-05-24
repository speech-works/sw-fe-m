import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { theme } from "../../../../../Theme/tokens";
import ListCard from "../ListCard";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";
import { Technique } from "../../data";
import {
  LibStackNavigationProp,
  LibStackParamList,
} from "../../../../../navigators/stacks/AcademyStack/LibraryStack/types";
import { useNavigation } from "@react-navigation/native";

interface ListItemProps {
  title: string;
  techniques: Array<Technique>;
}

const ListItem = ({ title, techniques }: ListItemProps) => {
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();

  return (
    <View style={styles.container}>
      <View style={styles.itemTitle}>
        <Text style={styles.itemTitleText}>{title}</Text>
        <View style={styles.levelChip}>
          <Text style={styles.levelText}>6 techniques</Text>
        </View>
      </View>
      {techniques.map((tech) => (
        <ListCard
          key={tech.id}
          title={tech.name}
          description={tech.desc}
          level={tech.level}
          onTutorialSelect={function (): void {
            console.log("selected tutorial for technique", tech.id);
            navigation.navigate("TechniquePage", {
              techniqueId: tech.id,
              techniqueName: tech.name,
              stage: "TUTORIAL",
            });
          }}
          onExerciseSelect={function (): void {
            console.log("selected exercise for technique", tech.id);
            navigation.navigate("TechniquePage", {
              techniqueId: tech.id,
              techniqueName: tech.name,
              stage: "EXERCISE",
            });
          }}
        />
      ))}
    </View>
  );
};

export default ListItem;

const styles = StyleSheet.create({
  container: {
    display: "flex",
    flexDirection: "column",
    gap: 16,
  },
  itemTitle: {
    display: "flex",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  itemTitleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  levelChip: {
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    backgroundColor: theme.colors.surface.default,
  },
  levelText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
  },
});
