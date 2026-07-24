import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, ScrollView, Dimensions, StatusBar } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useSharedValue, useAnimatedStyle } from "react-native-reanimated";
import {
  LibStackNavigationProp,
  LibStackParamList,
} from "../../../../navigators/stacks/ExploreStack/LibraryStack/types";
import { useUserStore } from "../../../../stores/user";
import {
  Text,
  Button,
  Divider,
  Gradient,
  Icon,
  icons,
  spacing,
  radius,
  Sheet,
  TabDock,
  useTheme,
  space,
  zIndex,
  PageHeader,
  FloatingControls,
} from "../../../../design-system";
import ScreenView from "../../../../components/ScreenView";
import PracticePage from "./PracticePage";
import QuizPage from "./QuizPage";
import TutorialPage from "./TutorialPage";
import {
  getTechniqueProgress,
  markTechniqueStage,
  TechniqueProgress,
  TechniqueStage,
} from "../../../../api/library";

const STAGE_BY_INDEX: TechniqueStage[] = ["learn", "practice", "test"];

const TechniquePage = () => {
  const { user } = useUserStore();
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<RouteProp<LibStackParamList, "TechniquePage">>();

  const { techniqueId, techniqueName, techniqueDesc, stage, hasFree, from } =
    route.params;

  const [activeStageIndex, setActiveStageIndex] = useState(0);
  const [progress, setProgress] = useState<TechniqueProgress | null>(null);
  const [isModalVisible, setIsModalVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [contentWidth, setContentWidth] = useState(Dimensions.get("window").width);
  const [contentHeight, setContentHeight] = useState(Dimensions.get("window").height);
  const [headerHeight, setHeaderHeight] = useState(200);

  const scrollY_0 = useSharedValue(0);
  const scrollY_1 = useSharedValue(0);
  const scrollY_2 = useSharedValue(0);
  const activeIndexSv = useSharedValue(0);

  const isContentAccessible = user?.isPaid || hasFree;
  const closeModal = () => setIsModalVisible(false);

  // A stage counts as done once you leave it (soft, not a gate). Local state
  // updates immediately so the checkmark appears without waiting on the POST.
  const markStageDone = (index: number) => {
    const stage = STAGE_BY_INDEX[index];
    if (!stage) return;
    const key =
      stage === "learn"
        ? "learnCompleted"
        : stage === "practice"
          ? "practiceCompleted"
          : "quizCompleted";
    setProgress((p) =>
      p
        ? { ...p, [key]: true }
        : {
            techniqueId,
            learnCompleted: stage === "learn",
            practiceCompleted: stage === "practice",
            quizCompleted: stage === "test",
            quizScore: null,
          },
    );
    markTechniqueStage(techniqueId, stage).catch((e) =>
      console.error("Failed to mark technique stage", e),
    );
  };

  const handleStepChange = (index: number) => {
    if (index > 0 && !isContentAccessible) {
      return;
    }
    // Leaving a stage you actually visited marks it complete.
    if (index !== activeStageIndex && isContentAccessible) {
      markStageDone(activeStageIndex);
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
    activeIndexSv.value = activeStageIndex;
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

  // Load progress, and — unless a specific stage was requested — land the user
  // on the first stage they haven't finished (soft guidance toward the path,
  // never a lock). Learn stays the default for a fresh technique.
  useEffect(() => {
    let cancelled = false;
    getTechniqueProgress(techniqueId)
      .then((p) => {
        if (cancelled) return;
        setProgress(p);
        if (!stage && isContentAccessible) {
          const firstIncomplete = !p.learnCompleted
            ? 0
            : !p.practiceCompleted
              ? 1
              : !p.quizCompleted
                ? 2
                : 0;
          setActiveStageIndex(firstIncomplete);
        }
      })
      .catch((e) => console.error("Failed to load technique progress", e));
    return () => {
      cancelled = true;
    };
  }, [techniqueId]);

  const stageDone = [
    !!progress?.learnCompleted,
    !!progress?.practiceCompleted,
    !!progress?.quizCompleted,
  ];

  const topPad = insets.top + space.inlineGap;

  const headerStyle = useAnimatedStyle(() => {
    let currentY = 0;
    if (activeIndexSv.value === 0) currentY = scrollY_0.value;
    else if (activeIndexSv.value === 1) currentY = scrollY_1.value;
    else if (activeIndexSv.value === 2) currentY = scrollY_2.value;

    return {
      transform: [{ translateY: -Math.max(0, currentY) }]
    };
  });

  const realHeader = (
    <Animated.View 
      style={[{ position: 'absolute', top: 0, left: 0, right: 0, zIndex: zIndex.sticky - 1 }, headerStyle]}
      pointerEvents="box-none"
      onLayout={(e) => setHeaderHeight(e.nativeEvent.layout.height)}
    >
      <View style={{ paddingTop: topPad, paddingBottom: spacing.lg, paddingHorizontal: space.screenX, backgroundColor: colors.background.canvas }}>
        <PageHeader
          title={techniqueName}
          onBack={() =>
            from === "MOOD_CHECK"
              ? navigation.navigate("Root" as any, { screen: "HOME" })
              : navigation.navigate("Library", { from })
          }
        />
        <View style={{ marginTop: space.titleGap }}>
          <TabDock
            inline
            fitContent
            accessibilityLabel="Technique stages"
            items={[
              {
                key: "0",
                label: "Learn",
                // A completed stage shows a check — the visible spine of the
                // soft-guided path.
                icon: stageDone[0] ? "circle-check" : "play",
              },
              {
                key: "1",
                label: "Practice",
                icon: !isContentAccessible
                  ? "lock"
                  : stageDone[1]
                    ? "circle-check"
                    : "mic-vocal",
              },
              {
                key: "2",
                label: "Test",
                icon: !isContentAccessible
                  ? "lock"
                  : stageDone[2]
                    ? "circle-check"
                    : "square-check",
              },
            ]}
            activeKey={activeStageIndex.toString()}
            onSelect={(k) => handleStepChange(parseInt(k, 10))}
          />
        </View>
      </View>
    </Animated.View>
  );

  const headerPlaceholder = <View style={{ height: headerHeight }} />;

  return (
    <>
      <ScreenView style={{ backgroundColor: colors.background.canvas, flex: 1 }}>
        <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />

        {insets.top > 0 ? (
          <View
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              height: insets.top,
              backgroundColor: colors.background.canvas,
              zIndex: zIndex.sticky,
            }}
          />
        ) : null}

        {realHeader}

        {/* Main Content — child pages own their own scroll/dock. */}
        <View
          style={styles.contentContainer}
          onLayout={(e) => {
            const { width, height } = e.nativeEvent.layout;
            if (width > 0) setContentWidth(width);
            if (height > 0) setContentHeight(height);
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
            // Without these the row's cross-axis is auto-sized, so each page — and
            // the vertical ScrollView inside it — has no definite viewport height.
            // The inner scroll then under-reports its content and long items become
            // unscrollable past a screen or two.
            contentContainerStyle={styles.pagerContent}
          >
            <View style={[styles.page, { width: contentWidth, height: contentHeight }]}>
              <TutorialPage
                setActiveStageIndex={handleChildStageChange}
                techniqueId={techniqueId}
                header={headerPlaceholder}
                outerScrollY={scrollY_0}
              />
            </View>
            {isContentAccessible && (
              <>
                <View style={[styles.page, { width: contentWidth, height: contentHeight }]}>
                  <PracticePage
                    setActiveStageIndex={handleChildStageChange}
                    techniqueId={techniqueId}
                    header={headerPlaceholder}
                    outerScrollY={scrollY_1}
                  />
                </View>
                <View style={[styles.page, { width: contentWidth, height: contentHeight }]}>
                  <QuizPage
                    techniqueId={techniqueId}
                    techniqueName={techniqueName}
                    from={from}
                    header={headerPlaceholder}
                    outerScrollY={scrollY_2}
                  />
                </View>
              </>
            )}
          </ScrollView>
        </View>

        {activeStageIndex === 0 && (
          <FloatingControls
            items={[
              {
                icon: "info",
                onPress: () => setIsModalVisible(true),
                accessibilityLabel: "About this technique",
              },
            ]}
          />
        )}
      </ScreenView>

      {/* Info Modal (dark) */}
      <Sheet visible={isModalVisible} onClose={closeModal}>
        <View style={styles.modalContent}>
          {/* Decorative brand disc — same 120px slot the therapist face held.
              Dark glyph on a bright fill, per the on-bright contrast rule. */}
          <View style={styles.modalFaceContainer}>
            <Gradient token="brandSoft" style={styles.modalDisc}>
              <Icon name={icons.info} size={44} color={colors.action.onPrimary} />
            </Gradient>
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
  // No radius/overflow mask here: it buys nothing visually (the pages are full-bleed
  // on the canvas) and the mask layer clips very tall page content on iOS.
  contentContainer: {
    flex: 1,
  },
  // The paging row fills the pager's height, and every page stretches to it, so each
  // stage's own scroll view has a real viewport to measure its content against.
  pagerContent: {
    flexGrow: 1,
  },
  page: {
    alignSelf: "stretch",
  },
  // Info sheet content
  modalContent: {
    alignItems: "center",
    paddingTop: spacing.sm,
  },
  modalFaceContainer: {
    marginBottom: spacing.xl,
  },
  modalDisc: {
    width: 120,
    height: 120,
    borderRadius: radius.full,
    alignItems: "center",
    justifyContent: "center",
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
