import { useEffect, useState } from "react";
import { DeviceEventEmitter, ScrollView, Dimensions } from "react-native";
import { useTourGuideController } from "rn-tourguide";
import { useTourStore } from "../stores/tour";

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get("window");

const V_OFFSET = 150; // Standard offset to center spotlight reasonably

interface ScrollRefs {
  vertical?: React.RefObject<ScrollView | null>;
  horizontal?: React.RefObject<ScrollView | null>;
}

interface ZoneLayouts {
  [key: number]: {
    y: number;
    height: number;
    x: number;
    width: number;
  };
}

export const useAppTour = (
  tourKey: "home" | "explore",
  scrollRefs: ScrollRefs,
  zoneLayouts: React.RefObject<ZoneLayouts>,
  ready: boolean = true,
) => {
  const { start, canStart, stop, eventEmitter, getCurrentStep } =
    useTourGuideController();
  const {
    hasCompletedHomeTour,
    hasCompletedExploreTour,
    setHasCompletedHomeTour,
    setHasCompletedExploreTour,
    setActiveTour,
  } = useTourStore();

  const [isActive, setIsActive] = useState(false);

  const hasCompletedToken =
    tourKey === "home" ? hasCompletedHomeTour : hasCompletedExploreTour;
  const setCompleted =
    tourKey === "home" ? setHasCompletedHomeTour : setHasCompletedExploreTour;

  useEffect(() => {
    if (canStart && !hasCompletedToken && !getCurrentStep() && ready) {
      const timer = setTimeout(() => {
        // Initial start to initialize the state
        start();

        // If the first zone isn't available (e.g. no carousel), skip to step 3
        const startingStep =
          tourKey === "home" && !zoneLayouts.current?.[1] ? 3 : 1;
        const maxSteps = tourKey === "home" ? 8 : 3;

        setTimeout(() => {
          if (start) {
            setActiveTour(tourKey, maxSteps);
            start(startingStep);
          }
        }, 800);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [
    canStart,
    hasCompletedToken,
    start,
    getCurrentStep,
    ready,
    tourKey,
    setActiveTour,
  ]);

  useEffect(() => {
    if (!eventEmitter) return;

    const handleStart = () => {
      setIsActive(true);
    };
    const handleStop = () => {
      setIsActive(false);
      setCompleted(true);
    };

    eventEmitter.on("start", handleStart);
    eventEmitter.on("stop", handleStop);

    return () => {
      eventEmitter.off("start", handleStart);
      eventEmitter.off("stop", handleStop);
    };
  }, [eventEmitter, setCompleted]);

  useEffect(() => {
    const handleNavigation = (direction: "next" | "prev", data: any) => {
      const { currentStep } = data || {};
      if (!currentStep) return;

      const targetOrder =
        direction === "next" ? currentStep.order + 1 : currentStep.order - 1;
      const layout = zoneLayouts.current?.[targetOrder];

      if (layout) {
        // Vertical Scroll Logic
        if (scrollRefs.vertical?.current) {
          // Refined lift: -100px for Step 7 (elevated), -200px for Step 8 (extreme)
          let stepVOffset = 20;
          if (tourKey === "home") {
            stepVOffset =
              targetOrder === 7 ? -100 : targetOrder === 8 ? -200 : 20;
          } else {
            // Explore Screen Offsets (1-4)
            // Centering: Increase offset to reveal more around the component
            stepVOffset = 100;
          }
          const targetY = Math.max(0, layout.y - stepVOffset);

          scrollRefs.vertical.current.scrollTo({
            y: targetY,
            animated: true,
          });
        }

        // Horizontal Scroll Logic
        if (scrollRefs.horizontal?.current && layout.x !== undefined) {
          const targetX = Math.max(
            0,
            layout.x - (SCREEN_WIDTH - layout.width) / 2,
          );

          scrollRefs.horizontal.current.scrollTo({
            x: targetX,
            animated: true,
          });
        }

        // Wait for animation to finish before calling the library's navigation handler
        setIsActive(true);
        const navigationDelay = tourKey === "explore" ? 1500 : 800;
        setTimeout(() => {
          try {
            if (start) start(targetOrder);
          } catch (error) {
            console.error(
              `useAppTour: Navigation error (${direction}):`,
              error,
            );
          }
        }, navigationDelay);
      } else {
        // Fallback if layout not captured
        try {
          if (start) start(targetOrder);
        } catch (error) {
          console.error(
            `useAppTour: Fallback navigation error (${direction}):`,
            error,
          );
        }
      }
    };

    const nextSub = DeviceEventEmitter.addListener("tour:next", (data) => {
      handleNavigation("next", data);
    });
    const prevSub = DeviceEventEmitter.addListener("tour:prev", (data) => {
      handleNavigation("prev", data);
    });

    return () => {
      nextSub.remove();
      prevSub.remove();
    };
  }, [scrollRefs, zoneLayouts]);

  return {
    isActive,
    stop,
    start,
    getCurrentStep,
  };
};
