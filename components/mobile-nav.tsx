"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Sidebar } from "@/components/sidebar";

export function MobileNav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="rounded-full lg:hidden"
        onClick={() => setOpen(true)}
        aria-label="打开导航"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {open ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-foreground/20 backdrop-blur-sm"
            aria-label="关闭导航"
            onClick={() => setOpen(false)}
          />
          <div className="absolute left-0 top-0 h-full w-[82vw] max-w-80 border-r bg-background p-5 shadow-soft">
            <div className="mb-4 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="rounded-full"
                onClick={() => setOpen(false)}
                aria-label="关闭导航"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
            <Sidebar onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
    </>
  );
}
