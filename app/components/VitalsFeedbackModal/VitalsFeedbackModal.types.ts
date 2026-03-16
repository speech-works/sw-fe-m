export interface VitalsFeedbackModalProps {
  visible: boolean;
  onSubmit: (vitals: {
    effortScore: number;
    autonomyScore: number;
    accuracyScore?: number;
  }) => void;
  onSkip: () => void;
  showAccuracy?: boolean;
}
