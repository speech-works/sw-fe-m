import React, { useCallback, useEffect, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { getProgramEvidence } from "../../api/packs";
import type {
  ProgramEvidenceEntry,
  ProgramEvidenceSummary,
} from "../../api/packs/types";
import PressableScale from "../../components/PressableScale";
import {
  ErrorState,
  Icon,
  icons,
  Page,
  size,
  spacing,
  Spinner,
  Surface,
  Text,
  TextLink,
  useTheme,
} from "../../design-system";
import { toSafeExternalUrl } from "../../util/functions/url";

/**
 * Everything a program's teaching rests on, in one place.
 *
 * Reached from `EvidenceCard` on the program page, never from inside a day.
 * That siting is the whole design and the reasoning lives in EvidenceCard.
 *
 * ── TWO RULES A FUTURE EDIT MUST NOT BREAK ────────────────────────────────
 *
 * 1. NEVER RENDER `whatItDoesNotShow`. It is on the wire because one payload
 *    serves this screen and the clinical review console, but it is written for
 *    a reviewer. It shouts ("READ THIS BEFORE WRITING ANY TIMING COPY"), names
 *    effect sizes, and records what this product got wrong and on what date.
 *    `theLimitInPlainWords` is the same limit for the person holding the
 *    phone, and it is the only one this screen prints.
 *
 * 2. NEVER SORT THE WEAK ONES TO THE BOTTOM. The server returns them in the
 *    order the program uses them. Hiding a thin claim behind the strong ones
 *    would undo the reason the card promises to show it.
 *
 * The strength label is the only place colour carries meaning here.
 */

type Props = {
  /** "art_of_disclosure". The catalog key, not the pack id. */
  catalogKey: string;
  /** Shown under the page title, so the reader knows which program this is. */
  programTitle?: string;
  onBack: () => void;
};

/** "2026-09-21" → "21 September 2026". Returns null for an absent or odd date. */
function readableDate(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function ProgramEvidence({
  catalogKey,
  programTitle,
  onBack,
}: Props) {
  const { colors } = useTheme();
  const [summary, setSummary] = useState<ProgramEvidenceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [openKey, setOpenKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      setSummary(await getProgramEvidence(catalogKey));
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, [catalogKey]);

  useEffect(() => {
    void load();
  }, [load]);

  /**
   * The strength label's colours.
   *
   * CONTESTED and ABSENT are warned, not failed: both are honest states a
   * claim is allowed to be in, and this product ships days that rest on them
   * deliberately. Red is kept for ABSENT alone, where nobody has measured the
   * thing at all.
   */
  const toneFor = (strength: ProgramEvidenceEntry["strength"]) => {
    switch (strength) {
      case "STRONG":
        return { bg: colors.accent.success, fg: colors.accentText.success };
      case "CONTESTED":
        return { bg: colors.accent.warning, fg: colors.accentText.warning };
      case "ABSENT":
        return { bg: colors.accent.danger, fg: colors.accentText.danger };
      default:
        return { bg: colors.surface.control, fg: colors.text.secondary };
    }
  };

  const openSource = (url?: string) => {
    const safe = toSafeExternalUrl(url);
    // No sheet on failure: a missing link is not the reader's problem to
    // solve, and every row is readable without one.
    if (safe) void Linking.openURL(safe).catch(() => undefined);
  };

  if (loading) {
    return (
      <Page title="What this rests on" onBack={onBack}>
        <View style={styles.centered}>
          <Spinner label="Loading…" />
        </View>
      </Page>
    );
  }

  if (failed || !summary) {
    return (
      <Page title="What this rests on" onBack={onBack}>
        <ErrorState
          title="Couldn't load the research"
          message="Check your connection and try again."
          onRetry={load}
        />
      </Page>
    );
  }

  const checked = readableDate(summary.lastCheckedAt);

  return (
    <Page
      title="What this rests on"
      description={programTitle ?? summary.title}
      onBack={onBack}
    >
      <View style={styles.body}>
        {checked ? (
          <Surface bordered rounded="card" padded={spacing.lg}>
            <Text variant="label">Last checked {checked}</Text>
            <Text variant="bodySm" color="secondary" style={styles.headerBody}>
              Every claim below was read back to the paper it came from. When a
              study stops supporting what a day says, the day changes and you
              get the new version at no cost.
            </Text>
          </Surface>
        ) : null}

        {summary.claims.map((claim, index) => {
          const key = `${claim.source}-${index}`;
          const open = openKey === key;
          const tone = toneFor(claim.strength);
          return (
            <Surface key={key} bordered rounded="card">
              <PressableScale
                onPress={() => setOpenKey(open ? null : key)}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                accessibilityLabel={`${claim.strength}. ${claim.plainCount}`}
                accessibilityHint={
                  open ? "Collapses this source" : "Opens this source in full"
                }
              >
                <View style={styles.rowInner}>
                  <View style={styles.rowTop}>
                    <View
                      style={[styles.pill, { backgroundColor: tone.bg }]}
                      // The word is in the row's accessibilityLabel already.
                      accessibilityElementsHidden
                      importantForAccessibility="no-hide-descendants"
                    >
                      <Text variant="caption" style={{ color: tone.fg }}>
                        {claim.strength}
                      </Text>
                    </View>
                    <Text
                      variant="bodySm"
                      color="secondary"
                      style={styles.count}
                    >
                      {claim.plainCount}
                    </Text>
                    <Icon
                      name={open ? icons.chevronUp : icons.chevronDown}
                      size={size.iconInline}
                      color={colors.text.tertiary}
                    />
                  </View>
                  <Text variant="body">{claim.claim}</Text>
                </View>
              </PressableScale>

              {open ? (
                <View
                  style={[
                    styles.detail,
                    { borderTopColor: colors.border.hairline },
                  ]}
                >
                  <Detail label="Who" value={claim.population} />
                  <Detail label="How" value={claim.design} />
                  <Detail
                    label="What it does not show"
                    value={claim.theLimitInPlainWords}
                    emphasis
                  />

                  {claim.sourceUrl ? (
                    <TextLink
                      label={claim.source}
                      onPress={() => openSource(claim.sourceUrl)}
                    />
                  ) : (
                    <Text variant="caption" color="tertiary">
                      {claim.source}
                    </Text>
                  )}

                  {readableDate(claim.lastCheckedAt) ? (
                    <Text variant="caption" color="tertiary">
                      Paper last read {readableDate(claim.lastCheckedAt)}
                    </Text>
                  ) : null}
                </View>
              ) : null}
            </Surface>
          );
        })}
      </View>
    </Page>
  );
}

function Detail({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View style={styles.detailRow}>
      <Text variant="caption" color="tertiary">
        {label}
      </Text>
      <Text variant="bodySm" color={emphasis ? "primary" : "secondary"}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { gap: spacing.md, paddingBottom: spacing.xl },
  headerBody: { marginTop: spacing.xs },
  rowInner: { padding: spacing.lg, gap: spacing.sm },
  rowTop: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  pill: {
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
  },
  count: { flex: 1 },
  detail: {
    borderTopWidth: StyleSheet.hairlineWidth,
    padding: spacing.lg,
    gap: spacing.md,
  },
  detailRow: { gap: spacing.xs },
});
