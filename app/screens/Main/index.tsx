import React from "react";
import { View, Text, Button } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";

type RootStackParamList = {
  Main: undefined;
  Signup: undefined;
};

type MainProps = NativeStackScreenProps<RootStackParamList, "Main">;

const MainScreen: React.FC<MainProps> = ({ navigation }) => {
  return (
    <View>
      <Text>🏠 Main Screen</Text>
      <Button
        title="Go to Signup"
        onPress={() => navigation.navigate("Signup")}
      />
    </View>
  );
};

export default MainScreen;
