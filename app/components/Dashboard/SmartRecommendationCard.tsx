import React from "react";
import { StyleSheet, View, Text, TouchableOpacity, Dimensions } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { theme } from "../../Theme/tokens";
import { parseTextStyle } from "../../util/functions/parseStyles";
import { MaterialCommunityIcons } from '@expo/vector-icons';

const screenWidth = Dimensions.get("window").width;

const SmartRecommendationCard = () => {
  // MOCK DATA - To be replaced with usePackStore
  const packData = {
    title: "Stabilization Pack",
    subtitle: "Regain control and confidence",
    currentModule: 2,
    totalModules: 7,
    progress: 0.28,
    nextModule: {
        title: "Breathing Techniques",
        description: "Master controlled patterns",
        duration: "~8 min",
        type: "AUDIO" // or VIDEO, QUIZ
    }
  };

  const isSafetyMode = true; // Derived from category

  // Softer Gradient: Orange 300 -> Red 300 (Peach/Salmon look)
  const gradientColors = [theme.colors.library.red[300], theme.colors.library.orange[400]];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={gradientColors as any}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.gradient}
      >
          {/* Decorative Bubble Circles */}
          <View style={styles.bubbleTopRight} />
          <View style={styles.bubbleBottomLeft} />

          {/* 1. Header Section */}
          <View style={styles.headerRow}>
            <View>
                <View style={styles.chip}>
                    <MaterialCommunityIcons name="fire" size={14} color="white" />
                    <Text style={styles.chipText}>Recommended</Text>
                </View>
                <Text style={styles.packTitle}>{packData.title}</Text>
                <Text style={styles.packSubtitle}>{packData.subtitle}</Text>
            </View>
            <View style={styles.iconBox}>
                 <MaterialCommunityIcons 
                    name={isSafetyMode ? "spa" : "lightning-bolt"} 
                    size={32} 
                    color="white" 
                 />
            </View>
          </View>

          {/* 2. Progress Section */}
          <View style={styles.progressSection}>
            <View style={styles.progressLabels}>
                <Text style={styles.progressText}>Module {packData.currentModule} of {packData.totalModules}</Text>
                <Text style={styles.progressText}>{Math.round(packData.progress * 100)}%</Text>
            </View>
            <View style={styles.progressBarBg}>
                <View style={[styles.progressBarFill, { width: `${packData.progress * 100}%` }]} />
            </View>
          </View>

          {/* 3. Next Module Card (Glassmorphism) */}
          <View style={styles.glassCard}>
            <View style={styles.moduleIconBox}>
                <MaterialCommunityIcons name="microphone" size={24} color={theme.colors.actionPrimary.default} />
            </View>
            <View style={styles.moduleInfo}>
                <Text style={styles.moduleTitle}>{packData.nextModule.title}</Text>
                <Text style={styles.moduleDesc}>{packData.nextModule.description}</Text>
            </View>
            <TouchableOpacity style={styles.playButton} activeOpacity={0.7}>
                 <MaterialCommunityIcons name="play" size={20} color={theme.colors.actionPrimary.default} />
            </TouchableOpacity>
          </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
    borderRadius: 24,
    // Fancy shadow
    shadowColor: theme.colors.actionPrimary.default,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 8,
    overflow: 'hidden',
  },
  gradient: {
    borderRadius: 24,
    padding: 24,
    position: 'relative',
  },
  bubbleTopRight: {
    position: 'absolute',
    top: -60,
    right: -60,
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  bubbleBottomLeft: {
    position: 'absolute',
    bottom: -50,
    left: -50,
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
    zIndex: 1,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
    gap: 6
  },
  chipText: {
    color: 'white',
    fontSize: 12,
    fontWeight: '700',
  },
  packTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    color: "white",
    marginBottom: 4,
  },
  packSubtitle: {
    ...parseTextStyle(theme.typography.BodySmall),
    color: 'rgba(255, 255, 255, 0.9)',
  },
  iconBox: {
    width: 56,
    height: 56,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  progressSection: {
    marginBottom: 24,
    zIndex: 1,
  },
  progressLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  progressText: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: 12,
    fontWeight: '600',
  },
  progressBarBg: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: 'white',
    borderRadius: 3,
  },
  glassCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.9)', // High opacity for readability
    padding: 16,
    borderRadius: 20,
    alignItems: 'center',
    zIndex: 1,
  },
  moduleIconBox: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: theme.colors.background.default, // Light orange
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 14,
  },
  moduleInfo: {
    flex: 1,
  },
  moduleTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: theme.colors.text.title,
    marginBottom: 2,
  },
  moduleDesc: {
    fontSize: 12,
    color: theme.colors.text.default,
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background.default,
    justifyContent: 'center',
    alignItems: 'center',
  }
});

export default SmartRecommendationCard;