"use client";

import { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import {
  Bot,
  CheckCircle2,
  Compass,
  ExternalLink,
  Globe2,
  ImageIcon,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Upload,
  Wrench
} from "lucide-react";

import { ToolCard } from "@/components/tool-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories, CategoryId, tools } from "@/lib/tools";
import { cn } from "@/lib/utils";

type SearchMode = "web" | "ai" | "tools";
type SearchEngineId = "bing" | "baidu" | "sogou";

type AiLink = {
  id: string;
  name: string;
  description: string;
  href: string;
  accent: string;
};

type Wallpaper = {
  id: string;
  name: string;
  image: string;
};

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

const defaultAiLinks: AiLink[] = [
  {
    id: "chatgpt",
    name: "ChatGPT",
    description: "通用对话、写作、代码和多模态助手。",
    href: "https://chatgpt.com/",
    accent: "from-emerald-500/18 to-cyan-500/10"
  },
  {
    id: "claude",
    name: "Claude",
    description: "长文分析、写作润色和复杂推理。",
    href: "https://claude.ai/",
    accent: "from-orange-500/18 to-rose-500/10"
  },
  {
    id: "gemini",
    name: "Gemini",
    description: "Google AI 助手，适合资料整理与跨产品协作。",
    href: "https://gemini.google.com/",
    accent: "from-blue-500/18 to-violet-500/10"
  },
  {
    id: "perplexity",
    name: "Perplexity",
    description: "带来源的 AI 搜索与研究问答。",
    href: "https://www.perplexity.ai/",
    accent: "from-sky-500/18 to-teal-500/10"
  },
  {
    id: "copilot",
    name: "Copilot",
    description: "微软 AI 助手，适合搜索、办公和创作。",
    href: "https://copilot.microsoft.com/",
    accent: "from-indigo-500/18 to-cyan-500/10"
  },
  {
    id: "deepseek",
    name: "DeepSeek",
    description: "中文与代码推理体验都很顺手。",
    href: "https://chat.deepseek.com/",
    accent: "from-slate-500/18 to-blue-500/10"
  },
  {
    id: "doubao",
    name: "豆包",
    description: "中文聊天、写作、图片理解和日常助手。",
    href: "https://www.doubao.com/",
    accent: "from-pink-500/18 to-orange-500/10"
  },
  {
    id: "kimi",
    name: "Kimi",
    description: "长文档阅读、总结和中文信息处理。",
    href: "https://www.kimi.com/",
    accent: "from-violet-500/18 to-blue-500/10"
  }
];

const wallpapers: Wallpaper[] = [
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
    name: "山脉",
    image:
      "https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?auto=format&fit=crop&w=2400&q=85"
  },
  {
    id: "ocean",
    name: "海洋",
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

  return [link.name, link.description, link.href]
    .join(" ")
    .toLowerCase()
    .includes(normalized);
}

function normalizeUrl(url: string) {
  const trimmed = url.trim();
  if (!trimmed) return "";

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

export function HomePage({
  initialCategory = "all",
  initialMode = "web"
}: {
  initialCategory?: CategoryId;
  initialMode?: SearchMode;
}) {
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
  const [showWallpapers, setShowWallpapers] = useState(false);
  const wallpaperPanelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setCategory(initialCategory);
    if (initialCategory !== "all") {
      setMode("tools");
    } else {
      setMode(initialMode);
    }
  }, [initialCategory, initialMode]);

  useEffect(() => {
    const savedLinks = window.localStorage.getItem("lushifu.aiLinks");
    const savedWallpaper = window.localStorage.getItem("lushifu.wallpaper");
    const savedWallpaperId = window.localStorage.getItem("lushifu.wallpaperId");

    if (savedLinks) {
      try {
        setCustomAiLinks(JSON.parse(savedLinks) as AiLink[]);
      } catch {
        window.localStorage.removeItem("lushifu.aiLinks");
      }
    }

    if (savedWallpaper) {
      setCustomWallpaper(savedWallpaper);
    }

    if (savedWallpaperId) {
      setWallpaperId(savedWallpaperId);
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
      return;
    }

    if (mode === "web") {
      window.open(selectedEngine.href(keyword), "_blank", "noopener,noreferrer");
      return;
    }

    if (mode === "ai" && filteredAiLinks.length === 1) {
      window.open(filteredAiLinks[0].href, "_blank", "noopener,noreferrer");
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
        accent: "from-teal-500/18 to-blue-500/10"
      }
    ];

    setCustomAiLinks(nextLinks);
    window.localStorage.setItem("lushifu.aiLinks", JSON.stringify(nextLinks));
    setNewAiName("");
    setNewAiUrl("");
    setShowAddAi(false);
  }

  function selectWallpaper(id: string, image: string) {
    setWallpaperId(id);
    window.localStorage.setItem("lushifu.wallpaperId", id);

    if (id !== "custom") {
      setCustomWallpaper("");
      window.localStorage.removeItem("lushifu.wallpaper");
    } else if (image) {
      setCustomWallpaper(image);
      window.localStorage.setItem("lushifu.wallpaper", image);
    }
  }

  function uploadWallpaper(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    const reader = new FileReader();
    reader.onload = () => selectWallpaper("custom", String(reader.result));
    reader.readAsDataURL(file);
    event.target.value = "";
  }

  return (
    <div className="relative -mx-3 -my-8 min-h-[calc(100vh-4rem)] overflow-hidden px-3 py-8 sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
      <div
        className={cn(
          "pointer-events-none fixed inset-0 z-0 bg-background transition-all duration-500",
          selectedWallpaper ? "bg-cover bg-center" : "subtle-grid"
        )}
        style={selectedWallpaper ? { backgroundImage: `url(${selectedWallpaper})` } : undefined}
      />
      {selectedWallpaper ? <div className="pointer-events-none fixed inset-0 z-0 bg-background/44 backdrop-blur-[1px]" /> : null}

      <div className="relative z-10 mx-auto w-full max-w-[1560px] min-w-0">
        <h1 className="sr-only">Lushifu 导航</h1>

        <section className="mx-auto w-full max-w-5xl min-w-0 pt-2 sm:pt-5">
          <div ref={wallpaperPanelRef} className="mb-4 flex flex-col items-center gap-4">
            <div className="flex flex-wrap items-center justify-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/20 bg-card/75 px-3 py-1 text-sm font-medium text-teal-700 shadow-sm backdrop-blur-xl dark:text-teal-200">
                <Sparkles className="h-4 w-4" />
                Lushifu 工作台
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="rounded-full bg-card/75 shadow-sm backdrop-blur-xl"
                onClick={() => setShowWallpapers((value) => !value)}
              >
                <ImageIcon className="mr-2 h-4 w-4" />
                更换壁纸
              </Button>
            </div>

            {showWallpapers ? (
              <div className="w-full rounded-lg border border-border/70 bg-card/90 p-4 shadow-xl shadow-slate-900/10 backdrop-blur-2xl">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-semibold tracking-tight">壁纸</h2>
                    <p className="text-sm text-muted-foreground">选择一张背景，或上传你自己的图片。</p>
                  </div>
                </div>
                <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {wallpapers.map((wallpaper) => (
                    <button
                      key={wallpaper.id}
                      type="button"
                      className="group text-left"
                      onClick={() => selectWallpaper(wallpaper.id, wallpaper.image)}
                    >
                      <div
                        className={cn(
                          "relative aspect-[3/2] overflow-hidden rounded-lg border bg-muted shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:shadow-lg",
                          wallpaperId === wallpaper.id && "border-primary ring-2 ring-primary/30"
                        )}
                        style={wallpaper.image ? { backgroundImage: `url(${wallpaper.image})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
                      >
                        {!wallpaper.image ? <div className="h-full w-full bg-[linear-gradient(45deg,hsl(var(--muted))_25%,transparent_25%),linear-gradient(-45deg,hsl(var(--muted))_25%,transparent_25%),linear-gradient(45deg,transparent_75%,hsl(var(--muted))_75%),linear-gradient(-45deg,transparent_75%,hsl(var(--muted))_75%)] bg-[length:24px_24px] bg-[position:0_0,0_12px,12px_-12px,-12px_0]" /> : null}
                        {wallpaperId === wallpaper.id ? (
                          <CheckCircle2 className="absolute right-2 top-2 h-5 w-5 rounded-full bg-primary text-primary-foreground" />
                        ) : null}
                      </div>
                      <div className="mt-2 text-center text-sm font-medium text-muted-foreground">{wallpaper.name}</div>
                    </button>
                  ))}
                  <label className="group cursor-pointer text-left">
                    <div
                      className={cn(
                        "flex aspect-[3/2] items-center justify-center rounded-lg border border-dashed bg-muted/70 text-muted-foreground shadow-sm transition-all group-hover:-translate-y-0.5 group-hover:border-primary/40 group-hover:bg-card group-hover:shadow-lg",
                        wallpaperId === "custom" && "border-primary ring-2 ring-primary/30"
                      )}
                    >
                      <Upload className="h-6 w-6" />
                    </div>
                    <div className="mt-2 text-center text-sm font-medium text-muted-foreground">上传图片</div>
                    <input type="file" accept="image/*" className="hidden" onChange={uploadWallpaper} />
                  </label>
                </div>
              </div>
            ) : null}
          </div>

          <form
            onSubmit={submitSearch}
            className="relative flex w-full min-w-0 flex-col gap-2 rounded-lg border border-border/65 bg-card/88 p-2 shadow-2xl shadow-slate-900/10 backdrop-blur-2xl lg:flex-row lg:items-center"
          >
            <div className="flex min-w-max items-center gap-1 overflow-x-auto pb-1 lg:pb-0 lg:pr-2">
              <ModeButton active={mode === "web"} icon={Globe2} label="网页搜索" onClick={() => setMode("web")} />
              <ModeButton active={mode === "ai"} icon={Bot} label="AI导航" onClick={() => setMode("ai")} />
              <ModeButton active={mode === "tools"} icon={Compass} label="工具导航" onClick={() => setMode("tools")} />
            </div>

            <div className="relative min-w-0 flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
              <Input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder={
                  mode === "web"
                    ? "输入关键词，回车使用搜索引擎..."
                    : mode === "ai"
                      ? "搜索 AI 工具名称或用途..."
                      : "搜索工具名称、关键词或用途..."
                }
                className={cn(
                  "h-12 rounded-full border-0 bg-muted/72 pl-9 text-base shadow-inner shadow-slate-900/5 hover:bg-muted focus-visible:bg-background focus-visible:ring-0",
                  mode === "web" ? "pr-32" : "pr-11"
                )}
              />
              {query || category !== "all" ? (
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn(
                    "absolute top-1/2 h-9 w-9 -translate-y-1/2 rounded-full text-muted-foreground",
                    mode === "web" ? "right-24" : "right-1"
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
                <select
                  value={engine}
                  onChange={(event) => setEngine(event.target.value as SearchEngineId)}
                  className="absolute right-2 top-1/2 h-9 -translate-y-1/2 rounded-full border border-border/70 bg-background/88 px-3 text-sm font-semibold text-foreground shadow-sm outline-none transition-colors hover:bg-card focus:border-primary focus:ring-2 focus:ring-primary/20"
                  aria-label="选择搜索引擎"
                >
                  {searchEngines.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
              ) : null}
            </div>
          </form>

          {mode === "tools" ? (
            <div className="mt-4 flex max-w-full gap-2 overflow-x-auto pb-1">
              {categories.map((item) => (
                <Button
                  key={item.id}
                  type="button"
                  variant={category === item.id ? "default" : "ghost"}
                  size="sm"
                  className={
                    category === item.id
                      ? "teal-gradient shrink-0 rounded-full border-transparent px-4 text-white shadow-sm shadow-teal-500/20"
                      : "shrink-0 rounded-full border border-border/70 bg-card/75 px-4 text-muted-foreground backdrop-blur-xl hover:bg-card hover:text-foreground"
                  }
                  onClick={() => setCategory(item.id)}
                >
                  {item.name}
                </Button>
              ))}
            </div>
          ) : null}
        </section>

        {mode === "ai" ? (
          <section className="mt-8 sm:mt-10">
            <div className="mb-4 flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground/90">AI 导航</h2>
                <p className="text-sm text-muted-foreground">
                  当前显示 {filteredAiLinks.length} 个 AI 入口，可直接打开常用助手。
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                className="w-fit rounded-full"
                onClick={() => setShowAddAi((value) => !value)}
              >
                <Plus className="mr-2 h-4 w-4" />
                添加
              </Button>
            </div>

            {showAddAi ? (
              <form
                onSubmit={addAiLink}
                className="mb-4 grid gap-3 rounded-lg border border-border/65 bg-card/86 p-4 shadow-xl shadow-slate-900/8 backdrop-blur-2xl md:grid-cols-[1fr_1.6fr_auto]"
              >
                <Input value={newAiName} onChange={(event) => setNewAiName(event.target.value)} placeholder="名称，例如：我的 AI" />
                <Input value={newAiUrl} onChange={(event) => setNewAiUrl(event.target.value)} placeholder="网址，例如：https://example.com" />
                <Button type="submit">
                  <Plus className="mr-2 h-4 w-4" />
                  添加
                </Button>
              </form>
            ) : null}

            <div className="grid w-full min-w-0 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
              {filteredAiLinks.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  target="_blank"
                  rel="noreferrer"
                  className={cn(
                    "card-shine group flex min-h-[168px] flex-col rounded-lg border border-border/65 bg-card/86 p-4 shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-xl",
                    "bg-gradient-to-br",
                    link.accent
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg border bg-background/80 text-primary shadow-sm">
                      <Bot className="h-5 w-5" />
                    </div>
                    <ExternalLink className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                  </div>
                  <div className="mt-4 flex-1">
                    <h3 className="text-lg font-semibold tracking-tight">{link.name}</h3>
                    <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">{link.description}</p>
                  </div>
                  <div className="mt-4 text-xs font-medium text-primary">打开 {link.name}</div>
                </a>
              ))}
              <button
                type="button"
                className="flex min-h-[168px] flex-col items-center justify-center rounded-lg border border-dashed border-border/80 bg-card/72 p-4 text-muted-foreground shadow-sm backdrop-blur-xl transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-card hover:text-foreground hover:shadow-xl"
                onClick={() => setShowAddAi(true)}
              >
                <Plus className="mb-3 h-7 w-7" />
                <span className="font-semibold">添加 AI 入口</span>
              </button>
            </div>
          </section>
        ) : null}

        {mode === "tools" ? (
          <section className="mt-8 sm:mt-10">
            <div className="mb-4 flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-xl font-bold tracking-tight text-foreground/90">工具导航</h2>
                <p className="text-sm text-muted-foreground">
                  当前显示 {filteredTools.length} 个工具，其中 {readyCount} 个可直接打开使用。
                </p>
              </div>
              <span className="w-fit rounded-full border border-border/70 bg-card/80 px-3 py-1 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur-xl">
                {selectedCategory}
              </span>
            </div>

            {filteredTools.length > 0 ? (
              <div className="grid w-full min-w-0 gap-3.5 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                {filteredTools.map((tool) => (
                  <ToolCard key={tool.id} tool={tool} />
                ))}
              </div>
            ) : (
              <div className="rounded-lg border border-dashed bg-card/70 p-10 text-center text-muted-foreground backdrop-blur-xl">
                没有找到匹配的工具。可以尝试更短的关键词或切换分类。
              </div>
            )}
          </section>
        ) : null}
      </div>
    </div>
  );
}

function ModeButton({
  active,
  icon: Icon,
  label,
  onClick
}: {
  active: boolean;
  icon: typeof Globe2;
  label: string;
  onClick: () => void;
}) {
  return (
    <Button
      type="button"
      size="sm"
      variant={active ? "default" : "ghost"}
      className={
        active
          ? "teal-gradient shrink-0 rounded-full px-3 text-white shadow-md shadow-teal-500/20"
          : "shrink-0 rounded-full text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
      }
      onClick={onClick}
    >
      <Icon className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
