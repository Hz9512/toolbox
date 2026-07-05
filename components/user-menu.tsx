"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import { LogIn, LogOut, UserRound, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cacheUserPreferences, readLocalPreferences } from "@/lib/preferences";
import { useToolboxStore } from "@/lib/store";
import { cn } from "@/lib/utils";

type AuthMode = "login" | "register";

export function UserMenu() {
  const theme = useToolboxStore((state) => state.theme);
  const currentUser = useToolboxStore((state) => state.currentUser);
  const login = useToolboxStore((state) => state.login);
  const register = useToolboxStore((state) => state.register);
  const logout = useToolboxStore((state) => state.logout);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<AuthMode>("login");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }

    function closeOnOutsideClick(event: MouseEvent) {
      const target = event.target;
      if (target instanceof Node && !panelRef.current?.contains(target)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, [open]);

  useEffect(() => {
    setMessage("");
  }, [mode]);

  async function submitAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage("");

    const guestPreferences = mode === "register" ? await readLocalPreferences(null, theme) : undefined;
    const result =
      mode === "login"
        ? await login(name, password)
        : await register(name, password, guestPreferences);
    setIsSubmitting(false);

    if (!result.ok) {
      setMessage(result.message ?? "登录失败，请重试。");
      return;
    }

    if (result.user) {
      cacheUserPreferences(result.user.id, result.user.preferences);
    }

    window.dispatchEvent(new Event("lushifu:user-changed"));
    setName("");
    setPassword("");
    setOpen(false);
  }

  function handleLogout() {
    logout();
    window.dispatchEvent(new Event("lushifu:user-changed"));
    setOpen(false);
  }

  return (
    <div ref={panelRef} className="relative">
      <Button
        type="button"
        variant={currentUser ? "outline" : "ghost"}
        size="sm"
        className={cn(
          "cyber-button rounded-full",
          currentUser && "border-primary/25 bg-card/80 text-foreground"
        )}
        onClick={() => setOpen((value) => !value)}
      >
        <UserRound className="h-4 w-4 sm:mr-2" />
        <span className="hidden max-w-28 truncate sm:inline">
          {currentUser ? currentUser.name : "登录"}
        </span>
      </Button>

      {open ? (
        <div className="cyber-panel absolute right-0 top-12 z-50 w-[min(22rem,calc(100vw-1rem))] rounded-lg p-4 shadow-glass animate-scale-in">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <h2 className="truncate text-base font-semibold tracking-tight">
                {currentUser ? currentUser.name : mode === "login" ? "用户登录" : "创建用户"}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {currentUser ? "个性化配置会同步到账号。" : "登录后可跨设备同步配置。"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-8 w-8 shrink-0 rounded-full"
              onClick={() => setOpen(false)}
              aria-label="关闭用户菜单"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          {currentUser ? (
            <div className="grid gap-3">
              <div className="rounded-lg border border-border/70 bg-background/70 p-3 text-sm text-muted-foreground">
                当前主题、AI 入口、搜索引擎和壁纸会保存到服务端，换台电脑登录也会生效。
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-start rounded-lg"
                onClick={handleLogout}
              >
                <LogOut className="mr-2 h-4 w-4" />
                退出登录
              </Button>
            </div>
          ) : (
            <>
              <div className="mb-4 grid grid-cols-2 gap-2 rounded-lg border border-border/70 bg-background/55 p-1">
                {(["login", "register"] as const).map((item) => (
                  <Button
                    key={item}
                    type="button"
                    variant={mode === item ? "default" : "ghost"}
                    size="sm"
                    className={cn("rounded-md", mode === item && "teal-gradient text-white")}
                    onClick={() => setMode(item)}
                  >
                    {item === "login" ? "登录" : "注册"}
                  </Button>
                ))}
              </div>

              <form onSubmit={submitAuth} className="grid gap-3">
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium">用户名</span>
                  <Input
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    placeholder="例如：lushifu"
                    autoComplete="username"
                    className="bg-background/80"
                  />
                </label>
                <label className="grid gap-1.5">
                  <span className="text-sm font-medium">密码</span>
                  <Input
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="至少 4 位"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    className="bg-background/80"
                  />
                </label>
                {message ? <p className="text-sm text-red-500">{message}</p> : null}
                <Button type="submit" className="teal-gradient rounded-lg text-white" disabled={isSubmitting}>
                  <LogIn className="mr-2 h-4 w-4" />
                  {isSubmitting ? "处理中..." : mode === "login" ? "登录" : "创建并登录"}
                </Button>
              </form>
            </>
          )}
        </div>
      ) : null}
    </div>
  );
}
