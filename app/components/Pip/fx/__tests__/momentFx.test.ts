import { MOMENT_FX, momentFx, momentFxNow } from "../momentFx";
import { fitFx, screenAnchored } from "../fitFx";

describe("moment variants", () => {
  it("a low mood is never cheerful: no sparkles, no ding, one quiet sound at most", () => {
    const low = momentFxNow("mood-checkin", "low");
    expect(low.emitters.some(e => e.kind === "burst")).toBe(false);
    expect(low.emitters.some(e => e.shapes.includes("a2-mood-low"))).toBe(true);
    expect((low.sounds ?? []).length).toBeLessThanOrEqual(1);
    expect((low.pip ?? []).some(b => b.body === "hop" || b.face === "laugh")).toBe(false);
  });
  it("the empty-list snail has no loading dots or ticks", () => {
    const s = momentFxNow("waiting-empty", "snail");
    expect(s.emitters.some(e => e.shapes.includes("b2-dot"))).toBe(false);
    expect(s.sounds).toEqual([]);
  });
  it("level-up finals take turns; a new stage adds the golden shower", async () => {
    const a = await momentFx("level-up"), b = await momentFx("level-up"), c = await momentFx("level-up", "stage");
    expect(new Set([a.id, b.id, c.id.replace(/-stage$/, "")]).size).toBe(3);
    expect(c.emitters.length).toBeGreaterThan(MOMENT_FX["level-up"].find(x => c.id.startsWith(x.id))!.emitters.length);
  });
  it("back after days away: the bird brings a flower", () => {
    expect(momentFxNow("home-greeting", "away").emitters.some(e => e.shapes.includes("a2-flower"))).toBe(true);
  });
});

describe("fitFx", () => {
  const spot = { x: 75, y: 250, size: 240 };
  it("leaves an effect alone when Pip stands at its design spot on a 390 x 844 screen", () => {
    const fx = MOMENT_FX["permission-ask"][0];
    const cx = 75 + 120, cy = 250 + 240 * (322 / 372) * 0.42;
    expect(fitFx(fx, spot, { cx, cy, size: 240, W: 390, H: 844 })).toBe(fx);
  });
  it("moves Pip's props with him and keeps the screen's pieces", () => {
    const fx = MOMENT_FX["onboarding-done"][0];
    const out = fitFx(fx, spot, { cx: 195, cy: 337 + 100, size: 240, W: 390, H: 844 });
    fx.emitters.forEach((e, i) => {
      if (screenAnchored(e, spot)) expect(out.emitters[i]).toBe(e);
      else if (e.origin) expect(out.emitters[i].origin![1]).toBeCloseTo(e.origin[1] + 100 / 844, 3);
    });
  });
});
