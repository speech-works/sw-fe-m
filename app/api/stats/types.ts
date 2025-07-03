export type PracticeStatSummary = {
  contentType: string;
  itemsCompleted: number;
  totalTime: number;
};

export type WeeklyStat = {
  /** Local‐timezone ISO date at 00:00 for each day */
  date: string;
  /** Total minutes for that day */
  totalTime: number;
};
