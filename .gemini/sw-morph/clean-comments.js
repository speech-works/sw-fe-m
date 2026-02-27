const fs = require("fs");
const glob = require("glob");

function cleanFile(filePath) {
  let content = fs.readFileSync(filePath, "utf8");
  let original = content;

  // Remove empty comments like `//` or `// `
  content = content.replace(/^\s*\/\/\s*$/gm, "");

  // Remove commented out console.logs: `// console.log(...)`
  content = content.replace(/^\s*\/\/\s*console\.log\(.*?\);?$/gm, "");

  // Remove redundant consecutive empty lines (more than 2 to 1)
  content = content.replace(/\n\s*\n\s*\n/g, "\n\n");

  if (content !== original) {
    fs.writeFileSync(filePath, content, "utf8");
    return true;
  }
  return false;
}

const files = glob.sync(
  "/Users/mayankav/Documents/speechworks-2/sw-fe-m-2/app/**/*.{ts,tsx}",
);
let count = 0;
for (const file of files) {
  if (cleanFile(file)) {
    count++;
    console.log("Cleaned:", file);
  }
}
console.log(`Cleaned ${count} files.`);
