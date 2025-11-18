import { StyleSheet, Text, View } from "react-native";
import React, { useMemo } from "react"; // Import useMemo
import { theme } from "../../../../../Theme/tokens";
import ListCard from "../ListCard";
import { parseTextStyle } from "../../../../../util/functions/parseStyles";
// import { Technique } from "../../data"; // Unused import removed for cleanliness
import {
  LibStackNavigationProp,
  LibStackParamList,
} from "../../../../../navigators/stacks/AcademyStack/LibraryStack/types";
import { useNavigation } from "@react-navigation/native";
import { TransformedTechnique } from "../../../../../api/library/types";

interface ListItemProps {
  title: string;
  techniques: Array<TransformedTechnique>;
}

const ListItem = ({ title, techniques }: ListItemProps) => {
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();

  // Sort techniques: Free content comes first
  const sortedTechniques = useMemo(() => {
    // Create a shallow copy to avoid mutating the prop
    return [...techniques].sort((a, b) => {
      // If a is free and b is not, a comes first (-1)
      if (a.hasFree && !b.hasFree) return -1;
      // If b is free and a is not, b comes first (1)
      if (!a.hasFree && b.hasFree) return 1;
      // Otherwise keep original order
      return 0;
    });
  }, [techniques]);

  return (
    <View style={styles.container}>
      <View style={styles.itemTitle}>
        <Text style={styles.itemTitleText}>{title}</Text>
        <View style={styles.levelChip}>
          <Text style={styles.levelText}>
            {techniques.length} technique{techniques.length > 1 && "s"}
          </Text>
        </View>
      </View>

      {/* Map over sortedTechniques instead of techniques */}
      {sortedTechniques.map((tech) => (
        <ListCard
          key={tech.id}
          title={tech.name}
          description={tech.description}
          level={tech.level}
          hasFree={tech.hasFree}
          onTutorialSelect={function (): void {
            console.log("selected tutorial for technique", tech.id);
            navigation.navigate("TechniquePage", {
              techniqueId: tech.id,
              techniqueName: tech.name,
              techniqueDesc: tech.description,
              techniqueLevel: tech.level,
              stage: "TUTORIAL",
              hasFree: tech.hasFree,
            });
          }}
          onExerciseSelect={function (): void {
            console.log("selected exercise for technique", tech.id);
            navigation.navigate("TechniquePage", {
              techniqueId: tech.id,
              techniqueName: tech.name,
              techniqueDesc: tech.description,
              techniqueLevel: tech.level,
              stage: "EXERCISE",
              hasFree: tech.hasFree,
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
