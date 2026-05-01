"use client";

import { useEffect, useId, useState } from "react";

import { cn } from "@/lib/utils";

type MermaidDiagramProps = {
  chart: string;
  className?: string;
};

export function MermaidDiagram({ chart, className }: MermaidDiagramProps) {
  const reactId = useId();
  const [svg, setSvg] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function renderChart() {
      try {
        const mermaid = (await import("mermaid")).default;

        mermaid.initialize({
          startOnLoad: false,
          securityLevel: "strict",
          theme: "base",
          themeVariables: {
            background: "transparent",
            fontFamily: "var(--font-sans)",
            lineColor: "#94a3b8",
            primaryBorderColor: "#94a3b8",
            primaryColor: "#f8fafc",
            primaryTextColor: "#0f172a",
            secondaryColor: "#ecfeff",
            tertiaryColor: "#f0fdf4",
          },
        });

        const id = `mermaid-${reactId.replace(/[^a-zA-Z0-9_-]/g, "")}`;
        const result = await mermaid.render(id, chart);

        if (!cancelled) {
          setSvg(result.svg);
          setError(null);
        }
      } catch (caught) {
        if (!cancelled) {
          setSvg("");
          setError(caught instanceof Error ? caught.message : String(caught));
        }
      }
    }

    void renderChart();

    return () => {
      cancelled = true;
    };
  }, [chart, reactId]);

  if (error) {
    return (
      <div className={cn("docs-mermaid docs-mermaid-error", className)}>
        <p>Mermaid 图渲染失败。</p>
        <pre>{chart}</pre>
      </div>
    );
  }

  return (
    <div className={cn("docs-mermaid", className)}>
      {svg ? (
        <div
          className="docs-mermaid-svg"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="docs-mermaid-loading">正在渲染图表...</div>
      )}
    </div>
  );
}
