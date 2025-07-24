import {
  DifficultyLevel,
  ExposurePracticeType,
} from "../../../../../../api/dailyPractice/types"; // Assuming this path is correct

export const scenarioData = [
  {
    id: "1",
    type: ExposurePracticeType.PHONE_CALL_SIMULATION,
    name: "Order a pizza",
    description: "Call Dominos and order a pizza for yourself.",
    difficulty: DifficultyLevel.EASY,
  },
  {
    id: "2",
    type: ExposurePracticeType.PHONE_CALL_SIMULATION,
    name: "Book a doctor's appointment",
    description: "Call your doctor's office to schedule a check-up.",
    difficulty: DifficultyLevel.MEDIUM,
  },
  {
    id: "3",
    type: ExposurePracticeType.PHONE_CALL_SIMULATION,
    name: "Customer service inquiry",
    description: "Call your internet provider about a billing issue.",
    difficulty: DifficultyLevel.HARD,
  },
  {
    id: "4",
    type: ExposurePracticeType.PHONE_CALL_SIMULATION,
    name: "Making a dinner reservation",
    description:
      "Call a restaurant to make a reservation for two people on Saturday evening.",
    difficulty: DifficultyLevel.EASY,
  },
  {
    id: "5",
    type: ExposurePracticeType.PHONE_CALL_SIMULATION,
    name: "Canceling a subscription",
    description: "Call a service provider to cancel your monthly subscription.",
    difficulty: DifficultyLevel.MEDIUM,
  },
  {
    id: "6",
    type: ExposurePracticeType.PHONE_CALL_SIMULATION,
    name: "Requesting information about a course",
    description:
      "Call a local college or institution to inquire about a specific course.",
    difficulty: DifficultyLevel.HARD,
  },
];
