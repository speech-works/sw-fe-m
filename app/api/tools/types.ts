export enum ToolType {
  DAF = "DAF",
  METRONOME = "METRONOME",
  CHORUS = "CHORUS",
}

export interface Tool {
  id: string;
  description: string;
  configuration: any;
  type: ToolType;
}
