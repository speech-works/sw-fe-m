import { StyleSheet, View, Text } from "react-native";
import React, { useContext, useState } from "react";
import InputField from "../../../components/InputField";
import CheckBox from "../../../components/CheckBox";
import { theme } from "../../../Theme/tokens";
import { parseTextStyle } from "../../../util/functions/parseFont";
import Button from "../../../components/Button";
import OAuth from "../../../components/OAuth";
import Separator from "../../../components/Separator";
import { loginUser } from "../../../api";
import { AuthContext } from "../../../contexts/AuthContext";

import {
  AuthStackNavigationProp,
  AuthStackParamList,
} from "../../../navigators";
import { useNavigation } from "@react-navigation/native";
import { getMyUser } from "../../../api/users";
import { useUserStore } from "../../../stores/user";
import { useActivityStore } from "../../../stores/activity";
import { useSessionStore } from "../../../stores/session";
import { triggerToast } from "../../../util/functions/toast";
import { clearAsyncStorage } from "../../../util/functions/asyncStorage";

const Form = () => {
  const navigation =
    useNavigation<AuthStackNavigationProp<keyof AuthStackParamList>>();
  const { login } = useContext(AuthContext);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [checkAgreement, setCheckAgreement] = useState(false);

  const handleGoToSignup = () => {
    // Navigate to "Signup"
    navigation.navigate("Signup");
  };

  const handleLogin = async () => {
    if (!email) {
      setErrors((old) => ({ ...old, email: "Email is required" }));
    }
    if (!password) {
      setErrors((old) => ({ ...old, password: "Password is required" }));
    }
    const { token } = await loginUser({ email, password });
    console.log("after login", token);
    if (token) {
      login(token);
      const myUser = await getMyUser();
      console.log("My user", myUser);
      const lastUserId = useUserStore.getState().user?.id;
      if (lastUserId && lastUserId !== myUser.id) {
        console.log("New user detected! Clearing stores...");
        useActivityStore.getState().clearActivity();
        useSessionStore.getState().clearSession();
        clearAsyncStorage();
        triggerToast(
          "warning",
          `Welcome ${myUser.name}`,
          "App data has been reset."
        );
      }
      useUserStore.setState({ user: myUser });
    }
  };

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
      <Button size="large" onPress={handleLogin}>
        <Text>Login</Text>
      </Button>
      <View style={styles.oAuthView}>
        <Separator text="Login with" />
        <OAuth />
      </View>
      <View style={styles.oAuthView}>
        <Separator text="Not a user yet" />
        <Button size="large" variant="ghost" onPress={handleGoToSignup}>
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
