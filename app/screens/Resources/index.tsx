import React, { useEffect, useState } from "react";
import { Linking, StyleSheet, View } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { handleLinkPress } from "../../util/functions/externalLinks";
import { getCrisisResource, CrisisResource } from "../../api/crisis";
import {
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

// US-only. Used ONLY as a fallback if the country-aware GET /crisis-resources
// fetch fails — most of this screen's audience is India-first, where these
// numbers don't work at all (see getCrisisResource / CrisisResources.ts on
// the backend, which resolves Tele-MANAS for IN).
const FALLBACK_CRISIS: ResourceItem[] = [
  {
    label: "988 Crisis Helpline",
    desc: "Call or text 988. Free and confidential, 24/7.",
    icon: "phone-call",
    action: "tel:988",
  },
  {
    label: "Crisis Text Line",
    desc: "Text HOME to 741741 to reach a trained counselor.",
    icon: "message-circle",
    action: "sms:741741",
  },
];

function toResourceItem(resource: CrisisResource): ResourceItem {
  return {
    label: resource.helplineName,
    desc: resource.description,
    icon: "phone-call",
    action: resource.phone ? `tel:${resource.phone}` : undefined,
    url: resource.phone ? undefined : resource.url,
  };
}

const Resources = () => {
  const navigation = useNavigation<any>();
  const { colors } = useTheme();
  const [crisisItems, setCrisisItems] = useState<ResourceItem[]>(FALLBACK_CRISIS);

  useEffect(() => {
    let cancelled = false;
    getCrisisResource()
      .then((resource) => {
        if (!cancelled) setCrisisItems([toResourceItem(resource)]);
      })
      .catch(() => {
        // Fetch failed — keep the hardcoded fallback so this section is
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

  const renderRow = (item: ResourceItem, index: number, arr: ResourceItem[]) => (
    <ListItem
      key={item.label}
      leftIcon={item.icon}
      label={item.label}
      sublabel={item.desc}
      right={<Icon name="external-link" size={18} color={colors.text.tertiary} />}
      divider={index < arr.length - 1}
      onPress={() => open(item)}
    />
  );

  return (
    <Page title="Help & Resources" onBack={() => navigation.goBack()}>
      <Text variant="body" color="secondary">
        You're not alone. These organizations are here for you. So is a person,
        any time you need one.
      </Text>

      <View>
        <Text variant="h3" style={styles.sectionLabel}>
          Stuttering community & support
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
