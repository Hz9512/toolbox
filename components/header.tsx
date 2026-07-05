import Link from "next/link";
import { Bot, Github, Globe2, Home, Plus, Wrench } from "lucide-react";

import { MobileNav } from "@/components/mobile-nav";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";
import { UserMenu } from "@/components/user-menu";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/82 backdrop-blur-xl dark:border-cyan-400/10 dark:bg-[#0b0b0c]/76">
      <div className="mx-auto flex h-16 max-w-[1560px] items-center justify-between gap-3 px-3 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-2">
          <MobileNav />
          <Link href="/" className="shrink-0 text-xl font-black tracking-tight sm:text-3xl">
            <span className="brand-gradient bg-clip-text text-transparent">Lushifu</span>
            <span className="ml-1 inline-block h-1.5 w-1.5 -translate-y-2 rounded-full bg-primary sm:h-2 sm:w-2" />
          </Link>
          <nav className="ml-3 hidden items-center gap-1 md:flex">
            <Link
              href="/"
              className="cyber-button inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <Home className="h-4 w-4" />
              首页
            </Link>
            <Link
              href="/?mode=web"
              className="cyber-button inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <Globe2 className="h-4 w-4" />
              网页搜索
            </Link>
            <Link
              href="/?mode=ai"
              className="cyber-button inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
            >
              <Bot className="h-4 w-4" />
              AI导航
            </Link>
            <Link
              href="/?mode=tools"
              className="cyber-button inline-flex items-center gap-1.5 rounded-full px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-foreground/5 hover:text-foreground"
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
          <Button size="sm" className="teal-gradient cyber-glow rounded-full px-3 text-white shadow-sm shadow-teal-500/20 sm:px-4" asChild>
            <Link href="/tools/image-base64">
              <Plus className="h-4 w-4 sm:mr-2" />
              <span className="hidden sm:inline">开始使用</span>
            </Link>
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
