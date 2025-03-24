import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../../api/users";

/**
 * The interface describing the store state and actions.
 */
interface UserState {
  /** The current user object, or null if not loaded/logged in */
  user: User | null;

  /** Action to set/update the user */
  setUser: (user: User) => void;
  updateProfilePicture: (uri: string) => void;
  /** Action to clear the user (e.g., on logout) */
  clearUser: () => void;
}

/**
 * Create the user store using Zustand.
 * We wrap it with `persist` so that the user data is saved to AsyncStorage.
 */
export const useUserStore = create<UserState>()(
  persist(
    (set) => ({
      user: null,

      setUser: (user) => {
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
      name: "sw-zstore-user", // a unique name for the storage
      storage: createJSONStorage(() => AsyncStorage),
      // If you want to blacklist certain fields, you can do so:
      // partialize: (state) => ({ user: state.user }),
    }
  )
);
