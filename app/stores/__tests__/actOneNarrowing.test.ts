import { useOnboardingDraftStore } from "../onboardingDraft";

/**
 * ============================================================================
 * ACT 1 — ASK ABOUT THEIR PICKS, NOT ALL NINE
 * ----------------------------------------------------------------------------
 * Two questions measure different things over one item bank: which acts feel
 * hardest, and which of them comes up most. Both are wanted — severity alone
 * cannot tell apart somebody who dreads presenting twice a year from somebody
 * who dreads phone calls twelve times a day.
 *
 * What was NOT wanted is the second question offering the full list, because
 * then it can be answered with an act they had just declined to call hard. That
 * produced a `most_frequent` outside `situations`, and the three consumers
 * disagreed about what to do with it:
 *
 *   · the shop ranker DISCARDED it (an explicit membership guard)
 *   · the day plan scored it TOP, above every act they did name
 *   · the first call routed somebody's entire welcome on it
 *
 * Narrowing makes membership true by construction, so all three agree without
 * any of them being touched. These tests pin that guarantee.
 * ============================================================================
 */

const FREQ_SCREEN = 2;
const SITUATIONS = "speech.situations";
const FREQUENCY = "situation.most_frequent";

const reset = (answers: Record<string, string | string[]>) => {
  useOnboardingDraftStore.setState({ answers, stepIndex: 1 });
};

const frequencyOptionValues = () =>
  (useOnboardingDraftStore
    .getState()
    .getCurrentScreenQuestions(FREQ_SCREEN)[0]?.options ?? [])
    .map((o: any) => String(o.value));

describe("Act 1 — the frequency question", () => {
  it("only offers acts they called hard", () => {
    // THE GUARANTEE. Whatever comes back can only be one of their own picks,
    // so `most_frequent ∈ situations` holds without anybody checking.
    reset({ [SITUATIONS]: ["present", "speak_up", "explain"] });

    const values = frequencyOptionValues();
    expect(values).toEqual(
      expect.arrayContaining(["present", "speak_up", "explain"]),
    );
    expect(values).not.toContain("order_or_ask");
    expect(values).not.toContain("disclose");
  });

  it("keeps 'not sure', because being unable to rank is a real answer", () => {
    // Removing it would force a false answer out of somebody who genuinely
    // cannot separate their own picks — which is worse than no signal, since
    // the whole point is that this one is weighted higher than the others.
    reset({ [SITUATIONS]: ["present", "speak_up"] });
    expect(frequencyOptionValues()).toContain("not_sure");
  });

  it("never narrows to a single choice", () => {
    // A question with one option is not a question. If narrowing would leave
    // nothing to choose between, the full list comes back and the SKIP below
    // is what handles it instead.
    reset({ [SITUATIONS]: ["present"] });
    const values = frequencyOptionValues();
    expect(values.filter((v) => v !== "not_sure" && v !== "none").length)
      .toBeGreaterThan(1);
  });

  it("falls back to the full list when nothing was picked", () => {
    // "None of these" / "Not sure" on question one leaves nothing to narrow to.
    reset({ [SITUATIONS]: ["none"] });
    expect(frequencyOptionValues().length).toBeGreaterThan(2);
  });
});

describe("Act 1 — skipping a question that cannot earn its screen", () => {
  it("skips the frequency screen when only one act was named", () => {
    // Onboarding gets one question shorter for exactly the people it was most
    // redundant for: with one hard act, "which of those comes up most?" has a
    // single possible answer.
    reset({ [SITUATIONS]: ["present"] });
    expect(useOnboardingDraftStore.getState().nextAnswerableScreen(1)).toBe(3);
  });

  it("asks it when there is genuinely something to rank", () => {
    reset({ [SITUATIONS]: ["present", "speak_up"] });
    expect(useOnboardingDraftStore.getState().nextAnswerableScreen(1)).toBe(
      FREQ_SCREEN,
    );
  });

  it("records the answer it skipped past, because it is arithmetic", () => {
    // Not a guess: with one act named hard, it is also the most frequent OF
    // THOSE. Leaving it blank would throw away a signal we can be certain of.
    reset({ [SITUATIONS]: ["push_back"] });
    useOnboardingDraftStore.getState().settleSkipped(1, 3);
    expect(useOnboardingDraftStore.getState().answers[FREQUENCY]).toBe(
      "push_back",
    );
  });

  it("invents nothing when there was nothing to rank", () => {
    // Someone who picked "none of these" must not come out the other side
    // holding an opinion we made up for them.
    reset({ [SITUATIONS]: ["none"] });
    useOnboardingDraftStore.getState().settleSkipped(1, 3);
    expect(useOnboardingDraftStore.getState().answers[FREQUENCY]).toBeUndefined();
  });

  it("leaves a real answer alone", () => {
    // Somebody who answered the question and then walked back through it must
    // not have their choice overwritten by the skip logic.
    reset({ [SITUATIONS]: ["present", "speak_up"], [FREQUENCY]: "speak_up" });
    useOnboardingDraftStore.getState().settleSkipped(1, 3);
    expect(useOnboardingDraftStore.getState().answers[FREQUENCY]).toBe("speak_up");
  });

  it("guarantees the frequency answer is always one of their picks", () => {
    // THE INVARIANT, stated directly and over every shape of answer. Both paths
    // that can set this key — choosing from the narrowed options, or the skip's
    // arithmetic — have to land inside `situations`, because three separate
    // consumers disagree about what to do when it doesn't.
    const cases = [
      ["present"],
      ["present", "explain"],
      ["introduce_yourself", "order_or_ask", "push_back", "disclose"],
    ];

    for (const picks of cases) {
      reset({ [SITUATIONS]: picks });
      const s = useOnboardingDraftStore.getState();
      s.settleSkipped(1, s.nextAnswerableScreen(1));

      // Path 1 — auto-answered on the way past a skipped screen.
      const chosen = useOnboardingDraftStore.getState().answers[FREQUENCY];
      if (chosen !== undefined) expect(picks).toContain(chosen);

      // Path 2 — anything they could pick on the screen, if it is shown.
      if (picks.length > 1) {
        frequencyOptionValues()
          .filter((v) => v !== "not_sure")
          .forEach((v) => expect(picks).toContain(v));
      }
    }
  });
});
