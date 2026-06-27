import { useNavigation } from "@react-navigation/native";
import React, { useEffect, useState } from "react";
import { StyleSheet, View, FlatList } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { getPhonemes } from "../../../api/phonemes";
import { Phoneme } from "../../../api/phonemes/types";
import { Audio } from "expo-av";
import { getMyUser, updateMyUser } from "../../../api/users";
import ScreenView from "../../../components/ScreenView";
import { useUserStore } from "../../../stores/user";
import { SettingsStackNavigationProp } from "../../../navigators/stacks/SettingsStack/types";
import {
  useTheme,
  spacing,
  Text,
  Button,
  IconButton,
  Spinner,
  ConnectedAvatarRow,
} from "../../../design-system";

const FearedSounds = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<SettingsStackNavigationProp<"FearedSounds">>();
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
        const { sound } = await Audio.Sound.createAsync(
          { uri: audioUrl },
          { shouldPlay: true }
        );
        sound.setOnPlaybackStatusUpdate((status) => {
          if (status.isLoaded && status.didJustFinish) {
            sound.unloadAsync();
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
    <ScreenView style={[styles.screenView, { backgroundColor: colors.background.canvas }]}>
      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 10, height: 60 + insets.top },
        ]}
      >
        <IconButton name="arrow-left" onPress={() => navigation.goBack()} />
      </View>

      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <Spinner size="large" />
          </View>
        ) : (
          <FlatList
            ListHeaderComponent={
              <View style={styles.intro}>
                <Text variant="h1">Difficult Sounds</Text>
                <Text variant="body" color="secondary" style={{ marginTop: 8 }}>
                  Select the phonetic sounds you find challenging. We'll prioritize these in your practice sessions.
                </Text>
              </View>
            }
            data={phonemes}
            keyExtractor={(item) => item.code}
            renderItem={renderPhonemeItem}
            contentContainerStyle={[
              styles.listContent,
              { paddingTop: 60 + insets.top + 20 }
            ]}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      <View
        style={[
          styles.footer,
          { paddingBottom: Math.max(insets.bottom + 12, 32) },
        ]}
      >
        <Button
          label="Apply Practice Focus"
          onPress={handleSave}
          loading={isSaving}
        />
      </View>
    </ScreenView>
  );
};

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.xl,
    backgroundColor: "transparent",
  },
  container: {
    flex: 1,
  },
  intro: {
    marginBottom: spacing["3xl"],
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: spacing.xl,
    paddingBottom: 120,
  },
  rowSpacer: {
    marginBottom: spacing.lg,
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing["2xl"],
    backgroundColor: "transparent",
  },
});

export default FearedSounds;
