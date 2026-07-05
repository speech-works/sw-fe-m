import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getPhonemes } from "../../api/phonemes";
import { Phoneme } from "../../api/phonemes/types";
import { getMyUser, updateMyUser } from "../../api/users";
import AudioPlaybackButton from "../../components/AudioPlaybackButton";
import PressableScale from "../../components/PressableScale";
import { useUserStore } from "../../stores/user";
import {
  borderWidth,
  Button,
  Checkbox,
  Page,
  radius,
  space,
  Spinner,
  Text,
  useTheme,
} from "../../design-system";
import { OnboardingStackNavigationProp } from "../../navigators/stacks/OnboardingStack/types";

const OnboardingPhonemes = () => {
  const { colors } = useTheme();
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
      <PressableScale
        onPress={() => handleToggleSound(item.code)}
        style={[
          styles.card,
          {
            backgroundColor: isSelected
              ? colors.surface.rowSelected
              : colors.surface.default,
            borderColor: isSelected
              ? colors.border.selected
              : colors.border.default,
          },
        ]}
      >
        <View style={styles.cardLeft}>
          <Checkbox
            checked={isSelected}
            onChange={() => handleToggleSound(item.code)}
          />
          <View style={styles.infoContainer}>
            <Text variant="title">
              {item.ipaSymbol} · {item.displayLabel}
            </Text>
            {Array.isArray(item.examples) && item.examples.length > 0 && (
              <Text variant="bodySm" color="secondary" style={styles.examplesText}>
                e.g., {item.examples.join(", ")}
              </Text>
            )}
          </View>
        </View>
        <AudioPlaybackButton
          audioUrl={item.audioUrl}
          activeColor={colors.action.primary}
        />
      </PressableScale>
    );
  };

  return (
    <Page
      title="Difficult Sounds"
      description="Select the phonetic sounds you find challenging. We'll use this to customize your practice."
      scroll={!isLoading}
      list={
        isLoading
          ? undefined
          : {
              data: phonemes,
              renderItem: renderPhonemeItem,
              keyExtractor: (item: Phoneme) => item.code,
              extraData: selectedSounds,
            }
      }
      footer={
        <Button
          label="Next"
          onPress={handleNext}
          loading={isSaving}
          disabled={isSaving}
        />
      }
    >
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <Spinner size="large" />
        </View>
      ) : null}
    </Page>
  );
};

// Geometry only — colors are applied inline from useTheme() at render time.
const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: space.cardPad,
    borderRadius: radius.card,
    marginBottom: space.rowGap,
    borderWidth: borderWidth.thin,
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: space.iconText,
  },
  infoContainer: {
    flex: 1,
  },
  examplesText: {
    marginTop: space.titleSub,
  },
});

export default OnboardingPhonemes;
