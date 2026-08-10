import {
  useNativeModalStore,
  hasOpenModalExcept,
} from "../nativeModal";

/**
 * The native-modal presence registry.
 *
 * This store is the invariant the whole block flow rests on. Two live React
 * Native <Modal>s wedge all touch input on iOS, and that is precisely what
 * broke "Block & report": Community closed its confirm Dialog and opened the
 * ReportSheet in the same tick, the Dialog stayed mounted through its ~200ms
 * exit animation, the two modals overlapped, and the reason list never became
 * usable — so blockUser() was never called and the button appeared to do
 * nothing at all.
 *
 * `exclusive` modals defer on `hasOpenModalExcept`, so if this logic is wrong,
 * they either present too early (freeze) or never present (dead UI).
 */
describe("nativeModal registry", () => {
  beforeEach(() => {
    useNativeModalStore.setState({ openIds: [] });
    // register() warns in __DEV__ when two modals are live at once; these tests
    // deliberately create that state to check the query, so keep it quiet.
    jest.spyOn(console, "warn").mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it("reports nothing open on a clear screen", () => {
    expect(hasOpenModalExcept("anyone")).toBe(false);
  });

  it("sees another modal as open, but never itself", () => {
    useNativeModalStore.getState().register("dialog");
    expect(hasOpenModalExcept("sheet")).toBe(true);
    expect(hasOpenModalExcept("dialog")).toBe(false);
  });

  it("is idempotent — registering twice does not double-count", () => {
    const { register } = useNativeModalStore.getState();
    register("dialog");
    register("dialog");
    expect(useNativeModalStore.getState().openIds).toEqual(["dialog"]);
  });

  it("clears once the outgoing modal deregisters", () => {
    // The exact handoff the block flow performs: the Dialog holds the registry
    // through its exit animation, and the sheet may only present after it lets
    // go.
    const { register, unregister } = useNativeModalStore.getState();
    register("dialog");
    expect(hasOpenModalExcept("sheet")).toBe(true);
    unregister("dialog");
    expect(hasOpenModalExcept("sheet")).toBe(false);
  });

  it("treats unregistering something unknown as a no-op", () => {
    const { register, unregister } = useNativeModalStore.getState();
    register("dialog");
    unregister("never-registered");
    expect(useNativeModalStore.getState().openIds).toEqual(["dialog"]);
  });

  it("keeps deferring while ANY other modal is still open", () => {
    const { register, unregister } = useNativeModalStore.getState();
    register("dialog");
    register("toast");
    unregister("dialog");
    // The toast is still live, so an exclusive sheet must keep waiting.
    expect(hasOpenModalExcept("sheet")).toBe(true);
  });

  it("with two modals open, each still sees the other", () => {
    const { register } = useNativeModalStore.getState();
    register("a");
    register("b");
    expect(hasOpenModalExcept("a")).toBe(true);
    expect(hasOpenModalExcept("b")).toBe(true);
  });
});
