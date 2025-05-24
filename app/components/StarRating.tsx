import React, { useState, useEffect } from "react"; // Import useState and useEffect
import {
  View,
  StyleSheet,
  Text,
  SafeAreaView,
  TouchableOpacity,
} from "react-native"; // Import TouchableOpacity
import Icon from "react-native-vector-icons/FontAwesome5"; // Ensure you have this installed: expo install react-native-vector-icons
import { theme } from "../Theme/tokens";

/**
 * StarRating Component
 *
 * A reusable React Native Expo component to display a star rating system.
 * It renders a row of stars, with a specified number of stars filled.
 * It can also be made interactive, allowing users to change the rating by tapping.
 *
 * @param {object} props - The component's props.
 * @param {number} [props.numberOfStars=3] - The total number of stars to display. Defaults to 3.
 * @param {number} [props.howManyStarsFilled=0] - The number of stars that should be filled initially.
 * If `interactive` is false, this prop directly controls the displayed rating.
 * If `interactive` is true, this prop sets the initial rating for user interaction. Defaults to 0.
 * @param {number} [props.sizeOfEachStar=16] - The size of each star icon in pixels.
 * Accepted values: 8, 12, 16, 20, 24. Defaults to 16.
 * @param {string} [props.filledStarColor='#FFD700'] - The color of the filled stars. Defaults to gold.
 * @param {string} [props.emptyStarColor='#CCCCCC'] - The color of the empty stars. Defaults to light gray.
 * @param {boolean} [props.interactive=false] - If true, the user can tap stars to change the rating. Defaults to false.
 * @param {function} [props.onRatingChange=() => {}] - Callback function triggered when the rating changes due to user interaction.
 * Receives the new rating as an argument. Only called if `interactive` is true.
 */
const StarRating = ({
  numberOfStars = 3,
  howManyStarsFilled = 0,
  sizeOfEachStar = 16,
  interactive = false, // New prop: enables/disables user interaction
  onRatingChange = (_rating: number) => {}, // New prop: callback for rating changes
}) => {
  // Internal state to manage the current rating when interactive is true.
  // It's initialized with `howManyStarsFilled` prop.
  const [currentRating, setCurrentRating] = useState(howManyStarsFilled);

  // useEffect to synchronize the internal `currentRating` with the `howManyStarsFilled` prop.
  // This ensures that if the parent component changes `howManyStarsFilled` (e.g., to reset the rating),
  // the internal state also updates, especially when `interactive` is false.
  useEffect(() => {
    setCurrentRating(howManyStarsFilled);
  }, [howManyStarsFilled]); // Only re-run if howManyStarsFilled changes

  // Validate the sizeOfEachStar prop to ensure it's one of the allowed values.
  const allowedSizes = [8, 12, 16, 20, 24];
  const validatedSize = allowedSizes.includes(sizeOfEachStar)
    ? sizeOfEachStar
    : 16;

  /**
   * Handles a star press event.
   * Updates the internal rating state and calls the `onRatingChange` callback if interactive.
   * @param {number} rating - The new rating (number of stars to fill).
   */
  const handleStarPress = (rating: number) => {
    if (interactive) {
      setCurrentRating(rating);
      onRatingChange(rating); // Notify the parent component of the new rating
    }
  };

  // Determine which rating value to use for display:
  // If interactive, use the internal `currentRating` state.
  // If not interactive, use the `howManyStarsFilled` prop directly.
  const displayRating = interactive ? currentRating : howManyStarsFilled;

  const stars = [];
  for (let i = 1; i <= numberOfStars; i++) {
    // Determine if the current star should be filled or empty based on `displayRating`.
    const isFilled = i <= displayRating;

    stars.push(
      <TouchableOpacity
        key={i} // Unique key for each star in the list
        onPress={() => handleStarPress(i)} // Attach press handler
        disabled={!interactive} // Disable touch interaction if not interactive
        activeOpacity={0.7} // Provides visual feedback when pressed
      >
        <Icon
          solid={isFilled}
          name="star"
          size={validatedSize}
          color={theme.colors.library.yellow[500]}
          style={styles.starIcon}
        />
      </TouchableOpacity>
    );
  }

  return <View style={styles.container}>{stars}</View>;
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row", // Arrange stars horizontally
    alignItems: "center", // Align stars vertically in the center
    justifyContent: "center", // Center stars horizontally
  },
  starIcon: {
    marginHorizontal: 8, // Small horizontal margin between stars for spacing
  },
});

export default StarRating;
