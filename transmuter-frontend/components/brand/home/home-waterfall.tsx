import { WaterfallCopy } from "@/components/brand/home/waterfall-copy";
import { WaterfallVisual } from "@/components/brand/home/waterfall-visual";

export function HomeWaterfall() {
  return (
    <section aria-labelledby="lifecycle-title" className="how-overview section-shell reveal homepage-waterfall" id="lifecycle">
      <div className="how-overview-head">
        <p className="eyebrow">THE FLOW</p>
        <h2 id="lifecycle-title">Scroll through the token lifecycle.</h2>
        <p>Scroll from launch to recovery and see what changes at each stage.</p>
      </div>
      <div className="waterfall-story" data-waterfall-story="">
        <div className="waterfall-sticky">
          <WaterfallVisual />
        </div>
        <WaterfallCopy />
      </div>
    </section>
  );
}
