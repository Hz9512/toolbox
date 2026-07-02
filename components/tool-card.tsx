"use client";

import Link from "next/link";
import { ArrowUpRight, Plus } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { getCategoryName, Tool } from "@/lib/tools";
import { cn } from "@/lib/utils";

export function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  const disabled = tool.status !== "ready";
  const content = (
    <>
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-lg border border-border/70 bg-background/90 text-foreground shadow-sm transition-colors",
            tool.status === "ready"
              ? "group-hover:border-primary/35 group-hover:bg-primary group-hover:text-primary-foreground"
              : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <Badge
          className={cn(
            "bg-background/70",
            tool.status === "ready"
              ? "border-teal-500/25 text-teal-700 dark:text-teal-200"
              : "border-muted-foreground/20"
          )}
        >
          {tool.status === "ready" ? "已上线" : "规划中"}
        </Badge>
      </div>

      <div className="mt-3 min-w-0 flex-1">
        <h3 className="break-words font-semibold tracking-tight text-foreground/95">{tool.name}</h3>
        <p className="mt-2 line-clamp-2 break-words text-sm leading-6 text-muted-foreground">
          {tool.description}
        </p>
      </div>

      <div className="mt-4 flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <Badge className="bg-background/70">{getCategoryName(tool.category)}</Badge>

        {disabled ? (
          <span className="inline-flex h-8 items-center text-sm text-muted-foreground">即将上线</span>
        ) : (
          <span className="inline-flex h-8 items-center rounded-full bg-primary px-3 text-sm font-medium text-primary-foreground shadow-sm transition-transform group-hover:translate-x-0.5">
            <Plus className="mr-1.5 h-3.5 w-3.5" />
            打开
            <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
          </span>
        )}
      </div>
    </>
  );

  const className =
    "card-shine tool-card-surface group flex min-h-[172px] w-full min-w-0 flex-col overflow-hidden rounded-lg border border-border/60 p-4 shadow-sm backdrop-blur-xl transition-all duration-300 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-xl";

  if (disabled) {
    return <article className={cn(className, "opacity-90")}>{content}</article>;
  }

  return (
    <Link href={tool.href} className={className} aria-label={`打开 ${tool.name}`}>
      {content}
    </Link>
  );
}
