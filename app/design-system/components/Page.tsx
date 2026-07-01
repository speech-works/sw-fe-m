import React, { useState } from "react";
import {
  View,
  ScrollView,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  ListRenderItem,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import ScreenView from "../../components/ScreenView";
import { useTheme } from "../useTheme";
import { spacing, space, size, zIndex } from "../primitives/scale";
import { PageHeader } from "./PageHeader";

/** FlatList body config — forwarded to a single FlatList that owns the page body. */
export interface PageListConfig {
  data: ReadonlyArray<any>;
  renderItem: ListRenderItem<any>;
  keyExtractor: (item: any, index: number) => string;
  ListEmptyComponent?: React.ReactElement | null;
  extraData?: unknown;
}

export interface PageProps {
  /** Large left-aligned screen title (h1). */
  title: string;
  /** Optional secondary line under the title. */
  description?: string;
  onBack?: () => void;
  /** Trailing slot in the back bar (e.g. an action IconButton). */
  right?: React.ReactNode;
  /** Pinned bottom action (e.g. a primary Button). */
  footer?: React.ReactNode;
  /** Wrap the body in KeyboardAvoidingView (forms). */
  keyboardAvoiding?: boolean;
  /** Scroll the body (default true). Ignored when `list` is set. */
  scroll?: boolean;
  /** Gap between stacked children (default space.groupGap). */
  contentGap?: number;
  /** Render the body as a FlatList instead of children (title becomes the list header). */
  list?: PageListConfig;
  /** Tab-ROOT screens (where the floating CustomTabBar shows) set this so the
   * scroll body clears the dock and bottom content stays reachable. */
  tabBarSafe?: boolean;
  children?: React.ReactNode;
}

const FOOTER_RESERVE = 96; // space kept clear at the bottom when a footer is pinned

/**
 * The single product-screen scaffold. Owns the standard dark canvas, the
 * large-title header (back bar + h1 + optional description), screen gutters, and
 * the title→content rhythm — so screens never hand-roll wrapper/header/scroll/
 * padding (which is how layout drifts). Body can be scrolling children, a
 * FlatList (`list`), or a fixed View (`scroll={false}`).
 */
export const Page: React.FC<PageProps> = ({
  title,
  description,
  onBack,
  right,
  footer,
  keyboardAvoiding,
  scroll = true,
  contentGap,
  list,
  tabBarSafe,
  children,
}) => {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();

  // Measured at runtime so the scroll body reserves the footer's REAL height
  // (varies by content) and the last element always clears the pinned footer.
  const [footerH, setFooterH] = useState(FOOTER_RESERVE);

  const topPad = insets.top + space.inlineGap; // safe area + 8, matches Header
  const tabPad = tabBarSafe ? size.tabBarSafe : 0;
  const bottomPad =
    (footer ? footerH + space.groupGap : insets.bottom + space.screenX) + tabPad;
  const gap = contentGap ?? space.groupGap;

  // No own horizontal padding — the container applies space.screenX so the title
  // and the content (and list rows) all share one gutter. The back bar only
  // renders when there's a back button or a right action — otherwise (tab-root
  // screens) the title sits near the top instead of below a phantom 44px bar.
  // One source of truth for the header — shared with custom-layout screens.
  const titleBlock = (
    <PageHeader title={title} description={description} onBack={onBack} right={right} />
  );

  let body: React.ReactNode;
  if (list) {
    body = (
      <FlatList
        data={list.data as any[]}
        renderItem={list.renderItem}
        keyExtractor={list.keyExtractor}
        ListEmptyComponent={list.ListEmptyComponent ?? undefined}
        extraData={list.extraData}
        showsVerticalScrollIndicator={false}
        ListHeaderComponent={
          <View style={{ paddingTop: topPad }}>
            {titleBlock}
            <View style={{ height: space.titleGap }} />
          </View>
        }
        contentContainerStyle={{
          paddingHorizontal: space.screenX,
          paddingBottom: bottomPad,
          flexGrow: 1,
        }}
      />
    );
  } else if (scroll) {
    body = (
      <ScrollView
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{
          paddingTop: topPad,
          paddingHorizontal: space.screenX,
          paddingBottom: bottomPad,
          flexGrow: 1,
        }}
      >
        {titleBlock}
        <View style={{ marginTop: space.titleGap, gap }}>{children}</View>
      </ScrollView>
    );
  } else {
    body = (
      <View style={{ flex: 1, paddingTop: topPad, paddingHorizontal: space.screenX }}>
        {titleBlock}
        <View style={{ flex: 1, marginTop: space.titleGap, gap }}>{children}</View>
      </View>
    );
  }

  if (keyboardAvoiding) {
    body = (
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {body}
      </KeyboardAvoidingView>
    );
  }

  return (
    <ScreenView style={{ backgroundColor: colors.background.canvas }}>
      {/* Dark scaffold → light status-bar glyphs (white clock/battery), drawn
       * edge-to-edge over the app canvas. Overrides BgWrapper's dark-content. */}
      <StatusBar barStyle="light-content" translucent backgroundColor="transparent" />
      {body}
      {/* Opaque status-bar cap — hides scrolled content behind the system clock/
       * battery instead of letting the title collide with them. */}
      {insets.top > 0 ? (
        <View
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: insets.top,
            backgroundColor: colors.background.canvas,
            zIndex: zIndex.sticky,
          }}
        />
      ) : null}
      {footer ? (
        <View
          onLayout={(e) => setFooterH(e.nativeEvent.layout.height)}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            bottom: 0,
            paddingHorizontal: space.screenX,
            paddingTop: space.sectionGap,
            paddingBottom: Math.max(insets.bottom + space.rowGap, spacing["3xl"]),
            backgroundColor: colors.background.canvas,
          }}
        >
          {footer}
        </View>
      ) : null}
    </ScreenView>
  );
};
