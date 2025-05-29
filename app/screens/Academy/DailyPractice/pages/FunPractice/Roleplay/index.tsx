import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React from "react";
import Icon from "react-native-vector-icons/FontAwesome5";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../components/CustomScrollView";
import ScreenView from "../../../../../../components/ScreenView";
import { theme } from "../../../../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../util/functions/parseStyles";
import { useNavigation } from "@react-navigation/native";
import {
  RoleplayFDPStackNavigationProp,
  RoleplayFDPStackParamList,
} from "../../../../../../navigators/stacks/AcademyStack/DailyPracticeStack/FunPracticeStack/RoleplayPracticeStack/types";
import { rolePlayData } from "./data";

const Roleplay = () => {
  const navigation =
    useNavigation<
      RoleplayFDPStackNavigationProp<keyof RoleplayFDPStackParamList>
    >();
  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        <View style={styles.topNavigationContainer}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.topNavigation}
          >
            <Icon
              name="arrow-left"
              size={16}
              color={theme.colors.text.default}
            />
            <Text style={styles.topNavigationText}>Roleplay</Text>
          </TouchableOpacity>
        </View>

        <CustomScrollView contentContainerStyle={styles.scrollContent}>
          <View style={styles.listContainer}>
            {rolePlayData.map((rp, i) => (
              <TouchableOpacity
                key={i}
                style={styles.card}
                onPress={() => {
                  navigation.navigate("RoleplayBriefing", {
                    title: rp.title,
                    description: rp.desc,
                  });
                }}
              >
                <View style={styles.textContainer}>
                  <Text style={styles.titleText}>{rp.title}</Text>
                  <Text style={styles.descText}>{rp.desc}</Text>
                </View>
                <Icon
                  size={16}
                  name="chevron-right"
                  color={theme.colors.text.default}
                />
              </TouchableOpacity>
            ))}
          </View>
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default Roleplay;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    flex: 1,
    gap: 32,
  },
  scrollContent: {
    gap: 32,
    flexGrow: 1,
    padding: SHADOW_BUFFER,
    paddingBottom: 20,
  },
  topNavigationContainer: {
    position: "relative",
    top: 0,
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  topNavigation: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  topNavigationText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  listContainer: {
    gap: 16,
  },
  card: {
    padding: 24,
    paddingHorizontal: 16,
    borderRadius: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  textContainer: {
    gap: 4,
    flexShrink: 1,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.default,
  },
  descText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
});
