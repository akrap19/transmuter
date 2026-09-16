"use client";

import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { GoldButton } from "@/components/transmuter/gold-button";
import {
  accessFormDefaults,
  accessFormSchema,
  intentLabels,
  type AccessFormValues,
  type IntentValue,
} from "@/lib/access-schema";

const intentOptions = (
  Object.entries(intentLabels) as [IntentValue, string][]
).map(([value, label]) => ({ value, label }));

function toggleIntent(current: IntentValue[], value: IntentValue) {
  if (current.includes(value)) {
    return current.filter((item) => item !== value);
  }
  return [...current, value];
}

export function AccessForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const form = useForm<AccessFormValues>({
    resolver: zodResolver(accessFormSchema),
    defaultValues: accessFormDefaults,
  });

  async function onSubmit(values: AccessFormValues) {
    setSubmitError(null);

    try {
      const response = await fetch("/api/access", {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;

      if (!response.ok) {
        setSubmitError(payload?.error ?? "Could not send your request. Please try again.");
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitError("Could not send your request. Please try again.");
    }
  }

  if (submitted) {
    return (
      <div id="success" className="show">
        <div className="check">✓</div>
        <h3>You are on the list</h3>
        <p>
          Thanks for putting your name in early. We onboard in small waves and
          will reach out as soon as a spot opens for you.
        </p>
      </div>
    );
  }

  return (
    <Form {...form}>
      <form id="accessForm" onSubmit={form.handleSubmit(onSubmit)}>
        <div id="formInner">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem className="field">
                <FormLabel htmlFor="name">
                  Name <span style={{ color: "#566070" }}>(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id="name"
                    className="inp"
                    placeholder="How should we call you"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem className="field">
                <FormLabel htmlFor="email">
                  Email <span className="req">*</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id="email"
                    type="email"
                    className="inp"
                    placeholder="you@domain.com"
                    required
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="intent"
            render={({ field }) => (
              <FormItem className="field">
                <FormLabel>I am here to</FormLabel>
                <div className="seg">
                  {intentOptions.map((option) => {
                    const selected = field.value.includes(option.value);

                    return (
                      <button
                        key={option.value}
                        type="button"
                        className={`segopt${selected ? " selected" : ""}`}
                        aria-pressed={selected}
                        onClick={() =>
                          field.onChange(toggleIntent(field.value, option.value))
                        }
                      >
                        <span className="dot" />
                        {option.label}
                      </button>
                    );
                  })}
                </div>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="project"
            render={({ field }) => (
              <FormItem className="field">
                <FormLabel htmlFor="project">
                  Project or @handle{" "}
                  <span style={{ color: "#566070" }}>(optional)</span>
                </FormLabel>
                <FormControl>
                  <Input
                    {...field}
                    id="project"
                    className="inp"
                    placeholder="Your project, X handle, or website"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="why"
            render={({ field }) => (
              <FormItem className="field">
                <FormLabel htmlFor="why">
                  What draws you to Transmuter?{" "}
                  <span style={{ color: "#566070" }}>(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    {...field}
                    id="why"
                    className="inp"
                    placeholder="A line or two helps us prioritise the waves"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <GoldButton
            type="submit"
            className="btn-gold full"
            disabled={form.formState.isSubmitting}
          >
            {form.formState.isSubmitting ? "Sending..." : "Request access"}
          </GoldButton>
          {submitError ? <p className="form-error">{submitError}</p> : null}
          <p className="form-note">
            Closed beta. We will only use this to contact you about access.
          </p>
        </div>
      </form>
    </Form>
  );
}
