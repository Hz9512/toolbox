"use client";

import { useEffect, useState } from "react";
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
  const [activeCategory, setActiveCategory] = useState<CategoryId>("all");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const category = params.get("category") as CategoryId | null;
    const validCategory = categories.find((item) => item.id === category)?.id;
    setActiveCategory(validCategory ?? "all");
  }, [pathname]);

  return (
    <aside className="flex h-full flex-col gap-6">
      <div>
        <Link href="/" className="flex items-center gap-3" onClick={onNavigate}>
          <div className="card-shine teal-gradient flex h-10 w-10 items-center justify-center rounded-lg border border-teal-500/15 text-white shadow-sm shadow-teal-500/20">
            <Wrench className="h-5 w-5" />
          </div>
          <div>
            <div className="text-lg font-semibold italic tracking-tight">
              <span>tool</span>
              <span className="brand-gradient bg-clip-text text-transparent">box</span>
            </div>
            <div className="text-xs text-muted-foreground">个人工具百宝箱</div>
          </div>
        </Link>
      </div>

      <nav className="grid gap-1">
        {categories.map((category) => {
          const Icon = icons[category.id];
          const href = category.id === "all" ? "/" : `/?category=${category.id}`;
          const active = pathname === "/" && activeCategory === category.id;

          return (
            <Link
              key={category.id}
              href={href}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground",
                active && "teal-gradient text-white shadow-sm shadow-teal-500/20 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" />
              {category.name}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
