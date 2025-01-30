import { StyleSheet, View, TouchableOpacity } from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";
import { theme } from "../Theme/tokens";

const OAuth = () => {
  return (
    <View style={styles.wrapper}>
      <TouchableOpacity style={styles.iconContainer} activeOpacity={0.7}>
        <Icon name="google" size={20} color="white" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconContainer} activeOpacity={0.7}>
        <Icon name="facebook" size={20} color="white" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconContainer} activeOpacity={0.7}>
        <Icon name="apple" size={20} color="white" />
      </TouchableOpacity>
      <TouchableOpacity style={styles.iconContainer} activeOpacity={0.7}>
        <Icon name="instagram" size={20} color="white" />
      </TouchableOpacity>
    </View>
  );
};

export default OAuth;

const styles = StyleSheet.create({
  wrapper: {
    display: "flex",
    flexDirection: "row",
    gap: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  iconContainer: {
    height: 36,
    width: 36,
    borderRadius: 6,
    backgroundColor: theme.colors.actionPrimary.default,
    alignItems: "center",
    justifyContent: "center",
  },
});
