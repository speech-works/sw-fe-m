import React from "react";
import { View, Text as RNText, ViewStyle, TextStyle } from "react-native";
import Svg, { Path } from "react-native-svg";
import PressableScale from "../../components/PressableScale";
import { useTheme } from "../useTheme";
import { fonts } from "../primitives/fonts";
import { space } from "../primitives/scale";
import { Icon } from "./Icon";

type Trailing = "none" | "check" | "plus" | "audio";

export interface ConnectedAvatarRowProps {
  /** IPA symbol, letter, or flag emoji shown in the avatar. */
  glyph: string;
  title: string;
  subtitle?: string;
  selected?: boolean;
  compact?: boolean;
  trailing?: Trailing;
  /** Override the subtitle color (e.g. accent.success for "Natural voice"). */
  subtitleColor?: string;
  onPress?: () => void;
}

/**
 * The signature row — a verbatim port of the original hand-built AccentPicker /
 * FearedSounds geometry: a circular avatar and a rounded pill linked by the
 * `BridgeSVG` concave neck, which is ABSOLUTE-positioned BEHIND both (its ends
 * covered by the z-raised avatar & pill). All three share one color.
 * Selected = orange + dark text + check.
 */
export const ConnectedAvatarRow: React.FC<ConnectedAvatarRowProps> = ({
  glyph,
  title,
  subtitle,
  selected = false,
  compact = false,
  trailing = "none",
  subtitleColor,
  onPress,
}) => {
  const { colors } = useTheme();

  // Exact original ratios (designed at 72), scaled for compact.
  const H = compact ? 56 : 72;
  const k = H / 72;
  const inner = Math.round(56 * k);
  const bridgeLeft = Math.round(52 * k);
  const bridgeW = Math.round(48 * k);
  const pillMarginLeft = Math.round(8 * k);
  const pillPadLeft = Math.round(24 * k);
  const glyphFs = Math.round(inner * 0.56);
  const titleFs = compact ? 16 : 18;
  const subFs = compact ? 13 : 14;

  const rowColor = selected ? colors.surface.rowSelected : colors.surface.row;
  const titleColor = selected ? colors.text.inverse : colors.text.primary;
  // On the orange selected fill the subtitle MUST be dark-on-bright (AA) — an
  // arbitrary accent override (e.g. success green) only applies when unselected.
  const subColor = selected ? colors.text.inverse : subtitleColor ?? colors.text.secondary;
  const trailingMuted = selected ? colors.text.inverse : colors.text.tertiary;

  const rowStyle: ViewStyle = { flexDirection: "row", alignItems: "center", height: H };
  const bridgeContainer: ViewStyle = { position: "absolute", left: bridgeLeft, width: bridgeW, height: H, zIndex: 1 };
  const avatarStyle: ViewStyle = {
    width: H,
    height: H,
    borderRadius: H / 2,
    backgroundColor: rowColor,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 2,
  };
  const pillStyle: ViewStyle = {
    flex: 1,
    minWidth: 0,
    height: H,
    borderRadius: H / 2,
    backgroundColor: rowColor,
    marginLeft: pillMarginLeft,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingLeft: pillPadLeft,
    paddingRight: 18,
    zIndex: 2,
  };
  const glyphStyle: TextStyle = { fontFamily: fonts.bold, fontSize: glyphFs, color: colors.text.onInverse, lineHeight: glyphFs * 1.1 };

  const renderTrailing = () => {
    if (trailing === "check") {
      return (
        <View
          style={{
            width: 30,
            height: 30,
            borderRadius: 15,
            backgroundColor: colors.text.inverse,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Icon name="check" size={16} color={rowColor} />
        </View>
      );
    }
    if (trailing === "plus") return <Icon name="plus" size={20} color={colors.text.tertiary} />;
    if (trailing === "audio") return <Icon name="volume-2" size={20} color={trailingMuted} />;
    return null;
  };

  const body = (
    <>
      {/* Bridge sits BEHIND, absolutely positioned — exactly like the original. */}
      <View style={bridgeContainer} pointerEvents="none">
        <Svg width={bridgeW} height={H} viewBox="0 0 48 72" preserveAspectRatio="none">
          <Path d="M 0 8 Q 24 36, 48 8 L 48 64 Q 24 36, 0 64 Z" fill={rowColor} />
        </Svg>
      </View>

      <View style={avatarStyle}>
        <View
          style={{
            width: inner,
            height: inner,
            borderRadius: inner / 2,
            backgroundColor: colors.surface.inverse,
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <RNText style={glyphStyle}>{glyph}</RNText>
        </View>
      </View>

      <View style={pillStyle}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <RNText numberOfLines={1} style={{ fontFamily: fonts.bold, fontSize: titleFs, color: titleColor }}>
            {title}
          </RNText>
          {subtitle ? (
            <RNText
              numberOfLines={1}
              style={{
                fontFamily: selected ? fonts.semibold : fonts.regular,
                fontSize: subFs,
                color: subColor,
                marginTop: space.titleSub,
              }}
            >
              {subtitle}
            </RNText>
          ) : null}
        </View>
        {renderTrailing()}
      </View>
    </>
  );

  if (onPress) {
    return (
      <PressableScale onPress={onPress} style={rowStyle}>
        {body}
      </PressableScale>
    );
  }
  return <View style={rowStyle}>{body}</View>;
};
