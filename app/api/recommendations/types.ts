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
  /**
   * Locked FOR THIS USER: show the paid badge and open the membership sheet
   * instead of the content.
   *
   * The server answers this, never the app. The app used to decide, by passing
   * a hardcoded "this is free" into TechniquePage, and so handed every free
   * user the Practice and Test stages of a paid technique. Optional because an
   * older server does not send it, and a missing answer must mean "not locked"
   * rather than locking content people can actually open.
   */
  locked?: boolean;
  /**
   * For a TECHNIQUE suggestion, the Library technique it opens.
   *
   * Sent by the server so this screen no longer needs its own
   * activity-to-technique map. That map drifted twice: once into a 404 dead
   * end, once into a screen showing one technique while teaching another.
   */
  techniqueId?: string;
}
