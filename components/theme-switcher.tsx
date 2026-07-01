"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { ThemeMode, useToolboxStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const options: Array<{ value: ThemeMode; label: string; icon: typeof Monitor }> = [
  { value: "system", label: "自动", icon: Monitor },
  { value: "light", label: "浅色", icon: Sun },
  { value: "dark", label: "深色", icon: Moon }
];

export function ThemeSwitcher() {
  const theme = useToolboxStore((state) => state.theme);
  const setTheme = useToolboxStore((state) => state.setTheme);

  return (
    <div className="flex rounded-full border border-border/70 bg-card/80 p-1 shadow-sm">
      {options.map((option) => {
        const Icon = option.icon;

        return (
          <Button
            key={option.value}
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              "h-8 rounded-full gap-1.5 px-2.5 text-muted-foreground hover:bg-foreground/5 hover:text-foreground",
              theme === option.value && "bg-accent text-accent-foreground shadow-sm"
            )}
            onClick={() => setTheme(option.value)}
            title={option.label}
          >
            <Icon className="h-4 w-4" />
            <span className="hidden sm:inline">{option.label}</span>
          </Button>
        );
      })}
    </div>
  );
}
