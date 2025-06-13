import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Animated,
} from "react-native";
import React, { useState, useRef, useEffect } from "react";
import ScreenView from "../../../components/ScreenView";
import Icon from "react-native-vector-icons/FontAwesome5";
import CustomScrollView from "../../../components/CustomScrollView";
import { parseTextStyle } from "../../../util/functions/parseStyles";
import { useNavigation } from "@react-navigation/native";
import { theme } from "../../../Theme/tokens";
import {
  LibStackNavigationProp,
  LibStackParamList,
} from "../../../navigators/stacks/AcademyStack/LibraryStack/types";
import InputField from "../../../components/InputField";

import ListItem from "./components/ListItem";
import { getLibraryDetails } from "../../../api/library";
import { Library as LibraryType } from "../../../api/library/types";

const Library = () => {
  const navigation =
    useNavigation<LibStackNavigationProp<keyof LibStackParamList>>();
  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState("");
  const inputFieldRef = useRef<TextInput>(null);
  const [libraryData, setLibraryData] = useState<Array<LibraryType>>([]);
  const filteredData = isSearching
    ? libraryData
        .map((lib) => ({
          ...lib,
          techniques: lib.techniques.filter((tech) =>
            tech.name.toLowerCase().includes(searchText.toLowerCase())
          ),
        }))
        .filter((lib) => lib.techniques.length > 0)
    : libraryData;

  // New: Animated.Value to fade the entire top bar in/out
  const headerOpacity = useRef(new Animated.Value(1)).current;

  const searchAnim = useRef(new Animated.Value(0)).current; // 0 = title mode, 1 = search mode

  useEffect(() => {
    const fetchLibraryDetails = async () => {
      const lib = await getLibraryDetails();
      setLibraryData(lib);
    };
    fetchLibraryDetails();
  }, []);

  // Whenever we switch into “search” mode, focus the TextInput.
  useEffect(() => {
    if (isSearching && inputFieldRef.current) {
      inputFieldRef.current.focus();
    }
  }, [isSearching]);

  const handleSearchToggle = () => {
    Animated.timing(searchAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setIsSearching(true);
    });
  };

  const handleCancelSearch = () => {
    Animated.timing(searchAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start(() => {
      setIsSearching(false);
      setSearchText("");
      if (inputFieldRef.current) {
        inputFieldRef.current.blur();
      }
    });
  };

  const handleClearText = () => {
    if (searchText.length > 0) {
      setSearchText("");
    } else {
      // If there’s no text and user taps the “X,” just cancel search
      handleCancelSearch();
    }
  };

  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        {/* Top Navigation Bar — now an Animated.View controlling opacity */}
        <Animated.View
          style={[styles.topNavigationContainer, { opacity: headerOpacity }]}
        >
          {isSearching ? (
            // ─── When Searching: Show InputField + Cancel Button ───────────────────
            <View style={styles.searchModeLeft}>
              <InputField
                ref={inputFieldRef}
                style={styles.searchInput}
                placeholder="Search"
                value={searchText}
                onChangeText={setSearchText}
                autoFocus={true}
                onBlur={handleCancelSearch}
                rightIcon={
                  searchText.length > 0 ? (
                    <TouchableOpacity onPress={handleClearText}>
                      <Icon
                        name="times-circle"
                        color={theme.colors.text.default}
                        size={16}
                      />
                    </TouchableOpacity>
                  ) : null
                }
              />
              <TouchableOpacity
                onPress={handleCancelSearch}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            // ─── When Not Searching: Show Back Button + Title ───────────────────

            <TouchableOpacity
              onPress={() => navigation.goBack()}
              style={styles.titleModeLeft}
            >
              <Icon name="chevron-left" color={theme.colors.text.default} />
              <Text style={styles.topNavigationText}>Library</Text>
            </TouchableOpacity>
          )}

          {/* Search Icon (only shown when not already searching) */}
          {!isSearching && (
            <TouchableOpacity
              onPress={handleSearchToggle}
              style={styles.searchIconContainer}
            >
              <Icon name="search" color={theme.colors.text.default} size={16} />
            </TouchableOpacity>
          )}
        </Animated.View>

        {/* Content */}
        <CustomScrollView scrollEventThrottle={16}>
          <View style={styles.listContainer}>
            {filteredData.map((lib, i) => (
              <ListItem
                key={i}
                title={lib.category}
                techniques={lib.techniques}
              />
            ))}
          </View>
        </CustomScrollView>
      </View>
    </ScreenView>
  );
};

export default Library;

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
  },
  container: {
    flex: 1,
    gap: 32,
  },
  topNavigationContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    height: 24, // to prevent layout shift when search toggles, Library title lineheight is 24
  },

  // ─── Left side when not searching ─────────────────────────────────────────────
  titleModeLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  topNavigationText: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
  },

  // ─── Left side when searching ─────────────────────────────────────────────────
  searchModeLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  searchInput: {
    flex: 1,
    justifyContent: "center",
  },
  cancelButton: {
    marginLeft: 12,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 8,
  },
  cancelButtonText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },

  // ─── Search icon (right side) ────────────────────────────────────────────────
  searchIconContainer: {
    width: 40,
    justifyContent: "center",
    alignItems: "center",
  },

  // ─── Main scroll/list content ────────────────────────────────────────────────
  listContainer: {
    flexDirection: "column",
    gap: 16,
  },
});
