import Qonversion, {
  QonversionConfigBuilder,
  LaunchMode,
  EntitlementsCacheLifetime,
  QonversionConfig, // Import the Config type
} from "@qonversion/react-native-sdk";

/**
 * Initialize Qonversion once on app startup.
 * Must run BEFORE using getSharedInstance().
 */
export async function initQonversion(): Promise<void> {
  // <-- Make it async
  const key = process.env.EXPO_PUBLIC_QONVERSION_KEY;

  if (!key) {
    console.error("🚨 Missing EXPO_PUBLIC_QONVERSION_KEY");
    // Throw an error so the calling function (in App.tsx) can catch it
    throw new Error("Missing EXPO_PUBLIC_QONVERSION_KEY");
  }

  // Required builder setup
  const builder = new QonversionConfigBuilder(
    key,
    LaunchMode.SUBSCRIPTION_MANAGEMENT
  );

  // Optional but recommended
  builder.setEntitlementsCacheLifetime(EntitlementsCacheLifetime.MONTH);
  // Build the config
  const config: QonversionConfig = builder.build();

  // Initialize Qonversion and WAIT for it to complete
  await Qonversion.initialize(config);
  console.log(
    "🔥 Qonversion initialization complete → LaunchMode.SUBSCRIPTION_MANAGEMENT"
  );
}
