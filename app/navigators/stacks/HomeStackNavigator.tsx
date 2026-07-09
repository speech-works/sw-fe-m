import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeStackParamList } from "..";
import Home from "../../screens/Home";
import ProgressDetail from "../../screens/Academy/ProgressDetail";
import DimensionDetailScreen from "../../screens/Home/DimensionDetailScreen";

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Home" component={Home} />
      <Stack.Screen name="ProgressDetail" component={ProgressDetail} />
      <Stack.Screen name="DimensionDetail" component={DimensionDetailScreen} />
    </Stack.Navigator>
  );
}
