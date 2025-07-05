export const getMoodRemark = (moodStats: Record<string, number>): string => {
  const { HAPPY = 0, CALM = 0, SAD = 0, ANGRY = 0 } = moodStats;

  const positiveScore = HAPPY + CALM;
  const negativeScore = SAD + ANGRY;

  if (positiveScore === 0 && negativeScore === 0) {
    return "Let's start tracking your moods regularly to better understand your journey.";
  }

  if (positiveScore >= 70) {
    return "You've had a mostly positive week emotionally. This mindset supports confident speech. Keep going!";
  }

  if (HAPPY >= 40 && SAD >= 30) {
    return "It looks like you've had some emotional ups and downs. That's perfectly normal. Continue your practices and be kind to yourself.";
  }

  if (CALM >= 50 && ANGRY + SAD <= 30) {
    return "You've maintained a calm attitude this week — an excellent foundation for smoother speech. Well done!";
  }

  if (SAD >= 40) {
    return "You've reported feeling quite sad this week. Remember, it's okay to feel this way. Practice self-care and reach out if needed — you're not alone.";
  }

  if (ANGRY >= 40) {
    return "It seems frustration was high this week. Try pausing, breathing, and using your techniques when things feel overwhelming.";
  }

  if (SAD + ANGRY >= 60 && positiveScore < 30) {
    return "This has been an emotionally tough week. Take small steps, revisit calming techniques, and prioritize your well-being.";
  }

  if (positiveScore >= 30 && negativeScore >= 30) {
    return "You’ve had a mix of moods — that’s human. Keep practicing, and celebrate your progress no matter how small.";
  }

  return "Keep observing your emotions — they give you clues to improve not just speech but overall wellness. You're making progress.";
};
