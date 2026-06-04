import { useFocusEffect } from "@react-navigation/native";
import { LinearGradient } from "expo-linear-gradient";
import { BlurView } from "expo-blur";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaterialCommunityIcons } from "@expo/vector-icons";

import CustomScrollView from "../../components/CustomScrollView";
import ScreenView from "../../components/ScreenView";
import Feed from "../../components/Feed";
import ButterflyFace from "../../assets/sw-faces/ButterflyFace";
import { theme } from "../../Theme/tokens";
import { parseTextStyle, parseShadowStyle } from "../../util/functions/parseStyles";
import {
  BuddySummary,
  CheerType,
  getMyBuddy,
  leaveBuddy,
  sendCheer,
  setReportConsent,
} from "../../api/buddies";
import { shareBuddyInvite } from "../../util/functions/share";
import { BUDDY_CHEERS } from "../../constants/buddyCheers";
import { track } from "../../util/analytics/postHog";
import { ANALYTICS_EVENTS } from "../../util/analytics/analyticsEvents";

const HEADER_HEIGHT = 100;

// Brand palette (warm orange scale) — keeps this screen cohesive with the app.
const C = {
  orange400: theme.colors.library.orange[400], // #FF9040
  orange500: theme.colors.library.orange[500], // #FF6B00
  orange600: theme.colors.library.orange[600], // #BF5000
  orange700: theme.colors.library.orange[700], // #803600
  title: theme.colors.text.title, // orange[800] #401B00
  textMuted: theme.colors.text.default, // gray[400]
  peach: "#FFF7ED",
  peachSurface: theme.colors.library.orange[100], // #FFF0E5
  warmBorder: theme.colors.library.orange[200], // #FFDABF
  hairline: theme.colors.library.gray[100], // #ECEDEE
  faint: theme.colors.library.gray[300], // #A1A4AA
  online: theme.colors.feedback.success, // #0DA500
  dangerBg: theme.colors.library.red[100], // #FFE5E5
  danger: theme.colors.library.red[400], // #FF4040
  gold: theme.colors.library.yellow[400], // #FFEC40
};

const Community = () => {
  const insets = useSafeAreaInsets();

  const [summary, setSummary] = useState<BuddySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  const [activeTab, setActiveTab] = useState<"activity" | "motivation">("activity");

  const load = useCallback(async () => {
    try {
      setError(false);
      const data = await getMyBuddy();
      setSummary(data);
    } catch (e) {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      track(ANALYTICS_EVENTS.BUDDY_INVITE_VIEWED, { source: "community" });
      load();
    }, [load]),
  );

  const link = summary?.link ?? null;
  const isPaired = link?.status === "active";
  const isPending = link?.status === "pending";

  const handleShare = async () => {
    if (!summary?.referralCode) return;
    const shared = await shareBuddyInvite(summary.referralCode);
    if (shared) {
      track(ANALYTICS_EVENTS.BUDDY_INVITE_SHARED, { source: "community" });
    }
  };

  const handleCheer = async (type: CheerType) => {
    if (busy) return;
    try {
      setBusy(true);
      await sendCheer(type);
      track(ANALYTICS_EVENTS.BUDDY_CHEER_SENT, { type });
      Alert.alert("Sent!", "Your buddy will see your cheer.");
    } catch (e) {
      Alert.alert("Couldn't send", "Please try again.");
    } finally {
      setBusy(false);
    }
  };

  const handleConsent = async (shared: boolean) => {
    if (!link) return;
    try {
      const updated = await setReportConsent(shared);
      track(ANALYTICS_EVENTS.BUDDY_REPORT_CONSENT_SET, { shared });
      setSummary((prev) => (prev ? { ...prev, link: updated } : prev));
    } catch (e) {
      Alert.alert("Couldn't update", "Please try again.");
    }
  };

  const handleLeave = () => {
    Alert.alert(
      "Leave buddy?",
      "You'll stop sharing progress with each other, and your slot frees up to invite someone else.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Leave",
          style: "destructive",
          onPress: async () => {
            try {
              setBusy(true);
              await leaveBuddy();
              track(ANALYTICS_EVENTS.BUDDY_LEFT, { by: "me" });
              await load();
            } catch (e) {
              Alert.alert("Couldn't leave", "Please try again.");
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  const buddyName = link?.buddy?.name ?? "Your Buddy";
  const buddyFirstName = buddyName.split(" ")[0];

  const renderHeader = () => (
    <BlurView
      intensity={80}
      tint="light"
      style={[
        styles.header,
        { paddingTop: insets.top + 20, height: HEADER_HEIGHT + insets.top },
      ]}
    >
      <Text style={styles.title}>Community</Text>
      <Text style={styles.subtitle}>
        {isPaired
          ? `You & ${buddyFirstName} — keep it up together.`
          : "Get yourself a practice partner."}
      </Text>
    </BlurView>
  );

  const renderInvite = () => (
    <View style={styles.inviteCardWrapper}>
      <View style={styles.inviteCard}>
        {/* Watermark Layer */}
        <View style={styles.watermarkLayer} pointerEvents="none">
          <MaterialCommunityIcons name="gift" size={260} color={C.orange500} style={styles.watermarkIcon} />
        </View>

        <Text style={styles.bigHeadline}>Invite a practice buddy</Text>
        <Text style={styles.inviteSubtitleText}>
          Practice together, stay accountable, and cheer each other on.
        </Text>

        <View style={styles.bottomBlock}>
          {isPending && (
            <View style={styles.pendingPillImm}>
              <MaterialCommunityIcons name="clock-fast" size={14} color={C.orange600} />
              <Text style={styles.pendingTextImm}>Waiting for them to join…</Text>
            </View>
          )}
          <View style={styles.codeBox}>
            <View style={styles.codeRow}>
              <MaterialCommunityIcons name="content-copy" size={20} color={C.orange500} style={{ marginRight: 12 }} />
              <Text style={styles.codeValueImm}>{summary?.referralCode ?? "—"}</Text>
            </View>
          </View>
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={handleShare}
            disabled={!summary?.referralCode}
            style={styles.sharePill}
          >
            <Text style={styles.sharePillText}>SHARE INVITE</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  const renderPaired = () => {
    const buddy = link?.buddy;
    const buddyInitials = buddyName.substring(0, 2).toUpperCase();

    return (
      <View style={styles.pairedWrapper}>
        {/* Profile Header Block */}
        <View style={styles.profileHeaderBlock}>
          <View style={styles.avatarWrapper}>
            {buddy?.profilePictureUrl ? (
              <Image source={{ uri: buddy.profilePictureUrl }} style={styles.avatarCircle} />
            ) : (
              <View style={styles.avatarCircleFallback}>
                <Text style={styles.avatarLetter}>{buddyInitials}</Text>
              </View>
            )}
            <View style={styles.statusBadge}>
              <View style={styles.statusBadgeInner} />
            </View>
          </View>

          <View style={styles.profileInfoText}>
            <View style={styles.nameRow}>
              <Text style={styles.buddyName} numberOfLines={1}>
                {buddyName}
              </Text>
              <MaterialCommunityIcons name="check-decagram" size={16} color={C.orange500} />
            </View>
            <Text style={styles.buddyBio}>
              Dedicated to improving speech. Practice Partner. Let's hit our goals together!
            </Text>

            <View style={styles.tagsRow}>
              <View style={styles.tagItem}>
                <Text style={styles.tagText}>Speech 🗣️</Text>
              </View>
              <View style={styles.tagItemSecondary}>
                <Text style={styles.tagTextSecondary}>supporter ⭐</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Action Row */}
        <View style={styles.actionRow}>
          <TouchableOpacity
            style={link?.iShareReports ? styles.actionBtnMuted : styles.actionBtnSolid}
            activeOpacity={0.7}
            onPress={() => handleConsent(!link?.iShareReports)}
          >
            <Text
              style={link?.iShareReports ? styles.actionBtnMutedText : styles.actionBtnSolidText}
            >
              {link?.iShareReports ? "Stop Sharing" : "Share Progress"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtnCircleNeutral}
            activeOpacity={0.7}
            onPress={handleShare}
          >
            <MaterialCommunityIcons name="send" size={20} color={C.orange700} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionBtnCircleDestructive}
            activeOpacity={0.7}
            onPress={handleLeave}
          >
            <MaterialCommunityIcons name="account-minus" size={20} color={C.danger} />
          </TouchableOpacity>
        </View>

        {/* Underline Tabs */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab("activity")}
            style={[styles.tab, activeTab === "activity" && styles.tabActive]}
          >
            <Text style={[styles.tabText, activeTab === "activity" && styles.tabTextActive]}>
              Activity
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            activeOpacity={0.8}
            onPress={() => setActiveTab("motivation")}
            style={[styles.tab, activeTab === "motivation" && styles.tabActive]}
          >
            <Text
              style={[styles.tabText, activeTab === "motivation" && styles.tabTextActive]}
            >
              Motivation
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content Area */}
        <View style={styles.tabContentArea}>
          {activeTab === "activity" && <Feed scope="buddy" />}

          {activeTab === "motivation" && (
            <View>
              {BUDDY_CHEERS.map((c) => (
                <View key={c.type} style={styles.postItem}>
                  <View style={styles.postAvatarFallback}>
                    <MaterialCommunityIcons name="account" size={16} color="#FFF" />
                  </View>
                  <View style={styles.postContent}>
                    <View style={styles.postHeader}>
                      <Text style={styles.postName}>You</Text>
                      <Text style={styles.postTime}>Now</Text>
                    </View>
                    <Text style={styles.postBody}>
                      {c.emoji} {c.label}
                    </Text>
                    <View style={styles.postActions}>
                      <TouchableOpacity
                        style={styles.postActionBtn}
                        onPress={() => handleCheer(c.type)}
                      >
                        <MaterialCommunityIcons
                          name="heart-outline"
                          size={18}
                          color={C.faint}
                        />
                        <Text style={styles.postActionText}>Send</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      </View>
    );
  };



  return (
    <ScreenView style={styles.screenView}>
      <View style={StyleSheet.absoluteFillObject}>
        <LinearGradient
          colors={[C.peach, "#FFF", "#FFF"]}
          locations={[0, 0.4, 1]}
          style={{ flex: 1 }}
        />
      </View>

      {renderHeader()}

      <View style={styles.container}>
        {loading ? (
          <View style={styles.center}>
            <ActivityIndicator color={C.orange500} size="large" />
          </View>
        ) : error ? (
          <View style={styles.center}>
            <MaterialCommunityIcons
              name="alert-circle-outline"
              size={48}
              color={C.faint}
              style={{ marginBottom: 12 }}
            />
            <Text style={styles.errorText}>Couldn't load Community.</Text>
            <TouchableOpacity onPress={load} style={styles.retryBtn}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <CustomScrollView
            contentContainerStyle={[
              styles.scrollView,
              { paddingTop: HEADER_HEIGHT + insets.top + 28, paddingBottom: 130 },
              !isPaired && { flexGrow: 1, justifyContent: "center" }
            ]}
          >
            {isPaired ? renderPaired() : renderInvite()}
          </CustomScrollView>
        )}
      </View>
    </ScreenView>
  );
};

export default Community;

const styles = StyleSheet.create({
  screenView: {
    flex: 1,
    paddingHorizontal: 0,
  },
  container: { flex: 1 },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    paddingHorizontal: 16,
    gap: 4,
  },
  title: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
  },
  subtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 30,
  },
  errorText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    marginBottom: 20,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 100,
    backgroundColor: C.orange500,
  },
  retryText: { color: "#FFFFFF", fontWeight: "700", fontSize: 16 },
  scrollView: { paddingHorizontal: 0 },

  // Invite Layout (cardless / editorial)
  invite: { alignItems: "center", paddingHorizontal: 28, paddingTop: 8 },
  heroBadge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 22,
    ...parseShadowStyle(theme.shadow.elevation2),
    shadowColor: C.orange500,
    shadowOpacity: 0.3,
  },
  inviteTitle: {
    ...parseTextStyle(theme.typography.Heading1),
    color: theme.colors.text.title,
    textAlign: "center",
    marginBottom: 12,
  },
  inviteSubtitle: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    lineHeight: 23,
    marginBottom: 28,
  },
  pendingRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 24,
  },
  pendingText: { color: C.orange700, fontSize: 14, fontWeight: "700" },
  codeBlock: { alignItems: "center", marginBottom: 32 },
  codeLabel: {
    ...parseTextStyle(theme.typography.LabelSmall),
    letterSpacing: 2,
    color: C.orange600,
    marginBottom: 10,
    textAlign: "center",
  },
  codeValue: {
    fontSize: 40,
    fontWeight: "900",
    letterSpacing: 6,
    color: theme.colors.text.title,
    textAlign: "center",
  },
  codeUnderline: {
    marginTop: 14,
    width: 64,
    height: 3,
    borderRadius: 2,
    backgroundColor: C.warmBorder,
  },
  primaryBtnWrap: { width: "100%" },
  primaryBtn: {
    width: "100%",
    height: 56,
    borderRadius: 100,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    ...parseShadowStyle(theme.shadow.elevation2),
    shadowColor: C.orange500,
    shadowOpacity: 0.25,
  },
  primaryBtnText: { color: "#FFFFFF", fontSize: 16, fontWeight: "800" },
  helperText: {
    ...parseTextStyle(theme.typography.BodyDetails),
    color: C.faint,
    textAlign: "center",
    marginTop: 14,
  },

  // Paired Layout
  pairedWrapper: { paddingTop: 16 },
  profileHeaderBlock: {
    flexDirection: "row",
    paddingHorizontal: 16,
    marginBottom: 20,
    alignItems: "flex-start",
  },
  avatarWrapper: { position: "relative", marginRight: 16 },
  avatarCircle: { width: 72, height: 72, borderRadius: 36, backgroundColor: C.warmBorder },
  avatarCircleFallback: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: theme.colors.text.title,
    alignItems: "center",
    justifyContent: "center",
  },
  avatarLetter: { fontSize: 28, fontWeight: "800", color: "#FFFFFF" },
  statusBadge: {
    position: "absolute",
    bottom: 0,
    right: 0,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadgeInner: { width: 14, height: 14, borderRadius: 7, backgroundColor: C.online },
  profileInfoText: { flex: 1, justifyContent: "center" },
  nameRow: { flexDirection: "row", alignItems: "center", gap: 4, marginBottom: 4 },
  buddyName: { fontSize: 20, fontWeight: "800", color: theme.colors.text.title },
  buddyBio: { fontSize: 15, color: theme.colors.text.default, lineHeight: 22, marginBottom: 14 },
  tagsRow: { flexDirection: "row", gap: 10, flexWrap: "wrap" },
  tagItem: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: C.peachSurface,
  },
  tagText: { fontSize: 13, fontWeight: "700", color: C.orange700 },
  tagItemSecondary: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 100,
    backgroundColor: C.gold,
  },
  tagTextSecondary: { fontSize: 13, fontWeight: "700", color: theme.colors.text.title },

  // Action Row
  actionRow: { flexDirection: "row", paddingHorizontal: 16, marginBottom: 24, gap: 12 },
  actionBtnSolid: {
    flex: 1,
    height: 44,
    borderRadius: 100,
    backgroundColor: C.orange500,
    alignItems: "center",
    justifyContent: "center",
    ...parseShadowStyle(theme.shadow.elevation1),
    shadowColor: C.orange500,
    shadowOpacity: 0.3,
  },
  actionBtnSolidText: { fontSize: 15, fontWeight: "800", color: "#FFFFFF" },
  actionBtnMuted: {
    flex: 1,
    height: 44,
    borderRadius: 100,
    backgroundColor: C.peachSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnMutedText: { fontSize: 15, fontWeight: "700", color: C.orange700 },
  actionBtnCircleNeutral: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.peachSurface,
    alignItems: "center",
    justifyContent: "center",
  },
  actionBtnCircleDestructive: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: C.dangerBg,
    alignItems: "center",
    justifyContent: "center",
  },

  // Underline Tabs
  tabContainer: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  tab: { flex: 1, paddingVertical: 14, alignItems: "center", justifyContent: "center" },
  tabActive: { borderBottomWidth: 2, borderBottomColor: C.orange500 },
  tabText: { fontSize: 15, fontWeight: "600", color: C.faint },
  tabTextActive: { color: theme.colors.text.title, fontWeight: "800" },

  // Tab Content Area
  tabContentArea: { minHeight: 300 },
  postItem: {
    flexDirection: "row",
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: C.hairline,
  },
  postAvatarFallback: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.text.title,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  postContent: { flex: 1 },
  postHeader: { flexDirection: "row", alignItems: "center", marginBottom: 4 },
  postName: { fontSize: 15, fontWeight: "700", color: theme.colors.text.title },
  postTime: { fontSize: 14, color: C.faint, marginLeft: 6 },
  postBody: { fontSize: 15, color: theme.colors.text.default, lineHeight: 22, marginBottom: 12 },
  postActions: { flexDirection: "row", alignItems: "center", gap: 24 },
  postActionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  postActionText: { fontSize: 13, fontWeight: "600", color: theme.colors.text.default },

  // Invite Referral Card (Premium White)
  inviteCardWrapper: {
    marginHorizontal: 24,
    marginTop: 20,
    position: "relative",
  },
  inviteCard: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 32,
    paddingTop: 48,
    paddingBottom: 32,
    paddingHorizontal: 24,
    alignItems: "center",
    ...parseShadowStyle(theme.shadow.elevation3),
    zIndex: 1,
  },
  watermarkLayer: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 32,
    overflow: "hidden",
    zIndex: -1,
  },
  watermarkIcon: {
    position: "absolute",
    right: -50,
    bottom: -50,
    opacity: 0.12,
    transform: [{ rotate: "-15deg" }],
  },
  bigHeadline: {
    ...parseTextStyle(theme.typography.Heading2),
    color: theme.colors.text.title,
    textAlign: "center",
    marginBottom: 16,
  },
  inviteSubtitleText: {
    ...parseTextStyle(theme.typography.Body),
    color: theme.colors.text.default,
    textAlign: "center",
    marginBottom: 32,
    lineHeight: 22,
    paddingHorizontal: 12,
  },
  bottomBlock: { alignItems: "center", width: "100%", gap: 24 },
  codeBox: {
    width: "100%",
    backgroundColor: C.peachSurface,
    borderWidth: 2,
    borderColor: C.warmBorder,
    borderStyle: "dashed",
    borderRadius: 16,
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  codeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  codeValueImm: {
    color: theme.colors.text.title,
    fontSize: 24,
    fontWeight: "900",
    letterSpacing: 1,
  },
  sharePill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    backgroundColor: C.orange500,
    paddingVertical: 14,
    borderRadius: 100,
    ...parseShadowStyle(theme.shadow.elevation2),
    shadowColor: C.orange500,
  },
  sharePillText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  pendingPillImm: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: C.peachSurface,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 100,
  },
  pendingTextImm: { color: C.orange700, fontSize: 13, fontWeight: "700" },
});
