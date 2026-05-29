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
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { BlurView } from "expo-blur";
import { getPhonemes } from "../../../api/phonemes";
import { Phoneme } from "../../../api/phonemes/types";
import { getMyUser, updateMyUser } from "../../../api/users";
import AudioPlaybackButton from "../../../components/AudioPlaybackButton";
import ScreenView from "../../../components/ScreenView";
import { useUserStore } from "../../../stores/user";
import { theme } from "../../../Theme/tokens";
import {
  parseShadowStyle,
  parseTextStyle,
} from "../../../util/functions/parseStyles";
import { LinearGradient } from "expo-linear-gradient";
import CheckBox from "../../../components/CheckBox";

import { SettingsStackNavigationProp } from "../../../navigators/stacks/SettingsStack/types";

const FearedSounds = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<SettingsStackNavigationProp<"FearedSounds">>();
  const { user, setUser } = useUserStore();
  const [phonemes, setPhonemes] = useState<Phoneme[]>([]);
  const [selectedSounds, setSelectedSounds] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const HEADER_HEIGHT = 60;

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

  const handleToggleSound = (code: string) => {
    setSelectedSounds((prev) =>
      prev.includes(code) ? prev.filter((s) => s !== code) : [...prev, code],
    );
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
            <View style={styles.labelRow}>
              <Text style={styles.ipaText}>{item.ipaSymbol}</Text>
              <Text style={styles.dot}>·</Text>
              <Text style={styles.phonemeLabel}>{item.displayLabel}</Text>
            </View>
            {Array.isArray(item.examples) && item.examples.length > 0 && (
              <Text style={styles.examplesText} numberOfLines={1}>
                {item.examples.join(", ")}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.audioContainer}>
          <AudioPlaybackButton
            audioUrl={item.audioUrl}
            activeColor={theme.colors.actionPrimary.default}
            iconSize={12}
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <ScreenView style={styles.screenView}>
      {/* Aurora Background */}
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={["#FFF7ED", "#FFF", "#FFF"] as const}
          locations={[0, 0.4, 1]}
          style={{ flex: 1 }}
        />
      </View>

      <BlurView
        intensity={80}
        tint="light"
        style={[
          styles.header,
          { paddingTop: insets.top + 10, height: HEADER_HEIGHT + insets.top },
        ]}
      >
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <Icon name="chevron-left" size={16} color={theme.colors.text.title} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Difficult Sounds</Text>
        <View style={{ width: 32 }} />
      </BlurView>

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
              <View style={styles.listHeader}>
                <View style={styles.bgBubble} pointerEvents="none" />
                <Text style={styles.description}>
                  Select the phonetic sounds you find challenging. We&apos;ll prioritize
                  these in your practice sessions.
                </Text>
              </View>
            }
            data={phonemes}
            keyExtractor={(item) => item.code}
            renderItem={renderPhonemeItem}
            contentContainerStyle={[
              styles.listContent,
              { paddingTop: HEADER_HEIGHT + insets.top + 20 }
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
          <LinearGradient
            colors={[
              "#fb923c",
              "#ea580c",
            ]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.saveGradient}
          >
            {isSaving ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <View style={styles.saveButtonContent}>
                <Text style={styles.saveButtonText}>Apply Practice Focus</Text>
              </View>
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
    backgroundColor: "#F8FAFC",
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
  },
  container: {
    flex: 1,
  },
  listHeader: {
    paddingBottom: 24,
    gap: 8,
  },
  sectionLabel: {
    fontSize: 11,
    fontWeight: "800",
    color: "#94A3B8",
    letterSpacing: 1,
  },
  description: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: "#64748B",
    lineHeight: 22,
    fontSize: 15,
  },
  bgBubble: {
    position: "absolute",
    top: -40,
    right: -40,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "rgba(251, 146, 60, 0.05)",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 140,
    paddingHorizontal: 20,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#FFFFFF",
    padding: 16,
    borderRadius: 24,
    marginBottom: 12,
    ...parseShadowStyle(theme.shadow.elevation1),
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  selectedCard: {
    backgroundColor: "#FFF7ED",
    borderColor: "#FFEDD5",
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 16,
  },
  infoContainer: {
    flex: 1,
    gap: 4,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  ipaText: {
    fontSize: 18,
    fontWeight: "800",
    color: theme.colors.text.title,
  },
  dot: {
    fontSize: 16,
    color: "#CBD5E1",
    fontWeight: "800",
  },
  phonemeLabel: {
    fontSize: 17,
    fontWeight: "700",
    color: theme.colors.text.title,
  },
  examplesText: {
    fontSize: 14,
    color: "#64748B",
    fontWeight: "500",
  },
  audioContainer: {
    width: 32,
    height: 32,
    borderRadius: 12,
    backgroundColor: "#F8FAFC",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  footer: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 24,
    backgroundColor: "rgba(255,255,255,0.9)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
  },
  saveButton: {
    borderRadius: 20,
    overflow: "hidden",
    ...parseShadowStyle(theme.shadow.elevation2),
  },
  saveGradient: {
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  saveButtonText: {
    color: "#FFF",
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});

export default FearedSounds;
