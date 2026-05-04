export interface PracticeSuggestion {
  id: string;
  contentType:
    | "READING_PRACTICE"
    | "COGNITIVE_PRACTICE"
    | "FUN_PRACTICE"
    | "EXPOSURE_PRACTICE";
  activityType: string;
  title: string;
  description: string;
  priority: number;
  difficulty: string;
  dominantPhoneme?: string;
}
