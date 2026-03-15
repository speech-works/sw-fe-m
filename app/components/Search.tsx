import React, { useCallback, useEffect, useRef, useState } from "react";
import {
    StyleSheet,
    Text,
    TextInput,
    TextInputProps,
    TouchableOpacity,
    View,
} from "react-native";
import Icon from "react-native-vector-icons/MaterialIcons";
import { theme } from "../Theme/tokens";
import { parseTextStyle } from "../util/functions/parseStyles";

interface SearchProps extends TextInputProps {}

const Search: React.FC<SearchProps> = ({ ...textInputProps }) => {
  const textInputRef = useRef<TextInput>(null);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchText, setSearchText] = useState("");

  const activateSearch = useCallback(() => {
    setIsSearchActive(true);
  }, []);

  useEffect(() => {
    if (isSearchActive) {
      const timer = setTimeout(() => {
        textInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isSearchActive]);

  return (
    <View style={styles.searchWrapperView}>
      <TouchableOpacity
        style={styles.searchView}
        activeOpacity={1}
        onPress={activateSearch}
      >
        <Icon name="search" size={20} color={theme.colors.text.disabled} />
        {isSearchActive ? (
          <TextInput
            ref={textInputRef}
            style={styles.searchText}
            value={searchText}
            onChangeText={setSearchText}
            onBlur={() => setTimeout(() => setIsSearchActive(false), 100)}
            {...textInputProps}
          />
        ) : (
          <Text style={styles.searchText}>
            {searchText.length > 0 ? searchText : "Search"}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

export default Search;

const styles = StyleSheet.create({
  searchWrapperView: {
    flexGrow: 1,
  },
  searchView: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    gap: 4,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
  },
  searchText: {
    flex: 1,
    ...parseTextStyle(theme.typography.BodySmall),
    color: theme.colors.text.default,
    lineHeight: 13 * 1.2,
  },
});
