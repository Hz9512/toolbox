"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getCategoryName, Tool } from "@/lib/tools";
import { cn } from "@/lib/utils";

export function ToolCard({ tool }: { tool: Tool }) {
  const Icon = tool.icon;
  const disabled = tool.status !== "ready";

  return (
    <article className="card-shine tool-card-surface group flex min-h-[210px] flex-col rounded-lg border p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-foreground/20 hover:shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div
          className={cn(
            "flex h-11 w-11 items-center justify-center rounded-md border bg-background/80 text-foreground shadow-sm transition-colors group-hover:bg-foreground group-hover:text-background",
            tool.status === "ready" ? "bg-secondary" : "bg-muted text-muted-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>

      <div className="mt-4 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-semibold tracking-tight">{tool.name}</h3>
          <Badge
            className={cn(
              tool.status === "ready"
                ? "border-emerald-500/25 text-emerald-600 dark:text-emerald-300"
                : "border-muted-foreground/20"
            )}
          >
            {tool.status === "ready" ? "已上线" : "规划中"}
          </Badge>
        </div>
        <p className="mt-2 line-clamp-3 text-sm leading-6 text-muted-foreground">
          {tool.description}
        </p>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge>{getCategoryName(tool.category)}</Badge>
        </div>

        {disabled ? (
          <span className="text-sm text-muted-foreground">即将上线</span>
        ) : (
          <Button size="sm" className="transition-transform group-hover:translate-x-0.5" asChild>
            <Link href={tool.href}>
              打开
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        )}
      </div>
    </article>
  );
}
