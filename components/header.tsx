import Link from "next/link";
import { Bot, Github, Globe2, Wrench } from "lucide-react";

import { MobileNav } from "@/components/mobile-nav";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";
import { WallpaperNavButton } from "@/components/wallpaper-nav-button";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/70 bg-background/95 shadow-[0_10px_34px_rgb(15_23_42/0.12)] backdrop-blur-2xl dark:border-cyan-400/16 dark:bg-[#0b0b0c]/92 dark:shadow-[0_12px_42px_rgb(0_0_0/0.42)]">
      <div className="mx-auto flex h-16 max-w-[1560px] items-center justify-between gap-3 px-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <MobileNav />
          <Link href="/" className="shrink-0 text-xl font-black tracking-tight sm:text-3xl">
            <span className="brand-gradient bg-clip-text text-transparent">Lushifu</span>
            <span className="ml-1 inline-block h-1.5 w-1.5 -translate-y-2 rounded-full bg-primary sm:h-2 sm:w-2" />
          </Link>
          <nav className="ml-3 hidden items-center gap-1 md:flex">
            <WallpaperNavButton />
            <Link
              href="/?mode=web"
              className="cyber-button inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-foreground/10 hover:text-foreground dark:text-cyan-50/80 dark:hover:text-white"
            >
              <Globe2 className="h-4 w-4" />
              网页搜索
            </Link>
            <Link
              href="/?mode=ai"
              className="cyber-button inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-foreground/10 hover:text-foreground dark:text-cyan-50/80 dark:hover:text-white"
            >
              <Bot className="h-4 w-4" />
              AI导航
            </Link>
            <Link
              href="/?mode=tools"
              className="cyber-button inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-foreground/10 hover:text-foreground dark:text-cyan-50/80 dark:hover:text-white"
            >
              <Wrench className="h-4 w-4" />
              工具
            </Link>
          </nav>
        </div>
        <div className="flex min-w-0 items-center justify-end gap-1.5 sm:gap-2">
          <Button variant="ghost" size="sm" className="cyber-button hidden rounded-full sm:inline-flex" asChild>
            <a href="https://github.com/" target="_blank" rel="noreferrer">
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </a>
          </Button>
          <UserMenu />
          <div className="hidden sm:block">
            <ThemeSwitcher />
          </div>
        </div>
      </div>
    </header>
  );
}
