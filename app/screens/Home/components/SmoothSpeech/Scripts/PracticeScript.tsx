import { StyleSheet, Text, View } from "react-native";
import React from "react";
import { parseTextStyle } from "../../../../../util/functions/parseFont";
import { theme } from "../../../../../Theme/tokens";

const PracticeScript = () => {
  return (
    <Text style={styles.textStyle}>
      But we refuse to believe that the bank of justice is bankrupt. We refuse
      to believe that there are insufficient funds in the great vaults of
      opportunity of this nation. And so we've come to cash this check, a check
      that will give us upon demand the riches of freedom and the security of
      justice. We have also come to this hallowed spot to remind America of the
      fierce urgency of now. This is no time to engage in the luxury of cooling
      off or to take the tranquilizing drug of gradualism. Now is the time to
      make real the promises of democracy. Now is the time to rise from the dark
      and desolate valley of segregation to the sunlit path of racial justice.
      Now is the time to lift our nation from the quick sands of racial
      injustice to the solid rock of brotherhood. Now is the time to make
      justice a reality for all of God's children. It would be fatal for the
      nation to overlook the urgency of the moment. This sweltering summer of
      the Negro's legitimate discontent will not pass until there is an
      invigorating autumn of freedom and equality. 1963 is not an end, but a
      beginning. Those who hope that the Negro needed to blow off steam and will
      now be content will have a rude awakening if the nation returns to
      business as usual. There will be neither rest nor tranquility in America
      until the Negro is granted his citizenship rights. The whirlwinds of
      revolt will continue to shake the foundations of our nation until the
      bright day of justice emerges. But there is something that I must say to
      my people who stand on the warm threshold which leads into the palace of
      justice. In the process of gaining our rightful place, we must not be
      guilty of wrongful deeds. Let us not seek to satisfy our thirst for
      freedom by drinking from the cup of bitterness and hatred. We must forever
      conduct our struggle on the high plane of dignity and discipline. We must
      not allow our creative protest to degenerate into physical violence. Again
      and again, we must rise to the majestic heights of meeting physical force
      with soul force. The marvelous new militancy which has engulfed the Negro
      community must not lead us to a distrust of all white people, for many of
      our white brothers, as evidenced by their presence here today, have come
      to realize that their destiny is tied up with our destiny.
    </Text>
  );
};

export default PracticeScript;

const styles = StyleSheet.create({
  textStyle: {
    ...parseTextStyle(theme.typography.paragraphXSmall.regular),
  },
});
