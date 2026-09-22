import React, { useCallback, useEffect, useRef, useState } from "react";
import {
  AccessibilityInfo,
  Animated,
  Easing,
  StyleSheet,
  View,
} from "react-native";
import { getProgramEvidence } from "../../api/packs";
import type {
  ProgramEvidenceEntry,
  ProgramEvidenceSummary,
} from "../../api/packs/types";
import PressableScale from "../../components/PressableScale";
import {
  duration,
  ErrorState,
  Icon,
  icons,
  Page,
  size,
  spacing,
  Spinner,
  Surface,
  Text,
  useTheme,
} from "../../design-system";

/**
 * Everything a program's teaching rests on, in one place.
 *
 * Reached from `EvidenceNode` in the pre-purchase sales flow, never from
 * inside a day. That siting is the whole design and the reasoning lives in
 * EvidenceNode.
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
 * 3. NEVER RENDER A GRADE. FOUNDER DECISION 2026-09-22: do not downplay the
 *    content. This screen used to turn `strength` into a label ("Thin
 *    evidence", "One solid study") with a coloured bar and a legend. A grade
 *    on a source read as a verdict on the program, and one label per grade
 *    misdescribed what it covered: a review of eighteen studies showed as
 *    "One solid study". `whatItIs` says what each source is, in its own
 *    words, and that is the strongest true thing the screen can say.
 *    `strength` stays on the wire for the console and is never rendered.
 *
 * ── SHAPE ─────────────────────────────────────────────────────────────────
 *
 * Two levels, not one list of expanding cards. The first is a short list a
 * buyer can scan in a few seconds: what the source is, the claim, chevron.
 * Tapping a row swaps in a page for that one source: the count, the
 * plain-language limit and the full citation, and nothing else.
 *
 * ── TWO DECISIONS THE PAGE MUST KEEP (founder, 2026-09-22) ───────────────
 *
 * NO OUTBOUND LINKS. Fourteen of the nineteen sources land on a paywall or a
 * bare abstract. The people who tap are the most engaged buyers, and the app
 * lost them to Safari for nothing. The citation is plain text. `sourceUrl`
 * stays on the wire for the clinical console and is never rendered here.
 *
 * TWO BLOCKS PER ROW, NOT FIVE. The limit and the citation. "Who was
 * studied", "How they studied it" and the per-claim date already live in the
 * generated reviewer sheet and the console; on a phone they dwarfed the claim
 * they backed. `population`, `design` and the per-claim `lastCheckedAt` are
 * on the wire and deliberately unused. The whole-program date stays.
 *
 * The detail is state inside this component rather than a navigator route so
 * it works identically inside the sales flow's `Sheet` and on its own `Page`.
 * The page draws no back control of its own: on a `Page` the header arrow
 * does it, and in a `Sheet` the host puts one in the sheet header (`selected`
 * and `onSelectedChange` below).
 */

type Props = {
  /** "art_of_disclosure". The catalog key, not the pack id. */
  catalogKey: string;
  /** Shown under the page title, so the reader knows which program this is. */
  programTitle?: string;
  onBack: () => void;
  /**
   * Render the list alone, with no `Page` chrome around it.
   *
   * The sales flow shows this inside a `Sheet`, which supplies its own title
   * and its own close control. A `Page` in there would stack two headers and
   * two back affordances on one screen. `onBack` is then unused and the sheet
   * owns dismissal.
   */
  embedded?: boolean;
  /**
   * Which source page is showing, when the host owns that choice.
   *
   * Inside a `Sheet` the way back to the list has to be the sheet's own
   * header button, beside close, the way every other stepped sheet in the app
   * does it (see the reminder sheet). The header belongs to the host, so the
   * host holds the selection and this screen reports changes through
   * `onSelectedChange`. Left undefined, the screen keeps the selection itself
   * and its `Page` back arrow returns to the list.
   */
  selected?: number | null;
  onSelectedChange?: (index: number | null) => void;
};

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

/**
 * "2026-09-21" → "21 September 2026". Returns null for an absent or odd value.
 *
 * TAKES A `Date` AS WELL AS A STRING, BECAUSE THAT IS WHAT ARRIVES. The types
 * say `string`, the server sends `"2026-09-21"`, and neither is what this
 * function is handed: `axiosClient.ts` runs `reviveDatesInObject` over every
 * response body, so any date-shaped string anywhere in any payload is a `Date`
 * by the time a screen sees it. Nothing in the types records that.
 *
 * It cost a real bug. The first version did `new Date(iso + "T00:00:00Z")` on
 * a value that was already a Date, got `Invalid Date`, and returned null. The
 * screen then rendered perfectly except that the "Checked" line and every per
 * claim date were silently gone, which is the worst shape a bug can take: the
 * evidence still looks complete while the date that makes the free updates
 * promise checkable has quietly disappeared.
 *
 * LOCAL GETTERS, NOT UTC ONES. The reviver builds these from a bare
 * `YYYY-MM-DD`, which lands on local midnight, so in Asia/Kolkata the instant
 * is 18:30Z the day before. Reading UTC parts would print the 20th for a date
 * the registry records as the 21st. Local parts give the calendar day back.
 */
function readableDate(value: string | Date | null | undefined): string | null {
  if (!value) return null;

  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return null;
    const month = MONTHS[value.getMonth()];
    return month ? `${value.getDate()} ${month} ${value.getFullYear()}` : null;
  }

  // Plain string, if the reviver ever stops running or misses this field.
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(value);
  if (!m) return null;
  const month = MONTHS[Number(m[2]) - 1];
  return month ? `${Number(m[3])} ${month} ${m[1]}` : null;
}

export default function ProgramEvidence({
  catalogKey,
  programTitle,
  onBack,
  embedded = false,
  selected: selectedProp,
  onSelectedChange,
}: Props) {
  const { colors } = useTheme();
  const [summary, setSummary] = useState<ProgramEvidenceSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  /** Index of the claim whose page is showing, or null for the list. */
  const [selectedOwn, setSelectedOwn] = useState<number | null>(null);
  const controlled = selectedProp !== undefined;
  const selected = controlled ? selectedProp : selectedOwn;
  const setSelected = (index: number | null) => {
    if (!controlled) setSelectedOwn(index);
    onSelectedChange?.(index);
  };

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
   * The page chrome, or nothing at all when a sheet is already providing it.
   * Kept as one wrapper so every state (loading, failed, loaded) is framed the
   * same way and a future state cannot forget the `embedded` case.
   */
  const Frame = ({
    description,
    children,
  }: {
    description?: string;
    children: React.ReactNode;
  }) =>
    embedded ? (
      <>{children}</>
    ) : (
      <Page
        title="What the research actually says"
        description={description}
        onBack={selected === null ? onBack : () => setSelected(null)}
      >
        {children}
      </Page>
    );

  if (loading) {
    return (
      <Frame>
        <View style={styles.centered}>
          <Spinner label="Loading…" />
        </View>
      </Frame>
    );
  }

  if (failed || !summary) {
    return (
      <Frame>
        <ErrorState
          title="Couldn't load the research"
          message="Check your connection and try again."
          onRetry={load}
        />
      </Frame>
    );
  }

  const checked = readableDate(summary.lastCheckedAt);
  const claims = summary.claims;
  const current = selected === null ? null : claims[selected];

  if (current) {
    return (
      <Frame description={programTitle ?? summary.title}>
        <SourcePage claim={current} />
      </Frame>
    );
  }

  return (
    <Frame description={programTitle ?? summary.title}>
      <View style={styles.body}>
        {claims.length > 0 ? (
          <View style={styles.intro}>
            <Text variant="bodySm" color="secondary">
              {claims.length === 1
                ? "One source. Tap it to see what it found, and where it stops."
                : `${COUNT_WORD[claims.length] ?? claims.length} sources. Tap one to see what it found, and where it stops.`}
            </Text>

            {/* The founder's line, approved 2026-09-22, last sentence set on
                2026-09-23. The sheet counts studies and nothing else, so a
                day built on clinical practice or teaching order reads as
                unsupported, and two programs carry no studies at all,
                honestly. This is what stops a buyer reading a small number as
                nothing. It sits here rather than under the date because the
                date moved to the foot, and a sentence that says "below"
                cannot sit at the bottom. */}
            <Text variant="bodySm" color="secondary">
              Some of these days come from studies. Others come from how this
              is taught. The studies are below.
            </Text>
          </View>
        ) : null}

        <Surface rounded="card">
          {claims.map((claim, index) => {
            const last = index === claims.length - 1;
            return (
              <PressableScale
                key={`${claim.source}-${index}`}
                onPress={() => setSelected(index)}
                accessibilityRole="button"
                accessibilityLabel={`${claim.whatItIs}. ${claim.claim}`}
                accessibilityHint="Opens this source in full"
              >
                <View
                  style={[
                    styles.row,
                    !last && {
                      borderBottomWidth: StyleSheet.hairlineWidth,
                      borderBottomColor: colors.border.hairline,
                    },
                  ]}
                >
                  <View style={styles.rowText}>
                    {/* What the source is, in its own words, never a grade.
                        Sentence case: capitals read as a warning label. */}
                    <Text variant="caption" color="tertiary">
                      {claim.whatItIs}
                    </Text>
                    <Text variant="title">{claim.claim}</Text>
                  </View>
                  <Icon
                    name={icons.chevronRight}
                    size={size.iconInline}
                    color={colors.text.disabled}
                  />
                </View>
              </PressableScale>
            );
          })}
        </Surface>

        {/* The Udemy promise, in the place that proves it. The date is our
            "Last updated": a real field on every claim, so a program that has
            not been re-read cannot pretend it has.

            THE PROMISE IS NOT GATED ON THE DATE. It used to be, and on a
            simulator the whole line disappeared: a payload with no
            lastCheckedAt took the free-updates line down with it, which is
            the one line here a buyer is owed. The date is the proof and it
            is shown whenever there is one; the promise is shown whenever
            there are claims at all.

            WHAT THIS MAY NOT SAY YET. "Our experts keep improving it" is the
            line we want and cannot publish. reviewSignoff.service.ts
            withholds "reviewed by a licensed professional" until an SLP
            signs a specific version, and none has signed any. Add it here
            the day the first sign-off lands, not before. */}
        {claims.length > 0 ? (
          <Text variant="caption" color="tertiary" center style={styles.foot}>
            {checked ? `Checked ${checked}. ` : ""}
            When new research changes a day, we update it. Those updates are
            free.
          </Text>
        ) : null}
      </View>
    </Frame>
  );
}

/** "Five sources", not "5 sources": the counts here are small and read aloud. */
const COUNT_WORD: Record<number, string> = {
  2: "Two",
  3: "Three",
  4: "Four",
  5: "Five",
  6: "Six",
  7: "Seven",
  8: "Eight",
  9: "Nine",
};

/**
 * One source: the count, the limit, the citation.
 *
 * Slides in from the right, the way a pushed screen would, so the reader
 * keeps the sense that the list is still behind it. Under reduced motion it
 * only fades. Plain `Animated` rather than Reanimated so the screen stays
 * testable under jest without a native mock.
 */
function SourcePage({ claim }: { claim: ProgramEvidenceEntry }) {
  const progress = useRef(new Animated.Value(0)).current;
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    let live = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then((on) => {
        if (live) setReduced(on);
      })
      .catch(() => undefined);
    return () => {
      live = false;
    };
  }, []);

  useEffect(() => {
    progress.setValue(0);
    Animated.timing(progress, {
      toValue: 1,
      duration: duration.reveal,
      easing: Easing.bezier(0.23, 1, 0.32, 1),
      useNativeDriver: true,
    }).start();
  }, [claim, progress]);

  const translateX = reduced
    ? 0
    : progress.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });

  return (
    <Animated.View
      style={[styles.page, { opacity: progress, transform: [{ translateX }] }]}
    >
      <View style={styles.pageHead}>
        <Text variant="caption" color="tertiary">
          {claim.whatItIs}
        </Text>
        <Text variant="h2">{claim.claim}</Text>
        <Text variant="body" color="secondary">
          {claim.plainCount}
        </Text>
      </View>

      {/* The limit gets the only boxed treatment on the page. It is the line
          the card that opened this screen promised, and the one a seller
          would be tempted to bury. */}
      <Surface rounded="md" padded={spacing.lg}>
        <Section
          label="What this does not tell you"
          value={claim.theLimitInPlainWords}
          emphasis
        />
      </Surface>

      <Surface rounded="card" padded={spacing.lg} style={styles.source}>
        <Text variant="caption" color="tertiary">
          SOURCE
        </Text>
        <Text variant="bodySm" color="secondary">
          {claim.source}
        </Text>
      </Surface>
    </Animated.View>
  );
}

function Section({
  label,
  value,
  emphasis,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View style={styles.section}>
      <Text variant="caption" color="tertiary">
        {label.toUpperCase()}
      </Text>
      <Text variant="body" color={emphasis ? "primary" : "secondary"}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  centered: { flex: 1, alignItems: "center", justifyContent: "center" },
  body: { gap: spacing.lg, paddingBottom: spacing.xl },
  intro: { gap: spacing.sm },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  rowText: { flex: 1, gap: spacing.xs },
  foot: { marginTop: spacing.xs },
  page: { gap: spacing.lg, paddingBottom: spacing.xl },
  pageHead: { gap: spacing.sm },
  section: { gap: spacing.xs },
  source: { gap: spacing.sm },
});
