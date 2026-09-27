"use client";

import { useState, type FormEvent } from "react";
import { teamEmail } from "@/lib/routes";

const intents = [
	{ value: "launch", label: "Launch a token" },
	{ value: "trade", label: "Trade and hold" },
	{ value: "invest", label: "Invest" },
	{ value: "explore", label: "Just exploring" },
] as const;

export function BetaForm() {
	const [intent, setIntent] = useState<(typeof intents)[number]["value"]>("launch");

	function onSubmit(event: FormEvent<HTMLFormElement>) {
		event.preventDefault();
		const data = new FormData(event.currentTarget);
		const body = [
			`Name: ${String(data.get("name") || "")}`,
			`Email: ${String(data.get("email") || "")}`,
			`I am here to: ${intents.find((item) => item.value === intent)?.label ?? intent}`,
			`Project or handle: ${String(data.get("project") || "")}`,
			`What draws you to Transmuter: ${String(data.get("why") || "")}`,
		].join("\n");
		const href = `mailto:${teamEmail}?subject=${encodeURIComponent("Beta testing")}&body=${encodeURIComponent(body)}`;
		window.location.href = href;
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
					<span>I am here to</span>
					<div className="seg">
						{intents.map((item) => (
							<button
								className={`segopt${intent === item.value ? " selected" : ""}`}
								key={item.value}
								type="button"
								onClick={() => setIntent(item.value)}
							>
								<span className="dot" />
								{item.label}
							</button>
						))}
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
				<button className="btn btn-gold" type="submit">
					Request access
				</button>
			</div>
			<p className="access-note">Closed beta. We will only use this to contact you about access.</p>
		</form>
	);
}
