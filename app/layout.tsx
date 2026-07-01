import type { Metadata } from "next";
import { Inter } from "next/font/google";

import { Header } from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Personal Toolbox",
  description: "一个简洁、美观、实用的个人在线工具网站"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          <div className="min-h-screen bg-background">
            <div className="pointer-events-none fixed inset-x-0 top-0 h-96 opacity-35 subtle-grid" />
            <div className="relative">
              <Header />
              <main className="min-h-[calc(100vh-4rem)] px-3 py-5 sm:px-6 lg:px-8">
                {children}
              </main>
              <footer className="border-t bg-background/80 px-4 py-6 text-sm text-muted-foreground backdrop-blur lg:px-8">
                <div className="mx-auto flex max-w-[1560px] flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <span>关于 Personal Toolbox：本地优先的个人工具集合。</span>
                  <span>更新日志：v0.4.0 重构首页导航、搜索和卡片视觉。</span>
                </div>
              </footer>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
