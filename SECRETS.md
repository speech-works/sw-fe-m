# API Secrets & Environment Variables

This document explains how sensitive internal keys (like `X-App-Secret`) are managed and injected into the SpeechWorks mobile app.

## Summary

To protect our API from public visibility and bots, we use a custom identification header. To keep this key out of our version control (Git), we use **Build-time Injection**.

## Local Development

1. **Environment File**: The secrets are stored in a local `.env` file at the root of the project.
   ```
   X_APP_SECRET=<YOUR_X_APP_SECRET>
   ```
2. **Exclusion**: The `.env` file is explicitly ignored in `.gitignore` and must never be committed.
3. **Injection**: When you run `npx expo start`, the `app.config.js` script reads these variables and passes them to the app via `expo-constants`.

## Production (EAS Build)

Since the build servers do not have access to your local `.env` file, you must provide the secrets to Expo/EAS.

### Method 1: CLI (Recommended)

Run the following command to add a secret to your EAS project:

```bash
eas secret:create --name X_APP_SECRET --value <YOUR_X_APP_SECRET>
```

### Method 2: Expo Dashboard

1. Go to your project on [expo.dev](https://expo.dev).
2. Navigate to **Project Settings** > **Secrets**.
3. Add a new secret with the name `X_APP_SECRET`.

## Security Considerations

- **Identity, not Auth**: These app-level secrets are used for identity/baseline protection. They prevent 99% of bots and casual browsing.
- **In-Transit**: All requests are encrypted via HTTPS, so the header is safe from network-level sniffing.
- **Decompilation**: Like any mobile app, a determined hacker can eventually decompile the JavaScript bundle to find the string. For extremely high-stakes data, use individual User Authentication and App Attestation (DeviceCheck/Play Integrity).
