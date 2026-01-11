import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  TextInput,
  Animated,
  StatusBar,
  ScrollView,
} from "react-native";
import React, { useState, useRef, useEffect, useMemo } from "react";
import ScreenView from "../../../components/ScreenView";
import Icon from "react-native-vector-icons/FontAwesome5";
import CustomScrollView from "../../../components/CustomScrollView";
import { parseTextStyle } from "../../../util/functions/parseStyles";
import { useNavigation } from "@react-navigation/native";
import { theme } from "../../../Theme/tokens";
import { LinearGradient } from "expo-linear-gradient";

import { getLibraryDetails } from "../../../api/library";
import {
  Library as LibraryType,
  TransformedTechnique,
  TECHNIQUES_ENUM,
} from "../../../api/library/types";
import { AcademyStackParamList } from "../../../navigators/stacks/AcademyStack/types";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { CompositeNavigationProp } from "@react-navigation/native";
import { LibStackParamList } from "../../../navigators/stacks/AcademyStack/LibraryStack/types";

// New Components
import TechniqueCard from "./components/TechniqueCard";
import LibrarySection from "./components/LibrarySection";
import LibraryFilterBar, { FilterType } from "./components/LibraryFilterBar";
import BottomSheetModal from "../../../components/BottomSheetModal";
import { useUserStore } from "../../../stores/user";

// --- Data Definitions ---

const SLP_GROUPS = [
  {
    id: "UNDERSTANDING",
    title: "Understanding Your Speech",
    subtitle: "Awareness & Monitoring",
    about:
      "These tools help you observe your speech patterns without judgment. Building awareness is the first step toward change.",
    techniqueIds: [TECHNIQUES_ENUM.IDENTIFICATION],
  },
  {
    id: "MODIFICATION",
    title: "Changing the Moment of Stuttering",
    subtitle: "Stuttering Modification",
    about:
      "Learn to modify tension during stuttering. These tools replace struggle with easier, controlled release.",
    techniqueIds: [
      TECHNIQUES_ENUM.CANCELLATIONS,
      TECHNIQUES_ENUM.PULL_OUTS,
      TECHNIQUES_ENUM.PREPARATORY_SETS,
      TECHNIQUES_ENUM.VOLUNTARY_STUTTERING,
    ],
  },
  {
    id: "FLUENCY",
    title: "Building Smoother Speech Patterns",
    subtitle: "Fluency Shaping",
    about:
      "Techniques to facilitate easier voice onset and continuous airflow. These help build a new manner of speaking.",
    techniqueIds: [
      TECHNIQUES_ENUM.CONTINUOUS_PHONATION,
      TECHNIQUES_ENUM.EASY_ONSET,
      TECHNIQUES_ENUM.PASSIVE_AIRFLOW,
      TECHNIQUES_ENUM.PROLONGED_SPEECH,
      TECHNIQUES_ENUM.LIGHT_ARTICULATORY_CONTACT,
    ],
  },
  {
    id: "RELAXATION",
    title: "Voice & Throat Relaxation",
    subtitle: "Voice & Laryngeal Control",
    about:
      "Reduce physical tension in the vocal tract. A relaxed throat supports smoother speech production.",
    techniqueIds: [
      TECHNIQUES_ENUM.YAWN_SIGH_TECHNIQUE,
      TECHNIQUES_ENUM.GLOTTAL_FRY,
    ], // Glottal fry might not be in enum yet? Checking types.ts it is YAWN_SIGH_TECHNIQUE, GLOTTAL_FRY (Wait, GLOTTAL_FRY is in types.ts? Yes checked earlier)
  },
];

const LEVEL_MAPPING: Record<string, string> = {
  BEGINNER: "Foundation",
  INTERMEDIATE: "Build",
  ADVANCED: "Deep Practice",
};

type LibraryScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<LibStackParamList>,
  NativeStackNavigationProp<AcademyStackParamList>
>;

const Library = () => {
  const navigationAcademy = useNavigation<LibraryScreenNavigationProp>();
  const { user } = useUserStore();

  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState("");
  const inputFieldRef = useRef<TextInput>(null);

  const [allTechniques, setAllTechniques] = useState<
    Array<TransformedTechnique>
  >([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");

  // Selection Modal State
  const [selectedTechnique, setSelectedTechnique] =
    useState<TransformedTechnique | null>(null);
  const [isSelectionModalVisible, setIsSelectionModalVisible] = useState(false);

  const searchBarScale = useRef(new Animated.Value(1)).current;
  const searchIconScale = useRef(new Animated.Value(1)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;

  // Header Elevation Animation based on scroll
  const scrollY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const fetchLibraryDetails = async () => {
      try {
        const libData = await getLibraryDetails();
        const flat: TransformedTechnique[] = [];
        libData.forEach((cat) => {
          flat.push(...cat.techniques);
        });
        const unique = Array.from(
          new Map(flat.map((item) => [item.id, item])).values()
        );
        setAllTechniques(unique);
      } catch (e) {
        console.error("Failed to fetch library", e);
      }
    };
    fetchLibraryDetails();
  }, []);

  useEffect(() => {
    if (isSearching && inputFieldRef.current) {
      inputFieldRef.current.focus();
    }
  }, [isSearching]);

  // --- Animation Handlers ---
  const handleSearchToggle = () => {
    Animated.sequence([
      Animated.timing(searchIconScale, {
        toValue: 0.85,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(searchIconScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    Animated.spring(searchBarScale, {
      toValue: 1.02,
      friction: 8,
      tension: 100,
      useNativeDriver: true,
    }).start(() => {
      Animated.spring(searchBarScale, {
        toValue: 1,
        friction: 8,
        useNativeDriver: true,
      }).start();
    });

    Animated.timing(searchAnim, {
      toValue: 1,
      duration: 250,
      useNativeDriver: true,
    }).start();
    setIsSearching(true);
  };

  const handleCancelSearch = () => {
    Animated.timing(searchAnim, {
      toValue: 0,
      duration: 250,
      useNativeDriver: true,
    }).start();
    setIsSearching(false);
    setSearchText("");
    if (inputFieldRef.current) {
      inputFieldRef.current.blur();
    }
  };

  const handleClearText = () => {
    if (searchText.length > 0) {
      setSearchText("");
    } else {
      handleCancelSearch();
    }
  };

  // --- Filtering Logic ---
  const groupedData = useMemo(() => {
    const searchLower = searchText.toLowerCase();

    return SLP_GROUPS.map((group) => {
      const techniques = allTechniques
        .filter((t) => group.techniqueIds.includes(t.id as TECHNIQUES_ENUM))
        .filter(
          (t) =>
            !searchText ||
            t.name.toLowerCase().includes(searchLower) ||
            t.description.toLowerCase().includes(searchLower)
        )
        .filter((t) => {
          if (activeFilter === "ALL") return true;
          if (activeFilter === "Free") return t.hasFree;
          const displayLevel = LEVEL_MAPPING[t.level] || t.level;
          return displayLevel === activeFilter;
        }); // Removed remapping, handled in UI

      return {
        ...group,
        items: techniques,
      };
    }).filter((g) => g.items.length > 0);
  }, [allTechniques, searchText, activeFilter]);

  // --- Selection Handlers ---
  const onTechniqueStart = (tech: TransformedTechnique) => {
    setSelectedTechnique(tech);
    setIsSelectionModalVisible(true);
  };

  const handleNavigate = (type: "TUTORIAL" | "EXERCISE") => {
    setIsSelectionModalVisible(false);
    if (!selectedTechnique) return;

    setTimeout(() => {
      navigationAcademy.navigate("TechniquePage", {
        techniqueId: selectedTechnique.id,
        techniqueName: selectedTechnique.name,
        techniqueDesc: selectedTechnique.description,
        techniqueLevel: selectedTechnique.level,
        stage: type,
        hasFree: selectedTechnique.hasFree,
      });
    }, 300);
  };

  // Header Background Interpolation
  const headerBgOpacity = scrollY.interpolate({
    inputRange: [0, 50],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  return (
    <ScreenView style={styles.screenView}>
      {/* Premium Gradient Background - Softer, more sophisticated */}
      <LinearGradient
        colors={[
          "#FFFBF7", // Very light cream
          "#F5F7FA", // Cool gray-ish
          "#FFFFFF",
        ]}
        style={styles.gradientBackground}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />

      <StatusBar barStyle="dark-content" />

      {/* --- Floating Glass Header --- */}
      <View style={styles.fixedHeaderContainer}>
        {/* Dynamic Frosted Background Layer */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            styles.glassBackground,
            { opacity: headerBgOpacity },
          ]}
        />

        {/* Top Bar */}
        <Animated.View
          style={[
            styles.headerTopBar,
            { transform: [{ scale: searchBarScale }] },
          ]}
        >
          {isSearching ? (
            <View style={styles.searchModeContainer}>
              <View style={styles.glassSearchBar}>
                <Icon
                  name="search"
                  size={16}
                  color={theme.colors.library.orange[400]}
                  style={styles.searchInputIcon}
                />
                <TextInput
                  ref={inputFieldRef}
                  style={styles.searchTextInput}
                  placeholder="Find a technique..."
                  placeholderTextColor={theme.colors.text.disabled}
                  value={searchText}
                  onChangeText={setSearchText}
                  autoFocus={true}
                />
                {searchText.length > 0 && (
                  <TouchableOpacity
                    onPress={handleClearText}
                    style={{ padding: 4 }}
                  >
                    <Icon
                      name="times-circle"
                      size={16}
                      color={theme.colors.text.default}
                    />
                  </TouchableOpacity>
                )}
              </View>
              <TouchableOpacity
                onPress={handleCancelSearch}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.normalHeader}>
              <TouchableOpacity
                onPress={() => navigationAcademy.navigate("Explore" as never)}
                style={styles.backButton}
              >
                <Icon
                  name="chevron-left"
                  color={theme.colors.text.title}
                  size={16}
                />
              </TouchableOpacity>

              <Text style={styles.headerTitle}>Library</Text>

              <Animated.View
                style={{ transform: [{ scale: searchIconScale }] }}
              >
                <TouchableOpacity
                  onPress={handleSearchToggle}
                  style={styles.searchIconButton}
                >
                  <LinearGradient
                    colors={[
                      theme.colors.library.orange[400],
                      theme.colors.library.orange[500],
                    ]}
                    style={styles.searchIconGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Icon name="search" color="#FFFFFF" size={12} />
                  </LinearGradient>
                </TouchableOpacity>
              </Animated.View>
            </View>
          )}
        </Animated.View>

        {/* Filter Bar */}
        <View style={styles.filterContainer}>
          <LibraryFilterBar
            currentFilter={activeFilter}
            onSelectFilter={setActiveFilter}
          />
        </View>
      </View>

      {/* --- Content --- */}
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false }
        )}
        scrollEventThrottle={16}
      >
        <View style={styles.contentSpacer} />

        {groupedData.length > 0 ? (
          groupedData.map((group) => (
            <LibrarySection
              key={group.id}
              sectionId={group.id} // Pass for Bento logic
              title={group.title}
              subtitle={group.subtitle}
              aboutText={group.about}
              techniques={group.items}
              isPaidUser={user?.isPaid}
              onTechniqueSelect={onTechniqueStart}
            />
          ))
        ) : (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              No techniques found matching your criteria.
            </Text>
          </View>
        )}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* --- Selection Modal --- */}
      <BottomSheetModal
        visible={isSelectionModalVisible}
        onClose={() => setIsSelectionModalVisible(false)}
        maxHeight={Platform.OS === "ios" ? 320 : 340}
      >
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Choose Mode</Text>
          <Text style={styles.modalSubtitle}>
            How would you like to practice {selectedTechnique?.name}?
          </Text>

          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.modalButtonPrimary}
              onPress={() => handleNavigate("TUTORIAL")}
            >
              <LinearGradient
                colors={[
                  theme.colors.library.orange[400],
                  theme.colors.library.orange[500],
                ]}
                style={styles.modalValuesGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon name="play" color="#FFF" size={14} />
                <Text style={styles.modalButtonTextPrimary}>
                  Watch Tutorial
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalButtonSecondary}
              onPress={() => handleNavigate("EXERCISE")}
            >
              <Icon
                name="dumbbell"
                color={theme.colors.library.orange[500]}
                size={14}
              />
              <Text style={styles.modalButtonTextSecondary}>
                Start Exercise
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </BottomSheetModal>
    </ScreenView>
  );
};

export default Library;

import { Platform } from "react-native";

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
    backgroundColor: theme.colors.background.light,
  },
  gradientBackground: {
    ...StyleSheet.absoluteFillObject,
    zIndex: -1,
  },

  // Fixed Header Complex
  fixedHeaderContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingTop: Platform.OS === "ios" ? 48 : 24, // Status bar safe area approx
  },
  glassBackground: {
    backgroundColor: "rgba(255,255,255,0.85)",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  headerTopBar: {
    paddingHorizontal: 24,
    marginBottom: 8,
    height: 50,
    justifyContent: "center",
  },
  filterContainer: {
    paddingBottom: 8,
  },

  // Header Elements
  normalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: theme.colors.text.title,
    marginTop: 2,
    position: "absolute",
    left: 0,
    right: 0,
    textAlign: "center",
    zIndex: -1, // Behind buttons
  },
  searchIconButton: {
    width: 32, // Match back button size for symmetry? Or keep slightly larger as main action?
    height: 32, // Let's keep original design or match 32 if desired. Original was 40.
    borderRadius: 12, // Match shape
    overflow: "hidden",
    shadowColor: theme.colors.library.orange[400],
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  searchIconGradient: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },

  // Search Mode
  searchModeContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  glassSearchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 16,
    paddingHorizontal: 16,
    height: 44,
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  searchInputIcon: {
    marginRight: 8,
  },
  searchTextInput: {
    flex: 1,
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.title,
    height: "100%",
  },
  cancelButton: {
    paddingHorizontal: 4,
  },
  cancelButtonText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.library.orange[500],
    fontWeight: "600",
  },

  // Content
  scrollContent: {
    paddingTop: 16,
    paddingBottom: 40,
  },
  contentSpacer: {
    height: Platform.OS === "ios" ? 140 : 120, // Push content down below fixed header
  },
  emptyState: {
    padding: 32,
    alignItems: "center",
    marginTop: 40,
  },
  emptyStateText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.library.gray[400],
    textAlign: "center",
  },

  // Modal
  modalContent: {
    padding: 24,
    alignItems: "center",
  },
  modalTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    marginBottom: 8,
  },
  modalSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    marginBottom: 24,
  },
  modalActions: {
    width: "100%",
    gap: 12,
  },
  modalButtonPrimary: {
    width: "100%",
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: theme.colors.library.orange[400],
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 4,
  },
  modalValuesGradient: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
  },
  modalButtonTextPrimary: {
    ...parseTextStyle(theme.typography.Button),
    color: "#FFFFFF",
    fontWeight: "700",
    fontSize: 16,
  },
  modalButtonSecondary: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: "#FFFFFF",
    borderWidth: 1.5,
    borderColor: theme.colors.library.gray[200],
  },
  modalButtonTextSecondary: {
    ...parseTextStyle(theme.typography.Button),
    color: theme.colors.text.default,
    fontWeight: "600",
    fontSize: 16,
  },
});
