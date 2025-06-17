import { StyleSheet, Text, View } from "react-native";
import React from "react";
import BottomSheetModal from "../../../../../../components/BottomSheetModal";

export enum EXPRESSION_TYPE_ENUM {
  WRITE = "WRITE",
  TALK = "TALK",
}
interface ExpressYourselfProps {
  expressionType: EXPRESSION_TYPE_ENUM | null;

  onClose: () => void;
}

const ExpressYourself = ({
  expressionType,

  onClose,
}: ExpressYourselfProps) => {
  return (
    <View>
      <BottomSheetModal visible={expressionType !== null} onClose={onClose}>
        <Text>Talk</Text>
      </BottomSheetModal>
    </View>
  );
};

export default ExpressYourself;

const styles = StyleSheet.create({});
