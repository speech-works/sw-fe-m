import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, ScrollView, Dimensions } from "react-native";
import TherapistFace from "../../../../assets/sw-faces/TherapistFace";
import {
  LibStackNavigationProp,
  LibStackParamList,
} from "../../../../navigators/stacks/ExploreStack/LibraryStack/types";
import { useUserStore } from "../../../../stores/user";
import {
  Page,
  Text,
  Button,
  IconButton,
  Divider,
  spacing,
  radius,
  Sheet,
  TabDock,
} from "../../../../design-system";
import PracticePage from "./PracticePage";
import QuizPage from "./QuizPage";
import TutorialPage from "./TutorialPage";

const TechniquePage = () => {
  const { user } = useUserStore();
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();

  const route = useRoute<RouteProp<LibStackParamList, "TechniquePage">>();

  const { techniqueId, techniqueName, techniqueDesc, stage, hasFree, from } =
    route.params;

  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [contentWidth, setContentWidth] = useState(Dimensions.get("window").width);

  const isContentAccessible = user?.isPaid || hasFree;
  const closeModal = () => setIsModalVisible(false);

  const handleStepChange = (index: number) => {
    if (index > 0 && !isContentAccessible) {
      return;
    }
    setActiveStageIndex(index);
  };

  const handleChildStageChange = (value: React.SetStateAction<number>) => {
    const index =
      typeof value === "function"
        ? (value as (prev: number) => number)(activeStageIndex)
        : value;

    handleStepChange(index);
  };

  useEffect(() => {
    if (scrollViewRef.current && contentWidth > 0) {
      scrollViewRef.current.scrollTo({
        x: activeStageIndex * contentWidth,
        animated: true,
      });
    }
  }, [activeStageIndex, contentWidth]);

  useEffect(() => {
    if (stage === "TUTORIAL") {
      setActiveStageIndex(0);
    } else if (stage === "EXERCISE") {
      if (isContentAccessible) {
        setActiveStageIndex(1);
      } else {
        setActiveStageIndex(0);
      }
    }
  }, [stage, isContentAccessible]);

  return (
    <>
      <Page
        title={techniqueName}
        onBack={() =>
          from === "MOOD_CHECK"
            ? navigation.navigate("Root" as any, { screen: "HOME" })
            : navigation.navigate("Library", { from })
        }
        right={
          <IconButton
            name="info"
            onPress={() => setIsModalVisible(true)}
          />
        }
        scroll={false}
        contentGap={spacing.lg}
      >
        {/* Stepper (Navigation) — dark tab bar */}
        <TabDock
          inline
          fitContent
          accessibilityLabel="Technique stages"
          items={[
            {
              key: "0",
              label: "Learn",
              icon: "play",
            },
            {
              key: "1",
              label: "Practice",
              icon: !isContentAccessible ? "lock" : "mic-vocal",
            },
            {
              key: "2",
              label: "Test",
              icon: !isContentAccessible ? "lock" : "square-check",
            },
          ]}
          activeKey={activeStageIndex.toString()}
          onSelect={(k) => handleStepChange(parseInt(k, 10))}
        />

        {/* Main Content — child pages own their own scroll/dock. */}
        <View 
          style={styles.contentContainer}
          onLayout={(e) => {
            const width = e.nativeEvent.layout.width;
            if (width > 0) setContentWidth(width);
          }}
        >
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            scrollEnabled={isContentAccessible}
            onMomentumScrollEnd={(e) => {
              const offsetX = e.nativeEvent.contentOffset.x;
              const pageIndex = Math.round(offsetX / contentWidth);
              handleStepChange(pageIndex);
            }}
            style={{ flex: 1 }}
          >
            <View style={{ width: contentWidth }}>
              <TutorialPage
                setActiveStageIndex={handleChildStageChange}
                techniqueId={techniqueId}
              />
            </View>
            {isContentAccessible && (
              <>
                <View style={{ width: contentWidth }}>
                  <PracticePage
                    setActiveStageIndex={handleChildStageChange}
                    techniqueId={techniqueId}
                  />
                </View>
                <View style={{ width: contentWidth }}>
                  <QuizPage
                    techniqueId={techniqueId}
                    techniqueName={techniqueName}
                    from={from}
                  />
                </View>
              </>
            )}
          </ScrollView>
        </View>
      </Page>

      {/* Info Modal (dark) */}
      <Sheet visible={isModalVisible} onClose={closeModal}>
        <View style={styles.modalContent}>
          {/* Therapist Face */}
          <View style={styles.modalFaceContainer}>
            <TherapistFace width={120} height={120} />
          </View>

          <Text variant="h2" color="primary" center style={styles.modalTitle}>
            {techniqueName}
          </Text>

          <View style={styles.modalDivider}>
            <Divider />
          </View>

          <Text variant="body" color="secondary" center style={styles.modalDesc}>
            {techniqueDesc}
          </Text>

          <Button
            label="Dismiss"
            onPress={closeModal}
            style={styles.modalButton}
          />
        </View>
      </Sheet>
    </>
  );
};

export default TechniquePage;

const styles = StyleSheet.create({
  contentContainer: {
    flex: 1,
    borderRadius: radius.card,
    overflow: "hidden",
  },
  // Info sheet content
  modalContent: {
    alignItems: "center",
    paddingTop: spacing.sm,
  },
  modalFaceContainer: {
    marginBottom: spacing.xl,
  },
  modalTitle: {
    marginBottom: spacing.lg,
  },
  modalDivider: {
    width: 60,
    marginBottom: spacing.xl,
  },
  modalDesc: {
    lineHeight: 24,
    marginBottom: spacing["3xl"],
  },
  modalButton: {
    width: "100%",
    maxWidth: 280,
    alignSelf: "center",
  },
});
