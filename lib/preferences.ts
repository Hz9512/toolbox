"use client";

import { aiLinksStorageKey, type AiLink } from "@/lib/ai-links";
import { defaultUserPreferences, type SearchEngineId, type ThemeMode, type UserPreferences } from "@/lib/user-types";

export const customWallpaperStorageKey = "lushifu.wallpaper";
export const customWallpaperIdStorageKey = "lushifu.wallpaperId";
export const wallpaperOpacityStorageKey = "lushifu.wallpaperOpacity";
export const searchEngineStorageKey = "lushifu.searchEngine";
const customWallpaperDbName = "lushifu-wallpaper";
const customWallpaperStoreName = "wallpapers";
const customWallpaperDbKey = "custom";

const userScopedStorageKeys = [
  aiLinksStorageKey,
  customWallpaperStorageKey,
  customWallpaperIdStorageKey,
  wallpaperOpacityStorageKey,
  searchEngineStorageKey
];

export function getScopedStorageKey(key: string, userId: string | null) {
  return userId ? `${key}.${userId}` : key;
}

export function getWallpaperBlobKey(userId: string | null) {
  return userId ? `${customWallpaperDbKey}:${userId}` : customWallpaperDbKey;
}

function readJson<T>(key: string, fallback: T) {
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    window.localStorage.removeItem(key);
    return fallback;
  }
}

function readBoundedNumber(key: string, fallback: number) {
  const value = Number(window.localStorage.getItem(key));
  return Number.isFinite(value) ? Math.min(85, Math.max(15, value)) : fallback;
}

function readSearchEngine(key: string) {
  const value = window.localStorage.getItem(key) as SearchEngineId | null;
  return value === "bing" || value === "baidu" || value === "sogou"
    ? value
    : defaultUserPreferences.searchEngine;
}

function readBlobAsDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

async function readWallpaperBlobAsDataUrl(userId: string | null) {
  try {
    const database = await openWallpaperDatabase();

    return await new Promise<string>((resolve, reject) => {
      const transaction = database.transaction(customWallpaperStoreName, "readonly");
      const request = transaction.objectStore(customWallpaperStoreName).get(getWallpaperBlobKey(userId));

      request.onsuccess = () => {
        if (request.result instanceof Blob) {
          readBlobAsDataUrl(request.result).then(resolve).catch(reject);
          return;
        }

        resolve("");
      };
      request.onerror = () => reject(request.error);
      transaction.oncomplete = () => database.close();
      transaction.onerror = () => {
        database.close();
        reject(transaction.error);
      };
    });
  } catch {
    return "";
  }
}

export async function readLocalPreferences(
  userId: string | null,
  theme: ThemeMode
): Promise<UserPreferences> {
  const aiLinksKey = getScopedStorageKey(aiLinksStorageKey, userId);
  const wallpaperKey = getScopedStorageKey(customWallpaperStorageKey, userId);
  const wallpaperIdKey = getScopedStorageKey(customWallpaperIdStorageKey, userId);
  const wallpaperOpacityKey = getScopedStorageKey(wallpaperOpacityStorageKey, userId);
  const engineKey = getScopedStorageKey(searchEngineStorageKey, userId);
  const wallpaperId = window.localStorage.getItem(wallpaperIdKey) ?? defaultUserPreferences.wallpaperId;
  let customWallpaper = window.localStorage.getItem(wallpaperKey) ?? "";

  if (wallpaperId === "custom" && !customWallpaper) {
    customWallpaper = await readWallpaperBlobAsDataUrl(userId);
  }

  return {
    theme,
    customAiLinks: readJson<AiLink[]>(aiLinksKey, []),
    wallpaperId,
    customWallpaper,
    wallpaperOpacity: readBoundedNumber(wallpaperOpacityKey, defaultUserPreferences.wallpaperOpacity),
    searchEngine: readSearchEngine(engineKey)
  };
}

export function cacheUserPreferences(userId: string | null, preferences: UserPreferences) {
  window.localStorage.setItem(
    getScopedStorageKey(aiLinksStorageKey, userId),
    JSON.stringify(preferences.customAiLinks)
  );
  window.localStorage.setItem(
    getScopedStorageKey(customWallpaperIdStorageKey, userId),
    preferences.wallpaperId
  );
  window.localStorage.setItem(
    getScopedStorageKey(wallpaperOpacityStorageKey, userId),
    String(preferences.wallpaperOpacity)
  );
  window.localStorage.setItem(
    getScopedStorageKey(searchEngineStorageKey, userId),
    preferences.searchEngine
  );

  const wallpaperKey = getScopedStorageKey(customWallpaperStorageKey, userId);
  if (preferences.customWallpaper) {
    window.localStorage.setItem(wallpaperKey, preferences.customWallpaper);
  } else {
    window.localStorage.removeItem(wallpaperKey);
  }
}

export function copyGuestPreferencesToUser(userId: string) {
  userScopedStorageKeys.forEach((key) => {
    const guestValue = window.localStorage.getItem(key);
    const userKey = getScopedStorageKey(key, userId);

    if (guestValue !== null && window.localStorage.getItem(userKey) === null) {
      window.localStorage.setItem(userKey, guestValue);
    }
  });
}

function openWallpaperDatabase() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (!("indexedDB" in window)) {
      reject(new Error("IndexedDB is unavailable"));
      return;
    }

    const request = window.indexedDB.open(customWallpaperDbName, 1);

    request.onupgradeneeded = () => {
      request.result.createObjectStore(customWallpaperStoreName);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function copyGuestWallpaperBlobToUser(userId: string) {
  const database = await openWallpaperDatabase();

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(customWallpaperStoreName, "readwrite");
    const store = transaction.objectStore(customWallpaperStoreName);
    const guestRequest = store.get(customWallpaperDbKey);
    const userKey = getWallpaperBlobKey(userId);

    guestRequest.onsuccess = () => {
      if (guestRequest.result instanceof Blob) {
        store.put(guestRequest.result, userKey);
      }
    };
    guestRequest.onerror = () => reject(guestRequest.error);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}
