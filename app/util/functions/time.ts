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
