export interface Phoneme {
  code: string;
  displayLabel: string;
  ipaSymbol: string;
  exampleWord: string;
  examples: string[];
  audioUrl: string | null;
}
