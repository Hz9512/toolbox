"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  AudioLines,
  Calculator,
  Code2,
  FileText,
  Grid3X3,
  ImageIcon,
  Repeat,
  Sparkles,
  Wrench
} from "lucide-react";

import { categories, CategoryId } from "@/lib/tools";
import { cn } from "@/lib/utils";

const icons: Record<CategoryId, typeof Grid3X3> = {
  all: Grid3X3,
  text: FileText,
  generator: Sparkles,
  converter: Repeat,
  calculator: Calculator,
  image: ImageIcon,
  developer: Code2,
  audio: AudioLines
};

export function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full flex-col gap-6">
      <div>
        <Link href="/" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="card-shine flex h-10 w-10 items-center justify-center rounded-lg border bg-foreground text-background shadow-sm">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold tracking-tight">Personal Toolbox</div>
            <div className="text-xs text-muted-foreground">个人工具百宝箱</div>
          </div>
        </Link>
      </div>

      <nav className="grid gap-1">
        {categories.map((category) => {
          const Icon = icons[category.id];
          const href = category.id === "all" ? "/" : `/?category=${category.id}`;
          const active =
            pathname === "/" && category.id === "all";

          return (
            <Link
              key={category.id}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
                active && "bg-accent text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {category.name}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-md border bg-card p-4 text-sm text-muted-foreground">
        <div className="font-medium text-foreground">本地优先</div>
        <p className="mt-1 leading-6">工具在浏览器内运行，不上传你的文件。</p>
      </div>
    </aside>
  );
}
