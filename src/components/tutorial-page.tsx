import Link from "next/link";
import { Github, Menu } from "lucide-react";

import { MarkdownRenderer } from "@/components/markdown-renderer";
import { SidebarPane } from "@/components/sidebar-pane";
import { TableOfContents } from "@/components/table-of-contents";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { TypographyH1 } from "@/components/ui/typography";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import type { SidebarSection, Tutorial } from "@/lib/content";
import { formatTutorialCode } from "@/lib/tutorial-code";

type TutorialPageProps = {
  tutorial: Tutorial;
  sections: SidebarSection[];
};

export function TutorialPage({ tutorial, sections }: TutorialPageProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-40 border-b border-border/80 bg-background/88 backdrop-blur supports-[backdrop-filter]:bg-background/72">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 md:px-6">
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
                <SidebarPane
                  currentSlug={tutorial.slug}
                  sections={sections}
                  className="max-h-[calc(100vh-73px)]"
                />
              </SheetContent>
            </Sheet>

            <Link href="/" className="flex items-center gap-3">
              <span className="flex size-6 items-center justify-center rounded-md border border-border bg-foreground text-background">
                <span className="text-[10px] font-semibold">AI</span>
              </span>
              <span className="truncate text-[15px] font-semibold text-foreground">
                前端工程师的 AI Agent 实战指南：TypeScript 版
              </span>
            </Link>
          </div>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon-sm"
              className="rounded-lg text-muted-foreground hover:text-foreground"
              nativeButton={false}
              render={
                <a
                  href="https://github.com/leondt1/AI-agent-tutorial"
                  target="_blank"
                  rel="noreferrer noopener"
                />
              }
            >
              <Github className="size-4" />
              <span className="sr-only">GitHub</span>
            </Button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1440px] grid-cols-1 gap-0 px-4 md:px-6 lg:grid-cols-[248px_minmax(0,1fr)] xl:grid-cols-[248px_minmax(0,1fr)_224px]">
        <aside className="hidden lg:block">
          <div className="sticky top-14 h-[calc(100vh-3.5rem)] border-r border-border/80">
            <SidebarPane
              currentSlug={tutorial.slug}
              sectionTitle={tutorial.sectionTitle}
              sections={sections}
              className="h-full px-3 py-5"
              showSummary
            />
          </div>
        </aside>

        <main className="min-w-0">
          <article className="min-w-0 xl:border-x xl:border-border/80">
            <div className="mx-auto max-w-[780px] px-0 py-8 md:py-12 xl:px-12">
              <div className="mb-5 flex flex-wrap items-center gap-2.5 text-[13px] text-muted-foreground">
                <span className="font-medium text-primary">Docs</span>
                <span>/</span>
                <span>{tutorial.sectionTitle}</span>
                <Badge
                  variant="outline"
                  className="h-auto rounded-md border-border/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-muted-foreground"
                >
                  {formatTutorialCode(tutorial.code)}
                </Badge>
              </div>

              <TypographyH1>{tutorial.title}</TypographyH1>

              <div className="mt-5 flex flex-wrap items-center gap-2.5 text-[13px] text-muted-foreground">
                <span>{tutorial.readingMinutes} min read</span>
                <span>·</span>
                <span>{tutorial.loc} LOC</span>
                <span>·</span>
                <span>{tutorial.toolCount ?? 0} tools</span>
              </div>

              <div className="mt-8 rounded-2xl border border-border/80 bg-muted/30 px-5 py-4 text-[15px] leading-7 text-foreground/76 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                {tutorial.summary}
              </div>

              <div className="mt-12">
                <MarkdownRenderer content={tutorial.content} />
              </div>
            </div>
          </article>
        </main>

        <aside className="hidden xl:block">
          <div className="sticky top-20 flex h-[calc(100vh-5rem)] min-h-0 px-5 py-8">
            <TableOfContents
              className="min-h-0 flex-1"
              headings={tutorial.headings}
            />
          </div>
        </aside>
      </div>
    </div>
  );
}
