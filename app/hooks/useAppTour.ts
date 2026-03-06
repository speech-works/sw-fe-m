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

        // Forced re-start to Step 1 after a short delay
        // This forces the library to re-measure and render the mask once the UI is stable
        setTimeout(() => {
          if (start) start(1);
        }, 500);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [canStart, hasCompletedToken, start, getCurrentStep, ready]);

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
          const V_OFFSET = 120;
          const targetY = Math.max(0, layout.y - V_OFFSET);

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
        setTimeout(() => {
          try {
            if (start) start(targetOrder);
          } catch (error) {
            console.error(
              `useAppTour: Navigation error (${direction}):`,
              error,
            );
          }
        }, 500);
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
