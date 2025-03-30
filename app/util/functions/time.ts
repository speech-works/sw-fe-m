// Calculates seconds remaining until midnight (local time)
export const getSecondsUntilMidnight = (): number => {
  const now = new Date();
  // Create a new date for tomorrow at 00:00:00
  const midnight = new Date(now);
  midnight.setHours(24, 0, 0, 0);
  // Calculate the difference in milliseconds and convert to seconds
  const secondsRemaining = Math.floor(
    (midnight.getTime() - now.getTime()) / 1000
  );
  return secondsRemaining;
};
