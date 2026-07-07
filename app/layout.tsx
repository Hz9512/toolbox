import type { Metadata } from "next";

import { Header } from "@/components/header";
import { ThemeProvider } from "@/components/theme-provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lushifu",
  description: "一个简洁、美观、实用的个人导航和工具网站"
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body>
        <ThemeProvider>
          <div className="min-h-screen bg-background">
            <div className="pointer-events-none fixed inset-x-0 top-0 h-96 opacity-35 subtle-grid" />
            <div className="relative">
              <Header />
              <main className="min-h-[calc(100vh-4rem)] px-3 py-5 sm:px-6 lg:px-8">
                {children}
              </main>
              <footer className="border-t border-border/60 bg-background/78 px-4 py-3 text-center backdrop-blur-xl lg:px-8">
                <div className="mx-auto flex max-w-[1560px] items-center justify-center">
                  <a
                    href="https://beian.miit.gov.cn/"
                    target="_blank"
                    rel="noreferrer"
                    className="text-[12px] text-muted-foreground transition-colors hover:text-foreground"
                    style={{ fontFamily: "SimSun, 宋体, serif" }}
                  >
                    沪ICP备2026030486号
                  </a>
                </div>
              </footer>
            </div>
          </div>
        </ThemeProvider>
      </body>
    </html>
  );
}
