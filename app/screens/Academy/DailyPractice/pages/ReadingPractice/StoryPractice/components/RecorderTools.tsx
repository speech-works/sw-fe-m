import React from "react";
import {
  LayoutAnimation,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";

import { ToolType } from "../../../../../../../api/tools/types";
import {
  Icon,
  Text,
  icons,
  radius,
  spacing,
  useTheme,
} from "../../../../../../../design-system";

/**
 * The DAF / Guide / Tempo tool row for the recording dock — the single source of truth,
 * injected into `SmartRecorder` via its `renderTools` prop. Previously this block was
 * copy-pasted, byte-identical, into every reading/fun/library practice page; drift between
 * copies was inevitable, so it now lives here once.
 *
 * `focusMode` is optional: when a page passes it (reading/fun pages), an un-expanded state
 * renders the compact "Tools" pill; pages without focus mode (Library PracticePage) simply
 * omit it and always get the expanded row.
 */
interface RecorderToolsProps {
  /** The selected tool id — drives which pill shows its active highlight.
   *  Typed loosely (`string`) to match the pages' `selectedPracticeTool` state. */
  activeToolId: string | null;
  isDafActive: boolean;
  isGuideActive: boolean;
  isTempoActive: boolean;
  onSelect: (id: ToolType) => void;
  /** When true and not `expanded`, render the collapsed "Tools" pill instead of the row. */
  focusMode?: boolean;
  expanded?: boolean;
  onExpand?: () => void;
}

const TOOLS = [
  { id: ToolType.DAF, icon: icons.headphones, label: "DAF" },
  { id: ToolType.CHORUS, icon: icons.voiceTool, label: "Guide" },
  { id: ToolType.METRONOME, icon: icons.duration, label: "Tempo" },
];

const RecorderTools: React.FC<RecorderToolsProps> = ({
  activeToolId,
  isDafActive,
  isGuideActive,
  isTempoActive,
  onSelect,
  focusMode = false,
  expanded = false,
  onExpand,
}) => {
  const { colors } = useTheme();

  if (focusMode && !expanded) {
    return (
      <TouchableOpacity
        style={[styles.toolsCollapsed, { backgroundColor: colors.surface.control }]}
        onPress={() => {
          LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          onExpand?.();
        }}
        activeOpacity={0.8}
      >
        <Icon name="sliders" size={14} color={colors.text.secondary} />
        <Text variant="label" color="secondary">
          Tools
        </Text>
      </TouchableOpacity>
    );
  }

  return (
    <View style={styles.dockTools}>
      {TOOLS.map((tool) => {
        const isActive =
          activeToolId === tool.id &&
          (tool.id === ToolType.DAF
            ? isDafActive
            : tool.id === ToolType.CHORUS
              ? isGuideActive
              : isTempoActive);
        return (
          <TouchableOpacity
            key={tool.id}
            style={[
              styles.dockItem,
              isActive && [
                styles.dockItemActive,
                { backgroundColor: colors.action.primary },
              ],
            ]}
            onPress={() => {
              LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
              onSelect(tool.id);
            }}
            activeOpacity={0.8}
          >
            {/* 24, not 20: these are BARE glyphs, so they must run larger than the
                framed record-button mic (20 inside a filled orange circle) to read at
                the same visual weight. The per-glyph OPTICAL_INSET still balances the
                three against each other. */}
            <Icon
              name={tool.icon}
              size={24}
              color={isActive ? colors.action.onPrimary : colors.text.secondary}
            />
            {isActive && (
              <Text
                variant="label"
                color={colors.action.onPrimary}
                numberOfLines={1}
                style={styles.dockItemLabel}
              >
                {tool.label}
              </Text>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  );
};

const styles = StyleSheet.create({
  toolsCollapsed: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: radius.input,
  },
  dockTools: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    paddingHorizontal: spacing.xs,
  },
  dockItem: {
    paddingVertical: 10,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 30,
    flexDirection: "row",
    flex: 1,
  },
  dockItemActive: {
    paddingHorizontal: spacing.md,
    flex: 2.5,
  },
  dockItemLabel: {
    marginLeft: 6,
  },
});

export default RecorderTools;
