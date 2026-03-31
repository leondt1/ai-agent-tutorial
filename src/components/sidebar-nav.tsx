import Link from "next/link";

import type { SidebarSection } from "@/lib/content";
import { formatTutorialCode } from "@/lib/tutorial-code";
import { cn } from "@/lib/utils";

type SidebarNavProps = {
  sections: SidebarSection[];
  currentSlug: string;
  onNavigate?: () => void;
};

export function SidebarNav({
  sections,
  currentSlug,
  onNavigate,
}: SidebarNavProps) {
  return (
    <nav className="space-y-5">
      {sections.map((section) => (
        <div key={section.key} className="space-y-1.5">
          <div className="flex items-center gap-2 px-2.5">
            <span
              className="size-1.5 rounded-full"
              style={{ backgroundColor: section.color }}
            />
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground">
              {section.title}
            </p>
          </div>
          <div className="space-y-0.5">
            {section.lessons.map((lesson) => {
              const isActive = lesson.slug === currentSlug;

              return (
                <Link
                  key={lesson.slug}
                  href={lesson.href}
                  onClick={onNavigate}
                  scroll={false}
                  className={cn(
                    "flex items-start gap-1 rounded-lg px-2.5 py-1.5 text-[13px] text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
                    isActive && "bg-muted text-foreground",
                  )}
                >
                  <span className="min-w-4 pt-0.5 font-mono text-[9px] uppercase tracking-[0.08em] text-muted-foreground">
                    {formatTutorialCode(lesson.code)}
                  </span>
                  <span className="leading-5">{lesson.title}</span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
