import React, { useState } from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import {
  TECHNIQUE_LEVEL_ENUM,
  TransformedTechnique,
} from "../../../../../api/library/types";
import {
  IconName,
  Text,
  Icon,
  Button,
  Divider,
  useTheme,
  spacing,
  space,
  radius,
  size,
  Sheet,
} from "../../../../../design-system";
import TechniqueCard from "../TechniqueCard";

interface LibrarySectionProps {
  sectionId?: string;
  title: string;
  subtitle: string;
  aboutText: string;
  techniques: Array<TransformedTechnique>;
  isPaidUser?: boolean;
  onTechniqueSelect: (tech: TransformedTechnique) => void;
}

const LibrarySection = ({
  sectionId,
  title,
  subtitle,
  aboutText,
  techniques,
  isPaidUser,
  onTechniqueSelect,
}: LibrarySectionProps) => {
  const { colors } = useTheme();
  const [isInfoModalVisible, setIsInfoModalVisible] = useState(false);

  // Bento Logic:
  const isUnderstanding = sectionId === "UNDERSTANDING";

  // Icon mapping for header (registry-safe Fluent glyphs).
  const getHeaderIcon = (): IconName => {
    switch (sectionId) {
      case "UNDERSTANDING":
        return "eye";
      case "MODIFICATION":
        return "layers";
      case "FLUENCY":
        return "wind";
      case "RELAXATION":
        return "sun";
      default:
        return "lightbulb";
    }
  };

  if (techniques.length === 0) return null;

  return (
    <View style={styles.container}>
      {/* --- Minimal Header --- */}
      <View style={styles.header}>
        {subtitle ? (
          <Text variant="label" color="tertiary" style={styles.subtitle}>
            {subtitle.toUpperCase()}
          </Text>
        ) : null}

        <View style={styles.mainTitleRow}>
          {/* Soft orange-tint icon chip. */}
          <View
            style={[styles.iconChip, { backgroundColor: colors.action.primaryTint }]}
          >
            <Icon name={getHeaderIcon()} size={size.iconSm} color={colors.action.primary} />
          </View>

          <Text variant="h2" color="primary" style={styles.title}>
            {title}
          </Text>

          {/* Info toggle — opens the section detail sheet. */}
          <TouchableOpacity
            onPress={() => setIsInfoModalVisible(true)}
            style={styles.infoIconWrapper}
            hitSlop={12}
          >
            <Icon
              name="info"
              size={size.icon}
              color={isInfoModalVisible ? colors.action.primary : colors.text.tertiary}
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* --- Techniques List --- */}
      <View style={styles.list}>
        {techniques.map((tech, index) => {
          const displayLevel =
            {
              [TECHNIQUE_LEVEL_ENUM.BEGINNER]: "Foundation",
              [TECHNIQUE_LEVEL_ENUM.INTERMEDIATE]: "Build",
              [TECHNIQUE_LEVEL_ENUM.ADVANCED]: "Deep Practice",
            }[tech.level] || "Foundation";

          const isHero = isUnderstanding && index === 0;

          return (
            <TechniqueCard
              key={tech.id}
              title={tech.name}
              description={tech.description}
              level={displayLevel}
              hasFree={tech.hasFree}
              isPaidUser={isPaidUser}
              onPressStart={() => onTechniqueSelect(tech)}
              variant={isHero ? "hero" : "standard"}
            />
          );
        })}
      </View>

      {/* --- Info Bottom Sheet (dark) --- */}
      <Sheet visible={isInfoModalVisible} onClose={() => setIsInfoModalVisible(false)}>
        <View style={styles.modalContent}>
          <View style={[styles.modalIconChip, { backgroundColor: colors.action.primaryTint }]}>
            <Icon name={getHeaderIcon()} size={size.iconLg} color={colors.action.primary} />
          </View>

          <Text variant="h2" color="primary" center style={styles.modalTitle}>
            {title}
          </Text>
          {subtitle ? (
            <Text variant="label" color="tertiary" center style={styles.modalSubtitle}>
              {subtitle.toUpperCase()}
            </Text>
          ) : null}

          <View style={styles.modalDivider}>
            <Divider />
          </View>

          <Text variant="body" color="secondary" center style={styles.modalBody}>
            {aboutText}
          </Text>

          <Button
            label="Got it"
            onPress={() => setIsInfoModalVisible(false)}
            style={styles.modalButton}
          />
        </View>
      </Sheet>
    </View>
  );
};

export default LibrarySection;

const styles = StyleSheet.create({
  container: {
    marginBottom: spacing["4xl"],
  },
  header: {
    paddingHorizontal: space.screenX,
    marginBottom: spacing.lg,
  },
  subtitle: {
    marginBottom: spacing.sm,
  },
  mainTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  iconChip: {
    width: 40,
    height: 40,
    borderRadius: radius.md,
    justifyContent: "center",
    alignItems: "center",
  },
  title: {
    flex: 1,
  },
  infoIconWrapper: {
    padding: spacing.sm,
  },
  list: {
    paddingHorizontal: space.screenX,
    gap: spacing.lg,
  },
  // Info sheet content
  modalContent: {
    alignItems: "center",
    paddingTop: spacing.sm,
  },
  modalIconChip: {
    width: 64,
    height: 64,
    borderRadius: radius.card,
    justifyContent: "center",
    alignItems: "center",
    marginTop: spacing.lg,
    marginBottom: spacing.lg,
  },
  modalTitle: {
    marginBottom: spacing.xs,
  },
  modalSubtitle: {
    marginBottom: spacing.lg,
  },
  modalDivider: {
    width: 60,
    marginBottom: spacing.xl,
  },
  modalBody: {
    marginBottom: spacing["3xl"],
  },
  modalButton: {
    width: "100%",
    maxWidth: 280,
    alignSelf: "center",
  },
});
