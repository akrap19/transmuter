import type { FaqItem } from "@/lib/marketing/faq-data";
import { faqGroups } from "@/lib/marketing/faq-data";

const homeQuestionIds = [
  "What is Transmuter?",
  "Can Transmuter access project funds or critical financial functions?",
  "Can a team take the money and disappear?",
  "What are the limits of the system?",
] as const;

function findFaqItem(question: (typeof homeQuestionIds)[number]): FaqItem {
  for (const group of faqGroups) {
    const item = group.items.find((entry) => entry.question === question);
    if (item) return item;
  }
  throw new Error(`Missing FAQ item for homepage: ${question}`);
}

/** Same copy as `/faq` so crawlers and answer engines see one canonical wording. */
export const homeFaqs: FaqItem[] = homeQuestionIds.map((question) => findFaqItem(question));
