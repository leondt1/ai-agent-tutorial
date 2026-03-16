import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="rounded-[2rem] border border-border/70 bg-white px-8 py-10 text-center shadow-lg">
        <p className="text-sm uppercase tracking-[0.3em] text-slate-400">404</p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight text-slate-950">
          没找到这篇教程
        </h1>
        <p className="mt-3 max-w-md text-slate-500">
          你访问的 markdown 页面不存在，可能是 slug 已经变更。
        </p>
        <Button
          className="mt-6"
          nativeButton={false}
          render={<Link href="/" />}
        >
          返回首页
        </Button>
      </div>
    </main>
  );
}
