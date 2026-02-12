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

type PackModuleScreenRouteProp = RouteProp<
  { params: { module: PackModule; packId: string } },
  "params"
>;

const { width } = Dimensions.get("window");

const PackModuleScreen = () => {
  const navigation = useNavigation();
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
                theme.colors.library.orange[100],
                theme.colors.library.orange[50],
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
                  <Text style={styles.successPrimaryButtonText}>
                    Start Next Module
                  </Text>
                  <MaterialCommunityIcons
                    name="arrow-right"
                    size={20}
                    color="white"
                  />
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
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          <MaterialCommunityIcons
            name="close"
            size={24}
            color={theme.colors.text.title}
          />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerSubtitle}>Module {module.orderIndex}</Text>
          <Text style={styles.headerTitle} numberOfLines={1}>
            {module.title}
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
                name="arrow-left"
                size={20}
                color={theme.colors.text.default}
              />
              <Text style={styles.navButtonTextSecondary}>Back</Text>
            </TouchableOpacity>
          </View>

          {/* Next or Complete Button */}
          <View style={{ flex: 1.5 }}>
            {isLastBlock ? (
              <TouchableOpacity
                style={styles.completeButton}
                onPress={handleComplete}
                disabled={isCompleting}
              >
                <LinearGradient
                  colors={[
                    theme.colors.actionPrimary.default,
                    theme.colors.actionPrimary.default,
                  ]}
                  style={styles.gradientButton}
                >
                  {isCompleting ? (
                    <ActivityIndicator color="white" size="small" />
                  ) : (
                    <>
                      <Text style={styles.completeButtonText}>Complete</Text>
                      <MaterialCommunityIcons
                        name="check"
                        size={18}
                        color="white"
                      />
                    </>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                <Text style={styles.nextButtonText}>Next</Text>
                <MaterialCommunityIcons
                  name="arrow-right"
                  size={20}
                  color="white"
                />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: theme.colors.background.light,
  },
  centerContent: {
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    color: theme.colors.text.default,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border.subtle,
    backgroundColor: theme.colors.background.light,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "flex-start",
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  headerSubtitle: {
    fontSize: 12,
    color: theme.colors.text.subtle,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    textAlign: "center",
    color: theme.colors.text.title,
  },
  progressContainer: {
    height: 4,
    backgroundColor: theme.colors.border.subtle,
    width: "100%",
  },
  progressBar: {
    height: "100%",
    backgroundColor: theme.colors.actionPrimary.default,
  },
  contentWrapper: {
    flex: 1,
    justifyContent: "space-between",
  },
  contentContainer: {
    padding: 24,
    paddingBottom: 48,
  },
  stepContainer: {
    gap: 16,
  },
  stepIndicator: {
    fontSize: 14,
    fontWeight: "600",
    color: theme.colors.text.subtle,
    marginBottom: 8,
  },
  emptyText: {
    textAlign: "center",
    color: theme.colors.text.disabled,
    marginTop: 20,
  },
  footer: {
    padding: 24,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border.subtle,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: theme.colors.background.light,
  },
  navButtonSecondary: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
    gap: 4,
  },
  navButtonTextSecondary: {
    ...parseTextStyle(theme.typography.Button),
    color: theme.colors.text.default,
    fontWeight: "600",
  },
  nextButton: {
    backgroundColor: theme.colors.text.title, // Dark button
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  nextButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: "white",
    fontWeight: "600",
  },
  completeButton: {
    borderRadius: 12,
    overflow: "hidden",
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
  },
  iconGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 60,
    opacity: 0.5,
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
    paddingVertical: 18,
    gap: 8,
  },
  successPrimaryButtonText: {
    ...parseTextStyle(theme.typography.Button),
    fontSize: 18,
    color: "white",
    fontWeight: "700",
  },
  successSecondaryButton: {
    paddingVertical: 16,
    alignItems: "center",
  },
  successSecondaryButtonText: {
    ...parseTextStyle(theme.typography.Button),
    color: theme.colors.text.disabled,
    fontWeight: "600",
  },
});

export default PackModuleScreen;
