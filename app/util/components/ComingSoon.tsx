import { StyleSheet, View, Text } from "react-native";
import React, { useState } from "react";
import ScreenView from "../../components/ScreenView";
import CustomScrollView from "../../components/CustomScrollView";
import Icon from "react-native-vector-icons/FontAwesome5";
import ComingSoonIcon from "../../assets/ComingSoonIcon";
import { parseShadowStyle, parseTextStyle } from "../functions/parseStyles";
import { theme } from "../../Theme/tokens";
import Button from "../../components/Button";
import TextArea from "../../components/TextArea";

const ComingSoon = () => {
  const [suggestion, setSuggestion] = useState("");
  return (
    <ScreenView style={styles.screenView}>
      <CustomScrollView>
        <View style={styles.innerContainer}>
          <ComingSoonIcon />
          <View style={styles.textContainer}>
            <Text style={styles.titleText}>Coming Soon!</Text>
            <Text style={styles.descText}>
              We're adding some magic to make your experience even better.
            </Text>
          </View>
          <View style={styles.shareContainer}>
            <View style={styles.shareTitleContainer}>
              <Icon
                solid
                name="comments"
                size={24}
                color={theme.colors.actionPrimary.default}
              />
              <Text style={styles.shareTitleText}>Share Ideas</Text>
            </View>
            <View style={styles.textFieldContainer}>
              <TextArea
                autoFocus
                value={suggestion}
                onChangeText={setSuggestion}
                placeholder="Type your feedback here..."
                numberOfLines={5}
                containerStyle={styles.textAreaContainer}
                inputStyle={styles.textAreaInput}
              />
            </View>
          </View>
          <Button text="Notify me" onPress={() => {}} style={styles.button} />
        </View>
      </CustomScrollView>
    </ScreenView>
  );
};

export default ComingSoon;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  innerContainer: {
    alignItems: "center",
    gap: 24,
    flex: 1,
  },
  textContainer: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 16,
  },
  titleText: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
  },
  descText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
  },
  shareContainer: {
    display: "flex",
    flexDirection: "column",
    gap: 12,
    flex: 1,
    width: "100%",
    borderRadius: 16,
    padding: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
  },
  shareTitleContainer: {
    display: "flex",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  shareTitleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  textFieldContainer: {
    display: "flex",
    flex: 1,
    borderRadius: 12,
    backgroundColor: theme.colors.background.default,
  },
  textAreaContainer: {
    flex: 1,
    backgroundColor: theme.colors.background.default,
  },
  textAreaInput: {
    height: "100%",
    backgroundColor: theme.colors.background.default,
    ...parseTextStyle(theme.typography.BodySmall),
  },
  button: {
    width: "100%",
  },
});
