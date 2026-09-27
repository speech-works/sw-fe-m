import React, { useEffect, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { handleLinkPress } from "../../util/functions/externalLinks";
import {
  getCrisisResource,
  CrisisResource,
  NEUTRAL_CRISIS_RESOURCE,
} from "../../api/crisis";
import {
  size,
  useTheme,
  spacing,
  radius,
  Page,
  ListItem,
  Text,
  Icon,
  IconName,
} from "../../design-system";

interface ResourceItem {
  label: string;
  desc: string;
  icon: IconName;
  /** Web link (opened via handleLinkPress) … */
  url?: string;
  /** … or a tel:/sms: action (opened via Linking). */
  action?: string;
}

/**
 * INDIA FIRST, then the rest — matching where this screen's audience actually
 * is. The crisis list below has been country-aware for a while (Tele-MANAS for
 * IN) with a comment saying most readers are in India; this list had never had
 * the same treatment and pointed at three American organisations only.
 *
 * That gap mattered more than it looks. The practice catalogue now asks people
 * to find a group near them and go and listen, and support-group participation
 * is one of the better-evidenced things anyone who stammers can do. Sending an
 * Indian reader to a US chapter directory is sending them nowhere.
 *
 * Both spellings appear here, and not for search reasons: "stammering" is the
 * ordinary word in India and the UK, and TISA and STAMMA are their own names.
 */
const SUPPORT: ResourceItem[] = [
  {
    label: "TISA, the Indian Stammering Association",
    desc: "Peer-led self-help groups across India, plus online meets. Free.",
    icon: "users",
    url: "https://stammer.in",
  },
  {
    label: "National Stuttering Association",
    desc: "US chapters, events and an annual conference for people who stutter.",
    icon: "users",
    url: "https://westutter.org",
  },
  {
    label: "STAMMA, the British Stammering Association",
    desc: "UK helpline, guidance for work and study, and local groups.",
    icon: "message-circle",
    url: "https://stamma.org",
  },
  {
    label: "The Stuttering Foundation",
    desc: "Free resources, referrals & a speech-therapist directory.",
    icon: "book-open",
    url: "https://www.stutteringhelp.org",
  },
  {
    label: "FRIENDS",
    desc: "For young people who stutter and their families.",
    icon: "heart",
    url: "https://friendswhostutter.org",
  },
];

// Used ONLY if the country-aware GET /crisis-resources fetch fails. Country
// neutral on purpose: this used to be the US 988 and 741741 numbers, shown to
// everyone whose fetch failed, and neither connects outside the US.
const emergencyItem = (): ResourceItem => ({
  label: "In immediate danger?",
  desc: "Call your local emergency number.",
  icon: "phone-call",
});

function toResourceItems(resource: CrisisResource): ResourceItem[] {
  const helpline: ResourceItem = {
    label: resource.helplineName,
    desc: resource.description,
    icon: "phone-call",
    action: resource.phone ? `tel:${resource.phone}` : undefined,
    url: resource.phone ? undefined : resource.url,
  };
  // The emergency number gets its own tappable row when we know it; when we
  // don't (the neutral resource), a plain line says to use the local one.
  const emergency: ResourceItem = resource.emergencyNumber
    ? {
        label: `Emergency: ${resource.emergencyNumber}`,
        desc: "If you or someone else is in immediate danger.",
        icon: "phone-call",
        action: `tel:${resource.emergencyNumber}`,
      }
    : emergencyItem();
  return [helpline, emergency];
}

const FALLBACK_CRISIS: ResourceItem[] = toResourceItems(NEUTRAL_CRISIS_RESOURCE);

const Resources = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [crisisItems, setCrisisItems] = useState<ResourceItem[]>(FALLBACK_CRISIS);

  useEffect(() => {
    let cancelled = false;
    getCrisisResource()
      .then((resource) => {
        // Same guard as useCrisisResource: a row with no name is worse than
        // the neutral fallback, so keep that instead.
        if (!cancelled && resource?.helplineName) {
          setCrisisItems(toResourceItems(resource));
        }
      })
      .catch(() => {
        // Fetch failed — keep the country-neutral fallback so this section is
        // never empty. Logged, not surfaced: this screen must never look
        // broken to someone who's struggling.
        console.warn("[Resources] Failed to fetch country-aware crisis resource; using fallback.");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const open = (item: ResourceItem) => {
    if (item.url) handleLinkPress(item.url);
    else if (item.action) Linking.openURL(item.action).catch(() => undefined);
  };

  const renderRow = (item: ResourceItem, index: number, arr: ResourceItem[]) => {
    // A plain instruction row ("call your local emergency number") has
    // nowhere to go, so it gets no chevron and no press.
    const tappable = !!(item.url || item.action);
    return (
      <ListItem
        key={item.label}
        leftIcon={item.icon}
        label={item.label}
        sublabel={item.desc}
        right={
          tappable ? (
            <Icon name="external-link" size={size.iconSm} color={colors.text.tertiary} />
          ) : undefined
        }
        divider={index < arr.length - 1}
        onPress={tappable ? () => open(item) : undefined}
      />
    );
  };

  return (
    <Page title="Stuttering support" onBack={() => navigation.goBack()}>
      <Text variant="body" color="secondary">
        You're not alone. These organizations are here for you. So is a person,
        any time you need one.
      </Text>

      <View>
        <Text variant="h3" style={styles.sectionLabel}>
          Support organizations
        </Text>
        <View style={[styles.group, { backgroundColor: colors.surface.default }]}>
          {SUPPORT.map(renderRow)}
        </View>
      </View>

      <View>
        <Text variant="h3" style={styles.sectionLabel}>
          If you're struggling
        </Text>
        <View style={[styles.group, { backgroundColor: colors.surface.default }]}>
          {crisisItems.map(renderRow)}
        </View>
      </View>

      <Text variant="caption" color="tertiary" center style={styles.footnote}>
        Speechworks supports your practice, but it isn't a substitute for a
        speech-language pathologist or mental-health professional.
      </Text>
    </Page>
  );
};

export default Resources;

const styles = StyleSheet.create({
  sectionLabel: {
    marginBottom: spacing.md,
  },
  group: {
    borderRadius: radius.card,
    overflow: "hidden",
  },
  footnote: {
    marginTop: spacing.sm,
    paddingHorizontal: spacing.sm,
  },
});
