import { icons, type IconKey, type IconName } from "../../../../../design-system";

/**
 * Turn a SERVER-SUPPLIED icon name into something safe to render.
 *
 * This exists because `Icon` does not fail loudly on a bad name. It warns in
 * dev, then falls through to the Feather font, and an unknown Feather glyph
 * renders as a BLANK BOX with no error at all. In production that means the
 * first time a card is saved with a mistyped icon, the slot quietly shows a
 * hole and nothing anywhere says why.
 *
 * The server speaks the REGISTRY's vocabulary (`icons.play`, `icons.journey`),
 * not raw glyph names, so this resolves through the registry rather than
 * casting. A name that is not a registry key returns null, and the caller
 * renders no icon, which is a state the card already handles because `icon` is
 * optional anyway.
 */
export function safeIcon(name: string | null | undefined): IconName | null {
  if (!name) return null;

  if (name in icons) {
    return icons[name as IconKey];
  }

  if (__DEV__) {
    console.warn(
      `[PriorityCard] Icon "${name}" is not in the registry (app/design-system/icons.ts). ` +
        `Rendering no icon. Add the key there first, then use it in the console.`,
    );
  }
  return null;
}
