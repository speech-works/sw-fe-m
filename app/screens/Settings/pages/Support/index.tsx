import { useNavigation } from "@react-navigation/native";
import React from "react";
import { StyleSheet, View } from "react-native";
import {
  useTheme,
  radius,
  ListItem,
  Page,
} from "../../../../design-system";

const Support = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<any>();

  return (
    <Page title="Help & Support" onBack={() => navigation.goBack()}>
      <View style={[styles.group, { backgroundColor: colors.surface.default }]}>
        <ListItem
          leftIcon="alert-triangle"
          label="Report A Problem"
          sublabel="Let us know what needs fixing"
          showChevron
          divider
          onPress={() => navigation.navigate("ReportProblem" as any)}
        />
        <ListItem
          leftIcon="headphones"
          label="Contact Support"
          sublabel="Reach out to our support team"
          showChevron
          divider
          onPress={() => navigation.navigate("ContactSupport" as any)}
        />
        <ListItem
          leftIcon="message-square"
          label="Feedback & Suggestions"
          sublabel="How can we improve?"
          showChevron
          onPress={() => navigation.navigate("Feedback" as any)}
        />
      </View>
    </Page>
  );
};

export default Support;

const styles = StyleSheet.create({
  group: {
    borderRadius: radius.card,
    overflow: "hidden",
  },
});
