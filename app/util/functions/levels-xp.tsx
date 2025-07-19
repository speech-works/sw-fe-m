import React, { ReactElement } from "react";
import Icon from "react-native-vector-icons/FontAwesome5";

export type LevelData = {
  totalXPToReach: number;
  levelTitle: string;
  levelDescription?: string;
  icon: (size: number) => ReactElement;
};

export const xpLevelTable: Map<number, LevelData> = new Map([
  [
    1,
    {
      totalXPToReach: 0,
      levelTitle: "Seeker",
      levelDescription: "Just beginning your journey to confident speech.",
      icon: (size) => <Icon name="seedling" size={size} color="#4caf50" />,
    },
  ],
  [
    2,
    {
      totalXPToReach: 100,
      levelTitle: "Explorer",
      levelDescription: "Starting to explore new techniques.",
      icon: (size) => <Icon name="compass" size={size} color="#2196f3" />,
    },
  ],
  [
    3,
    {
      totalXPToReach: 250,
      levelTitle: "Practitioner",
      levelDescription: "Practicing regularly and growing confident.",
      icon: (size) => <Icon name="hands-helping" size={size} color="#3f51b5" />,
    },
  ],
  [
    4,
    {
      totalXPToReach: 500,
      levelTitle: "Speaker",
      levelDescription: "You're building rhythm and flow.",
      icon: (size) => <Icon name="microphone" size={size} color="#9c27b0" />,
    },
  ],
  [
    5,
    {
      totalXPToReach: 1000,
      levelTitle: "Storyteller",
      levelDescription: "Finding your voice and telling your story.",
      icon: (size) => <Icon name="book-open" size={size} color="#ff9800" />,
    },
  ],
  [
    6,
    {
      totalXPToReach: 1800,
      levelTitle: "Communicator",
      levelDescription: "Speaking with clarity and confidence.",
      icon: (size) => <Icon name="comments" size={size} color="#00bcd4" />,
    },
  ],
  [
    7,
    {
      totalXPToReach: 3000,
      levelTitle: "Resonator",
      levelDescription: "Your words carry presence.",
      icon: (size) => <Icon name="volume-up" size={size} color="#03a9f4" />,
    },
  ],
  [
    8,
    {
      totalXPToReach: 4800,
      levelTitle: "Orator",
      levelDescription: "Speaking with impact and influence.",
      icon: (size) => <Icon name="bullhorn" size={size} color="#f44336" />,
    },
  ],
  [
    9,
    {
      totalXPToReach: 7000,
      levelTitle: "Fluent Force",
      levelDescription: "Your fluency is becoming a superpower.",
      icon: (size) => <Icon name="bolt" size={size} color="#ff5722" />,
    },
  ],
  [
    10,
    {
      totalXPToReach: 10000,
      levelTitle: "Voice Mentor",
      levelDescription: "You're an inspiration to others.",
      icon: (size) => <Icon name="user-graduate" size={size} color="#673ab7" />,
    },
  ],
  [
    11,
    {
      totalXPToReach: 13500,
      levelTitle: "Confidence Coach",
      levelDescription: "Your journey equips others to grow.",
      icon: (size) => (
        <Icon name="chalkboard-teacher" size={size} color="#795548" />
      ),
    },
  ],
  [
    12,
    {
      totalXPToReach: 18000,
      levelTitle: "Inspiration",
      levelDescription: "Your voice moves others.",
      icon: (size) => <Icon name="lightbulb" size={size} color="#ffc107" />,
    },
  ],
  [
    13,
    {
      totalXPToReach: 24000,
      levelTitle: "Speech Champion",
      levelDescription: "You own the room when you speak.",
      icon: (size) => <Icon name="medal" size={size} color="#ffb74d" />,
    },
  ],
  [
    14,
    {
      totalXPToReach: 31000,
      levelTitle: "Empowered Speaker",
      levelDescription: "Your voice empowers others.",
      icon: (size) => <Icon name="dove" size={size} color="#009688" />,
    },
  ],
  [
    15,
    {
      totalXPToReach: 40000,
      levelTitle: "Master of Voice",
      levelDescription: "Speech is your natural confidence.",
      icon: (size) => <Icon name="crown" size={size} color="#fdd835" />,
    },
  ],
]);

const getLevelData = (level: number): LevelData | undefined => {
  return xpLevelTable.get(level);
};

export const getTotalXPToReachLevel = (level: number): number => {
  const levelData = getLevelData(level);
  return levelData ? levelData.totalXPToReach : 0;
};

export const getUnlockedLevelsFromXP = (
  xp: number
): { level: number; data: LevelData }[] => {
  const unlocked: { level: number; data: LevelData }[] = [];
  let level = 1;
  let totalXP = 0;

  while (true) {
    const levelData = xpLevelTable.get(level);
    if (!levelData) break;

    totalXP += levelData.totalXPToReach;
    if (xp < totalXP) break;

    unlocked.push({ level, data: levelData });
    level++;
  }

  return unlocked;
};

export type LevelProgress = {
  currentLevel: number;
  nextLevel: number;
  progressPercent: number;
  xpIntoLevel: number;
  xpForNextLevel: number;
};

export const getProgressToNextLevel = (xp: number): LevelProgress => {
  let level = 1;

  // Find the current level
  while (true) {
    const levelData = getLevelData(level + 1);
    if (!levelData || xp < levelData.totalXPToReach) break;
    level++;
  }

  const currentLevelXP = getTotalXPToReachLevel(level);
  const nextLevelXP = getTotalXPToReachLevel(level + 1);
  const xpForNextLevel = nextLevelXP - currentLevelXP;
  const xpIntoLevel = xp - currentLevelXP;

  const progressPercent =
    xpForNextLevel > 0
      ? Math.min(Math.round((xpIntoLevel / xpForNextLevel) * 100), 100)
      : 100;

  return {
    currentLevel: level,
    nextLevel: level + 1,
    progressPercent,
    xpIntoLevel,
    xpForNextLevel,
  };
};
