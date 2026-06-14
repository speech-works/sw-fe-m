# API Secrets & Environment Variables

This document explains how configuration values and keys are managed and injected into the SpeechWorks mobile app.

> **Note:** The app no longer uses an `X-App-Secret` / `X_APP_SECRET` request header. That shared "app gate" was removed because it shipped inside the binary (extractable) and added nothing on top of per-user auth. **The real authentication boundary is the per-user JWT** (`Authorization` header), enforced by the backend's `authMiddleware`. Genuine client attestation (Play Integrity / Apple App Attest) is the intended future replacement.

## How injection works

`app.config.js` reads `process.env.*` at build time and exposes the non-secret subset to the running app via `expo-constants` (`Constants.expoConfig.extra`). Anything prefixed `EXPO_PUBLIC_` is inlined into the JS bundle by Expo automatically.

There are two categories:

| Category | Examples | Where it lives | Notes |
|---|---|---|---|
| **Runtime config / public keys** | `API_BASE_URL`, `EXPO_PUBLIC_SENTRY_DSN`, `EXPO_PUBLIC_POSTHOG_API_KEY`, `EXPO_PUBLIC_POSTHOG_HOST`, `ANDROID_CLIENT_ID`, `IOS_CLIENT_ID` | `extra` / inlined in bundle | Visible in the app bundle. These are *not* true secrets (DSNs and analytics write-keys are designed to be client-side). |
| **Build-time-only secrets** | `SENTRY_AUTH_TOKEN` (source-map upload) | EAS secret, **never** `EXPO_PUBLIC_`, never in the bundle | Used by the build (e.g. the Sentry Expo plugin) and discarded; not shipped to devices. |

## Local development

1. Copy `.env.example` → `.env` (the `.env` file is gitignored and must never be committed).
2. Fill in the values you need locally.
3. `npx expo start` — `app.config.js` reads them and passes the non-secret subset through `expo-constants`.

## Production (EAS Build)

Build servers don't have your local `.env`, so provide values to EAS as environment variables / secrets.

### CLI
```bash
# Build-time-only secret (kept out of the bundle):
eas env:create --name SENTRY_AUTH_TOKEN --value <token> --visibility secret --environment production

# Public runtime value:
eas env:create --name EXPO_PUBLIC_SENTRY_DSN --value <dsn> --environment production
```

### Expo Dashboard
[expo.dev](https://expo.dev) → your project → **Environment variables** → add per-environment values. Mark build-time secrets (like `SENTRY_AUTH_TOKEN`) as **Secret** visibility so they're never bundled.

## Security considerations

- **JWT is the auth boundary.** All protected API routes require a valid per-user JWT; data access is scoped server-side by user id.
- **In transit:** all requests use HTTPS (and `wss://` for the AI-call socket).
- **Bundle visibility:** anything `EXPO_PUBLIC_*` or placed in `extra` is extractable from the app. Never put a true secret there. For high-stakes "is this really our app" guarantees, use App Attestation (Play Integrity / DeviceCheck), not a shipped string.
