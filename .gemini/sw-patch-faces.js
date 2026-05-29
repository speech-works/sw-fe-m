const fs = require("fs");
const glob = require("glob"); // npm install glob if needed, but we can just pass the list

const files = [
  "app/assets/sw-faces/AuthorFace.tsx",
  "app/assets/sw-faces/BreathingFace.tsx",
  "app/assets/sw-faces/DiverseCommunityFace.tsx",
  "app/assets/sw-faces/ErrorFace.tsx",
  "app/assets/sw-faces/ExplorerFace.tsx",
  "app/assets/sw-faces/ExposureFace.tsx",
  "app/assets/sw-faces/GamerFace.tsx",
  "app/assets/sw-faces/GuidedBreathingFace.tsx",
  "app/assets/sw-faces/HappyScreamFace.tsx",
  "app/assets/sw-faces/HeadphoneFace.tsx",
  "app/assets/sw-faces/IceSportFace.tsx",
  "app/assets/sw-faces/InterviewFace.tsx",
  "app/assets/sw-faces/KeyholeFace.tsx",
  "app/assets/sw-faces/ListenerFace.tsx",
  "app/assets/sw-faces/MaskedFace.tsx",
  "app/assets/sw-faces/MovieFace.tsx",
  "app/assets/sw-faces/OnCallFace.tsx",
  "app/assets/sw-faces/PilotFace.tsx",
  "app/assets/sw-faces/PoetFace.tsx",
  "app/assets/sw-faces/ReportFace.tsx",
  "app/assets/sw-faces/RewiringFace.tsx",
  "app/assets/sw-faces/RoboticPhoneFace.tsx",
  "app/assets/sw-faces/StorytellerFace.tsx",
  "app/assets/sw-faces/TherapistFace.tsx",
  "app/assets/sw-faces/TongueTwisterFace.tsx",
  "app/assets/sw-faces/WiseFace.tsx",
  "app/assets/mood-check/AgentFace.tsx",
  "app/assets/mood-check/Angry1.tsx",
  "app/assets/mood-check/AnnoyedFace.tsx",
  "app/assets/mood-check/Calm1.tsx",
  "app/assets/mood-check/ConfusedFace.tsx",
  "app/assets/mood-check/CoolFace.tsx",
  "app/assets/mood-check/CuriousFace.tsx",
  "app/assets/mood-check/FinishLineFace.tsx",
  "app/assets/mood-check/Happy1.tsx",
  "app/assets/mood-check/InspectorFace.tsx",
  "app/assets/mood-check/LoveFace.tsx",
  "app/assets/mood-check/OverwhelmedFace.tsx",
  "app/assets/mood-check/ReaderFace.tsx",
  "app/assets/mood-check/Sad1.tsx",
  "app/assets/mood-check/SleepyFace.tsx",
  "app/assets/mood-check/TargetFace.tsx",
  "app/assets/mood-check/ThinkerFace.tsx",
  "app/assets/mood-check/WarriorFace.tsx",
];

for (const file of files) {
  let content = fs.readFileSync(file, "utf8");

  // Skip if already contains cancelAnimation
  if (content.includes("cancelAnimation")) {
    continue;
  }

  // 1. Add cancelAnimation to imports from react-native-reanimated
  const reanimatedImportRegex =
    /import\s+(?:Animated,\s*)?\{([^}]+)\}\s+from\s+["']react-native-reanimated["'];?/m;
  const match = content.match(reanimatedImportRegex);
  if (match) {
    const existingImports = match[1];
    if (!existingImports.includes("cancelAnimation")) {
      const newImports = existingImports.trim().endsWith(",")
        ? existingImports + " cancelAnimation"
        : existingImports + ",\n    cancelAnimation";
      content = content.replace(existingImports, newImports);
    }
  }

  // 2. Find all useSharedValue declarations to cancel them
  const sharedValues = [];
  const sharedValueRegex = /const\s+([a-zA-Z0-9_]+)\s*=\s*useSharedValue\(/g;
  let sharedMatch;
  while ((sharedMatch = sharedValueRegex.exec(content)) !== null) {
    sharedValues.push(sharedMatch[1]);
  }

  if (sharedValues.length > 0) {
    // 3. Inject return () => { cancelAnimation(...) } inside useEffect
    // Note: Most of these components use:
    // useEffect(() => { ... }, [shouldAnimate]);
    // We will find the closing bracket of the useEffect
    const useEffectRegex =
      /(useEffect\(\(\)\s*=>\s*\{[\s\S]*?)(?=\},?\s*\[shouldAnimate\]\))/m;
    const effectMatch = content.match(useEffectRegex);

    if (effectMatch) {
      const cleanupCalls = sharedValues
        .map((v) => `      cancelAnimation(${v});`)
        .join("\n");
      const cleanupCode = `\n    return () => {\n${cleanupCalls}\n    };\n  `;

      const newEffectBody = effectMatch[1] + cleanupCode;
      content = content.replace(effectMatch[1], newEffectBody);

      fs.writeFileSync(file, content);
      console.log("Patched", file);
    } else {
      console.log("Could not patch useEffect in", file);
    }
  } else {
    console.log("No shared values found in", file);
  }
}
