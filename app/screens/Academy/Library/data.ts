export const libraryData: Array<Library> = [
  {
    category: "I. Stuttering Modification",
    techniques: [
      {
        id: "t1",
        name: "Identification",
        desc: "Learn to identify your stuttering patterns",
        level: "Beginner",
      },
      {
        id: "t2",
        name: "Pull-Outs",
        // Was "for smoother speech" — the only desc in this file that named an
        // outcome rather than the act. Its siblings all describe what you do
        // ("Learn to identify your stuttering patterns", "Practice gentle voice
        // initiation"); this one promised a result we don't measure.
        desc: "Learn to ease out of a block mid-word",
        level: "Intermediate",
      },
    ],
  },
  {
    category: "II. Fluency Shaping",
    techniques: [
      {
        id: "t3",
        name: "Easy Onset",
        desc: "Practice gentle voice initiation",
        level: "Intermediate",
      },
      {
        id: "t4",
        name: "Pull-Outs",
        // Was "for smoother speech" — the only desc in this file that named an
        // outcome rather than the act. Its siblings all describe what you do
        // ("Learn to identify your stuttering patterns", "Practice gentle voice
        // initiation"); this one promised a result we don't measure.
        desc: "Learn to ease out of a block mid-word",
        level: "Intermediate",
      },
    ],
  },
];

export type Library = {
  category: string;
  techniques: Array<Technique>;
};

export type Technique = {
  id: string;
  name: string;
  desc: string;
  level: string;
};
