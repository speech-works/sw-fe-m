const { Project } = require("ts-morph");

async function run() {
  console.log("Starting ts-morph project...");
  const project = new Project({
    tsConfigFilePath:
      "/Users/mayankav/Documents/speechworks-2/sw-fe-m-2/tsconfig.check.json",
  });

  console.log("Loading source files...");
  const sourceFiles = project.getSourceFiles();
  let modified = 0;

  for (const sf of sourceFiles) {
    const filePath = sf.getFilePath();
    if (filePath.includes("/node_modules/")) continue;
    if (filePath.includes("/ios/")) continue;
    if (filePath.includes("/android/")) continue;

    try {
      sf.organizeImports();

      if (!sf.isSaved()) {
        await sf.save();
        modified++;
        console.log("Organized imports: " + filePath);
      }
    } catch (e) {
      console.error(`Failed to process ${filePath}:`, e);
    }
  }
  console.log(`Modified ${modified} files.`);
}
run().catch(console.error);
