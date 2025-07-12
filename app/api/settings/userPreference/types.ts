export enum PracticeGoalType {
  TIME_BASED = "TIME_BASED",
  TASK_BASED = "TASK_BASED",
}

export type UserPreference = {
  id: string;
  practiceReminderTime: string;
  practiceGoalType: PracticeGoalType;
  dailyPracticeLimitMinutes: number;
  dailyTaskCount: number;
  createdAt: string;
  updatedAt: string;
};

export type UpdateUserPreferencePayload = Partial<{
  practiceReminderTime: Date;
  practiceGoalType: PracticeGoalType;
  dailyPracticeLimitMinutes: number;
  dailyTaskCount: number;
}>;
