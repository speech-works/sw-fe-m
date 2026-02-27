const { Project } = require("ts-morph");
const fs = require("fs");

async function run() {
  const log = fs.readFileSync("/tmp/tsc_check2.txt", "utf8");
  const lines = log.split("\n");

  const filesToFix = new Set();
  for (const line of lines) {
    const match = line.match(/^(.+?)\(\d+,\d+\): error TS6133:/);
    if (match) {
      filesToFix.add(
        "/Users/mayankav/Documents/speechworks-2/sw-fe-m-2/" + match[1],
      );
    }
  }

  console.log(`Found ${filesToFix.size} files to fix unused identifiers.`);

  const project = new Project({
    tsConfigFilePath:
      "/Users/mayankav/Documents/speechworks-2/sw-fe-m-2/tsconfig.check.json",
  });

  let modified = 0;
  for (const filePath of filesToFix) {
    // Avoid node_modules, ios, android just in case
    if (
      filePath.includes("/node_modules/") ||
      filePath.includes("/ios/") ||
      filePath.includes("/android/")
    )
      continue;

    try {
      const sf = project.getSourceFile(filePath);
      if (sf) {
        sf.fixUnusedIdentifiers();
        if (!sf.isSaved()) {
          await sf.save();
          modified++;
          console.log("Fixed unused identifiers in: " + filePath);
        }
      }
    } catch (e) {
      console.error(`Failed to fix ${filePath}:`, e);
    }
  }

  console.log(`Modified ${modified} files.`);
}
run().catch(console.error);
