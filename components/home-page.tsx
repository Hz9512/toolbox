"use client";

import { useEffect, useMemo, useState } from "react";
import { Compass, RotateCcw, Search, Sparkles } from "lucide-react";

import { ToolCard } from "@/components/tool-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { categories, CategoryId, tools } from "@/lib/tools";

function matchesTool(query: string, tool: (typeof tools)[number]) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return true;

  const haystack = [tool.name, tool.description, tool.category, ...tool.keywords]
    .join(" ")
    .toLowerCase();

  return normalized.split(/\s+/).every((part) => haystack.includes(part));
}

export function HomePage({
  initialCategory = "all"
}: {
  initialCategory?: CategoryId;
}) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<CategoryId>(initialCategory);

  useEffect(() => {
    setCategory(initialCategory);
  }, [initialCategory]);

  const filteredTools = useMemo(() => {
    return tools.filter((tool) => {
      const categoryMatch = category === "all" || tool.category === category;
      return categoryMatch && matchesTool(query, tool);
    });
  }, [category, query]);

  const readyCount = filteredTools.filter((tool) => tool.status === "ready").length;
  const selectedCategory = categories.find((item) => item.id === category)?.name ?? "全部";

  return (
    <div className="mx-auto w-full max-w-[1560px] min-w-0">
      <h1 className="sr-only">Personal Toolbox 工具导航</h1>

      <section className="mx-auto w-full max-w-4xl min-w-0 pt-2 sm:pt-5">
        <div className="mb-4 flex justify-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-teal-500/15 bg-teal-500/8 px-3 py-1 text-sm font-medium text-teal-700 dark:text-teal-200">
            <Sparkles className="h-4 w-4" />
            {tools.length} 个本地优先工具
          </div>
        </div>

        <div className="relative flex w-full min-w-0 flex-col gap-2 rounded-lg border border-border/60 bg-card/95 p-2 shadow-xl shadow-slate-900/5 backdrop-blur-xl sm:flex-row sm:items-center">
          <div className="flex items-center gap-1 sm:pr-2">
            <Button
              type="button"
              size="sm"
              variant={category === "all" ? "default" : "ghost"}
              className={
                category === "all"
                  ? "teal-gradient rounded-full px-3 text-white shadow-md shadow-teal-500/20"
                  : "rounded-full text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              }
              onClick={() => setCategory("all")}
            >
              <Compass className="mr-2 h-4 w-4" />
              全部工具
            </Button>
            <Button
              type="button"
              variant={category === "developer" ? "default" : "ghost"}
              size="sm"
              className={
                category === "developer"
                  ? "teal-gradient rounded-full px-3 text-white shadow-md shadow-teal-500/20"
                  : "rounded-full text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
              }
              onClick={() => setCategory("developer")}
            >
              <Sparkles className="mr-2 h-4 w-4" />
              开发精选
            </Button>
          </div>

          <div className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground/70" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索工具名称、关键词或用途..."
              className="h-12 rounded-full border-0 bg-muted/70 pl-9 pr-11 text-base shadow-none hover:bg-muted focus-visible:bg-background focus-visible:ring-0"
            />
            {query || category !== "all" ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full text-muted-foreground"
                onClick={() => {
                  setQuery("");
                  setCategory("all");
                }}
                aria-label="重置筛选"
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            ) : null}
          </div>
        </div>

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
                  : "shrink-0 rounded-full border border-border/70 bg-card/70 px-4 text-muted-foreground hover:bg-card hover:text-foreground"
              }
              onClick={() => setCategory(item.id)}
            >
              {item.name}
            </Button>
          ))}
        </div>
      </section>

      <section className="mt-8 sm:mt-10">
        <div className="mb-4 flex flex-col gap-2 px-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-bold tracking-tight text-foreground/90">为你精选</h2>
            <p className="text-sm text-muted-foreground">
              当前显示 {filteredTools.length} 个工具，其中 {readyCount} 个可直接打开使用。
            </p>
          </div>
          <span className="w-fit rounded-full border border-border/70 bg-card/80 px-3 py-1 text-sm font-medium text-muted-foreground shadow-sm">
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
          <div className="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
            没有找到匹配的工具。可以尝试更短的关键词或切换分类。
          </div>
        )}
      </section>
    </div>
  );
}
