import AsyncStorage from "@react-native-async-storage/async-storage";
import { clearAllPersistedUserState } from "../clearUserState";
import { doneBlocksKey } from "../../packs/blockCompletion";

/**
 * E2 (10 Nov 2026): program step ticks are saved one key per day and run, so
 * the fixed key list misses them. Log out must remove them, or the next
 * account on this phone sends them to the server as its own.
 */
describe("log out clears program step ticks", () => {
  it("removes every tick key and keeps keys that are not user data", async () => {
    await AsyncStorage.setItem(doneBlocksKey("p1", "m1"), '["b1"]');
    await AsyncStorage.setItem(doneBlocksKey("p1", "m2", 3), '["b2"]');
    await AsyncStorage.setItem("SOME_DEVICE_SETTING", "x");

    await clearAllPersistedUserState();

    expect(await AsyncStorage.getItem(doneBlocksKey("p1", "m1"))).toBeNull();
    expect(await AsyncStorage.getItem(doneBlocksKey("p1", "m2", 3))).toBeNull();
    expect(await AsyncStorage.getItem("SOME_DEVICE_SETTING")).toBe("x");
  });
});
