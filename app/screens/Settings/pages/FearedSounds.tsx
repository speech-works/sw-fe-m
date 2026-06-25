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
import Icon from "react-native-vector-icons/FontAwesome5";
import { LinearGradient } from "expo-linear-gradient";
import Svg, { Path } from "react-native-svg";

import { getPhonemes } from "../../../api/phonemes";
import { Phoneme } from "../../../api/phonemes/types";
import { Audio } from "expo-av";
import { getMyUser, updateMyUser } from "../../../api/users";
import ScreenView from "../../../components/ScreenView";
import { useUserStore } from "../../../stores/user";
import { theme } from "../../../Theme/tokens";
import { SettingsStackNavigationProp } from "../../../navigators/stacks/SettingsStack/types";

const BridgeSVG = ({ color }: { color: string }) => (
  <Svg width={48} height={72} viewBox="0 0 48 72">
    <Path
      d="M 0 8 Q 24 36, 48 8 L 48 64 Q 24 36, 0 64 Z"
      fill={color}
    />
  </Svg>
);

const FearedSounds = () => {
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
    const bgColor = isSelected ? theme.colors.actionPrimary.default : "#2A2A2A";
    const textColor = isSelected ? "#FFFFFF" : "#FFFFFF";
    const subTextColor = isSelected ? "rgba(255,255,255,0.7)" : "rgba(255,255,255,0.5)";

    return (
      <TouchableOpacity
        activeOpacity={0.9}
        onPress={() => handleToggleSound(item)}
        style={styles.row}
      >
        <View style={[styles.bridgeContainer, { zIndex: 1 }]}>
          <BridgeSVG color={bgColor} />
        </View>

        <View style={[styles.avatar, { backgroundColor: bgColor, zIndex: 2 }]}>
          <View style={styles.avatarInner}>
            <Text style={styles.ipaText}>{item.ipaSymbol}</Text>
          </View>
        </View>

        <View style={[styles.pill, { backgroundColor: bgColor, zIndex: 2 }]}>
          <View style={styles.pillContent}>
            <Text style={[styles.phonemeLabel, { color: textColor }]}>{item.displayLabel}</Text>
            {Array.isArray(item.examples) && item.examples.length > 0 && (
              <Text style={[styles.examplesText, { color: subTextColor }]} numberOfLines={1}>
                {item.examples.join(", ")}
              </Text>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenView style={styles.screenView}>
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#121212", "#121212", "#121212"]}
          locations={[0, 0.4, 1]}
          style={{ flex: 1 }}
        />
      </View>

      <View
        style={[
          styles.header,
          { paddingTop: insets.top + 10, height: 60 + insets.top },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="arrow-left" size={16} color="#FFFFFF" />
        </TouchableOpacity>
      </View>

      <View style={styles.container}>
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator
              size="large"
              color={theme.colors.actionPrimary.default}
            />
          </View>
        ) : (
          <FlatList
            ListHeaderComponent={
              <View style={styles.intro}>
                <Text style={styles.introTitle}>Difficult Sounds</Text>
                <Text style={styles.introDesc}>
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
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={isSaving}
          activeOpacity={0.9}
        >
          {isSaving ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.saveButtonText}>Apply Practice Focus</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScreenView>
  );
};

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
    backgroundColor: "#121212",
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
    paddingHorizontal: 20,
    backgroundColor: "transparent",
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#2C2C2E",
  },
  container: {
    flex: 1,
  },
  intro: {
    gap: 4,
    marginBottom: 32,
  },
  introTitle: {
    fontSize: 28,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  introDesc: {
    fontSize: 15,
    color: "#9CA3AF",
    lineHeight: 22,
    marginTop: 8,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 120,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    height: 72,
    marginBottom: 16,
  },
  bridgeContainer: {
    position: "absolute",
    left: 52,
    width: 48,
    height: 72,
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarInner: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  ipaText: {
    fontSize: 22,
    fontWeight: "800",
    color: "#000000",
  },
  pill: {
    flex: 1,
    height: 72,
    borderRadius: 36,
    marginLeft: 8,
    paddingLeft: 24,
    paddingRight: 16,
    flexDirection: "row",
    alignItems: "center",
  },
  pillContent: {
    flex: 1,
    justifyContent: "center",
    gap: 2,
  },
  phonemeLabel: {
    fontSize: 17,
    fontWeight: "700",
  },
  examplesText: {
    fontSize: 13,
    fontWeight: "500",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 24,
    backgroundColor: "transparent",
  },
  saveButton: {
    height: 56,
    borderRadius: 28,
    backgroundColor: theme.colors.actionPrimary.default,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
  },
  saveButtonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
});

export default FearedSounds;
