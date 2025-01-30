import { SafeAreaView, ScrollView } from "react-native";
import Signup from "./app/screens/Signup";
import Login from "./app/screens/Login";
import FontLoader from "./app/util/components/FontLoader";

export default function App() {
  return (
    <SafeAreaView>
      <ScrollView>
        <FontLoader />
        <Login />
      </ScrollView>
    </SafeAreaView>
  );
}
