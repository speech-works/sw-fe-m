import { StyleSheet, Text, View, Image } from "react-native";
import React, { useState } from "react";
import Button from "../../../../../components/Button";
import { parseTextStyle } from "../../../../../util/functions/parseFont";
import { theme } from "../../../../../Theme/tokens";
import Icon from "react-native-vector-icons/MaterialIcons";
import CustomModal from "../../../../../components/CustomModal";
import PracticeScript from "../Scripts/PracticeScript";
import ContextMenu from "../../../../../components/ContextMenu";

const ScriptCard = () => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPracticeModalOpen, setPracticeModalOpen] = useState(false);
  return (
    <View style={styles.cardWrapper}>
      <View style={styles.imgView}>
        <Image
          source={require("../../../../../assets/icon.png")}
          style={styles.cardImg}
        />
      </View>
      <View style={styles.contentView}>
        <Text style={styles.subtitleText}>MEDIUM</Text>
        <Text style={styles.titleText}>
          “I Have a Dream” by Martin Luther King Jr
        </Text>
        <Text style={styles.text}>
          Sagittis, eu pretium massa quisque cursus augue massa cursus. Sed
          quisque velit, auctor at lobortis hac tincidunt sodales id. Elit
          interdum vel nisi, in enim sagittis at. Netus sagittis eleifend
          aliquet urna quis.
        </Text>
        <View style={styles.footerView}>
          <Button
            size="small"
            onPress={() => {
              console.log("");
              setPracticeModalOpen(true);
            }}
          >
            <Text>Start practice</Text>
          </Button>
          <View style={styles.optionsView}>
            <Icon
              name={isFavorite ? "favorite" : "favorite-border"}
              size={20}
              color={theme.colors.actionPrimary.default}
              onPress={() => setIsFavorite((old) => !old)}
            />
            <Icon
              name="play-circle-outline"
              size={20}
              color={theme.colors.neutral[5]}
            />
            {/* <Icon name="more-vert" size={20} color={theme.colors.neutral[5]} /> */}
            <ContextMenu
              options={[
                { label: "Edit", onPress: () => console.log("Edit clicked") },
                {
                  label: "Delete",
                  onPress: () => console.log("Delete clicked"),
                },
              ]}
            />
          </View>
        </View>
      </View>
      <CustomModal
        visible={isPracticeModalOpen}
        onClose={() => {
          setPracticeModalOpen(false);
        }}
        title="“I Have a Dream” by Martin Luther King Jr"
        icon="auto-stories"
        primaryButton={{
          label: "Start recording",
          onPress: () => {},
        }}
        secondaryButton={{
          label: "Play recording",
          onPress: () => {},
        }}
      >
        <PracticeScript />
      </CustomModal>
    </View>
  );
};

export default ScriptCard;

const styles = StyleSheet.create({
  cardWrapper: {
    borderRadius: 4,
    boxShadow: "0 0.96 2.87 0 rgba(0, 0, 0, 0.22)",
  },
  imgView: {
    borderRadius: 4,
    borderBottomLeftRadius: 0,
    borderBottomRightRadius: 0,
  },
  contentView: {
    padding: 12,
  },
  titleText: {
    ...parseTextStyle(theme.typography.paragraphSmall.heavy),
    marginBottom: 6,
    marginTop: 4,
  },
  subtitleText: {
    ...parseTextStyle(theme.typography.paragraphXSmall.regular),
    color: theme.colors.neutral[2],
  },
  text: {
    ...parseTextStyle(theme.typography.paragraphXSmall.light),
    color: theme.colors.neutral[2],
  },
  footerView: {
    marginTop: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  optionsView: {
    flexDirection: "row",
    gap: 8,
  },
  cardImg: {
    height: 100,
    width: "auto",
  },
});
