import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  TextInput,
  UIManager,
  View,
  TouchableOpacity,
} from "react-native";
import ScreenView from "../../../components/ScreenView";

import { useNavigation } from "@react-navigation/native";

import { CompositeNavigationProp } from "@react-navigation/native";
import { NativeStackNavigationProp } from "@react-navigation/native-stack";
import { getLibraryDetails } from "../../../api/library";
import {
  TECHNIQUES_ENUM,
  TransformedTechnique,
} from "../../../api/library/types";
import { LibStackParamList } from "../../../navigators/stacks/ExploreStack/LibraryStack/types";
import { ExploreStackParamList } from "../../../navigators/stacks/ExploreStack/types";
import { useRoute } from "@react-navigation/native";

// New Components
import { useUserStore } from "../../../stores/user";
import LibraryFilterBar, { FilterType } from "./components/LibraryFilterBar";
import LibrarySection from "./components/LibrarySection";
import { track } from "../../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../../util/analytics/analyticsEvents";
import {
  Text,
  Button,
  IconButton,
  SearchField,
  Spinner,
  EmptyState,
  ErrorState,
  PageHeader,
  useTheme,
  spacing,
  space,
  size,
  Sheet,
  Icon,
  radius,
} from "../../../design-system";

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
  NativeStackNavigationProp<ExploreStackParamList>
>;

const Library = () => {
  const { colors } = useTheme();
  const exploreNavigation = useNavigation<LibraryScreenNavigationProp>();
  const route = useRoute<any>();
  const { from } = (route.params || {}) as {
    from?: "HOME" | "EXPLORE" | "MOOD_CHECK";
  };

  const handleBack = () => {
    console.log("[Library] handleBack called. from:", from);
    if (from === "HOME") {
      // Try navigating directly to the Home screen name
      exploreNavigation.navigate("Home" as any);
    } else if (from === "EXPLORE") {
      // Try navigating directly to the Explore screen name
      exploreNavigation.navigate("Explore" as any);
    } else {
      console.log("[Library] Falling back to standard goBack");
      if (exploreNavigation.canGoBack()) {
        exploreNavigation.goBack();
      } else {
        // Last resort
        exploreNavigation.navigate("Home" as any);
      }
    }
  };

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

  // --- Search Handlers ---
  const handleSearchToggle = () => {
    setIsSearching(true);
  };

  const handleCancelSearch = () => {
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
    track(ANALYTICS_EVENTS.LIBRARY_TECHNIQUE_VIEWED, {
      techniqueId: tech.id,
      techniqueName: tech.name,
      level: tech.level,
    });
  };

  const handleNavigate = (type: "TUTORIAL" | "EXERCISE") => {
    setIsSelectionModalVisible(false);
    if (!selectedTechnique) return;
    track(ANALYTICS_EVENTS.LIBRARY_TECHNIQUE_STARTED, {
      techniqueId: selectedTechnique.id,
      techniqueName: selectedTechnique.name,
      mode: type,
    });
    setTimeout(() => {
      exploreNavigation.navigate("TechniquePage", {
        techniqueId: selectedTechnique.id,
        techniqueName: selectedTechnique.name,
        techniqueDesc: selectedTechnique.description,
        techniqueLevel: selectedTechnique.level,
        stage: type,
        from: from,
        hasFree: selectedTechnique.hasFree,
      });
    }, 300);
  };

  return (
    <ScreenView style={[styles.screenView, { backgroundColor: colors.background.canvas }]}>
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {/* Dark canvas. */}
      <View style={[StyleSheet.absoluteFillObject, { backgroundColor: colors.background.canvas }]} />

      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <PageHeader
          title="Library"
          description="Techniques to understand and reshape your speech."
          onBack={handleBack}
          standalone
        />

        {/* Search field — revealed on demand. */}
        {isSearching && (
          <View style={styles.searchWrap}>
            <SearchField
              placeholder="Find a technique..."
              value={searchText}
              onChangeText={setSearchText}
              onClear={handleClearText}
              autoFocus
            />
          </View>
        )}

        {/* Filter Bar (edge-to-edge — applies its own gutter) */}
        <View style={styles.filterWrap}>
          <LibraryFilterBar
            currentFilter={activeFilter}
            onSelectFilter={setActiveFilter}
          />
        </View>

        {loading && allTechniques.length === 0 ? (
          <View style={styles.stateWrap}>
            <Spinner label="Fetching techniques..." />
          </View>
        ) : error && allTechniques.length === 0 ? (
          <View style={styles.stateWrap}>
            <ErrorState
              onRetry={handleRetry}
              title="Library unavailable"
              message="We couldn't load the technique library. Check your connection and try again."
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
          <View style={styles.stateWrap}>
            <EmptyState
              icon="search"
              title="No techniques found"
              message="Nothing matches your search or filters yet."
            />
          </View>
        )}

        <View style={{ height: spacing["4xl"] }} />
      </ScrollView>

      <TouchableOpacity
        style={[styles.stickyFab, { backgroundColor: colors.action.primary, shadowColor: colors.shadow }]}
        activeOpacity={0.85}
        onPress={isSearching ? handleCancelSearch : handleSearchToggle}
      >
        <Icon name={isSearching ? "x" : "search"} size={24} color={colors.action.onPrimary} />
      </TouchableOpacity>

      {/* --- Selection Modal (dark) --- */}
      <Sheet visible={isSelectionModalVisible} onClose={() => setIsSelectionModalVisible(false)}>
        <View style={styles.modalContent}>
          <Text variant="h2" color="primary" center style={styles.modalTitle}>
            Choose Mode
          </Text>
          <Text variant="body" color="secondary" center style={styles.modalSubtitle}>
            How would you like to practice {selectedTechnique?.name}?
          </Text>

          <View style={styles.modalActions}>
            <Button
              label="Watch Tutorial"
              leftIcon="play"
              onPress={() => handleNavigate("TUTORIAL")}
            />
            <Button
              label="Start Exercise"
              variant="secondary"
              onPress={() => handleNavigate("EXERCISE")}
            />
          </View>
        </View>
      </Sheet>
    </ScreenView>
  );
};

export default Library;

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
    paddingBottom: 0,
  },
  scrollContent: {
    paddingHorizontal: 0,
    paddingBottom: size.tabBarSafe,
  },
  searchWrap: {
    paddingHorizontal: space.screenX,
    marginTop: space.groupGap,
  },
  filterWrap: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  stateWrap: {
    paddingHorizontal: space.screenX,
    marginTop: spacing["3xl"],
  },
  // Selection modal
  modalContent: {
    alignItems: "center",
    paddingTop: spacing.sm,
  },
  modalTitle: {
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  modalSubtitle: {
    marginBottom: spacing["2xl"],
    lineHeight: 24,
  },
  modalActions: {
    width: "100%",
    gap: spacing.md,
  },
  stickyFab: {
    position: "absolute",
    bottom: 110,
    right: spacing["2xl"],
    width: 46,
    height: 46,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
});
