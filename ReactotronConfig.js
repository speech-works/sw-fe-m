import Reactotron from "reactotron-react-native";

Reactotron.configure({ name: "speechworks" })
  .useReactNative({
    networking: {
      ignoreUrls: /symbolicate/, // Ignore metro bundler noise
    },
  })
  .connect();
