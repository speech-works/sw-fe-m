import React from "react";
import { StyleSheet, TouchableOpacity, View } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import {
  Sheet,
  Text,
  Button,
  Icon,
  IconButton,
  Gradient,
  icons,
  spacing,
  radius,
  borderWidth,
  space,
  useTheme,
  withAlpha,
  size,
} from "../../../design-system";
import { useUserStore } from "../../../stores/user";
import { membershipEndsAt, membershipDaysRemaining } from "../../../util/functions/membership";
import { manageSubscriptions } from "../../../services/purchases";
import { useRestorePurchases } from "../../../hooks/useRestorePurchases";
import { handleLinkPress } from "../../../util/functions/externalLinks";
import { PRIVACY_POLICY_URL, TERMS_OF_USE_URL } from "../../Auth/constants";
import BenefitRows from "../../../components/membership/BenefitRows";

export interface MembershipDetailSheetProps {
  visible: boolean;
  onClose: () => void;
  onUpgradePromo?: () => void;
}

const SHEEN_W = 64;
const LEGAL_HIT_SLOP = { top: 10, bottom: 10, left: 8, right: 8 };

export const MembershipDetailSheet: React.FC<MembershipDetailSheetProps> = ({
  visible,
  onClose,
  onUpgradePromo,
}) => {
  const { colors } = useTheme();
  const user = useUserStore((s) => s.user);
  const { restoring, restore } = useRestorePurchases();

  const membership = user?.membership;
  const willRenew = membership?.willRenew !== false;
  const endsAt = membershipEndsAt(user);
  const daysRemaining = membershipDaysRemaining(user);

  const formattedDate = endsAt
    ? endsAt.toLocaleDateString(undefined, {
        month: "long",
        day: "numeric",
        year: "numeric",
      })
    : null;

  const handleManage = async () => {
    await manageSubscriptions();
  };

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title="Membership"
      right={<IconButton name="x" onPress={onClose} />}
    >
      <View style={styles.container}>
        {/* Status Hero Card — shares ground gradient, sheen & gold borders with MembershipRow */}
        <View
          style={[
            styles.statusCard,
            {
              borderColor: colors.premium.goldBorder,
            },
          ]}
        >
          {/* Ground gradient */}
          <Gradient
            colors={[colors.premium.groundMid, colors.premium.ground]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />

          {/* Sheen light reflection band */}
          <View style={styles.sheen} pointerEvents="none">
            <Gradient
              colors={[
                withAlpha(colors.premium.onGround, 0),
                withAlpha(colors.premium.onGround, 0.08),
                withAlpha(colors.premium.onGround, 0),
              ]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={StyleSheet.absoluteFill}
            />
          </View>

          <View style={styles.cardHeader}>
            <View
              style={[
                styles.proChip,
                {
                  backgroundColor: colors.premium.goldTint,
                  borderColor: colors.premium.goldBorder,
                },
              ]}
            >
              <Icon name={icons.pro} size={22} color={colors.premium.gold} />
            </View>
            <View style={styles.headerText}>
              <Text variant="title" color={colors.premium.onGround}>
                Speechworks Member
              </Text>
              <Text variant="caption" color={colors.premium.onGroundMuted} style={styles.planSub}>
                {membership?.plan === "annual"
                  ? "Annual Plan"
                  : membership?.plan === "monthly"
                    ? "Monthly Plan"
                    : willRenew
                      ? "Auto-renewing plan"
                      : "Promotional pass"}
              </Text>
            </View>
            <View
              style={[
                styles.activePill,
                {
                  backgroundColor: colors.premium.gold,
                },
              ]}
            >
              <Text
                variant="caption"
                style={[styles.activePillText, { color: colors.premium.onGold }]}
              >
                ACTIVE
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.divider,
              { backgroundColor: withAlpha(colors.premium.goldBorder, 0.25) },
            ]}
          />

          <View style={styles.detailsRow}>
            <Text variant="bodySm" color={colors.premium.onGroundMuted}>
              {willRenew ? "Renews on" : "Access active until"}
            </Text>
            <Text
              variant="bodySm"
              color={colors.premium.onGround}
              style={styles.boldDate}
            >
              {formattedDate ?? "Active"}
            </Text>
          </View>

          {willRenew ? (
            <Text
              variant="caption"
              color={colors.premium.onGroundMuted}
              style={styles.disclosureText}
            >
              Billed through your app store account. Renews automatically unless cancelled in your store settings at least 24 hours before renewal.
            </Text>
          ) : (
            <Text
              variant="caption"
              color={colors.premium.onGroundMuted}
              style={styles.disclosureText}
            >
              {daysRemaining != null
                ? `${daysRemaining} days remaining. This complimentary access will not renew automatically.`
                : "This complimentary access will not renew automatically."}
            </Text>
          )}
        </View>

        {/* Benefits Section — uses identical BenefitRows as the selling paywall */}
        <View style={styles.benefitsSection}>
          <Text variant="label" color="tertiary" style={styles.sectionTitle}>
            Included with your membership
          </Text>
          <BenefitRows compact />
        </View>

        {/* Action Button — styled with the signature gold gradient from the selling paywall */}
        <View style={styles.actions}>
          {!willRenew && onUpgradePromo ? (
            <>
              <TouchableOpacity
                style={styles.goldBtnWrapper}
                activeOpacity={0.85}
                onPress={() => {
                  onClose();
                  onUpgradePromo();
                }}
                accessibilityRole="button"
                accessibilityLabel="Keep access with annual plan"
              >
                <LinearGradient
                  colors={[colors.premium.gold, colors.premium.goldDeep]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.goldBtn}
                >
                  <Text variant="title" style={styles.goldBtnText}>
                    Keep Access with Annual Plan
                  </Text>
                  <LinearGradient
                    colors={[withAlpha(colors.surface.inverse, 0.15), "transparent"]}
                    style={StyleSheet.absoluteFill}
                  />
                </LinearGradient>
              </TouchableOpacity>
              <Button
                label="Manage Subscription"
                variant="secondary"
                rightIcon="external-link"
                onPress={handleManage}
              />
            </>
          ) : (
            <TouchableOpacity
              style={styles.goldBtnWrapper}
              activeOpacity={0.85}
              onPress={handleManage}
              accessibilityRole="button"
              accessibilityLabel="Manage subscription in App Store settings"
            >
              <LinearGradient
                colors={[colors.premium.gold, colors.premium.goldDeep]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.goldBtn}
              >
                <View style={styles.btnRow}>
                  <Text variant="title" style={styles.goldBtnText}>
                    Manage Subscription
                  </Text>
                  <Icon name="external-link" size={size.iconInline} color={colors.text.inverse} />
                </View>
                <LinearGradient
                  colors={[withAlpha(colors.surface.inverse, 0.15), "transparent"]}
                  style={StyleSheet.absoluteFill}
                />
              </LinearGradient>
            </TouchableOpacity>
          )}
        </View>

        {/* Legal & Restore Footer (Apple App Store Guideline 3.1.2 & 3.1.1) */}
        <View style={styles.legalRow}>
          <TouchableOpacity
            onPress={restore}
            disabled={restoring}
            hitSlop={LEGAL_HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Restore purchases"
          >
            <Text variant="caption" color="tertiary" style={styles.legalLink}>
              {restoring ? "Restoring…" : "Restore Purchases"}
            </Text>
          </TouchableOpacity>
          <Text variant="caption" color="tertiary">
            ·
          </Text>
          <TouchableOpacity
            onPress={() => handleLinkPress(TERMS_OF_USE_URL)}
            hitSlop={LEGAL_HIT_SLOP}
            accessibilityRole="link"
            accessibilityLabel="Terms of Use"
          >
            <Text variant="caption" color="tertiary" style={styles.legalLink}>
              Terms of Use
            </Text>
          </TouchableOpacity>
          <Text variant="caption" color="tertiary">
            ·
          </Text>
          <TouchableOpacity
            onPress={() => handleLinkPress(PRIVACY_POLICY_URL)}
            hitSlop={LEGAL_HIT_SLOP}
            accessibilityRole="link"
            accessibilityLabel="Privacy Policy"
          >
            <Text variant="caption" color="tertiary" style={styles.legalLink}>
              Privacy Policy
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Sheet>
  );
};

export default MembershipDetailSheet;

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.sm,
    gap: spacing.lg,
  },
  statusCard: {
    borderRadius: radius.card,
    borderWidth: borderWidth.thin,
    padding: spacing.lg,
    gap: spacing.sm,
    overflow: "hidden",
  },
  sheen: {
    position: "absolute",
    top: -24,
    bottom: -24,
    left: 20,
    width: SHEEN_W,
    transform: [{ rotate: "18deg" }],
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  proChip: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    borderWidth: borderWidth.thin,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
  },
  planSub: {
    marginTop: 2,
  },
  activePill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderRadius: radius.full,
  },
  activePillText: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.6,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: spacing.xs,
  },
  detailsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 2,
  },
  boldDate: {
    fontWeight: "600",
  },
  disclosureText: {
    lineHeight: 16,
    marginTop: spacing.xs,
  },
  benefitsSection: {
    gap: spacing.sm,
  },
  sectionTitle: {
    textTransform: "uppercase",
    fontSize: 11,
    letterSpacing: 0.8,
    marginBottom: spacing.xs,
  },
  actions: {
    gap: spacing.sm,
    marginTop: spacing.xs,
  },
  goldBtnWrapper: {
    borderRadius: radius.chip,
    overflow: "hidden",
  },
  goldBtn: {
    paddingVertical: spacing.lg,
    alignItems: "center",
    justifyContent: "center",
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  goldBtnText: {
    color: "#0F0E0D", // Obsidian ink on gold fill
    fontWeight: "700",
  },
  legalRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.sm,
    paddingTop: spacing.xs,
  },
  legalLink: {
    textDecorationLine: "underline",
  },
});
