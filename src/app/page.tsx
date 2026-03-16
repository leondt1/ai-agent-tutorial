import { TutorialPage } from "@/components/tutorial-page";
import { getPrimaryTutorial, getSidebarSections } from "@/lib/content";

export default function Home() {
  const tutorial = getPrimaryTutorial();
  const sections = getSidebarSections();

  return <TutorialPage tutorial={tutorial} sections={sections} />;
}
