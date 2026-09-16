import type { AccessFormValues } from "@/lib/access-schema";
import { intentLabels, type IntentValue } from "@/lib/access-schema";

function formatIntent(intents: IntentValue[]) {
  return intents.map((intent) => intentLabels[intent]).join(", ");
}

function orDash(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : "—";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

export function buildAccessRequestSubject(values: AccessFormValues) {
  return `Transmuter access request — ${values.email}`;
}

export function buildAccessRequestHtml(values: AccessFormValues) {
  const rows = [
    ["Name", orDash(values.name)],
    ["Email", values.email],
    ["Intent", formatIntent(values.intent)],
    ["Project or @handle", orDash(values.project)],
    ["What draws them to Transmuter", orDash(values.why)],
  ];

  const tableRows = rows
    .map(
      ([label, value]) =>
        `<tr><td style="padding:8px 12px;border:1px solid #ddd;font-weight:600;">${escapeHtml(label)}</td><td style="padding:8px 12px;border:1px solid #ddd;">${escapeHtml(value)}</td></tr>`,
    )
    .join("");

  return `
    <h2>New Transmuter access request</h2>
    <p>Someone submitted the early access form.</p>
    <table style="border-collapse:collapse;width:100%;max-width:640px;">${tableRows}</table>
    <p style="margin-top:16px;color:#666;font-size:13px;">Reply directly to this email to reach the applicant.</p>
  `;
}

export function buildAccessRequestText(values: AccessFormValues) {
  return [
    "New Transmuter access request",
    "",
    `Name: ${orDash(values.name)}`,
    `Email: ${values.email}`,
    `Intent: ${formatIntent(values.intent)}`,
    `Project or @handle: ${orDash(values.project)}`,
    `What draws them to Transmuter: ${orDash(values.why)}`,
  ].join("\n");
}
