/**
 * The one line shown under the weekly mood chart.
 *
 * Three rules hold for every branch, and two of them were being broken:
 *
 *  1. NEVER TIE MOOD TO SPEECH. Two branches used to end on a speech outcome:
 *     "This mindset supports confident speech" and "an excellent foundation for
 *     smoother speech". Both make fluency the payoff, which is the metric this
 *     product refuses to keep, and both imply emotional state is what drives
 *     stammering. It isn't. Mood tracking earns its place on its own.
 *  2. Permission, not prescription. "Try pausing, breathing, and using your
 *     techniques" and "Take small steps, revisit calming techniques, and
 *     prioritize your well-being" stack imperatives onto someone who just told
 *     us they had a bad week. Say what is allowed, not what to do.
 *  3. No em dashes, and keep it to a line. This sits in a summary card.
 */
export const getMoodRemark = (moodStats: Record<string, number>): string => {
  const { HAPPY = 0, CALM = 0, SAD = 0, ANGRY = 0 } = moodStats;

  const positiveScore = HAPPY + CALM;
  const negativeScore = SAD + ANGRY;

  if (positiveScore === 0 && negativeScore === 0) {
    return "Log your mood for a week and this starts telling you something.";
  }

  if (positiveScore >= 70) {
    return "A mostly good week. Worth noticing those, not just the hard ones.";
  }

  if (HAPPY >= 40 && SAD >= 30) {
    return "Ups and downs this week. That's normal, and both are worth logging.";
  }

  if (CALM >= 50 && ANGRY + SAD <= 30) {
    return "A calm week. That's a good place to practice from.";
  }

  if (SAD >= 40) {
    return "A heavy week. It's okay to feel this way, and you're not alone in it.";
  }

  if (ANGRY >= 40) {
    return "Frustration ran high this week. You're allowed to log that and leave it there.";
  }

  if (SAD + ANGRY >= 60 && positiveScore < 30) {
    return "A tough week emotionally. Small counts, and rest counts too.";
  }

  if (positiveScore >= 30 && negativeScore >= 30) {
    return "A mix of moods. That's human.";
  }

  return "Keep logging. Over time it shows you patterns you'd otherwise miss.";
};
