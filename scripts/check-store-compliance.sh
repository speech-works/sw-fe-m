#!/usr/bin/env bash
#
# App Store / Play Store compliance guard.
#
# Fails if any code opens a private iOS Settings URL scheme (prefs:root= /
# App-Prefs:), which Apple rejects under Guideline 2.5.1 (non-public API) and
# which can threaten the developer account. We only ever use the public
# Linking.openSettings() / Linking.sendIntent() APIs.
#
# Matches actual usage (a scheme passed to openURL / Linking) rather than the
# scheme name appearing in comments/docs, so the rule can be documented safely.
#
# Usage: npm run check:store-compliance
set -euo pipefail

PATTERN="(openURL|canOpenURL|Linking\.[a-zA-Z]+)\s*\(\s*[\"'\`]?(prefs:root|App-Prefs)"

if grep -rniEl "$PATTERN" app/ 2>/dev/null; then
  echo "❌ Private iOS Settings URL scheme detected (prefs:root / App-Prefs)."
  echo "   This is an App Store Guideline 2.5.1 rejection risk."
  echo "   Use Linking.openSettings() instead (see app/util/voice/voiceInstall.ts)."
  exit 1
fi

echo "✅ Store compliance: no private Settings URL schemes found."
