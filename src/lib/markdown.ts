export type MarkdownHeading = {
  id: string;
  text: string;
  level: 2 | 3;
};

function stripMarkdownSyntax(text: string) {
  return text
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_~]/g, "")
    .replace(/<[^>]+>/g, "")
    .trim();
}

export function slugifyHeading(text: string) {
  const normalized = stripMarkdownSyntax(text)
    .toLowerCase()
    .trim()
    .replace(/[\s/]+/g, "-")
    .replace(/[^\p{Letter}\p{Number}-]+/gu, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");

  return normalized || "section";
}

export function createHeadingIdFactory() {
  const seen = new Map<string, number>();

  return (text: string) => {
    const baseId = slugifyHeading(text);
    const nextCount = (seen.get(baseId) ?? 0) + 1;
    seen.set(baseId, nextCount);

    return nextCount === 1 ? baseId : `${baseId}-${nextCount}`;
  };
}

export function extractMarkdownHeadings(content: string): MarkdownHeading[] {
  const createHeadingId = createHeadingIdFactory();
  const headings: MarkdownHeading[] = [];

  for (const rawLine of content.split("\n")) {
    const line = rawLine.trim();
    const match = /^(##|###)\s+(.+)$/.exec(line);

    if (!match) {
      continue;
    }

    const level = match[1].length as 2 | 3;
    const text = stripMarkdownSyntax(match[2]);

    headings.push({
      id: createHeadingId(text),
      text,
      level,
    });
  }

  return headings;
}
