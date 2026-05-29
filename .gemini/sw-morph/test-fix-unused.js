const { Project } = require("ts-morph");

async function test() {
  const project = new Project({
    tsConfigFilePath:
      "/Users/mayankav/Documents/speechworks-2/sw-fe-m-2/tsconfig.check.json",
  });

  const file = project.getSourceFile(
    "/Users/mayankav/Documents/speechworks-2/sw-fe-m-2/app/assets/mood-check/AgentFace.tsx",
  );
  file.fixUnusedIdentifiers();
  await file.save();
  console.log("Fixed unused identifiers in AgentFace.tsx");
}

test().catch(console.error);
