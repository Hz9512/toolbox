"use client";

import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Command } from "cmdk";
import {
  ArrowUpRight,
  Bot,
  Boxes,
  Globe2,
  ImageIcon,
  Search,
  Sparkles,
  Wrench
} from "lucide-react";
import { toast } from "sonner";

import { aiLinksStorageKey, defaultAiLinks, type AiLink } from "@/lib/ai-links";
import { categories, getCategoryName, tools } from "@/lib/tools";
import { cn } from "@/lib/utils";

function readCustomAiLinks() {
  try {
    const value = window.localStorage.getItem(aiLinksStorageKey);
    return value ? (JSON.parse(value) as AiLink[]) : [];
  } catch {
    window.localStorage.removeItem(aiLinksStorageKey);
    return [];
  }
}

function openExternal(href: string) {
  window.open(href, "_blank", "noopener,noreferrer");
}

export function CommandMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [customAiLinks, setCustomAiLinks] = useState<AiLink[]>([]);

  useEffect(() => {
    setCustomAiLinks(readCustomAiLinks());

    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    }

    function openCommandMenu() {
      setOpen(true);
    }

    function refreshAiLinks() {
      setCustomAiLinks(readCustomAiLinks());
    }

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("lushifu:open-command", openCommandMenu);
    window.addEventListener("lushifu:ai-links-updated", refreshAiLinks);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("lushifu:open-command", openCommandMenu);
      window.removeEventListener("lushifu:ai-links-updated", refreshAiLinks);
    };
  }, []);

  const aiLinks = useMemo(() => [...defaultAiLinks, ...customAiLinks], [customAiLinks]);
  const keyword = search.trim();

  function runCommand(action: () => void) {
    setOpen(false);
    setSearch("");
    action();
  }

  return (
    <Command.Dialog
      open={open}
      onOpenChange={setOpen}
      label="Lushifu 全局命令"
      shouldFilter
      loop
      overlayClassName="fixed inset-0 z-50 bg-background/45 backdrop-blur-md"
      contentClassName="fixed left-1/2 top-[12vh] z-50 w-[calc(100vw-1.5rem)] max-w-2xl -translate-x-1/2 overflow-hidden rounded-lg border border-border/70 bg-card/95 shadow-glass backdrop-blur-2xl animate-scale-in"
      className="flex max-h-[74vh] flex-col"
    >
      <div className="flex items-center gap-3 border-b border-border/70 px-4 py-3">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Command.Input
          value={search}
          onValueChange={setSearch}
          placeholder="搜索工具、AI、分类，或输入关键词搜索网页..."
          className="h-11 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground"
        />
        <kbd className="hidden rounded-md border bg-muted px-2 py-1 text-[11px] font-medium text-muted-foreground sm:inline-flex">
          Esc
        </kbd>
      </div>

      <Command.List className="scrollbar-none max-h-[58vh] overflow-y-auto p-2">
        <Command.Empty className="px-4 py-10 text-center text-sm text-muted-foreground">
          没有找到匹配项。
        </Command.Empty>

        {keyword ? (
          <Command.Group heading="网页搜索" className="cmdk-group">
            <CommandItem
              value={`search-${keyword}`}
              keywords={[keyword, "bing", "web", "网页搜索"]}
              icon={Globe2}
              title={`搜索 “${keyword}”`}
              description="使用必应打开新的搜索结果页"
              onSelect={() =>
                runCommand(() => {
                  openExternal(`https://www.bing.com/search?q=${encodeURIComponent(keyword)}`);
                  toast.message("已打开网页搜索", { description: keyword });
                })
              }
            />
          </Command.Group>
        ) : null}

        <Command.Group heading="快速入口" className="cmdk-group">
          <CommandItem
            value="home web search"
            keywords={["首页", "网页搜索", "web"]}
            icon={Sparkles}
            title="打开工作台"
            description="回到 Lushifu 首页"
            onSelect={() => runCommand(() => router.push("/"))}
          />
          <CommandItem
            value="ai navigation"
            keywords={["AI", "导航", "assistant"]}
            icon={Bot}
            title="AI 导航"
            description="查看常用 AI 助手入口"
            onSelect={() => runCommand(() => router.push("/?mode=ai"))}
          />
          <CommandItem
            value="tools navigation"
            keywords={["工具", "导航", "toolbox"]}
            icon={Wrench}
            title="工具导航"
            description="查看本地工具集合"
            onSelect={() => runCommand(() => router.push("/?mode=tools"))}
          />
        </Command.Group>

        <Command.Group heading="工具" className="cmdk-group">
          {tools.map((tool) => (
            <CommandItem
              key={tool.id}
              value={`tool-${tool.id}-${tool.name}`}
              keywords={[tool.name, tool.description, getCategoryName(tool.category), ...tool.keywords]}
              icon={tool.icon}
              title={tool.name}
              description={`${getCategoryName(tool.category)} · ${
                tool.status === "ready" ? "可直接打开" : "规划中"
              }`}
              trailing={tool.status === "ready" ? <ArrowUpRight className="h-4 w-4" /> : "Soon"}
              onSelect={() =>
                runCommand(() => {
                  if (tool.status === "ready") {
                    router.push(tool.href);
                  } else {
                    toast.info("这个工具还在规划中", { description: tool.name });
                  }
                })
              }
            />
          ))}
        </Command.Group>

        <Command.Group heading="AI" className="cmdk-group">
          {aiLinks.map((link) => (
            <CommandItem
              key={link.id}
              value={`ai-${link.id}-${link.name}`}
              keywords={[link.name, link.description, link.href, "AI"]}
              icon={Bot}
              title={link.name}
              description={link.description}
              trailing={<ArrowUpRight className="h-4 w-4" />}
              onSelect={() => runCommand(() => openExternal(link.href))}
            />
          ))}
        </Command.Group>

        <Command.Group heading="分类" className="cmdk-group">
          {categories
            .filter((category) => category.id !== "all")
            .map((category) => (
              <CommandItem
                key={category.id}
                value={`category-${category.id}-${category.name}`}
                keywords={[category.name, "分类", "工具"]}
                icon={category.id === "image" ? ImageIcon : Boxes}
                title={category.name}
                description="按分类筛选工具"
                onSelect={() => runCommand(() => router.push(`/?mode=tools&category=${category.id}`))}
              />
            ))}
        </Command.Group>
      </Command.List>
    </Command.Dialog>
  );
}

function CommandItem({
  value,
  keywords,
  icon: Icon,
  title,
  description,
  trailing,
  onSelect
}: {
  value: string;
  keywords?: string[];
  icon: typeof Search;
  title: string;
  description: string;
  trailing?: ReactNode;
  onSelect: () => void;
}) {
  return (
    <Command.Item
      value={value}
      keywords={keywords}
      onSelect={onSelect}
      className={cn(
        "group flex cursor-pointer items-center gap-3 rounded-md px-3 py-3 text-sm outline-none transition-colors",
        "aria-selected:bg-accent aria-selected:text-accent-foreground"
      )}
    >
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-border/70 bg-background/80 text-muted-foreground shadow-sm transition-colors group-aria-selected:border-primary/30 group-aria-selected:text-primary">
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="truncate font-medium text-foreground">{title}</div>
        <div className="truncate text-xs text-muted-foreground">{description}</div>
      </div>
      {trailing ? (
        <div className="shrink-0 text-xs font-medium text-muted-foreground transition-colors group-aria-selected:text-primary">
          {trailing}
        </div>
      ) : null}
    </Command.Item>
  );
}
