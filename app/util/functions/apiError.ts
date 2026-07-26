/**
 * Pull the server's own explanation out of a failed request.
 *
 * WHY THIS EXISTS. The API's global error handler serialises as
 * `{ error: message, fields }` — the key is `error`, NOT `message`. Several
 * screens read `response.data.message`, which is therefore always `undefined`,
 * so they silently fell through to their generic fallback and threw away the
 * specific reason the server had gone to the trouble of writing. The buddy
 * redeem endpoint distinguishes six of them ("You can't use your own code.",
 * "You already have a buddy.", "Invite codes can only be used by new
 * sign-ups.") and the user was shown none of them.
 *
 * Both keys are read because the app talks to more than one error shape and
 * guessing wrong is silent — a wrong key looks exactly like a server that sent
 * nothing.
 *
 * ONLY 4xx MESSAGES ARE SURFACED. A 4xx is the server explaining something the
 * person can act on. A 5xx message is an internal failure string, which is
 * noise at best and a leak at worst, so those get the fallback.
 */
export function apiErrorMessage(error: unknown, fallback: string): string {
  const res = (error as any)?.response;
  const status = res?.status;

  if (typeof status === "number" && status >= 400 && status < 500) {
    const body = res?.data;
    const message = body?.error ?? body?.message;
    if (typeof message === "string" && message.trim().length > 0) {
      return message.trim();
    }
  }

  return fallback;
}

/**
 * Was this a rejection rather than a fault?
 *
 * A 4xx from a user-supplied value — a mistyped invite code — is an expected
 * outcome that the UI handles, not a bug. Logging it with `console.error`
 * raises a redbox in dev over something working exactly as designed, which is
 * how a wrong buddy code came to look like a crash.
 */
export function isClientError(error: unknown): boolean {
  const status = (error as any)?.response?.status;
  return typeof status === "number" && status >= 400 && status < 500;
}
