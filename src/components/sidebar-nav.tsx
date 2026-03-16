import Link from "next/link";

import type { SidebarSection } from "@/lib/content";
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
    <nav className="space-y-8">
      {sections.map((section) => (
        <div key={section.key} className="space-y-3">
          <div className="flex items-center gap-3 px-3">
            <span
              className="size-2 rounded-full"
              style={{ backgroundColor: section.color }}
            />
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              {section.title}
            </p>
          </div>
          <div className="space-y-1">
            {section.lessons.map((lesson) => {
              const isActive = lesson.slug === currentSlug;

              return (
                <Link
                  key={lesson.slug}
                  href={lesson.href}
                  onClick={onNavigate}
                  className={cn(
                    "flex items-start gap-3 rounded-xl px-3 py-2.5 text-sm text-muted-foreground transition-colors hover:bg-muted/60 hover:text-foreground",
                    isActive && "bg-muted font-medium text-foreground"
                  )}
                >
                  <span className="pt-0.5 font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                    {lesson.code}
                  </span>
                  <span className="leading-6">
                    {lesson.title}
                  </span>
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}
