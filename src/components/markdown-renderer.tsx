import { isValidElement, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { MarkdownAsync } from "react-markdown";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";

import {
  TypographyBlockquote,
  TypographyH2,
  TypographyH3,
  TypographyInlineCode,
  TypographyOl,
  TypographyP,
  TypographyUl,
} from "@/components/ui/typography";
import { createHeadingIdFactory } from "@/lib/markdown";
import { cn } from "@/lib/utils";

const prettyCodeOptions = {
  theme: {
    light: "github-light",
    dark: "github-dark-dimmed",
  },
  keepBackground: false,
  defaultLang: "plaintext",
};

function getTextContent(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") {
    return String(node);
  }

  if (Array.isArray(node)) {
    return node.map((child) => getTextContent(child)).join("");
  }

  if (isValidElement<{ children?: ReactNode }>(node)) {
    return getTextContent(node.props.children);
  }

  return "";
}

export async function MarkdownRenderer({ content }: { content: string }) {
  const createHeadingId = createHeadingIdFactory();

  const renderHeading = (level: 2 | 3, displayName: string) => {
    const Heading = ({
      className,
      children,
      ...props
    }: ComponentPropsWithoutRef<"h2"> & {
      children?: ReactNode;
    }) => {
      const id = createHeadingId(getTextContent(children));
      const Tag = level === 2 ? TypographyH2 : TypographyH3;

      return (
        <Tag
          id={id}
          className={cn(
            "group scroll-mt-24",
            className
          )}
          {...props}
        >
          <a
            href={`#${id}`}
            className="inline-flex items-center gap-2 transition-colors hover:text-primary"
          >
            {children}
            <span className="text-sm text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100">
              #
            </span>
          </a>
        </Tag>
      );
    };

    Heading.displayName = displayName;

    return Heading;
  };

  const HeadingTwo = renderHeading(2, "MarkdownHeadingTwo");
  const HeadingThree = renderHeading(3, "MarkdownHeadingThree");

  return (
    <div className="docs-prose">
      <MarkdownAsync
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypePrettyCode, prettyCodeOptions]]}
        components={{
          h2: HeadingTwo,
          h3: HeadingThree,
          p: ({ className, ...props }) => (
            <TypographyP className={className} {...props} />
          ),
          ul: ({ className, ...props }) => (
            <TypographyUl className={className} {...props} />
          ),
          ol: ({ className, ...props }) => (
            <TypographyOl className={className} {...props} />
          ),
          blockquote: ({ className, ...props }) => (
            <TypographyBlockquote className={className} {...props} />
          ),
          a: ({ className, href, ...props }) => (
            <a
              className={cn(
                "font-medium text-primary decoration-primary/35 underline underline-offset-4 transition-colors hover:text-primary/90",
                className
              )}
              href={href}
              rel={href?.startsWith("http") ? "noreferrer noopener" : undefined}
              target={href?.startsWith("http") ? "_blank" : undefined}
              {...props}
            />
          ),
          pre: ({ className, ...props }) => (
            <pre
              className={cn(
                "my-8 overflow-x-auto rounded-2xl border border-border/90 bg-[#fafafa] px-4 py-3.5 text-[0.94rem] leading-7 text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
                className
              )}
              {...props}
            />
          ),
          code: ({ className, children, ...props }) => {
            const textContent = getTextContent(children);
            const isBlock = Boolean(className) || textContent.includes("\n");

            if (!isBlock) {
              return <TypographyInlineCode {...props}>{children}</TypographyInlineCode>;
            }

            return (
              <code className={cn("font-mono text-[0.92rem]", className)} {...props}>
                {children}
              </code>
            );
          },
          table: ({ className, ...props }) => (
            <div className="my-8 overflow-x-auto rounded-xl border border-border/80">
              <table
                className={cn("w-full text-left text-sm", className)}
                {...props}
              />
            </div>
          ),
          thead: ({ className, ...props }) => (
            <thead className={cn("bg-muted/45", className)} {...props} />
          ),
          th: ({ className, ...props }) => (
            <th
              className={cn(
                "border-b border-border px-4 py-3 text-sm font-semibold text-foreground",
                className
              )}
              {...props}
            />
          ),
          td: ({ className, ...props }) => (
            <td
              className={cn(
                "border-t border-border/70 px-4 py-3 align-top text-sm leading-7 text-foreground/78",
                className
              )}
              {...props}
            />
          ),
          hr: () => <div className="my-12 border-t border-border" />,
        }}
      >
        {content}
      </MarkdownAsync>
    </div>
  );
}
