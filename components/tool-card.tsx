"use client";

import Link from "next/link";
import { ArrowUpRight, Clock3, MousePointerClick } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getCategoryName, Tool } from "@/lib/tools";
import { cn } from "@/lib/utils";

export function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  const disabled = tool.status !== "ready";

  const content = (
    <>
      <div className="absolute inset-x-4 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/45 to-transparent opacity-70" />
      <div className="absolute -right-14 -top-14 h-32 w-32 rounded-full bg-cyan-400/[0.08] blur-2xl transition-all duration-500 group-hover:bg-cyan-400/[0.2]" />

      <div className="relative flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-12 w-12 items-center justify-center rounded-lg border shadow-sm transition-all duration-300",
            disabled
              ? "border-border/70 bg-muted/70 text-muted-foreground"
              : "border-border/70 bg-background/80 text-primary group-hover:-translate-y-0.5 group-hover:border-cyan-300/55 group-hover:bg-primary group-hover:text-primary-foreground group-hover:shadow-glow dark:border-cyan-400/16 dark:bg-[#101115]/80"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>

        <Badge
          className={cn(
            "rounded-full border bg-background/70 px-2.5 py-1 text-xs shadow-sm backdrop-blur",
            tool.status === "ready"
              ? "border-emerald-500/25 text-emerald-700 dark:text-emerald-200"
              : "border-muted-foreground/20 text-muted-foreground"
          )}
        >
          {tool.status === "ready" ? "已上线" : "规划中"}
        </Badge>
      </div>

      <div className="relative mt-5 min-w-0 flex-1">
        <div className="mb-2 flex items-center gap-2">
          <Badge className="rounded-full border-border/60 bg-background/60 text-xs text-muted-foreground">
            {getCategoryName(tool.category)}
          </Badge>
        </div>
        <h3 className="break-words text-[15px] font-semibold tracking-tight text-foreground">
          {tool.name}
        </h3>
        <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-muted-foreground">
          {tool.description}
        </p>
      </div>

      <div className="relative mt-5 flex items-center justify-between gap-3">
        <div className="text-xs font-medium text-muted-foreground">
          {disabled ? "即将开放" : "本地优先 · 快速打开"}
        </div>

        {disabled ? (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full border border-border/70 bg-background/60 px-3 text-sm text-muted-foreground">
            <Clock3 className="h-3.5 w-3.5" />
            Soon
          </span>
        ) : (
          <span className="inline-flex h-9 items-center gap-1.5 rounded-full bg-foreground px-3 text-sm font-medium text-background shadow-sm transition-all duration-300 group-hover:translate-x-0.5 group-hover:bg-primary group-hover:text-primary-foreground">
            <MousePointerClick className="h-3.5 w-3.5" />
            打开
            <ArrowUpRight className="h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </>
  );

  const className = cn(
    "surface-noise cyber-panel cyber-glow group relative flex min-h-[190px] w-full min-w-0 flex-col overflow-hidden rounded-lg p-4 transition-all duration-300",
    "hover:-translate-y-1 hover:border-primary/35 hover:shadow-glass",
    disabled && "opacity-[0.86]"
  );

  if (disabled) {
    return <article className={className}>{content}</article>;
  }

  return (
    <Link href={tool.href} className={className} aria-label={`打开 ${tool.name}`}>
      {content}
    </Link>
  );
}
