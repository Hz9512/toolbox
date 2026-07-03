"use client";

import {
  ChangeEvent,
  type CSSProperties,
  FormEvent,
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState
} from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Check,
  ChevronDown,
  Command,
  ExternalLink,
  Globe2,
  Loader2,
  Plus,
  RotateCcw,
  Search,
  Upload,
  Wallpaper
} from "lucide-react";
import { toast } from "sonner";

import { ToolCard } from "@/components/tool-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { aiLinksStorageKey, defaultAiLinks, type AiLink } from "@/lib/ai-links";
import { categories, CategoryId, tools } from "@/lib/tools";
import { cn } from "@/lib/utils";

type SearchMode = "web" | "ai" | "tools";
type SearchEngineId = "bing" | "baidu" | "sogou";

type WallpaperItem = {
  id: string;
  name: string;
  image: string;
};

const customWallpaperStorageKey = "lushifu.wallpaper";
const customWallpaperIdStorageKey = "lushifu.wallpaperId";
const wallpaperOpacityStorageKey = "lushifu.wallpaperOpacity";
const maxStoredWallpaperLength = 3_500_000;
const defaultWallpaperOpacity = 60;

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
      "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=2400&q=85"
  },
  {
    id: "mountain",
    name: "山脊",
    image:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2400&q=85"
  },
  {
    id: "ocean",
    name: "海岸",
    image:
      "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=2400&q=85"
  },
  {
    id: "night",
    name: "星空",
    image:
      "https://images.unsplash.com/photo-1519681393784-d120267933ba?auto=format&fit=crop&w=2400&q=85"
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

function normalizeUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

function safeSetLocalStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
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
  const scale = largestSide > 1920 ? 1920 / largestSide : 1;
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

  for (const quality of [0.82, 0.72, 0.62, 0.52]) {
    const nextImage = canvas.toDataURL("image/jpeg", quality);
    if (nextImage.length <= maxStoredWallpaperLength) {
      return nextImage;
    }
  }

  return canvas.toDataURL("image/jpeg", 0.45);
}

function openCommandMenu() {
  window.dispatchEvent(new Event("lushifu:open-command"));
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
  const [mode, setMode] = useState<SearchMode>(initialMode);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId>(initialCategory);
  const [engine, setEngine] = useState<SearchEngineId>("bing");
  const [customAiLinks, setCustomAiLinks] = useState<AiLink[]>([]);
  const [showAddAi, setShowAddAi] = useState(false);
  const [newAiName, setNewAiName] = useState("");
  const [newAiUrl, setNewAiUrl] = useState("");
  const [wallpaperId, setWallpaperId] = useState("default");
  const [customWallpaper, setCustomWallpaper] = useState("");
  const [wallpaperOpacity, setWallpaperOpacity] = useState(defaultWallpaperOpacity);
  const [showWallpapers, setShowWallpapers] = useState(false);
  const [showEngines, setShowEngines] = useState(false);
  const [isWallpaperUploading, setIsWallpaperUploading] = useState(false);
  const wallpaperPanelRef = useRef<HTMLDivElement>(null);
  const engineMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCategory(initialCategory);
    if (initialCategory !== "all") {
      setMode("tools");
    } else {
      setMode(initialMode);
    }
  }, [initialCategory, initialMode]);

  useEffect(() => {
    const savedLinks = window.localStorage.getItem(aiLinksStorageKey);
    const savedWallpaper = window.localStorage.getItem(customWallpaperStorageKey);
    const savedWallpaperId = window.localStorage.getItem(customWallpaperIdStorageKey);
    const savedWallpaperOpacity = window.localStorage.getItem(wallpaperOpacityStorageKey);

    if (savedLinks) {
      try {
        setCustomAiLinks(JSON.parse(savedLinks) as AiLink[]);
      } catch {
        window.localStorage.removeItem(aiLinksStorageKey);
      }
    }

    if (savedWallpaper) {
      setCustomWallpaper(savedWallpaper);
    }

    if (savedWallpaperId) {
      setWallpaperId(savedWallpaperId);
    }

    if (savedWallpaperOpacity) {
      const opacity = Number(savedWallpaperOpacity);
      if (Number.isFinite(opacity)) {
        setWallpaperOpacity(Math.min(85, Math.max(15, opacity)));
      }
    }
  }, []);

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

  const allAiLinks = useMemo(() => [...defaultAiLinks, ...customAiLinks], [customAiLinks]);
  const selectedEngine = searchEngines.find((item) => item.id === engine) ?? searchEngines[0];
  const selectedWallpaper =
    wallpaperId === "custom"
      ? customWallpaper
      : wallpapers.find((wallpaper) => wallpaper.id === wallpaperId)?.image ?? "";

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const categoryMatch = category === "all" || tool.category === category;
      return categoryMatch && matchesTool(query, tool);
    });
  }, [category, query]);

  const filteredAiLinks = useMemo(() => {
    return allAiLinks.filter((link) => matchesAiLink(query, link));
  }, [allAiLinks, query]);

  const readyCount = filteredTools.filter((tool) => tool.status === "ready").length;
  const selectedCategory = categories.find((item) => item.id === category)?.name ?? "全部";

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const keyword = query.trim();
    if (!keyword) {
      toast.info("先输入关键词", {
        description: mode === "web" ? "输入后按回车即可搜索网页。" : "也可以用 Cmd/Ctrl + K 打开全局搜索。"
      });
      return;
    }

    if (mode === "web") {
      openExternal(selectedEngine.href(keyword));
      toast.message("已打开网页搜索", { description: `${selectedEngine.name} · ${keyword}` });
      return;
    }

    if (mode === "ai") {
      if (filteredAiLinks.length === 1) {
        openExternal(filteredAiLinks[0].href);
        return;
      }

      toast.info("已筛选 AI 入口", { description: `找到 ${filteredAiLinks.length} 个匹配项。` });
      return;
    }

    if (mode === "tools") {
      const readyMatches = filteredTools.filter((tool) => tool.status === "ready");
      if (readyMatches.length === 1) {
        router.push(readyMatches[0].href);
        return;
      }

      toast.info("已筛选工具", { description: `找到 ${filteredTools.length} 个匹配项。` });
    }
  }

  function addAiLink(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const name = newAiName.trim();
    const href = normalizeUrl(newAiUrl);
    if (!name || !href) {
      toast.error("请填写 AI 名称和网址");
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
    window.localStorage.setItem(aiLinksStorageKey, JSON.stringify(nextLinks));
    window.dispatchEvent(new Event("lushifu:ai-links-updated"));
    setNewAiName("");
    setNewAiUrl("");
    setShowAddAi(false);
    toast.success("已添加 AI 入口", { description: name });
  }

  function selectWallpaper(id: string, image: string) {
    setWallpaperId(id);
    safeSetLocalStorage(customWallpaperIdStorageKey, id);

    if (id !== "custom") {
      setCustomWallpaper("");
      window.localStorage.removeItem(customWallpaperStorageKey);
    } else if (image) {
      setCustomWallpaper(image);
      if (!safeSetLocalStorage(customWallpaperStorageKey, image)) {
        window.localStorage.removeItem(customWallpaperStorageKey);
        toast.warning("壁纸已应用，但文件过大，无法长期保存到本地。");
      }
    }

    toast.success("壁纸已更新", {
      description: wallpapers.find((wallpaper) => wallpaper.id === id)?.name ?? "自定义"
    });
  }

  function updateWallpaperOpacity(value: number) {
    const nextOpacity = Math.min(85, Math.max(15, value));
    setWallpaperOpacity(nextOpacity);
    safeSetLocalStorage(wallpaperOpacityStorageKey, String(nextOpacity));
  }

  async function uploadWallpaper(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    event.target.value = "";
    setIsWallpaperUploading(true);

    try {
      const image = await createStorableWallpaper(file);
      selectWallpaper("custom", image);
    } catch {
      try {
        const image = await readFileAsDataUrl(file);
        selectWallpaper("custom", image);
      } catch {
        toast.error("壁纸上传失败", { description: "请换一张图片再试。" });
      }
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
          className="pointer-events-none fixed inset-0 z-0 backdrop-blur-[2px] transition-colors duration-300"
          style={{ backgroundColor: `hsl(var(--background) / ${wallpaperOpacity / 100})` }}
        />
      ) : null}
      <div className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(circle_at_20%_0%,hsl(var(--primary)/0.18),transparent_30rem),radial-gradient(circle_at_80%_10%,rgb(99_102_241/0.13),transparent_28rem)]" />

      <div className="relative z-10 mx-auto w-full max-w-[1560px] min-w-0">
        <h1 className="sr-only">Lushifu 导航</h1>

        <section className="mx-auto w-full max-w-6xl min-w-0 pt-1 sm:pt-5">
          <div ref={wallpaperPanelRef} className="mb-4 flex flex-col items-center gap-4">
            <div className="flex w-full justify-end">
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full bg-card/75 shadow-sm backdrop-blur-xl"
                  onClick={openCommandMenu}
                >
                  <Command className="mr-2 h-4 w-4" />
                  <span>全局搜索</span>
                  <kbd className="ml-2 rounded border bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
                    ⌘K
                  </kbd>
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="rounded-full bg-card/75 shadow-sm backdrop-blur-xl"
                  onClick={() => setShowWallpapers((value) => !value)}
                >
                  <Wallpaper className="mr-2 h-4 w-4" />
                  壁纸
                </Button>
              </div>
            </div>

            {showWallpapers ? (
              <WallpaperPanel
                wallpaperId={wallpaperId}
                wallpaperOpacity={wallpaperOpacity}
                isUploading={isWallpaperUploading}
                onSelect={selectWallpaper}
                onOpacityChange={updateWallpaperOpacity}
                onUpload={uploadWallpaper}
              />
            ) : null}
          </div>

          <div className="relative min-w-0">
              <form
                onSubmit={submitSearch}
                className="relative flex w-full min-w-0 flex-col gap-3 lg:flex-row lg:items-center"
              >
                <div className="relative min-w-0 flex-1">
                  <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
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
                    className={cn(
                      "h-16 rounded-full border border-border/55 bg-card/88 pl-11 text-base shadow-glass backdrop-blur-2xl transition-all placeholder:text-muted-foreground/70 hover:bg-card focus-visible:border-primary/40 focus-visible:bg-background focus-visible:ring-primary/25",
                      mode === "web" ? "pr-32" : "pr-12"
                    )}
                  />
                  {query || category !== "all" ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className={cn(
                        "absolute top-1/2 h-9 w-9 -translate-y-1/2 rounded-full text-muted-foreground hover:bg-foreground/5",
                        mode === "web" ? "right-24" : "right-2"
                      )}
                      onClick={() => {
                        setQuery("");
                        setCategory("all");
                      }}
                      aria-label="重置筛选"
                    >
                      <RotateCcw className="h-4 w-4" />
                    </Button>
                  ) : null}

                  {mode === "web" ? (
                    <div
                      ref={engineMenuRef}
                      className="absolute right-2 top-1/2 z-20 -translate-y-1/2"
                    >
                      <button
                        type="button"
                        className="inline-flex h-10 items-center gap-2 rounded-full border border-border/70 bg-background/90 px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition-all hover:border-primary/35 hover:bg-card focus-visible:ring-2 focus-visible:ring-primary/25"
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
                        <div className="absolute right-0 top-12 w-32 overflow-hidden rounded-lg border border-border/70 bg-card/95 p-1 shadow-glass backdrop-blur-2xl animate-scale-in">
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
                  ) : null}
                </div>

                <Button
                  type="submit"
                  className="teal-gradient h-14 rounded-full px-6 text-white shadow-glow lg:h-16"
                >
                  <span>{mode === "web" ? "搜索" : "筛选"}</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
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

        {mode === "ai" ? (
          <section className="mt-8 sm:mt-10">
            <SectionHeader
              title="AI 导航"
              description={`当前显示 ${filteredAiLinks.length} 个 AI 入口，可直接打开常用助手。`}
              action={
                <Button
                  type="button"
                  size="sm"
                  className="teal-gradient w-fit rounded-full text-white shadow-sm shadow-teal-500/20"
                  onClick={() => setShowAddAi((value) => !value)}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  添加
                </Button>
              }
            />

            {showAddAi ? (
              <form
                onSubmit={addAiLink}
                className="mb-4 grid gap-3 rounded-lg border border-border/65 bg-card/80 p-4 shadow-xl shadow-slate-900/10 backdrop-blur-2xl md:grid-cols-[1fr_1.6fr_auto]"
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

            {filteredAiLinks.length > 0 ? (
              <div className="grid w-full min-w-0 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {filteredAiLinks.map((link) => (
                  <AiCard key={link.id} link={link} />
                ))}
                <button
                  type="button"
                  className="glass-panel group flex min-h-[184px] flex-col items-center justify-center rounded-lg border-dashed p-4 text-muted-foreground transition-all duration-300 hover:-translate-y-1 hover:border-primary/40 hover:text-foreground hover:shadow-glass"
                  onClick={() => setShowAddAi(true)}
                >
                  <Plus className="mb-3 h-7 w-7 transition-transform group-hover:scale-110" />
                  <span className="font-semibold">添加 AI 入口</span>
                </button>
              </div>
            ) : (
              <EmptyState
                title="没有匹配的 AI 入口"
                description="换一个关键词试试，或添加一个新的自定义入口。"
                actionLabel="添加 AI"
                onAction={() => setShowAddAi(true)}
              />
            )}
          </section>
        ) : null}

        {mode === "tools" ? (
          <section className="mt-8 sm:mt-10">
            <SectionHeader
              title="工具导航"
              description={`当前显示 ${filteredTools.length} 个工具，其中 ${readyCount} 个可直接打开使用。`}
              action={
                <span className="w-fit rounded-full border border-border/70 bg-card/80 px-3 py-1 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur-xl">
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

function AiCard({ link }: { link: AiLink }) {
  return (
    <a
      href={link.href}
      target="_blank"
      rel="noreferrer"
      className={cn(
        "card-shine surface-noise group relative flex flex-col overflow-hidden rounded-lg border border-border/65 bg-card/80 p-4 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-1 hover:border-primary/35 hover:shadow-glass",
        "bg-gradient-to-br",
        link.accent,
        "min-h-[184px]"
      )}
    >
      <div className="absolute -right-12 -top-12 h-28 w-28 rounded-full bg-background/45 blur-2xl transition-transform duration-500 group-hover:scale-125" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-lg border border-border/70 bg-background/80 text-primary shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:border-primary/35 group-hover:bg-primary group-hover:text-primary-foreground">
          <Bot className="h-5 w-5" />
        </div>
        <ExternalLink className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-primary" />
      </div>
      <div className="relative mt-4 flex-1">
        <h3 className="text-lg font-semibold tracking-tight">{link.name}</h3>
        <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{link.description}</p>
      </div>
      <div className="relative mt-4 text-xs font-medium text-primary">打开 {link.name}</div>
    </a>
  );
}

function WallpaperPanel({
  wallpaperId,
  wallpaperOpacity,
  isUploading,
  onSelect,
  onOpacityChange,
  onUpload
}: {
  wallpaperId: string;
  wallpaperOpacity: number;
  isUploading: boolean;
  onSelect: (id: string, image: string) => void;
  onOpacityChange: (value: number) => void;
  onUpload: (event: ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="glass-panel-strong w-full rounded-lg p-4 animate-fade-up">
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
                "relative aspect-[3/2] overflow-hidden rounded-lg border bg-muted shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg",
                wallpaperId === wallpaper.id && "border-primary ring-2 ring-primary/30"
              )}
              style={
                wallpaper.image
                  ? {
                      backgroundImage: `url(${wallpaper.image})`,
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
              "flex aspect-[3/2] items-center justify-center rounded-lg border border-dashed bg-muted/70 text-muted-foreground shadow-sm transition-all duration-300 group-hover:-translate-y-1 group-hover:border-primary/40 group-hover:bg-card group-hover:text-primary group-hover:shadow-lg",
              wallpaperId === "custom" && "border-primary ring-2 ring-primary/30"
            )}
          >
            {isUploading ? <Loader2 className="h-6 w-6 animate-spin" /> : <Upload className="h-6 w-6" />}
          </div>
          <div className="mt-2 text-center text-sm font-medium text-muted-foreground">上传图片</div>
          <input type="file" accept="image/*" className="hidden" onChange={onUpload} disabled={isUploading} />
        </label>
      </div>
      <div className="mt-5 rounded-lg border border-border/65 bg-background/55 p-4 shadow-inner">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-sm font-medium text-foreground">
            <Wallpaper className="h-4 w-4 text-primary" />
            <span>壁纸透明度</span>
          </div>
          <span className="rounded-full border border-border/70 bg-card/80 px-2.5 py-1 text-xs font-semibold text-muted-foreground">
            {wallpaperOpacity}%
          </span>
        </div>
        <input
          type="range"
          min={15}
          max={85}
          step={5}
          value={wallpaperOpacity}
          onChange={(event) => onOpacityChange(Number(event.target.value))}
          className="h-2 w-full cursor-pointer appearance-none rounded-full bg-muted accent-primary outline-none [background:linear-gradient(90deg,hsl(var(--primary))_var(--wallpaper-opacity),hsl(var(--muted))_var(--wallpaper-opacity))] [&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-primary [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-primary [&::-webkit-slider-thumb]:shadow-md"
          style={{ "--wallpaper-opacity": `${((wallpaperOpacity - 15) / 70) * 100}%` } as CSSProperties}
          aria-label="壁纸透明度"
        />
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
    <div className="glass-panel flex min-h-64 flex-col items-center justify-center rounded-lg border-dashed p-10 text-center">
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
