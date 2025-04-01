import { create } from "zustand";

type Event = { name: string; detail?: any };

interface EventStore {
  events: Event[];
  emit: (name: string, detail?: any) => void;
  clear: (name: string) => void;
  clearAll: () => void;
}

export const useEventStore = create<EventStore>((set) => ({
  events: [],
  emit: (name, detail) =>
    set((state) => ({ events: [...state.events, { name, detail }] })),
  clear: (name) =>
    set((state) => ({
      events: state.events.filter((event) => event.name !== name),
    })),
  clearAll: () => set({ events: [] }),
}));
