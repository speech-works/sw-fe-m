import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { Audio } from "expo-av";
import { getPhonemes } from "../../api/phonemes";
import { Phoneme } from "../../api/phonemes/types";
import { getMyUser, updateMyUser } from "../../api/users";
import { useUserStore } from "../../stores/user";
import {
  Button,
  ConnectedAvatarRow,
  Page,
  spacing,
  Spinner,
  useTheme,
} from "../../design-system";
import { OnboardingStackNavigationProp } from "../../navigators/stacks/OnboardingStack/types";

/**
 * Onboarding "Difficult Sounds" — the same picker as Settings › Preferences ›
 * Difficult Sounds (screens/Settings/pages/FearedSounds), so a sound row looks
 * and behaves identically in both places. Rows are the DS `ConnectedAvatarRow`,
 * which flips its title/subtitle to dark ink on the bright selected fill (the
 * hand-rolled card here used to leave the examples nearly invisible on orange).
 * Tapping a row toggles it AND plays the sound, exactly like Settings.
 *
 * Only the onboarding chrome differs: this saves and advances to OnboardingDone
 * (Settings saves and goes back).
 */
const OnboardingPhonemes = () => {
  const { colors } = useTheme();
  const navigation =
    useNavigation<OnboardingStackNavigationProp<"OnboardingPhonemes">>();
  const { user, setUser } = useUserStore();
  const [phonemes, setPhonemes] = useState<Phoneme[]>([]);
  const [selectedSounds, setSelectedSounds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // Native AVPlayer instances must be released explicitly — track the active
  // one so it can be unloaded on replacement and on unmount. (Ported verbatim
  // from FearedSounds so audio lifecycle is identical in both screens.)
  const soundRef = useRef<Audio.Sound | null>(null);
  const unmountedRef = useRef(false);

  useEffect(
    () => () => {
      unmountedRef.current = true;
      soundRef.current?.unloadAsync();
      soundRef.current = null;
    },
    [],
  );

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

  const handleToggleSound = async (item: Phoneme) => {
    const { code, audioUrl } = item;
    setSelectedSounds((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code],
    );

    if (audioUrl) {
      try {
        await soundRef.current?.unloadAsync().catch(() => {});
        soundRef.current = null;
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true },
        );
        if (unmountedRef.current) {
          sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          const done = status.isLoaded ? status.didJustFinish : !!status.error;
          if (done) {
            sound.unloadAsync();
            if (soundRef.current === sound) soundRef.current = null;
          }
        });
      } catch (error) {
        console.error("Error playing sound:", error);
      }
    }
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
    const examples =
      Array.isArray(item.examples) && item.examples.length > 0
        ? item.examples.join(", ")
        : undefined;
    return (
      <View style={styles.rowSpacer}>
        <ConnectedAvatarRow
          glyph={item.ipaSymbol}
          title={item.displayLabel}
          subtitle={examples}
          subtitleColor={colors.text.tertiary}
          trailing="audio"
          selected={isSelected}
          onPress={() => handleToggleSound(item)}
        />
      </View>
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

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  rowSpacer: {
    marginBottom: spacing.lg,
  },
});

export default OnboardingPhonemes;
