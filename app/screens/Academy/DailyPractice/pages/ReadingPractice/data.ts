import { SemanticColors } from "../../../../../design-system";

export type ReadingAccent = Extract<keyof SemanticColors["accent"], string>;

export const readingPracticeAccents = {
  word: "info",
  phrase: "success",
  quote: "warning",
  poem: "purple",
  story: "danger",
  // `lime` is the one accent role the reading cards had not claimed, so the
  // speech card gets its own hue rather than doubling up with another.
  speech: "lime",
} as const satisfies Record<string, ReadingAccent>;

export const readingTips = {
  speech: [
    "Speak to the back of the room. Projection steadies the breath and slows you down.",
    "Mark your pauses first. Oratory is written around them, so read to the cadence rather than only to the punctuation.",
    "Land the stressed word in each phrase. Letting it carry the line takes pressure off the first sound.",
    "Stand if you can. Posture opens the airway and changes how the passage feels to say.",
  ],
  story: [
    "Visualize the story. This makes your reading more natural and expressive.",
    "Don’t rush. Focus on reading in short, meaningful phrases rather than one word at a time.",
    "Use punctuation to guide your breath. Commas, periods, and dialogue breaks are natural pause points.",
    "Read aloud twice. The first read builds familiarity. The second helps the phrasing feel more natural.",
  ],
  poem: [
    "Follow the rhythm. Let the natural beat of the poem guide your pace.",
    "Respect line breaks and pauses that feel right for the tone. Poetry doesn’t always follow grammar rules.",
    "Gently elongate words that carry emotion or emphasis to improve expressiveness.",
    "Try choral reading. Read along with a recorded version to build confidence and internalize the flow.",
    "Poems allow space to breathe. Take your time. Each line is a moment to reset.",
  ],
  quote: [
    "Read with intention.Understand the meaning before you speak. Let it guide your tone and delivery",
    "Use a calm, steady pace. Avoid rushing. Even short quotes deserve breathing space.",
    "Practice emphasis. Try reading the same quote multiple times, stressing different words to explore meaning and rhythm.",
    "Record & reflect. Listening back to your quote readings can help track progress and reinforce positive speech patterns.",
  ],
  word: [
    "Focus on soft starts. Gently ease into the first sound of each word to reduce tension.",
    "Visualize the airflow. Imagine your breath carrying the word forward without interruption.",
    "Practice light contact. Keep your articulators (lips, tongue, teeth) loose and relaxed as you speak.",
    "Don't over-rehearse. Trust your techniques and move naturally from one word to the next.",
  ],
  phrase: [
    "Chunk your speech. Group words into short, natural phrases to maintain a steady rhythm.",
    "Use strategic pauses. Brief pauses between phrases give you time to reset and breathe.",
    "Maintain continuous phonation. Keep your vocal cords vibrating gently throughout the phrase.",
    "Emphasize the keywords. Focus on the core meaning of the phrase to guide your delivery.",
  ],
};
