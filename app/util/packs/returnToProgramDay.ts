/**
 * Back to the program day a step was opened from, from any depth.
 *
 * A step can be several screens deep in a nested stack (Mirror Work is Prep,
 * Session, Reflection, Summary inside the cognitive stack). `goBack` from the
 * last of those lands on the one before it, not on the day. This walks up to
 * the navigator that holds PackModule and pops back to it, so finishing a step
 * in a program always ends on that program's day.
 */
export function returnToProgramDay(
  navigation: any,
  packContext?: { packId?: string; moduleId?: string; blockIndex?: number } | null,
): void {
  let nav = navigation;
  while (nav) {
    const names: string[] | undefined = nav.getState?.()?.routeNames;
    if (names?.includes("PackModule")) {
      const params = packContext?.packId
        ? {
            packId: packContext.packId,
            moduleId: packContext.moduleId,
            initialBlockIndex: packContext.blockIndex,
          }
        : undefined;
      if (typeof nav.popTo === "function") nav.popTo("PackModule", params);
      else nav.navigate("PackModule", params);
      return;
    }
    nav = nav.getParent?.();
  }
  if (navigation.canGoBack?.()) navigation.goBack();
}
