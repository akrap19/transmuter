"use client";

import Link from "next/link";
import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FaqItem } from "@/lib/marketing/faq-data";
import { routes } from "@/lib/routes";

type FaqListProps = {
  items: FaqItem[];
};

export function FaqList({ items }: FaqListProps) {
  const [open, setOpen] = useState<number[]>([0]);

  function toggle(index: number) {
    setOpen((current) =>
      current.includes(index) ? current.filter((item) => item !== index) : [...current, index],
    );
  }

  return (
    <div className="faq-list" data-faq="">
      {items.map((item, index) => {
        const isOpen = open.includes(index);

        return (
          <article className={cn("faq-item", isOpen && "open")} key={item.question}>
            <h3 className="faq-heading">
              <button
                aria-expanded={isOpen}
                className="faq-question"
                type="button"
                onClick={() => toggle(index)}
              >
                <span>{item.question}</span>
                <i aria-hidden />
              </button>
            </h3>
            {item.answers.map((answer) => (
              <p className={cn("faq-answer", item.answers[0] !== answer && "faq-answer-extra")} key={answer}>
                <FaqAnswer text={answer} />
              </p>
            ))}
          </article>
        );
      })}
    </div>
  );
}

function FaqAnswer({ text }: { text: string }) {
  const parts = text.split("/docs");
  if (parts.length === 1) return text;

  return parts.map((part, index) => (
    <span key={`${index}-${part}`}>
      {part}
      {index < parts.length - 1 ? <Link href={routes.docs}>/docs</Link> : null}
    </span>
  ));
}
