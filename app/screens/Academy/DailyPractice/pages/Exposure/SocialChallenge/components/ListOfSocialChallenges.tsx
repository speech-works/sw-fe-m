import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import React, { useEffect, useState } from "react";
import CustomScrollView, {
  SHADOW_BUFFER,
} from "../../../../../../../components/CustomScrollView";
import { theme } from "../../../../../../../Theme/tokens";
import Icon from "react-native-vector-icons/FontAwesome5";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../../../../util/functions/parseStyles";
import {
  ExposurePractice,
  ExposurePracticeType,
} from "../../../../../../../api/dailyPractice/types";
import { getExposurePracticeByType } from "../../../../../../../api/dailyPractice";

interface ListOfSocialChallengesProps {
  onSelectSC: (sc: ExposurePractice) => void;
}

const ListOfSocialChallenges = ({
  onSelectSC,
}: ListOfSocialChallengesProps) => {
  const [socialChallengesList, setSocialChallengesList] = useState<
    Array<ExposurePractice>
  >([]);

  useEffect(() => {
    const fetchSCDetails = async () => {
      const socialChallenges = await getExposurePracticeByType(
        ExposurePracticeType.SOCIAL_CHALLENGE_SIMULATION
      );
      setSocialChallengesList(socialChallenges);
    };
    fetchSCDetails();
  }, []);

  return (
    <CustomScrollView contentContainerStyle={styles.container}>
      {socialChallengesList.map((sc) => (
        <TouchableOpacity
          key={sc.name}
          style={styles.card}
          onPress={() => onSelectSC(sc)}
        >
          <View style={styles.content}>
            <Text style={styles.titleText}>{sc.name}</Text>
            <Text style={styles.descText}>{sc.description}</Text>
          </View>
          <Icon
            name="chevron-right"
            size={16}
            color={theme.colors.text.default}
          />
        </TouchableOpacity>
      ))}
    </CustomScrollView>
  );
};

export default ListOfSocialChallenges;

const styles = StyleSheet.create({
  container: {
    padding: SHADOW_BUFFER,
    paddingVertical: 16,
    paddingHorizontal: 8,
    gap: 16,
  },
  card: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderRadius: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  content: {
    gap: 4,
    flexShrink: 1,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },
  descText: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
  },
});
