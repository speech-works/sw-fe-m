import { StyleSheet, View, Image } from "react-native";
import React from "react";
import Form from "./components/Form";

const Login = () => {
  return (
    <View>
      <Image
        source={require("../../assets/logo-image.png")}
        resizeMode="contain"
        style={styles.logo}
      />
      <Form />
    </View>
  );
};

export default Login;

const styles = StyleSheet.create({
  logo: {
    width: 390,
    height: 250,
  },
});
