import {
  DifficultyLevel,
  ExposurePracticeType,
} from "../../../../../../api/dailyPractice/types";

export const scenarioData = [
  {
    id: "1",
    type: ExposurePracticeType.PHONE_CALL_SIMULATION,
    name: "Order a pizza",
    description: "Call Dominos and order a pizza for yourself.",
    difficulty: DifficultyLevel.EASY,
    icon: "pizza-slice", // 🍕
  },
  {
    id: "2",
    type: ExposurePracticeType.PHONE_CALL_SIMULATION,
    name: "Book a doctor's appointment",
    description: "Call your doctor's office to schedule a check-up.",
    difficulty: DifficultyLevel.MEDIUM,
    icon: "user-md", // 🧑‍⚕️
  },
  {
    id: "3",
    type: ExposurePracticeType.PHONE_CALL_SIMULATION,
    name: "Customer service inquiry",
    description: "Call your internet provider about a billing issue.",
    difficulty: DifficultyLevel.HARD,
    icon: "headset", // 🎧
  },
  {
    id: "4",
    type: ExposurePracticeType.PHONE_CALL_SIMULATION,
    name: "Making a dinner reservation",
    description:
      "Call a restaurant to make a reservation for two people on Saturday evening.",
    difficulty: DifficultyLevel.EASY,
    icon: "concierge-bell", // 🛎️
  },
  {
    id: "5",
    type: ExposurePracticeType.PHONE_CALL_SIMULATION,
    name: "Canceling a subscription",
    description: "Call a service provider to cancel your monthly subscription.",
    difficulty: DifficultyLevel.MEDIUM,
    icon: "file-signature", // ✍️
  },
  {
    id: "6",
    type: ExposurePracticeType.PHONE_CALL_SIMULATION,
    name: "Requesting information about a course",
    description:
      "Call a local college or institution to inquire about a specific course.",
    difficulty: DifficultyLevel.HARD,
    icon: "graduation-cap", // 🎓
  },
  {
    id: "7",
    type: ExposurePracticeType.PHONE_CALL_SIMULATION,
    name: "Report a lost item",
    description: "Call a public library to ask if they found your lost wallet.",
    difficulty: DifficultyLevel.MEDIUM,
    icon: "search", // 🔍
  },
  {
    id: "8",
    type: ExposurePracticeType.PHONE_CALL_SIMULATION,
    name: "Phone screen for a job",
    description: "Participate in a preliminary job interview over the phone.",
    difficulty: DifficultyLevel.HARD,
    icon: "briefcase", // 💼
  },
  {
    id: "9",
    type: ExposurePracticeType.PHONE_CALL_SIMULATION,
    name: "Get movie showtimes",
    description: "Call a cinema to ask for the showtimes of a new movie.",
    difficulty: DifficultyLevel.EASY,
    icon: "film", // 🎬
  },
  {
    id: "10",
    type: ExposurePracticeType.PHONE_CALL_SIMULATION,
    name: "Call into a radio show",
    description: "Call a talk radio show to share your opinion on a topic.",
    difficulty: DifficultyLevel.HARD,
    icon: "microphone-alt", // 🎙️
  },
];
