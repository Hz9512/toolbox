"use client";

import { usePathname, useRouter } from "next/navigation";
import { Wallpaper } from "lucide-react";

export function WallpaperNavButton() {
  const pathname = usePathname();
  const router = useRouter();

  function openWallpaperPanel() {
    if (pathname === "/") {
      window.dispatchEvent(new Event("lushifu:open-wallpaper"));
      return;
    }

    window.sessionStorage.setItem("lushifu.openWallpaper", "1");
    router.push("/");
  }

  return (
    <button
      type="button"
      className="cyber-button inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-semibold text-foreground/80 transition-colors hover:bg-foreground/10 hover:text-foreground dark:text-cyan-50/80 dark:hover:text-white"
      onClick={openWallpaperPanel}
    >
      <Wallpaper className="h-4 w-4" />
      壁纸
    </button>
  );
}
