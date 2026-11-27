const MARKET_PATH =
	"M5.3 218.9 C27.9 184.2, 59.5 163.2, 85.8 144.7 C112.1 126.3, 122.6 100, 143.7 81.6 C164.7 65.8, 191.1 63.2, 212.1 57.9 C233.2 52.6, 241.1 31.6, 270 28.4 C296.3 26.3, 322.6 63.2, 354.2 81.6 C370 89.5, 391.1 89.5, 412.1 87.9 C438.4 86.3, 454.2 102.6, 470 115.8 C491.1 122.1, 533.2 127.4, 584.2 127.9";
const RESERVE_PATH =
	"M5.3 243.7 C40 241.8, 72 238.4, 109.5 236.8 C140 235.4, 176 226.2, 214.7 214.7 C235 208.4, 252 199.8, 270 196 C285 192.6, 296 204.2, 310 206.8 C331 210.6, 356 199.4, 380 180 C390 172.2, 396.4 168.2, 404.2 167.4 C430 163.2, 456 155.2, 480 150 C494 147, 500 166.8, 515 165.4 C528 164.2, 535 144.6, 543.7 141 C560 135.2, 572.4 132.2, 584.2 131.6";

export function LifecycleChart() {
	return (
		<section aria-labelledby="chart-title" className="chart-section section-shell reveal">
			<div className="lifecycle-chart-card">
				<div className="chart-topline">
					<span>TOKEN LIFECYCLE</span>
					<span className="live-pill">
						<i /> ON-CHAIN
					</span>
				</div>
				<svg aria-labelledby="chart-title chart-desc" className="hero-chart hero-chart-v2" role="img" viewBox="0 0 590 280">
					<title id="chart-title">Market value and redemption value across a token lifecycle</title>
					<desc id="chart-desc">
						The redemption value per token rises with fees, burns and Mint to Scale, and can fall when people
						sell above it or when the reserve assets drop in price.
					</desc>
					<defs>
						<linearGradient id="goldFade" x1="0" x2="0" y1="0" y2="1">
							<stop offset="0%" stopColor="#d8ad59" stopOpacity=".3" />
							<stop offset="100%" stopColor="#d8ad59" stopOpacity="0" />
						</linearGradient>
						<linearGradient id="whiteFade" x1="0" x2="0" y1="0" y2="1">
							<stop offset="0%" stopColor="#f3efe4" stopOpacity=".11" />
							<stop offset="100%" stopColor="#f3efe4" stopOpacity="0" />
						</linearGradient>
					</defs>
					<g className="grid-lines">
						<line x1="5.3" x2="584.2" y1="11.6" y2="11.6" />
						<line x1="5.3" x2="584.2" y1="91.1" y2="91.1" />
						<line x1="5.3" x2="584.2" y1="171.1" y2="171.1" />
						<line x1="5.3" x2="584.2" y1="250.5" y2="250.5" />
					</g>
					<path className="market-area" d={`${MARKET_PATH} L584.2 273.7 L5.3 273.7 Z`} />
					<path className="reserve-area" d={`${RESERVE_PATH} L584.2 273.7 L5.3 273.7 Z`} />
					<g className="eol-marker">
						<line x1="543.7" x2="543.7" y1="27.4" y2="276.3" />
						<text textAnchor="end" x="539.5" y="17.4">
							END OF LIFE
						</text>
					</g>
					<g aria-hidden className="mint-events">
						<MintEvent delayRule="0.45s" delayDot="0.7s" x="109.5" y="236.8" ruleTop="233.2" radius="3.4" />
						<MintEvent
							delayRule="0.58s"
							delayDot="0.83s"
							delayLabel="0.93s"
							x="214.7"
							y="214.7"
							ruleTop="169.5"
							radius="4.4"
							label="MINT TO SCALE"
						/>
						<MintEvent delayRule="0.91s" delayDot="1.16s" x="404.2" y="167.4" ruleTop="163.7" radius="4.4" />
					</g>
					<path className="market-line" d={MARKET_PATH} pathLength="1" />
					<path className="reserve-line" d={RESERVE_PATH} pathLength="1" />
					<g className="eol-marker eol-dot">
						<circle cx="543.7" cy="141" r="6.2" />
					</g>
					<circle aria-hidden className="chart-tracer market-tracer" r="2.6">
						<animateMotion dur="7.5s" path={MARKET_PATH} repeatCount="indefinite" />
					</circle>
					<circle aria-hidden className="chart-tracer reserve-tracer" r="2.9">
						<animateMotion dur="6.2s" path={RESERVE_PATH} repeatCount="indefinite" />
					</circle>
					<g className="chart-label label-market">
						<rect height="32" rx="16" width="122" x="407.9" y="75.1" />
						<text textAnchor="middle" x="468.9" y="95.6">
							MARKET VALUE
						</text>
					</g>
					<g className="chart-label label-reserve">
						<rect height="32" rx="16" width="162" x="355.3" y="194" />
						<text textAnchor="middle" x="436.3" y="214.5">
							REDEMPTION VALUE
						</text>
					</g>
				</svg>
				<div className="chart-caption">
					<span>Launch</span>
					<span>Build</span>
					<span>Trade</span>
					<span>End of life</span>
				</div>
			</div>
			<p className="chart-explainer">
				Redemption value rises with fees, burns and Mint to Scale, and can fall when people sell above it or the
				reserve assets drop in price.
			</p>
			<div className="hero-scroll chart-scroll">
				<span>SCROLL THROUGH THE LIFECYCLE</span>
			</div>
		</section>
	);
}

function MintEvent({
	x,
	y,
	ruleTop,
	radius,
	delayRule,
	delayDot,
	delayLabel,
	label,
}: {
	x: string;
	y: string;
	ruleTop: string;
	radius: string;
	delayRule: string;
	delayDot: string;
	delayLabel?: string;
	label?: string;
}) {
	return (
		<g className="mint-event">
			<line className="mint-rule" style={{ animationDelay: delayRule }} x1={x} x2={x} y1={ruleTop} y2="276.3" />
			<circle className="mint-dot" style={{ animationDelay: delayDot }} cx={x} cy={y} r={radius} />
			{label ? (
				<text className="mint-label" style={{ animationDelay: delayLabel }} textAnchor="middle" x={x} y="165.3">
					{label}
				</text>
			) : null}
		</g>
	);
}
