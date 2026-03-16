"use client";

import { useEffect, useState } from "react";

import type { MarkdownHeading } from "@/lib/markdown";
import { cn } from "@/lib/utils";

type TableOfContentsProps = {
  headings: MarkdownHeading[];
};

export function TableOfContents({ headings }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? "");

  useEffect(() => {
    if (headings.length === 0) {
      return;
    }

    const elements = headings
      .map((heading) => document.getElementById(heading.id))
      .filter((element): element is HTMLElement => Boolean(element));

    if (elements.length === 0) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const visibleEntries = entries
          .filter((entry) => entry.isIntersecting)
          .sort(
            (entryA, entryB) =>
              entryA.boundingClientRect.top - entryB.boundingClientRect.top
          );

        if (visibleEntries[0]?.target.id) {
          setActiveId(visibleEntries[0].target.id);
        }
      },
      {
        rootMargin: "-96px 0px -70% 0px",
        threshold: [0, 1],
      }
    );

    for (const element of elements) {
      observer.observe(element);
    }

    const onHashChange = () => {
      const nextId = window.location.hash.replace(/^#/, "");

      if (nextId) {
        setActiveId(nextId);
      }
    };

    window.addEventListener("hashchange", onHashChange);
    onHashChange();

    return () => {
      observer.disconnect();
      window.removeEventListener("hashchange", onHashChange);
    };
  }, [headings]);

  if (headings.length === 0) {
    return null;
  }

  return (
    <nav aria-label="On this page">
      <p className="text-sm font-semibold text-foreground">On this page</p>
      <div className="mt-4 space-y-1 border-l border-border pl-4">
        {headings.map((heading) => {
          const isActive = heading.id === activeId;

          return (
            <a
              key={heading.id}
              href={`#${heading.id}`}
              className={cn(
                "block text-sm leading-6 text-muted-foreground transition-colors hover:text-foreground",
                heading.level === 3 && "pl-4",
                isActive && "font-medium text-primary"
              )}
            >
              {heading.text}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
