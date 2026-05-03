"use client";

import { useEffect, useMemo, useState } from "react";

import type { MarkdownHeading } from "@/lib/markdown";
import { cn } from "@/lib/utils";

type TableOfContentsProps = {
  headings: MarkdownHeading[];
  className?: string;
};

type TocNode = MarkdownHeading & {
  children: MarkdownHeading[];
};

function buildTocTree(headings: MarkdownHeading[]) {
  const nodes: TocNode[] = [];
  let currentParent: TocNode | null = null;

  for (const heading of headings) {
    if (heading.level === 2) {
      currentParent = {
        ...heading,
        children: [],
      };
      nodes.push(currentParent);
      continue;
    }

    if (currentParent) {
      currentParent.children.push(heading);
      continue;
    }

    nodes.push({
      ...heading,
      children: [],
    });
  }

  return nodes;
}

export function TableOfContents({ headings, className }: TableOfContentsProps) {
  const [activeId, setActiveId] = useState(headings[0]?.id ?? "");
  const tocTree = useMemo(() => buildTocTree(headings), [headings]);

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
              entryA.boundingClientRect.top - entryB.boundingClientRect.top,
          );

        if (visibleEntries[0]?.target.id) {
          setActiveId(visibleEntries[0].target.id);
        }
      },
      {
        rootMargin: "-96px 0px -70% 0px",
        threshold: [0, 1],
      },
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
    <nav aria-label="On this page" className={cn("flex min-h-0 flex-col", className)}>
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-foreground">
        On This Page
      </p>
      <div className="mt-3 min-h-0 flex-1 overflow-y-auto overscroll-contain border-l border-border/80 pl-4 pr-2">
        <ul className="space-y-2">
          {tocTree.map((node) => {
            const isActive = node.id === activeId;
            const hasActiveChild = node.children.some((child) => child.id === activeId);

            return (
              <li key={node.id}>
                <a
                  href={`#${node.id}`}
                  className={cn(
                    "block text-[13px] font-medium leading-7 transition-colors hover:text-foreground",
                    isActive || hasActiveChild ? "text-foreground" : "text-foreground/78",
                    isActive && "text-primary",
                  )}
                >
                  {node.text}
                </a>

                {node.children.length > 0 ? (
                  <ul className="mt-1 space-y-1 border-l border-border/70 pl-4">
                    {node.children.map((child) => {
                      const isChildActive = child.id === activeId;

                      return (
                        <li key={child.id}>
                          <a
                            href={`#${child.id}`}
                            className={cn(
                              "block text-[12px] leading-6 transition-colors hover:text-foreground",
                              isChildActive ? "text-primary" : "text-muted-foreground",
                            )}
                          >
                            {child.text}
                          </a>
                        </li>
                      );
                    })}
                  </ul>
                ) : null}
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
}
