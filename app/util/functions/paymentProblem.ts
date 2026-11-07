// app/util/functions/paymentProblem.ts
//
// "Problem with a payment?" opens an email to support with the details we need
// to find the payment, so the person does not have to work them out.
//
// The body carries ONLY what identifies the payment on our side: the
// Speechworks user id, the device, the app version, the store, what they were
// buying and when. Never an email address, a name or a token. The mail app
// already shows who it is from.
import { Linking } from "react-native";
import { copyToClipboard } from "./clipboard";
import { SUPPORT_EMAIL } from "../../screens/Auth/constants";

export const PAYMENT_PROBLEM_EMAIL = SUPPORT_EMAIL;
export const PAYMENT_PROBLEM_SUBJECT = "Payment problem";
export const PAYMENT_PROBLEM_LINK_LABEL = "Problem with a payment?";
export const PAYMENT_DETAILS_COPIED_LINE =
  `Details copied. Email them to ${SUPPORT_EMAIL}.`;

export interface PaymentProblemDetails {
  /** Our own user id. Null when nobody is signed in. */
  userId: string | null | undefined;
  /** Platform.OS: "ios", "android", … */
  platformOS: string;
  /** Platform.Version, as the OS reports it. */
  osVersion: string | number | null | undefined;
  /** e.g. "1.0.4". */
  appVersion: string | null | undefined;
  /** e.g. "100". */
  buildNumber?: string | null;
  /** The program or product they were buying, when known. */
  product?: string | null;
  /** When the person asked. */
  now: Date;
}

/** The store that bills this device. */
export function storeLabelFor(platformOS: string): string {
  if (platformOS === "ios") return "App Store";
  if (platformOS === "android") return "Google Play";
  return "Unknown";
}

function platformLabel(platformOS: string): string {
  if (platformOS === "ios") return "iOS";
  if (platformOS === "android") return "Android";
  return platformOS || "Unknown";
}

/**
 * The email body. Pure, so the rule about what it may carry is tested.
 * A blank first part leaves room for the person's own words above the details.
 */
export function paymentProblemBody(d: PaymentProblemDetails): string {
  const version = d.appVersion
    ? d.buildNumber
      ? `${d.appVersion} (${d.buildNumber})`
      : d.appVersion
    : "Unknown";
  const lines = [
    "Tell us what happened:",
    "",
    "",
    "Details for our team:",
    `Speechworks id: ${d.userId || "Not signed in"}`,
    `Device: ${platformLabel(d.platformOS)} ${d.osVersion ?? ""}`.trimEnd(),
    `App version: ${version}`,
    `Store: ${storeLabelFor(d.platformOS)}`,
  ];
  if (d.product) lines.push(`Buying: ${d.product}`);
  lines.push(`Time: ${d.now.toISOString()}`);
  return lines.join("\n");
}

/** The mailto: link for the body above. */
export function paymentProblemMailto(body: string): string {
  return (
    `mailto:${PAYMENT_PROBLEM_EMAIL}` +
    `?subject=${encodeURIComponent(PAYMENT_PROBLEM_SUBJECT)}` +
    `&body=${encodeURIComponent(body)}`
  );
}

/**
 * Open the email. When no mail app can take it, copy the details instead and
 * return the line to show. Returns null when the mail app opened.
 */
export async function openPaymentProblemEmail(
  d: PaymentProblemDetails,
): Promise<string | null> {
  const body = paymentProblemBody(d);
  const url = paymentProblemMailto(body);
  // openURL straight away, not canOpenURL first: the app declares no mailto
  // query scheme, so canOpenURL can say false on a phone that has mail. A
  // phone with no mail app rejects the openURL instead.
  try {
    await Linking.openURL(url);
    return null;
  } catch (error) {
    console.warn("[paymentProblem] could not open mail:", error);
  }
  const copied = await copyToClipboard(
    `To: ${PAYMENT_PROBLEM_EMAIL}\nSubject: ${PAYMENT_PROBLEM_SUBJECT}\n\n${body}`,
  );
  return copied
    ? PAYMENT_DETAILS_COPIED_LINE
    : `Please email ${PAYMENT_PROBLEM_EMAIL} with the subject "${PAYMENT_PROBLEM_SUBJECT}".`;
}
