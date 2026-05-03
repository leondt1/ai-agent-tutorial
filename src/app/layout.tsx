import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "前端工程师的 AI Agent 实战指南：TypeScript 版",
    template: "%s | 前端工程师的 AI Agent 实战指南：TypeScript 版",
  },
  description: "面向前端工程师的 AI Agent 原理与实战教程。",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    // Browser extensions can inject attributes on <html> before React hydrates.
    <html lang="zh-CN" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
