"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

export type ThemeMode = "system" | "light" | "dark";

type ToolboxState = {
  theme: ThemeMode;
  setTheme: (theme: ThemeMode) => void;
};

export const useToolboxStore = create<ToolboxState>()(
  persist(
    (set) => ({
      theme: "system",
      setTheme: (theme) => set({ theme })
    }),
    {
      name: "personal-toolbox",
      partialize: (state) => ({ theme: state.theme })
    }
  )
);
