"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { FaqItem } from "@/lib/marketing/faq-data";

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
                {answer}
              </p>
            ))}
          </article>
        );
      })}
    </div>
  );
}
