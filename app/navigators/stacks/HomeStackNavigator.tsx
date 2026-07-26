import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeStackParamList } from "..";
import Home from "../../screens/Home";
import ProgressDetail from "../../screens/Academy/ProgressDetail";

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="ProgressDetail" component={ProgressDetail} />
    </Stack.Navigator>
  );
}
