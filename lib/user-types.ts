import type { AiLink } from "@/lib/ai-links";

export type ThemeMode = "system" | "light" | "dark";
export type SearchEngineId = "bing" | "baidu" | "sogou";

export type UserPreferences = {
  theme: ThemeMode;
  customAiLinks: AiLink[];
  wallpaperId: string;
  customWallpaper: string;
  wallpaperOpacity: number;
  searchEngine: SearchEngineId;
};

export type PublicUser = {
  id: string;
  name: string;
  createdAt: string;
  preferences: UserPreferences;
};

export type AuthResult = {
  ok: boolean;
  message?: string;
  user?: PublicUser;
  sessionToken?: string;
};

export const defaultUserPreferences: UserPreferences = {
  theme: "system",
  customAiLinks: [],
  wallpaperId: "default",
  customWallpaper: "",
  wallpaperOpacity: 85,
  searchEngine: "bing"
};
