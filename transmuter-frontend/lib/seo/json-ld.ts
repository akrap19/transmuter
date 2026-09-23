import type { FaqGroup } from "@/lib/marketing/faq-data";
import type { GlossaryTerm } from "@/lib/marketing/glossary-data";
import {
  absoluteUrl,
  organizationId,
  organizationNode,
  siteName,
  websiteId,
} from "@/lib/seo/constants";

export function breadcrumbList(items: { name: string; path: string }[]) {
  return {
    "@type": "BreadcrumbList" as const,
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem" as const,
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function webPageNode(input: {
  path: string;
  name: string;
  description: string;
  webpageId?: string;
}) {
  const pageUrl = absoluteUrl(input.path);
  return {
    "@type": "WebPage" as const,
    "@id": input.webpageId ?? `${pageUrl}#webpage`,
    url: pageUrl,
    name: input.name,
    description: input.description,
    isPartOf: { "@id": websiteId },
    about: { "@id": organizationId },
    inLanguage: "en",
  };
}

export function homePageGraph(input: { name: string; description: string }) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      {
        "@type": "WebSite",
        "@id": websiteId,
        url: absoluteUrl("/"),
        name: siteName,
        publisher: { "@id": organizationId },
      },
      webPageNode({
        path: "/",
        name: input.name,
        description: input.description,
        webpageId: `${absoluteUrl("/")}#webpage`,
      }),
    ],
  };
}

export function marketingPageGraph(input: {
  path: string;
  name: string;
  description: string;
  breadcrumbs: { name: string; path: string }[];
}) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      webPageNode({
        path: input.path,
        name: input.name,
        description: input.description,
      }),
      breadcrumbList(input.breadcrumbs),
    ],
  };
}

export function faqAnswerText(answers: string[]): string {
  return answers.join(" ");
}

export function faqPageGraph(groups: FaqGroup[]) {
  const mainEntity = groups.flatMap((group) =>
    group.items.map((item) => ({
      "@type": "Question" as const,
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer" as const,
        text: faqAnswerText(item.answers),
      },
    })),
  );

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity,
  };
}

export function glossaryDefinedTermSet(terms: GlossaryTerm[]) {
  const glossaryUrl = absoluteUrl("/glossary");
  const termSetId = `${glossaryUrl}#terms`;

  return {
    "@type": "DefinedTermSet" as const,
    "@id": termSetId,
    name: "Transmuter glossary",
    url: glossaryUrl,
    hasDefinedTerm: terms.map((term) => ({
      "@type": "DefinedTerm" as const,
      "@id": `${glossaryUrl}#${term.id}`,
      name: term.title,
      description: term.body,
      url: `${glossaryUrl}#${term.id}`,
      inDefinedTermSet: { "@id": termSetId },
    })),
  };
}

export function glossaryPageGraph(input: { name: string; description: string }, terms: GlossaryTerm[]) {
  return {
    "@context": "https://schema.org",
    "@graph": [
      organizationNode(),
      webPageNode({
        path: "/glossary",
        name: input.name,
        description: input.description,
      }),
      breadcrumbList([
        { name: siteName, path: "/" },
        { name: "Glossary", path: "/glossary" },
      ]),
      glossaryDefinedTermSet(terms),
    ],
  };
}
