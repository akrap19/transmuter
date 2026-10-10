"use client";

import { BACKING_ASSETS, basketIsComplete, basketTotal, type BackingAsset } from "@/lib/launchpad/backing-basket";
import { useLaunchpad } from "../launchpad-context";

export function BackingBasket() {
  const { state, setBackingWeight } = useLaunchpad();
  const { backingBasket } = state;
  const total = basketTotal(backingBasket);
  const complete = basketIsComplete(backingBasket);
  const weightOf = (asset: BackingAsset) => backingBasket.find((leg) => leg.asset === asset)?.weight ?? 0;
  const barScale = total > 100 ? 100 / total : 1;

  return (
    <div className="alloc-section">
      {BACKING_ASSETS.map((meta) => (
        <div className="alloc-row" key={meta.asset}>
          <span className="alloc-label">
            <span className="backing-asset-icon">{meta.asset === "SOL" ? <SolanaMark /> : meta.icon}</span>
            {meta.label}
          </span>
          <div className="alloc-slider-wrap">
            <input
              type="range"
              min={0}
              max={100}
              value={weightOf(meta.asset)}
              onChange={(e) => setBackingWeight(meta.asset, parseInt(e.target.value))}
            />
          </div>
          <span className="alloc-value">{weightOf(meta.asset)}%</span>
        </div>
      ))}
      <div className="alloc-summary">
        <span className="field-label">Split</span>
        <div className="alloc-bar">
          {backingBasket.map((leg) => (
            <div className="alloc-bar-seg" key={leg.asset} style={{ width: `${leg.weight * barScale}%` }} />
          ))}
        </div>
        <div className={`alloc-total${complete ? "" : " over"}`}>Total {total}%</div>
      </div>
      {complete ? null : (
        <p className="fee-budget-warning" role="alert">
          Overall backing must be 100%.
        </p>
      )}
    </div>
  );
}

function SolanaMark() {
  return (
    <svg className="solana-mark" viewBox="0 0 398 312" aria-hidden="true">
      <defs>
        <linearGradient id="csol-basket-solana" x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#9945FF" />
          <stop offset="50%" stopColor="#7961F2" />
          <stop offset="100%" stopColor="#14F195" />
        </linearGradient>
      </defs>
      <g fill="url(#csol-basket-solana)">
        <path d="M64.6 237.9c2.4-2.4 5.7-3.8 9.2-3.8h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1l62.7-62.7z" />
        <path d="M64.6 3.8C67.1 1.4 70.4 0 73.8 0h317.4c5.8 0 8.7 7 4.6 11.1l-62.7 62.7c-2.4 2.4-5.7 3.8-9.2 3.8H6.5c-5.8 0-8.7-7-4.6-11.1L64.6 3.8z" />
        <path d="M333.1 120.1c-2.4-2.4-5.7-3.8-9.2-3.8H6.5c-5.8 0-8.7 7-4.6 11.1l62.7 62.7c2.4 2.4 5.7 3.8 9.2 3.8h317.4c5.8 0 8.7-7 4.6-11.1l-62.7-62.7z" />
      </g>
    </svg>
  );
}
