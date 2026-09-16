import { NextResponse } from "next/server";
import { accessFormSchema } from "@/lib/access-schema";
import {
  buildAccessRequestHtml,
  buildAccessRequestSubject,
  buildAccessRequestText,
} from "@/lib/access-mail";
import { getMailConfig } from "@/lib/mail-transport";

export async function POST(request: Request) {
  const mailConfig = getMailConfig();
  if (!mailConfig) {
    console.error(
      "Access form mail is not configured. Set SMTP_HOST, SMTP_USER, SMTP_PASS, and ACCESS_FORM_TO_EMAIL.",
    );
    return NextResponse.json(
      { error: "The access form is not configured yet. Please try again later." },
      { status: 503 },
    );
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const parsed = accessFormSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Please check the form and try again." }, { status: 400 });
  }

  const values = parsed.data;

  try {
    await mailConfig.transport.sendMail({
      from: mailConfig.fromEmail,
      to: mailConfig.toEmail,
      replyTo: values.email,
      subject: buildAccessRequestSubject(values),
      html: buildAccessRequestHtml(values),
      text: buildAccessRequestText(values),
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Access form mail failed", error);
    return NextResponse.json(
      { error: "Could not send your request. Please try again." },
      { status: 502 },
    );
  }
}
