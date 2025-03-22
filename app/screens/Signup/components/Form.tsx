import { StyleSheet, View, Text } from "react-native";
import React, { useState } from "react";
import InputField from "../../../components/InputField";
import CheckBox from "../../../components/CheckBox";
import { theme } from "../../../Theme/tokens";
import { parseTextStyle } from "../../../util/functions/parseFont";
import Button from "../../../components/Button";
import OAuth from "../../../components/OAuth";
import Separator from "../../../components/Separator";
import { useNavigation } from "@react-navigation/native";
import {
  AuthStackNavigationProp,
  AuthStackParamList,
} from "../../../navigators";

const Form = () => {
  const navigation =
    useNavigation<AuthStackNavigationProp<keyof AuthStackParamList>>();
  const [fullName, setFullName] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checkAgreement, setCheckAgreement] = useState(false);
  const handleGoToLogin = () => {
    navigation.navigate("Login");
  };

  return (
    <View style={styles.signupForm}>
      <InputField
        label="Full Name"
        placeholder="Enter your full name"
        value={fullName}
        onChangeText={setFullName}
        required
        error={errors.fullName}
      />
      <InputField
        label="Email"
        placeholder="Enter your email"
        value={fullName}
        onChangeText={setFullName}
        required
        error={errors.fullName}
      />
      <InputField
        label="Password"
        placeholder="Enter your password"
        value={fullName}
        onChangeText={setFullName}
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
          I agree to the processing of personal data
        </Text>
      </View>
      <Button size="large" onPress={() => console.log("")}>
        <Text>Signup</Text>
      </Button>
      <View style={styles.oAuthView}>
        <Separator text="Sign up with" />
        <OAuth />
      </View>
      <View style={styles.flexBoxView}>
        <Text style={styles.regularBaseText}>Already have an acount</Text>
        <Text
          style={[
            styles.heavySmallText,
            {
              textDecorationLine: "underline",
              color: theme.colors.actionSecondary.default,
            },
          ]}
          onPress={handleGoToLogin}
        >
          log in
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
    gap: 5,
  },
});
