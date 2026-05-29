import type { PracticeActivityContentType } from "../practiceActivities/types";

export type PracticeCategoryProgressWindow = {
  completedCount: number;
  totalMinutes: number;
};

export type PracticeCategorySummaryItem = {
  contentType: PracticeActivityContentType;
  weekly: PracticeCategoryProgressWindow;
  lifetime: PracticeCategoryProgressWindow;
};

export type PracticeCategorySummaryResponse = {
  categories: PracticeCategorySummaryItem[];
  comparisonLabel: string;
};
