const { Project, SyntaxKind } = require("ts-morph");

async function analyzeLeaks() {
  const project = new Project({
    tsConfigFilePath:
      "/Users/mayankav/Documents/speechworks-2/sw-fe-m-2/tsconfig.check.json",
  });

  const sourceFiles = project.getSourceFiles();
  const issues = [];

  for (const sf of sourceFiles) {
    const filePath = sf.getFilePath();
    if (filePath.includes("/node_modules/")) continue;
    if (filePath.includes("/ios/") || filePath.includes("/android/")) continue;

    // Find all useEffect calls
    const callExpressions = sf.getDescendantsOfKind(SyntaxKind.CallExpression);
    for (const callExpr of callExpressions) {
      const expr = callExpr.getExpression();
      if (expr.getText() === "useEffect") {
        const body = callExpr.getArguments()[0];
        if (!body) continue;

        const bodyText = body.getText();
        const hasInterval = bodyText.includes("setInterval(");
        const hasTimeout = bodyText.includes("setTimeout(");
        const hasListener =
          bodyText.includes("addListener(") || bodyText.includes(".on(");
        const hasSocket = bodyText.includes("new WebSocket(");

        let issueType = [];
        if (hasInterval) issueType.push("setInterval");
        if (hasTimeout) issueType.push("setTimeout");
        if (hasListener) issueType.push("eventListener");
        if (hasSocket) issueType.push("WebSocket");

        if (issueType.length > 0) {
          // Check if effect returns a function (cleanup)
          const returns = body.getDescendantsOfKind(SyntaxKind.ReturnStatement);
          const hasCleanup = returns.length > 0;

          if (!hasCleanup) {
            issues.push({
              file: filePath.replace(
                "/Users/mayankav/Documents/speechworks-2/sw-fe-m-2/",
                "",
              ),
              line: callExpr.getStartLineNumber(),
              type: issueType.join(", "),
              reason: "Missing cleanup function in useEffect",
            });
          }
        }
      }
    }
  }

  console.log(JSON.stringify(issues, null, 2));
}

analyzeLeaks().catch(console.error);
