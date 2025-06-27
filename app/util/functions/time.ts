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

export const formatDuration = (minutes: number | undefined): string => {
  if (minutes === undefined || isNaN(minutes)) return "0m";

  if (minutes < 60) {
    return `${Math.round(minutes)}m`;
  } else if (minutes < 1440) {
    // less than 24 hours
    const hours = minutes / 60;
    return `${Math.round(hours)}h`;
  } else {
    const days = minutes / 1440;
    return `${Math.round(days)}d`;
  }
};
