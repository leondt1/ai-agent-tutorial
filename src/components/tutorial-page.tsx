import Link from "next/link";
import { Github, Menu, Search } from "lucide-react";

import { MarkdownRenderer } from "@/components/markdown-renderer";
import { SidebarNav } from "@/components/sidebar-nav";
import { TableOfContents } from "@/components/table-of-contents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { SidebarSection, Tutorial } from "@/lib/content";

const topNavItems = [
  { label: "Showcase", href: "#" },
  { label: "Docs", href: "/" },
  { label: "Templates", href: "#" },
];

type TutorialPageProps = {
  tutorial: Tutorial;
  sections: SidebarSection[];
};

export function TutorialPage({ tutorial, sections }: TutorialPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="mx-auto flex h-16 max-w-[1440px] items-center gap-4 px-4 md:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <Sheet>
              <SheetTrigger
                render={
                  <button className="inline-flex size-9 items-center justify-center rounded-md border border-border bg-background text-foreground lg:hidden" />
                }
              >
                <Menu className="size-4" />
                <span className="sr-only">打开目录</span>
              </SheetTrigger>
              <SheetContent
                side="left"
                className="w-[320px] border-r border-border bg-background p-0"
              >
                <SheetHeader className="border-b border-border px-5 py-4">
                  <SheetTitle className="text-left text-base font-semibold">
                    Documentation
                  </SheetTitle>
                </SheetHeader>
                <div className="px-3 py-4">
                  <SidebarNav currentSlug={tutorial.slug} sections={sections} />
                </div>
              </SheetContent>
            </Sheet>

            <Link href="/" className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center rounded-sm bg-black text-white">
                <span className="text-[10px] font-semibold">N</span>
              </span>
              <span className="truncate text-lg font-semibold tracking-[-0.02em] text-foreground">
                Learn AI Agent
              </span>
            </Link>
          </div>

          <nav className="hidden items-center gap-6 text-[15px] text-muted-foreground md:flex">
            {topNavItems.map((item) => {
              const isActive = item.label === "Docs";

              return (
                <a
                  key={item.label}
                  href={item.href}
                  className={isActive ? "font-medium text-primary" : "hover:text-foreground"}
                >
                  {item.label}
                </a>
              );
            })}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              className="hidden h-10 items-center gap-3 rounded-xl border border-border bg-[#fafafa] px-3 text-sm text-muted-foreground transition-colors hover:bg-muted/70 md:inline-flex"
            >
              <Search className="size-4" />
              <span>Search documentation...</span>
              <span className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[11px] text-foreground">
                ⌘K
              </span>
            </button>

            <Button variant="outline" className="hidden rounded-xl md:inline-flex">
              Feedback
            </Button>

            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-xl"
              nativeButton={false}
              render={
                <a
                  href="https://github.com"
                  target="_blank"
                  rel="noreferrer noopener"
                />
              }
            >
              <Github className="size-4" />
              <span className="sr-only">GitHub</span>
            </Button>

            <Button className="rounded-xl bg-black px-4 text-white hover:bg-black/90">
              Learn
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-0 px-4 md:px-6 lg:grid-cols-[260px_minmax(0,1fr)] xl:grid-cols-[260px_minmax(0,1fr)_220px]">
        <aside className="hidden lg:block">
          <div className="sticky top-16 h-[calc(100vh-4rem)] border-r border-border">
            <ScrollArea className="h-full px-4 py-6">
              <div className="mb-6 space-y-2">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-muted-foreground">
                  {tutorial.sectionTitle}
                </p>
                <p className="text-sm leading-6 text-muted-foreground">
                  浏览全部教程章节，按主题快速切换。
                </p>
              </div>
              <SidebarNav currentSlug={tutorial.slug} sections={sections} />
            </ScrollArea>
          </div>
        </aside>

        <main className="min-w-0">
          <article className="min-w-0 border-border xl:border-x">
            <div className="mx-auto max-w-3xl px-0 py-10 md:py-14 xl:px-12">
              <div className="mb-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span className="font-medium text-primary">Docs</span>
                <span>/</span>
                <span>{tutorial.sectionTitle}</span>
                <Badge
                  variant="outline"
                  className="h-auto rounded-full border-border px-2.5 py-1 text-[11px] uppercase tracking-[0.18em] text-muted-foreground"
                >
                  {tutorial.code}
                </Badge>
              </div>

              <h1 className="max-w-3xl text-4xl font-semibold tracking-[-0.04em] text-foreground md:text-5xl">
                {tutorial.title}
              </h1>

              <p className="mt-5 max-w-3xl text-xl leading-8 text-muted-foreground">
                {tutorial.description}
              </p>

              <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <span>{tutorial.readingMinutes} min read</span>
                <span>·</span>
                <span>{tutorial.loc} LOC</span>
                <span>·</span>
                <span>{tutorial.toolCount ?? 0} tools</span>
              </div>

              {tutorial.quote ? (
                <div className="mt-8 rounded-2xl border border-border bg-[#fafafa] px-5 py-4 text-[15px] leading-7 text-foreground/75">
                  {tutorial.quote}
                </div>
              ) : null}

              <div className="mt-12">
                <MarkdownRenderer content={tutorial.content} />
              </div>
            </div>
          </article>
        </main>

        <aside className="hidden xl:block">
          <div className="sticky top-24 px-6 py-10">
            <TableOfContents headings={tutorial.headings} />
            <div className="mt-8 border-t border-border pt-6 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{tutorial.tag}</p>
              <p className="mt-2 leading-6">
                当前页面基于 Markdown 生成，支持通过标题锚点快速跳转。
              </p>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
