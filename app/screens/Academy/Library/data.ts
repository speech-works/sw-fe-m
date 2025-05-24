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
        desc: "Learn pull-out technique for smoother speech",
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
        desc: "Learn pull-out technique for smoother speech",
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
