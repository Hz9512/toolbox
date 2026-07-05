"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

import type { AuthResult, PublicUser, ThemeMode, UserPreferences } from "@/lib/user-types";

type ToolboxState = {
  theme: ThemeMode;
  currentUser: PublicUser | null;
  sessionToken: string | null;
  setTheme: (theme: ThemeMode) => void;
  savePreferences: (preferences: Partial<UserPreferences>) => Promise<void>;
  register: (
    name: string,
    password: string,
    preferences?: Partial<UserPreferences>
  ) => Promise<AuthResult>;
  login: (name: string, password: string) => Promise<AuthResult>;
  logout: () => void;
};

async function postJson(path: string, body: unknown, sessionToken?: string | null) {
  const response = await fetch(path, {
    method: path === "/api/preferences" ? "PATCH" : "POST",
    headers: {
      "Content-Type": "application/json",
      ...(sessionToken ? { Authorization: `Bearer ${sessionToken}` } : {})
    },
    body: JSON.stringify(body)
  });
  const data = (await response.json()) as AuthResult;

  if (!response.ok && data.ok !== false) {
    return { ok: false, message: "请求失败，请稍后重试。" } satisfies AuthResult;
  }

  return data;
}

export const useToolboxStore = create<ToolboxState>()(
  persist(
    (set, get) => ({
      theme: "system",
      currentUser: null,
      sessionToken: null,
      setTheme: (theme) => {
        set((state) => ({
          theme,
          currentUser: state.currentUser
            ? {
                ...state.currentUser,
                preferences: {
                  ...state.currentUser.preferences,
                  theme
                }
              }
            : null
        }));
        get().savePreferences({ theme }).catch(() => {});
      },
      savePreferences: async (preferences) => {
        const { currentUser, sessionToken } = get();
        if (!currentUser || !sessionToken) {
          return;
        }

        const nextUser = {
          ...currentUser,
          preferences: {
            ...currentUser.preferences,
            ...preferences
          }
        };
        set({ currentUser: nextUser, theme: nextUser.preferences.theme });
        const result = await postJson("/api/preferences", { preferences }, sessionToken);
        if (result.ok && result.user) {
          set({ currentUser: result.user, theme: result.user.preferences.theme });
        }
      },
      register: async (name, password, preferences) => {
        const result = await postJson("/api/auth/register", {
          name,
          password,
          preferences: {
            theme: get().theme,
            ...preferences
          }
        });
        if (result.ok && result.user && result.sessionToken) {
          set({
            currentUser: result.user,
            sessionToken: result.sessionToken,
            theme: result.user.preferences.theme
          });
        }
        return result;
      },
      login: async (name, password) => {
        const result = await postJson("/api/auth/login", { name, password });
        if (result.ok && result.user && result.sessionToken) {
          set({
            currentUser: result.user,
            sessionToken: result.sessionToken,
            theme: result.user.preferences.theme
          });
        }
        return result;
      },
      logout: () =>
        set({
          currentUser: null,
          sessionToken: null
        })
    }),
    {
      name: "personal-toolbox",
      partialize: (state) => ({
        theme: state.theme,
        currentUser: state.currentUser,
        sessionToken: state.sessionToken
      })
    }
  )
);

export type { ThemeMode, UserPreferences };
