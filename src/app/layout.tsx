import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Learn AI Agent",
    template: "%s | Learn AI Agent",
  },
  description: "一个使用 Markdown 编写、纯静态导出的技术教程网站模板。",
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
