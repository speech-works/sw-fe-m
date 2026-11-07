const mockOpenURL = jest.fn();
jest.mock("react-native", () => ({
  Linking: { openURL: (...args: unknown[]) => mockOpenURL(...args) },
}));

const mockCopy = jest.fn();
jest.mock("../clipboard", () => ({
  copyToClipboard: (...args: unknown[]) => mockCopy(...args),
}));

import {
  PAYMENT_DETAILS_COPIED_LINE,
  PAYMENT_PROBLEM_LINK_LABEL,
  openPaymentProblemEmail,
  paymentProblemBody,
  paymentProblemMailto,
  storeLabelFor,
  type PaymentProblemDetails,
} from "../paymentProblem";

const details = (over: Partial<PaymentProblemDetails> = {}): PaymentProblemDetails => ({
  userId: "3f2a-uuid",
  platformOS: "ios",
  osVersion: "18.2",
  appVersion: "1.0.4",
  buildNumber: "100",
  product: "Calm Mind",
  now: new Date("2026-11-07T10:30:00.000Z"),
  ...over,
});

beforeEach(() => {
  mockOpenURL.mockReset();
  mockCopy.mockReset();
  jest.spyOn(console, "warn").mockImplementation(() => {});
});

describe("paymentProblemBody", () => {
  it("carries the id, device, version, store, product and time", () => {
    const body = paymentProblemBody(details());
    expect(body).toContain("Speechworks id: 3f2a-uuid");
    expect(body).toContain("Device: iOS 18.2");
    expect(body).toContain("App version: 1.0.4 (100)");
    expect(body).toContain("Store: App Store");
    expect(body).toContain("Buying: Calm Mind");
    expect(body).toContain("Time: 2026-11-07T10:30:00.000Z");
  });

  it("names Google Play on Android", () => {
    const body = paymentProblemBody(details({ platformOS: "android", osVersion: 34 }));
    expect(body).toContain("Device: Android 34");
    expect(body).toContain("Store: Google Play");
    expect(storeLabelFor("web")).toBe("Unknown");
  });

  it("leaves the product out when it is not known", () => {
    expect(paymentProblemBody(details({ product: null }))).not.toContain("Buying:");
  });

  it("copes with no user and no version", () => {
    const body = paymentProblemBody(details({ userId: null, appVersion: null }));
    expect(body).toContain("Speechworks id: Not signed in");
    expect(body).toContain("App version: Unknown");
  });

  it("carries no email address and no em dash", () => {
    const body = paymentProblemBody(details());
    expect(body).not.toMatch(/@/);
    expect(body).not.toMatch(/—/);
  });
});

describe("paymentProblemMailto", () => {
  it("addresses support with the subject and an encoded body", () => {
    const url = paymentProblemMailto("a b\nc");
    expect(url).toBe(
      "mailto:contact@speechworks.app?subject=Payment%20problem&body=a%20b%0Ac",
    );
  });

  it("labels the link as the founder wrote it", () => {
    expect(PAYMENT_PROBLEM_LINK_LABEL).toBe("Problem with a payment?");
  });
});

describe("openPaymentProblemEmail", () => {
  it("opens the mail app and says nothing more", async () => {
    mockOpenURL.mockResolvedValue(undefined);
    expect(await openPaymentProblemEmail(details())).toBeNull();
    expect(mockOpenURL.mock.calls[0][0]).toMatch(/^mailto:contact@speechworks\.app\?/);
    expect(mockCopy).not.toHaveBeenCalled();
  });

  it("copies the details when no mail app can take it", async () => {
    mockOpenURL.mockRejectedValue(new Error("no mail app"));
    mockCopy.mockResolvedValue(true);
    expect(await openPaymentProblemEmail(details())).toBe(PAYMENT_DETAILS_COPIED_LINE);
    expect(PAYMENT_DETAILS_COPIED_LINE).toBe(
      "Details copied. Email them to contact@speechworks.app.",
    );
    expect(mockCopy.mock.calls[0][0]).toContain("Speechworks id: 3f2a-uuid");
  });

  it("still names the address when the copy fails too", async () => {
    mockOpenURL.mockRejectedValue(new Error("no mail app"));
    mockCopy.mockResolvedValue(false);
    expect(await openPaymentProblemEmail(details())).toContain("contact@speechworks.app");
  });
});
