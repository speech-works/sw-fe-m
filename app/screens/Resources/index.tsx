import React from "react";
import {
  Linking,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useNavigation } from "@react-navigation/native";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import PressableScale from "../../components/PressableScale";
import { theme } from "../../Theme/tokens";
import { parseTextStyle } from "../../util/functions/parseStyles";
import { handleLinkPress } from "../../util/functions/externalLinks";

const C = {
  title: theme.colors.text.title,
  body: theme.colors.text.default,
  orange500: theme.colors.library.orange[500],
  orange700: theme.colors.library.orange[700],
  peach: theme.colors.library.orange[100],
  warmBorder: theme.colors.library.orange[200],
  hairline: theme.colors.library.gray[100],
  faint: theme.colors.library.gray[400],
};

interface ResourceItem {
  label: string;
  desc: string;
  icon: string;
  /** Web link (opened via handleLinkPress) … */
  url?: string;
  /** … or a tel:/sms: action (opened via Linking). */
  action?: string;
}

const SUPPORT: ResourceItem[] = [
  {
    label: "National Stuttering Association",
    desc: "Community, local chapters & events for people who stutter.",
    icon: "account-group",
    url: "https://westutter.org",
  },
  {
    label: "The Stuttering Foundation",
    desc: "Free resources, referrals & a speech-therapist directory.",
    icon: "book-open-variant",
    url: "https://www.stutteringhelp.org",
  },
  {
    label: "FRIENDS",
    desc: "For young people who stutter and their families.",
    icon: "hand-heart",
    url: "https://friendswhostutter.org",
  },
];

const CRISIS: ResourceItem[] = [
  {
    label: "988 Suicide & Crisis Lifeline",
    desc: "Call or text 988 — free and confidential, 24/7.",
    icon: "phone-in-talk",
    action: "tel:988",
  },
  {
    label: "Crisis Text Line",
    desc: "Text HOME to 741741 to reach a trained counselor.",
    icon: "message-text-outline",
    action: "sms:741741",
  },
];

const Resources = () => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();

  const open = (item: ResourceItem) => {
    if (item.url) handleLinkPress(item.url);
    else if (item.action) Linking.openURL(item.action).catch(() => undefined);
  };

  const renderRow = (item: ResourceItem, isCrisis?: boolean) => (
    <PressableScale
      key={item.label}
      style={styles.row}
      scaleTo={0.98}
      onPress={() => open(item)}
      accessibilityRole="link"
      accessibilityLabel={item.label}
    >
      <View style={[styles.rowIcon, isCrisis && styles.rowIconCrisis]}>
        <MaterialCommunityIcons
          name={item.icon as any}
          size={22}
          color={isCrisis ? "#FFFFFF" : C.orange500}
        />
      </View>
      <View style={styles.rowText}>
        <Text style={styles.rowLabel}>{item.label}</Text>
        <Text style={styles.rowDesc}>{item.desc}</Text>
      </View>
      <MaterialCommunityIcons name="open-in-new" size={18} color={C.faint} />
    </PressableScale>
  );

  return (
    <View style={styles.screen}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <PressableScale
          style={styles.backBtn}
          scaleTo={0.92}
          haptic={false}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back"
        >
          <MaterialCommunityIcons name="chevron-left" size={26} color={C.title} />
        </PressableScale>
        <Text style={styles.headerTitle}>Help & Resources</Text>
        <View style={styles.backBtn} />
      </View>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingBottom: insets.bottom + 40 }}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.intro}>
          You're not alone. These trusted organizations are here for you — and so is a
          person, any time you need one.
        </Text>

        <Text style={styles.sectionLabel}>Stuttering community & support</Text>
        <View style={styles.card}>{SUPPORT.map((i) => renderRow(i))}</View>

        <Text style={[styles.sectionLabel, { marginTop: 28 }]}>If you're struggling</Text>
        <View style={styles.card}>{CRISIS.map((i) => renderRow(i, true))}</View>

        <Text style={styles.footnote}>
          Speechworks supports your practice, but it isn't a substitute for a
          speech-language pathologist or mental-health professional.
        </Text>
      </ScrollView>
    </View>
  );
};

export default Resources;

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#FFFBF7" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    ...parseTextStyle(theme.typography.Heading3),
    color: C.title,
  },
  intro: {
    ...parseTextStyle(theme.typography.Body),
    color: C.body,
    lineHeight: 22,
    marginBottom: 24,
  },
  sectionLabel: {
    ...parseTextStyle(theme.typography.Heading3),
    color: C.title,
    marginBottom: 12,
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: C.hairline,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: C.hairline,
  },
  rowIcon: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: C.peach,
    alignItems: "center",
    justifyContent: "center",
  },
  rowIconCrisis: { backgroundColor: C.orange500 },
  rowText: { flex: 1 },
  rowLabel: { fontSize: 15, fontWeight: "800", color: C.title },
  rowDesc: { fontSize: 13, color: C.body, marginTop: 2, lineHeight: 18 },
  footnote: {
    fontSize: 12,
    color: C.faint,
    lineHeight: 18,
    marginTop: 28,
    textAlign: "center",
    paddingHorizontal: 8,
  },
});
