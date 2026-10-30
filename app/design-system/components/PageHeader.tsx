import React from "react";
import { View, ViewStyle } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { spacing, space, size } from "../primitives/scale";
import { Text } from "./Text";
import { IconButton } from "./IconButton";

export interface PageHeaderProps {
  /** Large left-aligned screen title (h1). */
  title: string;
  /** Optional secondary line under the title. */
  description?: string;
  onBack?: () => void;
  /** Trailing slot in the back bar (e.g. an action IconButton). */
  right?: React.ReactNode;
  /**
   * Apply the canonical top inset + screen gutter. Use on standalone screens that
   * can't use `<Page>` (custom pagers/footers). `<Page>` leaves this off and pads
   * via its own scroll container.
   */
  standalone?: boolean;
  /**
   * The small header: title and subtitle beside the back button, on one row.
   * For a screen the person is working through, where a large title on every
   * step pushes the work off the fold. Words are never cut: a long title wraps.
   */
  compact?: boolean;
}

/**
 * The single source of truth for a screen header — back bar + large h1 + optional
 * subtitle, with the canonical back→title gap (`space.titleGap`), subtitle variant
 * (`body`), and spacing. Used inside `<Page>` AND by custom-layout screens, so the
 * header can never drift between them.
 */
export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  description,
  onBack,
  right,
  standalone,
  compact,
}) => {
  const insets = useSafeAreaInsets();
  const hasBar = !!(onBack || right);

  const block = compact ? (
    <View style={compactRowStyle}>
      {onBack ? <IconButton name="arrow-left" onPress={onBack} /> : null}
      <View style={{ flex: 1 }}>
        <Text variant="title">{title}</Text>
        {description ? (
          <Text variant="bodySm" color="secondary">
            {description}
          </Text>
        ) : null}
      </View>
      {right ? right : null}
    </View>
  ) : (
    <View>
      {hasBar ? (
        <View style={backBarStyle}>
          {onBack ? (
            <IconButton name="arrow-left" onPress={onBack} />
          ) : (
            <View style={{ width: size.backBtn }} />
          )}
          {right ? right : null}
        </View>
      ) : null}
      <Text variant="h1" style={{ marginTop: hasBar ? space.titleGap : spacing.lg }}>
        {title}
      </Text>
      {description ? (
        <Text variant="body" color="secondary" style={{ marginTop: space.titleSub }}>
          {description}
        </Text>
      ) : null}
    </View>
  );

  if (!standalone) return block;
  return (
    <View style={{ paddingTop: insets.top + space.inlineGap, paddingHorizontal: space.screenX }}>
      {block}
    </View>
  );
};

const compactRowStyle: ViewStyle = {
  minHeight: size.backBtn,
  flexDirection: "row",
  alignItems: "center",
  gap: spacing.md,
};

const backBarStyle: ViewStyle = {
  minHeight: size.backBtn,
  flexDirection: "row",
  alignItems: "center",
  justifyContent: "space-between",
};
