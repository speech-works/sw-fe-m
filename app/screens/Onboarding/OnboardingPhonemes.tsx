import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  FlatList,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { getPhonemes } from "../../api/phonemes";
import { Phoneme } from "../../api/phonemes/types";
import { getMyUser, updateMyUser } from "../../api/users";
import AudioPlaybackButton from "../../components/AudioPlaybackButton";
import ScreenView from "../../components/ScreenView";
import { useUserStore } from "../../stores/user";
import { theme } from "../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../util/functions/parseStyles";
import { LinearGradient } from "expo-linear-gradient";
import CheckBox from "../../components/CheckBox";
import { OnboardingStackNavigationProp } from "../../navigators/stacks/OnboardingStack/types";

const OnboardingPhonemes = () => {
  const insets = useSafeAreaInsets();
  const navigation =
    useNavigation<OnboardingStackNavigationProp<"OnboardingPhonemes">>();
  const { user, setUser } = useUserStore();
  const [phonemes, setPhonemes] = useState<Phoneme[]>([]);
  const [selectedSounds, setSelectedSounds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [phonemesData, userData] = await Promise.all([
          getPhonemes(),
          getMyUser(),
        ]);
        const initialSelected = userData.fearedSounds || [];
        const sortedPhonemes = [...phonemesData].sort((a, b) => {
          const aSelected = initialSelected.includes(a.code);
          const bSelected = initialSelected.includes(b.code);
          if (aSelected && !bSelected) return -1;
          if (!aSelected && bSelected) return 1;
          return 0;
        });
        setPhonemes(sortedPhonemes);
        setSelectedSounds(initialSelected);
      } catch (error) {
        console.error("Error fetching phonemes:", error);
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const handleToggleSound = (code: string) => {
    setSelectedSounds((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code],
    );
  };

  const handleNext = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const updatedUser = await updateMyUser({
        fearedSounds: selectedSounds,
      });
      setUser(updatedUser);
      navigation.navigate("OnboardingDone");
    } catch (error) {
      console.error("Error saving feared sounds:", error);
    } finally {
      setIsSaving(false);
    }
  };

  const renderPhonemeItem = ({ item }: { item: Phoneme }) => {
    const isSelected = selectedSounds.includes(item.code);
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        onPress={() => handleToggleSound(item.code)}
        style={[styles.card, isSelected && styles.selectedCard]}
      >
        <View style={styles.cardLeft}>
          <CheckBox
            checked={isSelected}
            onToggle={() => handleToggleSound(item.code)}
          />
          <View style={styles.infoContainer}>
            <Text style={styles.phonemeLabel}>
              {item.ipaSymbol} · {item.displayLabel}
            </Text>
            {Array.isArray(item.examples) && item.examples.length > 0 && (
              <Text style={styles.examplesText}>
                e.g., {item.examples.join(", ")}
              </Text>
            )}
          </View>
        </View>
        <AudioPlaybackButton
          audioUrl={item.audioUrl}
          activeColor={theme.colors.actionPrimary.default}
        />
      </TouchableOpacity>
    );
  };

  return (
    <ScreenView style={styles.screenView}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Difficult Sounds</Text>
          <Text style={styles.subtitle}>
            Select the phonetic sounds you find challenging. We&apos;ll use this
            to customize your practice.
          </Text>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={theme.colors.actionPrimary.default}
            />
          </View>
        ) : (
          <FlatList
            data={phonemes}
            keyExtractor={(item) => item.code}
            renderItem={renderPhonemeItem}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom + 8, 24) },
        ]}
      >
        <TouchableOpacity
          style={styles.nextButton}
          onPress={handleNext}
          disabled={isSaving}
        >
          <LinearGradient
            colors={[
              theme.colors.actionPrimary.default,
              theme.colors.library.orange[600],
            ]}
            style={styles.nextGradient}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <Text style={styles.nextButtonText}>Next</Text>
            )}
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </ScreenView>
  );
};

const styles = StyleSheet.create({
  screenView: {
    paddingBottom: 0,
    flex: 1,
    paddingHorizontal: 24,
  },
  container: {
    flex: 1,
  },
  header: {
    marginTop: 20,
    marginBottom: 32,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading1),
    color: theme.colors.text.title,
    marginBottom: 8,
  },
  subtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 40,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFF",
    padding: 16,
    borderRadius: 20,
    marginBottom: 12,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  selectedCard: {
    borderColor: theme.colors.actionPrimary.default,
    backgroundColor: theme.colors.library.blue[100],
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 12,
  },
  infoContainer: {
    flex: 1,
  },
  phonemeLabel: {
    ...parseTextStyle(theme.typography.Body),
    fontWeight: "700",
    color: theme.colors.text.title,
  },
  examplesText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: theme.colors.text.default,
    marginTop: 2,
  },
  footer: {
    paddingTop: 16,
  },
  nextButton: {
    borderRadius: 16,
    overflow: "hidden",
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  nextGradient: {
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  nextButtonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "800",
  },
});

export default OnboardingPhonemes;
