import { SafeAreaView, ScrollView } from "react-native";
import Signup from "./app/screens/Signup";
import FontLoader from "./app/util/components/FontLoader";

export default function App() {
  return (
    <SafeAreaView>
      <ScrollView>
        <FontLoader />
        <Signup />
      </ScrollView>
    </SafeAreaView>
  );
}
