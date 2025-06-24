export enum MoodType {
  ANGRY = "ANGRY",
  CALM = "CALM",
  HAPPY = "HAPPY",
  SAD = "SAD",
}

export interface MoodCheck {
  userId: string;
  mood: MoodType;
  voiceNoteUrl?: string;
  textNote?: string;
}
