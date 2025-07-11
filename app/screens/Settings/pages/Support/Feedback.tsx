import { StyleSheet, Text, View, Switch } from "react-native";
import React, { useState } from "react";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../../util/functions/parseStyles";
import { theme } from "../../../../Theme/tokens";
import TextArea from "../../../../components/TextArea";
import Button from "../../../../components/Button";
import { useUserStore } from "../../../../stores/user";

const Feedback = () => {
  const { user } = useUserStore();
  const [features, setFeatures] = useState("");
  const [frustrations, setFrustrations] = useState("");
  const [otherThoughts, setOtherThoughts] = useState("");
  const [submitEmail, setSubmitEmail] = useState(false);

  const handleFeedbackSubmit = () => {};
  const handleAnonymousChange = () => {
    setSubmitEmail((old) => !old);
  };
  return (
    <View style={styles.wrapper}>
      <View style={styles.section}>
        <Text style={styles.label}>What features would you like to see?</Text>
        <TextArea
          value={features}
          onChangeText={setFeatures}
          placeholder="Share your ideas for new features or improvements..."
          numberOfLines={5}
          containerStyle={styles.textAreaContainer}
          inputStyle={styles.textAreaInput}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Anything confusing or frustrating?</Text>
        <TextArea
          value={frustrations}
          onChangeText={setFrustrations}
          placeholder="Tell us about any challenges or frustrations you've experienced..."
          numberOfLines={5}
          containerStyle={styles.textAreaContainer}
          inputStyle={styles.textAreaInput}
        />
      </View>
      <View style={styles.section}>
        <Text style={styles.label}>Any other thoughts?</Text>
        <TextArea
          value={otherThoughts}
          onChangeText={setOtherThoughts}
          placeholder="Share any other feedback that could help us improve..."
          numberOfLines={5}
          containerStyle={styles.textAreaContainer}
          inputStyle={styles.textAreaInput}
        />
      </View>
      <View style={styles.card}>
        <View
          style={{
            flexDirection: "row",
            justifyContent: "space-between",
            alignItems: "center",
            width: "100%",
          }}
        >
          <Text style={styles.label}>Submit with your email</Text>
          <Switch
            value={submitEmail}
            trackColor={{
              false: theme.colors.actionPrimary.default,
              true: theme.colors.actionPrimary.default,
            }}
            onChange={handleAnonymousChange}
          />
        </View>
        <View
          style={{
            padding: 16,
            backgroundColor: theme.colors.surface.disabled,
            borderColor: theme.colors.border.default,
            borderWidth: 1,
            borderRadius: 12,
            width: "100%",
          }}
        >
          <Text
            style={{
              color: theme.colors.text.default,
              ...parseTextStyle(theme.typography.Body),
            }}
          >
            {user?.email}
          </Text>
        </View>
        <Text
          style={{
            color: theme.colors.text.default + "99",
            ...parseTextStyle(theme.typography.BodyDetails),
          }}
        >
          We'll only use this to follow up on your feedback if needed
        </Text>
      </View>
      <Button
        text="Submit Feedback"
        onPress={handleFeedbackSubmit}
        disabled={!(features || otherThoughts || frustrations)}
      />
    </View>
  );
};

export default Feedback;

const styles = StyleSheet.create({
  wrapper: {
    gap: 20,
  },
  section: {
    gap: 8,
  },
  label: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
  },
  textAreaContainer: {
    backgroundColor: theme.colors.background.default,
    minHeight: 150,
    borderRadius: 12,
  },
  textAreaInput: {
    height: "100%",
    backgroundColor: theme.colors.background.default,
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  card: {
    gap: 16,
    backgroundColor: theme.colors.surface.elevated,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderRadius: 16,
    paddingVertical: 20,
    paddingHorizontal: 16,
    flexDirection: "column",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
});
