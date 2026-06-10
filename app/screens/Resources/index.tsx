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
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import Icon from "react-native-vector-icons/FontAwesome5";
import { BlurView } from "expo-blur";

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
    label: "988 Crisis Helpline",
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
      <Ionicons name="open-outline" size={18} color={C.faint} />
    </PressableScale>
  );

  return (
    <View style={styles.screen}>
      <BlurView
        intensity={80}
        tint="light"
        style={[
          styles.header,
          { paddingTop: insets.top + 10, height: 60 + insets.top },
        ]}
      >
        <PressableScale
          style={styles.backButton}
          scaleTo={0.92}
          haptic={false}
          onPress={() => navigation.goBack()}
          accessibilityLabel="Back"
        >
          <Icon name="chevron-left" size={16} color={C.title} />
        </PressableScale>
        <Text style={styles.headerTitle}>Help & Resources</Text>
        <View style={{ width: 32 }} />
      </BlurView>

      <ScrollView
        contentContainerStyle={{ padding: 20, paddingTop: 60 + insets.top + 20, paddingBottom: insets.bottom + 40 }}
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
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
  },
  backButton: {
    width: 32,
    height: 32,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.6)",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  headerTitle: {
    ...parseTextStyle(theme.typography.Heading3),
    color: C.title,
    marginTop: 2,
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
