/**
 * Wraps the app and watches for taps that hit nothing. See
 * `app/util/diagnostics/deadTap.ts` for why this exists and how to read the data.
 *
 * It is deliberately passive: `onTouch*` are notification props, NOT the
 * responder system, so this never competes for a gesture and cannot itself
 * cause the bug it is measuring. It renders a plain View with no styling of its
 * own beyond `flex: 1`, so it changes no layout.
 */
import React, { useCallback, useRef } from "react";
import { GestureResponderEvent, useWindowDimensions, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { noteUnansweredTap, readPressCount } from "../util/diagnostics/deadTap";

/** Past this much finger travel it is a scroll or a swipe, not a tap. */
const MOVE_TOLERANCE_PX = 12;
/** Past this long it is a long-press or a drag, not a tap. */
const MAX_TAP_MS = 600;
/** Width of the "screen edge" band, matching the design system's screenX gutter. */
const EDGE_BAND_PX = 16;

interface TouchStart {
  x: number;
  y: number;
  at: number;
  presses: number;
  moved: boolean;
}

const DeadTapDetector = ({ children }: { children: React.ReactNode }) => {
  const start = useRef<TouchStart | null>(null);
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();

  const onTouchStart = useCallback((e: GestureResponderEvent) => {
    const t = e.nativeEvent;
    start.current = {
      x: t.pageX,
      y: t.pageY,
      at: Date.now(),
      presses: readPressCount(),
      moved: false,
    };
  }, []);

  const onTouchMove = useCallback((e: GestureResponderEvent) => {
    const s = start.current;
    if (!s || s.moved) return;
    const t = e.nativeEvent;
    if (
      Math.abs(t.pageX - s.x) > MOVE_TOLERANCE_PX ||
      Math.abs(t.pageY - s.y) > MOVE_TOLERANCE_PX
    ) {
      s.moved = true;
    }
  }, []);

  const onTouchEnd = useCallback(
    (e: GestureResponderEvent) => {
      const s = start.current;
      start.current = null;
      if (!s || s.moved) return;

      const durationMs = Date.now() - s.at;
      if (durationMs > MAX_TAP_MS) return;

      // Something handled it — the overwhelmingly common case.
      if (readPressCount() !== s.presses) return;

      // NOT reported on its own — a lone unanswered tap is usually a TextInput,
      // a bare TouchableOpacity, or empty space. Only a retry cluster is sent.
      // See the header of deadTap.ts for why.
      const t = e.nativeEvent;
      noteUnansweredTap({
        x: t.pageX,
        y: t.pageY,
        screenW: width,
        screenH: height,
        durationMs,
        nearTop: t.pageY <= insets.top + 8,
        nearEdge: t.pageX <= EDGE_BAND_PX || t.pageX >= width - EDGE_BAND_PX,
      });
    },
    [width, height, insets.top],
  );

  return (
    <View
      style={{ flex: 1 }}
      onTouchStart={onTouchStart}
      onTouchMove={onTouchMove}
      onTouchEnd={onTouchEnd}
      onTouchCancel={() => {
        // A cancel means the OS or a parent took the gesture (a scroll starting,
        // a navigation swipe). Never a dead tap.
        start.current = null;
      }}
    >
      {children}
    </View>
  );
};

export default DeadTapDetector;
