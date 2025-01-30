import { StyleSheet, View, Text } from "react-native";
import React, { useState } from "react";
import InputField from "../../../components/InputField";
import CheckBox from "../../../components/CheckBox";
import { theme } from "../../../Theme/tokens";
import { parseTextStyle } from "../../../util/functions/parseFont";
import Button from "../../../components/Button";
import OAuth from "../../../components/OAuth";
import Separator from "../../../components/Separator";

const Form = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checkAgreement, setCheckAgreement] = useState(false);
  return (
    <View style={styles.signupForm}>
      <InputField
        label="Email"
        placeholder="Enter your email"
        value={email}
        onChangeText={setEmail}
        required
        error={errors.fullName}
      />
      <InputField
        label="Password"
        placeholder="Enter your password"
        value={password}
        onChangeText={setPassword}
        required
        secureTextEntry
        error={errors.fullName}
      />
      <View style={styles.checkboxContainer}>
        <CheckBox
          checked={checkAgreement}
          onToggle={() => setCheckAgreement((old) => !old)}
        />
        <Text style={styles.heavySmallText}>
          Store my credentials for the future
        </Text>
      </View>
      <Button size="large" onPress={() => console.log("")}>
        <Text>Login</Text>
      </Button>
      <View style={styles.oAuthView}>
        <Separator text="Login with" />
        <OAuth />
      </View>
      <View style={styles.oAuthView}>
        <Separator text="Not a user yet" />
        <Button size="large" variant="ghost" onPress={() => console.log("")}>
          <Text>Signup</Text>
        </Button>
      </View>
      <View style={styles.flexBoxView}>
        <Text style={styles.regularBaseText}>Forgot password?</Text>
        <Text
          style={[
            styles.heavySmallText,
            {
              textDecorationLine: "underline",
              color: theme.colors.actionSecondary.default,
            },
          ]}
        >
          reset
        </Text>
      </View>
    </View>
  );
};

export default Form;

const styles = StyleSheet.create({
  signupForm: {
    paddingVertical: 36,
    paddingHorizontal: 35,
    display: "flex",
    gap: 24,
  },
  checkboxContainer: {
    display: "flex",
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  heavySmallText: {
    ...parseTextStyle(theme.typography.paragraphSmall.heavy),
  },
  oAuthView: {
    gap: 24,
    marginTop: 12,
  },
  regularBaseText: {
    color: theme.colors.neutral[5],
    ...parseTextStyle(theme.typography.paragraphBase.regular),
  },
  flexBoxView: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
  },
});
