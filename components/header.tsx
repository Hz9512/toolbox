import Link from "next/link";
import { Github } from "lucide-react";

import { MobileNav } from "@/components/mobile-nav";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-40 border-b bg-background/82 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-between gap-3 px-4 lg:px-8">
        <div className="flex items-center gap-2">
          <MobileNav />
          <Link href="/" className="font-semibold tracking-tight lg:hidden">
            Personal Toolbox
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" asChild>
            <a href="https://github.com/" target="_blank" rel="noreferrer">
              <Github className="mr-2 h-4 w-4" />
              GitHub
            </a>
          </Button>
          <ThemeSwitcher />
        </div>
      </div>
    </header>
  );
}
