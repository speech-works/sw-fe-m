import { StyleSheet, Text, View, Image } from "react-native";
import React, { useEffect } from "react";
import Button from "../../../../components/Button";
import { parseTextStyle } from "../../../../util/functions/parseFont";
import { theme } from "../../../../Theme/tokens";
import { useSessionStore } from "../../../../stores/session";
import { useActivityStore } from "../../../../stores/activity";
import { useNavigation } from "@react-navigation/native";
import {
  HomeStackNavigationProp,
  HomeStackParamList,
} from "../../../../navigators";
import CustomModal from "../../../../components/CustomModal";
import FinishForm from "./components/FinishForm";
import CardContent from "./components/CardContent";
import FlipCard from "../../../../components/FlipCard";

const Exposure = () => {
  const { practiceSession, setSession, clearSession } = useSessionStore();
  const { setActivity, activity, clearActivity } = useActivityStore();

  const navigation =
    useNavigation<HomeStackNavigationProp<keyof HomeStackParamList>>();
  const [isFinishModalOpen, setFinishModaOpen] = React.useState(false);

  const handleMarkChallengeComplete = async () => {
    setFinishModaOpen(true);
  };
  const moveToNextPage = () => {
    setFinishModaOpen(false);
    navigation.navigate("Home");
  };

  useEffect(() => {
    console.log("Exposure MOUNTED....");
    return () => {
      console.log("Exposure UNMOUNTED....");
    };
  }, []);

  return (
    <>
      <View style={styles.wrapperView}>
        <View style={styles.pageTitleWrapper}>
          <Text style={styles.pageTitle}>Exposure</Text>
        </View>

        <FlipCard
          backCardContent={
            <CardContent
              series="Family Flow Series"
              task="Tell a funny story at the dinner table"
              meta={[
                "🎯 Challenge 2 of 6 – Family Flow Series",
                "🗣 Skill – Storytelling with emotion",
                "🟢 Growth zone – Low",
                "🍽️ Your words light up the room",
              ]}
            />
          }
        >
          <CardContent
            series="Street talk series"
            task="Ask a stranger for directions to a place"
            meta={[
              "🎯 Challenge 3 of 7 – Street Talk Series",
              "🗣 Skill – Confidence in public speech",
              "🟠  Growth zone – Moderate",
              "🚀 Launching you into confidence orbit",
            ]}
          />
        </FlipCard>

        <View style={styles.footer}>
          <Text style={styles.footerTip}>
            💡 TIP: Focus on staying calm, not perfect{" "}
          </Text>
          <Button size="large" onPress={handleMarkChallengeComplete}>
            <Text>Mark complete</Text>
          </Button>
        </View>
      </View>
      <CustomModal
        visible={isFinishModalOpen}
        onClose={() => {
          setFinishModaOpen(false);
        }}
        title="Complete Exposure"
        icon="done"
        primaryButton={{
          label: "Done",
          onPress: moveToNextPage,
        }}
        secondaryButton={{
          label: "Cancel",
          onPress: () => {
            setFinishModaOpen(false);
          },
        }}
      >
        <FinishForm />
      </CustomModal>
    </>
  );
};

export default Exposure;

const styles = StyleSheet.create({
  wrapperView: {
    paddingHorizontal: 24,
    flex: 1,
    justifyContent: "space-between",
  },
  pageTitleWrapper: {
    alignItems: "center",
    paddingTop: 36,
  },
  pageTitle: {
    ...parseTextStyle(theme.typography.f1.heavy_576),
    color: theme.colors.neutral[3],
  },
  footer: {
    gap: 12,
  },
  footerTip: {
    textAlign: "center",
    ...parseTextStyle(theme.typography.paragraphSmall.regular),
    color: theme.colors.neutral[3],
  },

  placeHolderImg: {
    height: 150, // Set the desired height
    resizeMode: "contain", // Ensures the image scales uniformly
  },
  imgContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
});
