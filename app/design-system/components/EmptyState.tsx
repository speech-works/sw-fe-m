import React from "react";
import { StyleSheet, View } from "react-native";
import { useTheme } from "../useTheme";
import { Icon, IconName } from "./Icon";
import { Text } from "./Text";
import { Button } from "./Button";

export interface EmptyStateProps {
  /** `null` drops the medallion entirely — for empty states where no glyph is
   *  honest. A check reads "done", an inbox reads "mail": both are a claim, and
   *  an empty list that nobody caused is better off saying nothing. */
  icon?: IconName | null;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

/** Friendly empty state — icon, tight title/message group, centered action. */
export const EmptyState: React.FC<EmptyStateProps> = ({ icon = "inbox", title, message, actionLabel, onAction }) => {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: 28, paddingHorizontal: 24 }}>
      {icon ? (
        <View
          style={{
            width: 56,
            height: 56,
            borderRadius: 28,
            backgroundColor: colors.surface.control,
            borderWidth: StyleSheet.hairlineWidth,
            borderColor: colors.border.default,
            alignItems: "center",
            justifyContent: "center",
            marginBottom: 16,
          }}
        >
          <Icon name={icon} size={26} color={colors.text.secondary} />
        </View>
      ) : null}
      <View style={{ alignItems: "center", gap: 4 }}>
        <Text variant="h3" center>
          {title}
        </Text>
        {message ? (
          <Text variant="bodySm" color="secondary" center>
            {message}
          </Text>
        ) : null}
      </View>
      {actionLabel && onAction ? (
        <Button
          label={actionLabel}
          variant="secondary"
          size="md"
          fullWidth={false}
          onPress={onAction}
          style={{ alignSelf: "center", marginTop: 20 }}
        />
      ) : null}
    </View>
  );
};
