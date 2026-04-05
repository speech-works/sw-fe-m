import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  LayoutAnimation,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome5";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { BlurView } from "expo-blur";
import ScreenView from "../../../components/ScreenView";

import { useNavigation } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../../Theme/tokens";
import { parseTextStyle } from "../../../util/functions/parseStyles";

import { CompositeNavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getLibraryDetails } from "../../../api/library";
import {
  TECHNIQUES_ENUM,
  TransformedTechnique,
} from "../../../api/library/types";
import { LibStackParamList } from "../../../navigators/stacks/AcademyStack/LibraryStack/types";
import { AcademyStackParamList } from "../../../navigators/stacks/AcademyStack/types";

// New Components
import BottomSheetModal from "../../../components/BottomSheetModal";
import { useUserStore } from "../../../stores/user";
import LibraryFilterBar, { FilterType } from "./components/LibraryFilterBar";
import LibrarySection from "./components/LibrarySection";
import ErrorStateCard from "../../../components/Dashboard/ErrorStateCard";
import SkeletonLoader from "../../../components/SkeletonLoader";
import { ActivityIndicator } from "react-native";

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
    id: "BREATHING",
    title: "Breath & Flow Control",
    subtitle: "Respiratory Technique",
    about:
      "Breathing is the engine of speech. These tools help you control airflow and reduce muscular tension before you even start speaking.",
    techniqueIds: [
      TECHNIQUES_ENUM.DIAPHRAGMATIC_BREATHING,
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
      TECHNIQUES_ENUM.VOCAL_WARMUP,
    ],
  },
  {
    id: "CBT_ACT",
    title: "Mind & Mindset",
    subtitle: "Cognitive-Behavioural & Acceptance",
    about:
      "Tools that address the thoughts, beliefs, and emotional patterns that maintain stuttering-related anxiety and avoidance.",
    techniqueIds: [
      TECHNIQUES_ENUM.COGNITIVE_RESTRUCTURING,
      TECHNIQUES_ENUM.ACT_DEFUSION,
      TECHNIQUES_ENUM.VALUES_CLARIFICATION,
      TECHNIQUES_ENUM.ACCEPTANCE,
    ],
  },
  {
    id: "EXPOSURE",
    title: "Facing Fear Head-On",
    subtitle: "Desensitization & Exposure",
    about:
      "Systematic approaches to reducing fear, shame, and avoidance by gradually confronting speaking situations.",
    techniqueIds: [
      TECHNIQUES_ENUM.SELF_DISCLOSURE,
      TECHNIQUES_ENUM.HIERARCHY_EXPOSURE,
      TECHNIQUES_ENUM.FEARED_WORD_APPROACH,
    ],
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
  const insets = useSafeAreaInsets();
  const HEADER_HEIGHT = 60;
  const { user } = useUserStore();

  const [isSearching, setIsSearching] = useState(false);
  const [searchText, setSearchText] = useState("");
  const inputFieldRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  const [allTechniques, setAllTechniques] = useState<
    Array<TransformedTechnique>
  >([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selection Modal State
  const [selectedTechnique, setSelectedTechnique] =
    useState<TransformedTechnique | null>(null);
  const [isSelectionModalVisible, setIsSelectionModalVisible] = useState(false);

  const searchBarScale = useRef(new Animated.Value(1)).current;
  const searchIconScale = useRef(new Animated.Value(1)).current;
  const searchAnim = useRef(new Animated.Value(0)).current;

  // Header Elevation Animation based on scroll
  const scrollY = useRef(new Animated.Value(0)).current;

  // Enable LayoutAnimation on Android
  useEffect(() => {
    if (
      Platform.OS === "android" &&
      UIManager.setLayoutAnimationEnabledExperimental
    ) {
      UIManager.setLayoutAnimationEnabledExperimental(true);
    }
  }, []);

  // Trigger animation when filter changes
  useEffect(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
  }, [activeFilter]);

  const fetchLibraryDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      const libData = await getLibraryDetails();
      const flat: TransformedTechnique[] = [];
      libData.forEach((cat) => {
        flat.push(...cat.techniques);
      });
      const unique = Array.from(
        new Map(flat.map((item) => [item.id, item])).values(),
      );
      setAllTechniques(unique);
      setLoading(false);
    } catch (e) {
      console.error("Failed to fetch library", e);
      setError(e instanceof Error ? e.message : "Failed to load library");
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLibraryDetails();
  }, []);

  const handleRetry = () => {
    fetchLibraryDetails();
  };

  useEffect(() => {
    if (isSearching && inputFieldRef.current) {
      inputFieldRef.current.focus();
    }
  }, [isSearching]);

  useEffect(() => {
    if (isSearching && scrollViewRef.current) {
      scrollViewRef.current.scrollTo({ y: 0, animated: true });
    }
  }, [searchText, isSearching]);

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
            t.description.toLowerCase().includes(searchLower) ||
            (t.tutorial?.title && t.tutorial.title.toLowerCase().includes(searchLower)) ||
            group.title.toLowerCase().includes(searchLower) ||
            group.subtitle.toLowerCase().includes(searchLower),
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
      <View
        style={[
          styles.fixedHeaderContainer,
          { paddingTop: insets.top + 10 },
        ]}
      >
        {/* Dynamic Frosted Background Layer */}
        <Animated.View
          style={[
            StyleSheet.absoluteFillObject,
            { opacity: headerBgOpacity },
          ]}
        >
          <BlurView
            intensity={80}
            tint="light"
            style={StyleSheet.absoluteFillObject}
          />
        </Animated.View>

        {/* Top Bar */}
        <Animated.View
          style={[
            styles.headerTopBar,
            { transform: [{ scale: searchBarScale }], height: HEADER_HEIGHT },
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
                onPress={() => navigationAcademy.goBack()}
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

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingTop: insets.top + HEADER_HEIGHT + 96 }, // Significant gap after filters
        ]}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: false },
        )}
        scrollEventThrottle={16}
      >

        {loading && allTechniques.length === 0 ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={theme.colors.actionPrimary.default}
            />
            <Text style={styles.loadingText}>Fetching techniques...</Text>
          </View>
        ) : error && allTechniques.length === 0 ? (
          <View style={{ paddingHorizontal: 16 }}>
            <ErrorStateCard
              onRetry={handleRetry}
              variant="light"
              title="Library unavailable"
              message="We couldn't load the technique library. Check your connection and try again."
              style={{ marginVertical: 20 }}
            />
          </View>
        ) : groupedData.length > 0 ? (
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
        showCloseButton={true}
        fitContent={true}
      >
        <LinearGradient
          colors={["#FFFCF9", "#FFF7ED"]} // Soft beige gradient
          style={[
            styles.modalGradientContainer,
            { paddingBottom: Math.max(insets.bottom, 48) },
          ]}
        >
          {/* Watermark Background */}
          <View style={styles.modalWatermark} pointerEvents="none">
            <Icon
              name={(() => {
                const group = SLP_GROUPS.find((g) =>
                  g.techniqueIds.includes(
                    selectedTechnique?.id as TECHNIQUES_ENUM,
                  ),
                );
                switch (group?.id) {
                  case "UNDERSTANDING":
                    return "eye";
                  case "MODIFICATION":
                    return "tools";
                  case "FLUENCY":
                    return "feather-alt";
                  case "BREATHING":
                    return "wind";
                  case "RELAXATION":
                    return "spa";
                  case "VOCAL":
                    return "microphone-alt";
                  case "CBT_ACT":
                    return "brain";
                  case "EXPOSURE":
                    return "mountain";
                  default:
                    return "lightbulb";
                }
              })()}
              size={180}
              color={theme.colors.library.orange[200]}
              style={{ opacity: 0.25, transform: [{ rotate: "-15deg" }] }}
            />
          </View>

          <Text style={styles.premiumModalTitle}>Choose Mode</Text>
          <Text style={styles.premiumModalSubtitle}>
            How would you like to practice {selectedTechnique?.name}?
          </Text>

          <View style={styles.premiumModalActions}>
            <TouchableOpacity
              style={styles.premiumButtonShadow}
              activeOpacity={0.8}
              onPress={() => handleNavigate("TUTORIAL")}
            >
              <LinearGradient
                colors={[
                  theme.colors.actionPrimary.default,
                  theme.colors.actionPrimary.default,
                ]} // Standard Primary
                style={styles.premiumButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Icon
                  name="play"
                  color="#FFF"
                  size={16}
                  style={{ marginRight: 8 }}
                />
                <Text style={styles.premiumButtonTextPrimary}>
                  Watch Tutorial
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.premiumButtonSecondary}
              activeOpacity={0.7}
              onPress={() => handleNavigate("EXERCISE")}
            >
              <Icon
                name="dumbbell"
                color={theme.colors.text.default}
                size={16}
                style={{ marginRight: 8 }}
              />
              <Text style={styles.premiumButtonTextSecondary}>
                Start Exercise
              </Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </BottomSheetModal>
    </ScreenView>
  );
};

export default Library;

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
  },
  glassBackground: {
    backgroundColor: "rgba(255,255,255,0.85)",
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

  // Premium Modal Styles
  modalGradientContainer: {
    padding: 32,
    alignItems: "center",
    paddingBottom: 48,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    position: "relative",
    overflow: "hidden", // Clip watermark
  },
  modalWatermark: {
    position: "absolute",
    right: -40,
    top: -20,
    zIndex: 0,
  },
  premiumModalTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "#111827",
    fontSize: 28,
    fontWeight: "800",
    marginBottom: 8,
    textAlign: "center",
    letterSpacing: -0.5,
    zIndex: 1,
    marginTop: 16,
  },
  premiumModalSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: "#374151",
    fontSize: 17,
    lineHeight: 26,
    textAlign: "center",
    marginBottom: 32,
    zIndex: 1,
    opacity: 0.9,
  },
  premiumModalActions: {
    width: "100%",
    gap: 16, // Increased gap
    zIndex: 1,
  },
  premiumButtonShadow: {
    width: "100%",
    borderRadius: 30, // Increased radius to match standard
    shadowColor: theme.colors.actionPrimary.default,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  premiumButtonGradient: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 18,
    borderRadius: 30,
  },
  premiumButtonTextPrimary: {
    ...parseTextStyle(theme.typography.Button),
    color: "#FFFFFF",
    fontWeight: "700", // Standard weight
    fontSize: 16,
    letterSpacing: 0.5,
  },
  premiumButtonSecondary: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 18,
    borderRadius: 30, // Match primary
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.1)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  premiumButtonTextSecondary: {
    ...parseTextStyle(theme.typography.Button),
    color: "#374151",
    fontWeight: "700", // Match strength
    fontSize: 16,
    letterSpacing: 0.5,
  },
  loadingContainer: {
    padding: 60,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.disabled,
  },
});
