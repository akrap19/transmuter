export function LifecycleChart() {
	return (
		<section aria-labelledby='chart-title' className='chart-section section-shell reveal'>
			<div className='lifecycle-chart-card'>
				<div className='chart-topline'>
					<span>TOKEN LIFECYCLE</span>
					<span className='live-pill'>
						<i /> ON-CHAIN
					</span>
				</div>
				<svg aria-labelledby='chart-title chart-desc' className='hero-chart' role='img' viewBox='0 0 1040 500'>
					<title id='chart-title'>Market value and reserves across a token lifecycle</title>
					<desc id='chart-desc'>
						Market value moves above a reserve line that changes only when reserves or supply change.
					</desc>
					<defs>
						<linearGradient id='goldFade' x1='0' x2='0' y1='0' y2='1'>
							<stop offset='0%' stopColor='#d8ad59' stopOpacity='.3' />
							<stop offset='100%' stopColor='#d8ad59' stopOpacity='0' />
						</linearGradient>
						<linearGradient id='whiteFade' x1='0' x2='0' y1='0' y2='1'>
							<stop offset='0%' stopColor='#f3efe4' stopOpacity='.11' />
							<stop offset='100%' stopColor='#f3efe4' stopOpacity='0' />
						</linearGradient>
					</defs>
					<g className='grid-lines'>
						<line x1='70' x2='970' y1='95' y2='95' />
						<line x1='70' x2='970' y1='190' y2='190' />
						<line x1='70' x2='970' y1='285' y2='285' />
						<line x1='70' x2='970' y1='380' y2='380' />
					</g>
					<path
						className='market-area'
						d='M72 327 C137 225 195 281 258 198 C322 116 374 166 436 123 C498 82 548 145 608 167 C675 193 732 138 791 218 C849 293 902 315 968 333 L968 406 L72 406 Z'
					/>
					<path
						className='market-line'
						d='M72 327 C137 225 195 281 258 198 C322 116 374 166 436 123 C498 82 548 145 608 167 C675 193 732 138 791 218 C849 293 902 315 968 333'
						pathLength='1'
					/>
					<path
						className='reserve-area'
						d='M72 365 C210 359 328 350 444 335 C579 317 719 292 968 252 L968 406 L72 406 Z'
					/>
					<path className='reserve-line' d='M72 365 C210 359 328 350 444 335 C579 317 719 292 968 252' pathLength='1' />
					<g className='chart-label label-market'>
						<rect height='38' rx='19' width='155' x='708' y='154' />
						<text textAnchor='middle' x='785' y='178'>
							MARKET VALUE
						</text>
					</g>
					<g className='chart-label label-reserve'>
						<rect height='38' rx='19' width='138' x='688' y='283' />
						<text textAnchor='middle' x='757' y='307'>
							RESERVES
						</text>
					</g>
					<g className='eol-marker'>
						<line x1='906' x2='906' y1='75' y2='406' />
						<circle cx='906' cy='264' r='7' />
						<text textAnchor='middle' x='906' y='57'>
							RECOVERY READY
						</text>
					</g>
				</svg>
				<div className='chart-caption'>
					<span>Launch</span>
					<span>Build</span>
					<span>Trade</span>
					<span>Recover</span>
				</div>
			</div>
			<p className='chart-explainer'>
				Market value moves freely. The reserve line changes only when backing or supply changes.
			</p>
			<div className='hero-scroll chart-scroll'>
				<span>SCROLL THROUGH THE LIFECYCLE</span>
			</div>
		</section>
	)
}
