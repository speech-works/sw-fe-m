import { Image, StyleSheet, Text, View } from "react-native";
import React from "react";
import Form from "./components/Form";
import { theme } from "../../Theme/tokens";

const Signup = () => {
  return (
    <View style={{ backgroundColor: theme.colors.neutral.white }}>
      <Image
        source={require("../../assets/logo-image.png")}
        resizeMode="contain"
        style={styles.logo}
      />
      <Form />
    </View>
  );
};

export default Signup;

const styles = StyleSheet.create({
  logo: {
    width: 390,
    height: 250,
  },
});
