"use client";

import { useEffect, useLayoutEffect, useRef } from "react";

import { SidebarNav } from "@/components/sidebar-nav";
import type { SidebarSection } from "@/lib/content";
import { cn } from "@/lib/utils";

const SIDEBAR_SCROLL_STORAGE_KEY = "learn-ai-agent-sidebar-scroll-top";

type SidebarPaneProps = {
  currentSlug: string;
  sections: SidebarSection[];
  sectionTitle?: string;
  onNavigate?: () => void;
  className?: string;
  showSummary?: boolean;
};

export function SidebarPane({
  currentSlug,
  sections,
  sectionTitle,
  onNavigate,
  className,
  showSummary = false,
}: SidebarPaneProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const savedScrollTop = window.sessionStorage.getItem(
      SIDEBAR_SCROLL_STORAGE_KEY,
    );

    if (!savedScrollTop) {
      return;
    }

    container.scrollTop = Number(savedScrollTop);
  }, [currentSlug]);

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    const handleScroll = () => {
      window.sessionStorage.setItem(
        SIDEBAR_SCROLL_STORAGE_KEY,
        String(container.scrollTop),
      );
    };

    handleScroll();
    container.addEventListener("scroll", handleScroll, { passive: true });

    return () => {
      container.removeEventListener("scroll", handleScroll);
    };
  }, [currentSlug]);

  const handleNavigate = () => {
    const container = containerRef.current;

    if (container) {
      window.sessionStorage.setItem(
        SIDEBAR_SCROLL_STORAGE_KEY,
        String(container.scrollTop),
      );
    }

    onNavigate?.();
  };

  return (
    <div
      ref={containerRef}
      className={cn("h-full overflow-y-auto px-3 py-4", className)}
    >
      <SidebarNav
        currentSlug={currentSlug}
        onNavigate={handleNavigate}
        sections={sections}
      />
    </div>
  );
}
