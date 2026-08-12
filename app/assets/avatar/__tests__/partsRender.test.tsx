import React from "react";
import { PART_REGISTRY } from "../registry";
import type { PartProps } from "../parts";
import { DEFAULT_MANIFEST } from "../../../types/avatar";
import type { AvatarSlot } from "../../../types/avatar";

/**
 * Every registered part must actually execute.
 *
 * `tsc` proves the components type-check and the parity test proves they are
 * offered — neither runs a single line of their bodies. Several parts build
 * their art in loops (the backdrop tiler, the pixel grid, the leopard spots),
 * and a throw in one of those is invisible until the screen mounts.
 *
 * This invokes each component as a function and checks it returns an element.
 * It stops short of a real render — that would need the native SVG host — so
 * it catches bad logic, not bad SVG props.
 */
describe("every part executes", () => {
  const colors = DEFAULT_MANIFEST.colors;
  const slots = Object.keys(PART_REGISTRY) as AvatarSlot[];

  slots.forEach((slot) => {
    const ids = Object.keys(PART_REGISTRY[slot]);
    if (!ids.length) return;
    it(`renders every ${slot} without throwing`, () => {
      ids.forEach((id) => {
        // Every part is a function component; the registry's type admits class
        // components too, which are not callable.
        const Component = PART_REGISTRY[slot][id] as (
          props: PartProps,
        ) => React.ReactElement | null;
        // Hair and collars are drawn in two passes; exercise both.
        [undefined, "back" as const, "front" as const].forEach((layer) => {
          const el = Component({ colors, layer });
          expect(React.isValidElement(el) || el === null).toBe(true);
        });
      });
    });
  });
});
