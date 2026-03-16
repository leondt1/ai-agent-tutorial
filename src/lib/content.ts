import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

import { extractMarkdownHeadings, type MarkdownHeading } from "@/lib/markdown";

const contentDirectory = path.join(process.cwd(), "content", "tutorials");

type TutorialFrontmatter = {
  title: string;
  description: string;
  section: string;
  sectionTitle: string;
  sectionColor: string;
  sectionOrder: number;
  order: number;
  code: string;
  tag: string;
  quote?: string;
  toolCount?: number;
};

export type Tutorial = TutorialFrontmatter & {
  slug: string;
  href: string;
  content: string;
  headings: MarkdownHeading[];
  loc: number;
  readingMinutes: number;
};

export type SidebarSection = {
  key: string;
  title: string;
  color: string;
  lessons: Array<{
    slug: string;
    href: string;
    code: string;
    title: string;
  }>;
};

function getMarkdownFiles() {
  return fs
    .readdirSync(contentDirectory)
    .filter((fileName) => fileName.endsWith(".md"));
}

function countLoc(content: string) {
  return content.split("\n").filter((line) => line.trim().length > 0).length;
}

function estimateReadingMinutes(content: string) {
  const normalized = content.replace(/\s+/g, "");
  return Math.max(1, Math.round(normalized.length / 420));
}

export function getAllTutorials(): Tutorial[] {
  return getMarkdownFiles()
    .map((fileName) => {
      const slug = fileName.replace(/\.md$/, "");
      const source = fs.readFileSync(path.join(contentDirectory, fileName), "utf8");
      const { data, content } = matter(source);
      const frontmatter = data as TutorialFrontmatter;

      return {
        ...frontmatter,
        slug,
        href: `/tutorial/${slug}`,
        content,
        headings: extractMarkdownHeadings(content),
        loc: countLoc(content),
        readingMinutes: estimateReadingMinutes(content),
      };
    })
    .sort((a, b) => {
      if (a.sectionOrder !== b.sectionOrder) {
        return a.sectionOrder - b.sectionOrder;
      }

      return a.order - b.order;
    });
}

export function getTutorialBySlug(slug: string) {
  return getAllTutorials().find((tutorial) => tutorial.slug === slug);
}

export function getPrimaryTutorial() {
  const tutorials = getAllTutorials();

  if (tutorials.length === 0) {
    throw new Error("No tutorial markdown files were found in content/tutorials.");
  }

  return tutorials[0];
}

export function getSidebarSections(): SidebarSection[] {
  const grouped = new Map<string, SidebarSection>();

  for (const tutorial of getAllTutorials()) {
    if (!grouped.has(tutorial.section)) {
      grouped.set(tutorial.section, {
        key: tutorial.section,
        title: tutorial.sectionTitle,
        color: tutorial.sectionColor,
        lessons: [],
      });
    }

    grouped.get(tutorial.section)?.lessons.push({
      slug: tutorial.slug,
      href: tutorial.href,
      code: tutorial.code,
      title: tutorial.title,
    });
  }

  return Array.from(grouped.values());
}
