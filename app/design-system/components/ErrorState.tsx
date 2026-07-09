import React from "react";
import { View } from "react-native";
import { useTheme } from "../useTheme";
import { Icon } from "./Icon";
import { Text } from "./Text";
import { Button } from "./Button";

export interface ErrorStateProps {
  title?: string;
  message?: string;
  onRetry?: () => void;
}

/** Error state — danger glyph, tight title/message group, centered retry. */
export const ErrorState: React.FC<ErrorStateProps> = ({
  title = "Something went wrong",
  message,
  onRetry,
}) => {
  const { colors } = useTheme();
  return (
    <View style={{ alignItems: "center", paddingVertical: 28, paddingHorizontal: 24 }}>
      <View
        style={{
          width: 56,
          height: 56,
          borderRadius: 28,
          backgroundColor: colors.accentTint.danger,
          alignItems: "center",
          justifyContent: "center",
          marginBottom: 16,
        }}
      >
        <Icon name="alert-triangle" size={26} color={colors.feedback.dangerText} />
      </View>
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
      {onRetry ? (
        <Button
          label="Try again"
          variant="secondary"
          size="md"
          fullWidth={false}
          onPress={onRetry}
          style={{ alignSelf: "center", marginTop: 20 }}
        />
      ) : null}
    </View>
  );
};
