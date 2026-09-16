import { z } from "zod";

const intentValues = ["launch", "trade", "invest", "explore"] as const;

export type IntentValue = (typeof intentValues)[number];

export const accessFormSchema = z.object({
  name: z.string().optional(),
  email: z.string().email("Enter a valid email address"),
  intent: z
    .array(z.enum(intentValues))
    .min(1, "Select at least one option"),
  project: z.string().optional(),
  why: z.string().optional(),
});

export type AccessFormValues = z.infer<typeof accessFormSchema>;

export const intentLabels: Record<IntentValue, string> = {
  launch: "Launch a token",
  trade: "Trade and hold",
  invest: "Invest",
  explore: "Just exploring",
};

export const accessFormDefaults: AccessFormValues = {
  name: "",
  email: "",
  intent: [],
  project: "",
  why: "",
};
