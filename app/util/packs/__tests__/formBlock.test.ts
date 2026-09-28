import { formCardText, formScreenHeader } from "../formBlock";
import type { FormBlockContent, FormConfiguration } from "../../../api/packs/types";

/**
 * The server sends a form's one-line description in `configuration.title` and
 * an EMPTY `configuration.description`. The card used to print the empty one,
 * so the day's own text for the step never appeared.
 */
const config: FormConfiguration = {
  formKey: "activity.program_belief_experiment_after",
  title: "What happened, and how sure you are now.",
  description: "",
  fields: [],
};

const block = (over: Partial<FormBlockContent> = {}): FormBlockContent => ({
  refId: "activity.program_belief_experiment_after",
  formId: "f1",
  configuration: config,
  ...over,
});

describe("formCardText", () => {
  it("shows the day's text for the step under the day's title", () => {
    expect(
      formCardText(
        block({
          titleOverride: "After: what happened, and how sure you are now",
          descriptionOverride: "Write what happened, in order.",
        }),
      ),
    ).toEqual({
      title: "After: what happened, and how sure you are now",
      body: "Write what happened, in order.",
    });
  });

  it("falls back to the form's own text when the day wrote none", () => {
    expect(formCardText(block())).toEqual({ title: config.title, body: "" });
    expect(
      formCardText(block({ configuration: { ...config, description: "Generic." } })).body,
    ).toBe("Generic.");
  });

  it("never throws on a block with no configuration", () => {
    expect(formCardText(undefined)).toEqual({ title: "Reflection", body: "" });
  });
});

describe("formScreenHeader", () => {
  it("titles the screen with the card's name and puts the form's summary under it", () => {
    expect(formScreenHeader(config, "After: what happened, and how sure you are now")).toEqual({
      title: "After: what happened, and how sure you are now",
      description: "What happened, and how sure you are now.",
    });
  });

  it("is unchanged from before when there is no titleOverride", () => {
    expect(formScreenHeader(config)).toEqual({ title: config.title, description: "" });
  });

  it("does not repeat the summary when the title is the same words", () => {
    expect(formScreenHeader(config, config.title)).toEqual({
      title: config.title,
      description: "",
    });
  });

  it("falls back to Reflection with nothing to go on", () => {
    expect(formScreenHeader(undefined).title).toBe("Reflection");
  });
});
