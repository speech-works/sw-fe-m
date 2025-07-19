import { useState, useCallback } from "react";
import { RefreshControl } from "react-native";
import { theme } from "../Theme/tokens"; // Assuming your theme is here

/**
 * Custom hook to provide pull-to-refresh functionality for a ScrollView.
 *
 * @param {() => Promise<void>} onRefreshCallback - The asynchronous function to call when a pull-to-refresh is triggered.
 * This function should handle all data fetching and state updates.
 * @returns {{refreshing: boolean, refreshControl: JSX.Element}} An object containing:
 * - refreshing: A boolean indicating whether the refresh animation is active.
 * - refreshControl: The RefreshControl component configured for use in a ScrollView.
 */
const usePullToRefresh = (onRefreshCallback: () => Promise<void>) => {
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const handleRefresh = useCallback(async () => {
    console.log("usePullToRefresh: Setting refreshing to TRUE"); // Added
    setRefreshing(true);
    try {
      console.log("usePullToRefresh: Running custom refresh logic...");
      await onRefreshCallback(); // Execute the provided callback
      console.log("usePullToRefresh: Custom refresh logic completed.");
    } catch (error) {
      console.error("usePullToRefresh: Error during refresh:", error);
    } finally {
      console.log("usePullToRefresh: Setting refreshing to FALSE"); // Added
      setRefreshing(false);
    }
  }, [onRefreshCallback]);

  const refreshControl = (
    <RefreshControl
      refreshing={refreshing}
      onRefresh={handleRefresh}
      tintColor={theme.colors.actionPrimary.default} // Customize your refresh indicator color
      colors={[theme.colors.actionPrimary.default]} // For Android
    />
  );

  return { refreshing, refreshControl };
};

export default usePullToRefresh;
