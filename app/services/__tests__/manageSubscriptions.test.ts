import { Platform, Linking } from "react-native";
import Purchases from "react-native-purchases";
import { manageSubscriptions } from "../purchases";

const mockShowManageSubscriptions = jest.fn();

jest.mock("react-native-purchases", () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    showManageSubscriptions: (...args: unknown[]) =>
      mockShowManageSubscriptions(...args),
  },
  PRODUCT_CATEGORY: {
    NON_SUBSCRIPTION: "NON_SUBSCRIPTION",
    SUBSCRIPTION: "SUBSCRIPTION",
  },
  PURCHASES_ERROR_CODE: {},
}));

jest.mock("../../constants/features", () => ({
  PAYMENTS_ENABLED: true,
  REVENUECAT_IOS_API_KEY: "appl_test_key",
  REVENUECAT_ANDROID_API_KEY: "goog_test_key",
}));

describe("manageSubscriptions", () => {
  const originalPlatform = Platform.OS;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.spyOn(Linking, "openURL").mockResolvedValue(true as never);
  });

  afterEach(() => {
    Object.defineProperty(Platform, "OS", {
      value: originalPlatform,
      configurable: true,
    });
  });

  it("calls Purchases.showManageSubscriptions on iOS", async () => {
    Object.defineProperty(Platform, "OS", {
      value: "ios",
      configurable: true,
    });
    mockShowManageSubscriptions.mockResolvedValueOnce(undefined);

    await manageSubscriptions();

    expect(mockShowManageSubscriptions).toHaveBeenCalledTimes(1);
    expect(Linking.openURL).not.toHaveBeenCalled();
  });

  it("falls back to Apple subscriptions URL if showManageSubscriptions throws", async () => {
    Object.defineProperty(Platform, "OS", {
      value: "ios",
      configurable: true,
    });
    mockShowManageSubscriptions.mockRejectedValueOnce(new Error("Not supported"));

    await manageSubscriptions();

    expect(Linking.openURL).toHaveBeenCalledWith(
      "https://apps.apple.com/account/subscriptions",
    );
  });

  it("opens Google Play subscriptions URL on Android", async () => {
    Object.defineProperty(Platform, "OS", {
      value: "android",
      configurable: true,
    });

    await manageSubscriptions();

    expect(mockShowManageSubscriptions).not.toHaveBeenCalled();
    expect(Linking.openURL).toHaveBeenCalledWith(
      "https://play.google.com/store/account/subscriptions",
    );
  });
});
