"use client";

import { useState, type FormEvent } from "react";
import { intentLabels, type IntentValue } from "@/lib/access-schema";
import { toastError, toastSuccess } from "@/lib/toast";

const intents = (Object.entries(intentLabels) as [IntentValue, string][]).map(([value, label]) => ({ value, label }));

export function BetaForm() {
	const [selected, setSelected] = useState<IntentValue[]>([]);
	const [sending, setSending] = useState(false);
	const [sent, setSent] = useState(false);

	function toggleIntent(value: IntentValue) {
		setSelected((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]));
	}

	async function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		if (selected.length === 0) {
			toastError("Pick at least one reason you are here.");
			return;
		}
		const data = new FormData(event.currentTarget);
		setSending(true);
		try {
			const response = await fetch("/api/access/", {
				method: "POST",
				headers: { Accept: "application/json", "Content-Type": "application/json" },
				body: JSON.stringify({
					name: String(data.get("name") || ""),
					email: String(data.get("email") || ""),
					intent: selected,
					project: String(data.get("project") || ""),
					why: String(data.get("why") || ""),
				}),
			});
			const payload = (await response.json().catch(() => null)) as { error?: string } | null;
			if (!response.ok) {
				toastError(payload?.error ?? "Could not send your request. Please try again.");
				return;
			}
			toastSuccess("Request sent. We will reach out when a spot opens.");
			setSent(true);
		} catch {
			toastError("Could not send your request. Please try again.");
		} finally {
			setSending(false);
		}
	}

	if (sent) {
		return (
			<div className="show" id="success">
				<div className="check">✓</div>
				<h3>You are on the list</h3>
				<p>Thanks for putting your name in early. We onboard in small waves and will reach out as soon as a spot opens for you.</p>
			</div>
		);
	}

	return (
		<form className="access-form" onSubmit={onSubmit}>
			<div id="formInner">
				<label className="field">
					<span>
						Name <em>(optional)</em>
					</span>
					<input autoComplete="name" name="name" placeholder="How should we call you" />
				</label>
				<label className="field">
					<span>
						Email <em className="req">*</em>
					</span>
					<input autoComplete="email" name="email" placeholder="you@domain.com" required type="email" />
				</label>
				<div className="field">
					<span id="intent-label">
						I am here to <em className="req">*</em>
					</span>
					<div aria-labelledby="intent-label" className="seg" role="group">
						{intents.map((item) => {
							const pressed = selected.includes(item.value);
							return (
								<button
									aria-pressed={pressed}
									className={`segopt${pressed ? " selected" : ""}`}
									key={item.value}
									type="button"
									onClick={() => toggleIntent(item.value)}
								>
									<span className="dot" />
									{item.label}
								</button>
							);
						})}
					</div>
				</div>
				<label className="field">
					<span>
						Project or @handle <em>(optional)</em>
					</span>
					<input name="project" placeholder="Your project, X handle, or website" />
				</label>
				<label className="field">
					<span>
						What draws you to Transmuter? <em>(optional)</em>
					</span>
					<textarea name="why" placeholder="A line or two helps us prioritise the waves" rows={4} />
				</label>
				<button className="btn btn-gold" disabled={sending} type="submit">
					{sending ? "Sending..." : "Request access"}
				</button>
			</div>
			<p className="access-note">Closed beta. We will only use this to contact you about access.</p>
		</form>
	);
}
