import React, { useState, useEffect, useCallback } from "react";
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Animated,
  Dimensions,
} from "react-native";
import { useNavigation, useRoute, RouteProp } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { theme } from "../../../Theme/tokens";
import {
  parseTextStyle,
  parseShadowStyle as parseStyleShadow,
} from "../../../util/functions/parseStyles";
import { PackModule, Pack } from "../../../api/packs/types";
import { ContentRenderer } from "../../../components/Pack/ContentRenderer";
import {
  completeModule,
  getModule,
  startModule,
  getPack,
} from "../../../api/packs";
import { LinearGradient } from "expo-linear-gradient";

import { AcademyStackNavigationProp } from "../../../navigators/stacks/AcademyStack/types";

type PackModuleScreenRouteProp = RouteProp<
  { params: { module: PackModule; packId: string } },
  "params"
>;

const { width } = Dimensions.get("window");

const PackModuleScreen = () => {
  const navigation = useNavigation<AcademyStackNavigationProp<"PackModule">>();
  const route = useRoute<PackModuleScreenRouteProp>();
  const { module: initialModule, packId } = route.params;

  const [module, setModule] = useState<PackModule>(initialModule);
  const [loading, setLoading] = useState(true);
  const [isCompleting, setIsCompleting] = useState(false);

  // Wizard State
  const [currentBlockIndex, setCurrentBlockIndex] = useState(0);

  // Animation for progress bar
  const [progressAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    const initModule = async () => {
      try {
        startModule(packId, initialModule.id).catch((err) =>
          console.log("Failed to mark start (non-fatal)", err),
        );

        if (initialModule.blocks && initialModule.blocks.length > 0) {
          setModule(initialModule);
          setLoading(false);
          return;
        }

        console.log("Fetching module full content...");
        let fullModule;
        try {
          fullModule = await getModule(packId, initialModule.id);
        } catch (apiError: any) {
          console.warn(
            "getModule failed (possibly 404), falling back to getPack",
            apiError.message,
          );
          const packData: Pack = await getPack(packId);
          fullModule = packData.modules.find((m) => m.id === initialModule.id);
        }

        if (fullModule) {
          setModule(fullModule);
        } else {
          console.error("Module data is empty/not found even after fallback");
        }
      } catch (err) {
        console.error("Failed to fetch module details", err);
      } finally {
        setLoading(false);
      }
    };

    initModule();
  }, [packId, initialModule]);

  // Update progress bar when index changes
  useEffect(() => {
    const total = module.blocks?.length || 1;
    const progress = (currentBlockIndex + 1) / total;
    Animated.timing(progressAnim, {
      toValue: progress,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [currentBlockIndex, module.blocks, progressAnim]);

  const handleNext = () => {
    if (module.blocks && currentBlockIndex < module.blocks.length - 1) {
      setCurrentBlockIndex((prev) => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentBlockIndex > 0) {
      setCurrentBlockIndex((prev) => prev - 1);
    }
  };

  // Completion State
  const [showSuccess, setShowSuccess] = useState(false);
  const [nextModuleId, setNextModuleId] = useState<string | null>(null);

  const handleComplete = async () => {
    try {
      setIsCompleting(true);
      await completeModule(packId, module.id);

      // Check for next module
      try {
        const packData: Pack = await getPack(packId);
        const nextMod = packData.modules.find(
          (m) => m.orderIndex === module.orderIndex + 1,
        );
        if (nextMod) {
          setNextModuleId(nextMod.id);
        }
      } catch (e) {
        console.warn("Failed to find next module", e);
      }

      setShowSuccess(true);
    } catch (error) {
      console.error("Failed to complete module", error);
      alert("Failed to complete module. Please try again.");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleNextModule = () => {
    if (nextModuleId) {
      // Reset state for new module
      setShowSuccess(false);
      setCurrentBlockIndex(0);
      setLoading(true);
      // Navigate to self with new params - essentially resetting the screen
      navigation.replace("PackModule", {
        module: { id: nextModuleId } as any,
        packId,
      });
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerContent]}>
        <ActivityIndicator
          size="large"
          color={theme.colors.actionPrimary.default}
        />
        <Text style={styles.loadingText}>Loading content...</Text>
      </SafeAreaView>
    );
  }

  if (showSuccess) {
    return (
      <SafeAreaView style={styles.successContainer}>
        <LinearGradient
          colors={["#FFF7ED", "#FFF", "#FFF"]}
          style={StyleSheet.absoluteFill}
        />

        <View style={styles.successContent}>
          <View style={styles.successIconContainer}>
            <LinearGradient
              colors={[
                theme.colors.library.orange[200],
                theme.colors.library.orange[100],
              ]}
              style={styles.iconGradient}
            />
            <MaterialCommunityIcons
              name="trophy"
              size={64}
              color={theme.colors.actionPrimary.default}
            />
          </View>

          <Text style={styles.successTitle}>Module Completed!</Text>
          <Text style={styles.successSubtitle}>
            Great job taking time for your nervous system. You're making real
            progress.
          </Text>

          <View style={styles.successActionContainer}>
            {nextModuleId && (
              <TouchableOpacity
                style={styles.successPrimaryButton}
                onPress={handleNextModule}
              >
                <LinearGradient
                  colors={[
                    theme.colors.actionPrimary.default,
                    "#F97316", // Slightly darker orange for gradient
                  ]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.successGradientButton}
                >
                  <MaterialCommunityIcons name="play" size={20} color="white" />
                  <Text style={styles.successPrimaryButtonText}>
                    Start Next Module
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={styles.successSecondaryButton}
              onPress={() => navigation.goBack()}
            >
              <Text style={styles.successSecondaryButtonText}>
                Back to Dashboard
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    );
  }

  const blocks = module.blocks || [];
  const currentBlock = blocks[currentBlockIndex];
  const isLastBlock = currentBlockIndex >= blocks.length - 1;
  const isFirstBlock = currentBlockIndex === 0;

  return (
    <View style={styles.safeArea}>
      <LinearGradient
        colors={["#FFF7ED", "#FFF", "#FFF"]} // Peach -> White -> White
        locations={[0, 0.4, 1]}
        style={StyleSheet.absoluteFillObject}
      />
      <SafeAreaView style={{ flex: 1 }}>
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={styles.backButton}
          >
            <MaterialCommunityIcons
              name="chevron-left"
              size={28}
              color={theme.colors.text.title}
            />
          </TouchableOpacity>
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerSubtitle}>
              MODULE {module.orderIndex}
            </Text>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {module.title.replace(/^Module \d+:\s*/, "")}
            </Text>
          </View>
          <View style={{ width: 40 }} />
        </View>

        {/* Progress Bar */}
        <View style={styles.progressContainer}>
          <Animated.View
            style={[
              styles.progressBar,
              {
                width: progressAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: ["0%", "100%"],
                }),
              },
            ]}
          />
        </View>

        {/* Wizard Content */}
        <View style={styles.contentWrapper}>
          <ScrollView contentContainerStyle={styles.contentContainer}>
            {blocks.length === 0 ? (
              <Text style={styles.emptyText}>
                No content available for this module.
              </Text>
            ) : (
              <View style={styles.stepContainer}>
                <Text style={styles.stepIndicator}>
                  Step {currentBlockIndex + 1} of {blocks.length}
                </Text>
                <ContentRenderer
                  key={currentBlock?.id || currentBlockIndex}
                  block={currentBlock}
                  packId={packId}
                  moduleId={module.id}
                />
              </View>
            )}
          </ScrollView>

          {/* Footer Actions */}
          <View style={styles.footer}>
            {/* Back Button (Hidden on first step) */}
            <View style={{ flex: 1, opacity: isFirstBlock ? 0 : 1 }}>
              <TouchableOpacity
                style={styles.navButtonSecondary}
                onPress={handleBack}
                disabled={isFirstBlock}
              >
                <MaterialCommunityIcons
                  name="chevron-left"
                  size={24}
                  color={theme.colors.text.default}
                />
                <Text style={styles.navButtonTextSecondary}>Back</Text>
              </TouchableOpacity>
            </View>

            <View style={{ flex: 1.5 }}>
              {isLastBlock ? (
                <TouchableOpacity
                  style={styles.completeButton}
                  onPress={handleComplete}
                  disabled={isCompleting}
                >
                  <LinearGradient
                    colors={[
                      theme.colors.library.orange[400],
                      theme.colors.library.red[400],
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                  >
                    {isCompleting ? (
                      <ActivityIndicator color="white" size="small" />
                    ) : (
                      <>
                        <MaterialCommunityIcons
                          name="check"
                          size={20}
                          color="white"
                        />
                        <Text style={styles.completeButtonText}>Complete</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={styles.nextButton}
                  onPress={handleNext}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[
                      theme.colors.library.orange[400],
                      theme.colors.library.red[400],
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradientButton}
                  >
                    <MaterialCommunityIcons
                      name="play"
                      size={20}
                      color="white"
                    />
                    <Text style={styles.nextButtonText}>Next</Text>
                  </LinearGradient>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: "#FFFFFF", // Fallback
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.text.default,
  },
  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "transparent",
    zIndex: 10,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.8)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 12,
  },
  headerSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    fontSize: 10,
    textTransform: "uppercase",
    color: theme.colors.text.disabled,
    fontWeight: "700",
    marginBottom: 2,
    textAlign: "center",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    fontSize: 15,
    textAlign: "center",
    color: theme.colors.text.title,
    fontWeight: "600",
  },
  // Progress
  progressContainer: {
    height: 6,
    backgroundColor: "rgba(0,0,0,0.05)",
    width: "100%",
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
    backgroundColor: theme.colors.library.orange[400],
    borderRadius: 3,
  },
  // Content
  contentWrapper: {
    flex: 1,
    justifyContent: "space-between",
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 24, // Keep reduced bottom padding
  },
  stepContainer: {
    gap: 24,
  },
  stepIndicator: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text.disabled,
    marginBottom: 8,
    textAlign: "center",
    opacity: 0.8,
  },
  emptyText: {
    textAlign: "center",
    color: theme.colors.text.disabled,
    marginTop: 40,
    ...parseTextStyle(theme.typography.Body),
  },
  // Footer
  footer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
    paddingBottom: 16,
    backgroundColor: "rgba(255,255,255,0.95)",
    borderTopWidth: 1,
    borderTopColor: "rgba(0,0,0,0.05)",
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  navButtonSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  navButtonTextSecondary: {
    ...parseTextStyle(theme.typography.Button),
    color: theme.colors.text.default,
    fontWeight: "600",
    fontSize: 15,
  },
  nextButton: {
    borderRadius: 14,
    overflow: "hidden",
    ...parseStyleShadow(theme.shadow.elevation2),
  },
  nextButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: "white",
    fontWeight: "600",
    fontSize: 15,
  },
  completeButton: {
    borderRadius: 14,
    overflow: "hidden",
    ...parseStyleShadow(theme.shadow.elevation2),
  },
  gradientButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  completeButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: "white",
    fontWeight: "700",
    fontSize: 15,
  },
  // Success Screen Styles
  successContainer: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  successContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
  },
  successIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
    position: "relative",
    ...parseStyleShadow(theme.shadow.elevation2),
    backgroundColor: "#FFF",
  },
  iconGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 60,
    opacity: 0.1,
  },
  successTitle: {
    ...parseTextStyle(theme.typography.Heading2),
    fontSize: 28,
    textAlign: "center",
    color: theme.colors.text.title,
    marginBottom: 12,
  },
  successSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    textAlign: "center",
    color: theme.colors.text.default,
    marginBottom: 48,
    paddingHorizontal: 16,
    opacity: 0.8,
    lineHeight: 24,
  },
  successActionContainer: {
    width: "100%",
    gap: 16,
  },
  successPrimaryButton: {
    borderRadius: 16,
    overflow: "hidden",
    ...parseStyleShadow(theme.shadow.elevation2),
  },
  successGradientButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  successPrimaryButtonText: {
    ...parseTextStyle(theme.typography.Button),
    fontSize: 16,
    color: "white",
    fontWeight: "600",
  },
  successSecondaryButton: {
    paddingVertical: 12,
    alignItems: "center",
  },
  successSecondaryButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: theme.colors.text.default,
    fontWeight: "600",
  },
});

export default PackModuleScreen;
