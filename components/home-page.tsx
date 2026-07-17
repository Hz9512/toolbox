"use client";

import {
  ChangeEvent,
  DragEvent,
  FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useRouter } from "next/navigation";
import {
  Bot,
  CheckCircle2,
  Check,
  ChevronDown,
  Globe2,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Upload
} from "lucide-react";

import { ToolCard } from "@/components/tool-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  aiLinkOrderStorageKey,
  aiLinksStorageKey,
  defaultAiLinks,
  hiddenAiLinksStorageKey,
  type AiLink
} from "@/lib/ai-links";
import {
  customWallpaperIdStorageKey,
  customWallpaperStorageKey,
  cacheUserPreferences,
  getWallpaperBlobKey,
  getScopedStorageKey,
  searchEngineStorageKey
} from "@/lib/preferences";
import { useToolboxStore } from "@/lib/store";
import { categories, CategoryId, tools } from "@/lib/tools";
import { cn } from "@/lib/utils";
import {
  defaultWebLinks,
  hiddenWebLinksStorageKey,
  webLinkOrderStorageKey,
  webLinksStorageKey,
  type WebLink
} from "@/lib/web-links";

type SearchMode = "web" | "ai" | "tools";
type SearchEngineId = "bing" | "baidu" | "sogou";

type WallpaperItem = {
  id: string;
  name: string;
  image: string;
  preview?: string;
};

type LinkKind = "ai" | "web";
type ManagedLink = AiLink | WebLink;

const customWallpaperDbName = "lushifu-wallpaper";
const customWallpaperStoreName = "wallpapers";
const maxStoredWallpaperLength = 3_500_000;
const wallpaperOverlayOpacity = 78;

const searchEngines: Array<{
  id: SearchEngineId;
  name: string;
  href: (query: string) => string;
}> = [
  {
    id: "bing",
    name: "必应",
    href: (query) => `https://www.bing.com/search?q=${encodeURIComponent(query)}`
  },
  {
    id: "baidu",
    name: "百度",
    href: (query) => `https://www.baidu.com/s?wd=${encodeURIComponent(query)}`
  },
  {
    id: "sogou",
    name: "搜狗",
    href: (query) => `https://www.sogou.com/web?query=${encodeURIComponent(query)}`
  }
];

const wallpapers: WallpaperItem[] = [
  {
    id: "default",
    name: "默认",
    image: ""
  },
  {
    id: "forest",
    name: "森林",
    image:
      "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2400&q=86",
    preview:
      "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=640&q=64"
  },
  {
    id: "mountain",
    name: "山脊",
    image:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2400&q=86",
    preview:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=640&q=64"
  },
  {
    id: "ocean",
    name: "海岸",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2400&q=86",
    preview:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=640&q=64"
  },
  {
    id: "night",
    name: "星空",
    image:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2400&q=86",
    preview:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=640&q=64"
  }
];

function matchesTool(query: string, tool: (typeof tools)[number]) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [tool.name, tool.description, tool.category, ...tool.keywords]
    .join(" ")
    .toLowerCase();

  return normalized.split(/\s+/).every((part) => haystack.includes(part));
}

function matchesAiLink(query: string, link: AiLink) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return [link.name, link.description, link.href].join(" ").toLowerCase().includes(normalized);
}

function matchesWebLink(query: string, link: WebLink) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  return [link.name, link.description, link.href].join(" ").toLowerCase().includes(normalized);
}

function normalizeUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function getFaviconUrl(href: string) {
  try {
    return `${new URL(href).origin}/favicon.ico`;
  } catch {
    return "";
  }
}

function safeSetLocalStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
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

function mergeLinks<T extends ManagedLink>(
  defaultLinks: T[],
  customLinks: T[],
  order: string[],
  hiddenIds: string[]
) {
  const hidden = new Set(hiddenIds);
  const byId = new Map([...defaultLinks, ...customLinks].map((link) => [link.id, link] as const));
  const ordered = order
    .map((id) => byId.get(id))
    .filter((link): link is T => {
      if (!link) {
        return false;
      }

      return !hidden.has(link.id);
    });
  const orderedIds = new Set(ordered.map((link) => link.id));
  const rest = [...defaultLinks, ...customLinks].filter(
    (link) => !hidden.has(link.id) && !orderedIds.has(link.id)
  );

  return [...ordered, ...rest];
}

function moveId(ids: string[], draggedId: string, targetId: string) {
  if (draggedId === targetId) return ids;

  const withoutDragged = ids.filter((id) => id !== draggedId);
  const targetIndex = withoutDragged.indexOf(targetId);
  if (targetIndex < 0) return ids;

  return [
    ...withoutDragged.slice(0, targetIndex),
    draggedId,
    ...withoutDragged.slice(targetIndex)
  ];
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
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

async function saveCustomWallpaperBlob(blob: Blob, key: string) {
  const database = await openWallpaperDatabase();

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(customWallpaperStoreName, "readwrite");
    transaction.objectStore(customWallpaperStoreName).put(blob, key);
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

async function readCustomWallpaperBlob(key: string) {
  const database = await openWallpaperDatabase();

  return new Promise<Blob | null>((resolve, reject) => {
    const transaction = database.transaction(customWallpaperStoreName, "readonly");
    const request = transaction.objectStore(customWallpaperStoreName).get(key);

    request.onsuccess = () => resolve(request.result instanceof Blob ? request.result : null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
    transaction.onerror = () => {
      database.close();
      reject(transaction.error);
    };
  });
}

async function deleteCustomWallpaperBlob(key: string) {
  const database = await openWallpaperDatabase();

  return new Promise<void>((resolve, reject) => {
    const transaction = database.transaction(customWallpaperStoreName, "readwrite");
    transaction.objectStore(customWallpaperStoreName).delete(key);
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

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = source;
  });
}

async function createStorableWallpaper(file: File) {
  const original = await readFileAsDataUrl(file);
  const image = await loadImage(original);
  const largestSide = Math.max(image.naturalWidth, image.naturalHeight);
  const scale = largestSide > 3840 ? 3840 / largestSide : 1;
  const width = Math.max(1, Math.round(image.naturalWidth * scale));
  const height = Math.max(1, Math.round(image.naturalHeight * scale));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const context = canvas.getContext("2d");
  if (!context) {
    return original;
  }

  context.drawImage(image, 0, 0, width, height);

  for (const quality of [0.96, 0.9, 0.82, 0.72, 0.62, 0.52]) {
    const nextImage = canvas.toDataURL("image/jpeg", quality);
    if (nextImage.length <= maxStoredWallpaperLength) {
      return nextImage;
    }
  }

  return canvas.toDataURL("image/jpeg", 0.45);
}

function openExternal(href: string) {
  window.open(href, "_blank", "noopener,noreferrer");
}

export function HomePage({
  initialCategory = "all",
  initialMode = "web"
}: {
  initialCategory?: CategoryId;
  initialMode?: SearchMode;
}) {
  const router = useRouter();
  const currentUser = useToolboxStore((state) => state.currentUser);
  const savePreferences = useToolboxStore((state) => state.savePreferences);
  const currentUserId = currentUser?.id ?? null;
  const [mode, setMode] = useState<SearchMode>(initialMode);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId>(initialCategory);
  const [engine, setEngine] = useState<SearchEngineId>("bing");
  const [customAiLinks, setCustomAiLinks] = useState<AiLink[]>([]);
  const [aiLinkOrder, setAiLinkOrder] = useState<string[]>([]);
  const [hiddenAiLinkIds, setHiddenAiLinkIds] = useState<string[]>([]);
  const [customWebLinks, setCustomWebLinks] = useState<WebLink[]>([]);
  const [webLinkOrder, setWebLinkOrder] = useState<string[]>([]);
  const [hiddenWebLinkIds, setHiddenWebLinkIds] = useState<string[]>([]);
  const [showAddAi, setShowAddAi] = useState(false);
  const [showAddWeb, setShowAddWeb] = useState(false);
  const [newAiName, setNewAiName] = useState("");
  const [newAiUrl, setNewAiUrl] = useState("");
  const [newWebName, setNewWebName] = useState("");
  const [newWebUrl, setNewWebUrl] = useState("");
  const [wallpaperId, setWallpaperId] = useState("default");
  const [customWallpaper, setCustomWallpaper] = useState("");
  const [showWallpapers, setShowWallpapers] = useState(false);
  const [showEngines, setShowEngines] = useState(false);
  const [isWallpaperUploading, setIsWallpaperUploading] = useState(false);
  const wallpaperPanelRef = useRef<HTMLDivElement>(null);
  const engineMenuRef = useRef<HTMLDivElement>(null);
  const customWallpaperObjectUrlRef = useRef<string | null>(null);
  const isHydratingPreferencesRef = useRef(false);
  const aiLinksKey = getScopedStorageKey(aiLinksStorageKey, currentUserId);
  const aiLinkOrderKey = getScopedStorageKey(aiLinkOrderStorageKey, currentUserId);
  const hiddenAiLinksKey = getScopedStorageKey(hiddenAiLinksStorageKey, currentUserId);
  const webLinksKey = getScopedStorageKey(webLinksStorageKey, currentUserId);
  const webLinkOrderKey = getScopedStorageKey(webLinkOrderStorageKey, currentUserId);
  const hiddenWebLinksKey = getScopedStorageKey(hiddenWebLinksStorageKey, currentUserId);
  const wallpaperKey = getScopedStorageKey(customWallpaperStorageKey, currentUserId);
  const wallpaperIdKey = getScopedStorageKey(customWallpaperIdStorageKey, currentUserId);
  const searchEngineKey = getScopedStorageKey(searchEngineStorageKey, currentUserId);
  const wallpaperBlobKey = getWallpaperBlobKey(currentUserId);

  useEffect(() => {
    setCategory(initialCategory);
    if (initialCategory !== "all") {
      setMode("tools");
    } else {
      setMode(initialMode);
    }
  }, [initialCategory, initialMode]);

  useEffect(() => {
    let disposed = false;

    if (currentUser) {
      const preferences = currentUser.preferences;
      isHydratingPreferencesRef.current = true;
      cacheUserPreferences(currentUser.id, preferences);
      setCustomAiLinks(preferences.customAiLinks ?? []);
      setAiLinkOrder(preferences.aiLinkOrder ?? []);
      setHiddenAiLinkIds(preferences.hiddenAiLinkIds ?? []);
      setCustomWebLinks(preferences.customWebLinks ?? []);
      setWebLinkOrder(preferences.webLinkOrder ?? []);
      setHiddenWebLinkIds(preferences.hiddenWebLinkIds ?? []);
      setWallpaperId(preferences.wallpaperId);
      replaceCustomWallpaper(preferences.customWallpaper);
      setEngine(preferences.searchEngine);
      window.setTimeout(() => {
        isHydratingPreferencesRef.current = false;
      }, 0);

      return () => {
        disposed = true;
      };
    }

    isHydratingPreferencesRef.current = true;
    const savedLinks = window.localStorage.getItem(aiLinksKey);
    const savedAiLinkOrder = readJson<string[]>(aiLinkOrderKey, []);
    const savedHiddenAiLinks = readJson<string[]>(hiddenAiLinksKey, []);
    const savedWebLinks = window.localStorage.getItem(webLinksKey);
    const savedWebLinkOrder = readJson<string[]>(webLinkOrderKey, []);
    const savedHiddenWebLinks = readJson<string[]>(hiddenWebLinksKey, []);
    const savedWallpaper = window.localStorage.getItem(wallpaperKey);
    const savedWallpaperId = window.localStorage.getItem(wallpaperIdKey);
    const savedSearchEngine = window.localStorage.getItem(searchEngineKey) as SearchEngineId | null;

    if (savedLinks) {
      try {
        setCustomAiLinks(JSON.parse(savedLinks) as AiLink[]);
      } catch {
        window.localStorage.removeItem(aiLinksKey);
      }
    } else {
      setCustomAiLinks([]);
    }
    setAiLinkOrder(savedAiLinkOrder);
    setHiddenAiLinkIds(savedHiddenAiLinks);

    if (savedWebLinks) {
      try {
        setCustomWebLinks(JSON.parse(savedWebLinks) as WebLink[]);
      } catch {
        window.localStorage.removeItem(webLinksKey);
      }
    } else {
      setCustomWebLinks([]);
    }
    setWebLinkOrder(savedWebLinkOrder);
    setHiddenWebLinkIds(savedHiddenWebLinks);

    if (savedWallpaperId) {
      setWallpaperId(savedWallpaperId);
    } else {
      setWallpaperId("default");
    }

    if (savedWallpaperId === "custom") {
      readCustomWallpaperBlob(wallpaperBlobKey)
        .then((blob) => {
          if (disposed) {
            return;
          }

          if (blob) {
            replaceCustomWallpaper(URL.createObjectURL(blob));
            return;
          }

          if (savedWallpaper) {
            replaceCustomWallpaper(savedWallpaper);
          }
        })
        .catch(() => {
          if (!disposed && savedWallpaper) {
            replaceCustomWallpaper(savedWallpaper);
          }
        });
    } else if (savedWallpaper) {
      replaceCustomWallpaper(savedWallpaper);
    } else {
      replaceCustomWallpaper("");
    }

    if (savedSearchEngine && searchEngines.some((item) => item.id === savedSearchEngine)) {
      setEngine(savedSearchEngine);
    } else {
      setEngine("bing");
    }
    window.setTimeout(() => {
      isHydratingPreferencesRef.current = false;
    }, 0);

    return () => {
      disposed = true;
    };
  }, [
    aiLinksKey,
    aiLinkOrderKey,
    currentUser,
    hiddenAiLinksKey,
    hiddenWebLinksKey,
    searchEngineKey,
    webLinkOrderKey,
    webLinksKey,
    wallpaperBlobKey,
    wallpaperIdKey,
    wallpaperKey
  ]);

  useEffect(() => {
    return () => {
      if (customWallpaperObjectUrlRef.current) {
        URL.revokeObjectURL(customWallpaperObjectUrlRef.current);
      }
    };
  }, []);

  useEffect(() => {
    safeSetLocalStorage(searchEngineKey, engine);
    if (!isHydratingPreferencesRef.current) {
      savePreferences({ searchEngine: engine }).catch(() => {});
    }
  }, [engine, savePreferences, searchEngineKey]);

  useEffect(() => {
    if (!showWallpapers) {
      return;
    }

    function closeWallpapersOnOutsideClick(event: MouseEvent) {
      const target = event.target;

      if (target instanceof Node && !wallpaperPanelRef.current?.contains(target)) {
        setShowWallpapers(false);
      }
    }

    document.addEventListener("mousedown", closeWallpapersOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeWallpapersOnOutsideClick);
  }, [showWallpapers]);

  useEffect(() => {
    function openWallpapers() {
      setShowWallpapers(true);
    }

    if (window.sessionStorage.getItem("lushifu.openWallpaper") === "1") {
      window.sessionStorage.removeItem("lushifu.openWallpaper");
      setShowWallpapers(true);
    }

    window.addEventListener("lushifu:open-wallpaper", openWallpapers);
    return () => window.removeEventListener("lushifu:open-wallpaper", openWallpapers);
  }, []);

  useEffect(() => {
    if (!showEngines) {
      return;
    }

    function closeEnginesOnOutsideClick(event: MouseEvent) {
      const target = event.target;

      if (target instanceof Node && !engineMenuRef.current?.contains(target)) {
        setShowEngines(false);
      }
    }

    document.addEventListener("mousedown", closeEnginesOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeEnginesOnOutsideClick);
  }, [showEngines]);

  const allAiLinks = useMemo(
    () => mergeLinks(defaultAiLinks, customAiLinks, aiLinkOrder, hiddenAiLinkIds),
    [aiLinkOrder, customAiLinks, hiddenAiLinkIds]
  );
  const allWebLinks = useMemo(
    () => mergeLinks(defaultWebLinks, customWebLinks, webLinkOrder, hiddenWebLinkIds),
    [customWebLinks, hiddenWebLinkIds, webLinkOrder]
  );
  const selectedEngine = searchEngines.find((item) => item.id === engine) ?? searchEngines[0];
  const selectedWallpaper =
    wallpaperId === "custom"
      ? customWallpaper
      : wallpapers.find((wallpaper) => wallpaper.id === wallpaperId)?.image ?? "";

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const categoryMatch = category === "all" || tool.category === category;
      return tool.status === "ready" && categoryMatch && matchesTool(query, tool);
    });
  }, [category, query]);

  const filteredAiLinks = useMemo(() => {
    return allAiLinks.filter((link) => matchesAiLink(query, link));
  }, [allAiLinks, query]);

  const filteredWebLinks = useMemo(() => {
    return allWebLinks.filter((link) => matchesWebLink(query, link));
  }, [allWebLinks, query]);

  const selectedCategory = categories.find((item) => item.id === category)?.name ?? "全部";

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const keyword = query.trim();
    if (!keyword) {
      return;
    }

    if (mode === "web") {
      openExternal(selectedEngine.href(keyword));
      return;
    }

    if (mode === "ai") {
      if (filteredAiLinks.length === 1) {
        openExternal(filteredAiLinks[0].href);
        return;
      }

      return;
    }

    if (mode === "tools") {
      const readyMatches = filteredTools.filter((tool) => tool.status === "ready");
      if (readyMatches.length === 1) {
        router.push(readyMatches[0].href);
        return;
      }
    }
  }

  function addAiLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = newAiName.trim();
    const href = normalizeUrl(newAiUrl);
    if (!name || !href) {
      return;
    }

    const nextLinks = [
      ...customAiLinks,
      {
        id: `custom-${Date.now()}`,
        name,
        href,
        description: "自定义 AI 入口。",
        accent: "from-teal-500/20 to-blue-500/10"
      }
    ];

    setCustomAiLinks(nextLinks);
    window.localStorage.setItem(aiLinksKey, JSON.stringify(nextLinks));
    savePreferences({ customAiLinks: nextLinks }).catch(() => {});
    window.dispatchEvent(new Event("lushifu:ai-links-updated"));
    setNewAiName("");
    setNewAiUrl("");
    setShowAddAi(false);
  }

  function saveAiLinkLayout(order: string[], hiddenIds: string[]) {
    setAiLinkOrder(order);
    setHiddenAiLinkIds(hiddenIds);
    window.localStorage.setItem(aiLinkOrderKey, JSON.stringify(order));
    window.localStorage.setItem(hiddenAiLinksKey, JSON.stringify(hiddenIds));
    savePreferences({ aiLinkOrder: order, hiddenAiLinkIds: hiddenIds }).catch(() => {});
  }

  function saveWebLinkLayout(order: string[], hiddenIds: string[]) {
    setWebLinkOrder(order);
    setHiddenWebLinkIds(hiddenIds);
    window.localStorage.setItem(webLinkOrderKey, JSON.stringify(order));
    window.localStorage.setItem(hiddenWebLinksKey, JSON.stringify(hiddenIds));
    savePreferences({ webLinkOrder: order, hiddenWebLinkIds: hiddenIds }).catch(() => {});
  }

  function handleLinkDragStart(event: DragEvent<HTMLAnchorElement>, id: string) {
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", id);
  }

  function handleLinkDrop(event: DragEvent<HTMLAnchorElement>, kind: LinkKind, targetId: string) {
    event.preventDefault();

    const draggedId = event.dataTransfer.getData("text/plain");
    if (!draggedId || draggedId === targetId) {
      return;
    }

    if (kind === "ai") {
      const currentOrder = allAiLinks.map((link) => link.id);
      saveAiLinkLayout(moveId(currentOrder, draggedId, targetId), hiddenAiLinkIds);
      return;
    }

    const currentOrder = allWebLinks.map((link) => link.id);
    saveWebLinkLayout(moveId(currentOrder, draggedId, targetId), hiddenWebLinkIds);
  }

  function deleteLink(kind: LinkKind, id: string) {
    if (kind === "ai") {
      const nextCustomLinks = customAiLinks.filter((link) => link.id !== id);
      const nextOrder = aiLinkOrder.filter((item) => item !== id);
      const nextHiddenIds = hiddenAiLinkIds.includes(id) ? hiddenAiLinkIds : [...hiddenAiLinkIds, id];

      setCustomAiLinks(nextCustomLinks);
      window.localStorage.setItem(aiLinksKey, JSON.stringify(nextCustomLinks));
      saveAiLinkLayout(nextOrder, nextHiddenIds);
      savePreferences({ customAiLinks: nextCustomLinks }).catch(() => {});
      window.dispatchEvent(new Event("lushifu:ai-links-updated"));
      return;
    }

    const nextCustomLinks = customWebLinks.filter((link) => link.id !== id);
    const nextOrder = webLinkOrder.filter((item) => item !== id);
    const nextHiddenIds = hiddenWebLinkIds.includes(id) ? hiddenWebLinkIds : [...hiddenWebLinkIds, id];

    setCustomWebLinks(nextCustomLinks);
    window.localStorage.setItem(webLinksKey, JSON.stringify(nextCustomLinks));
    saveWebLinkLayout(nextOrder, nextHiddenIds);
    savePreferences({ customWebLinks: nextCustomLinks }).catch(() => {});
  }

  function addWebLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = newWebName.trim();
    const href = normalizeUrl(newWebUrl);
    if (!name || !href) {
      return;
    }

    const nextLinks = [
      ...customWebLinks,
      {
        id: `custom-${Date.now()}`,
        name,
        href,
        description: "自定义常用网站入口。",
        accent: "from-cyan-500/20 to-teal-500/10"
      }
    ];

    setCustomWebLinks(nextLinks);
    window.localStorage.setItem(webLinksKey, JSON.stringify(nextLinks));
    savePreferences({ customWebLinks: nextLinks }).catch(() => {});
    setNewWebName("");
    setNewWebUrl("");
    setShowAddWeb(false);
  }

  function replaceCustomWallpaper(image: string) {
    if (customWallpaperObjectUrlRef.current && customWallpaperObjectUrlRef.current !== image) {
      URL.revokeObjectURL(customWallpaperObjectUrlRef.current);
    }

    customWallpaperObjectUrlRef.current = image.startsWith("blob:") ? image : null;
    setCustomWallpaper(image);
  }

  function selectWallpaper(id: string, image: string, options: { persist?: boolean } = {}) {
    setWallpaperId(id);
    safeSetLocalStorage(wallpaperIdKey, id);

    if (id !== "custom") {
      replaceCustomWallpaper("");
      window.localStorage.removeItem(wallpaperKey);
      deleteCustomWallpaperBlob(wallpaperBlobKey).catch(() => {});
      savePreferences({ wallpaperId: id, customWallpaper: "" }).catch(() => {});
    } else if (image) {
      replaceCustomWallpaper(image);
      if (options.persist !== false && !safeSetLocalStorage(wallpaperKey, image)) {
        window.localStorage.removeItem(wallpaperKey);
      }
      if (options.persist !== false && !image.startsWith("blob:")) {
        savePreferences({ wallpaperId: id, customWallpaper: image }).catch(() => {});
      }
    }
  }

  async function uploadWallpaper(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    event.target.value = "";
    setIsWallpaperUploading(true);

    const previewUrl = URL.createObjectURL(file);
    selectWallpaper("custom", previewUrl, { persist: false });

    try {
      await saveCustomWallpaperBlob(file, wallpaperBlobKey);
    } catch {}

    try {
      let storedImage = "";
      try {
        const originalImage = await readFileAsDataUrl(file);
        if (originalImage.length <= maxStoredWallpaperLength) {
          storedImage = originalImage;
        }
      } catch {}

      if (!storedImage) {
        storedImage = await createStorableWallpaper(file);
      }

      replaceCustomWallpaper(storedImage);
      if (!safeSetLocalStorage(wallpaperKey, storedImage)) {
        window.localStorage.removeItem(wallpaperKey);
      }
      savePreferences({ wallpaperId: "custom", customWallpaper: storedImage }).catch(() => {});
    } finally {
      setIsWallpaperUploading(false);
    }
  }

  return (
    <div className="relative -mx-3 -my-5 min-h-[calc(100vh-4rem)] overflow-hidden px-3 py-6 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-0 bg-background transition-all duration-700",
          selectedWallpaper ? "bg-cover bg-center" : "subtle-grid"
        )}
        style={selectedWallpaper ? { backgroundImage: `url(${selectedWallpaper})` } : undefined}
      />
      {selectedWallpaper ? (
        <div
          className="pointer-events-none fixed inset-0 z-0"
          style={{ backgroundColor: `hsl(var(--background) / ${wallpaperOverlayOpacity / 100})` }}
        />
      ) : null}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_20%_0%,hsl(var(--primary)/0.2),transparent_30rem),radial-gradient(circle_at_80%_10%,rgb(168_85_247/0.16),transparent_28rem),radial-gradient(circle_at_50%_115%,rgb(6_182_212/0.12),transparent_34rem)]" />

      <div className="relative z-10 mx-auto w-full max-w-[1560px] min-w-0">
        <h1 className="sr-only">Lushifu 导航</h1>

        <section className="mx-auto w-full max-w-5xl min-w-0 pt-1 sm:pt-5">
          <div ref={wallpaperPanelRef} className="mb-4 flex flex-col items-center gap-4">
            {showWallpapers ? (
              <WallpaperPanel
                wallpaperId={wallpaperId}
                isUploading={isWallpaperUploading}
                onSelect={selectWallpaper}
                onUpload={uploadWallpaper}
              />
            ) : null}
          </div>

          <div className="relative z-30 min-w-0">
              <form onSubmit={submitSearch} className="relative w-full min-w-0">
                <div className="flex h-16 w-full min-w-0 items-center gap-2 rounded-full border border-border/55 bg-card/88 px-3 shadow-glass backdrop-blur-2xl transition-all hover:border-primary/25 hover:bg-card focus-within:border-primary/45 focus-within:bg-background focus-within:ring-2 focus-within:ring-primary/25 dark:border-cyan-400/15 dark:bg-[#101115]/82 dark:shadow-[0_24px_80px_rgb(0_0_0/0.38),0_0_40px_rgb(34_211_238/0.08)]">
                  {mode === "web" ? (
                    <div ref={engineMenuRef} className="relative z-20 shrink-0">
                      <button
                        type="button"
                        className="cyber-button inline-flex h-10 items-center gap-1.5 rounded-full px-3 text-sm font-semibold text-foreground outline-none transition-all hover:bg-foreground/5 focus-visible:ring-2 focus-visible:ring-primary/25"
                        onClick={() => setShowEngines((value) => !value)}
                        aria-label="选择搜索引擎"
                        aria-expanded={showEngines}
                      >
                        <span>{selectedEngine.name}</span>
                        <ChevronDown
                          className={cn(
                            "h-4 w-4 text-muted-foreground transition-transform duration-200",
                            showEngines && "rotate-180"
                          )}
                        />
                      </button>

                      {showEngines ? (
                        <div className="cyber-panel absolute left-0 top-12 z-50 w-32 overflow-hidden rounded-lg p-1 shadow-glass backdrop-blur-2xl animate-scale-in">
                          {searchEngines.map((item) => {
                            const active = item.id === engine;

                            return (
                              <button
                                key={item.id}
                                type="button"
                                className={cn(
                                  "flex h-9 w-full items-center justify-between rounded-md px-3 text-sm font-medium outline-none transition-colors",
                                  active
                                    ? "bg-primary/10 text-primary"
                                    : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                                )}
                                onClick={() => {
                                  setEngine(item.id);
                                  setShowEngines(false);
                                }}
                              >
                                <span>{item.name}</span>
                                {active ? <Check className="h-4 w-4" /> : null}
                              </button>
                            );
                          })}
                        </div>
                      ) : null}
                    </div>
                  ) : (
                    <Search className="ml-2 h-4 w-4 shrink-0 text-muted-foreground/70" />
                  )}

                  <Input
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    placeholder={
                      mode === "web"
                        ? "输入关键词，回车搜索网页..."
                        : mode === "ai"
                          ? "搜索 AI 工具名称或用途..."
                          : "搜索工具名称、关键词或用途..."
                    }
                    className="h-full min-w-0 flex-1 border-0 bg-transparent px-2 text-base shadow-none outline-none placeholder:text-muted-foreground/70 focus-visible:ring-0"
                  />

                  {query || category !== "all" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-10 w-10 shrink-0 rounded-full text-muted-foreground hover:bg-foreground/5"
                      onClick={() => {
                        setQuery("");
                        setCategory("all");
                      }}
                      aria-label="重置筛选"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  ) : null}

                  <Button
                    type="submit"
                    variant="ghost"
                    size="icon"
                    className="h-11 w-11 shrink-0 rounded-full text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary"
                    aria-label={mode === "web" ? "搜索" : "筛选"}
                  >
                    <Search className="h-5 w-5" />
                  </Button>
                </div>
              </form>

              {mode === "tools" ? (
                <div className="scrollbar-none mt-4 flex max-w-full gap-2 overflow-x-auto pb-1">
                  {categories.map((item) => (
                    <Button
                      key={item.id}
                      type="button"
                      variant={category === item.id ? "default" : "ghost"}
                      size="sm"
                      className={
                        category === item.id
                          ? "teal-gradient shrink-0 rounded-full border-transparent px-4 text-white shadow-sm shadow-teal-500/20"
                          : "shrink-0 rounded-full border border-border/70 bg-card/70 px-4 text-muted-foreground backdrop-blur-xl hover:bg-card hover:text-foreground"
                      }
                      onClick={() => setCategory(item.id)}
                    >
                      {item.name}
                    </Button>
                  ))}
                </div>
              ) : null}
          </div>
        </section>

        {mode === "web" ? (
          <section className="mt-8 sm:mt-10">
            {showAddWeb ? (
              <form
                onSubmit={addWebLink}
                className="cyber-panel mb-4 grid gap-3 rounded-lg p-4 md:grid-cols-[1fr_1.6fr_auto]"
              >
                <Input
                  value={newWebName}
                  onChange={(event) => setNewWebName(event.target.value)}
                  placeholder="名称，例如：我的网站"
                  className="h-11 bg-background/80"
                />
                <Input
                  value={newWebUrl}
                  onChange={(event) => setNewWebUrl(event.target.value)}
                  placeholder="网址，例如：https://example.com"
                  className="h-11 bg-background/80"
                />
                <Button type="submit" className="h-11">
                  <Plus className="mr-2 h-4 w-4" />
                  添加
                </Button>
              </form>
            ) : null}

            <div className="ai-card-grid w-full min-w-0">
              {filteredWebLinks.map((link) => (
                <LinkCard
                  key={link.id}
                  link={link}
                  fallbackIcon={Globe2}
                  kind="web"
                  onDragStart={handleLinkDragStart}
                  onDrop={handleLinkDrop}
                  onDelete={deleteLink}
                />
              ))}
              <AddLinkCard label="添加网站" onClick={() => setShowAddWeb((value) => !value)} />
            </div>
          </section>
        ) : null}

        {mode === "ai" ? (
          <section className="mt-8 sm:mt-10">
            {showAddAi ? (
              <form
                onSubmit={addAiLink}
                className="cyber-panel mb-4 grid gap-3 rounded-lg p-4 md:grid-cols-[1fr_1.6fr_auto]"
              >
                <Input
                  value={newAiName}
                  onChange={(event) => setNewAiName(event.target.value)}
                  placeholder="名称，例如：我的 AI"
                  className="h-11 bg-background/80"
                />
                <Input
                  value={newAiUrl}
                  onChange={(event) => setNewAiUrl(event.target.value)}
                  placeholder="网址，例如：https://example.com"
                  className="h-11 bg-background/80"
                />
                <Button type="submit" className="h-11">
                  <Plus className="mr-2 h-4 w-4" />
                  添加
                </Button>
              </form>
            ) : null}

            <div className="ai-card-grid w-full min-w-0">
              {filteredAiLinks.map((link) => (
                <LinkCard
                  key={link.id}
                  link={link}
                  fallbackIcon={Bot}
                  kind="ai"
                  onDragStart={handleLinkDragStart}
                  onDrop={handleLinkDrop}
                  onDelete={deleteLink}
                />
              ))}
              <AddLinkCard label="添加 AI" onClick={() => setShowAddAi((value) => !value)} />
            </div>
          </section>
        ) : null}

        {mode === "tools" ? (
          <section className="mt-8 sm:mt-10">
            <SectionHeader
              title="工具导航"
              description={`当前显示 ${filteredTools.length} 个可用工具。`}
              action={
            <span className="cyber-panel w-fit rounded-full px-3 py-1 text-sm font-medium text-muted-foreground">
                  {selectedCategory}
                </span>
              }
            />

            {filteredTools.length > 0 ? (
              <div className="grid w-full min-w-0 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {filteredTools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            ) : (
              <EmptyState
                title="没有找到匹配的工具"
                description="可以尝试更短的关键词，或切换到其他分类。"
                actionLabel="重置筛选"
                onAction={() => {
                  setQuery("");
                  setCategory("all");
                }}
              />
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  action
}: {
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-col gap-3 px-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-foreground/95">{title}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      {action}
    </div>
  );
}

function LinkCard({
  link,
  fallbackIcon: Icon,
  kind,
  onDragStart,
  onDrop,
  onDelete
}: {
  link: AiLink | WebLink;
  fallbackIcon: typeof Search;
  kind: LinkKind;
  onDragStart: (event: DragEvent<HTMLAnchorElement>, id: string) => void;
  onDrop: (event: DragEvent<HTMLAnchorElement>, kind: LinkKind, targetId: string) => void;
  onDelete: (kind: LinkKind, id: string) => void;
}) {
  const logo = link.logo ?? getFaviconUrl(link.href);

  return (
    <a
      href={link.href}
      target="_blank"
      rel="noreferrer"
      draggable
      onDragStart={(event) => onDragStart(event, link.id)}
      onDragOver={(event) => event.preventDefault()}
      onDrop={(event) => onDrop(event, kind, link.id)}
      onContextMenu={(event) => {
        event.preventDefault();
        onDelete(kind, link.id);
      }}
      title="拖动可调整位置，右键可删除"
      className={cn(
        "ai-link-card cyber-glow group relative flex min-h-[108px] cursor-grab items-center gap-3.5 overflow-hidden rounded-lg p-4 focus-ring active:cursor-grabbing",
        "bg-gradient-to-br",
        link.accent
      )}
    >
      <div className="absolute inset-0 bg-card/72 backdrop-blur-xl transition-colors duration-300 group-hover:bg-card/62 dark:bg-[#121214]/76 dark:group-hover:bg-[#121214]/66" />
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-lg border border-border/60 bg-background/90 text-primary shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:border-primary/30 group-hover:shadow-md">
        <Icon className="h-4 w-4" />
        {logo ? (
          <span
            className="absolute inset-0 bg-background bg-[length:66%_66%] bg-center bg-no-repeat"
            style={{ backgroundImage: `url(${logo})` }}
            aria-hidden="true"
          />
        ) : null}
      </div>
      <div className="relative min-w-0 flex-1">
        <h3 className="truncate text-[15px] font-bold tracking-tight text-foreground/95">{link.name}</h3>
        <p className="mt-1.5 line-clamp-2 text-sm leading-6 text-muted-foreground">{link.description}</p>
      </div>
    </a>
  );
}

function AddLinkCard({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      className={cn(
        "ai-link-card cyber-glow group relative flex min-h-[108px] items-center gap-3.5 overflow-hidden rounded-lg p-4 text-left focus-ring",
        "bg-gradient-to-br from-teal-500/20 to-cyan-500/10"
      )}
      onClick={onClick}
    >
      <div className="absolute inset-0 bg-card/72 backdrop-blur-xl transition-colors duration-300 group-hover:bg-card/62 dark:bg-[#121214]/76 dark:group-hover:bg-[#121214]/66" />
      <div className="relative flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-border/60 bg-background/90 text-primary shadow-sm transition-all duration-300 group-hover:scale-105 group-hover:border-primary/30 group-hover:shadow-md">
        <Plus className="h-5 w-5" />
      </div>
      <div className="relative min-w-0 flex-1">
        <h3 className="text-[15px] font-bold tracking-tight text-foreground/95">{label}</h3>
        <p className="mt-1.5 text-sm leading-6 text-muted-foreground">添加一个自定义入口。</p>
      </div>
    </button>
  );
}

function WallpaperPanel({
  wallpaperId,
  isUploading,
  onSelect,
  onUpload
}: {
  wallpaperId: string;
  isUploading: boolean;
  onSelect: (id: string, image: string) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="cyber-panel w-full rounded-lg p-4 animate-fade-up">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h2 className="font-semibold tracking-tight">壁纸</h2>
          <p className="mt-1 text-sm text-muted-foreground">选择背景，或上传一张本地图片。</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {wallpapers.map((wallpaper) => (
          <button
            key={wallpaper.id}
            type="button"
            className="group text-left focus-ring rounded-lg"
            onClick={() => onSelect(wallpaper.id, wallpaper.image)}
          >
            <div
              className={cn(
                "relative aspect-[3/2] overflow-hidden rounded-lg border bg-muted shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-cyan-400/60 group-hover:shadow-[0_0_24px_rgb(34_211_238/0.18)]",
                wallpaperId === wallpaper.id && "border-primary ring-2 ring-primary/30 shadow-[0_0_26px_hsl(var(--primary)/0.24)]"
              )}
              style={
                wallpaper.image
                  ? {
                      backgroundImage: `url(${wallpaper.preview ?? wallpaper.image})`,
                      backgroundSize: "cover",
                      backgroundPosition: "center"
                    }
                  : undefined
              }
            >
              {!wallpaper.image ? (
                <div className="h-full w-full bg-[linear-gradient(45deg,hsl(var(--muted))_25%,transparent_25%),linear-gradient(-45deg,hsl(var(--muted))_25%,transparent_25%),linear-gradient(45deg,transparent_75%,hsl(var(--muted))_75%),linear-gradient(-45deg,transparent_75%,hsl(var(--muted))_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0]" />
              ) : null}
              <div className="absolute inset-0 bg-gradient-to-t from-black/35 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
              {wallpaperId === wallpaper.id ? (
                <CheckCircle2 className="absolute right-2 top-2 h-5 w-5 rounded-full bg-primary text-primary-foreground" />
              ) : null}
            </div>
            <div className="mt-2 text-center text-sm font-medium text-muted-foreground">
              {wallpaper.name}
            </div>
          </button>
        ))}
        <label className="group cursor-pointer text-left">
          <div
            className={cn(
              "flex aspect-[3/2] items-center justify-center rounded-lg border border-dashed bg-muted/70 text-muted-foreground shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:bg-card group-hover:text-primary group-hover:shadow-[0_0_24px_hsl(var(--primary)/0.16)]",
              wallpaperId === "custom" && "border-primary ring-2 ring-primary/30"
            )}
          >
            {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
          </div>
          <div className="mt-2 text-center text-sm font-medium text-muted-foreground">上传图片</div>
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={isUploading} />
        </label>
      </div>
    </div>
  );
}

function EmptyState({
  title,
  description,
  actionLabel,
  onAction
}: {
  title: string;
  description: string;
  actionLabel: string;
  onAction: () => void;
}) {
  return (
    <div className="cyber-panel flex min-h-64 flex-col items-center justify-center rounded-lg border-dashed p-10 text-center">
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-lg border border-border/70 bg-background/75 text-primary shadow-sm">
        <Search className="h-5 w-5" />
      </div>
      <h3 className="font-semibold tracking-tight">{title}</h3>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">{description}</p>
      <Button type="button" className="mt-5 rounded-full" onClick={onAction}>
        {actionLabel}
      </Button>
    </div>
  );
}
