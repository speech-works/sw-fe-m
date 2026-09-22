import { createNativeStackNavigator } from "@react-navigation/native-stack";
import { HomeStackParamList } from "..";
import { STACK_ROOT_ROUTE_NAMES } from "../../constants/routes";
import Home from "../../screens/Home";
import ProgressDetail from "../../screens/Academy/ProgressDetail";

const Stack = createNativeStackNavigator<HomeStackParamList>();

export default function HomeStackNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name={STACK_ROOT_ROUTE_NAMES.HOME} component={Home} />
      <Stack.Screen name="ProgressDetail" component={ProgressDetail} />
    </Stack.Navigator>
  );
}
