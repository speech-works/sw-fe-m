import AsyncStorage from "@react-native-async-storage/async-storage";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";

export const clearAsyncStorage = async () => {
  try {
    const keys = Object.values(ASYNC_KEYS_NAME);
    await AsyncStorage.multiRemove(keys);
    console.log("AsyncStorage cleared:", keys);
  } catch (error) {
    console.error("Error clearing AsyncStorage:", error);
  }
};
