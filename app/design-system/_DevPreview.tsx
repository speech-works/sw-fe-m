import React, { useState } from "react";
import { View, ScrollView, StyleSheet, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "./useTheme";
import { spacing, radius, elevation, gradients } from "./index";
import type { GradientName } from "./index";
import {
  Text,
  Button,
  IconButton,
  Chip,
  TextField,
  SearchField,
  Toggle,
  Segmented,
  Slider,
  Checkbox,
  Radio,
  Avatar,
  Badge,
  ProgressBar,
  ProgressRing,
  Gradient,
  Card,
  Surface,
  ListItem,
  ConnectedAvatarRow,
  Banner,
  Snackbar,
  Toast,
  Skeleton,
  Spinner,
  PageControl,
  EmptyState,
  ErrorState,
  Sheet,
  Dialog,
} from "./components";

/**
 * TEMPORARY dev-only design-system showcase (organized like real DS docs).
 * Rendered behind a flag in App.tsx for visual review — REMOVE before ship.
 * Not exported from the barrel.
 */
export const DevPreview: React.FC = () => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [toggleOn, setToggleOn] = useState(true);
  const [seg, setSeg] = useState("Selected");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sliderVal, setSliderVal] = useState(0.6);
  const [search, setSearch] = useState("");
  const [check, setCheck] = useState(true);
  const [radioVal, setRadioVal] = useState("daily");
  const [page, setPage] = useState(1);

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <View style={{ gap: 16 }}>
      <Text variant="h2">{title}</Text>
      {children}
    </View>
  );
  const Sub = ({ label, children }: { label: string; children: React.ReactNode }) => (
    <View style={{ gap: 10 }}>
      <Text variant="label" color="tertiary">
        {label.toUpperCase()}
      </Text>
      {children}
    </View>
  );
  const Swatch = ({ color, name }: { color: string; name: string }) => (
    <View style={{ width: 74, gap: 6 }}>
      <View
        style={{ height: 46, borderRadius: 12, backgroundColor: color, borderWidth: 1, borderColor: colors.border.hairline }}
      />
      <Text variant="caption" color="tertiary">
        {name}
      </Text>
    </View>
  );
  const Row = ({ children }: { children: React.ReactNode }) => (
    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 10 }}>{children}</View>
  );

  return (
    <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.background.canvas, zIndex: 9999 }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ padding: 20, paddingTop: insets.top + 16, paddingBottom: 80, gap: 32 }}
      >
        <View>
          <Text variant="screenTitle">Vivid</Text>
          <Text variant="body" color="secondary">
            Speechworks design system
          </Text>
        </View>

        {/* ---------------- FOUNDATIONS ---------------- */}
        <Section title="Foundations">
          <Sub label="Surfaces">
            <Row>
              <Swatch color={colors.background.canvas} name="canvas" />
              <Swatch color={colors.background.raised} name="raised" />
              <Swatch color={colors.surface.default} name="card" />
              <Swatch color={colors.surface.row} name="row" />
              <Swatch color={colors.surface.control} name="control" />
            </Row>
          </Sub>
          <Sub label="Brand & accents">
            <Row>
              <Swatch color={colors.action.primary} name="orange" />
              <Swatch color={colors.action.primaryPressed} name="pressed" />
              <Swatch color={colors.accent.lime} name="lime" />
              <Swatch color={colors.accent.purple} name="purple" />
              <Swatch color={colors.accent.success} name="success" />
              <Swatch color={colors.accent.warning} name="warning" />
              <Swatch color={colors.accent.danger} name="danger" />
              <Swatch color={colors.accent.info} name="info" />
            </Row>
          </Sub>
          <Sub label="Categories">
            <Row>
              <Swatch color={colors.category.reading} name="reading" />
              <Swatch color={colors.category.breathing} name="breathing" />
              <Swatch color={colors.category.mirror} name="mirror" />
              <Swatch color={colors.category.exposure} name="exposure" />
              <Swatch color={colors.category.fun} name="fun" />
              <Swatch color={colors.category.realLife} name="real-life" />
            </Row>
          </Sub>
          <Sub label="Type scale">
            <View style={{ gap: 4 }}>
              <Text variant="screenTitle">Screen title</Text>
              <Text variant="display">Display</Text>
              <Text variant="h1">Heading 1</Text>
              <Text variant="h2">Heading 2</Text>
              <Text variant="h3">Heading 3</Text>
              <Text variant="title">Title</Text>
              <Text variant="body" color="secondary">
                Body — select the sounds you find challenging.
              </Text>
              <Text variant="bodySm" color="secondary">
                Body small
              </Text>
              <Text variant="label" color="tertiary">
                LABEL
              </Text>
              <Text variant="caption" color="tertiary">
                Caption
              </Text>
            </View>
          </Sub>
          <Sub label="Spacing">
            <View style={{ gap: 6 }}>
              {(["xs", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl"] as const).map((k) => (
                <View key={k} style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
                  <Text variant="caption" color="tertiary" style={{ width: 64 }}>
                    {k} · {spacing[k]}
                  </Text>
                  <View style={{ height: 12, width: spacing[k], borderRadius: 3, backgroundColor: colors.action.primary }} />
                </View>
              ))}
            </View>
          </Sub>
          <Sub label="Radius">
            <Row>
              {(["sm", "input", "card", "sheet", "pill"] as const).map((k) => (
                <View key={k} style={{ alignItems: "center", gap: 6 }}>
                  <View
                    style={{ width: 56, height: 56, borderRadius: radius[k], backgroundColor: colors.surface.row, borderWidth: 1, borderColor: colors.border.hairline }}
                  />
                  <Text variant="caption" color="tertiary">
                    {k} · {radius[k]}
                  </Text>
                </View>
              ))}
            </Row>
          </Sub>
          <Sub label="Elevation (surface step + shadow)">
            <Row>
              {([
                { k: "e0", bg: colors.surface.default },
                { k: "e1", bg: colors.surface.elevated },
                { k: "e2", bg: colors.surface.elevated },
                { k: "e3", bg: colors.surface.control },
              ] as const).map(({ k, bg }) => (
                <View key={k} style={{ alignItems: "center", gap: 6 }}>
                  <View
                    style={[
                      { width: 72, height: 56, borderRadius: 16, backgroundColor: bg, borderWidth: 1, borderColor: colors.border.hairline },
                      elevation[k],
                    ]}
                  />
                  <Text variant="caption" color="tertiary">
                    {k}
                  </Text>
                </View>
              ))}
            </Row>
          </Sub>
          <Sub label="Gradients">
            <Row>
              {(Object.keys(gradients) as GradientName[]).map((k) => (
                <View key={k} style={{ alignItems: "center", gap: 6 }}>
                  <Gradient token={k} style={{ width: 74, height: 46, borderRadius: 12 }} />
                  <Text variant="caption" color="tertiary">
                    {k}
                  </Text>
                </View>
              ))}
            </Row>
          </Sub>
        </Section>

        {/* ---------------- ACTIONS ---------------- */}
        <Section title="Actions">
          <Sub label="Button">
            <View style={{ gap: 12 }}>
              <Button label="Apply Practice Focus" onPress={() => {}} />
              <Button label="Done" variant="secondary" onPress={() => {}} />
              <View style={{ flexDirection: "row", gap: 10 }}>
                <Button label="Continue" variant="ghost" fullWidth={false} onPress={() => {}} />
                <Button label="Stop" variant="danger" fullWidth={false} onPress={() => {}} />
              </View>
              <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <Button label="sm" size="sm" fullWidth={false} onPress={() => {}} />
                <Button label="md" size="md" fullWidth={false} onPress={() => {}} />
                <Button label="Saving…" loading fullWidth={false} onPress={() => {}} />
                <Button label="Off" disabled fullWidth={false} onPress={() => {}} />
              </View>
            </View>
          </Sub>
          <Sub label="Icon button & chips">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
              <IconButton name="arrow-left" onPress={() => {}} />
              <IconButton name="settings" variant="ghost" onPress={() => {}} />
              <Chip label="All" selected onPress={() => {}} />
              <Chip label="Reading" category="reading" icon="book-open" onPress={() => {}} />
              <Chip label="Breathing" category="breathing" icon="wind" onPress={() => {}} />
            </View>
          </Sub>
        </Section>

        {/* ---------------- INPUTS ---------------- */}
        <Section title="Inputs">
          <Sub label="Search">
            <SearchField value={search} onChangeText={setSearch} onClear={() => setSearch("")} placeholder="Search techniques…" />
          </Sub>
          <Sub label="Text field">
            <TextField label="Email" defaultValue="name@" error="Enter a valid email address" leftIcon="mail" />
            <View style={{ height: 12 }} />
            <TextField label="Reflection" placeholder="How did that feel?" multiline numberOfLines={3} />
          </Sub>
          <Sub label="Slider">
            <Slider
              value={sliderVal}
              onValueChange={setSliderVal}
              label="Reading voice speed"
              showValue
              formatValue={(v) => `${(0.5 + v).toFixed(1)}×`}
            />
          </Sub>
          <Sub label="Toggle & segmented">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Toggle value={toggleOn} onChange={setToggleOn} />
              <Toggle value={false} onChange={() => {}} />
              <Toggle value disabled onChange={() => {}} />
            </View>
            <Segmented options={["All", "Selected", "Recent"]} value={seg} onChange={setSeg} />
          </Sub>
          <Sub label="Checkbox & radio">
            <View style={{ gap: 14 }}>
              <Checkbox checked={check} onChange={setCheck} label="Remind me to practice" />
              <Checkbox checked={false} onChange={() => {}} label="Share progress with my buddy" />
              <Checkbox checked disabled onChange={() => {}} label="Locked option" />
            </View>
            <View style={{ height: 14 }} />
            <View style={{ flexDirection: "row", gap: 24 }}>
              <Radio selected={radioVal === "daily"} onSelect={() => setRadioVal("daily")} label="Daily" />
              <Radio selected={radioVal === "weekly"} onSelect={() => setRadioVal("weekly")} label="Weekly" />
            </View>
          </Sub>
        </Section>

        {/* ---------------- DATA DISPLAY ---------------- */}
        <Section title="Data display">
          <Sub label="Avatar · badge · progress">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 16 }}>
              <Avatar glyph="🇿🇦" />
              <Avatar glyph="θ" size={44} />
              <Badge count={3} />
              <Badge count={120} tone="primary" />
              <Badge dot />
              <View style={{ flex: 1 }}>
                <ProgressBar value={0.7} />
              </View>
            </View>
          </Sub>
          <Sub label="Progress ring">
            <Row>
              <ProgressRing progress={0.68}>
                <Text variant="h3">68%</Text>
              </ProgressRing>
              <ProgressRing progress={0.4} size={72} strokeWidth={8} color={colors.gamification.xp}>
                <Text variant="title">2/5</Text>
              </ProgressRing>
              <ProgressRing progress={1} size={56} strokeWidth={6} color={colors.accent.success} />
            </Row>
          </Sub>
          <Sub label="Card & list">
            <Card>
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                <Text variant="title" color="secondary">
                  Current streak
                </Text>
                <Badge dot tone="primary" />
              </View>
              <Text variant="screenTitle" style={{ marginTop: 8, fontVariant: ["tabular-nums"] }}>
                12
              </Text>
              <Text variant="bodySm" color="tertiary">
                days in a row
              </Text>
            </Card>
            <View style={{ marginTop: 12, backgroundColor: colors.surface.default, borderRadius: radius.card, overflow: "hidden" }}>
              <ListItem leftIcon="volume-2" label="Reading guide voice" sublabel="Indian accent" showChevron divider onPress={() => {}} />
              <ListItem leftIcon="zap" label="Haptics" sublabel="Vibrate on key actions" right={<Toggle value={toggleOn} onChange={setToggleOn} />} />
            </View>
          </Sub>
          <Sub label="Connected avatar row (signature)">
            <View style={{ gap: 14 }}>
              <ConnectedAvatarRow glyph="🇿🇦" title="South African" subtitle="Natural voice" trailing="audio" subtitleColor={colors.feedback.successText} />
              <ConnectedAvatarRow glyph="🇬🇧" title="British" subtitle="Selected voice" selected trailing="check" />
              <ConnectedAvatarRow glyph="θ" title="θ · think" subtitle="think, three, bath" selected trailing="check" />
              <ConnectedAvatarRow glyph="p" title="p · pen" subtitle="pen, pot, apple" compact trailing="plus" />
            </View>
          </Sub>
        </Section>

        {/* ---------------- FEEDBACK & STATUS ---------------- */}
        <Section title="Feedback & status">
          <Banner title="You're offline" message="Changes will sync when you reconnect." tone="info" />
          <Snackbar message="Sound removed" actionLabel="Undo" onAction={() => {}} />
          <Toast message="Practice focus saved" />
          <Sub label="Skeleton">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              <Skeleton width={56} height={56} radius={28} />
              <View style={{ flex: 1, gap: 8 }}>
                <Skeleton width="70%" height={16} />
                <Skeleton width="45%" height={12} />
              </View>
            </View>
          </Sub>
          <Sub label="Spinner & page control">
            <View style={{ flexDirection: "row", alignItems: "center", gap: 28 }}>
              <Spinner size="small" />
              <Spinner label="Loading…" />
            </View>
            <View style={{ marginTop: 4 }}>
              <Pressable onPress={() => setPage((p) => (p + 1) % 4)}>
                <PageControl count={4} activeIndex={page} />
              </Pressable>
            </View>
          </Sub>
          <Surface bordered>
            <EmptyState icon="inbox" title="No sounds yet" message="Add the sounds you want to focus on." actionLabel="Add sounds" onAction={() => {}} />
          </Surface>
          <Surface bordered>
            <ErrorState message="We couldn't load your sounds." onRetry={() => {}} />
          </Surface>
        </Section>

        {/* ---------------- OVERLAYS ---------------- */}
        <Section title="Overlays">
          <View style={{ flexDirection: "row", gap: 10 }}>
            <Button label="Open sheet" variant="secondary" size="md" fullWidth={false} onPress={() => setSheetOpen(true)} />
            <Button label="Open dialog" variant="secondary" size="md" fullWidth={false} onPress={() => setDialogOpen(true)} />
          </View>
        </Section>
      </ScrollView>

      <Sheet visible={sheetOpen} onClose={() => setSheetOpen(false)}>
        <Text variant="h2">Add a natural voice</Text>
        <Text variant="bodySm" color="secondary" style={{ marginTop: 8 }}>
          iOS downloads natural voices in Settings. It only takes a minute.
        </Text>
        <View style={{ height: 16 }} />
        <Button label="Open Settings" onPress={() => setSheetOpen(false)} />
      </Sheet>

      <Dialog
        visible={dialogOpen}
        onClose={() => setDialogOpen(false)}
        title="Discard changes?"
        message="Your sound selection won't be saved."
        confirmLabel="Discard"
        destructive
        onConfirm={() => setDialogOpen(false)}
      />
    </View>
  );
};
