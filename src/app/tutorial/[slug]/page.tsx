import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { TutorialPage } from "@/components/tutorial-page";
import {
  getAllTutorials,
  getSidebarSections,
  getTutorialBySlug,
} from "@/lib/content";

type TutorialDetailPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export const dynamicParams = false;

export function generateStaticParams() {
  return getAllTutorials().map((tutorial) => ({
    slug: tutorial.slug,
  }));
}

export async function generateMetadata({
  params,
}: TutorialDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const tutorial = getTutorialBySlug(slug);

  if (!tutorial) {
    return {};
  }

  return {
    title: tutorial.title,
    description: tutorial.description,
  };
}

export default async function TutorialDetailPage({
  params,
}: TutorialDetailPageProps) {
  const { slug } = await params;
  const tutorial = getTutorialBySlug(slug);

  if (!tutorial) {
    notFound();
  }

  return (
    <TutorialPage tutorial={tutorial} sections={getSidebarSections()} />
  );
}
