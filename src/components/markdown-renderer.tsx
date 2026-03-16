import { isValidElement, type ComponentPropsWithoutRef, type ReactNode } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

import { createHeadingIdFactory } from "@/lib/markdown";
import { cn } from "@/lib/utils";

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

export function MarkdownRenderer({ content }: { content: string }) {
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
      const Tag = level === 2 ? "h2" : "h3";

      return (
        <Tag
          id={id}
          className={cn(
            level === 2
              ? "group mt-16 scroll-mt-24 border-t border-border pt-10 text-3xl font-semibold tracking-[-0.02em] text-foreground first:mt-0 first:border-t-0 first:pt-0"
              : "group mt-10 scroll-mt-24 text-xl font-semibold tracking-[-0.02em] text-foreground",
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
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h2: HeadingTwo,
          h3: HeadingThree,
          p: ({ className, ...props }) => (
            <p
              className={cn(
                "my-6 text-[1.0625rem] leading-8 text-foreground/80",
                className
              )}
              {...props}
            />
          ),
          ul: ({ className, ...props }) => (
            <ul
              className={cn(
                "my-6 space-y-3 pl-6 text-[1.02rem] leading-8 text-foreground/80 marker:text-muted-foreground",
                className
              )}
              {...props}
            />
          ),
          ol: ({ className, ...props }) => (
            <ol
              className={cn(
                "my-6 space-y-3 pl-6 text-[1.02rem] leading-8 text-foreground/80 marker:font-semibold marker:text-muted-foreground",
                className
              )}
              {...props}
            />
          ),
          blockquote: ({ className, ...props }) => (
            <blockquote
              className={cn(
                "my-8 border-l border-border pl-5 text-[1.02rem] text-foreground/75",
                className
              )}
              {...props}
            />
          ),
          a: ({ className, href, ...props }) => (
            <a
              className={cn(
                "font-medium text-primary decoration-primary/35 underline-offset-4 transition-colors hover:text-primary hover:underline",
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
                "my-8 overflow-x-auto rounded-2xl border border-border bg-[#fafafa] p-4 text-[0.95rem] leading-7 text-foreground shadow-[0_1px_2px_rgba(15,23,42,0.04)]",
                className
              )}
              {...props}
            />
          ),
          code: ({ className, children, ...props }) => {
            const code = String(children).replace(/\n$/, "");
            const isBlock = Boolean(className) || code.includes("\n");

            if (!isBlock) {
              return (
                <code
                  className="rounded-md border border-black/6 bg-[#f6f6f7] px-1.5 py-0.5 font-mono text-[0.92em] text-foreground"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <code className={cn("font-mono", className)} {...props}>
                {code}
              </code>
            );
          },
          hr: () => <div className="my-12 border-t border-border" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
