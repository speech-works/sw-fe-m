import { createNativeStackNavigator } from "@react-navigation/native-stack";
import React from "react";
import Breathing from "../screens/Academy/DailyPractice/pages/CognitivePractice/Breathing";
import FirstCall from "../screens/FirstCall";

const Stack = createNativeStackNavigator();

/**
 * The once-in-a-lifetime call, taken IMMEDIATELY after signup.
 *
 * It exists for one path: somebody said yes to the call before they had an
 * account. Making them answer the rest of onboarding first would be a
 * bait-and-switch on the sequence they just agreed to — and it buys nothing,
 * because the caller is matched from the two Act 1 answers they have already
 * given. The remaining questions cannot improve the match.
 *
 * Deliberately its own navigator rather than a screen inside the onboarding
 * stack: nothing else in the app is mounted at this point, so this is the whole
 * world for a few minutes and it needs to contain everything the flow can
 * reach.
 *
 * WHICH IS WHY BREATHING IS HERE. The check-in after the call offers a minute
 * of breathing to anyone who says "that was a lot", and that offer has to be
 * honoured in the moment — deferring it until after twelve onboarding
 * questions is the same as not making it. `ExploreStack`, where Breathing
 * normally lives, does not exist yet.
 */
export default function FirstCallNavigator({
  onFinished,
}: {
  /** The flow is over, by any route: taken, declined, deferred, or failed. */
  onFinished: () => void;
}) {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      {/* Gesture-locked: an incoming call is not a page you swipe away from,
          and there is nothing behind it to swipe back to. */}
      <Stack.Screen name="FirstCall" options={{ gestureEnabled: false }}>
        {() => <FirstCall standalone onFinished={onFinished} />}
      </Stack.Screen>
      <Stack.Screen name="Breathing" component={Breathing} />
    </Stack.Navigator>
  );
}
