import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";

import { getPhonemes } from "../../../api/phonemes";
import { Phoneme } from "../../../api/phonemes/types";
import { Audio } from "expo-av";
import { getMyUser, updateMyUser } from "../../../api/users";
import { useUserStore } from "../../../stores/user";
import { SettingsStackNavigationProp } from "../../../navigators/stacks/SettingsStack/types";
import {
  useTheme,
  spacing,
  Button,
  Spinner,
  ConnectedAvatarRow,
  Page,
} from "../../../design-system";

const FearedSounds = () => {
  const { colors } = useTheme();
  const navigation = useNavigation<SettingsStackNavigationProp<"FearedSounds">>();
  const { user, setUser } = useUserStore();
  const [phonemes, setPhonemes] = useState<Phoneme[]>([]);
  const [selectedSounds, setSelectedSounds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  // Native AVPlayer instances must be released explicitly — track the active
  // one so it can be unloaded on replacement and on unmount.
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
        console.error("Error fetching phonemes or user data:", error);
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
          { shouldPlay: true }
        );
        if (unmountedRef.current) {
          sound.unloadAsync();
          return;
        }
        soundRef.current = sound;
        sound.setOnPlaybackStatusUpdate((status) => {
          // Release on finish AND on load/playback error — an errored player
          // never reaches didJustFinish.
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

  const handleSave = async () => {
    if (!user) return;
    setIsSaving(true);
    try {
      const updatedUser = await updateMyUser({
        fearedSounds: selectedSounds,
      });
      setUser(updatedUser);
      navigation.goBack();
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
          selected={isSelected}
          onPress={() => handleToggleSound(item)}
        />
      </View>
    );
  };

  return (
    <Page
      title="Difficult Sounds"
      description="Select the phonetic sounds you find challenging. We'll prioritize these in your practice sessions."
      onBack={() => navigation.goBack()}
      footer={
        <Button
          label="Apply Practice Focus"
          onPress={handleSave}
          loading={isSaving}
        />
      }
      list={{
        data: phonemes,
        keyExtractor: (item) => item.code,
        renderItem: renderPhonemeItem,
        ListEmptyComponent: isLoading ? (
          <View style={styles.loadingContainer}>
            <Spinner size="large" />
          </View>
        ) : undefined,
      }}
    />
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: spacing["5xl"],
  },
  rowSpacer: {
    marginBottom: spacing.lg,
  },
});

export default FearedSounds;
