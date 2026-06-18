"use client";

import { useEffect, useMemo, useState } from "react";
import { Layers3, Search, ShieldCheck, Sparkles } from "lucide-react";

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

  const readyToolCount = tools.filter((tool) => tool.status === "ready").length;

  return (
    <div className="mx-auto max-w-7xl">
      <section className="card-shine rounded-lg border bg-card/90 p-5 shadow-sm backdrop-blur lg:p-6">
        <div className="grid gap-5 lg:grid-cols-[1fr_auto] lg:items-center">
          <div className="max-w-3xl">
            <div className="mb-3 inline-flex items-center gap-2 rounded-full border bg-background/70 px-3 py-1 text-sm text-muted-foreground">
              <Sparkles className="h-4 w-4" />
              本地优先 · 响应式 · 深色模式
            </div>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              个人工具箱
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              集合日常工作、生活和开发中的小工具。无需注册，工具在浏览器内本地运行。
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-3 py-1">
                <ShieldCheck className="h-4 w-4" />
                文件不离开本机
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full border bg-background/70 px-3 py-1">
                <Layers3 className="h-4 w-4" />
                工具模块化扩展
              </span>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-center lg:w-64">
            <div className="rounded-lg border bg-background/75 p-4 shadow-sm">
              <div className="text-2xl font-semibold">{tools.length}</div>
              <div className="text-xs text-muted-foreground">工具规划</div>
            </div>
            <div className="rounded-lg border bg-background/75 p-4 shadow-sm">
              <div className="text-2xl font-semibold">{readyToolCount}</div>
              <div className="text-xs text-muted-foreground">已上线</div>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-4 rounded-lg border bg-card/80 p-4 shadow-sm backdrop-blur">
        <div className="grid gap-3 lg:grid-cols-[1fr_auto]">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="搜索工具名称、关键词或用途..."
              className="pl-9"
            />
          </div>
          <Button
            variant="outline"
            onClick={() => {
              setQuery("");
              setCategory("all");
            }}
          >
            重置筛选
          </Button>
        </div>

        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {categories.map((item) => (
            <Button
              key={item.id}
              type="button"
              variant={category === item.id ? "default" : "outline"}
              size="sm"
              className="shrink-0 rounded-full"
              onClick={() => setCategory(item.id)}
            >
              {item.name}
            </Button>
          ))}
        </div>
      </section>

      <section className="mt-7">
        <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-xl font-semibold tracking-tight">工具导航</h2>
            <p className="text-sm text-muted-foreground">
              当前显示 {filteredTools.length} 个工具，已上线工具可直接打开使用。
            </p>
          </div>
          <span className="rounded-full border bg-background/70 px-3 py-1 text-sm text-muted-foreground">
            分类：{categories.find((item) => item.id === category)?.name}
          </span>
        </div>

        {filteredTools.length > 0 ? (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
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
