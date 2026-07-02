import { RouteProp, useNavigation, useRoute } from "@react-navigation/native";
import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, ScrollView, Dimensions, StatusBar, TouchableOpacity } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { useSharedValue, useAnimatedStyle } from "react-native-reanimated";
import TherapistFace from "../../../../assets/sw-faces/TherapistFace";
import {
  LibStackNavigationProp,
  LibStackParamList,
} from "../../../../navigators/stacks/ExploreStack/LibraryStack/types";
import { useUserStore } from "../../../../stores/user";
import {
  Text,
  Button,
  IconButton,
  Divider,
  spacing,
  radius,
  Sheet,
  TabDock,
  useTheme,
  space,
  zIndex,
  PageHeader,
  Icon,
} from "../../../../design-system";
import ScreenView from "../../../../components/ScreenView";
import PracticePage from "./PracticePage";
import QuizPage from "./QuizPage";
import TutorialPage from "./TutorialPage";

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
  const [isModalVisible, setIsModalVisible] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [contentWidth, setContentWidth] = useState(Dimensions.get("window").width);
  const [headerHeight, setHeaderHeight] = useState(200);

  const scrollY_0 = useSharedValue(0);
  const scrollY_1 = useSharedValue(0);
  const scrollY_2 = useSharedValue(0);
  const activeIndexSv = useSharedValue(0);

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
                header={headerPlaceholder}
                outerScrollY={scrollY_0}
              />
            </View>
            {isContentAccessible && (
              <>
                <View style={{ width: contentWidth }}>
                  <PracticePage
                    setActiveStageIndex={handleChildStageChange}
                    techniqueId={techniqueId}
                    header={headerPlaceholder}
                    outerScrollY={scrollY_1}
                  />
                </View>
                <View style={{ width: contentWidth }}>
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
          <TouchableOpacity
            style={[styles.stickyFab, { backgroundColor: colors.action.primary, shadowColor: colors.shadow }]}
            activeOpacity={0.85}
            onPress={() => setIsModalVisible(true)}
          >
            <Icon name="info" size={24} color={colors.action.onPrimary} />
          </TouchableOpacity>
        )}
      </ScreenView>

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
  stickyFab: {
    position: "absolute",
    bottom: 110,
    right: spacing["2xl"],
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
