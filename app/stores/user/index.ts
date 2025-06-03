import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../../api/users";
import { ASYNC_KEYS_NAME } from "../../constants/asyncStorageKeys";

interface UserState {
  /** The current user object, or null if not loaded/logged in */
  user: User | null;
  setUser: (user: User) => void;
  updateProfilePicture: (uri: string) => void;
  clearUser: () => void;
}

/**
 * `persist` saves the user data is saved to AsyncStorage.
 */
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,

      setUser: (user) => {
        console.log("zustand store setting user", user);
        set({ user });
      },

      updateProfilePicture: (uri) =>
        set((state) => {
          if (!state.user) return state;
          return { user: { ...state.user, profilePicture: uri } };
        }),

      clearUser: () => {
        set({ user: null });
      },
    }),
    {
      name: ASYNC_KEYS_NAME.SW_ZSTORE_USER, // a unique name for the storage
      storage: createJSONStorage(() => AsyncStorage),
      // To blacklist certain fields:
      // partialize: (state) => ({ user: state.user }),
    }
  )
);
