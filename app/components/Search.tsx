import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TextInputProps,
} from "react-native";
import React, { useEffect, useRef, useState } from "react";
import Icon from "react-native-vector-icons/MaterialIcons";
import { theme } from "../Theme/tokens";
import { parseTextStyle } from "../util/functions/parseFont";

interface SearchProps extends TextInputProps {}

const Search = ({ ...textInputProps }: SearchProps) => {
  const textInRef = useRef<TextInput>(null);
  const [searchOn, setSearchOn] = useState(false);
  const [searchText, setSearchText] = useState("");

  useEffect(() => {
    if (searchOn) {
      setTimeout(() => {
        textInRef.current?.focus();
      }, 100);
    }
  }, [searchOn]);

  return (
    <View style={styles.searchWrapperView}>
      <View
        style={styles.searchView}
        onTouchEnd={() => {
          setSearchOn(true);
        }}
      >
        <Icon name="search" size={20} color={theme.colors.neutral[5]} />
        {searchOn ? (
          <TextInput
            ref={textInRef}
            style={styles.searchText}
            value={searchText}
            onChangeText={(v) => setSearchText(v)}
            onBlur={() => {
              alert("hh");
              setTimeout(() => setSearchOn(false), 100);
            }}
          />
        ) : (
          <Text style={styles.searchText}>
            {searchText.length > 0 ? searchText : "Search"}
          </Text>
        )}
      </View>
    </View>
  );
};

export default Search;

const styles = StyleSheet.create({
  searchWrapperView: {
    // width: "100%",
    flexGrow: 1,
  },
  searchView: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    flexDirection: "row",
    gap: 4,
    backgroundColor: theme.colors.neutral[9],
    alignItems: "center",
  },
  searchText: {
    flex: 1,
    ...parseTextStyle(theme.typography.paragraphSmall.regular),
    color: theme.colors.neutral.black,
    lineHeight: 13 * 1.2,
  },
});
