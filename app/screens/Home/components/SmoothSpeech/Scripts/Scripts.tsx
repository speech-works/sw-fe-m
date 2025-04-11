import { StyleSheet, Text, View } from "react-native";
import React, { useMemo, useState } from "react";
import { parseTextStyle } from "../../../../../util/functions/parseFont";
import { theme } from "../../../../../Theme/tokens";
import Button from "../../../../../components/Button";
import Search from "../../../../../components/Search";
import ScriptCard from "../components/ScriptCard";
import CustomModal from "../../../../../components/CustomModal";
import AddScript from "./AddScript";
import { scriptData, ContentData } from "./dummyData";

interface ScriptPops {
  markScriptStarted: (scriptId: string) => void;
  markScriptComplete: () => void;
}
const Scripts = ({ markScriptStarted, markScriptComplete }: ScriptPops) => {
  const [isAddScriptModalVisible, setAddScriptModalVisible] = useState(false);
  const [searchText, setSearchText] = useState("");

  const filteredScriptData = useMemo(() => {
    if (!searchText) {
      return scriptData;
    }
    return scriptData.filter((s: ContentData) =>
      s.name.toLowerCase().includes(searchText.toLowerCase())
    );
  }, [searchText, scriptData]);

  return (
    <View style={styles.wrapperView}>
      <Text style={styles.titleText}>Smooth Speech</Text>
      <View style={styles.searchView}>
        <Search value={searchText} onChangeText={(txt) => setSearchText(txt)} />
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
        {filteredScriptData.map((s) => (
          <ScriptCard
            key={s.id}
            id={s.id}
            title={s.name}
            imgUrl={s.img_url}
            content={s.content}
            recordAudioCallback={() => {
              // start another smooth speech activity
              markScriptStarted(s.id);
            }}
            stopRecoringallback={() => {
              // mark the current smooth speech activity completed
              markScriptComplete();
            }}
          />
        ))}
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
    paddingBottom: 25,
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
  scriptCardsWrapper: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 25,
    alignItems: "center",
    justifyContent: "center",
  },
});
