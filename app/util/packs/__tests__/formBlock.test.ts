import {
  formCardText,
  formSavedMessage,
  formScreenHeader,
  formStartLabel,
  GUESS_FORM_KEY,
  initialFormAnswers,
} from "../formBlock";
import {
  FormFieldType,
  type FormBlockContent,
  type FormConfiguration,
} from "../../../api/packs/types";

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

describe("formStartLabel / formSavedMessage", () => {
  it("words the guess step as a guess", () => {
    expect(formStartLabel(GUESS_FORM_KEY)).toBe("Write your guess");
    expect(formSavedMessage(GUESS_FORM_KEY)).toEqual({
      title: "Guess saved",
      body: "You will see it again after the step.",
    });
  });

  it("leaves every other form as it was", () => {
    expect(formStartLabel(config.formKey)).toBe("Start Reflection");
    expect(formStartLabel(undefined)).toBe("Start Reflection");
    expect(formSavedMessage(config.formKey)).toEqual({
      title: "Reflection Saved",
      body: "Your response has been recorded.",
    });
  });
});

describe("initialFormAnswers", () => {
  const card: FormConfiguration = {
    formKey: "activity.panic_card",
    title: "Your Panic Card",
    description: "",
    fields: [
      { id: "panic_card.body", type: FormFieldType.TEXT_INPUT, label: "Your body", defaultValue: "Walk to the window" },
      { id: "panic_card.anchor", type: FormFieldType.TEXT_INPUT, label: "Your anchor", defaultValue: "Five things I can see" },
      { id: "panic_card.line", type: FormFieldType.TEXT_INPUT, label: "Your line", defaultValue: "   " },
      { id: "panic_card.when", type: FormFieldType.TEXT_INPUT, label: "When" },
    ],
  };

  it("opens each text box with the earlier answer the server sent", () => {
    expect(initialFormAnswers(card)).toEqual({
      "panic_card.body": "Walk to the window",
      "panic_card.anchor": "Five things I can see",
    });
  });

  it("starts every other field empty, as before", () => {
    const other: FormConfiguration = {
      ...card,
      fields: [
        // Only a text box takes a starting answer. A slider would put a number
        // in the person's mouth.
        { id: "w", type: FormFieldType.SLIDER, label: "How willing", defaultValue: "5" },
        { id: "c", type: FormFieldType.MULTIPLE_CHOICE, label: "Did you", options: ["Yes"], defaultValue: "Yes" },
        { id: "t", type: FormFieldType.TEXT_INPUT, label: "Note" },
      ],
    };
    expect(initialFormAnswers(other)).toEqual({});
    expect(initialFormAnswers(config)).toEqual({});
    expect(initialFormAnswers(undefined)).toEqual({});
  });
});
