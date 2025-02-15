import { StyleSheet, Text, View } from "react-native";
import React, { useState } from "react";
import { parseTextStyle } from "../../../../../util/functions/parseFont";
import { theme } from "../../../../../Theme/tokens";
import Button from "../../../../../components/Button";
import InputField from "../../../../../components/InputField";
import Search from "../../../../../components/Search";
import ScriptCard from "../components/ScriptCard";
import CustomModal from "../../../../../components/CustomModal";
import AddScript from "./AddScript";

const Scripts = () => {
  const [isAddScriptModalVisible, setAddScriptModalVisible] = useState(false);
  return (
    <View style={styles.wrapperView}>
      <Text style={styles.titleText}>Smooth Speech</Text>
      <View style={styles.searchView}>
        <Search />
        <Button size="small" onPress={() => setAddScriptModalVisible(true)}>
          <Text>Add script</Text>
        </Button>
        <CustomModal
          visible={isAddScriptModalVisible}
          onClose={() => {
            setAddScriptModalVisible(false);
          }}
          title="Add a script"
          icon="edit"
          primaryButton={{
            label: "Save",
            onPress: () => {},
          }}
          secondaryButton={{
            label: "Cancel",
            onPress: () => {},
          }}
        >
          <AddScript />
        </CustomModal>
      </View>
      <View style={styles.scriptCardsWrapper}>
        {[1, 2, 3, 4, 5, 6].map((x) => (
          <ScriptCard />
        ))}
      </View>
      <View style={styles.buttonWrapper}>
        <Button size="large" onPress={() => console.log("")}>
          <Text>Mark complete</Text>
        </Button>
      </View>
    </View>
  );
};

export default Scripts;

const styles = StyleSheet.create({
  wrapperView: {
    alignItems: "center",
    paddingHorizontal: 25,
    paddingVertical: 50,
    gap: 16,
  },
  titleText: {
    ...parseTextStyle(theme.typography.f1.heavy_576),
    color: theme.colors.neutral[3],
  },
  btnText: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  searchView: {
    width: "100%",
    flexDirection: "row",
    gap: 20,
  },
  buttonWrapper: {
    width: "100%",
  },
  scriptCardsWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 25,
    alignItems: "center",
    justifyContent: "center",
  },
});
