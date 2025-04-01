import { StyleSheet, Text, View, Image } from "react-native";
import React, { useState } from "react";
import Button from "../../../../../components/Button";
import { parseTextStyle } from "../../../../../util/functions/parseFont";
import { theme } from "../../../../../Theme/tokens";
import Icon from "react-native-vector-icons/MaterialIcons";
import CustomModal from "../../../../../components/CustomModal";
import PracticeScript from "../Scripts/PracticeScript";
import ContextMenu from "../../../../../components/ContextMenu";

interface ScriptCardProps {
  title: string;
  content: string;
  imgUrl?: string;
  srcUrl?: string;
}
const ScriptCard = ({ title, content, imgUrl, srcUrl }: ScriptCardProps) => {
  const [isFavorite, setIsFavorite] = useState(false);
  const [isPracticeModalOpen, setPracticeModalOpen] = useState(false);
  const stripFirst169Chars = (str: string) =>
    typeof str === "string"
      ? str.substring(169) || str
      : "Input must be a string.";
  return (
    <View style={styles.cardWrapper}>
      <View style={styles.imgView}>
        {imgUrl ? (
          <Image source={{ uri: imgUrl }} style={styles.cardImg} />
        ) : (
          <Image
            source={require("../../../../../assets/icon.png")}
            style={styles.cardImg}
          />
        )}
      </View>
      <View style={styles.contentView}>
        <Text style={styles.subtitleText}>MEDIUM</Text>
        <Text style={styles.titleText}>{title}</Text>
        <Text style={styles.text}>{stripFirst169Chars(content)}</Text>
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
        title={title}
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
        <PracticeScript script={content} />
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
