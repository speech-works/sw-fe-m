import Onboardingquestion from "../components/OnBoarding/OnboardingQuestion";

export const questions: Onboardingquestion[] = [
  {
    id: "q1",
    question: "How would you describe your stuttering pattern?",
    options: [
      {
        id: "q1a1",
        answer: "Mild",
        description: "occasional repetitions or blocks",
      },
      {
        id: "q1a2",
        answer: "Moderate",
        description: "frequent repetitions/blocks in certain situations",
      },
      {
        id: "q1a3",
        answer: "Severe",
        description: "blocks or prolongations in most speaking situations",
      },
      {
        id: "q1a4",
        answer: "I’m not sure",
        description: " I haven’t had it officially assessed",
      },
    ],
    description: "Select the option that best describes your stutter.",
  },
  {
    id: "q2",
    question: "Where are you in your speech journey?",
    options: [
      {
        id: "q2a1",
        answer: "I often feel frustrated",
        description: "Looking for ways to manage speech- related stress",
      },
      {
        id: "q2a2",
        answer: "I'm learning to accept",
        description: "Working on self-acceptance and confidence",
      },
      {
        id: "q2a3",
        answer: "I don't think much about it",
        description: "Seeking general support and resources",
      },
      {
        id: "q2a4",
        answer: "I want to focus on improving fluency",
        description: "Ready to work on specific techniques",
      },
      {
        id: "q2a5",
        answer: "I'm ready to lead others",
        description: "Want to help and inspire others",
      },
    ],
    description: "Select the option that best describes your current feelings.",
  },
];
