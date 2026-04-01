import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

type TypographyProps<T extends ElementType> = ComponentPropsWithoutRef<T> & {
    children?: ReactNode;
  };

export function TypographyH1({
  className,
  ...props
}: TypographyProps<"h1">) {
  return (
    <h1
      className={cn(
        "scroll-m-20 text-4xl font-semibold tracking-[-0.04em] text-foreground sm:text-5xl",
        className
      )}
      {...props}
    />
  );
}

export function TypographyH2({
  className,
  ...props
}: TypographyProps<"h2">) {
  return (
    <h2
      className={cn(
        "scroll-m-20 mt-14 border-t border-border/80 pt-7 text-[1.7rem] font-semibold tracking-[-0.03em] text-foreground first:mt-0 first:border-t-0 first:pt-0",
        className
      )}
      {...props}
    />
  );
}

export function TypographyH3({
  className,
  ...props
}: TypographyProps<"h3">) {
  return (
    <h3
      className={cn(
        "scroll-m-20 mt-8 text-[1.2rem] font-semibold tracking-[-0.025em] text-foreground",
        className
      )}
      {...props}
    />
  );
}

export function TypographyP({
  className,
  ...props
}: TypographyProps<"p">) {
  return (
    <p
      className={cn(
        "text-[1rem] leading-7.5 text-foreground/78 [&:not(:first-child)]:mt-5",
        className
      )}
      {...props}
    />
  );
}

export function TypographyLead({
  className,
  ...props
}: TypographyProps<"p">) {
  return (
    <p
      className={cn(
        "text-[1.12rem] leading-7.5 text-muted-foreground sm:text-[1.18rem]",
        className
      )}
      {...props}
    />
  );
}

export function TypographyBlockquote({
  className,
  ...props
}: TypographyProps<"blockquote">) {
  return (
    <blockquote
      className={cn(
        "my-7 rounded-r-xl border-l-[3px] border-primary/55 bg-muted/35 px-5 py-3 text-[0.98rem] leading-6.5 text-foreground/78",
        className
      )}
      {...props}
    />
  );
}

export function TypographyUl({
  className,
  ...props
}: TypographyProps<"ul">) {
  return (
    <ul
      className={cn(
        "my-5 ml-6 list-disc space-y-1.5 text-[1rem] leading-7.5 text-foreground/78 marker:text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export function TypographyOl({
  className,
  ...props
}: TypographyProps<"ol">) {
  return (
    <ol
      className={cn(
        "my-5 ml-6 list-decimal space-y-1.5 text-[1rem] leading-7.5 text-foreground/78 marker:font-medium marker:text-muted-foreground",
        className
      )}
      {...props}
    />
  );
}

export function TypographyInlineCode({
  className,
  ...props
}: TypographyProps<"code">) {
  return (
    <code
      className={cn(
        "rounded-md border border-border bg-muted/70 px-1.5 py-0.5 font-mono text-[0.9em] text-foreground",
        className
      )}
      {...props}
    />
  );
}
