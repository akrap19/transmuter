/* eslint-disable */
// Value calculator runtime, ported from the standalone prototype.
// It renders into the host node and returns a cleanup for document listeners.
export function mountValueCalculator(root) {
  const cleanups = [];
  const $ = (id) => root.querySelector("#" + id);

const TREAS_MIN=0.10;
// Redemption is charged at the token's own fee rate, so these are set by model() from the
// configured fees rather than fixed. Of whatever the rate is, 0.30% leaves the token (0.20% to
// Transmuter, 0.10% to the DAO) and everything above that stays in the reserves. The rule is the
// highest rate of the trailing 12 months; this model has one rate for a token's whole life, so
// the configured rate IS that highest rate. If per-period fee changes are ever added, this is
// where the trailing maximum has to be worked out instead.
let REDEEM_FEE=0.006;     // total charged on a redemption, as a fraction
let REDEEM_RETAIN=0.003;  // the part of it that stays in the reserves
const MAX_MINTS=10;
// Log-axis ticks. The old code stepped in whole decades, so a chart whose whole
// range sat between two powers of ten (a token at $0.002 to $0.008, say) drew no
// labels at all. This walks 1/1.5/2/3/5/7 within each decade and thins to `want`.
function logTicks(lo,hi,want){
  want=want||5;
  if(!(lo>0)||!(hi>0)||hi<=lo) return [];
  const mults=[1,1.5,2,3,5,7], all=[];
  for(let e=Math.floor(Math.log10(lo))-1;e<=Math.ceil(Math.log10(hi))+1;e++)
    for(let j=0;j<mults.length;j++){
      const v=mults[j]*Math.pow(10,e);
      if(v>=lo&&v<=hi) all.push(v);
    }
  if(!all.length) return [lo,Math.sqrt(lo*hi),hi];
  if(all.length<=want) return all;
  const out=[], step=(all.length-1)/(want-1);
  for(let i=0;i<want;i++) out.push(all[Math.round(i*step)]);
  return out.filter(function(v,i,a){ return a.indexOf(v)===i; });
}
function axLabel(v){
  if(v>=1) return '$'+v.toLocaleString('en-GB',{maximumFractionDigits:2});
  const d=Math.min(8,Math.max(2,Math.ceil(-Math.log10(v))+1));
  return '$'+v.toFixed(d);
}

// A reserve mint is a sale, not an instant event, so it executes over MINT_WEEKS weeks in equal
// tranches. One week produced a vertical step in the reserve line; two makes it a ramp, and it is
// closer to how the sale would actually clear.
const MINT_WEEKS=1;   // one mint is ONE event. At 2 the second tranche was sized off the
                     // supply the first tranche had already grown, so a 10% mint delivered 10.25%.
function mintSchedule(weeks){
  const sched={};
  weeks.forEach(function(w){
    for(let i=0;i<MINT_WEEKS;i++){
      sched[w+i]=(sched[w+i]||0)+1/MINT_WEEKS;
    }
  });
  return sched;
}
let MINTS=[];       // the SET of prices mints happen at. Click order is NOT execution order:
                    // they always run low price to high, so the same set of mints always
                    // produces the same result no matter how they were added or removed.
// Mints always run in price order, low to high. Every table and chart is ordered by
// time, and price order is time order on all of them, so there is nothing to choose.
function mintSequence(){
  return MINTS.slice().sort(function(x,y){return x-y;});
}
// Events placed by clicking a row in the table. Each is {price, type:'mint'|'redeem', pct, tok}.
// MINTS is kept as the plain list of mint prices so the sequencing code is untouched.
let TBL_EV=[];
function openTblMenu(price,tr,ev){
  const mn=$('evMenu'); if(!mn) return;
  const r=tr.getBoundingClientRect();
  TBL_PRICE=price; TBL_MODE=true; SOL_MODE=false;
  $('evHead').textContent='At '+px(price);
  $('evChoice').style.display='flex';
  $('evForm').style.display='none';
  mn.style.display='block';
  const mw=mn.offsetWidth||230;
  mn.style.left=Math.max(4,Math.min(ev.clientX-mw/2,window.innerWidth-mw-8))+'px';
  mn.style.top=Math.max(4,Math.min(r.top,window.innerHeight-mn.offsetHeight-8))+'px';
}
let TBL_PRICE=0, TBL_MODE=false, SOL_MODE=false;
function syncTbl(){ MINTS=TBL_EV.filter(function(e){return e.type==='mint';}).map(function(e){return e.price;}); }
function tblEvAt(p){ return TBL_EV.find(function(e){ return Math.abs(e.price-p)<1e-9; }); }
function redeemSequence(){
  return TBL_EV.filter(function(e){return e.type==='redeem';}).slice()
               .sort(function(x,y){return x.price-y.price;});
}
let VIEW='wind';   // 'wind' | 'gate' | 'path' | 'sol'
let SOURCE='launch';
let LIVE_FLOOR=0;
let FEES=true;         // trading-fee accrual, on by default; the Off/On buttons flip it
let DETAIL='simple';
   // 'simple' = the figures that decide things; 'full' = the whole waterfall   // which state the wind-down and gate tables read: 'launch' | 'sol' | 'path'

// The state the tables measure. 'launch' is the configured launch plus its lifetime fees and any mints
// placed in the table itself. The other two hand over the finished state of a simulated run, so mints
// placed on those charts carry through to the wind-down figures.
function effState(m){
  if(SOURCE==='sol' && typeof solWalk==='function'){
    const r=solWalkCached(m); const last=r.rows[r.rows.length-1];
    // months is what lets step 3 read the release schedules at the right moment. A null means
    // the state has no point in time, so the flat wind-down assumptions apply instead.
    // SPM, not WPM: a step is a day on SOL and a week on the memecoins, and dividing 2413 days
    // by the weekly constant reported 557 months, reading the schedules years past the end.
    if(last) return {supply:last.supply,k:last.k,treasury:last.treasury,endPrice:last.p,
                     months:r.rows.length/SPM,
                     label:histName()+' history to '+stepLabel(last.w),mints:r.log.length};
  }
  if(SOURCE==='path' && typeof walkPath==='function'){
    const r=walkPath(m); const last=r.rows[r.rows.length-1];
    if(last) return {supply:last.supply,k:last.k,treasury:last.treasury,endPrice:last.p,
                     months:r.rows.length/WPM,
                     label:'drawn path, week '+last.t,mints:r.log.length};
  }
  return {supply:m.supply,k:m.k,treasury:m.treasury, months:null,
          label:'launch parameters, no trading accrued',mints:m.mintLog.length};
}    // 'wind' = recovery at wind-down, 'gate' = live backing and the mint trigger

const HEAD_WIND=['Price','&Delta;','LP tok','%sup','LP cash','+ treas','= pot','\u2212 fees',
                 '+ escrow','payout','burnt','left','redeem live','redeem EOL','vs list','vs mkt'];
// The simple view drops the waterfall and shows what actually decides anything: what is behind the
// token, how much of the supply burns, and what a holder ends up with.
const HEAD_SIMPLE=['Price','&Delta;','total reserve','burnt','%sup burnt','backing ratio',
                   'reserve / tok','payout / tok','vs list','vs mkt'];   // superseded by headSimple()
// Two-row header: backing ratio and redemption each split into Live and EOL side by side.
const COLTIP={"total reserve": "Everything holders share at that price: the treasury, plus the pool’s cash, less the wind-down fee, plus whatever escrow comes back.", "burnt": "Tokens that stop existing at wind-down: the pool’s own tokens plus the team’s unvested allocation. <b>Investor tokens never burn.</b>", "%sup burnt": "That burn as a share of the supply standing at this price.", "backing ratio": "The redemption value measured against that row’s own market price. <b>live</b> is redeeming today. <b>EOL</b> is a full wind-down.", "redemption / tok": "The payout per token, spread across only the tokens that survive the burn. <b>live</b> has no burn and no escrow back, because none of that has happened yet; the fee is the same. <b>EOL</b> is the wind-down.", "vs list": "The payout compared to the listing price, so what a sale buyer gets back.", "vs mkt": "The payout compared to that row’s own price. Above 1.00x, buying there and redeeming is a profit anyone can take.", "LP tok": "Tokens the pool holds at that price.", "%sup": "Those pool tokens as a share of supply.", "LP cash": "Dollars the pool holds, which grows with the <b>square root</b> of price: 100x the price is only 10x the cash.", "+ treas": "The treasury, which does not move with price at all.", "= pot": "The pool’s cash and the treasury added together.", "− fees": "The wind-down fee taken off the pot. Nothing is sold at end of life, so there is no slippage here.", "+ escrow": "Added after the fee, because the clawback is paid back separately in USDC and the fee never touches it.", "payout": "What is left to share among the tokens that survive.", "left": "Everyone still holding a claim after the burn.", "redeem live": "What a holder gets redeeming today: no burn and no escrow back, but the same fee as a wind-down.", "redeem EOL": "What a holder gets in a full wind-down.", "market cap": "That row’s price times the supply standing there.", "reserves": "Treasury plus the pool’s cash: what a token can claim today.", "claimants": "Supply less the pool’s own tokens, which never claim anything.", "backing / tok": "Reserves over claimants, after the redemption fee.", "ratio": "That claim measured against the market price. The gate opens when it is low.", "gate": "Whether a reserve mint can fire at this price.", "accretion": "Price divided by backing per token, the exact inverse of the ratio. At 5x, every minted token adds five times its own claim to the reserves."};
// Attach a meaning to any header cell whose text we have a note for. v1 explained all of
// this in four paragraphs under the table, where it was read once and never again.
function tipAttr(label){
  const t=COLTIP[String(label).replace(/&Delta;/,'\u0394').replace(/<[^>]*>/g,'').trim()];
  return t?' data-tip="'+t.replace(/"/g,'&quot;')+'"':'';
}
function headSimple(){
  const c='class="lecol"', e='class="lecol lend"';
  return '<tr>'+
    '<th rowspan="2" style="text-align:left">Price</th><th rowspan="2">&Delta;</th>'+
    '<th rowspan="2"'+tipAttr('total reserve')+'>total reserve</th>'+
    '<th rowspan="2"'+tipAttr('burnt')+'>burnt</th>'+
    '<th rowspan="2"'+tipAttr('%sup burnt')+'>%sup burnt</th>'+
    '<th colspan="2" class="lehead"'+tipAttr('backing ratio')+'>backing ratio</th>'+
    '<th colspan="2" class="lehead"'+tipAttr('redemption / tok')+'>redemption / tok</th>'+
    '<th rowspan="2"'+tipAttr('vs list')+'>vs list</th>'+
    '<th rowspan="2"'+tipAttr('vs mkt')+'>vs mkt</th></tr>'+
    '<tr><th '+c+'>live</th><th '+e+'>EOL</th><th '+c+'>live</th><th '+e+'>EOL</th></tr>';
}
const HEAD_GATE=['Price','&Delta;','market cap','reserves','claimants','backing / tok',
                 'ratio','gate','accretion'];
const LEVELS=[1000,750,500,250,125,64,32,16,12,10,8,6,5,4,3,2.5,2,1.5,1.25,1.1,
              1,.9,.8,.7,.6,.5,.45,.4,.35,.3,.25,.2,.15,.1,.07,.05,.03,.02,.01];
// The other three presets were not tuned and gave misleading configurations. Pulled until the
// percentages are worked out properly; the shape below is all that is needed to add them back.
// ['label', sale%, liquidity%, team%, investors%, escrow, raise]
// ['label', sale%, liquidity%, team%, investors%, escrow, raise, avg daily volume in tenths of a %]
const PRESETS=[
 ['Serious project',65,15,20,0,1000000,2000000,40],
 ['With investors',50,15,20,15,1000000,2000000,40],
 ['Memecoin',55,40,5,0,0,7700,100]
];
// Rounding to whole thousands is fine for a $5M treasury and wrong for a memecoin: it turned
// $3,500 into "$4k", so a $6,500 raise printed as $3k of liquidity plus $4k of treasury, which
// is $500 more money than the launch ever had. Keep the real figure where the scale is small.
const money=n=>{
  if(!isFinite(n)) return '\u00b7';
  const a=Math.abs(n), s=n<0?'-':'';                // a negative amount keeps its sign
  if(a>=1e9) return s+'$'+(a/1e9).toFixed(2)+'B';   // $1.24B, not $1237.88M
  if(a>=1e6) return s+'$'+(a/1e6).toFixed(2)+'M';
  if(a>=1e5) return s+'$'+(a/1e3).toFixed(0)+'k';   // $100k+, whole thousands reads fine
  if(a>=1e4) return s+'$'+(a/1e3).toFixed(1)+'k';   // $10k to $100k, one decimal
  return s+'$'+Math.round(a).toLocaleString('en-GB'); // under $10k, exact
};
const num=n=>Math.round(n).toLocaleString('en-GB');
const pc=n=>(n*100).toFixed(1)+'%';
function px(v){
  if(!isFinite(v)) return '·';
  if(v===0) return '$0';
  if(v<0) return '-'+px(-v);
  if(v>=1000) return '$'+Math.round(v).toLocaleString('en-GB');
  if(v>=1)    return '$'+v.toFixed(2);
  if(v<1e-8)  return '<$0.00000001';   // too small to print; never round a real price to $0
  // below a dollar, add decimals rather than switching to exponent notation - $0.0062 reads,
  // $6.2e-3 does not.
  var d = v>=0.01 ? 4 : (v>=0.0001 ? 6 : 8);
  // a price never shows fewer than two decimals: $0.40, not $0.4
  return '$'+v.toFixed(d).replace(/(\.\d*?[1-9])0+$/,'$1').replace(/\.0+$/,'').replace(/^(0\.\d)$/,'$10').replace(/^(\d+\.\d)$/,'$10');
}

PRESETS.forEach(function(p){
  const b=document.createElement('button'); b.textContent=p[0];
  b.dataset.sle=p[1]; b.dataset.lp=p[2]; b.dataset.tm=p[3]; b.dataset.inv=p[4];
  b.dataset.es=p[5]; b.dataset.rz=p[6]; b.dataset.dv=p[7];
  b.onclick=function(){ $('sle').value=p[1]; $('lp').value=p[2]; $('tm').value=p[3];
    $('inv').value=p[4]; $('es').value=p[5]; $('rz').value=p[6]; $('dv').value=p[7]; run(); };
  $('presets').appendChild(b);
});

function model(){
  const S=Math.max(1,Math.round(+$('sup').value||1));   // a negative or empty supply reads as 1, never as NaN
  const salePct=+$('sle').value/100, lpPct=+$('lp').value/100;
  const teamPct=+$('tm').value/100, invPct=+$('inv').value/100;
  const unvPct=1;        // team vests from zero, so at listing none of it is vested
  const escrow=Math.max(0,+$('es').value||0), raise=Math.max(0,+$('rz').value||0);
  const mintPct=+$('ms').value/100, pSh=+$('psh').value/100, prem=+$('mp').value/100;
  // NO cTOKEN IN THIS VERSION. The treasury holds its reserve assets directly, and plain assets do
  // not gain backing on their own, so there is no growth rate to set.
  const lifeM=+$('life').value, dv=+$('dv').value/1000, apy=0;
  const feesOn=FEES;
  const feeT=feesOn?+$('ft').value/10000:0, feeL=feesOn?+$('fl').value/10000:0;
  // The venue's own swap fee, earned by whoever holds the liquidity. It accrues INSIDE the pool, so it
  // raises the pool's reserves rather than the treasury, and carries the pool's impermanent loss.
  const dexYield=feesOn?(+$('dx').value/10000)*(+$('ds').value/100):0;
  // The docs charge the wind-down payout at the TOKEN'S OWN RATE, so this follows the fee legs
  // rather than sitting on its own and drifting away from them. Fixed legs are 0.20% to
  // Transmuter and 0.10% to the DAO; the two creator legs are set under Trading life. At their
  // 0.15% minimums that gives 0.60%, and it rises with whatever the creator sets.
  const FIXED_LEGS=0.30;
  const feePct=FIXED_LEGS+(+$('ft').value + +$('fl').value)/100;
  const fee=feePct/100, slip=+$('sl').value/100;
  // A redemption pays the token's own rate. Everything downstream reads these two.
  REDEEM_FEE=fee;
  REDEEM_RETAIN=Math.max(0,fee-FIXED_LEGS/100);
  // whatever the initial release did not pay out is what comes back
  const udPct=1-Math.min(1,Math.max(0,+$('erUp').value/100));

  // The launchpad's solver: minimum raise that still leaves the treasury minimum standing.
  // denom is the share of the raise still free once liquidity and the treasury minimum are taken.
  // The requirement is raise x denom >= escrow, so at exactly zero the two consume the raise
  // precisely: that funds a launch with no escrow ask, and only fails if there is escrow to cover.
  // Floating point matters here. (0.25+0.10)/0.35 evaluates to 1.0000000000000002, so a sale set
  // exactly ten points above liquidity lands on -2.2e-16 rather than 0 and a strictly-positive
  // test threw out the one configuration that balances. Snap the dust to zero first.
  const denomRaw=1-(lpPct+TREAS_MIN)/salePct;
  const denom=Math.abs(denomRaw)<1e-9?0:denomRaw;
  // With escrow, the raise has to cover it after liquidity and the treasury minimum are taken.
  // Without escrow there is no minimum at all, because both of those scale with the raise itself.
  const minRaise = denom>0 ? (escrow>0?escrow/denom:0)
                 : (denom===0&&escrow<=0 ? 0 : Infinity);
  const feasible = denom>0 || (denom===0&&escrow<=0);

  const mcp=raise/salePct;
  // A zero or tiny raise must not poison every downstream figure with NaN. The verdict panel already
  // tells the user the launch is infeasible; the numbers just need to stay finite while it does.
  const p0=Math.max(mcp/S, 1e-12);
  // Allocations are shares of the ORIGINAL supply, so they stay fixed token counts. A reserve mint
  // adds supply on top: it never dilutes the pool's position or changes what burns.
  const lpTok=lpPct*S, lpCash=lpPct*mcp, k=lpTok*lpCash;
  // The raise arrives as USDC. Finalize checks run on that exact USDC (r53: conversion is not part
  // of finalize), then two swaps cost real money. The SOL side of the pools is bought with USDC
  // (default pool split 50% SOL, 50% stablecoin), and the extra the swap costs comes out of the
  // treasury so the pools still seed at the sale price. Then the treasury USDC is converted into
  // its basket (v1 legs are BTC and SOL, USDC optional; modelled here as fully converted).
  // 27 Nov: after launch the reserves are modelled as stablecoins (they never
  // reprice). The conversion cost stays in as a launch-time allowance, so fees are not understated.
  // End of life pays out in kind, so nothing is converted there and no slippage is charged.
  const SOL_POOL_SHARE=0.5;
  const treasuryUSDC=raise-lpCash-escrow;      // what finalize checks against
  const poolConv=slip*SOL_POOL_SHARE*lpCash;
  const treasury0=treasuryUSDC>0 ? Math.max(0,treasuryUSDC-poolConv)*(1-slip) : treasuryUSDC;
  const convCost=treasuryUSDC-treasury0;       // treasury0: the remainder after conversion, before any mint
  // Run the mints in sequence. Each one is sized against the supply standing at that moment and its
  // proceeds land in a treasury that previous mints have already grown.
  let supply=S, treasury=treasury0, mintTok=0, mintCash=0, kNow=k;

  // NO LUMP-SUM TRADING HERE. The Launch source is the launch exactly as configured: nothing has
  // traded yet, so nothing accrues. Fees are accrued week by week by the drawn-path and SOL engines,
  // which read a real price and do not need an assumed average.
  const lifeVol=0, feeTre=0, feeLp=0, kAfterFees=kNow;

  const mintLog=[];
  // Redemptions placed on the table run in the same price order as mints. Each takes a pro-rata
  // share of the treasury and the pool's cash; the redeemer's share of the pool's own tokens burns
  // with theirs, so the price does not move and every remaining claim per token is unchanged.
  const redLogT=[];
  redeemSequence().forEach(function(e){
    const px0=Math.sqrt(kNow/e.price), pc0=Math.sqrt(kNow*e.price), claim=supply-px0;
    if(claim<=0) return;
    const want=Math.min(e.tok,claim*0.999), f=want/claim, pot=Math.max(0,treasury)+pc0;
    redLogT.push({price:e.price,tok:want,cash:f*pot*(1-REDEEM_FEE),burnt:want+f*px0});
    treasury=(1-f)*Math.max(0,treasury)+f*pot*REDEEM_RETAIN;
    kNow*=Math.pow(1-f,2); supply*=(1-f);
  });

  mintSequence().forEach(function(price,i){
    const supBefore=supply, treBefore=treasury, kBefore=kNow;
    const ev=tblEvAt(price);
    const tok=((ev&&ev.pct!==undefined)?ev.pct:mintPct)*supBefore;   // the whole mint
    const toLP=tok*pSh;                      // carved out of the mint, paired into the token's pools
    const toPublic=tok-toLP;                 // sold to buyers
    const sellPx=price*(1+prem);             // buyers pay market plus the premium
    const paid=toPublic*sellPx;              // external capital in
    const pairCash=toLP*price;               // pairing must happen AT MARKET or the pool price moves
    const backBeforeNow = liveBack(supBefore,kBefore,treBefore,price);
    const ratioBefore = price>0 ? backBeforeNow/price : 0;

    if(toLP>0){                              // balanced add at the prevailing price, so price is unchanged
      const pt=Math.sqrt(kBefore/price), pc=Math.sqrt(kBefore*price);
      kNow=(pt+toLP)*(pc+pairCash);
    }
    supply+=tok; treasury+=paid-pairCash; mintTok+=tok; mintCash+=paid;
    mintLog.push({n:i+1,price,sellPx,tok,toLP,toPublic,paid,pairCash,
                  supBefore,supAfter:supply,treBefore,treAfter:treasury,
                  kBefore,kAfter:kNow,ratioBefore,
                  backBefore:backBeforeNow});
  });
  const trPct=mcp>0?treasury/mcp:0;
  const meetsMin = treasury+convCost >= TREAS_MIN*mcp - 1e-6;   // checked on the USDC, before conversion

  const vestBurn=teamPct*unvPct*S;   // unvested TEAM only. Investor tokens never burn.

  // Team vesting schedule. Same shape as the escrow release: a slice at listing, then a cliff,
  // then linear. Unvested team tokens burn at wind-down, so the burn SHRINKS as the team vests,
  // which means more surviving claimants and a lower payout each. This drives the time-stepped
  // views; the flat 'Team unvested at wind-down' above drives the launch-parameters view.
  const tvUp=Math.min(1,Math.max(0,+$('tvUp').value/100));
  const tvCliff=Math.max(0,+$('tvCliff').value||0);
  const tvOver=Math.max(0,+$('tvOver').value||0);
  // Standard cliff vesting, the shape every team and investor already knows. The schedule runs
  // for cliff+over months in total and accrues linearly across the WHOLE of it from day one. It
  // simply pays nothing until the cliff, at which point everything accrued so far releases in one
  // go, and it carries on linearly to the end. So the cliff's size is its share of the total:
  // 6+18 releases a quarter at month 6, 12+12 half at month 12, 12+24 a third at month 12. It is
  // NOT a flat third, which is what this used to do and which no real schedule works like.
  // With no cliff it is plain linear from listing. Minimum total of one month, because team
  // tokens must always vest and a zero-length schedule would unlock everything at listing.
  const tvTotal=Math.max(1,tvCliff+tvOver);
  const vested=function(mo){
    if(tvUp>=1) return 1;
    if(mo<tvCliff) return tvUp;              // nothing paid before the cliff
    return tvUp+(1-tvUp)*Math.min(1,mo/tvTotal);
  };
  // tokens that burn if the wind-down happens at month `mo`
  const vestBurnAt=function(mo){ return teamPct*(1-vested(mo))*S; };
  const escrowBack=escrow*udPct;

  // Escrow release schedule. Read as: erUp is drawn on day one, then the rest follows the SAME
  // cliff rule as team vesting above. The schedule runs erCliff+erOver months in total and accrues
  // across the whole of it, paying nothing until the cliff, where everything accrued so far is
  // drawn at once, then evenly to the end. Keeping both on one rule means a founder reads the two
  // sets of sliders the same way instead of learning two conventions on one page.
  const erUp=Math.min(1,Math.max(0,+$('erUp').value/100));
  const erCliff=Math.max(0,+$('erCliff').value||0);
  const erOver=Math.max(0,+$('erOver').value||0);
  const erTotal=Math.max(1,erCliff+erOver);
  // fraction of the escrow the team has drawn by month `mo`
  const released=function(mo){
    if(erUp>=1) return 1;
    if(mo<erCliff) return erUp;
    return erUp+(1-erUp)*Math.min(1,mo/erTotal);
  };
  // What a wind-down at month `mo` returns: ONLY the escrow the team has not drawn yet. Anything
  // released has been spent on runway and does not come back. The 'Escrow clawed back' slider has
  // no part in this; it is the launch-parameters assumption, used where there is no point in time.
  const clawableAt=function(mo){ return escrow*(1-released(mo)); };
  const allocated=lpPct+salePct+teamPct+invPct;
  return {S,supply,salePct,lpPct,teamPct,invPct,unvPct,escrow,raise,fee,slip,udPct,
          erUp,erCliff,erOver,released,clawableAt,
          tvUp,tvCliff,tvOver,vested,vestBurnAt,
          mcp,p0,lpTok,lpCash,k:kNow,k0:k,treasury,trPct,vestBurn,escrowBack,allocated,minRaise,feasible,meetsMin,denom,
          mintPct,pSh,prem,mintTok,mintCash,mintLog,treasury0,treasuryUSDC,convCost,
          lifeM,dv,apy,lifeVol,feeTre,feeLp,kAfterFees,feeT,feeL,dexYield,feesOn,redLogT};
}

function atPrice(m,f,st){
  st=st||effState(m);
  // The state this row is measured from may sit at a point in TIME (a price history or a drawn
  // path). When it does, the release schedules decide what is still unvested and what escrow is
  // still clawable at that moment. Measured from launch parameters there is no such moment, so
  // the flat wind-down assumptions apply. Same rule as step 3, same helper.
  const wa=windAt(m,st);
  const price=f*m.p0;
  const x=Math.sqrt(st.k/price), y=Math.sqrt(st.k*price);   // same as k/x, but safe when k is 0
  const burnt=x+wa.burn;
  const reachable=burnt<=st.supply;
  const surviving=st.supply-burnt;
  const gross=Math.max(0,st.treasury)+y;
  const fees=gross*m.fee;
  const pot=gross-fees+wa.back;
  const per=surviving>0?pot/surviving:0;
  // LIVE redemption in this version pays a pro-rata share of the treasury AND of the pool. The pool's
  // own tokens are not claimants (they burn at the end and claim nothing), so they are excluded from
  // the count, and a redeemer's share of them is burnt with their own rather than handed over.
  // Escrow is not included: it belongs to the team until the project ends.
  const claimants=st.supply-x;
  const liveRed=claimants>0?((Math.max(0,st.treasury)+y)/claimants)*(1-REDEEM_FEE):0;
  const mcapP=price*st.supply;
  return {price,x,y,burnt,surviving,gross,fees,pot,per,reachable,liveRed,
          // Live backing is the live redemption value against the market price, the same shape as the
          // EOL ratio below it. It used to be treasury over full market cap, which predates live pool
          // redemption: it left out the pool's cash and divided by every token rather than by claimants.
          escrowBack:wa.back, vestBurn:wa.burn, timed:wa.timed,
          liveOK:claimants>0,                       // live needs claimants; EOL needs survivors too
          liveRatio:price>0?liveRed/price:0,
          eolRatio:(reachable&&price>0)?per/price:0,   // EOL pot over the SURVIVING supply's value, i.e. vs market as a %
          vsList:m.p0>0?per/m.p0:0, vsMarket:price>0?per/price:0};
}

// ─────────────────────────────────────────────────────────────
// DRAW A PATH
// The user draws a price series. We then walk it week by week,
// accruing trading fees into the treasury and the pool, firing
// any reserve mints placed on the line, and recording what a
// wind-down would return at every point along the way.
// ─────────────────────────────────────────────────────────────
let PATH=null;        // array of prices, one per week
// The listing price the current PATH was scaled to. Changing supply, the raise or the sale share
// moves the listing price, and the drawn path used to stay at the OLD scale: the chart then had no
// range to draw (both axis ends printed as "<$0.00000001"), the line vanished, and every card above
// it read "x listing" against a price it was never drawn for. The shape is what the reader drew, so
// it is rescaled to the new listing price instead of being thrown away.
let PATH_P0=0;
// Events placed on the drawn path. Each is {w, type:'mint'|'redeem', pct, tok}.
// PATH_MINTS stays as the list of mint weeks so the existing schedule code keeps working.
let PATH_EV=[];
let PATH_MINTS=[];    // week indices where a mint fires, derived from PATH_EV
function syncEv(){ PATH_MINTS=PATH_EV.filter(function(e){return e.type==='mint';}).map(function(e){return e.w;}); }
function evAt(list,w,type){ return list.find(function(e){ return e.w===w && e.type===type; }); }
let PATH_N=0;         // weeks the current PATH was drawn for
let RANGE=3;          // decades above and below the listing price that the chart covers
let WIN=null;         // explicit {lo,hi} axis window. null = symmetric decades around the listing.
let AXIS=null;        // the axis AS CURRENTLY DRAWN. The pointer handlers are wired once, so they must
                      // read this rather than close over values from the draw that wired them.
let HOVER=null;       // {i, price} under the cursor, for the readout

const SHAPES={
  'Steady climb':   function(t){ return Math.pow(6,t); },
  'Pump and fade':  function(t){ return Math.pow(14,Math.min(1,t*3))*Math.pow(0.09,Math.max(0,(t-0.33)/0.67)); },
  'Slow bleed':     function(t){ return Math.pow(0.06,t); },
  'Sideways':       function(t){ return 1+0.28*Math.sin(t*13); },
  'Moon and round-trip': function(t){ return Math.pow(40,Math.min(1,t*2))*Math.pow(0.02,Math.max(0,(t-0.5)*2)); },
  'Dead cat':       function(t){ return t<0.3?Math.pow(0.12,t/0.3):(t<0.5?0.12*Math.pow(3,(t-0.3)/0.2):0.36*Math.pow(0.15,(t-0.5)/0.5)); }
};

function buildShape(fn,n,p0){
  const a=new Array(n);
  for(let i=0;i<n;i++) a[i]=Math.max(p0*1e-4, p0*fn(i/(n-1)));
  return a;
}

function ensurePath(m){
  const n=+$('wk').value;
  if(!PATH){ PATH=buildShape(SHAPES['Steady climb'],n,m.p0); PATH_N=n; PATH_EV=[]; PATH_P0=m.p0; syncEv(); }
  else if(PATH_N!==n){
    // A new week count used to throw the drawing and every placed event away without a word.
    // Stretch both instead: the line is resampled in log space, and each event keeps its place
    // as a share of the run.
    const old=PATH, N0=old.length, a=new Array(n);
    for(let i=0;i<n;i++){
      const x=(n<2?0:i/(n-1))*(N0-1), j=Math.min(N0-2,Math.floor(x)), f=x-j;
      a[i]=N0<2?old[0]:Math.exp(Math.log(old[j])*(1-f)+Math.log(old[j+1])*f);
    }
    const seen={};
    PATH_EV=PATH_EV.map(function(e){
      const w=Math.max(1,Math.min(n-1,Math.round(e.w*(n-1)/Math.max(1,N0-1))));
      return Object.assign({},e,{w:w});
    }).filter(function(e){ const k=e.type+':'+e.w; if(seen[k]) return false; seen[k]=1; return true; });
    PATH=a; PATH_N=n; syncEv();
  }
  // A changed launch changes the listing price, so carry the drawn shape across at the new scale.
  // Done before PATH[0] is pinned, and only when that price actually moved, so a run that does not
  // touch it leaves the drawing bit-for-bit alone.
  if(PATH_P0>0 && m.p0>0 && m.p0!==PATH_P0){
    const k=m.p0/PATH_P0;
    for(let i=1;i<PATH.length;i++) PATH[i]*=k;
    PATH_P0=m.p0;
  } else if(!(PATH_P0>0) && m.p0>0){
    // Built while the launch had no price at all, so there is no scale to carry across.
    PATH=buildShape(SHAPES['Steady climb'],PATH.length||n,m.p0); PATH_P0=m.p0;
  }
  PATH[0]=m.p0;   // week zero IS the listing price - everything after it is yours to draw
  return PATH;
}

// Walk the drawn path. Returns a row per week.
function walkPath(m){
  const path=ensurePath(m), n=path.length;
  const dv=m.dv, feeT=m.feeT, feeL=m.feeL, dexY=m.dexYield;   // the SIDEBAR's daily volume, matching the SOL run
  const mintPct=m.mintPct, pSh=m.pSh, prem=m.prem;
  const backAt=function(wk){ return m.clawableAt(wk/WPM); };
  const burnAt=function(wk){ return m.vestBurnAt(wk/WPM); };
  // The drawn path is always weekly. Carried on the row so the shared wind-down helpers never
  // have to infer a step size from a bare index.
  const moAt=function(wk){ return wk/WPM; };
  // The reserve asset gains backing on its own, so the treasury grows even with no trading at all.
  const wkGrow=Math.pow(1+m.apy, 1/52);

  let supply=m.S, treasury=m.treasury0, k=m.k0;
  const redLog=[];
  const mintSet=mintSchedule(PATH_MINTS);
  // size each mint by its own setting, falling back to the Reserve mint default
  const mintPctAt={}; PATH_EV.forEach(function(e){ if(e.type==='mint') mintPctAt[e.w]=e.pct; });
  const redeemAt={};  PATH_EV.forEach(function(e){ if(e.type==='redeem') redeemAt[e.w]=(redeemAt[e.w]||0)+e.tok; });
  const RETAIN=REDEEM_RETAIN;   // the share of the redemption fee that stays in the treasury
  const rows=[], log=[];

  for(let t=0;t<n;t++){
    const p=path[t];

    // trading activity for the week
    treasury*=wkGrow;                      // any yield the reserve basket earns on itself
    const mcap=p*supply, wv=dv*mcap*7;
    treasury += feeT*wv;
    // Both the liquidity fee leg and the venue's swap fee land in the same place: inside the pool.
    if(feeL+dexY>0){                  // balanced add into the pool grows the invariant
      const pv=2*Math.sqrt(k*p), add=(feeL+dexY)*wv;
      if(pv>0) k *= Math.pow((pv+add)/pv, 2);
    }

    // A reserve mint placed on this week. Same rules as everywhere else: buyers pay market plus the
    // premium, the pool share is carved out of the mint and paired at market using cash from those
    // sales, and the rest stays as backing. This was a simplified copy that ignored both the premium
    // and the pool share.
    if(mintSet[t]){
      const share=mintSet[t];                       // this week's tranche of the mint
      const backBeforeNow = liveBack(supply,k,treasury,p);
      const ratioBefore = p>0 ? backBeforeNow/p : 0;
      const thisPct=(mintPctAt[t]!==undefined?mintPctAt[t]:(function(){
        // a tranche lands on the week after the one it was placed on, so look back one
        const src=mintPctAt[t-1]; return src!==undefined?src:mintPct; })());
      const tok=thisPct*supply*share, toLP=tok*pSh, toPublic=tok-toLP;
      const sellPx=p*(1+prem), paid=toPublic*sellPx, pairCash=toLP*p;
      if(toLP>0){ const pt1=Math.sqrt(k/p), pc1=Math.sqrt(k*p); k=(pt1+toLP)*(pc1+pairCash); }
      const first=PATH_MINTS.indexOf(t)>=0;         // log once, on the week it was placed
      if(first) log.push({w:t,price:p,sellPx,tok,toLP,toPublic,paid,pairCash,cash:paid,ratioBefore,
                          backBefore:backBeforeNow});
      else if(log.length){ const L=log[log.length-1];
        L.tok+=tok; L.toLP+=toLP; L.toPublic+=toPublic; L.paid+=paid; L.cash=L.paid; L.pairCash+=pairCash; }
      supply+=tok; treasury+=paid-pairCash;
    }

    // A redemption placed on this week. The holder takes a pro-rata share of the treasury AND the
    // pool's cash; their share of the pool's own tokens burns with theirs, so the price does not move
    // and every remaining holder's claim per token is unchanged.
    if(redeemAt[t]){
      const px0=Math.sqrt(k/p), pc0=Math.sqrt(k*p), claim=supply-px0;
      if(claim>0){
        const want=Math.min(redeemAt[t],claim*0.999);
        const f=want/claim, pot=Math.max(0,treasury)+pc0;
        redLog.push({w:t,price:p,tok:want,cash:f*pot*(1-REDEEM_FEE),burnt:want+f*px0});
        treasury=(1-f)*Math.max(0,treasury)+f*pot*RETAIN;
        k*=Math.pow(1-f,2); supply*=(1-f);
      }
    }

    const poolTok=Math.sqrt(k/p), poolCash=Math.sqrt(k*p);
    const surviving=supply-poolTok-burnAt(t);
    // The pool cannot hold more tokens than exist. Below this price the state is impossible, so the
    // week is marked unreachable rather than clamped - clamping produced absurd per-token figures.
    const floorP=k/Math.pow(Math.max(1,supply-burnAt(t)),2);   // the pool's own hard limit, rarely binding
    // The floor that actually matters is what the token REDEEMS for. Below it anyone can buy and
    // redeem for a profit, so it does not trade there. The pool limit sits far underneath and only
    // binds in a scenario where the reserve asset has collapsed outright.
    const redFloorNow=liveFloor(supply,k,treasury,p);   // what binds is the live redemption
    const reachable=surviving>0;
    const gross=Math.max(0,treasury)+poolCash;
    const pot=gross*(1-m.fee)+backAt(t);
    // What a holder is actually paid for redeeming right now: treasury plus the pool's cash, over the
    // tokens that can claim, less the ordinary fee. Pool tokens are not claimants.
    const claimLive=supply-poolTok;
    const livePer=claimLive>0?((Math.max(0,treasury)+poolCash)/claimLive)*(1-REDEEM_FEE):0;
    rows.push({t,mo:moAt(t),p,supply,treasury,k,poolTok,poolCash,surviving,reachable,floorP,redFloorNow,
               per:reachable?pot/surviving:null, backPer:livePer,
               ratio:mcap>0?Math.max(0,treasury)/(p*supply):0});
  }
  return {rows,log,redLog,path};
}

function drawPath(m){
  const res=walkPath(m), rows=res.rows, path=res.path, n=path.length;
  const cv=$('cv'), cv2=$('cv2');
  const gate=+$('gt').value/100;

  // range buttons, once
  if(!$('ranges').childElementCount){
    // Multiples of the LISTING price, so the gridlines land on 1x, 10x, 100x of where it started.
    [[0,'1x'],[1,'10x'],[2,'100x'],[3,'1,000x'],[4,'10,000x']].forEach(function(r){
      const b=document.createElement('button'); b.textContent=r[1]; b.dataset.r=r[0];
      b.onclick=function(){ RANGE=r[0]; WIN=null; run(); };
      $('ranges').appendChild(b);
    });
    // Fit sets an EXPLICIT window round what is drawn rather than a symmetric range round the listing.
    // A path that runs to $600 no longer forces six decades on screen just to show it.
    const fit=document.createElement('button'); fit.textContent='Fit to drawing';
    fit.onclick=function(){
      let mx=-Infinity,mn=Infinity;
      PATH.forEach(function(v){ mx=Math.max(mx,v); mn=Math.min(mn,v); });
      if(!isFinite(mx)||mx<=0) return;
      if(mx/mn<1.2){ const c=Math.sqrt(mx*mn); mn=c/1.2; mx=c*1.2; }
      WIN={lo:mn/1.35,hi:mx*1.35}; run();
    };
    $('ranges').appendChild(fit);

    // Zoom works on the window, centred on wherever the cursor last was, so you can tighten right in
    // on a level and keep drawing there.
    const zoom=function(txt,factor){
      const b=document.createElement('button'); b.textContent=txt;
      b.onclick=function(){
        const A=AXIS||{lo:1,hi:10};
        const c=(HOVER&&HOVER.price)?HOVER.price:Math.sqrt(A.lo*A.hi);
        const half=Math.log(A.hi/A.lo)/2*factor;
        WIN={lo:Math.exp(Math.log(c)-half),hi:Math.exp(Math.log(c)+half)};
        run();
      };
      $('ranges').appendChild(b); };
    zoom('Zoom in',0.55); zoom('Zoom out',1.8);

    // Zooming without panning is a trap: you can tighten the window but not move it. Shift it in log
    // space so a step is the same proportion of the view wherever you are.
    const pan=function(txt,dir){
      const b=document.createElement('button'); b.textContent=txt;
      b.onclick=function(){
        const A=AXIS; if(!A) return;
        const span=Math.log(A.hi/A.lo), step=span*0.33*dir;
        WIN={lo:Math.exp(Math.log(A.lo)+step),hi:Math.exp(Math.log(A.hi)+step)};
        run();
      };
      $('ranges').appendChild(b); };
    pan('\u2191 Pan up',1); pan('\u2193 Pan down',-1);
  }
  [...$('ranges').children].forEach(function(b){ b.classList.toggle('on',+b.dataset.r===RANGE); });

  // The canned curves are gone from the interface: the point of this view is to draw your own,
  // and a row of ready-made shapes invites picking one instead. SHAPES itself stays, because one
  // of them still seeds the canvas before anything has been drawn on it.
  if(!$('shapes').childElementCount){
    const c=document.createElement('button'); c.textContent='Clear events';
    c.onclick=function(){ PATH_EV=[]; syncEv(); closeEvMenu(); run(); }; $('shapes').appendChild(c);
  }

  // ── main chart: price, log scale ──
  const dpr=window.devicePixelRatio||1, W=cv.clientWidth, H=cv.clientHeight;
  cv.width=W*dpr; cv.height=H*dpr;
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);
  const PAD={l:64,r:14,t:14,b:26};
  // The axis is FIXED by the range control, never by the data. Deriving it from the drawn path made
  // it impossible to draw above whatever was already on the chart.
  // Bottom follows the REDEMPTION floor with room for a 50% reserve-asset collapse beneath it, so the
  // chart does not waste decades on prices the token cannot trade at. Top is a multiple of listing.
  var minRed=Infinity, minPath=Infinity;
  rows.forEach(function(r){ minRed=Math.min(minRed,r.redFloorNow); });
  path.forEach(function(v){ minPath=Math.min(minPath,v); });
  if(!isFinite(minRed)) minRed=m.p0;
  const lo = WIN ? WIN.lo : Math.min(minRed*0.45, minPath*0.9);
  const hi = WIN ? WIN.hi : m.p0*Math.pow(10,RANGE);
  // NB: the stored path is NOT clamped to the range. Switching to a tighter range hides points rather
  // than destroying them, so widening the range brings them back exactly as drawn.
  // This has to sit AFTER lo/hi are declared - reading them above is a temporal dead zone error and
  // the whole chart silently fails to draw.
  var outHi=0,outLo=0;
  path.forEach(function(v){ if(v>hi*0.999) outHi++; if(v<lo*1.001) outLo++; });
  const X=function(i){ return PAD.l+(W-PAD.l-PAD.r)*(i/(n-1)); };
  const Y=function(v){ const a=Math.log(Math.max(v,lo)), b=Math.log(lo), c=Math.log(hi);
                       return PAD.t+(H-PAD.t-PAD.b)*(1-(a-b)/(c-b)); };
  AXIS={lo:lo,hi:hi,PAD:PAD,W:W,H:H,n:n,Y:Y};

  // grid at decades
  g.strokeStyle='rgba(246,244,236,.07)'; g.fillStyle='#8f8a81'; g.font='10px "JetBrains Mono",monospace';
  logTicks(lo,hi,5).forEach(function(v){
    const y=Y(v); g.beginPath(); g.moveTo(PAD.l,y); g.lineTo(W-PAD.r,y); g.stroke();
    g.fillText(axLabel(v),6,y+3);
  });
  // listing price marker
  const yl=Y(m.p0); g.strokeStyle='rgba(226,192,102,.5)'; g.setLineDash([4,4]);
  g.beginPath(); g.moveTo(PAD.l,yl); g.lineTo(W-PAD.r,yl); g.stroke(); g.setLineDash([]);
  g.fillStyle='#e2c066'; g.fillText('listing',W-PAD.r-44,yl-5);

  // the redemption floor: below it, buying to redeem is free money, so it does not trade there
  g.beginPath(); let started=false;
  rows.forEach(function(r,i){ const y=Y(Math.max(r.redFloorNow,lo));
    if(!started){ g.moveTo(X(i),y); started=true; } else g.lineTo(X(i),y); });
  g.lineTo(X(n-1),H-PAD.b); g.lineTo(X(0),H-PAD.b); g.closePath();
  g.fillStyle='rgba(242,186,117,.09)'; g.fill();
  g.strokeStyle='rgba(242,186,117,.60)'; g.setLineDash([4,3]); g.beginPath();
  rows.forEach(function(r,i){ const y=Y(Math.max(r.redFloorNow,lo)); i?g.lineTo(X(i),y):g.moveTo(X(i),y); });
  g.stroke(); g.setLineDash([]);
  // Anchored to the floor at week zero, which mints placed later cannot move, and given a solid
  // backing so it is legible against the band rather than peach on peach.
  g.font='10px Inter,sans-serif';
  // This band is the redemption FLOOR, the price at which redeeming pays the same as selling, not
  // a redemption value per token. Calling it the latter was wrong in the same way the SOL chart was.
  // the long label does not fit a phone, so it shortens there rather than running off the edge
  const flTxt=(W<600 ? 'Redemption level, '+px(rows[0].redFloorNow)+' at launch'
                     : 'Redemption level, '+px(rows[0].redFloorNow)+' at launch. Below it, redeeming beats selling');
  const flW=g.measureText(flTxt).width+16;
  const flY=Math.min(H-PAD.b-10, Y(Math.max(rows[0].redFloorNow,lo))+20);
  g.fillStyle='rgba(8,8,6,.82)';
  g.beginPath(); g.roundRect(PAD.l+6,flY-11,flW,17,8); g.fill();
  g.fillStyle='#f8d3a4';
  g.fillText(flTxt,PAD.l+14,flY+1);
  g.font='10px "JetBrains Mono",monospace';

  // the path
  g.strokeStyle='#f4d98f'; g.lineWidth=2; g.beginPath();
  path.forEach(function(v,i){ i?g.lineTo(X(i),Y(v)):g.moveTo(X(i),Y(v)); }); g.stroke();
  g.lineWidth=1;

  // event markers: mints in peach, redemptions in brand violet
  let mi=0;
  PATH_EV.slice().sort(function(a,b){return a.w-b.w;}).forEach(function(e){
    if(e.w>=n) return;
    const x=X(e.w), y=Y(path[e.w]), isMint=e.type==='mint';
    const col=isMint?'#f2ba75':'#9878fd';
    g.strokeStyle=col; g.setLineDash([2,3]);
    g.beginPath(); g.moveTo(x,PAD.t); g.lineTo(x,H-PAD.b); g.stroke(); g.setLineDash([]);
    g.fillStyle=col; g.beginPath(); g.arc(x,y,5,0,7); g.fill();
    g.fillStyle='#111014'; g.font='bold 9px Inter,sans-serif'; g.textAlign='center';
    g.fillText(isMint?String(++mi):'R',x,y+3);
    g.textAlign='left'; g.font='10px "JetBrains Mono",monospace';
  });
  g.fillStyle='#8f8a81';
  g.fillText('week 0',PAD.l,H-8); g.fillText('week '+(n-1),W-PAD.r-52,H-8);

  // crosshair and live readout
  if(HOVER && HOVER.i>=0 && HOVER.i<n){
    const hx=X(HOVER.i), hy=Y(HOVER.price);
    g.strokeStyle='rgba(226,192,102,.35)'; g.setLineDash([2,3]);
    g.beginPath(); g.moveTo(hx,PAD.t); g.lineTo(hx,H-PAD.b); g.stroke();
    g.beginPath(); g.moveTo(PAD.l,hy); g.lineTo(W-PAD.r,hy); g.stroke(); g.setLineDash([]);
    g.fillStyle='#e2c066'; g.beginPath(); g.arc(hx,Y(path[HOVER.i]),3,0,7); g.fill();
  }
  const warn = (outHi||outLo)
    ? ' &middot; <b style="color:var(--down)">'+(outHi+outLo)+' week'+((outHi+outLo)>1?'s':'')+' off '
      +(outHi&&outLo?'both ends':(outHi?'the top':'the bottom'))+' of this range. Press Fit to drawing.</b>'
    : '';
  $('readout').innerHTML = (HOVER
    ? 'week <b>'+HOVER.i+'</b> · cursor <b>'+px(HOVER.price)+'</b> ('+(HOVER.price/m.p0).toFixed(HOVER.price/m.p0<10?2:0)+'x) · line here <b>'+px(path[HOVER.i])+'</b> ('+(path[HOVER.i]/m.p0).toFixed(path[HOVER.i]/m.p0<10?2:0)+'x listing)'
    : 'axis '+px(lo)+' to '+px(hi)+' · hover the chart to read it')
    + ' <span style="opacity:.55">· 1px \u2248 '
    + ((Math.pow(hi/lo,1/(H-PAD.t-PAD.b))-1)*100).toFixed(2) + '%'
    + (HOVER?' \u2248 '+px(HOVER.price*(Math.pow(hi/lo,1/(H-PAD.t-PAD.b))-1)):'') + '</span>' + warn;

  // ── second chart: what a holder would get, versus the market ──
  cv2.width=W*dpr; cv2.height=cv2.clientHeight*dpr;
  const g2=cv2.getContext('2d'); g2.setTransform(dpr,0,0,dpr,0,0);
  const H2=cv2.clientHeight; g2.clearRect(0,0,W,H2);
  let lo2=Infinity,hi2=-Infinity;
  rows.forEach(function(r){ const v=r.reachable?r.per:Infinity;
    lo2=Math.min(lo2,v,r.backPer||Infinity,r.p); hi2=Math.max(hi2,r.reachable?r.per:0,r.p); });
  lo2=Math.max(lo2*0.7,1e-9); hi2*=1.3;
  const Y2=function(v){ const b=Math.log(lo2),c=Math.log(hi2);
                        return 12+(H2-38)*(1-(Math.log(Math.max(v,lo2))-b)/(c-b)); };
  g2.strokeStyle='rgba(246,244,236,.07)';
  logTicks(lo2,hi2,4).forEach(function(v){
    const y=Y2(v); g2.beginPath(); g2.moveTo(PAD.l,y); g2.lineTo(W-PAD.r,y); g2.stroke();
    g2.fillStyle='#8f8a81'; g2.font='10px "JetBrains Mono",monospace';
    g2.fillText(axLabel(v),6,y+3);
  });
  const line=function(key,col,dash){
    g2.strokeStyle=col; g2.lineWidth=2; g2.setLineDash(dash||[]); g2.beginPath();
    let pen=false;
    rows.forEach(function(r,i){
      const v=r[key];
      if(v===null||v===undefined||!isFinite(v)){ pen=false; return; }   // break the line, do not invent it
      const y=Y2(v); if(pen) g2.lineTo(X(i),y); else { g2.moveTo(X(i),y); pen=true; }
    });
    g2.stroke(); g2.setLineDash([]); g2.lineWidth=1;
  };
  line('p','rgba(246,244,236,.32)',[3,3]);
  // Same colours and labels as the SOL view's lower chart: live redemption gold, end of life purple.
  line('backPer','#e2c066');
  line('per','#9878fd');
  g2.font='10px Inter,sans-serif';
  // Laid out by measuring, not fixed offsets: on a phone the third label ran off the edge. If the
  // full labels do not fit, the short ones are used.
  (function(){
    const full=[['redemption \u00b7 live','#e2c066'],['redemption \u00b7 EOL','#9878fd'],['market price','rgba(246,244,236,.45)']];
    const short=[['live','#e2c066'],['EOL','#9878fd'],['market','rgba(246,244,236,.45)']];
    const W2=cv2.clientWidth, room=W2-PAD.l-8;
    const width=function(set){ return set.reduce(function(a,it){ return a+g2.measureText(it[0]).width+18; },0); };
    const set=width(full)<=room?full:short;
    let x=PAD.l+4;
    set.forEach(function(it){ g2.fillStyle=it[1]; g2.fillText(it[0],x,H2-8); x+=g2.measureText(it[0]).width+18; });
  })();

  // ── summary ──
  const last=rows[n-1], peak=rows.reduce(function(a,b){return b.p>a.p?b:a;});
  const unreach=rows.filter(function(r){return !r.reachable;}).length;
  $('pathSum').innerHTML=
    '<div class="s"><div class="k">Peak price</div><div class="v">'+px(peak.p)+'</div><div class="n">week '+peak.t+' · '+(peak.p/m.p0).toFixed(1)+'x listing</div></div>'+
    '<div class="s"><div class="k">Ends at</div><div class="v">'+px(last.p)+'</div><div class="n">'+(last.p/m.p0).toFixed(2)+'x listing</div></div>'+
    '<div class="s"><div class="k">Reserves</div><div class="v">'+money(Math.max(0,last.treasury)+last.poolCash)+'</div><div class="n">'+money(Math.max(0,last.treasury))+' treasury \u00b7 '+money(last.poolCash)+' pool cash</div></div>'+
    '<div class="s"><div class="k">Supply</div><div class="v">'+num(last.supply)+'</div><div class="n">'+res.log.length+' mint'+(res.log.length===1?'':'s')+'</div></div>'+
    '<div class="s"><div class="k">Wind-down now</div><div class="v">'+(last.reachable?px(last.per):'·')+'</div><div class="n">'+(last.reachable?pc(last.per/m.p0)+' of listing':'price below what the pool can reach')+'</div></div>'+
    '<div class="s"><div class="k">vs market now</div><div class="v">'+(last.reachable?(last.per/last.p).toFixed(2)+'x':'·')+'</div><div class="n">'+(last.reachable?(last.per>=last.p?'redeeming beats selling':'selling beats redeeming'):'unreachable state')+'</div></div>';

  let note='<b>The shaded band is the redemption level</b>, the price at which redeeming pays a holder '+
    'exactly what selling would. It is not the '+
    'redemption value per token, which moves with the price. It starts at '+px(rows[0].redFloorNow)+' '+
    'because the treasury and the pool are both claimable from day one. '+
    'Below it, anyone can buy and redeem for a profit, so the '+
    'token does not trade there. <b>The chart lets you draw down to about half that line</b>, which is the '+
    'only way it gets there in practice: the reserve assets themselves falling. This calculator holds the reserves '+
    'as stablecoins, so it does not model that on its own.<br><br>'+
    '<b>What this does.</b> It walks your drawn price week by week. Trading fees accrue into the '+
    'treasury and the pool the whole way. <b style="color:var(--gold-lt)">Click the line to place a mint or a '+
    'redemption</b> at that week, and the two lines '+
    'below show what a wind-down would return against what the market is paying.';
  if(res.log.length){
    note+='<br><br><b>Mints along the path:</b><br>'+res.log.map(function(x,i){
      return 'M'+(i+1)+' week '+x.w+' at '+px(x.price)+': '+num(x.tok)+' tokens'+
             (x.toLP>0?' ('+num(x.toPublic)+' sold at '+px(x.sellPx)+', '+num(x.toLP)+' paired)'
                      :' sold at '+px(x.sellPx))+', '+money(x.paid)+' in, backing ratio '+pc(x.ratioBefore)
             +(x.ratioBefore>=gate?' <span style="color:var(--down)">(gate shut)</span>'
                                  :' <span style="color:var(--up)">(gate open)</span>');
    }).join('<br>');
  }
  if(res.redLog && res.redLog.length){
    note+='<br><br><b style="color:#9878fd">Redemptions along the path:</b><br>'+res.redLog.map(function(x,i){
      return 'R'+(i+1)+' week '+x.w+' at '+px(x.price)+': '+num(x.tok)+' tokens redeemed for '+money(x.cash)+
             ' ('+px(x.cash/Math.max(1,x.tok))+' each), '+num(x.burnt)+' tokens burnt in total once their '+
             'share of the pool goes with them. Every remaining holder\u2019s claim per token stays the same or rises a little, '+
             'because part of the fee stays in the reserves.';
    }).join('<br>');
  }
  const crossings=rows.filter(function(r){return r.reachable&&r.per>=r.p;}).length;
  if(unreach) note+='<br><br><b style="color:var(--down)">'+unreach+' of '+n+' weeks sit below the pool\u2019s reach</b> '+
    'This is the shaded band on the chart. A constant-product pool holding this much of the supply cannot be pushed '+
    'that low, so those weeks are an impossible state rather than a bad outcome, and the lines break there '+
    'rather than inventing a number.';
  note+='<br><br><b>Redeeming beats selling in '+crossings+' of '+n+' weeks</b> on this path'+
        (crossings?', which is where a holder vote to wind down actually pays.':'. On this path the market always pays more, so nobody would vote to wind down.');
  $('pathNote').innerHTML=note;

  // ── drawing ──
  if(!cv.__wired){
    cv.__wired=true;
    let drawing=false, lastI=null;
    // The canvas has a border and box-sizing:border-box, so getBoundingClientRect() is the BORDER
    // box while everything is drawn into the CONTENT box. Offset by the border or the crosshair sits
    // off the cursor, and by more the further from centre you are.
    const box=function(){
      const r=cv.getBoundingClientRect();
      const bx=(r.width-cv.clientWidth)/2, by=(r.height-cv.clientHeight)/2;
      return {left:r.left+bx, top:r.top+by, w:cv.clientWidth, h:cv.clientHeight};
    };
    const toI=function(ev){ const b=box(), A=AXIS;
      return Math.max(0,Math.min(PATH.length-1,
        Math.round((ev.clientX-b.left-A.PAD.l)/(b.w-A.PAD.l-A.PAD.r)*(PATH.length-1)))); };
    const toP=function(ev){ const b=box(), A=AXIS;
      const f=1-(ev.clientY-b.top-A.PAD.t)/(b.h-A.PAD.t-A.PAD.b);
      const v=Math.exp(Math.log(A.lo)+f*(Math.log(A.hi)-Math.log(A.lo)));
      return Math.min(A.hi,Math.max(A.lo,v)); };
    cv.addEventListener('wheel',function(ev){
      ev.preventDefault();
      const A=AXIS; if(!A) return;
      const b=box();
      const f=1-(ev.clientY-b.top-A.PAD.t)/(b.h-A.PAD.t-A.PAD.b);
      const at=Math.exp(Math.log(A.lo)+f*(Math.log(A.hi)-Math.log(A.lo)));   // price under the cursor
      const k=ev.deltaY<0?0.82:1/0.82;                                        // in on scroll up
      const half=Math.log(A.hi/A.lo)/2*k;
      if(half<0.02||half>14) return;                                          // stop runaway zoom
      WIN={lo:Math.exp(Math.log(at)-half),hi:Math.exp(Math.log(at)+half)};
      run();
    },{passive:false});

    cv.addEventListener('pointerdown',function(ev){
      const i=toI(ev), p=toP(ev);
      // on an existing marker? remove it rather than drawing or opening the menu
      const near=Math.max(1,PATH.length/60);
      const hitEv=PATH_EV.find(function(e){ return Math.abs(e.w-i)<=near; });
      if(hitEv && Math.abs((ev.clientY-box().top)-AXIS.Y(PATH[hitEv.w]))<14){
        PATH_EV=PATH_EV.filter(function(e){return e!==hitEv;}); syncEv(); closeEvMenu(); run(); return;
      }
      // on the line? offer a mint or a redemption at that week
      if(Math.abs((ev.clientY-box().top)-AXIS.Y(PATH[i]))<12 && !ev.shiftKey){
        openEvMenu(i,PATH[i],ev.clientX,ev.clientY); return;
      }
      closeEvMenu();
      drawing=true; lastI=i; PATH[i]=p; cv.setPointerCapture(ev.pointerId);
    });
    cv.addEventListener('pointermove',function(ev){
      HOVER={i:toI(ev),price:toP(ev)};
      if(!drawing){ drawPath(model()); return; }
      const i=HOVER.i, p=HOVER.price;
      if(lastI===null){ lastI=i; PATH[i]=p; }
      const a=Math.min(lastI,i), b=Math.max(lastI,i), pa=PATH[lastI];
      for(let j=a;j<=b;j++){ const f=(b===a)?1:(j-a)/(b-a);
        PATH[j]=Math.exp(Math.log(lastI<i?pa:p)*(1-f)+Math.log(lastI<i?p:pa)*f); }
      lastI=i; drawPath(model());
    });
    const stop=function(){ if(drawing){ drawing=false; lastI=null; run(); } };
    cv.addEventListener('pointerleave',function(){ HOVER=null; if(!drawing) drawPath(model()); });
    cv.addEventListener('pointerup',stop);
    cv.addEventListener('pointercancel',stop);
    cv.addEventListener('pointerleave',stop);
  }
}

// SOL price path, USD. DAILY open/high/low/close, 10 Apr 2020 to 17 Nov 2026, 2413 days.
// Source: CoinMarketCap's own daily series, supplied as a Bitget export of it.
// PROVENANCE AND HOW IT WAS CHECKED
//  - The file's lowest price is $0.5052 on 11 May 2020, which is exactly the all-time low
//    CoinMarketCap publishes. Matching to the cent and the day is what identifies this as CMC's
//    own data rather than a re-derivation.
//  - Aggregated back up to months, 76 of its 78 months agree with CMC's monthly export inside 1%.
//    August and September 2020 do not: CMC's MONTHLY row for August opens at $3.09, which in the
//    daily series is roughly 11 August, about a ten day offset. The daily series runs smoothly
//    through that period with every open meeting the previous close, so the fault is in CMC's
//    monthly aggregation, not here.
//  - The 10 April 2020 row is assembled rather than exported, because CMC's own table begins on
//    the 11th. Open 0.8320 is the first value on CMC's chart; high 1.3135 matches both Coinbase's
//    first plotted point for 10 Apr 2020 and the $1.33 CoinList reported on Binance's pair; low
//    0.6942 matches CoinList's "as of posting, SOL has held strong at $0.70"; close 0.9511 is the
//    11 April open, and this feed carries the close forward (median gap across 2,400 rows: 0.006%).
//  - Eleven days in late 2023 are missing from the source and are filled by straight line between
//    neighbours: 18-21 and 23 Sep, and 23-28 Nov 2023. The moves across those gaps are +3.2%,
//    -0.3% and +2.9%, so nothing of consequence is hidden in them.
// WHAT IS DELIBERATELY NOT HERE
//  - The $0.22 CoinList auction of 24 March 2020. It was a real clearing price, but it is a SALE
//    price, not a market price: CMC's all-time low of $0.5052 shows SOL has never traded below
//    about fifty cents on any venue it indexes. CoinList's "500% from the open to a high of $1.33"
//    measures from that auction price, not from an exchange open ($0.22 x 6.05 = $1.33). Putting
//    the auction at day zero would model an instant repricing that a Transmuter launch cannot
//    produce, because the pool is seeded at the listing price and trading opens there.
// This series replaced a monthly one that was interpolated to weeks. That version peaked at
// $237.74, a month-end close, and so never saw the real $294.33 high of 19 Jan 2025: it understated
// the top of the chart by 23.8%, and every week between two month-ends was an invented straight line.
const SOL_META={start:"Apr20",end:"Nov26",days:2413,anchor:0.832,firstDay:"2020-04-10"};
const SOL_PACK="0.832,1.3135,0.6942,0.9511;0.95105,1.0491,0.76502,0.77682;0.78545,0.95667,0.76243,0.88251;0.89076,0.8916,0.77398,0.77783;0.77783,0.79647,0.62817,0.66192;0.66929,0.70496,0.62153,0.64665;0.63088,0.77419,0.62511,0.69082;0.68931,0.71961,0.66073,0.66073;0.66073,0.71762,0.65943,0.6811;0.68152,0.68464,0.59849,0.60697;0.61295,0.63925,0.52058,0.53881;0.54139,0.60459,0.50855,0.58766;0.58117,0.70696,0.56962,0.6916;0.68535,0.69808,0.60032,0.62746;0.62402,0.67102,0.61394,0.63424;0.63053,0.67095,0.62155,0.64333;0.65322,0.6915,0.63117,0.63551;0.63571,0.66028,0.56103,0.57237;0.57825,0.69215,0.56848,0.66129;0.66229,0.77777,0.65527,0.74584;0.74719,0.80082,0.68788,0.69105;0.69105,0.73707,0.6859,0.72879;0.72727,0.74898,0.7079,0.71588;0.7148,0.7298,0.65662,0.67953;0.67963,0.70581,0.61843,0.66749;0.67344,0.68621,0.6265,0.64184;0.64245,0.67389,0.62258,0.62258;0.62258,0.63227,0.57338,0.61298;0.61298,0.63662,0.58985,0.60492;0.60404,0.62543,0.58845,0.60453;0.60446,0.6123,0.51308,0.53703;0.53626,0.57186,0.50519,0.51527;0.51339,0.55976,0.50525,0.53858;0.53837,0.56487,0.51804,0.55053;0.55053,0.58095,0.55011,0.56912;0.56919,0.57462,0.54709,0.55975;0.55898,0.60653,0.55436,0.59912;0.59523,0.6402,0.58918,0.61299;0.61268,0.67439,0.60965,0.65267;0.65097,0.65448,0.61125,0.62445;0.62248,0.62666,0.57528,0.57916;0.57969,0.61379,0.54335,0.60892;0.60524,0.67643,0.58283,0.63888;0.63741,0.63885,0.58825,0.61303;0.61329,0.61329,0.54843,0.54905;0.54857,0.65014,0.53806,0.60086;0.5991,0.61235,0.56646,0.57331;0.57331,0.61109,0.57144,0.59098;0.59088,0.5924,0.56695,0.57516;0.5747,0.59341,0.56686,0.57942;0.58136,0.60249,0.56705,0.58793;0.5879,0.594,0.56924,0.57002;0.57347,0.58784,0.56735,0.5775;0.57714,0.58972,0.55229,0.56467;0.56467,0.59103,0.56446,0.58662;0.58687,0.59164,0.56452,0.5873;0.5873,0.69828,0.57793,0.66115;0.66107,0.66162,0.61178,0.62244;0.62244,0.62444,0.5934,0.61658;0.61508,0.679,0.61331,0.66831;0.66778,0.66809,0.62724,0.658;0.65804,0.67004,0.6334,0.64487;0.64489,0.65053,0.57008,0.57374;0.57406,0.60465,0.56992,0.59387;0.59395,0.61144,0.58549,0.60894;0.61093,0.61826,0.5809,0.58708;0.58837,0.5919,0.54729,0.57064;0.57058,0.58983,0.56869,0.58558;0.5855,0.59013,0.56512,0.58156;0.58158,0.65031,0.57929,0.62096;0.62241,0.8364,0.62038,0.68433;0.68252,0.68858,0.62563,0.64359;0.64613,0.74854,0.63688,0.67315;0.67258,0.74311,0.64588,0.72685;0.72677,0.76063,0.70071,0.7083;0.70853,0.80069,0.6935,0.73699;0.7371,0.7567,0.69924,0.71319;0.71253,0.75199,0.68153,0.74114;0.7396,0.75221,0.67584,0.71355;0.71355,0.84398,0.68709,0.7985;0.7985,0.88534,0.77001,0.85245;0.85302,1.0292,0.8501,0.86009;0.86336,0.90172,0.82093,0.83264;0.83212,0.83713,0.75367,0.78022;0.78204,0.78603,0.75511,0.76809;0.76794,0.82316,0.76145,0.78037;0.7801,0.78555,0.64264,0.69166;0.69166,0.72105,0.68658,0.70791;0.70786,0.78089,0.70192,0.75305;0.75305,0.82752,0.74341,0.79671;0.79402,0.88236,0.75991,0.85345;0.8533,0.93963,0.84285,0.91356;0.91356,0.92635,0.85909,0.92462;0.92386,1.131,0.91412,1.0167;1.0167,1.2877,1.0089,1.1757;1.1725,1.246,1.1192,1.1481;1.1475,1.3968,1.1415,1.2896;1.284,1.375,0.85504,0.87244;0.87076,1.0468,0.80188,0.97784;0.97752,1.0007,0.93173,0.96658;0.968,0.97035,0.89952,0.92035;0.92052,0.92158,0.85188,0.87309;0.87293,1.0083,0.86032,0.97717;0.9772,1.1047,0.97248,1.0441;1.0462,1.1012,0.99739,1.0498;1.0498,1.054,0.97478,0.99535;0.99544,1.4327,0.9954,1.2522;1.2447,1.6246,1.2383,1.5651;1.5651,2.0427,1.5611,1.7786;1.7841,1.8587,1.6118,1.7841;1.7857,2.0956,1.5932,1.6583;1.6583,1.7964,1.6357,1.6868;1.6868,1.6885,1.5104,1.5382;1.5328,1.6622,1.4989,1.5266;1.5299,1.7468,1.412,1.7428;1.7323,1.83,1.6687,1.8026;1.8,1.9499,1.795,1.8716;1.8707,1.8881,1.7095,1.7545;1.7545,2.228,1.7468,2.2063;2.2032,2.2032,1.8856,2.0859;2.0839,2.5696,2.0265,2.4736;2.4716,2.7068,2.3025,2.6652;2.6652,3.3979,2.5259,3.1318;3.131,3.4865,2.7536,3.3034;3.308,3.9162,3.104,3.7698;3.7707,4.1558,3.5285,3.756;3.7602,3.79,3.3327,3.4094;3.4126,3.7199,3.1655,3.1838;3.1854,3.4707,3.1387,3.3857;3.3857,3.386,3.088,3.0986;3.1045,3.7099,2.8944,3.33;3.3287,3.4839,2.8381,2.899;2.899,3.4318,2.8962,3.2083;3.2097,3.2233,2.9138,2.9437;2.9453,3.1949,2.7573,3.0209;3.0209,3.4034,3.0188,3.3224;3.3122,3.6075,3.2244,3.345;3.3497,3.3582,3.0277,3.2648;3.266,3.7953,3.1943,3.5584;3.5578,3.8547,3.2922,3.4451;3.4525,4.3096,3.4473,4.0114;4.0142,4.1052,3.7871,3.9688;3.97,4.705,3.9191,4.4358;4.4217,4.8729,4.1097,4.782;4.7811,4.9447,4.3445,4.3445;4.3527,4.3559,3.7052,4.1645;4.1688,4.4408,3.5273,3.5273;3.5234,3.8341,3.1989,3.5458;3.551,3.6602,2.1917,2.5979;2.6003,3.1756,2.2882,3.086;3.0861,3.1896,2.3915,2.9285;2.9276,2.9397,2.3986,2.469;2.4712,3.7517,2.3898,3.6364;3.6364,3.8513,3.3208,3.4698;3.4673,3.501,3.0402,3.4274;3.4191,3.4671,3.1507,3.3327;3.3364,3.4668,3.0054,3.2258;3.2315,3.5249,3.0942,3.2691;3.2691,3.3201,2.9185,2.9391;2.9393,2.9393,2.4538,2.5454;2.5454,2.9341,2.37,2.8919;2.8919,3.1593,2.7417,3.1079;3.1117,3.2534,2.9717,3.0289;3.031,3.0329,2.7201,2.8709;2.8709,3.0269,2.5004,2.7825;2.7737,2.9944,2.6686,2.9155;2.9304,3.0653,2.7463,2.8368;2.8381,3.2516,2.7956,3.1327;3.1455,3.2652,2.9118,3.1886;3.188,3.2039,3.0413,3.1347;3.1338,3.1735,3.0106,3.1529;3.1527,3.2042,2.936,2.9567;2.9584,3.0101,2.9018,2.9464;2.9491,2.9793,2.8357,2.8979;2.8982,2.9858,2.6574,2.861;2.8642,2.8766,2.4578,2.6261;2.6273,2.6695,2.5473,2.5473;2.543,2.588,2.4289,2.516;2.5191,2.6626,2.4673,2.6576;2.6552,2.6552,2.1477,2.1763;2.1758,2.3919,2.0958,2.2918;2.3,2.4306,2.0285,2.3652;2.3677,2.6253,2.3171,2.5399;2.5369,2.5941,2.4032,2.4061;2.4074,2.4576,2.3449,2.4266;2.4261,2.6986,2.4159,2.5871;2.5849,2.5849,2.3482,2.4049;2.4082,2.4366,2.2463,2.3146;2.3148,2.3358,2.2034,2.2664;2.2652,2.2657,2.1279,2.1494;2.1456,2.2383,2.1324,2.2018;2.2027,2.2488,2.1783,2.2143;2.2134,2.2135,2.0532,2.0581;2.0581,2.0979,1.8542,1.8887;1.8886,2.0662,1.8612,1.8904;1.8904,2.0824,1.8898,1.9557;1.9571,1.9848,1.8533,1.96;1.96,1.9617,1.8823,1.9118;1.9118,1.9229,1.7686,1.7875;1.7875,1.863,1.6294,1.6855;1.6855,1.7454,1.6053,1.7102;1.7102,1.719,1.3946,1.4901;1.4901,1.5669,1.4124,1.4289;1.4289,1.4673,1.3422,1.4413;1.4413,1.5493,1.4299,1.5407;1.5407,1.6379,1.5135,1.5998;1.5998,1.6302,1.4677,1.4741;1.4741,1.4805,1.4122,1.4122;1.4122,1.4129,1.2819,1.3923;1.3923,1.4862,1.3038,1.4052;1.4052,1.9407,1.4,1.9137;1.9137,2.4814,1.8448,2.032;2.032,2.2648,1.9744,2.1566;2.1566,2.1893,1.9588,2.0287;2.0287,2.308,2.0123,2.248;2.248,2.2841,1.9742,2.0021;2.0021,2.0503,1.8317,1.8991;1.8991,2.0611,1.8991,2.0208;2.0208,2.0335,1.8753,1.917;1.917,2.2091,1.9168,2.0432;2.0432,2.3602,1.9949,2.2554;2.2811,2.3182,2.1326,2.2022;2.2022,2.2059,2.0127,2.115;2.115,2.175,2.0182,2.0768;2.0768,2.2304,2.057,2.0954;2.0954,2.4988,2.0485,2.3822;2.3822,2.4038,2.0539,2.1448;2.1448,2.3516,2.1203,2.2764;2.2772,2.4664,2.1438,2.268;2.2695,2.4776,2.1828,2.27;2.2665,2.2917,1.7415,1.903;1.9033,1.9707,1.7804,1.8579;1.8598,1.9397,1.8107,1.8889;1.8879,1.9439,1.8572,1.9152;1.9151,2.0136,1.9119,1.9669;1.9683,2.1303,1.9323,1.9763;1.9773,2.1874,1.9567,2.1154;2.1171,2.2213,2.085,2.1004;2.0986,2.1121,1.8473,1.856;1.856,1.9807,1.8255,1.9788;1.9787,1.9839,1.8159,1.8542;1.8535,1.8957,1.8095,1.8312;1.8312,1.8316,1.6451,1.6654;1.6646,1.6743,1.5037,1.6623;1.6624,1.6651,1.5452,1.5742;1.5724,1.5767,1.4406,1.4446;1.4416,1.5374,1.4407,1.4909;1.4907,1.6429,1.4581,1.5655;1.568,1.6229,1.5237,1.5916;1.591,1.7994,1.5893,1.7607;1.7601,1.7876,1.61,1.7836;1.7839,1.8031,1.6552,1.6786;1.679,1.7063,1.637,1.6988;1.6993,1.7643,1.6643,1.6687;1.6707,1.6844,1.5277,1.5636;1.5638,1.6183,1.4952,1.5419;1.5396,1.5741,1.4745,1.4903;1.4902,1.5106,1.0902,1.2057;1.2077,1.3837,1.173,1.3624;1.3615,1.4529,1.3472,1.4454;1.446,1.4475,1.3134,1.3242;1.3251,1.4087,1.2683,1.303;1.304,1.517,1.2943,1.5157;1.5155,1.7276,1.4397,1.6743;1.6697,1.6808,1.5298,1.5355;1.5356,1.5506,1.4303,1.5109;1.5098,1.8597,1.502,1.8421;1.8456,1.9893,1.7215,1.7993;1.7999,2.365,1.7999,2.1618;2.1624,2.4851,1.8763,2.4851;2.491,2.5026,2.0777,2.1572;2.1596,2.1859,1.9076,1.9292;1.9366,2.6118,1.933,2.3727;2.3687,3.7793,2.1809,3.2199;3.2235,3.6628,2.9383,3.3854;3.39,3.7336,3.1962,3.4661;3.4611,3.5136,2.5971,3.1081;3.1037,3.8444,3.08,3.6134;3.6284,3.6288,3.2749,3.5138;3.516,3.5429,3.182,3.2782;3.2804,3.4359,2.9852,3.2502;3.2489,3.7032,3.2489,3.4471;3.4349,3.9654,3.3197,3.8181;3.8221,4.1479,3.6558,3.7955;3.792,4.0314,3.609,3.6419;3.6356,3.737,3.3441,3.7236;3.7217,3.7343,2.9827,2.9905;2.9899,3.4971,2.541,3.3462;3.341,3.5973,3.3158,3.5041;3.5071,3.793,3.4895,3.6344;3.6346,3.9744,3.4513,3.7;3.699,4.0969,3.6826,4.0473;4.0486,4.0486,3.5316,3.6906;3.6864,3.9435,3.6099,3.8221;3.8616,3.8926,3.6394,3.8347;3.8377,4.312,3.7741,4.2243;4.2373,4.787,4.1705,4.2641;4.2613,4.6116,4.1183,4.6116;4.6137,5.4036,4.4801,5.2675;5.2466,5.7808,5.0727,5.716;5.7317,6.531,5.6032,6.4261;6.4354,7.1271,6.4264,6.6817;6.6873,6.7991,5.7138,6.1108;6.1176,6.8715,5.7686,6.7005;6.7024,8.0559,6.4889,7.8832;7.8698,8.4678,7.5702,7.8168;7.8186,9.0726,7.6138,9.0722;9.0804,9.707,8.7613,9.2154;9.2148,9.9245,9.079,9.247;9.236,9.499,8.683,8.7325;8.743,9.2203,8.5597,8.7389;8.7243,9.3106,7.8405,8.8617;8.8607,8.9804,7.9836,8.2979;8.2987,8.4333,7.5444,8.2226;8.2329,9.2792,8.2329,8.9805;8.98,11.681,8.557,11.466;11.478,11.787,9.8159,10.003;9.9876,11.64,9.887,11.086;11.073,14.546,9.2559,14.455;14.422,15.743,11.6,15.202;15.214,18.147,14.862,17.303;17.23,17.695,13.796,13.816;13.866,15.484,13.12,13.588;13.602,14.612,13.057,13.201;13.208,13.779,11.49,13.089;13.108,15.516,13.057,14.956;14.967,15.224,13.461,13.959;13.964,14.729,13.767,14.116;14.095,14.26,12.771,13.098;13.066,13.08,12.185,12.61;12.57,13.27,11.901,13.036;13.044,13.997,12.726,13.878;13.827,13.871,13.082,13.602;13.615,14.986,13.32,14.846;14.851,15.188,14.079,14.231;14.22,16.239,13.704,15.992;16.021,16.486,14.111,14.552;14.564,15.394,13.92,15.309;15.302,15.35,14.379,14.508;14.477,14.79,13.698,14.187;14.164,14.283,13.23,13.623;13.635,14.267,13.131,14.22;14.211,14.745,13.827,14.23;14.233,14.488,13.932,14.205;14.196,14.978,14.152,14.212;14.218,14.366,13.668,14.332;14.35,16.6,14.203,14.919;14.849,15.244,14.097,14.205;14.19,15.371,13.661,13.661;13.651,13.705,12.615,13.025;13.02,14.804,12.37,14.779;14.786,16.804,14.758,16.508;16.479,19.386,16.345,18.016;18.083,18.988,17.7,18.855;18.891,20.869,18.891,19.234;19.102,19.796,18.156,19.465;19.416,20.362,18.844,19.085;19.085,19.825,18.568,19.81;19.796,23.827,19.789,22.552;22.527,25.57,22.213,24.061;23.929,24.778,22.806,22.984;22.978,25.347,21.877,24.957;25.146,27.488,23.089,26.478;26.515,27.97,25.725,27.034;26.986,29.015,26.904,27.778;27.65,28.258,25.963,26.841;26.808,28.687,25.578,27.932;27.918,29.862,26.843,28.512;28.541,28.798,26.418,27.436;27.4,27.483,24.792,26.475;26.437,28.249,25.539,27.818;27.82,28.227,24.973,25.397;25.369,26.82,25.1,25.1;25.136,32.903,21.539,32.303;32.34,36.08,29.926,31.676;31.476,32.697,28.933,31.77;31.682,35.004,30.167,32.513;32.683,40.972,31.601,38.88;38.899,41.463,31.664,36.978;37.257,43.532,34.683,40.737;40.845,48.434,40.512,47.368;47.542,48.311,43.372,43.977;43.894,46.549,42.557,43.239;43.161,46.917,40.672,44.826;44.85,46.071,40.951,42.461;42.5,44.27,41.244,42.956;42.893,49.845,42.031,49.508;49.501,49.897,45.982,46.891;46.904,49.009,45.044,45.934;45.983,47.757,42.313,42.73;42.637,45.928,42.316,44.924;44.974,44.974,42.592,43.456;43.503,46.06,41.438,43.155;43.152,46.639,42.298,45.562;45.618,47.121,43.297,44.33;44.342,45.878,39.559,42.91;42.872,45.151,39.763,44.577;44.592,48.979,42.457,42.457;43.235,45.417,37.527,40.998;41.035,44.791,39.986,42.718;42.7,45.392,39.375,43.461;43.402,52.501,41.915,47.201;46.898,51.876,43.303,46.863;46.66,58.303,46.188,55.911;56.089,57.526,29.43,35.107;35.043,51.258,32.318,44.743;44.447,47.646,33.837,38.813;38.988,40.01,31.255,31.316;31.226,32.436,19.14,24.689;24.498,32.094,24.498,31.284;31.396,33.13,26.1,29.997;30.048,37.238,29.009,35.54;35.482,35.527,31.127,33.585;33.676,34.503,28.067,29.039;29.003,30.022,25.751,27.376;27.408,29.749,25.65,28.603;28.604,32.984,27.525,32.816;32.771,33.29,29.88,30.985;30.935,35.038,30.433,33.956;34.019,41.145,33.792,39.471;39.581,39.61,34.311,37.415;37.417,42.823,37.099,39.585;39.749,43.377,38.964,42.308;42.254,44.101,38.091,38.262;38.251,42.478,33.685,41.518;41.28,43.998,39.369,42.032;42.024,43.005,39.597,41.099;41.11,41.312,35.311,36.046;36.164,37.614,34.318,36.442;36.515,39.36,34.783,38.77;38.705,40.477,36.814,38.713;40.536,41.759,39.436,41.154;39.545,41.496,37.503,39.704;39.689,41.237,38.286,39.265;39.267,39.427,35.004,36.649;36.819,37.355,34.982,35.353;35.237,35.928,31.362,35.322;35.261,35.498,25.949,26.657;26.593,28.713,20.38,26.772;26.913,32.773,25.696,30.049;30.846,32.991,28.548,31.181;31.169,32.903,28.035,28.699;28.608,30.007,26.711,29.713;29.753,31.929,29.271,31.929;31.881,34.243,31.035,32.928;33.01,35.789,32.727,33.867;33.963,35.955,31.601,35.556;35.506,35.538,32.386,33.404;33.306,34.032,31.48,34.02;34.016,35.405,33.298,34.479;34.495,35.502,33.556,34.311;34.283,34.462,32.483,32.985;32.93,34.978,32.93,34.269;34.233,38.012,33.842,36.591;36.72,36.915,32.802,33.204;33.134,34.388,31.991,33.265;33.318,34.14,31.187,31.789;31.693,32.536,31.412,32.178;32.173,32.644,30.074,30.848;30.786,31.094,28.919,29.121;29.143,31.435,27.516,31.281;31.361,31.483,28.008,28.452;28.549,29.442,26.229,26.37;26.254,27.697,26.041,26.722;26.784,27.734,26.361,26.752;26.671,26.722,24.012,24.448;24.51,24.976,22.178,23.49;23.443,27.416,22.865,26.623;26.665,28.136,25.952,27.702;27.707,28.691,26.426,28.514;28.518,29.508,28.069,28.703;28.649,28.873,26.529,28.169;28.227,31.054,27.904,28.307;28.21,28.953,27.005,28.065;28.146,28.747,27.412,27.815;27.878,31.886,27.372,31.281;31.275,33.055,30.068,32.394;32.353,36.868,31.683,36.827;36.679,36.72,33.283,34.254;34.191,35.912,33.061,33.222;33.191,35.833,32.403,33.996;34.108,36.652,33.273,35.764;35.772,38.209,35.534,37.355;37.355,40.388,35.688,39.446;39.492,40.506,37.627,39.403;39.466,39.533,36.936,37.674;37.66,40.005,36.481,38.768;38.679,41.661,38.223,40.64;40.649,43.739,40.628,41.744;41.705,43.402,39.382,41.099;41.114,44.901,40.722,44.895;44.851,44.871,42.938,44.113;44.15,54.63,43.45,53.745;53.541,68.822,52.466,62.432;62.115,74.889,58.981,64.211;64.168,80.12,60.27,72.543;72.839,75.092,68.61,72.758;72.749,79.99,70.937,78.725;78.699,81.814,72.697,73.756;73.868,77.481,71.554,72.804;72.769,76.705,71.681,75.708;75.78,79.371,68.62,70.671;70.68,72.703,66.223,71.952;71.973,78.055,66.265,75.316;74.812,88.854,72.715,88.087;88,97.843,85.791,96.703;96.564,97.778,90.994,94.47;94.345,116.85,94.038,110.54;109.76,130.01,103.35,108.48;107.44,119.53,106.27,111.03;110.73,131.96,109.65,128.1;128.39,148.83,128.39,146.58;146.42,150.43,136.45,139.11;138.99,145,135.08,142.07;142.06,165.88,138.04,164.38;164.18,194.82,133.1,173.15;173.28,197.99,147.99,191.04;209.47,214.96,181.45,188.2;187.61,196.95,168.69,179.87;179.37,193.41,175.57,178.87;179.23,181.57,170.58,174.54;174.42,174.93,150.97,169.27;169.77,171.3,143.55,158.09;158.42,166.18,154.24,159.12;158.81,163.12,147.65,152.47;152.35,153.44,135.25,147.59;147.45,171.14,144.39,169.18;169.23,170.65,151.25,152.52;152.79,153.39,131.26,132.13;132.76,144.47,116.34,123.95;124.18,150.94,122.35,147.92;148.06,152.36,143.2,149.75;149.94,151.2,128.8,139.4;139.3,144.07,134.11,136.18;136.22,140.78,125.12,135.7;135.93,148.5,133.98,136.73;136.51,139.29,128.24,131.54;132.34,140.04,131.23,135.35;135.41,142.85,134.31,141.07;141.38,164.74,138.44,161.68;161.59,174.9,156.32,169.09;169.11,176.97,166.07,172.59;172.96,172.96,162.77,166.73;166.99,169.98,160.59,164.12;164.61,165.36,150.77,154.11;153.96,161.36,150.54,154.28;154.26,168.85,152.76,158.95;158.7,161.41,154.87,156.83;156.75,158.36,146.9,148.05;147.8,153.92,140.36,144.86;145.01,153.26,137.81,152.74;152.52,155.35,144.41,148.18;148.02,155.33,147.33,149.76;150.05,165.12,146.98,162.6;163.01,164.71,156.74,157.54;157.46,167.43,154.09,159.74;160,162.86,155.03,157.23;157.21,159.41,153.22,156.02;155.88,176.44,155.2,175.95;176.77,193.6,176.77,190.32;190.45,214.04,188.27,196.43;196.3,205.67,192.56,197.7;197.97,204.72,185.57,202.36;202.32,218.73,198.2,210.1;209.53,213.98,197.49,199.81;199.87,205.4,178.73,183.77;184.52,201.05,182.22,194.86;194.91,204.9,194.91,200.18;200.23,200.39,187.82,195.42;195.77,205.16,186.06,202.42;202.63,211.36,198.24,203.55;203.52,222.23,201.18,220.24;221.08,246.32,216.2,242.9;243.1,250.47,235.15,247.39;247.27,248.38,231.16,236.47;236.49,260.06,235.29,258.93;258.78,258.85,246.12,249.82;249.98,253.25,241.14,248.47;248.36,253.18,237.9,239.21;239.13,247.95,218.39,233.78;233.91,246.45,229.75,234.24;233.72,238.7,221.25,228.5;228.6,241.83,225.08,241.83;241.86,242.04,230.69,238.43;238.73,245.98,235.1,237.55;238.5,238.5,215.44,219.24;219.3,222.03,210.03,218.72;218.88,222.88,187.67,195.49;195.07,219.37,189.75,215.28;215.41,221.45,206.29,218.02;217.78,235.23,210.81,231.28;230.99,231.9,212.03,215.74;215.84,226.06,211.31,221.84;221.86,222.46,200.5,214.92;205.89,216.4,202.32,206.25;210.05,210.5,184.33,191.51;192.28,199.36,191.04,193.1;193.28,201.63,182.37,200.68;200.82,212.45,199.95,204.32;204.23,218.34,200.08,208.67;208.39,232.39,208.15,229.8;229.85,243.11,220.39,233.99;233.6,239.12,207.33,211.22;212.11,212.81,171.55,201.12;200.78,204.62,182.02,196.17;196.55,197.66,176.89,194.2;194.28,204.12,188.28,190.6;190.51,196.37,184.13,194.62;194.48,196.69,178.79,181.18;181.47,184.69,167.95,167.95;167.92,173.9,161.86,171.95;171.95,176.65,167.86,173.43;173.1,173.1,148.57,155.21;155.14,161.62,150.12,153.34;161.36,182.51,157.65,178.34;178.59,188.88,174.45,176.95;176.89,182.39,168.52,175.5;175.66,184.38,171.2,182.84;182.85,189.26,178.76,180.1;179.98,181.15,168.68,173.67;173.69,182.42,170.49,180.09;179.86,187.47,177.43,178.6;178.5,193.28,176.12,190.04;190.1,197.16,185.02,190.27;190.53,195.15,189.03,193.12;192.92,200.64,190.82,198;197.88,204.58,195.16,195.43;195.62,195.62,177.04,177.43;177.39,180.59,170.44,170.66;170.76,175.69,168.4,172.75;172.7,177.36,168.31,170.3;170.31,178.96,170.2,178.52;178.53,179.43,175.01,176.38;176.39,176.39,167.53,170.3;170.29,173.74,166.74,167.94;167.94,171.11,148.22,155.1;155.11,155.11,146.67,150.43;150.41,150.52,135.15,136.4;136.4,147.84,134.02,142.51;142.54,145.44,138.39,140.84;140.83,143.56,130.8,135.95;135.94,143.3,134.13,140.18;140.2,152.94,138.55,151.7;151.69,157.54,146.01,146.01;146.03,150.47,142.39,146.16;146.18,149.35,144.42,147.8;147.79,151.77,146.4,147.86;147.88,148.21,137.5,139.93;139.93,142.47,134.9,141.59;141.55,142.29,133.36,135.79;135.79,143.62,127.17,127.21;127.33,128.43,107.91,111.97;111.98,113.59,89.287,94.178;94.308,104.52,93.593,99.578;99.618,99.771,81.226,91.65;91.66,99.701,87.757,94.72;94.719,103.72,89.808,92.238;92.218,94.06,86.186,89.632;89.529,93.365,87.574,91.313;91.355,98.611,90.964,96.223;96.249,97.298,91.707,93.298;93.301,100.73,89.586,99.739;99.726,112.98,99.478,109.98;110.02,111.96,97.736,101.84;101.83,102.67,94.635,101.46;101.34,112.41,100.68,112.17;112.21,118.21,110.53,113.89;113.9,115.87,112.19,115.3;115.28,121.55,113.14,117.36;117.41,119.97,110.24,113.6;113.53,116.83,109.98,114.02;114.02,114.79,106.2,106.2;106.23,107.85,95.604,96.382;96.401,99.554,93.499,95.918;95.893,97.206,91.816,93.244;93.194,97.742,91.208,96.433;96.437,105.29,96.433,104.87;104.93,105.35,98.58,101.93;101.9,102.63,92.676,93.41;93.463,96.202,89.706,90.065;90.052,92.541,88.953,91.497;91.444,93.32,86.017,90.901;90.883,95.904,83.118,83.123;83.106,87.164,81.205,86.465;86.471,92.738,84.903,84.903;84.864,92.279,76.86,89.195;89.228,94.778,87.276,92.599;92.609,94.604,89.758,90.142;90.125,91.989,84.493,85.519;85.501,101.04,84.576,99.52;99.54,101.56,94.893,98.654;98.649,105.98,97.106,100.65;100.65,101.43,94.378,95.539;95.567,95.708,87.554,88.246;88.291,91.036,86.289,89.648;89.649,89.865,84.33,84.542;84.553,86.483,80.317,82.13;82.113,84.78,81.54,82.255;82.28,89.482,82.206,88.202;88.19,88.454,81.019,82.939;82.941,84.051,80.281,80.745;80.748,82.664,80.722,81.554;81.531,82.883,78.004,78.936;78.926,82.099,78.274,81.173;81.17,85.519,79.072,82.955;82.952,87.904,81.653,87.904;87.862,90.757,86.751,87.877;87.866,91.849,84.637,89.822;89.82,94.361,89.393,92.418;92.414,92.436,88.15,88.615;88.605,91.012,87.208,88.757;88.742,93.767,88.183,90.513;90.514,96.052,89.811,95.103;95.021,103.46,94.066,102.22;102.24,104.58,97.318,98.658;98.667,103.19,97.83,101.76;101.77,107.3,99.269,107.08;107.08,113.18,105.48,106.47;106.33,115.28,106,111.71;111.69,124.61,107.77,120.7;120.68,128.93,120.2,122.66;122.74,137.56,118.79,134.43;134.45,143.02,132.14,132.2;132.24,140.26,131.23,136.78;136.76,137.63,126.87,132.41;132.39,136.18,126.56,126.86;126.86,127.28,112.77,112.88;112.94,119.76,111.96,118.8;118.82,122.25,108.54,109.8;109.8,113.11,108.63,112.97;112.97,115.81,110.08,111.74;111.7,111.83,98.671,99.339;99.385,109.12,98.935,103.31;103.28,105.68,100.49,105;104.94,107.33,99.257,100.71;100.71,102.67,100.1,101.31;101.3,103.27,100.96,102.26;102.25,105.29,99.958,100.41;100.41,102.52,95.243,102.16;102.2,108.58,101.3,108.58;108.6,110.72,104.77,105.5;105.5,109.77,100.77,101.78;101.76,103.5,99.579,100.61;100.62,102.77,98.782,100.74;100.73,102.22,99.009,99.236;99.241,101.44,94.756,101.25;101.22,101.74,95.178,95.782;95.786,100.54,95.284,98.379;98.382,100.4,96.695,98.186;98.183,98.569,92.884,94.011;94.014,94.929,82.91,85.096;85.095,92.43,84.944,89.672;89.672,90.693,85.407,87.581;87.563,88.688,84.922,85.842;85.842,92.937,85.728,92.771;92.77,95.033,81.835,84.596;84.588,84.647,80.469,81.764;81.767,82.181,77.883,78.983;78.988,79.284,74.527,75.22;75.234,76.983,63.27,63.27;63.369,73.76,61.027,66.766;66.735,68.117,44.004,50.211;50.239,53.659,38.05,44.684;44.634,55.902,44.076,48.594;48.677,53.061,46.221,52.417;52.431,58.878,49.835,58.811;58.804,58.804,52.268,53.646;53.656,58.038,53.505,57.126;57.116,57.698,49.731,49.756;49.795,53.617,48.636,52.214;52.212,53.438,48.051,49.539;49.535,51.055,48.767,50.318;50.321,53.022,49.863,52.755;52.736,54.475,48.927,49.057;49.064,50.578,47.501,49.653;49.648,50.442,47.673,47.982;47.984,48.551,42.321,43.491;43.474,43.814,40.269,40.981;41.494,44.658,40.549,44.343;44.339,45.386,41.998,44.91;44.909,47.937,44.357,47.179;47.181,48.039,44.84,45.768;45.765,45.947,40.05,40.27;40.255,41.328,38.361,40.891;40.896,41.433,37.803,38.259;38.275,39.04,36.041,38.931;38.934,39.995,38.035,38.481;38.502,44.451,38.439,42.433;42.43,42.449,37.776,39.438;39.434,40.527,38.402,38.843;38.846,41.724,38.556,39.973;39.968,40.77,37.001,37.09;37.092,37.843,33.436,33.821;33.837,34.229,30.743,30.743;30.73,30.918,26.14,28.192;28.183,31.61,26.06,29.715;29.696,34.566,26.868,34.488;34.506,35.712,29.732,29.99;30.003,32.009,29.478,30.743;30.741,31.839,27.463,31.808;31.809,35.161,28.911,34.244;34.238,36.764,31.893,35.417;35.397,38.805,34.4,36.121;36.183,36.705,33.803,34.122;34.121,38.347,34.084,38.175;38.201,42.729,37.853,42.212;42.203,42.491,39.875,42.333;42.302,42.341,39.384,39.408;39.409,41.082,38.171,38.451;38.445,39.706,35.229,35.326;35.327,35.969,33.251,33.874;33.909,34.046,31.057,33.588;33.646,35.231,31.934,32.803;32.811,33.935,31.958,33.359;33.356,33.577,32.219,33.386;33.385,36.807,32.521,36.785;36.761,36.872,33.267,35.396;35.405,37.476,34.889,37.074;37.075,39.119,36.498,38.518;38.517,39.353,36.556,38.287;38.292,38.793,37.87,38.072;38.071,38.071,36.387,36.698;36.693,36.693,33.337,33.464;33.465,34.501,32.758,32.758;32.748,34.94,31.959,34.911;34.912,37.221,33.691,37.108;37.112,38.851,36.646,37.416;37.413,40.085,36.402,39.574;39.58,40.969,38.546,38.645;38.647,43.746,38.609,43.746;43.669,47.099,42.717,44.9;44.897,46.096,41.643,42.094;42.088,43.919,39.818,43.191;43.189,44.223,40.139,40.619;40.591,41.826,38.714,40.041;40.039,42.021,39.606,41.007;41.009,41.048,36.712,36.712;36.715,36.715,34.82,36.191;36.204,40.395,35.755,40.308;40.302,44.073,39.133,42.845;42.877,44.229,41.277,41.927;41.923,46.476,41.619,43.756;43.761,45.052,42.353,42.4;42.402,43.116,40.737,41.786;41.774,42.332,39.747,39.755;39.755,40.731,37.893,38.544;38.545,39.68,38.045,38.831;38.824,41.175,38.796,40.561;40.561,40.845,39.953,40.057;40.06,41.494,39.336,40.606;40.61,43.54,40.604,42.171;42.175,42.702,39.944,40.373;40.371,42.612,39.257,42.366;42.374,45.125,42.374,42.822;42.821,45.375,42.231,45.335;45.341,48.184,45.341,46.485;46.506,47.961,44.694,44.917;44.922,47.128,42.909,43.823;43.806,44.187,42.782,43.159;43.153,44.633,40.287,40.403;40.427,41.607,39.526,39.545;39.541,39.541,35.755,35.89;35.877,37.223,34.358,35.27;35.264,36.982,34.782,36.533;36.526,36.526,33.9,35.474;35.475,36.05,34.313,35.646;35.646,36.286,34.434,34.958;34.959,36.423,34.934,35.316;35.313,35.58,31.499,31.726;31.714,32.205,30.953,31.542;31.539,32.13,30.389,30.392;30.394,32.521,30.119,32.465;32.46,33.073,30.797,31.412;31.417,32.876,31.238,31.473;31.475,31.709,30.511,31.586;31.585,32.359,30.844,31.228;31.228,31.232,30.858,31.109;31.109,32.139,31.082,32.107;32.108,32.371,31.211,32.195;32.2,33.785,30.641,30.892;30.884,32.897,30.489,32.711;32.708,33.796,32.103,33.609;33.607,35.8,33.606,34.74;34.733,35.362,34.369,35.127;35.123,35.9,34.124,34.966;34.967,38.169,34.508,37.424;37.422,38.87,32.87,33.431;33.018,34.283,32.87,34.092;34.094,34.715,32.722,33.048;33.045,33.203,31.641,32.209;32.212,33.848,32.212,33.751;33.748,33.955,30.979,31.06;31.054,32.99,30.693,32.685;32.687,32.79,31.389,31.433;31.434,33.134,30.195,30.826;30.816,32.807,30.639,32.409;32.406,33.909,31.364,33.677;33.675,34.699,33.274,33.463;33.461,33.985,32.015,32.335;32.336,33.882,31.96,33.881;33.879,35.237,32.272,32.75;32.738,33.741,31.728,33.235;33.235,34.338,32.793,33.952;33.952,35.133,32.736,33.212;33.216,33.225,32.467,32.469;32.47,32.998,31.997,32.056;32.057,33.205,31.955,32.968;32.957,34.342,32.881,34.122;34.117,34.312,33.279,34.074;34.074,34.457,33.333,33.343;33.344,33.729,32.552,33.001;33,33.043,32.446,32.578;32.578,33.103,32.478,32.914;32.913,33.339,31.971,31.971;31.966,31.966,30.579,30.777;30.78,31.46,30.729,31.165;31.164,31.181,28.197,30.545;30.542,31.91,29.76,30.007;30.006,30.151,29.534,29.575;29.579,30.445,29.579,30.169;30.168,31.264,29.883,31.225;31.224,31.411,29.834,30.164;30.165,30.213,28.83,28.901;28.895,29.432,28.074,28.085;28.08,28.243,26.986,28.109;28.108,28.144,27.558,28.014;28.014,29.332,27.858,29.27;29.273,29.414,28.215,28.31;28.31,32.191,28.119,30.94;30.929,31.838,30.765,31.285;31.287,32.204,30.585,30.631;30.631,32.449,30.189,32.111;32.109,33.739,31.917,32.857;32.858,33.479,32.062,32.966;32.961,34.308,32.286,32.611;32.608,33.326,32.201,32.248;32.246,32.835,30.294,30.788;30.793,32.143,30.677,30.844;30.842,34.104,30.732,33.781;33.777,38.55,33.735,36.766;36.772,36.902,32.546,32.684;32.679,33.068,28.927,29.601;29.597,31.061,21.784,24.153;24.159,24.159,12.506,13.941;13.985,18.676,13.411,17.681;17.663,18.136,15.507,16.327;16.34,16.408,14.538,14.539;14.538,14.661,13.123,13.165;13.166,14.89,12.255,14.001;14,14.97,13.932,14.301;14.3,14.562,13.712,14.286;14.286,14.464,13.078,13.639;13.639,13.791,13.039,13.247;13.247,13.255,12.645,12.851;12.852,13.417,12.203,12.253;12.254,12.258,11.342,11.846;11.843,12.466,11.011,12.436;12.438,14.402,12.428,14.352;14.353,14.854,13.917,14.582;14.581,14.581,13.962,14.063;14.063,14.888,14.031,14.159;14.16,14.409,14.083,14.116;14.113,14.145,12.825,13.405;13.403,13.897,13.28,13.37;13.371,14.219,13.308,14.115;14.133,14.154,13.441,13.481;13.483,13.773,13.377,13.716;13.717,13.731,13.278,13.302;13.302,13.724,13.299,13.718;13.716,14.135,13.63,13.831;13.831,14.323,13.829,14.289;14.292,14.311,13.497,13.52;13.52,13.753,13.31,13.689;13.689,13.98,13.537,13.58;13.581,13.696,13.568,13.577;13.576,13.778,13.413,13.428;13.427,13.458,12.951,13.319;13.318,14.058,12.829,13.834;13.836,14.888,13.831,13.953;14.14,14.467,13.909,14.022;14.022,14.145,12.148,12.267;12.266,12.512,11.988,12.504;12.505,12.569,12.312,12.413;12.416,12.567,11.738,11.933;11.935,12.436,11.875,12.281;12.279,12.279,11.93,12.129;12.13,12.169,11.72,11.795;11.795,12.085,11.756,11.786;11.786,11.786,11.24,11.444;11.445,11.534,11.275,11.388;11.388,11.453,11.138,11.307;11.309,11.391,10.766,11.085;11.085,11.098,9.5229,9.7559;9.7558,9.8271,8.1413,9.6518;9.6519,10.022,9.0627,9.8802;9.881,10.151,9.6926,9.961;9.961,10.053,9.721,9.9822;9.9832,11.372,9.8452,11.273;11.275,13.5,11.053,13.344;13.352,14.095,12.923,13.435;13.435,13.769,12.99,13.419;13.421,13.541,12.771,13.526;13.527,13.527,13.055,13.092;13.092,14.333,12.924,14.32;14.326,17.362,14.326,16.302;16.296,16.64,15.711,16.197;16.197,16.447,15.368,16.359;16.354,16.808,15.745,16.619;16.619,18.514,16.381,18.288;18.288,24.565,18.267,24.249;24.259,24.652,22.117,22.873;22.875,24.753,22.586,23.578;23.581,23.803,22.883,22.884;22.886,23.483,20.693,20.851;20.851,21.765,20.529,21.427;21.426,25.678,21.005,25.548;25.552,26.41,24.615,24.628;24.624,25.389,23.756,24.233;24.232,24.886,23.974,24.358;24.352,25.168,22.648,22.796;22.796,25.217,22.397,24.571;24.561,25.12,23.954,24.351;24.351,24.862,23.499,24.408;24.411,25.017,23.842,23.982;23.981,26.653,23.828,26.132;26.135,26.249,23.489,23.946;23.949,24.341,23.592,23.953;23.949,25.126,22.643,24.993;24.989,26.037,24.254,24.265;24.261,25.004,24.119,24.681;24.68,24.893,24.318,24.318;24.32,24.426,23.117,23.493;23.494,23.687,22.604,22.706;22.698,23.9,22.607,23.861;23.861,24.148,22.882,23.193;23.198,23.279,20.204,20.452;20.454,21.118,19.843,20.13;20.128,20.861,20.119,20.83;20.829,22.261,20.647,21.49;21.487,21.53,19.871,20.79;20.782,22.246,20.711,21.825;21.825,23.901,21.502,23.884;23.884,24.031,22.264,22.286;22.282,23.493,22.154,23.167;23.167,23.758,22.968,23.479;23.476,25.521,23.268,24.841;24.846,26.926,24.342,26.181;26.183,26.424,24.674,24.949;24.95,25.135,23.378,24.181;24.182,24.636,23.684,23.901;23.9,24.056,22.637,23.053;23.059,23.273,21.642,22.523;22.524,23.484,22.324,23.256;23.256,23.367,22.401,22.693;22.691,22.725,21.826,21.916;21.912,22.795,21.739,22.506;22.505,22.575,21.733,21.985;21.987,22.002,20.541,21.399;21.4,21.537,20.374,20.967;20.966,21.617,20.896,20.979;20.978,21.099,20.522,20.635;20.635,20.887,19.821,20.245;20.244,20.332,18.286,18.421;18.425,18.689,16.943,17.308;17.312,18.323,16.117,18.244;18.243,18.848,17.171,18.226;18.225,20.393,17.942,20.311;20.311,21.34,18.964,20.434;20.435,22.107,19.915,20.928;20.935,21.489,18.83,19.291;19.299,19.884,19.036,19.731;19.73,21.676,19.5,21.629;21.632,22.862,21.142,21.196;21.198,22.454,21.198,21.903;21.905,23.831,21.586,22.176;22.178,23.224,21.639,22.618;22.614,23.067,21.15,21.48;21.476,22.701,21.216,22.217;22.214,22.258,20.356,20.679;20.678,20.952,20.185,20.447;20.444,21.13,20.346,20.976;20.976,20.98,19.508,19.922;19.922,20.764,19.666,20.471;20.465,21.505,20.458,21.111;21.114,21.591,20.233,20.551;20.553,21.442,20.155,21.17;21.171,21.314,20.859,20.976;21.088,21.286,20.316,20.537;20.536,20.934,20.025,20.443;20.443,21.236,20.353,20.925;20.925,21.319,20.671,20.966;20.97,20.971,20.506,20.61;20.611,20.772,20.268,20.47;20.467,20.713,19.948,20.036;20.038,20.421,19.964,20.299;20.3,20.937,20.116,20.882;20.884,23.636,20.86,23.019;23.019,24.345,22.423,23.985;23.811,25.242,23.705,24.432;24.436,25.461,23.817,24.773;24.775,24.775,23.872,24.079;24.08,25.454,23.948,25.362;25.362,25.938,24.407,24.559;24.565,25.423,24.102,24.853;24.85,24.94,22.267,22.713;22.705,23.121,21.665,22.181;22.184,22.376,21.133,21.278;21.277,21.948,21.108,21.816;21.816,22.217,21.068,21.48;21.479,21.95,21.079,21.391;21.39,21.937,20.784,21.927;21.927,22.921,20.574,21.283;21.285,22.484,21.226,22.34;22.34,23.46,22.211,23.366;23.367,23.751,22.987,23.183;23.184,23.93,22.832,22.832;22.829,22.878,21.641,21.987;21.987,22.374,21.773,22.265;22.265,22.267,21.283,22.218;22.219,22.441,21.652,21.73;21.731,23.03,21.706,22.826;22.828,23.222,21.73,21.974;21.972,22.739,21.809,21.844;21.808,21.808,20.261,20.657;20.658,20.965,20.46,20.684;20.683,21.295,20.166,20.954;20.956,20.956,19.856,20.235;20.232,20.93,19.864,20.912;20.916,21.248,20.822,20.869;20.868,21.244,20.667,20.953;20.953,21.486,20.648,21.007;21.008,21.12,20.475,20.679;20.679,21.171,20.5,21.068;21.068,21.068,20.169,20.349;20.348,20.558,20.313,20.35;20.35,20.361,20.147,20.285;20.286,20.384,19.508,19.609;19.612,19.982,19.383,19.542;19.542,20.153,19.451,20.043;20.044,20.062,18.914,19.224;19.223,19.525,18.892,19.261;19.261,19.541,19.12,19.367;19.366,20.499,19.35,20.425;20.426,21.151,20.337,20.799;20.8,20.971,20.298,20.587;20.587,21.382,20.52,21.254;21.255,21.319,20.469,20.825;20.825,20.973,20.464,20.502;20.503,21.356,20.384,21.258;21.259,21.335,21.017,21.156;21.157,22.285,21.061,21.819;21.822,22.042,19.424,20.075;20.063,20.684,19.321,20.398;20.399,20.487,18.55,18.634;18.636,19.078,18.295,18.909;18.908,19.299,17.161,17.38;17.381,17.393,13.379,15.656;15.654,16.116,15.198,15.559;15.557,15.606,14.817,15.197;15.196,15.873,14.817,15.018;15.018,15.305,14.196,14.487;14.486,15.01,14.214,14.759;14.76,15.399,14.47,15.308;15.309,16.066,15.185,15.651;15.649,15.813,15.361,15.438;15.439,16.075,15.414,16.073;16.078,16.665,15.759,16.635;16.635,17.38,16.583,17.257;17.257,17.699,16.61,16.643;16.643,17.511,16.237,17.15;17.149,17.518,16.463,16.653;16.651,17.341,16.607,16.971;16.97,17.102,16.021,16.27;16.27,16.91,16.179,16.62;16.622,16.627,15.748,15.987;15.986,18.2,15.906,17.97;17.971,19.855,17.315,18.897;18.896,18.971,17.946,18.684;18.69,19.705,18.582,19.454;19.452,19.613,18.943,19.241;19.242,19.877,19.097,19.143;19.146,19.355,18.499,18.993;18.992,20.923,18.886,19.729;19.726,21.602,19.319,21.485;21.485,22.403,21.357,21.859;21.855,22.322,21.088,21.349;21.348,21.777,20.573,21.314;21.315,22.285,21.242,22.093;22.092,22.713,21.828,21.978;21.978,26.624,21.495,26.026;26.021,30.058,25.435,26.736;26.729,29.057,26.689,27.391;27.396,28.551,26.898,27.384;27.386,28.381,25.896,26.873;26.869,27.046,24.825,25.545;25.551,26.922,25.418,26.372;26.369,26.896,25.169,25.375;25.376,25.948,25.142,25.544;25.543,25.95,24.306,24.535;24.533,25.214,24.251,24.767;24.766,24.811,23.069,23.381;23.383,23.526,22.864,23.279;23.279,25.518,23.208,25.177;25.178,25.586,24.72,25.099;25.099,25.473,24.578,24.847;24.844,25.367,24.78,25.169;25.169,25.193,23.845,24.261;24.262,24.75,23.659,23.721;23.725,23.999,23.087,23.999;23.994,24.22,22.984,23.146;23.145,23.353,22.54,22.636;22.633,23.522,22.523,22.794;22.794,22.896,22.328,22.632;22.633,23.416,22.597,23.186;23.185,23.504,22.487,23.069;23.069,24.728,23.022,24.212;24.211,24.952,24.194,24.379;24.378,24.809,24.151,24.613;24.611,24.865,24.36,24.583;24.586,25.112,24.406,24.907;24.905,24.913,24.236,24.243;24.242,25.227,24.095,25.143;25.147,25.241,23.762,23.897;23.9,23.993,22.488,22.812;22.811,23.381,20.304,21.71;21.712,22.17,21.089,21.335;21.336,22.148,21.316,21.879;21.88,22.005,21.63,21.773;21.773,21.777,20.684,21.208;21.207,21.251,19.735,20.547;20.547,21.746,20.451,21.704;21.708,21.988,20.751,21.033;21.035,21.05,20.153,20.393;20.393,20.404,20.218,20.28;20.281,20.87,20.262,20.787;20.787,20.787,20.169,20.557;20.557,21.983,20.128,21.781;21.782,21.933,20.642,20.835;20.834,21.007,19.55,19.735;19.735,19.908,19.093,19.328;19.329,19.666,19.189,19.494;19.494,19.657,19.281,19.579;19.578,19.95,19.242,19.499;19.501,20.547,19.094,20.272;20.272,20.349,19.216,19.62;19.621,19.973,19.368,19.89;19.894,20.215,19.422,19.599;19.6,19.603,19.405,19.446;19.446,19.446,17.87,18.249;18.247,18.413,17.461,17.739;17.739,18.655,17.607,17.93;17.931,18.509,17.74,18.403;18.403,19.267,18.403,18.838;18.839,19.407,18.59,19.169;19.169,19.417,18.917,19.14;19.14,19.14,18.713,18.832;19.208,19.267,18.815,18.953;19.275,19.394,18.916,19.074;19.343,19.52,19.018,19.196;19.411,19.647,19.12,19.317;19.478,19.774,19.221,19.438;19.476,19.716,19.265,19.406;19.474,19.658,19.308,19.374;19.374,19.703,19.217,19.404;19.403,19.505,18.941,19.023;19.023,19.447,18.774,19.13;19.129,19.961,19.11,19.958;19.96,20.416,19.875,20.301;20.3,21.73,20.125,21.395;21.392,24.396,21.17,23.836;23.838,24.603,22.976,23.372;23.37,24.662,23.297,23.553;23.557,23.754,22.693,23.145;23.147,23.718,22.629,22.694;22.692,23.705,22.692,23.424;23.424,24.102,23.117,23.287;23.289,23.614,23.144,23.246;23.245,23.354,21.814,22.118;22.118,22.458,21.739,22.105;22.105,22.391,21.68,22.007;22.007,22.02,21.069,21.3;21.3,22.157,21.132,21.835;21.834,22.197,21.822,22.012;22.011,22.136,21.711,21.922;21.923,24.414,21.923,23.983;23.982,24.485,23.644,23.959;23.959,24.303,23.424,23.432;23.433,25.389,23.256,24.938;24.938,27.316,24.775,27.034;27.034,30.142,26.713,29.386;29.384,29.966,28.209,29.037;29.262,32.469,28.902,31.851;31.85,32.36,29.702,30.152;30.151,33.693,30.06,32.463;32.462,33.221,30.797,32.775;32.776,33.302,31.525,31.74;31.74,32.478,31.506,31.653;31.652,33.131,31.434,32.823;32.819,35.173,32.395,34.962;34.96,38.546,34.908,38.52;38.513,46.251,37.961,41.462;41.386,44.489,38.975,40.208;40.209,40.226,38.218,39.52;39.52,42.695,39.169,42.347;42.373,42.804,40.38,41.239;41.239,42.155,39.825,42.129;42.138,44.426,40.32,43.093;43.086,43.805,42.394,43.19;43.182,48.703,42.608,45.445;45.442,57.349,45.217,56.644;56.641,63.415,54.045,56.103;56.132,61.715,54.942,56.154;56.181,59.714,51.907,51.907;51.902,57.73,51.714,56.838;56.84,66.868,56.309,65.534;65.539,67.992,56.81,57.871;57.921,60.416,54.552,58.416;58.393,59.283,55.062,58.513;58.524,62.021,56.883,61.394;61.37,61.37,56.353,56.534;56.54,57.366,51.556,52;52.002,58.792,51.737,57.589;52.887,59.2,52.611,57.826;53.771,59.609,53.485,58.063;54.655,60.018,54.359,58.301;55.54,60.427,55.233,58.538;56.424,60.836,56.107,58.775;57.309,61.245,56.981,59.013;58.193,61.653,57.855,59.25;59.254,61.438,58.947,59.242;59.238,61.758,58.778,59.804;59.804,63.833,59.774,63.833;63.821,65.396,62.417,63.04;63.038,65.133,60.281,61.527;61.529,62.54,59.251,60.995;60.98,66.384,60.98,61.903;61.934,69.3,61.873,67.838;67.847,75.13,67.841,75.002;74.99,77.502,72.04,72.258;72.273,74.725,70.919,74.706;74.714,74.838,67.215,70.367;70.344,72.341,65.969,68.541;68.532,72.355,64.37,70.768;70.749,76.18,69.857,75.62;75.637,79.151,72.367,72.369;72.433,77.079,71.569,73.474;73.475,74.72,70.824,71.001;70.933,75.381,67.334,74.347;74.349,76.271,72.011,72.99;72.99,83.957,72.99,82.191;82.186,95.323,81.238,93.855;93.858,99.124,90.798,98.004;98.002,109.51,93.107,107.59;107.73,117.38,107.73,112.49;112.56,125.19,108.9,121.15;121.08,121.14,104.73,112.68;112.65,115.03,105.43,107.02;107.02,109.42,97.669,102.1;102.07,109.67,100.06,106.31;106.3,107.33,101.07,101.85;101.84,105.13,99.886,101.51;101.51,109.51,101.51,109.51;109.55,116.88,106.39,106.61;106.62,109.85,92.924,98.594;98.587,107.98,97.108,105.08;105.05,105.24,95.943,99.979;99.988,100.04,92.023,93.858;93.86,96.692,88.223,89.276;89.278,99.762,85.647,97.79;97.816,103.8,95.894,99.409;99.384,105.08,92.563,102.03;102.1,106.94,98.413,99.909;99.912,100.25,88.31,91.721;91.76,96.918,89.754,95.73;95.733,102.17,93.891,94.133;94.037,96.821,93.241,94.49;94.438,98.595,94.397,97.627;97.616,102.43,97.055,102.06;102.03,102.92,92.141,94.251;94.251,95.165,87.484,93.386;93.394,94.025,90.494,92.57;92.59,93.714,90.848,90.848;90.904,91.636,82.66,83.623;83.622,85.84,79.067,84.275;84.287,89.268,83.419,88.732;88.738,89.377,85.274,86.889;86.889,93.529,86.148,92.442;92.388,94.438,90.845,94.163;94.182,99.377,93.538,95.938;95.938,101.77,95.176,101.57;101.57,106.21,101.11,101.47;101.45,102.55,96.104,97.029;97.025,97.944,93.379,97.847;97.835,102.41,97.574,100.44;100.45,101.06,96.813,97.88;97.885,98.458,95.266,95.477;95.471,98.544,94.293,95.549;95.55,97.791,93.281,96.861;96.862,101.24,94.72,100.98;101,104.8,100.55,102.79;102.79,108.99,102.79,106.93;106.93,110.74,106.93,109.13;109.12,110.56,107.36,107.5;107.49,112.07,103.61,111.99;111.98,114.81,108.49,112.58;112.57,118.33,110.88,116.98;116.99,118.31,111.78,113.7;113.67,114.25,108.35,110.45;110.44,111.07,106.13,108.98;108.99,114,107.61,112.17;112.18,114.72,111.08,111.49;111.48,112.04,104.89,108.46;108.45,108.45,100.41,105.13;105.12,107,101.64,101.67;101.67,103.02,98.958,99.955;99.954,104.65,98.585,104.13;104.13,104.33,102.17,103.45;103.45,110.58,100.46,109.92;109.92,112.2,105.9,108.39;108.4,118.05,107.46,118.05;118.24,134.47,117.67,125.71;125.64,137.6,125.64,129.99;129.98,131.45,127.68,129.7;129.79,132.06,125.77,130.45;130.42,134.87,127.8,133.19;133.16,142.65,109.54,125.71;125.7,134.81,120.32,130.74;130.74,149.22,130.7,143.98;143.98,152.42,142.54,145.24;145.24,149.35,144.29,144.61;144.61,148.67,140.84,144.52;144.51,150.02,137.63,148.75;148.75,154.94,142.87,151.02;151.02,166.45,148.95,163.84;163.84,177.89,160.23,176.68;176.68,188.5,165.41,182.96;182.97,197.66,177.46,181.88;181.88,204.29,179.23,202.12;202.12,209.7,194.85,195.99;195.99,198.24,166.18,170.02;170.02,192.91,163.3,191.55;191.55,195.31,176.28,179.22;179.24,181.32,167.88,174.36;174.36,178.8,171.02,172.9;172.9,186.63,171.67,183.57;183.57,194.43,181.25,189.08;189.08,196.29,186.75,190.7;190.7,192.5,180.42,186.36;186.36,190.88,181,189.62;189.62,192.97,183.65,192.23;192.23,199.73,191.22,194.39;194.38,203.03,194.04,202.87;202.87,204.18,187.49,192.57;192.57,192.57,176.13,181.17;181.17,191.69,177.4,185.25;185.25,190.07,180.51,183.96;183.96,184.98,168.24,174.5;174.5,179.7,173.87,178.92;178.92,182.54,177.07,179.65;179.65,184.3,175.59,180.78;180.78,180.83,169.37,172.41;172.41,175.32,163.81,173.44;173.44,176.24,170.39,172.58;172.58,175.81,145.52,153.64;153.63,154.94,119.83,139.34;139.34,152.5,131.29,151.28;151.3,155.96,134.57,138.51;138.51,140.28,126.87,136.28;136.28,142.6,127.53,131.87;131.87,143.73,128.08,142.08;142.08,147.33,128.86,142.68;142.68,152.1,140.01,151.13;151.13,153.42,147.17,148.61;148.61,158.37,146.99,157.03;157.03,159.94,153.32,154.7;154.7,159.58,145.77,147.75;147.75,149.3,142.26,144.89;144.89,145.85,138.91,139.1;139.1,142.87,134.03,141.29;141.29,144.51,137.23,137.86;137.86,138.74,133.71,137.78;137.78,139.67,121.64,126.96;126.96,135.11,119.38,134.63;134.63,140.28,128.26,137.81;137.81,144.96,136.12,143.77;143.77,148.94,142.57,146.14;146.14,147.92,143.48,145.71;145.71,156.63,145.58,152.8;152.81,159.05,148.08,148.13;148.13,149.81,140.17,142.29;142.29,153.09,140.79,152.85;152.85,155.41,144.94,146.22;146.22,147.43,143.33,145.31;145.31,147.57,142.88,143.52;143.52,150.55,138.03,147.28;147.28,148.83,141.91,142.03;142.03,158.64,141.35,158.19;158.19,164.32,156.77,159.12;159.12,171.61,159.12,169.53;169.53,175.78,168.93,172.54;172.54,175.19,166.73,170.09;170.09,187.45,168.03,186.52;186.52,188.49,174.71,178.12;178.12,183.07,175.45,176.86;176.86,180.17,167.4,175.99;175.99,176.03,162.87,167.8;167.8,170.36,166.11,168.44;168.44,168.44,161.26,163.35;163.35,171.99,163.34,170;170,173.02,164.97,168.65;168.65,173.64,167.32,168.07;168.07,172.42,163.68,166.98;166.98,170.63,163.93,165.64;165.64,167.74,165.59,166.03;166.03,166.92,161.65,163.25;163.25,167.04,161.85,164.92;164.93,171.82,164.52,171.8;171.8,175.48,171.38,173.48;173.48,174.3,167.86,170.02;170.02,172.44,155.8,162.51;162.5,163.62,157.54,157.97;157.96,162.92,156.77,162.08;162.08,162.83,157.77,158.93;158.93,159.52,145.87,149.43;149.42,161.51,145.82,155.18;155.19,155.19,146.17,147.31;147.28,148.79,140.12,143.09;143.07,145.54,143.02,145.41;145.42,151.13,143.18,151.13;151.14,151.58,140.14,143.33;143.31,143.61,130.29,137.5;137.48,141.67,134.73,135.61;135.61,141.08,132.09,133.47;133.47,135.23,128.92,134.59;134.57,136.46,133.14,133.67;133.66,135.01,128.27,128.59;128.6,132.31,123.67,132.24;132.27,139.73,131.3,136.56;136.55,140.17,134.93,136.61;136.61,150.77,135.24,149.45;149.45,150.05,139.31,139.7;139.72,142.82,139.67,140.01;140.01,147.2,137.14,146.49;146.48,148.8,145.82,146.6;146.59,154.71,146.12,153.7;153.71,154.2,139.52,140.73;140.72,142.51,127.55,127.55;127.61,135.85,122.44,134.37;134.36,144.01,132.61,143.24;143.19,143.19,131.77,131.77;131.8,141.63,128.56,139.46;139.54,143.93,136.74,141.35;141.37,145.85,138.86,141.97;141.98,145.32,135.85,135.88;135.86,140.42,134.16,139.53;139.53,143.37,138.18,141.92;141.93,148.55,141.93,147.62;147.67,159.94,147.2,159.93;159.77,162.47,153.05,160.55;160.56,163.6,155.07,155.58;155.59,161.59,155.57,159.07;159.09,171.51,156.61,169.19;169.18,174.83,167.56,173.89;173.89,184.87,171.12,184.54;184.55,184.79,177.04,178.98;178.98,180.5,170.99,172.76;172.76,182.36,171.21,178.03;178.03,179.52,165.93,171.96;171.96,183.54,171.88,183.14;183.14,188.14,178.6,184.09;184.09,186.51,181.4,184.89;184.89,193.73,181.89,182.78;182.77,184.18,176.02,179.11;179.11,184.18,171.82,171.83;171.83,172.69,157.99,167.67;167.66,169.04,150.08,152.64;152.64,153.78,140.22,142.92;142.92,145.84,132.14,138.06;138.05,139.14,110.61,129.86;129.86,149.35,129.79,144.09;144.09,155.01,142.75,144.63;144.63,163.03,142.02,162.93;162.93,163.25,151.23,156.46;156.46,158.59,152.87,153.96;153.96,157.93,141.35,141.53;141.53,150.81,141.44,146.45;146.45,149.61,143.15,146.71;146.71,151.73,142.72,143.92;143.92,147.35,138.16,142.75;142.74,144.8,136.38,139.33;139.33,141.96,137.87,141.8;141.8,146.96,140.96,142.59;142.59,145.92,140.75,144.34;144.35,148.65,141.36,143.17;142.33,144.16,139.27,142.71;142.71,144.81,140.93,143.26;143.26,153.77,143.16,153.11;153.11,162.17,152.15,160.73;160.73,161.95,155.51,158.91;158.91,161.91,155.88,157.24;157.24,159.62,145.66,146.9;146.9,148.69,140.97,143.89;143.89,147.22,138.27,140.05;140.05,141.01,132.45,138.1;138.1,138.99,134.64,135.37;135.37,136,128.24,128.69;128.69,135.35,127.27,135;135,137.14,127.57,127.58;127.58,134.87,123.61,133.6;133.6,135.09,128.14,129.33;129.33,134.17,121.06,124.99;124.99,129.29,124.27,127.72;127.72,131.52,126.81,129.99;129.99,136.19,127.22,135.03;135.03,137.81,132.63,135.64;135.63,135.8,128.43,132.5;132.5,136.61,132.44,136.14;136.14,139.83,131.86,139.1;139.1,139.73,135.94,137.18;137.18,137.92,130.97,131.5;131.5,132.3,129.14,131.47;131.47,135.49,130.48,131.54;131.54,133.99,127.25,133.99;133.99,143.9,133.99,142.84;142.84,151.76,141.32,146.57;146.57,149.84,144.8,149.53;149.53,149.87,141.38,144.8;144.8,148.97,142.64,144.81;144.81,153.54,143.3,152.89;152.89,153.55,147.45,148.02;148.02,157.86,146.87,155.58;155.58,160.98,154.13,157.75;157.75,159.35,155.3,156.91;156.91,161.62,155.24,158.63;158.63,159.51,152.02,152.62;152.62,157.26,142.84,145.29;145.29,148.83,138.92,140.39;140.38,142.81,133.55,136.79;136.79,144.43,136.08,143.17;143.17,144.83,141.17,142.71;142.71,146.62,142.11,146.44;146.44,152.1,143.6,143.99;143.99,145.45,141.24,143.39;143.4,145.13,138.8,139.32;139.31,140.58,135.58,138.89;138.89,146.43,138.76,145.38;145.38,147.14,144.76,146.5;146.5,148.71,144.62,147.57;147.57,157.75,147.01,157.45;157.45,158.72,150.91,154.72;154.72,158.14,153.08,154.23;154.24,155.55,147.94,150.32;150.32,156.54,149.7,154.98;154.98,159.71,153.91,159.64;159.64,167.59,157.77,166.94;166.94,171.43,161.81,166.22;166.22,170.76,163.29,167.26;167.26,173.82,164.19,170.93;171.11,179,170.52,177.16;177.16,177.19,160.04,164.76;164.76,172.82,162.44,170.71;170.71,177.9,170.19,176.55;176.55,179.41,172.87,178.1;178.1,183.04,176.86,179.36;179.36,181.15,173.4,174.92;174.93,176.28,167.58,168.43;168.43,173.85,164.03,166.26;166.26,168.46,162.39,166.01;166.01,166.38,158.14,162.55;162.55,164.71,155.17,157.75;157.75,169.13,156.99,166.72;166.72,189.92,166.7,186.95;186.95,197.9,186.14,196.33;196.33,204.97,196.02,199.94;199.94,203.35,195.47,199.95;200.2,215.18,198.98,210.61;210.61,223.22,204.56,222.64;222.64,225.01,205.45,212.23;212.21,220.34,201.47,215.18;215.18,222.64,207.5,209.22;209.24,219.54,204.83,218.09;218.57,221.66,213.8,215.85;215.85,241.24,212.73,237.58;237.58,248.19,234.4,239.79;239.8,247.09,234.15,238.1;238.09,242.11,230.91,235.42;235.43,259.05,230.34,257.07;257.08,263.7,252.14,256.52;256.52,263.83,253.19,255.18;255.18,259.63,243.12,252.92;252.92,256.42,231.55,234.45;234.45,239.64,222.96,230.98;230.97,243.12,228.13,242.3;242.3,245.2,233.2,237.76;237.76,246.78,236.82,243.55;243.55,245.24,237.72,237.74;237.74,239.81,234.53,237.07;237.07,237.88,220.55,225.76;225.77,239.27,216.47,234.2;234.2,240.72,225.25,229.12;229.12,244.68,223.46,234;236.54,246.42,231.43,237.05;237.05,243.12,234.66,238.55;239.49,241.44,233.71,236.67;237.46,237.46,209.71,217.34;217.33,220.74,203.72,213.82;213.84,230.51,211.99,227.45;227.45,234.33,225.95,227.03;227.03,228.27,220.82,224.84;224.84,227.24,215.34,219.84;219.84,225.07,215.91,223.66;223.66,227.04,213.48,216.33;216.33,228.69,211.91,222.82;222.82,225.89,205,206.38;206.38,212,188.03,194.28;194.28,199.36,175.91,194.21;194.21,201.63,178.74,181.3;181.29,187.53,177.13,180.17;180.17,193.05,176.72,189.75;189.75,198.7,186.12,196.99;196.99,201.63,195.35,197.48;197.48,199.4,186.86,188.22;188.22,193.75,182.95,183.83;183.83,195.44,183.83,195.01;195.02,197.18,188.34,189.74;189.74,196.12,185.94,191.03;191.05,198.68,187.98,189.26;189.27,194.82,187.88,193.87;193.87,209.07,193.26,207.77;207.77,219.56,205.65,217.75;217.75,217.91,213.83,216.62;216.62,218.88,211.77,213.39;213.39,222.95,211.65,218.72;218.41,219.14,202.12,202.23;202.23,203.06,188.96,197.56;197.56,198.9,182.32,185.03;185.01,192.76,183.87,187.58;187.57,191.72,184.28,188;188,190.75,185.25,188.56;188.55,191.78,170.63,182.84;182.83,189.94,181.96,187.5;187.5,205.93,186,205.91;205.92,216.84,198.66,211.23;211.23,221.85,209.97,219.62;219.62,268.75,217.58,261.87;261.87,294.33,239.61,250.59;250.62,272.15,231.63,242.25;242.24,259.83,231.68,250.41;250.41,271.53,248.75,257.24;257.24,258.13,242.5,253.46;253.46,269.81,247.63,253.36;253.37,260.58,246.66,256.07;256.07,259.63,240.85,240.88;240.89,242.43,221.98,235.07;235.07,243.89,225.26,227.2;227.2,237.71,222.92,227.94;227.95,244.33,227.14,239.02;239.02,241.67,228.48,231.64;231.64,233.86,213.44,213.79;213.78,218.38,195.45,203.12;203.12,218.65,180.41,216.15;216.15,220,202.85,207.09;207.08,209.32,195.39,195.99;195.99,203.89,188.17,189.77;189.76,203.15,188.48,192.2;192.2,200.83,190.13,199.6;199.59,207.27,194.24,200.5;200.5,208.83,196.38,200.36;200.36,205.92,195.32,197.98;197.98,198.45,189.61,196.77;196.77,198.26,189.43,194.46;194.45,205.13,194.35,199.94;199.89,200.05,192.81,194.48;194.48,196.07,186.98,188.49;188.49,189.51,175.26,177.69;177.69,178.95,161.31,169.08;169.09,174.12,163.96,169.01;169.01,176.59,167.87,176.05;176.04,180.43,167.31,168.89;168.89,174.47,168.37,172.16;172.16,173.04,166.63,168.04;168.04,169.56,140.57,141.99;141.99,146.74,132.49,144.11;144.1,144.87,130.69,134.83;134.83,142.18,134.73,137.62;137.62,148.18,125.74,148.03;148.03,150.79,138.68,143.68;143.68,178.51,140.3,178.5;178.5,178.63,139.79,142.02;142.03,146.4,131.57,144.92;144.92,149.49,140.6,146.27;146.27,152.78,142.78,143.36;143.36,150.02,135.72,139.21;139.21,140.9,135.48,136.94;136.94,139.73,125.94,126.44;126.44,131.24,115.92,118.29;118.29,128.15,113.19,125.26;125.26,130.66,121.37,126.58;126.58,128.16,120.91,123.29;123.29,135.64,123.12,133.31;133.31,136.48,132.56,135.91;135.92,136.47,125.39,125.99;125.99,130.53,125.86,128.16;128.16,128.16,121.94,125.31;125.31,135.93,124.3,135.57;135.57,135.77,126.85,127.5;127.5,129.96,124.98,128.43;128.43,131.58,127.93,128.48;128.48,133.96,128.34,132.6;132.6,144.88,132.16,140.87;140.87,147.06,138.35,143.82;143.82,145.37,136.14,137.29;137.29,140.17,135.92,138.35;138.35,138.95,127.98,129.42;129.42,130.38,123.07,124.59;124.59,126.62,123.3,124.64;124.64,127.7,123.08,124.69;124.7,130.03,123.95,126.68;126.68,135.7,117.74,117.76;117.75,120.79,112.48,117.06;117.06,123.9,113.6,122.79;122.79,122.79,117.19,120.26;120.26,120.93,104,105.71;105.71,111.47,96.588,106.9;106.91,112.3,103.14,105.51;105.51,120.47,101.43,119.06;119.06,119.08,108.6,112.8;112.81,122.4,112.19,121.53;121.53,133.76,119.66,132.26;132.26,133.51,125.52,128.58;128.58,135.19,128.23,129.31;129.31,134.19,126.14,126.26;126.26,133.59,123.72,131.45;131.45,135.91,129.73,134.7;134.7,135.87,132.59,134.07;134.07,140.09,133.69,139.75;139.75,141.83,135.77,137.77;137.77,142.66,134.12,136.7;136.7,149.95,135.38,148.74;148.74,153.87,147.45,151.15;151.15,152.75,145.66,152.3;152.32,156.05,150.13,150.92;150.92,153.02,148.04,149.29;149.29,150.21,145.77,148.25;148.25,153.21,144.89,147.81;147.81,150.04,145.17,146.43;146.43,148.21,140.71,147.64;147.64,153.87,147.61,150.85;150.84,151.73,147.45,148.05;148.05,148.96,146.11,146.8;146.8,147.68,143.82,143.98;143.99,147.62,142.9,146.7;146.7,147.09,141.67,146.77;146.77,149.34,144.88,147.21;147.22,163.98,147.21,163.96;163.96,175.86,161.25,172.83;172.83,178.57,168.93,177.62;177.62,179.62,169.72,173.03;173.04,180.95,169.08,174.25;174.25,184.7,166.81,184.01;184.01,184.72,173.73,176.71;176.71,178.11,167.28,169.01;169.01,173.96,166.76,167.33;167.33,169.77,164.22,165.93;165.93,176.49,165.51,173.9;173.84,173.84,159.65,166.86;166.86,172.86,164.78,168.48;168.48,175.52,166.3,173.68;173.68,180.55,172.76,179.69;179.69,187.28,173.57,173.83;173.84,178.14,172.79,176.04;176.03,176.72,169.36,175.73;175.73,178.98,173.7,174.91;174.91,179.22,171.58,176.82;176.81,177.38,169.11,172.19;172.19,175.18,166.26,166.59;166.59,167.35,156.03,156.23;156.24,157.94,152.44,156.64;156.64,157.83,150.84,157.78;157.78,158.89,152,157;157,163.39,154.71,155.34;155.34,157.85,153.18,153.36;153.36,154.56,141.9,144.54;144.54,152.02,144.44,147.91;147.91,152.83,147.19,150.13;150.13,155.04,148.22,152.43;152.43,161.5,149.84,161.09;161.09,165.53,156.84,165.03;165.03,168.02,159.43,161.06;161.06,161.2,152.24,152.79;152.79,152.79,141.44,148.63;148.63,148.65,142.23,144.76;144.76,153.22,144.36,152.81;152.81,158.61,150.87,150.87;150.86,154.15,145.87,147.75;147.75,149.16,143.97,146.35;146.36,147.79,143.11,147.07;147.07,148.72,136.51,140.17;140.17,142.5,132.41,135.16;135.2,137.55,126.83,131.62;131.62,146.6,131.16,144.85;144.85,146.59,142.57,145.95;145.95,147.77,142.56,143.51;143.51,147.73,138.81,139.06;139.06,144.4,137.79,142.19;142.19,152.44,141.35,150.83;150.83,154.42,149.53,153.35;153.35,159.63,149.61,154.74;154.74,155.35,145.21,146.93;146.93,154.41,146.23,152.23;152.23,156.19,150.15,152.4;152.4,153.56,145.45,147.76;147.76,148.59,146.08,147.64;147.64,153.39,146.9,151.87;151.87,153.28,147.79,148.87;148.87,152.8,147.95,151.81;151.81,157.88,150.7,157.28;157.28,165.08,156.05,164.06;164.06,167.92,160.07,162.88;162.88,163.85,158,160.68;160.68,163.96,159.92,161.19;161.19,168.34,160.78,162.28;162.28,164.12,157.6,163.95;163.95,175.84,161.69,173.71;173.71,178.07,169.03,175.79;175.79,184.37,173.91,177.38;177.38,178.37,174.31,177.07;177.07,183.32,176.53,181.55;181.55,198.92,178.56,195.99;195.99,205.87,194.28,205.7;205.71,205.76,184.33,189.54;189.54,191.88,179.95,182.61;182.6,186.79,176.41,186.78;186.78,189.65,184.53,184.91;184.91,190.44,184.74,188.73;188.73,194.66,182.37,182.54;182.56,186.49,178.57,181.34;181.34,182.38,172.34,177.69;177.69,182.48,171.85,172.42;172.42,172.42,159.79,162.88;162.88,165.11,156.08,158.48;158.48,162.82,156.87,161.95;161.96,169.71,161.44,169.43;169.43,171.56,161.64,164.1;164.1,169.86,161.4,168.18;168.18,175.49,166.89,175.49;175.49,179.36,173.7,176.76;176.76,183.14,176.76,180.18;180.18,185.92,178,182.9;182.9,186.66,173.69,174.98;174.98,193.44,173.84,191.86;191.86,204.47,191.5,201.59;201.59,209.67,187.78,192.59;192.59,198.14,183.76,185.74;185.74,189.98,185.46,189.77;189.77,195.44,187.72,191.16;191.16,191.35,180.41,183.07;183.07,185.78,175.99,176.11;176.11,187.69,176.1,187.59;187.59,189.4,179.71,180.28;180.28,201.94,177.47,200.65;200.65,207.84,195.37,203.94;203.94,211.76,201.71,205.85;205.86,213.01,186.03,187.28;187.27,197.85,186.17,195.91;195.91,211.86,194.06,202.92;202.93,216.09,202.01,214.41;214.4,217.84,200.44,205.22;205.21,206.8,197.89,202.86;202.86,206.51,200.66,200.86;200.86,204.22,194.38,197.11;197.11,209.48,197.09,209.48;209.48,212.82,207.58,210.75;210.75,211.8,202.13,202.56;202.55,209.86,201.18,203.5;203.5,204.56,199.64,200.25;200.25,207.87,200.23,206.47;206.46,216.9,205.72,214.19;214.19,219.52,211.16,217.25;217.25,225.51,215.27,223.99;223.99,228.91,222.03,228.76;228.76,243.79,228.26,242.3;242.3,244.14,236.47,242.6;242.6,249.12,240.21,240.56;240.55,244,230.48,234.36;234.36,240.68,231.87,236.99;236.98,246.46,232.77,244.86;244.85,253.21,242.91,247.64;247.64,248.51,235.87,238.55;238.55,241,237.18,239.59;239.59,241.81,235.72,236.58;236.57,236.87,216.92,220.5;220.5,221.35,212.8,213.72;213.71,216.38,206.04,211.76;211.75,212.4,192.08,192.38;192.4,205.42,191.13,205.35;205.35,205.4,200.27,203.58;203.58,210.9,198.32,210.74;210.74,214.69,205.13,213.05;213.04,213.51,204.57,208.74;208.74,221.68,206.62,221.68;221.69,234.86,219.86,234.86;234.85,236.79,227.68,233;233,233.9,224.47,228;228,236.78,226.9,228.6;228.6,237.32,228,232.52;232.51,235.09,220.45,220.48;220.49,229.56,218.18,229.1;229.1,229.32,217.2,220.99;220.99,224.25,174.07,188.66;188.64,190.88,173.75,178.05;178.06,198.87,173.52,197.51;197.51,209.25,191.94,208.37;208.36,211.11,191.67,202.46;202.46,208.33,192.7,194.02;194.02,197.96,182.25,184.69;184.69,187.43,174.74,182.03;182.04,188.27,182.02,187.66;187.66,192.2,183.46,187.8;187.8,194.34,184.05,189.75;189.76,197.37,183.31,185.67;185.67,187.33,177.67,180.15;180.15,193.18,179.8,191.39;191.39,195.31,189.11,193.56;193.56,195.08,191.6,194.04;194.04,200.62,192.16,200.03;200.03,205.02,197.6,198.74;198.74,203.83,191.39,194.44;194.43,201.68,190.61,194.41;194.4,198.04,179.22,184.62;184.63,189.85,184.02,187.21;187.21,187.35,184.06,186.38;186.38,188.14,182.83,187.83;187.83,188.74,163.55,166.09;166.1,168.2,146.75,155.4;155.4,163.66,147.89,162.57;162.56,162.78,153.79,155.07;155.07,164.09,150.44,161.71;161.71,164.71,156.09,158.1;158.1,166.23,155.38,164.45;164.45,170.16,163.86,167.37;167.37,171.61,154.26,154.57;154.56,161.01,151.47,153.26;153.26,156.99,141.4,145.11;145.11,145.47,136.04,138.68;138.68,143.59,138.68,139.54;139.53,143.16,134.97,137.27;137.27,142.47,129.02,130.85;130.85,141.83,129.31,140.71;140.71,142.48,130.64,136.77;136.77,144.33,131.39,133.52;133.51,134.79,122.27,128.5;128.5,129.64,125.4,127.55;127.55,133.33,127.55,130.71;130.71,139.48,128.54,138.37;138.38,140.35,133.51,138.89;138.89,144.47,135.63,143.01;143.01,144.17,140.7,140.85;140.85,143.3,136.29,137.39;137.39,137.89,135.12,136.08;136.08,139.94,133.56,133.56;133.56,133.61,123.31,126.71;126.71,140.66,126.14,138.67;138.67,145.73,137.94,144.9;144.89,146.72,138.07,139.01;139.01,140.38,131.14,133.32;133.32,134.07,131.51,132.35;132.35,136.23,128.29,132.09;132.1,139.21,131.67,133.28;133.28,144.74,131.87,137.9;137.91,142.44,135.86,136.47;136.46,137.68,129.38,136.37;136.37,139.99,130.68,132.32;132.32,134.25,131.99,133.25;133.25,133.59,128.9,129.48;129.48,134.72,124,127.76;127.76,129.95,125.45,129.25;129.25,133.44,121.56,123.12;123.13,128.76,117.32,119.57;119.57,127.51,117.8,126.19;126.19,126.76,125.39,125.81;125.81,126.46,123.6,125.99;125.99,128.39,124.41,125.8;125.8,126.73,122.33,123.86;123.86,124.11,120.78,122.46;122.46,124.19,119.9,119.95;119.95,124.93,119.57,122.2;122.2,124.75,121.86,124.65;124.65,125.22,123.07,125.2;125.2,129.3,122.43,123.13;123.12,126.19,122.54,124.93;124.93,127.12,123.46,124.48;124.48,126.99,124.05,126.76;126.76,132.99,125.79,132.13;132.13,133.61,129.94,133.3;133.3,135.35,133.23,133.9;133.9,139.64,133.35,137.99;137.99,143.04,136.37,141.1;141.1,141.1,134.69,136.31;136.31,139.83,132.82,138.29;138.3,140.9,135.05,135.76;135.76,136.82,135.29,135.73;135.73,141.04,135.64,139.49;139.49,143.91,138.42,139.14;139.14,147.31,137.81,145.36;145.36,148.22,143.52,146.75;146.76,146.76,141.04,142.33;142.33,145.38,140.44,144.86;144.86,144.87,143.57,143.73;143.73,143.82,137.96,138;138,138,132.82,133.34;133.34,134.39,125.67,125.71;125.71,131.84,125.59,129.38;129.38,130.49,126.85,128.29;128.29,129.73,125.38,127.36;127.36,127.9,126.56,127.05;127.05,127.23,117.58,118.77;118.77,125.06,118.66,124.14;124.14,127.62,123.05,127.05;127.05,127.97,124.89,125.12;125.12,125.19,115.42,117.61;117.6,118.87,112.97,117.36;117.36,118.61,99.98,105.44;105.44,106.2,98.529,100.85;100.84,105.69,96.429,104.47;104.47,104.91,96.813,97.564;97.564,99.452,89.662,92.029;92.029,92.903,77.775,78.187;78.186,89.507,68.692,87.465;87.467,89.059,84.328,87.64;87.64,88.674,85.871,87.044;87.042,88.469,82.939,86.702;86.704,87.344,81.99,82.915;82.916,84.227,78.4,79.254;79.254,82.107,76.669,78.348;78.347,85.464,77.617,84.323;84.322,88.804,84.236,88.161;88.161,91.076,85.008,86.005;86.008,86.67,82.732,86.429;86.429,87.55,83.132,85.198;85.197,85.851,80.571,81.567;81.567,82.574,79.754,82.393;82.393,85.262,81.852,84.635;84.635,86.641,84.029,85.211;85.211,85.482,82.55,82.791;82.787,82.787,77.277,77.753;77.754,79.579,76.023,79.037;79.037,91.048,78.808,87.916;87.91,89.119,84.501,85.909;85.909,88.041,80.933,81.951;81.951,85.259,77.446,84.366;84.366,88.654,81.844,83.578;83.576,89.889,82.491,86.635;86.636,87.323,82.877,87.02;87.02,93.827,84.943,90.834;90.834,92.789,88.009,88.691;88.693,89.245,83.743,84.682;84.681,85.003,82.495,83.18;83.18,84.054,80.711,81.625;81.625,86.915,81.6,84.936;84.937,88.631,84.926,85.838;85.838,87.832,84.452,86.565;86.567,87.591,84.816,86.868;86.868,92.881,86.813,88.153;88.154,88.671,86.63,88.071;88.07,92.998,87.499,92.252;92.258,97.418,91.246,96.224;96.224,96.748,93.323,94.706;94.705,95.539,88.812,90.066;90.064,91.228,87.194,88.918;88.917,90.237,88.242,89.854;89.854,90.761,87.441,87.465;87.467,89.047,85.293,86.128;86.129,92.164,85.25,91.424;91.425,92.15,88.489,90.822;90.822,93.263,90.803,91.708;91.708,91.896,85.513,86.444;86.446,86.914,82.043,83.019;83.018,84.055,81.87,82.016;82.016,83.072,79.575,81.422;81.422,84.721,81.198,82.444;82.444,84.229,80.213,83.106;83.109,86.391,80.934,81.195;81.195,81.702,76.817,78.951;78.951,80.561,78.918,80.369;80.369,81.29,79.744,80.808;80.809,81.97,78.603,81.854;81.855,82.873,79.731,80.152;80.144,86.815,78.431,85.648;85.649,85.807,82.349,82.582;82.582,85.608,81.549,83.298;83.297,85.483,82.766,84.828;84.829,86.182,83.987,84.949;84.949,84.994,81.407,81.535;81.535,86.678,81.508,86.657;86.654,87.532,83.396,83.775;83.774,85.578,82.747,84.919;84.92,90.378,84.204,88.994;88.995,90.67,87.438,88.874;88.874,89.151,85.942,86.203;86.203,87.076,83.173,83.581;83.58,86.168,83.482,85.333;85.332,86.705,84.421,86.029;86.03,89.264,86.027,86.916;86.917,87.047,84.627,86.141;86.14,86.925,85.076,86.232;86.232,86.775,85.614,86.151;86.151,87.12,85.905,86.97;86.971,88.046,83.849,84.818;84.818,84.902,83.045,84.039;84.038,85.51,81.626,83.027;83.027,83.931,82.274,83.024;83.024,84.722,83.019,83.724;83.723,84.82,83.511,84.277;84.277,84.766,83.593,83.9;83.9,85.803,83.366,84.09;84.089,86.894,84.051,86.319;86.319,89.892,86.139,89.145;89.146,90.315,87.683,88.405;88.405,92.725,87.692,91.95;91.95,94.03,91.896,93.146;93.146,96.811,92.643,96.427;96.427,98.267,94.433,97.35;97.35,97.618,93.643,94.284;94.284,95.864,90.42,91.085;91.086,93.579,89.897,92.149;92.148,92.563,88.762,89.2;89.201,89.348,85.695,86.536;86.536,87.172,83.802,85.173;85.172,85.668,83.518,85.297;85.297,85.778,83.855,84.209;84.209,86.9,83.862,86.042;86.042,87.787,85.357,87.156;87.157,87.661,84.037,84.307;84.307,87.144,81.692,85.658;85.658,86.762,83.82,85.25;85.249,86.367,84.723,85.011;85.01,85.984,83.192,83.587;83.587,84.563,82.063,82.368;82.368,82.812,80.042,81.985;81.985,83.05,80.357,81.932;81.933,82.989,81.824,82.547;82.548,83.218,81.342,82.298;82.298,82.881,79.1,81.087;81.087,81.142,72.87,74.143;74.143,75.543,70.971,71.612;71.612,71.96,67.524,68.719;68.719,68.93,61.588,63.487;63.488,64.792,60.415,62.19;62.189,67.445,62.002,66.311;66.311,67.967,65.024,66.795;66.795,67.389,63.633,64.962;64.962,65.408,62.376,63.161;63.161,67.208,63.159,66.822;66.823,68.688,65.941,66.749;66.75,69.454,66.645,68.873;68.873,71.182,66.979,71.166;71.166,75.939,70.768,73.979;73.979,75.447,72.475,73.414;73.414,74.376,71.05,71.931;71.93,72.545,68.306,69.626;69.625,69.982,67.919,69.721;69.722,74.119,69.475,73.173;73.173,74.508,72.38,72.418;72.418,74.892,71.635,71.908;71.908,71.922,68.339,69.644;69.644,70.226,64.831,67.982;67.982,69.437,64.418,67.574;67.574,73.703,65.921,71.835;71.835,73.016,70.388,70.411;70.411,72.048,69.839,71.313;71.313,75.92,70.509,74.947;74.947,75.058,71.919,73.523;73.526,78.612,72.594,77.384;77.384,82.599,76.9,80.644;80.644,82.954,80.349,82.28;82.28,83.809,81.365,81.65;81.649,82.211,79.735,81.423;81.425,83.059,79.22,81.915;81.916,82.673,80.463,80.649;80.648,80.69,76.257,77.787;77.787,78.587,76.843,78.045;78.044,79.552,77.297,78.067;78.067,78.717,76.814,76.824;76.824,77.658,75.797,76.874;76.874,78.021,74.162,74.861;74.862,77.817,74.551,77.762;77.763,78.877,77.06,77.264;77.264,77.434,75.035,75.272;75.272,75.64,73.402,75.012;75.01,75.56,74.531,75.461;75.461,76.586,75.433,76.355;76.354,78.192,75.557,77.792;77.792,78.726,77.563,78.109;78.109,78.708,76.994,77.906;77.906,78.455,75.47,75.86;75.86,76.277,73.469,73.88;73.88,74.644,73.616,74.429;74.429,76.916,74.429,76.602;76.603,77.371,73.825,74.142;74.143,74.428,72.379,73.699;73.702,74.403,72.4,73.597;73.598,74.856,73.086,74.468;74.469,75.115,72.651,72.79;72.789,73.119,70.694,71.866;71.866,74.094,71.866,73.449;73.451,74.112,71.96,73.474;73.474,74.342,73.008,73.718;73.718,74.642,73.284,73.961;73.962,74.216,72.309,72.577;72.577,74.232,72.467,73.643;73.643,76.617,73.568,75.972;75.972,77.617,75.739,76.212;76.213,77.01,75.586,75.945;75.947,76.54,74.662,76.195;76.196,77,75.363,75.525;75.526,76.503,75.079,76.177;76.175,76.237,74.67,75.327;75.328,75.642,74.993,75.272;75.272,75.6,74.204,74.539;74.539,76.119,74.399,75.944;75.944,77.281,75.186,77.031;77.032,86.897,76.619,85.374;85.372,87.897,84.084,87.637;87.638,94.743,87.605,93.654;93.658,101.75,91.283,93.913;93.913,96.623,91.816,95.442;95.441,98.653,93.335,98.562;98.559,102.59,96.06,96.604;96.603,102.28,95.235,102.17;102.16,110.04,100.63,109.21;109.21,109.91,102.58,104.13;104.13,105.77,103.14,105.65;105.65,107.31,100.69,101.88;101.88,104.82,100.98,103;103,104.3,98.515,99.987;99.987,100.58,97.451,100.39;100.39,105.51,99.442,103.98;103.98,104.58,100.57,101.95;101.95,104.25,101.69,103.19;103.19,107.12,103.18,106.45;106.45,106.85,103.11,103.87;103.87,104.65,101.85,103.33;103.32,104.98,100.69,101.61;101.61,102.1,98.69,98.69;98.69,105.49,98.626,102.4;102.4,102.5,101.27,101.79;101.79,102.26,99.235,99.246;99.25,104.67,99.078,102.5;102.5,102.74,96.394,96.888;96.889,98.725,96.226,98.642;98.637,101.84,98.456,101.6;101.6,114.06,100.95,112.6;112.6,113.74,110.13,111.01;111.01,111.24,107.53,111.13;111.13,119.81,110.96,118.75;118.75,119.29,115.62,118.51;118.51,119.62,113.31,114.98;114.98,117.61,112.84,117.01;117.01,122.75,115.94,122.01;122.01,122.25,119.89,121.43;121.43,124.62,120.14,122.06;122.06,122.72,117.35,118.84;118.84,121.49,116.53,119.06;119.06,122.52,117.23,117.99;118,119.51,116.83,118.4;118.4,123.48,117.41,118.62;118.61,120.02,118.56,119.65;119.64,122.16,119.61,121.53;121.53,121.94,119.06,120.75;120.75,121.84,119,120.79;120.78,120.78,115.3,116.22;116.22,116.7,105.84,109.44;109.44,111.65,108.44,109.14;109.14,110.59,108.9,110.03;110.03,112.56,109.03,111.24;111.24,113.15,105.41,105.56;105.56,108.78,102.63,106.73;106.73,108.34,103.51,104.07;104.07,106.17,101.03,105.33;105.33,107.07,102.63,104.3;104.3,105.09,101.37,103.31;103.31,104.58,100.51,104.02;104.02,105.91,103.6,104.93;104.93,108.01,103.71,106.42;106.42,109.03,105.56,106.79;106.79,107.34,103.01,103.54;103.54,105.03,101.8,102.78;102.78,102.8,98.801,102.27;102.27,102.58,100.37,101.22;101.22,102.31,99.808,100.75;100.75,101.6,99.109,101.25;101.25,103.5,100.37,102.31;102.31,102.87,95.494,95.494;95.494,98.254,92.746,96.219;96.219,96.852,95.157,95.348;95.348,95.796,93.207,94.455;94.455,95.699,90.877,91.835;91.835,93.773,91.219,92.919;92.919,97.695,90.142,95.488;95.488,96.929,88.484,89.143;89.143,91.342,89.003,90.059;90.059,90.524,88.72,89.669;89.669,89.753,85.581,86.243;86.243,88.228,85.267,86.549;86.549,86.662,81.622,83.26;83.26,85.602,82.277,83.321;83.321,83.699,80.512,81.661;81.661,82.118,77.27,78.096;78.096,78.392,68.836,70.177;70.177,73.12,67.549,72.679;72.679,72.722,69.985,71.505;71.505,75.457,71.218,75.105";
// o,h,l,c per day, semicolon separated. Decoded once at load.
function solDecode(){
  const parts=SOL_PACK.split(';'), n=parts.length;
  const op=new Array(n), hi=new Array(n), lo=new Array(n), cl=new Array(n), lab=new Array(n);
  const d0=Date.UTC(2020,3,10);
  for(let i=0;i<n;i++){
    const t=parts[i].split(',');
    op[i]=+t[0]; hi[i]=+t[1]; lo[i]=+t[2]; cl[i]=+t[3];
    const d=new Date(d0+i*86400000);
    lab[i]=MONTHS3[d.getUTCMonth()]+String(d.getUTCFullYear()).slice(2);
  }
  return {op:op,hi:hi,lo:lo,cl:cl,lab:lab};
}

// ─────────────────────────────────────────────────────────────
// SOL SIMULATOR
// Runs the launch you configured against SOL's real history. The
// token tracks SOL's percentage moves from whatever week you start
// on, but it can never trade below its own redemption value,
// because arbitrage would buy it there. That is the one behaviour
// the earlier simulator did not enforce.
// ─────────────────────────────────────────────────────────────
// Real weekly history for the memecoin runs. Each entry is [month label, market-cap multiple
// from the first week of the window, mean daily volume as a share of market cap that week].
// The multiple is scale-free, so it drives whatever token you configure; the volume ratio is
// applied to YOUR market cap, so fee accrual rescales to your launch automatically.
// Windows are capped at 307 weeks, the longest run the Lifetime control can show, and the
// MOST RECENT weeks are kept, so no run is silently truncated at the far end.
// The path follows PRICE. BONK has fixed supply with float equal to total, so its market cap
// series IS its price series. PEPE, SHIB and DOGE were dropped in Nov 2026: their data stopped in
// May 2026 and none of them were worth keeping, so the arrays went with them rather than shipping
// 26KB of stale numbers in a file meant for upload.
// Volume is always measured against market cap. Source: Coin Metrics community data.
const HIST={
  bonk:{name:"BONK",span:"Oct23 to Nov26",weeks:164,w:[["Oct23",1.0,0.0477],["Oct23",0.8953,0.08395],["Oct23",0.9035,0.08345],["Oct23",1.9953,0.20262],["Oct23",3.3159,0.1438],["Nov23",6.8772,0.17445],["Nov23",12.012,0.15546],["Nov23",22.0429,0.16746],["Nov23",27.2563,0.0473],["Dec23",57.8957,0.12022],["Dec23",113.7599,0.27935],["Dec23",135.3291,0.24318],["Dec23",106.5054,0.19912],["Dec23",82.9943,0.12071],["Jan24",93.477,0.29096],["Jan24",86.9563,0.10284],["Jan24",74.7579,0.07894],["Jan24",73.6538,0.0624],["Feb24",73.0052,0.08797],["Feb24",88.118,0.09467],["Feb24",82.6536,0.05691],["Feb24",133.1805,0.25092],["Mar24",224.256,0.36179],["Mar24",217.6145,0.1937],["Mar24",169.3234,0.11443],["Mar24",190.0693,0.09439],["Mar24",172.7941,0.05498],["Apr24",152.8815,0.06967],["Apr24",113.2543,0.07188],["Apr24",174.2504,0.18974],["Apr24",183.4885,0.15428],["May24",175.8572,0.08751],["May24",175.5273,0.1041],["May24",232.8569,0.20022],["May24",262.356,0.15536],["Jun24",227.6445,0.117],["Jun24",193.623,0.10048],["Jun24",158.7881,0.08219],["Jun24",162.3957,0.08911],["Jun24",168.5646,0.12515],["Jul24",175.1191,0.12467],["Jul24",213.1312,0.12561],["Jul24",220.4924,0.09731],["Jul24",189.4953,0.07334],["Aug24",152.3365,0.12607],["Aug24",144.0453,0.05667],["Aug24",146.1936,0.06072],["Aug24",142.3164,0.04895],["Sep24",125.6542,0.04911],["Sep24",130.2475,0.04572],["Sep24",131.1277,0.04867],["Sep24",152.5081,0.0883],["Sep24",168.3019,0.16441],["Oct24",160.8848,0.07555],["Oct24",175.0737,0.09357],["Oct24",171.0294,0.07067],["Oct24",157.103,0.05189],["Nov24",157.6242,0.09043],["Nov24",279.6085,0.38761],["Nov24",402.3105,0.30969],["Nov24",369.2295,0.12863],["Dec24",361.9479,0.11683],["Dec24",324.2681,0.10216],["Dec24",277.5999,0.12651],["Dec24",267.8131,0.06434],["Dec24",268.6077,0.06018],["Jan25",254.1426,0.05413],["Jan25",246.8606,0.08181],["Jan25",261.6752,0.17761],["Jan25",207.7299,0.08049],["Feb25",152.3148,0.09894],["Feb25",150.9995,0.05739],["Feb25",137.07,0.04438],["Feb25",116.7246,0.06431],["Mar25",107.1242,0.07763],["Mar25",89.2166,0.06422],["Mar25",96.7948,0.06699],["Mar25",112.8415,0.0792],["Mar25",96.4678,0.07127],["Apr25",94.3407,0.08295],["Apr25",103.3222,0.06287],["Apr25",131.8159,0.12562],["Apr25",161.4666,0.10981],["May25",161.0009,0.10878],["May25",181.9896,0.12652],["May25",177.1056,0.10927],["May25",162.1549,0.08234],["Jun25",136.1038,0.07003],["Jun25",137.1688,0.07968],["Jun25",120.1392,0.06164],["Jun25",115.7502,0.06539],["Jun25",136.0953,0.11198],["Jul25",193.4654,0.30924],["Jul25",270.4948,0.31067],["Jul25",294.0748,0.23514],["Jul25",242.5081,0.19154],["Aug25",219.9385,0.10372],["Aug25",215.6289,0.15347],["Aug25",192.8091,0.08168],["Aug25",182.8685,0.1052],["Aug25",174.0465,0.08352],["Sep25",202.2652,0.12538],["Sep25",205.9994,0.10155],["Sep25",171.5611,0.07833],["Sep25",170.6088,0.0984],["Oct25",154.6945,0.17735],["Oct25",129.1408,0.12631],["Oct25",124.2187,0.08077],["Oct25",122.1102,0.07968],["Nov25",110.0011,0.08332],["Nov25",109.1492,0.0575],["Nov25",88.3763,0.06864],["Nov25",88.2066,0.05488],["Nov25",85.8639,0.0457],["Dec25",86.1203,0.05725],["Dec25",76.2489,0.05135],["Dec25",72.4614,0.02759],["Dec25",78.44,0.04534],["Jan26",109.6962,0.15588],["Jan26",103.4238,0.06666],["Jan26",88.4406,0.04131],["Jan26",80.2625,0.04609],["Feb26",65.1051,0.0796],["Feb26",60.5724,0.04169],["Feb26",61.6479,0.03228],["Feb26",58.3148,0.03932],["Mar26",57.6388,0.03511],["Mar26",57.4837,0.03667],["Mar26",59.7813,0.0599],["Mar26",57.1847,0.03141],["Mar26",55.5584,0.02447],["Apr26",56.636,0.03682],["Apr26",58.9297,0.04835],["Apr26",59.9673,0.03322],["Apr26",60.2385,0.02404],["May26",64.8403,0.04502],["May26",67.5258,0.03866],["May26",58.5364,0.02309],["May26",55.4616,0.02051],["Jun26",47.482,0.0326],["Jun26",42.42,0.03192],["Jun26",44.9739,0.05468],["Jun26",41.5786,0.06921],["Jul26",42.7071,0.05742],["Jul26",40.8582,0.05273],["Jul26",33.7518,0.05318],["Jul26",28.7885,0.06905],["Jul26",28.2425,0.04357],["Aug26",26.3655,0.05039],["Aug26",22.6945,0.05367],["Aug26",25.4082,0.07264],["Aug26",29.967,0.05015],["Sep26",29.2803,0.07602],["Sep26",28.5102,0.06881],["Sep26",26.9135,0.05049],["Sep26",34.1006,0.10154],["Sep26",35.7028,0.06494],["Oct26",34.5088,0.0405],["Oct26",30.5803,0.03173],["Oct26",29.7309,0.03548],["Oct26",28.968,0.03397],["Nov26",27.8116,0.02674],["Nov26",25.9278,0.0331],["Nov26",21.9579,0.0412]]},
};

const MONTHS3=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WPM=52/12;              // weeks per month, for the views that are always weekly
// A history is no longer assumed to be weekly. SOL is daily; the memecoins stay weekly on the
// data they already have. Every place that used to hardcode a week reads these instead.
let STEP_DAYS=1;              // calendar days per step in the active history
let SPM=365.25/12;            // steps per month, for the vesting and escrow conversions
let STEP_NAME='day';
// WHI and WLO are the day's high and low as the same scale-free multiple as WSOL, so the gate can
// see what was actually reachable inside a step rather than only where it closed. WOP is the open,
// which is what a launch placed on that step lists at. Weekly histories leave these empty and
// everything falls back to the close, exactly as before.
let WHI=[], WLO=[], WOP=[];
// WSOL holds whatever the active history is, as a SCALE-FREE multiple. solWalk only ever reads it
// as WSOL[w]/WSOL[start], so SOL's dollar prices and a memecoin's price multiples both work.
// WVM is that asset's real weekly volume as a share of ITS market cap, applied to YOURS.
let WSOL=[], WLABEL=[], WVM=[];
let HIST_KEY='sol';                 // which history drives the run
let USE_REAL_VOL=false;             // default to the daily volume slider, so a preset means the same on every tab; the asset's own volume is one click away
function buildHistory(key){
  WSOL=[]; WLABEL=[]; WVM=[]; WHI=[]; WLO=[]; WOP=[];
  if(key==='sol'){
    // Real daily data. No interpolation anywhere: every step is a day that happened.
    const s=solDecode();
    WSOL=s.cl; WHI=s.hi; WLO=s.lo; WOP=s.op; WLABEL=s.lab;
    WVM=new Array(s.cl.length).fill(null);
    STEP_DAYS=1; SPM=365.25/12; STEP_NAME='day';
  } else {
    STEP_DAYS=7; SPM=52/12; STEP_NAME='week';
    // The memecoins are already weekly: [label, market-cap multiple, volume/market-cap].
    const h=HIST[key];
    for(let i=0;i<h.w.length;i++){ WSOL.push(h.w[i][1]); WLABEL.push(h.w[i][0]); WVM.push(h.w[i][2]); }
  }
  NW=WSOL.length;
}
let NW=0;
buildHistory('sol');

// Switching history invalidates every placed event, because a week index means a different date.
// Each price history keeps its own events and its own launch week. Switching from SOL to BONK
// used to wipe whatever you had set up on SOL, which made comparing two histories mean rebuilding
// the first one from memory. Week indices only ever replay against the history they were placed
// on, so they stay valid.
const HIST_SETUP={};
function setHistory(key){
  if(key===HIST_KEY) return;
  HIST_SETUP[HIST_KEY]={ev:SOL_EV.slice(), start:SOL_START};   // park the one we are leaving
  HIST_KEY=key;
  buildHistory(key);
  const keep=HIST_SETUP[key];
  SOL_EV = keep ? keep.ev.slice() : [];
  syncSol();
  const minRun=Math.max(2,Math.round(56/STEP_DAYS));   // eight weeks, whatever a step is
  SOL_START = keep ? Math.max(0,Math.min(keep.start, Math.max(0,NW-minRun))) : 0;
  const sl=$('solStart'); if(sl){ sl.max=Math.max(1,NW-minRun); sl.value=SOL_START; }
  run();
}
// With 2,413 daily steps, a bare month label cannot tell you which day you are on, and the
// whole reason for going daily was that single days matter. Daily histories get a real date.
function stepLabel(i){
  if(HIST_KEY==='sol'){
    const d=new Date(Date.UTC(2020,3,10)+i*86400000);
    return d.getUTCDate()+' '+MONTHS3[d.getUTCMonth()]+' '+d.getUTCFullYear();
  }
  return WLABEL[i]||(STEP_NAME+' '+i);
}
function histHasVolume(){ return HIST_KEY!=='sol'; }
function histName(){ return HIST_KEY==='sol' ? 'SOL' : HIST[HIST_KEY].name; }

let SOL_START=0;          // week index the launch happens on
// Events placed on the SOL chart. Each is {w, type:'mint'|'redeem', pct|tok}.
// SOL_MINTS stays as the list of mint weeks so the existing schedule code keeps working.
let SOL_EV=[];
let SOL_MINTS=[];         // week indices where a reserve mint fires, derived from SOL_EV
function syncSol(){ SOL_MINTS=SOL_EV.filter(function(e){return e.type==='mint';}).map(function(e){return e.w;}); }
function solEvNear(w,tol){ return SOL_EV.find(function(e){ return Math.abs(e.w-w)<=tol; }); }
let SOL_FLOOR=true;
let SOL_PRICE_MODE='price';   // 'price' = price follows SOL, 'mcap' = market cap follows SOL
// A mint does two things at once and they cancel. Buyers who mint are not buying on the open market,
// so the price falls; and supply rises by the minted amount. Market cap therefore stays on its SOL
// track and the price is that market cap divided by whatever supply now exists.
//   10M tokens at $1.00 = $10M. Mint 10%, and it is 11M tokens at $0.909, still $10M.
// The cash the buyers paid does not vanish: it lands in the treasury, which is the whole point.       // enforce the redemption floor

// The price at which the market equals redemption, for a given state.
// The price at which a live redemption pays the same as selling. Below it, buying to redeem is free
// money, so the token cannot trade there. This is the binding floor in this version: it needs no vote,
// no wind-down and no quorum, unlike the end-of-life figure.
// What a token can claim right now: the treasury plus the pool's cash, over the tokens that can
// claim, less the ordinary redemption fee. This is the measure the mint gate uses, and it is the same
// figure the wind-down table prints as live redemption. Declared as a function so it hoists.
function liveBack(supply,k,tre,price){
  if(!(price>0)) return 0;
  const pt=Math.sqrt(k/price), pc=Math.sqrt(k*price), claim=supply-pt;
  return claim>0 ? ((Math.max(0,tre)+pc)/claim)*(1-REDEEM_FEE) : 0;
}

function liveFloor(supply,k,tre,guess){
  let p=Math.max(guess,1e-12);
  for(let i=0;i<200;i++){
    const pt=Math.sqrt(k/p), pc=Math.sqrt(k*p), claim=supply-pt;
    if(claim<=0){ p*=1.35; continue; }
    p=0.5*p+0.5*(((Math.max(0,tre)+pc)/claim)*(1-REDEEM_FEE));
  }
  return p;
}

function redFloor(supply,k,tre,burn,back,fee,slip,guess){
  let p=Math.max(guess,1e-9);
  for(let i=0;i<160;i++){
    const pt=Math.sqrt(k/p), pc=Math.sqrt(k*p), surv=supply-pt-burn;
    if(surv<=0){ p*=1.35; continue; }
    p=0.5*p+0.5*(((Math.max(0,tre)+pc)*(1-fee)+back)/surv);
  }
  return p;
}

function solWalk(m){
  const startW=Math.min(SOL_START,NW-2);
  const lifeW=Math.min(NW-startW, Math.round(m.lifeM*SPM)||NW-startW);
  // A launch lists at the OPEN of the step it is placed on, which is what seeding a pool means.
  // Weekly histories have no open, so they keep using the close as before.
  const sol0=(WOP.length?WOP[startW]:WSOL[startW]);
  const dv=m.dv, feeT=m.feeT, feeL=m.feeL, mintPct=m.mintPct, pSh=m.pSh, prem=m.prem;
  // Neither the escrow clawback nor the vested-token burn is a constant any more: escrow falls
  // as the team draws its runway, and the burn falls as the team's tokens vest.
  // NB: these take WEEKS SINCE LAUNCH, not the index `w` into the price history. Passing `w`
  // made a launch late in the series behave as though years had already run.
  const backAt=function(sinceLaunch){ return m.clawableAt(sinceLaunch/SPM); };
  const burnAt=function(sinceLaunch){ return m.vestBurnAt(sinceLaunch/SPM); };
  const mintSet=mintSchedule(SOL_MINTS);
  // size each mint by its own setting, falling back to the Reserve mint default
  const mintPctAt={}; SOL_EV.forEach(function(e){ if(e.type==='mint') mintPctAt[e.w]=e.pct; });
  const redeemAt={};  SOL_EV.forEach(function(e){ if(e.type==='redeem') redeemAt[e.w]=(redeemAt[e.w]||0)+e.tok; });
  const RETAIN=REDEEM_RETAIN;   // the share of the redemption fee that stays in the treasury
  const redLog=[];
  const wkGrow=Math.pow(1+m.apy, STEP_DAYS/365.25);   // the reserve asset's own backing growth, per step

  let supply=m.S, treasury=m.treasury0, k=m.k0;
  let volSum=0, feeTsum=0, feeLsum=0, dexSum=0, mcSum=0, mcMax=0;
  const rows=[], log=[];

  for(let i=0;i<lifeW;i++){
    const w=startW+i;
    // 'dilute' tracks the MARKET CAP against SOL and divides by whatever supply exists, so a mint
    // shows up as a per-token price cut. 'none' tracks the PRICE, so supply growth lifts market cap.
    // Market cap tracks SOL from launch; price is that divided by current supply, so a mint shows up
    // as a lower price per token rather than a bigger market cap.
    const solMove=WSOL[w]/sol0;
    // Default: the PRICE follows SOL and market cap rises with any minted supply. We cannot know how
    // hard new supply would press on the price, but we do know market cap grows with the token count.
    // The alternative holds market cap on SOL's track and lets minting cut the price instead.
    const raw = SOL_PRICE_MODE==='mcap' ? (m.p0*m.S*solMove)/Math.max(1,supply) : m.p0*solMove;

    // ORDER MATTERS. Accrue the week first, then take the floor from the finished state, so the
    // reported price can never end the week under the redemption it is measured against. Computing
    // the floor first left redemption rising past the price inside the same week.
    let provisional = SOL_FLOOR
      ? Math.max(raw, liveFloor(supply,k,treasury,raw))
      : raw;

    // a week of trading, priced off that
    // Volume for this week. When the history carries its own volume-to-market-cap ratio and the
    // toggle is on, use that: it is a RATIO, so applying it to this token's market cap rescales
    // the real trading activity onto whatever size launch is configured.
    const dvw = (USE_REAL_VOL && WVM[w]!=null) ? WVM[w] : dv;
    const mcap=provisional*supply, weekVol=dvw*mcap*STEP_DAYS;
    volSum+=weekVol; feeTsum+=feeT*weekVol; feeLsum+=feeL*weekVol; dexSum+=m.dexYield*weekVol;
    mcSum+=mcap; mcMax=Math.max(mcMax,mcap);
    treasury*=wkGrow;                      // any yield the reserve basket earns on itself
    treasury+=feeT*weekVol;
    if(feeL+m.dexYield>0){ const pt0=Math.sqrt(k/provisional), pc0=Math.sqrt(k*provisional), pv=pt0*provisional+pc0;
                if(pv>0) k*=Math.pow((pv+(feeL+m.dexYield)*weekVol)/pv,2); }

    // a reserve mint placed on this week, at the price it actually trades at
    if(mintSet[w]){
      const share=mintSet[w];                       // this week's tranche of the mint
      const ratioBefore=provisional>0?liveBack(supply,k,treasury,provisional)/provisional:0;
      const thisPct=(mintPctAt[w]!==undefined?mintPctAt[w]:(function(){
        // a tranche lands on the week after the one it was placed on, so look back one
        const src=mintPctAt[w-1]; return src!==undefined?src:mintPct; })());
      const tok=thisPct*supply*share, toLP=tok*pSh, toPublic=tok-toLP;
      // A mint clears over a few hours, not at one instant, so it should not be priced at the
      // step's closing tick and certainly not at its high. The day's typical price (high, low and
      // close averaged) is the honest expected price for a window at an unknown point inside it.
      // Applied as a ratio so the redemption floor already folded into `provisional` survives.
      const typR=(WHI.length&&WSOL[w]>0)?((WHI[w]+WLO[w]+WSOL[w])/3)/WSOL[w]:1;
      const mintPx=provisional*typR;
      const sellPx=mintPx*(1+prem), paid=toPublic*sellPx, pairCash=toLP*provisional;
      if(toLP>0){ const pt1=Math.sqrt(k/provisional), pc1=Math.sqrt(k*provisional);
                  k=(pt1+toLP)*(pc1+pairCash); }
      supply+=tok; treasury+=paid-pairCash;
      const first=SOL_MINTS.indexOf(w)>=0;          // log once, on the week it was placed
      if(first) log.push({w,price:mintPx,sellPx,tok,toLP,toPublic,paid,pairCash,ratioBefore});
      else if(log.length){ const L=log[log.length-1];
        L.tok+=tok; L.toLP+=toLP; L.toPublic+=toPublic; L.paid+=paid; L.pairCash+=pairCash; }
    }

    // A redemption placed on this week. The holder takes a pro-rata share of the treasury AND the
    // pool's cash; their share of the pool's own tokens burns with theirs, so the price does not move
    // and every remaining holder's claim per token is unchanged.
    if(redeemAt[w]){
      const px0=Math.sqrt(k/provisional), pc0=Math.sqrt(k*provisional), claim=supply-px0;
      if(claim>0){
        const want=Math.min(redeemAt[w],claim*0.999);
        const f=want/claim, pot=Math.max(0,treasury)+pc0;
        redLog.push({w:w,price:provisional,tok:want,cash:f*pot*(1-REDEEM_FEE),burnt:want+f*px0});
        treasury=(1-f)*Math.max(0,treasury)+f*pot*RETAIN;
        k*=Math.pow(1-f,2); supply*=(1-f);
      }
    }

    // the floor from the finished state - this is what the week closes at
    const settleNow=liveFloor(supply,k,treasury,provisional);
    const p = SOL_FLOOR ? Math.max(raw,settleNow) : raw;
    const tethered = SOL_FLOOR && raw<settleNow;
    const pt=Math.sqrt(k/p), pc=Math.sqrt(k*p), surv=supply-pt-burnAt(i);
    // Both redemption figures, computed the same way the wind-down table computes them. 'red' below is
    // the settle PRICE, not a redemption value, which is why it cannot stand in for either of these.
    const claimLive=supply-pt;
    const livePer=claimLive>0?((Math.max(0,treasury)+pc)/claimLive)*(1-REDEEM_FEE):0;
    // A wind-down does not happen at today's price. The moment redemption opens, anyone can buy
    // below the redemption value and redeem, or sell above it, so the market converges on the
    // settle price and every holder is paid from there. Valuing the pool at today's price instead
    // overstated it whenever price sits above settle, which is nearly always, and that is what put
    // the wind-down line ABOVE the live line on the chart while the inspector, which does solve
    // for settle, showed live correctly above it. Same maths as the inspector now, so the chart
    // and the box cannot disagree.
    const stHere={k:k,supply:supply,treasury:treasury,i:i,mo:i/SPM};
    const spHere=eolSettlePrice(m,stHere);
    const wdHere=spHere!=null?windDownAt(m,stHere,spHere):null;
    const eolPer=(wdHere&&wdHere.surv>0&&isFinite(wdHere.per))?wdHere.per:null;
    rows.push({i,mo:i/SPM,w,sol:WSOL[w],raw,p,tethered,supply,treasury,k,poolTok:pt,poolCash:pc,
               surviving:surv, backPer:livePer, eolPer:eolPer,
               red:settleNow, ratio:mcap>0?Math.max(0,treasury)/mcap:0});
  }
  return {rows,log,redLog,startW,lifeW,sol0,
          volSum,feeTsum,feeLsum,dexSum,mcAvg:rows.length?mcSum/rows.length:0,mcMax};
}

// One redraw asked for the same walk three times, once to draw the chart and twice more
// through effState. At 321 weekly steps that cost 3ms a time and nobody noticed; at 2413 daily
// steps it was 23ms a time and three quarters of every frame. The inputs cannot change inside a
// redraw, so the result is computed once and shared, and the slot is emptied at the top of run().
let WALK_CACHE=null;
function solWalkCached(m){ if(!WALK_CACHE) WALK_CACHE=solWalk(m); return WALK_CACHE; }
function drawSol(m){
  const res=solWalkCached(m), rows=res.rows, n=rows.length;
  const cv=$('scv'), cv2=$('scv2');
  if(!cv) return;

  if(!$('solCtl').childElementCount){
    const mk=function(txt,fn,cls){ const b=document.createElement('button'); b.textContent=txt;
      if(cls) b.className=cls; b.onclick=fn; $('solCtl').appendChild(b); return b; };
    mk('Clear events',function(){ SOL_EV=[]; syncSol(); closeEvMenu(); run(); });
    mk('Redemption line on/off',function(){ SOL_FLOOR=!SOL_FLOOR; run(); });
    [].forEach.call($('histSeg').children,function(b){
      b.onclick=function(){ setHistory(b.getAttribute('data-h')); };
    });
    $('volReal').onclick=function(){ USE_REAL_VOL=true;  run(); };
    $('volFlat').onclick=function(){ USE_REAL_VOL=false; run(); };
  }
  [].forEach.call($('histSeg').children,function(b){
    b.classList.toggle('on',b.getAttribute('data-h')===HIST_KEY);
  });
  // SOL's series carries no volume of its own, so the real-volume choice is hidden there and the
  // flat Trading life assumption is all that applies. Nothing about SOL's run changes.
  var hv=histHasVolume();
  $('volSeg').style.display=hv?'':'none';
  $('volSep').style.display=hv?'':'none';
  $('volLab').style.display=hv?'':'none';
  $('volReal').classList.toggle('on',hv&&USE_REAL_VOL);
  $('volFlat').classList.toggle('on',hv&&!USE_REAL_VOL);
  $('histSpan').textContent=hv
    ? HIST[HIST_KEY].span+' \u00b7 '+HIST[HIST_KEY].weeks+' weeks of real price'+
      (USE_REAL_VOL?' and real volume':'')+(FEES?'':' \u00b7 volume only bites with fee accrual on')
    : SOL_META.start+' to '+SOL_META.end+' \u00b7 '+NW+' days of real daily open/high/low/close'
      +' \u00b7 flat volume from Trading life';
  if(false){
  }
  $('solStart').max=Math.max(1,NW-Math.max(2,Math.round(56/STEP_DAYS)));

  const dpr=window.devicePixelRatio||1, W=cv.clientWidth, H=cv.clientHeight;
  cv.width=W*dpr; cv.height=H*dpr;
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);
  // On a narrow screen the legend gets its own rows under the dates, so nothing is dropped.
  const NARROW=W<600;
  const PAD={l:66,r:14,t:14,b:NARROW?62:26};
  let lo=Infinity,hi=-Infinity;
  rows.forEach(function(r){ lo=Math.min(lo,r.p,r.red,r.raw); hi=Math.max(hi,r.p,r.raw); });
  lo=Math.max(lo*0.7,1e-9); hi*=1.3;
  const X=function(i){ return PAD.l+(W-PAD.l-PAD.r)*(n<2?0:i/(n-1)); };
  const Y=function(v){ const b=Math.log(lo),c=Math.log(hi);
                       return PAD.t+(H-PAD.t-PAD.b)*(1-(Math.log(Math.max(v,lo))-b)/(c-b)); };

  g.strokeStyle='rgba(246,244,236,.07)'; g.font='10px "JetBrains Mono",monospace';
  for(let e=-4;e<=6;e++){
    const v=m.p0*Math.pow(10,e); if(v<lo||v>hi) continue;   // gridlines on multiples of the listing
    const y=Y(v); g.beginPath(); g.moveTo(PAD.l,y); g.lineTo(W-PAD.r,y); g.stroke();
    g.fillStyle='#8f8a81';
    g.fillText(px(v)+(e?'  '+(e>0?'':'')+Math.pow(10,e)+'x':'  1x'),6,y+3);
  }

  // The two redemption values a holder actually chooses between, which is the whole question this
  // chart exists to answer. The line here used to plot `red`, the settle PRICE at which redeeming
  // pays the same as selling, under a legend reading "live redemption". That is a third thing again,
  // and the row comment next to it already warned it stands in for neither.
  // Gold is what you can take today. Violet is what a wind-down would pay.
  g.beginPath();
  rows.forEach(function(r,i){ const y=Y(Math.max(r.backPer,lo)); i?g.lineTo(X(i),y):g.moveTo(X(i),y); });
  g.lineTo(X(n-1),H-PAD.b); g.lineTo(X(0),H-PAD.b); g.closePath();
  g.fillStyle='rgba(242,186,117,.11)'; g.fill();
  g.strokeStyle='#f2ba75'; g.lineWidth=1.5; g.setLineDash([4,3]); g.beginPath();
  rows.forEach(function(r,i){ const y=Y(Math.max(r.backPer,lo)); i?g.lineTo(X(i),y):g.moveTo(X(i),y); });
  g.stroke(); g.setLineDash([]);

  // what a wind-down would pay instead. Null wherever the listing price is mechanically out of
  // the pool's reach, so the line breaks there rather than dropping to the floor of the chart.
  g.strokeStyle='#9878fd'; g.lineWidth=1.5; g.setLineDash([4,3]); g.beginPath();
  let eolOpen=false;
  rows.forEach(function(r,i){
    if(r.eolPer==null||!isFinite(r.eolPer)){ eolOpen=false; return; }
    const y=Y(Math.max(r.eolPer,lo));
    if(eolOpen) g.lineTo(X(i),y); else { g.moveTo(X(i),y); eolOpen=true; }
  });
  g.stroke(); g.setLineDash([]);

  // what SOL alone would have implied, where it differs
  g.strokeStyle='rgba(246,244,236,.22)'; g.lineWidth=1; g.setLineDash([2,3]); g.beginPath();
  rows.forEach(function(r,i){ const y=Y(Math.max(r.raw,lo)); i?g.lineTo(X(i),y):g.moveTo(X(i),y); });
  g.stroke(); g.setLineDash([]);

  // the traded price
  g.strokeStyle='#f4d98f'; g.lineWidth=2; g.beginPath();
  rows.forEach(function(r,i){ const y=Y(r.p); i?g.lineTo(X(i),y):g.moveTo(X(i),y); });
  g.stroke(); g.lineWidth=1;

  // event markers: mints numbered in peach, redemptions marked R in brand violet
  let solMi=0;
  SOL_EV.slice().sort(function(a,b){return a.w-b.w;}).forEach(function(e){
    const i=e.w-res.startW; if(i<0||i>=n) return;
    const x=X(i), y=Y(rows[i].p), isMint=e.type==='mint';
    const col=isMint?'#f2ba75':'#9878fd';
    g.strokeStyle=col; g.setLineDash([2,3]);
    g.beginPath(); g.moveTo(x,PAD.t); g.lineTo(x,H-PAD.b); g.stroke(); g.setLineDash([]);
    g.fillStyle=col; g.beginPath(); g.arc(x,y,5,0,7); g.fill();
    g.fillStyle='#111014'; g.font='bold 9px Inter,sans-serif'; g.textAlign='center';
    g.fillText(isMint?String(++solMi):'R',x,y+3);
    g.textAlign='left'; g.font='10px "JetBrains Mono",monospace';
  });

  // The legend used fixed pixel offsets, which fitted three items on a desktop and ran straight
  // through the end-date label on a phone once a fourth arrived. Measured and laid out left to
  // right instead, dropping items from the least important end when the width runs out.
  g.fillStyle='#8f8a81';
  const startTxt=WLABEL[res.startW]||'start', endTxt=WLABEL[res.startW+n-1]||'end';
  const dateY=NARROW?H-PAD.b+16:H-8;
  g.fillText(startTxt,PAD.l,dateY);
  const endX=W-PAD.r-g.measureText(endTxt).width;
  g.fillText(endTxt,endX,dateY);
  const LEG=[['token','#f4d98f'],
   ['redeem today','#f2ba75'],
   ['if it winds down','#9878fd'],
   [histName()+'-implied, without redemption','rgba(246,244,236,.35)']];
  if(NARROW){
    // two rows under the dates, wrapping from the left edge of the plot
    let lx=PAD.l, ly=dateY+16;
    LEG.forEach(function(it){
      const tw=g.measureText(it[0]).width;
      if(lx>PAD.l && lx+tw>W-PAD.r){ lx=PAD.l; ly+=14; }
      g.fillStyle=it[1]; g.fillText(it[0],lx,ly);
      lx+=tw+14;
    });
  } else {
    let lx=PAD.l+g.measureText(startTxt).width+14;
    LEG.forEach(function(it){
      const tw=g.measureText(it[0]).width;
      if(lx+tw>endX-12) return;
      g.fillStyle=it[1]; g.fillText(it[0],lx,dateY);
      lx+=tw+14;
    });
  }

  // second chart: backing and redemption
  const H2=cv2.clientHeight; cv2.width=W*dpr; cv2.height=H2*dpr;
  const g2=cv2.getContext('2d'); g2.setTransform(dpr,0,0,dpr,0,0); g2.clearRect(0,0,W,H2);
  let lo2=Infinity,hi2=-Infinity;
  rows.forEach(function(r){
    const vs=[r.backPer,r.eolPer].filter(function(v){return v!==null&&isFinite(v);});
    vs.forEach(function(v){ lo2=Math.min(lo2,v); hi2=Math.max(hi2,v); });
  });
  lo2=Math.max(lo2*0.7,1e-9); hi2*=1.3;
  const Y2=function(v){ const b=Math.log(lo2),c=Math.log(hi2);
                        return 12+(H2-38)*(1-(Math.log(Math.max(v,lo2))-b)/(c-b)); };
  g2.strokeStyle='rgba(246,244,236,.07)';
  logTicks(lo2,hi2,4).forEach(function(v){
    const y=Y2(v); g2.beginPath(); g2.moveTo(PAD.l,y); g2.lineTo(W-PAD.r,y); g2.stroke();
    g2.fillStyle='#8f8a81'; g2.font='10px "JetBrains Mono",monospace';
    g2.fillText(axLabel(v),6,y+3);
  });
  // Live redemption gold, end of life purple, the same as the Draw a path lower chart.
  [['backPer','#e2c066'],['eolPer','#9878fd']].forEach(function(s){
    g2.strokeStyle=s[1]; g2.lineWidth=2; g2.beginPath();
    let pen=false;
    rows.forEach(function(r,i){
      const v=r[s[0]];
      if(v===null||v===undefined||!isFinite(v)){ pen=false; return; }   // break it, do not invent it
      const y=Y2(v); if(pen) g2.lineTo(X(i),y); else { g2.moveTo(X(i),y); pen=true; }
    });
    g2.stroke(); g2.lineWidth=1;
  });
  g2.font='10px Inter,sans-serif';
  // measured, with short labels when the full ones do not fit (they clipped on a 360px phone)
  (function(){
    const full=[['redemption \u00b7 live','#e2c066'],['redemption \u00b7 EOL','#9878fd']];
    const short=[['live','#e2c066'],['EOL','#9878fd']];
    const room=W-PAD.l-8;
    const width=function(set){ return set.reduce(function(a,it){ return a+g2.measureText(it[0]).width+18; },0); };
    const set=width(full)<=room?full:short;
    let x=PAD.l+4;
    set.forEach(function(it){ g2.fillStyle=it[1]; g2.fillText(it[0],x,H2-8); x+=g2.measureText(it[0]).width+18; });
  })();

  const last=rows[n-1], peak=rows.reduce(function(a,b){return b.p>a.p?b:a;});
  const teth=rows.filter(function(r){return r.tethered;}).length;
  $('solSum').innerHTML=
    '<div class="s"><div class="k">Launched</div><div class="v">'+stepLabel(res.startW)+'</div><div class="n">'+(HIST_KEY==='sol'?'SOL $'+res.sol0.toFixed(2):histName())+' · listing '+px(m.p0)+'</div></div>'+
    // "Peak" means the highest price the token reached, so it reads the day's HIGH, not its
    // close. On SOL that is 19 Jan 2025 at $294.33 rather than the 18th's close of $261.87, and
    // anyone checking this run against a chart is looking for the former.
    (function(){
      let bp=peak.p, bw=peak.w;
      if(WHI.length) rows.forEach(function(r){
        const hi=r.p*(WSOL[r.w]>0?WHI[r.w]/WSOL[r.w]:1);
        if(hi>bp){ bp=hi; bw=r.w; }
      });
      return '<div class="s"><div class="k">Peak</div><div class="v">'+px(bp)+'</div><div class="n">'
        +(bp/m.p0).toFixed(1)+'x listing · '+stepLabel(bw)+'</div></div>';
    })()+
    '<div class="s"><div class="k">Ends</div><div class="v">'+px(last.p)+'</div><div class="n">'+(WLABEL[last.w]||'')+' · '+(last.p/m.p0).toFixed(2)+'x'+
      // The Lifetime setting can stop the run before the history runs out. Never let that happen
      // silently: a chart that stops early reads as bad data rather than as a setting.
      (NW-res.startW>n ? '<br><span style="color:var(--gold)">cut at '+m.lifeM+' mo by Lifetime \u00b7 '+
        (NW-res.startW-n)+' more '+STEP_NAME+'s exist</span>' : '')+'</div></div>'+
    '<div class="s"><div class="k">Reserves</div><div class="v">'+money(Math.max(0,last.treasury)+last.poolCash)+'</div><div class="n">'+money(Math.max(0,last.treasury))+' treasury \u00b7 '+money(last.poolCash)+' pool cash</div></div>'+
    '<div class="s lecard"><div class="k">Redemption \u00b7 live</div><div class="v">'+px(last.backPer)+'</div><div class="n">treasury plus your share of the pool</div></div>'+
    '<div class="s lecard lend"><div class="k">Redemption \u00b7 EOL</div><div class="v">'+(last.eolPer!==null?px(last.eolPer):'\u00b7')+'</div><div class="n">'+(last.eolPer!==null?pc(last.eolPer/m.p0)+' of listing, at wind-down':'unreachable')+'</div></div>'+
    '<div class="s"><div class="k">'+(STEP_NAME==='day'?'Days':'Weeks')+' at redemption</div><div class="v">'+teth+'</div><div class="n">of '+n+' · '+pc(teth/n)+'</div></div>';

  const days=Math.round(n*STEP_DAYS);   // a step is a day on SOL and a week on BONK, not always 7 days
  // When the asset's own weekly volume drove the run, quote the rate that volume works out to
  // rather than the flat slider, so the arithmetic on this line multiplies out to the figure
  // beside it. Volume-weighted by market cap, which is why it differs from the median.
  const realVol=(USE_REAL_VOL&&histHasVolume());
  const dvPc=realVol
    ? ((res.mcAvg&&days)?(res.volSum/(res.mcAvg*days)*100).toFixed(2):'0.00')
    : (m.dv*100).toFixed(2);
  $('solNote').dataset.x='';
  let note='<div style="border:1px solid var(--line);border-radius:var(--r-tile);padding:12px 14px;margin-bottom:12px;'+
    'font-size:12px;line-height:1.65;background:var(--panel)">'+
    '<b style="color:var(--gold-lt)">Where the treasury growth comes from</b><br>'+
    'market cap: launch '+money(m.p0*m.S)+' &middot; peak '+money(res.mcMax)+' &middot; <b>average '+money(res.mcAvg)+'</b><br>'+
    'average cap &times; '+dvPc+'%/day'+(realVol?' ('+histName()+'\u2019s own volume, week by week)':'')+
      ' &times; '+num(days)+' days = <b>'+money(res.volSum)+' of lifetime volume</b><br>'+
    '&times; '+(m.feeT*100).toFixed(3)+'% &rarr; <b>'+money(res.feeTsum)+' into the treasury</b>'+
    ' &nbsp;&middot;&nbsp; &times; '+(m.feeL*100).toFixed(3)+'% &rarr; '+money(res.feeLsum)+' into the pool<br>'+
    (m.dexYield>0?'plus the pool\u2019s own swap fee at '+(m.dexYield*100).toFixed(3)+
      '% of volume after your share &rarr; '+money(res.dexSum)+' into the pool<br>':'')+
    // apy is pinned to 0: the basket is held as the assets themselves and nothing here models a
    // yield on them. Kept as a branch so a yielding leg can be switched on without resurrecting it.
    (m.apy>0?'plus '+(m.apy*100).toFixed(1)+'%/yr of reserve basket growth, compounded<br>':'')+
    // Escrow is part of what a wind-down returns until the team draws it, so say what it is
    // doing over this run rather than leaving the reader to infer it from the redemption line.
    (m.escrow>0 ? 'escrow: <b>'+money(m.clawableAt(0))+'</b> clawable at launch &rarr; '+
       money(m.clawableAt(n/SPM))+' by the end'+
       (m.erUp>=1 ? ' (drawn in full at listing)'
                  : ' ('+(m.erUp*100).toFixed(0)+'% drawn at listing'+
                    (m.erCliff>0?', '+m.erCliff+' mo cliff':'')+
                    (m.erOver>0?', rest over '+m.erOver+' mo':'')+')')+'<br>' : '')+
    'treasury '+money(m.treasury0)+' &rarr; '+money(last.treasury)+
    (res.log.length?' (fees '+money(res.feeTsum)+' + mints '+money(last.treasury-m.treasury0-res.feeTsum)+')':'')+
    '</div>';
  note+='<b>Reserves are stablecoins here.</b> They keep their dollar value while the token follows '+histName()+'. '+
    'Reserves held in BTC or SOL would fall and rise with the market, so in a crash the real redemption value '+
    'would be lower than this chart shows.<br><br>';
  note+=(SOL_PRICE_MODE==='price'
    ? '<b>'+histName()+' drives the price.</b> The token follows '+histName()+' move for move, so any minted supply lifts '+
      'market cap on top. How much new supply really presses on price cannot be known, so this makes no '+
      'guess at it.'
    : '<b>'+histName()+' drives the market cap.</b> Minted supply is divided into the same market cap, so the price '+
      'falls as supply rises. The buyers\u2019 cash still lands in the treasury.')+
    '<br><br>';
  note+='<b>The token tracks '+histName()+' from the week you launch</b>, and every week it pays fees into the '+
    'treasury and the pool. <b style="color:var(--up)">It cannot trade below that line</b>. That is '+
    'the price at which the market equals redemption, and any lower is a profit for anyone who '+
    'buys and redeems.';
  if(teth) note+=' On this run the token sat at that level for <b>'+teth+' of '+n+' '+STEP_NAME+'s</b>, which is what '+
    'a backed token looks like in a drawdown: it stops falling where the assets are.';
  if(res.log.length){
    note+='<br><br><b>Mints:</b><br>'+res.log.map(function(x,i){
      return 'M'+(i+1)+' '+stepLabel(x.w)+' at '+px(x.price)+': '+num(x.tok)+' tokens'+
        (x.toLP>0?' ('+num(x.toPublic)+' sold, '+num(x.toLP)+' paired)':'')+', '+money(x.paid)+
        ' in, backing ratio '+pc(x.ratioBefore);
    }).join('<br>');
  }
  if(res.redLog.length){
    note+='<br><br><b>Redemptions:</b><br>'+res.redLog.map(function(x,i){
      return 'R'+(i+1)+' '+stepLabel(x.w)+' at '+px(x.price)+': '+num(x.tok)+
        ' tokens in, '+money(x.cash)+' out, '+num(x.burnt)+' burnt including their share of the pool';
    }).join('<br>');
  }
  $('solNote').innerHTML=note;

  cv.__res=res; cv.__n=n;        // the handler below is wired once, so hand it the latest walk
  cv.__m=m; cv2.__res=res; cv2.__n=n; cv2.__m=m;
  if(SOL_HOVER!=null) paintInspect();

  if(!cv.__wired){
    cv.__wired=true;
    const hoverOn=function(ev){
      const i=weekFromX(cv,ev.clientX);
      if(i===SOL_HOVER) return;
      SOL_HOVER=i; paintInspect();
      const line=$('scvLine'), wrap=$('scvWrap'), panel=$('solInspect');
      if(line&&wrap&&i!=null){
        const wr=wrap.getBoundingClientRect();
        const atX=ev.clientX-wr.left;
        line.style.left=atX+'px'; line.style.display='';
        if(panel){                       // sit on the side the cursor is not on
          if(atX > wr.width/2){ panel.style.left='14px';  panel.style.right='auto'; }
          else                { panel.style.right='14px'; panel.style.left='auto';  }
        }
      } else if(line) line.style.display='none';
    };
    const hoverOff=function(){ SOL_HOVER=null; paintInspect();
      const line=$('scvLine'); if(line) line.style.display='none'; };
    [cv,cv2].forEach(function(c){ if(!c) return;
      c.addEventListener('mousemove',hoverOn);
      c.addEventListener('mouseleave',hoverOff); });

    cv.addEventListener('click',function(ev){
      const R=cv.__res, N=cv.__n; if(!R||!N) return;
      const r=cv.getBoundingClientRect();
      const i=Math.round((ev.clientX-r.left-PAD.l)/(r.width-PAD.l-PAD.r)*(N-1));
      if(i<0||i>=N) return;
      const w=R.startW+i;
      const hit=solEvNear(w,Math.max(1,Math.round(N/60)));
      if(hit){ SOL_EV=SOL_EV.filter(function(e){return e!==hit;}); syncSol(); closeEvMenu(); run(); return; }
      openSolMenu(w,R.rows[i].p,ev.clientX,ev.clientY);
    });
  }
}

// ---------------------------------------------------------------------------------------------
// Hovering the history chart inspects one week. Two wind-downs are shown for that week: the one
// that would happen at the price the market is actually at, and the one it would really settle
// into, because the moment redemption opens the price converges on the redemption value.
// Nothing here touches the model; every figure is read from the walk or derived from its state.
let SOL_HOVER=null;
const PAD_S={l:66,r:14,t:14,b:26};   // must match solChart's own PAD

function weekFromX(cv,clientX){
  const R=cv.__res, N=cv.__n; if(!R||!N) return null;
  const r=cv.getBoundingClientRect();
  const i=Math.round((clientX-r.left-PAD_S.l)/(r.width-PAD_S.l-PAD_S.r)*(N-1));
  return (i<0||i>=N)?null:i;
}

function windDownAt(m,st,price){
  // st carries supply, treasury and k at that week. The pool is wherever `price` puts it.
  const x=Math.sqrt(st.k/price), y=Math.sqrt(st.k*price);
  // st.mo is months since launch, put there by whichever walk produced the row. Using st.i/WPM
  // read a daily row's index as weeks and ran the vesting and escrow schedules about seven times
  // too far along, so a wind-down early in a SOL run showed a fully vested team and nothing to burn.
  const mo=st.mo!=null?st.mo:st.i/WPM;
  const burn=m.vestBurnAt(mo), back=m.clawableAt(mo);
  const surv=st.supply-x-burn;
  const pot=(Math.max(0,st.treasury)+y)*(1-m.fee)+back;
  return { price:price, poolTok:x, poolCash:y, treasury:Math.max(0,st.treasury),
           burn:burn, back:back, surv:surv, pot:pot, per:surv>0?pot/surv:0 };
}

// Where the market meets the END-OF-LIFE redemption value. Solving p = pot(p)/surv(p) with
// u = sqrt(p) turns into a quadratic, so this is exact rather than iterated. Note this is NOT
// the row's own `red`, which is the LIVE floor and excludes the clawback and the burn.
function eolSettlePrice(m,st){
  const F=1-m.fee;
  const mo=st.mo!=null?st.mo:st.i/WPM;
  const burn=m.vestBurnAt(mo), B=m.clawableAt(mo);
  const N=st.supply-burn, T=Math.max(0,st.treasury), k=st.k;
  if(N<=0||k<=0) return null;
  const u=(Math.sqrt(k)*(1+F)+Math.sqrt(k*(1+F)*(1+F)+4*N*(T*F+B)))/(2*N);
  return u*u;
}

// What a holder gets redeeming TODAY at `price`: a pro-rata share of the treasury and the
// pool's cash, with pool-held tokens out of the claimant count. No escrow comes back, no team
// tokens burn, because none of that has happened. The redemption fee is the same rate as the wind-down fee.
function liveRedeemAt(m,st,price){
  const x=Math.sqrt(st.k/price), y=Math.sqrt(st.k*price);
  const claim=st.supply-x;
  const pot=(Math.max(0,st.treasury)+y)*(1-REDEEM_FEE);
  return { price:price, poolTok:x, poolCash:y, treasury:Math.max(0,st.treasury),
           burn:null, back:null, surv:claim, pot:pot, per:claim>0?pot/claim:0 };
}

function paintInspect(){
  const cv=$('scv'), box=$('solInspect'); if(!cv||!box) return;
  const R=cv.__res, m=cv.__m;
  if(SOL_HOVER==null||!R||!R.rows[SOL_HOVER]){ box.style.display='none'; return; }
  const st=R.rows[SOL_HOVER];
  const here=liveRedeemAt(m,st,st.p);        // what a holder can take today, at today's price
  const sp=eolSettlePrice(m,st);
  if(sp==null){ box.style.display='none'; return; }
  const settle=windDownAt(m,st,sp);          // where it actually converges
  const label=WLABEL[st.w]||'';
  const assetPx = HIST_KEY==='sol' ? ' \u00b7 SOL $'+(st.sol||0).toFixed(2) : '';

  // Burn and clawback come from the week alone, not from the price, so they are the same in
  // both columns. They sit in the header once instead of being printed twice.
  const col=function(title,d,accent){
    const rows=[['Price',px(d.price)],['Pool tokens',num(Math.round(d.poolTok))],
      ['Pool cash',money(d.poolCash)],['Treasury',money(d.treasury)],
      ['Team burnt',d.burn==null?'\u00b7':num(Math.round(d.burn))],
      ['Escrow back',d.back==null?'\u00b7':money(d.back)],
      ['Claimants',num(Math.round(d.surv))],['Distributed',money(d.pot)]];
    return '<div style="flex:1;min-width:0">'+
      '<div style="font-size:10.5px;letter-spacing:.06em;text-transform:uppercase;color:'+accent+
      ';margin-bottom:5px">'+title+'</div>'+
      '<div style="font-size:19px;font-weight:600;color:'+accent+';margin-bottom:5px">'+
        px(d.per)+' <span style="font-size:10.5px;color:var(--muted);font-weight:400">per token</span></div>'+
      rows.map(function(r){ return '<div style="display:flex;justify-content:space-between;gap:10px;'+
        'padding:1px 0;border-bottom:1px solid var(--line-soft);font-size:11px">'+
        '<span style="color:var(--muted)">'+r[0]+'</span><span>'+r[1]+'</span></div>'; }).join('')+
      '</div>';
  };

  box.style.display='';
  box.innerHTML=
    '<div style="font-size:12px;margin-bottom:1px"><b>'+stepLabel(st.w!==undefined?st.w:st.i)+' · '+(st.i+1)+' of '+R.rows.length+
      ' \u00b7 '+label+assetPx+'</b></div>'+
    '<div style="font-size:10.5px;color:var(--muted);margin-bottom:9px">market price '+px(st.p)+
      '</div>'+
    '<div style="display:flex;gap:16px">'+
      col('Redeem today',here,'var(--gold-lt)')+
      col('If it winds down',settle,'var(--bone)')+
    '</div>'+
    // Two forces pull opposite ways and either can win, so name both rather than guess which
    // one decided it. Holding adds the escrow clawback and the unvested-team burn. Against that,
    // the wind-down happens at the settle price, not today's, and the pool's cash moves with it.
    '<div style="margin-top:9px;font-size:10.5px;color:var(--muted);line-height:1.45">'+
      ((settle.back>0||settle.burn>=1)
        ? 'Holding adds <b>'+money(settle.back)+'</b> of escrow and burns <b>'+
          num(Math.round(settle.burn))+'</b> unvested team tokens, but settles at '+px(sp)+
          ', not today\u2019s '+px(st.p)+'. '
        : 'By now the escrow is drawn and the team has vested, so holding adds nothing, and a wind-down '+
          'settles at '+px(sp)+', not today\u2019s '+px(st.p)+'. ')+
      (Math.abs(settle.per-here.per)/Math.max(here.per,1e-12) < 0.005
        ? 'They very nearly cancel here.'
        : settle.per>=here.per
          ? 'Net, holding is worth <b style="color:var(--up)">'+px(settle.per-here.per)+' more per token</b>.'
          : 'Net, redeeming today is worth <b>'+px(here.per-settle.per)+' more per token</b>.')+
    '</div>';
}

// The price at which the market equals redemption. Below it, buying to redeem is free money; above it,
// holders sell into the pool. Either way the wind-down settles here.
// A state measured from a price history or a drawn path happens at a point in TIME, so the
// release schedules decide how much escrow is still clawable and how much of the team is still
// unvested. A state built from launch parameters alone has no such moment, so it falls back to
// the flat 'Escrow clawed back' and 'Team unvested at wind-down' assumptions.
function windAt(m,st){
  return st && st.months!=null
    ? {back:m.clawableAt(st.months), burn:m.vestBurnAt(st.months), timed:true}
    : {back:m.escrowBack,            burn:m.vestBurn,              timed:false};
}

function settleAt(m,st){
  const wa=windAt(m,st);
  let p=m.p0;
  for(let i=0;i<500;i++){
    const pt=Math.sqrt(st.k/p), pc=Math.sqrt(st.k*p), surv=st.supply-pt-wa.burn;
    if(surv<=0){ p*=1.35; continue; }
    p=0.5*p+0.5*(((Math.max(0,st.treasury)+pc)*(1-m.fee)+wa.back)/surv);
  }
  return p;
}

function renderEol(m,ST){
  const wa=windAt(m,ST);
  const sp=settleAt(m,ST);
  // NB: named poolTok/poolCash deliberately - a local called pc shadows the pc() percent formatter
  // and every call below it fails.
  const poolTok=Math.sqrt(ST.k/sp), poolCash=Math.sqrt(ST.k*sp);
  const burnt=poolTok+wa.burn, surv=ST.supply-burnt;
  const gross=Math.max(0,ST.treasury)+poolCash;
  const pot=gross*(1-m.fee)+wa.back;
  const per=surv>0?pot/surv:0;
  const ok=surv>0;

  $('eolSrc').innerHTML='measured from <b style="color:var(--gold-lt)">'+ST.label+'</b>';
  $('eolSum').innerHTML=
    '<div class="s"><div class="k">Settles at</div><div class="v">'+(ok?px(sp):'·')+'</div><div class="n">where the market meets redemption</div></div>'+
    '<div class="s"><div class="k">Holder receives</div><div class="v">'+(ok?px(per):'·')+'</div><div class="n">per surviving token, net of the fee</div></div>'+
    '<div class="s"><div class="k">vs listing</div><div class="v">'+(ok?pc(per/m.p0):'·')+'</div><div class="n">listing was '+px(m.p0)+'</div></div>'+
    '<div class="s"><div class="k">Distributed</div><div class="v">'+(ok?money(pot):'·')+'</div><div class="n">'+money(Math.max(0,ST.treasury))+' treasury + '+money(poolCash)+' pool cash</div></div>'+
    '<div class="s"><div class="k">Burnt</div><div class="v">'+(ok?num(burnt):'·')+'</div><div class="n">'+num(poolTok)+' pool + '+num(wa.burn)+' unvested team'+
      (wa.timed?' at '+ST.months.toFixed(0)+' mo':'')+'</div></div>'+
    '<div class="s"><div class="k">Surviving</div><div class="v">'+(ok?num(surv):'·')+'</div><div class="n">'+(ok?pc(surv/ST.supply)+' of supply':'pool exceeds supply')+'</div></div>'+
    '<div class="s"><div class="k">Escrow returned</div><div class="v">'+money(wa.back)+'</div><div class="n">'+
      (wa.timed?'still clawable at '+ST.months.toFixed(0)+' mo':'untaxed, paid separately')+'</div></div>';

  $('eolNote').innerHTML = ok
    ? '<b>This is the one number the whole page is about.</b> A wind-down does not happen at today\u2019s price. '+
      'The moment redemption opens, anyone can buy below it and redeem, or sell above it, so the price '+
      'converges on <b>'+px(sp)+'</b> and every holder is paid <b>'+px(per)+'</b> from there. '+
      'Where the market happens to be when the vote passes changes how far it travels, not where it lands. '+
      '<span style="color:var(--muted2)">Every payout figure on this page is net of the end-of-life fee. '+
      'End of life pays out in the assets themselves, so nothing is sold. The '+(+$('sl').value)+
      '% conversion cost is taken once, at launch, as an allowance for buying the reserve assets and the SOL side of the pools. '+
      'After that the reserves are modelled as stablecoins.</span>'
    : '<b>Unreachable state.</b> The pool holds more tokens than exist outside the burn, so there is no '+
      'price at which this wind-down can settle. Lower the liquidity share or the trading volume.';
}

const FEE_CEIL=200, FEE_FIXED=30;   // 2.00% total, of which 0.30% is Transmuter plus the DAO
let FEE_CLAMPED=false;
function clampFees(){
  const other = FEE_LAST==='ft' ? 'fl' : 'ft';
  const moved = $(FEE_LAST), room = FEE_CEIL - FEE_FIXED - (+$(other).value);
  FEE_CLAMPED = (+moved.value) > room;
  if(FEE_CLAMPED) moved.value = Math.max(+moved.min, room);
}

function run(){
  WALK_CACHE=null;          // inputs may have moved, so the shared walk is stale
  clampFees();
  ['sle','lp','tm','inv','uv','ud','sl'].forEach(function(id){
    const el=$(id+'v'); if(el) el.textContent=(+$(id).value)+'%'; });
  // mint size is per event now; this only pre-fills the event dialog
  $('pshv').textContent=(+$('psh').value)+'%';
  $('mpv').textContent=(+$('mp').value)+'%';
  $('lifev').textContent=(+$('life').value)+' mo';
  if(typeof syncVestPresets==='function') syncVestPresets();
  // Say in words what the three sliders add up to, and name the actual cliff release as a
  // percentage, since that is the number a founder is really asking about and it is not
  // guessable from the sliders. Both schedules run cliff+over months in total and the cliff
  // pays out its share of that total.
  (function(){
    var up=+$('tvUp').value/100, c=+$('tvCliff').value, o=+$('tvOver').value,
        D=Math.max(1,c+o), s;
    if(up>=1) s='Everything unlocks at listing, so no team tokens burn at a wind-down.';
    else if(c>0){
      var atC=(1-up)*(c/D);
      s=(up>0?(up*100).toFixed(0)+'% at listing, then nothing':'Nothing')+
        ' until month '+c+', when '+(atC*100).toFixed(0)+'% unlocks'+
        (c<D?', being what has built up by then, and the rest vests evenly to month '+D+'.'
            :', which is all of it.');
    }
    else s=(up>0?(up*100).toFixed(0)+'% at listing, the rest vests evenly to month '+D+'.'
                :'Vests evenly from listing to month '+D+'.');
    if($('tvSummary')) $('tvSummary').textContent=s;

    var eu=+$('erUp').value/100, ec=+$('erCliff').value, eo=+$('erOver').value,
        eD=Math.max(1,ec+eo), es=+$('es').value||0, e;
    if(es<=0) e='No escrow on this launch, so nothing here changes anything.';
    else if(eu>=1) e='Drawn in full at listing, so none of it is left to come back.';
    else if(ec>0){
      var atE=eu+(1-eu)*(ec/eD);
      e=(eu>0?(eu*100).toFixed(0)+'% drawn at listing, then nothing':'Nothing drawn')+
        ' until month '+ec+', when the draw reaches '+(atE*100).toFixed(0)+'%'+
        (ec<eD?', then the rest is drawn evenly to month '+eD+'.':', which is all of it.')+
        ' Whatever is still undrawn comes back to holders at end of life.';
    }
    else e=(eu>0?(eu*100).toFixed(0)+'% drawn at listing, the rest drawn evenly to month '+eD+'.'
                :'Drawn evenly from listing to month '+eD+'.')+
           ' Whatever is still undrawn comes back to holders at end of life.';
    if($('erSummary')) $('erSummary').textContent=e;
  })();
  $('tvCliffV').textContent=(+$('tvCliff').value)+' mo';
  $('tvOverV').textContent=(+$('tvOver').value)+' mo';
  $('erUpV').textContent=(+$('erUp').value)+'%';
  $('erCliffV').textContent=(+$('erCliff').value)+' mo';
  $('erOverV').textContent=(+$('erOver').value)+' mo';
  $('dvv').textContent=(+$('dv').value/10).toFixed(1)+'%';
  // This slider is not always what drives the run, and silence there reads as a broken control.
  // Two things can override or neutralise it, so say which one is in force.
  if($('dvHint')){
    $('dvHint').innerHTML = !FEES
      ? 'Of market cap, per day. <b style="color:var(--gold-lt)">Nothing accrues yet</b>: set '+
        '<b>Accrue trading fees</b> to On above for this to move anything.'
      : (histHasVolume() && USE_REAL_VOL
          ? 'Of market cap, per day. <b style="color:var(--gold-lt)">The '+histName()+' run ignores this</b> '+
            'and uses '+histName()+'\u2019s own weekly volume. Switch <b>Volume</b> to '+
            '\u201cmy flat assumption\u201d on that tab to drive it from here instead.'
          : 'Of market cap, per day.');
  }

  // The two creator legs are what reaches reserves. Transmuter's 0.20% and the DAO's 0.10% are
  // fixed, never receive any of the extra, and leave the token, so the holder's total is legs+0.30%.
  if($('feeBad')) $('feeBad').textContent = FEE_CLAMPED
    ? 'Held at the 2.00% ceiling. Lower the other share to give this one more room.' : '';
  if($('feeTot')) $('feeTot').textContent=((+$('ft').value + +$('fl').value)/100 + 0.30).toFixed(2)+'%';

  $('ftv').textContent=(+$('ft').value/100).toFixed(2)+'%';
  $('flv').textContent=(+$('fl').value/100).toFixed(2)+'%';
  $('gtv').textContent=(+$('gt').value)+'%';
  const m=model();

  // A launch that cannot go ahead has nothing to run forward. The table, the drawn path and the
  // SOL run all read a listing price that does not exist yet, and against zero they printed
  // placeholder-shaped figures ("<$0.00000001" on both axis ends, "2000000000000.0x listing").
  // The section shows one honest empty state instead.
  const usable = m.raise>0 && m.feasible && m.meetsMin && !(m.allocated>1.0001);

  [...$('presets').children].forEach(function(b){
    b.classList.toggle('on',['sle','lp','tm','inv','es','rz','dv'].every(k=>+b.dataset[k]===+$(k).value)); });

  // Four-step gold ramp, lightest to darkest, so the segments separate by value rather than by hue.
  // Both brand hues, so the four segments separate properly instead of three near-identical golds.
  const parts=[['Liquidity',m.lpPct,'var(--gold)'],['Public sale',m.salePct,'var(--violet)'],
               ['Team',m.teamPct,'var(--gold-deep)'],['Investors',m.invPct,'var(--muted2)']];
  const rest=Math.max(0,1-m.allocated);
  $('allocBar').innerHTML=parts.map(p=>'<div style="width:'+(p[1]*100)+'%;background:'+p[2]+'"></div>').join('')
    +(rest>0?'<div style="width:'+(rest*100)+'%;background:var(--line-soft)"></div>':'');
  $('allocLegend').innerHTML=parts.map(p=>'<span><i style="background:'+p[2]+'"></i>'+p[0]+' '+pc(p[1])+'</span>').join('')
    +(rest>0?'<span><i style="background:var(--line-soft)"></i>Unallocated '+pc(rest)+'</span>':'');
  $('allocBad').textContent=m.allocated>1.0001?'Allocations sum to '+pc(m.allocated)+', over 100%.':'';

  $('outcome').innerHTML=
    '<div class="orow hero2"><span class="k">Listing</span><span class="v">'+px(m.p0)+'</span></div>'+
    '<div class="orow"><span class="k">Market cap</span><span class="v">'+money(m.mcp)+'</span></div>'+
    '<div class="orow"><span class="k">Liquidity</span><span class="v">'+money(m.lpCash)+'  <span style="opacity:.5">'+pc(m.lpPct)+'</span></span></div>'+
    '<div class="orow"><span class="k">Escrow</span><span class="v">'+money(m.escrow)+'</span></div>'+
    (m.convCost>0?'<div class="orow"><span class="k">Conversion at launch</span><span class="v">&minus;'+money(m.convCost)+'  <span style="opacity:.5">'+(+$('sl').value)+'% allowance</span></span></div>':'')+
    '<div class="orow"><span class="k">Treasury · the remainder</span><span class="v">'+money(m.treasury0)+'  <span style="opacity:.5">'+pc(m.mcp>0?m.treasury0/m.mcp:0)+' of MCP</span></span></div>';
  $('verdict').className='verdict '+(m.feasible&&m.meetsMin?'ok':'no');
  // "Use minimum" solves for the raise that just covers the escrow once liquidity and the treasury
  // minimum are taken. With no escrow both of those scale with the raise, so the constraint is
  // scale-free and there is no minimum to solve for. The button used to silently do nothing in
  // that case, including on the Memecoin preset, which reads as a broken control.
  (function(){
    const um=$('useMin'); if(!um) return;
    const can=m.feasible&&m.escrow>0;
    um.disabled=!can;
    um.style.opacity=can?'':'.45';
    um.style.cursor=can?'':'not-allowed';
    um.title=can
      ? 'Set the raise to the smallest that covers escrow, liquidity and the treasury minimum'
      : (m.feasible
          ? 'No escrow to cover. Liquidity and the treasury minimum both scale with the raise, so there is no minimum to solve for'
          : 'Liquidity plus the treasury minimum take more than the sale brings in, so no raise can work');
  })();

  let vd;
  if(m.raise<=0){
    // Defaults open at zero, and every branch below reads as a verdict on a launch that does not
    // exist yet. Without this the empty state claims "a well backed launch" against $0.
    vd='<b>Set a raise to begin.</b> Enter a total target raise above, plus an escrow ask if the '+
       'project needs runway. Everything on this page updates as you type.';
  } else if(m.allocated>1.0001){
    // The allocation warning under the sliders said 215%, and this verdict said "a well backed
    // launch" directly beneath it. Nothing downstream is meaningful until the four add up.
    vd='<b>Allocations add up to '+pc(m.allocated)+'.</b> Public sale, liquidity, team and '+
       'investors have to total 100% of supply before any of these figures mean anything. '+
       'Bring them down by '+pc(m.allocated-1)+'.';
  } else if(!m.feasible){
    // Two different failures. Exactly balanced is only a problem because of the escrow; genuinely
    // over-committed is a problem at any raise. Saying the second when the first is true sends a
    // creator off cutting liquidity when dropping the escrow ask would have done it.
    vd = m.denom===0
      ? '<b>No room for the escrow.</b> Liquidity at '+pc(m.lpPct)+' plus the '+pc(TREAS_MIN)+
        ' treasury minimum take exactly the '+pc(m.salePct)+' the sale brings in, so nothing is '+
        'left for an escrow ask of '+money(m.escrow)+'. Raise the sale share, cut liquidity, or '+
        'drop the escrow.'
      : '<b>Impossible at any raise.</b> Liquidity at '+pc(m.lpPct)+' plus the '+pc(TREAS_MIN)+
        ' treasury minimum needs '+pc(m.lpPct+TREAS_MIN)+' of market cap, but a '+pc(m.salePct)+
        ' sale only brings in '+pc(m.salePct)+'. Raise the sale share or cut liquidity.';
  } else if(!m.meetsMin){
    const need=m.escrow>0?m.escrow/m.denom:0;
    vd='<b>Treasury below its '+pc(TREAS_MIN)+' minimum.</b> This launch would be rejected. '+
       (m.escrow>0?'Minimum raise here is <b>'+money(need)+'</b>, '+money(need-m.raise)+' more than you have set.'
                  :'With no escrow ask, liquidity alone is taking more than the sale can fund.');
  } else {
    // With an escrow ask there is a real minimum raise, and money above it splits between deeper
    // liquidity and the treasury. With none, liquidity and the treasury minimum scale with the raise,
    // so there is no minimum to quote and everything above those two lands in the treasury.
    let lead;
    if(m.escrow>0){
      const need=m.escrow/m.denom, over=m.raise-need;
      lead='This launch meets every minimum. Minimum raise <b>'+money(need)+'</b>'+
        (over>0.5?'. The <b>'+money(over)+'</b> above it splits '+money(m.lpPct*over/m.salePct)+
                  ' into deeper liquidity and '+money(over-m.lpPct*over/m.salePct)+' into treasury.':'.');
    } else {
      const extra=m.raise-m.lpCash-TREAS_MIN*m.mcp;
      lead='This launch meets every minimum. With no escrow there is no minimum raise, because liquidity and '+
        'the treasury minimum both scale with it. Liquidity takes <b>'+money(m.lpCash)+'</b> and the treasury '+
        'minimum <b>'+money(TREAS_MIN*m.mcp)+'</b>'+
        (extra>0.5?'; the other <b>'+money(extra)+'</b> goes to the treasury on top.':'.');
    }
    vd=lead+
       '<br><b>Because only '+pc(m.salePct)+' of supply is sold</b>, every sold token funds backing for '+
       (1/m.salePct).toFixed(2)+' tokens. Liquidity and the treasury minimum together take '+
       pc((m.lpPct+TREAS_MIN)/m.salePct)+' of the raise'+(m.escrow>0?' before the escrow gets anything.':'.');
  }
  $('verdict').innerHTML=vd;

  LIVE_FLOOR=liveFloor(m.S,m.k0,m.treasury0,m.p0);   // binding level, used by the cards below
  // "Recovery at listing" is a launch-time question: what somebody who
  // bought in the sale gets back. Asked of a state that has already run, the question is not
  // merely different, it is usually unanswerable: after a run-up with mints the pool would need
  // more tokens than exist to push the price back down to listing, so atPrice returns
  // reachable:false and a zero payout. Printing that zero as "0.0% recovery" is a lie about a
  // perfectly healthy launch. v1 never showed it only because its source defaulted to the launch
  // and never changed on its own; now that opening a view sets the state, this has to be pinned.
  const flat=(function(){ const keep=SOURCE; SOURCE='launch';
    const r=atPrice(m,1,effState(m)); SOURCE=keep; return r; })();
  const flatPc  = flat.reachable ? pc(flat.vsList) : '\u00b7';
  const flatPer = flat.reachable ? px(flat.per)    : '\u00b7';

  // THE one number. Everything else on this card supports it or qualifies it.
  // v1 stated this figure three times in three places under two different names.
  // A recovery figure for a launch that cannot happen is worse than no figure: the page was
  // printing "595.5%" and "a well backed launch" next to its own warning that the allocations
  // summed to 215%. The headline now defers to the verdict underneath it.
  const configOK = m.feasible && m.meetsMin && !(m.allocated>1.0001);
  $('heroVal').textContent = (m.raise>0 && configOK) ? flatPc : '\u00b7';
  $('heroSub').innerHTML = m.raise<=0
    ? 'Set a target raise to begin. Everything updates as you type.'
    : !configOK
    ? 'This launch would not go ahead as configured, so there is no recovery figure to give. '+
      'The reason is below.'
    : 'Of what a sale buyer paid, returned at a wind-down with the price sitting at listing. '+
      'It is <b>'+flatPer+'</b> per token, paid pro rata from reserves in the assets themselves, '+
      'net of the end-of-life fee.';
  $('heroGrid').innerHTML = (m.raise<=0 || !configOK) ? '' :
    '<div class="hg vio"><div class="k">Redeemable now</div><div class="v">'+
      pc(LIVE_FLOOR/Math.max(m.p0,1e-12))+'</div><div class="n">'+px(LIVE_FLOOR)+
      ' per token, the settlement price: where the market price meets redemption value and stops falling. No vote needed.</div></div>'+
    '<div class="hg"><div class="k">Listing price</div><div class="v">'+px(m.p0)+
      '</div><div class="n">'+money(m.mcp)+' market cap</div></div>'+
    '<div class="hg"><div class="k">Reserves at listing</div><div class="v">'+
      money(m.treasury0+m.lpCash)+'</div><div class="n">'+money(m.treasury0)+' treasury \u00b7 '+
      money(m.lpCash)+' pool cash</div></div>';
  $('sum').innerHTML=
    '<div class="s"><div class="k">Raise</div><div class="v">'+money(m.raise)+'</div><div class="n">'+pc(m.salePct)+' of supply sold</div></div>'+
    '<div class="s"><div class="k">Liquidity tokens</div><div class="v">'+num(m.lpTok)+'</div><div class="n">paired with '+money(m.lpCash)+'</div></div>'+
    '<div class="s"><div class="k">Burns at wind-down</div><div class="v">'+num(m.vestBurn)+'</div><div class="n">'+pc(m.S?m.vestBurn/m.S:0)+' of supply, unvested team only'+'</div></div>'+

    '<div class="s"><div class="k">Escrow clawback</div><div class="v">'+money(m.escrowBack)+'</div><div class="n">of '+money(m.escrow)+', untaxed</div></div>'+
    '<div class="s"><div class="k">Recovery at listing</div><div class="v">'+flatPc+'</div><div class="n">'+flatPer+' per token, at end of life</div></div>'+
    '<div class="s lecard lend"><div class="k">Redeemable now</div><div class="v">'+pc(LIVE_FLOOR/Math.max(m.p0,1e-12))+'</div><div class="n">'+px(LIVE_FLOOR)+' per token, the settlement price: where the market price meets redemption value and stops falling</div></div>';

  if(!m.mintLog.length){
    $('mintState').innerHTML='<div class="hint" style="margin-top:0">No mints. '
      +'<b style="color:var(--gold-lt)">Click any row in the table below</b>, with Numbers from set to Launch, to add one at that price. '
      +'Click it again to remove. Up to '+MAX_MINTS+', run in price order, lowest first.</div>';
  } else {
    const gateNow=+$('gt').value/100;
    let html='<div style="border:1px solid var(--gold);border-radius:var(--r-tile);background:rgba(226,192,102,.07);padding:10px 12px">'
      +'<div style="font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--muted2);margin-bottom:8px">'
      +m.mintLog.length+' mint'+(m.mintLog.length>1?'s':'')+'</div>';
    m.mintLog.forEach(function(x){
      const shut=x.ratioBefore>=gateNow;
      html+='<div style="font-size:11.5px;line-height:1.55;padding:7px 0;border-bottom:1px solid var(--line-soft)">'
        +'<b style="color:var(--up)">M'+x.n+'</b> at <b style="color:var(--gold-lt)">'+px(x.price)+'</b>'
        +(shut?' <span style="color:var(--down)">· gate shut here</span>':'')+'<br>'
        +'<span style="color:var(--muted2)">'+num(x.tok)+' tokens minted'
        +(x.toLP>0?': '+num(x.toPublic)+' sold, '+num(x.toLP)+' paired into the pools':'')
        +'<br>buyers pay '+money(x.paid)
        +(x.toLP>0?' · '+money(x.pairCash)+' of it pairs into the pools · '
                   +money(x.paid-x.pairCash)+' to treasury':'')
        +'<br>supply '+num(x.supBefore)+' &rarr; '+num(x.supAfter)
        +' · treasury '+money(x.treBefore)+' &rarr; '+money(x.treAfter)
        +(x.toLP>0?' · pool '+(x.kAfter/x.kBefore).toFixed(2)+'x deeper':'')
        +' · backing was '+px(x.backBefore)+', ratio '+pc(x.ratioBefore)+'</span></div>';
    });
    html+='<div style="font-size:11.5px;padding-top:8px;line-height:1.55"><b>Total: '+num(m.mintTok)
      +' tokens minted, '+money(m.mintCash)+' of external capital.</b> Supply '+num(m.S)+' &rarr; '+num(m.supply)
      +', treasury '+money(m.treasury0)+' &rarr; '+money(m.treasury)
      +(m.pSh>0?', pool '+(m.k/m.k0).toFixed(2)+'x deeper':'')+'.</div>'
      +'<button style="margin-top:8px" onclick="TBL_EV=[];syncTbl();run()">Clear all events</button></div>';
    $('mintState').innerHTML=html;
  }

  // What the same size would cost a buyer through the pool instead. This is the premium's real job:
  // it prices a large purchase at something closer to fair value than the slippage the pool would
  // charge, and the cash lands in the treasury rather than in the pool.
  (function(){
    const want=m.mintPct*m.S, px0=Math.sqrt(m.k0/m.p0), py0=Math.sqrt(m.k0*m.p0);
    let slip=null;
    if(want>0 && want<px0*0.98){
      const avg=(m.k0/(px0-want)-py0)/want;
      slip=avg/m.p0-1;
    }
    $('premHint').innerHTML =
      'Buyers pay market plus this. <b style="color:var(--gold-lt)">It is not what makes a mint '+
      'accretive</b>: backing per token rises whenever the sale price is above the backing per token, '+
      'which at any healthy price it is by a wide margin.<br><br>'+
      'What it does do is <b>price a large purchase near fair value</b>. '+
      (slip!==null
        ? 'Buying this mint\u2019s '+num(want)+' tokens through the pool would cost about <b '+
          'style="color:var(--gold-lt)">'+pc(slip)+'</b> over spot in slippage, and every dollar of it '+
          'would land in the pool. At a '+pc(m.prem)+' premium the same buyer pays '+
          (slip>m.prem?'less':'more')+', and the cash goes to the treasury instead.'
        : 'A purchase this size cannot clear the pool at all, which is the point: the mint is the only '+
          'route to that size.')+
      ' It also stops the mint being sniped at the market price.';
  })();

  // The structural bottom note is out for now. A better line would be the point where selling stops
  // being worth it, which is where the market price drops under the EOL redemption figure.

  var MINT_ROW_PRICES=[];
  const gate=+$('gt').value/100;
  const ST=effState(m);
  let srcTxt=ST.label+' &middot; treasury <b style="color:var(--gold-lt)">'+money(ST.treasury)
    +'</b> &middot; supply '+num(ST.supply)+(m.k0>0?' &middot; pool '+(ST.k/m.k0).toFixed(2)+'x':'')
    +(ST.mints?' &middot; '+ST.mints+' mint'+(ST.mints>1?'s':''):'');
  // v1 warned here that a run existed which the tables were not reading. The state now follows
  // whatever was last run, so that condition cannot arise and the warning is gone with it.
  $('srcNote').innerHTML=srcTxt;
  // Mints and redemptions placed on the table can otherwise only be removed by finding the row
  // again, so the count and a one-click clear sit in this row whenever there are any.
  { const nEv=TBL_EV.length, b=$('tblClear');
    b.style.display=nEv?'':'none';
    b.textContent='Clear events ('+nEv+')'; }
  // The buttons are the status: whichever is lit is what the numbers are measured from.
  if($('srcSol')) $('srcSol').textContent = histName()+' history';
  // When the state comes from a simulated run, mark where that run actually finished. Anything above it
  // is a level the history never reached, so the pool cash there assumes trading that never happened.
  const endF = ST.endPrice ? ST.endPrice/m.p0 : null;
  const allF = endF ? LEVELS.concat([endF]).sort(function(a,b){return b-a;}) : LEVELS;

  let rows='',best={vsMarket:0,f:1};
  allF.forEach(function(f){
    const isEnd = endF!==null && f===endF;
    const r=atPrice(m,f,ST);
    if(f<=1&&r.reachable&&r.vsMarket>best.vsMarket) best=Object.assign({},r,{f:f});
    MINT_ROW_PRICES.push(r.price);
    if(VIEW==='gate'){
      // LIVE backing: what a token can actually claim today, which is the treasury AND the pool's cash,
      // over the tokens that can claim. No escrow clawback, no vested-token burn credit: those only
      // happen if the team fails, so they are wind-down recovery rather than backing, and counting them
      // would open the gate late. The pool's cash is not in that category, it is redeemable right now.
      const mcapAt=r.price*ST.supply;
      const reserves=Math.max(0,ST.treasury)+r.y;
      const claimants=ST.supply-r.x;
      const backPer=r.liveRed;          // treasury plus pool cash, over claimants, less the redemption fee
      const ratio=r.liveRatio;          // that claim measured against the market price
      const open=ratio<gate;
      const accr=backPer>0?r.price/backPer:0;
      const reG=TBL_EV.find(function(e){return e.type==='redeem'&&Math.abs(e.price-r.price)<1e-9;});
      const miG=mintSequence().findIndex(function(q){return Math.abs(q-r.price)<1e-9;});
      const isMintG=miG>=0;
      rows+='<tr data-p="'+r.price+'" class="pick '+(isMintG?'mintrow ':'')+(isEnd?'endrow ':'')+(f===1?'launch':(f>1?'up':''))+'">'+
        '<td class="p">'+(isMintG?'<b style="color:var(--up)">M'+(miG+1)+'</b> ':'')
          +(isEnd?'<b style="color:var(--bone)">ended </b>':'')+px(r.price)+'</td>'+
        '<td style="'+(f>1?'color:var(--up)':(f===1?'color:var(--gold);letter-spacing:.1em':''))+'">'
          +(f===1?'LISTING':(f>1?'+'+pc(f-1):'−'+pc(1-f)))+'</td>'+
        '<td>'+money(mcapAt)+'</td>'+
        '<td>'+money(reserves)+'</td>'+
        '<td>'+num(claimants)+'</td>'+
        '<td class="g">'+px(backPer)+'</td>'+
        '<td class="'+(open?'':'win')+'">'+pc(ratio)+'</td>'+
        '<td style="color:'+(open?'var(--up)':'var(--muted2)')+'">'+(open?'OPEN':'shut')+'</td>'+
        '<td class="big">'+(accr>0?accr.toFixed(2)+'x':'·')+'</td></tr>';
      return;
    }
    // Table events only apply to the launch numbers, so their markers show only there.
    const mi=SOURCE==='launch'?mintSequence().findIndex(function(q){return Math.abs(q-r.price)<1e-9;}):-1;
    const isMint=mi>=0;
    // a redemption placed on this row gets its own marker, so it can be found again to remove it
    const isRed=SOURCE==='launch'&&TBL_EV.some(function(e){return e.type==='redeem'&&Math.abs(e.price-r.price)<1e-9;});
    const redTag=isRed?'<b style="color:var(--violet)" title="redemption placed here; click the row to remove it">R</b> ':'';
    if(DETAIL==='simple'){
      // one reserve figure instead of the four-step waterfall, and the burn as a single number
      const mcapAt=r.price*ST.supply;
      const ratio=mcapAt>0&&r.reachable?r.pot/mcapAt:0;   // that reserve against the market cap
      rows+='<tr data-p="'+r.price+'" class="pick '+(isMint?'mintrow ':'')+(isEnd?'endrow ':'')
        +(f===1?'launch':(f>1?'up':''))+(r.reachable?'':' dead')+'">'+
        '<td class="p">'+(isMint?'<b style="color:var(--up)">M'+(mi+1)+'</b> ':'')+redTag
          +(isEnd?'<b style="color:var(--bone)">ended </b>':'')+px(r.price)+'</td>'+
        '<td style="'+(f>1?'color:var(--up)':(f===1?'color:var(--gold);letter-spacing:.1em':''))+'">'
          +(f===1?'LISTING':(f>1?'+'+pc(f-1):'−'+pc(1-f)))+'</td>'+
        '<td class="p">'+(r.reachable?money(r.pot):'·')+'</td>'+
        '<td>'+(r.reachable?num(r.burnt):'·')+'</td>'+
        '<td>'+(r.reachable?pc(r.burnt/ST.supply):'·')+'</td>'+
        '<td class="lecol">'+(r.liveOK?pc(r.liveRatio):'\u00b7')+'</td>'+
        '<td class="lecol lend '+(r.eolRatio>=1?'win':'')+'">'+(r.reachable?pc(r.eolRatio):'·')+'</td>'+
        '<td class="lecol g">'+(r.liveOK?px(r.liveRed):'\u00b7')+'</td>'+
        '<td class="lecol lend g">'+(r.reachable?px(r.per):'unreachable')+'</td>'+
        '<td>'+(r.reachable?pc(r.vsList):'·')+'</td>'+
        '<td class="big"><span class="'+(r.vsMarket>=1?'win':'')+'">'
          +(r.reachable?r.vsMarket.toFixed(2)+'x':'·')+'</span></td></tr>';
      return;
    }
    rows+='<tr data-p="'+r.price+'" class="pick '+(isMint?'mintrow ':'')+(isEnd?'endrow ':'')+(f===1?'launch':(f>1?'up':''))+(r.reachable?'':' dead')+'">'+
      '<td class="p">'+(isMint?'<b style="color:var(--up)">M'+(mi+1)+'</b> ':'')+redTag
        +(isEnd?'<b style="color:var(--bone)">ended </b>':'')+px(r.price)+'</td>'+
      '<td style="'+(f>1?'color:var(--up)':(f===1?'color:var(--gold);letter-spacing:.1em':''))+'">'
        +(f===1?'LISTING':(f>1?'+'+pc(f-1):'−'+pc(1-f)))+'</td>'+
      '<td>'+(r.reachable?num(r.x):'·')+'</td>'+
      '<td>'+(r.reachable?pc(r.x/ST.supply):'·')+'</td>'+
      '<td>'+(r.reachable?money(r.y):'·')+'</td>'+
      '<td>'+money(Math.max(0,ST.treasury))+'</td>'+
      '<td class="p">'+(r.reachable?money(r.gross):'·')+'</td>'+
      '<td style="color:var(--down)">'+(r.reachable?'−'+money(r.fees):'·')+'</td>'+
      '<td style="color:var(--up)">'+(r.escrowBack?'+'+money(r.escrowBack).slice(1):'·')+'</td>'+
      '<td class="p">'+(r.reachable?money(r.pot):'·')+'</td>'+
      '<td>'+(r.reachable?num(r.burnt):'·')+'</td>'+
      '<td>'+(r.reachable?num(r.surviving):'·')+'</td>'+
      '<td class="lecol g">'+(r.liveOK?px(r.liveRed):'·')+'</td>'+
      '<td class="lecol lend g">'+(r.reachable?px(r.per):'unreachable')+'</td>'+
      '<td>'+(r.reachable?pc(r.vsList):'·')+'</td>'+
      '<td class="big"><span class="'+(r.vsMarket>=1?'win':'')+'">'+(r.reachable?r.vsMarket.toFixed(2)+'x':'·')+'</span></td></tr>';
  });
  $('head').innerHTML=(VIEW!=='gate'&&DETAIL==='simple') ? headSimple() :
    '<tr>'+(VIEW==='gate'?HEAD_GATE:HEAD_WIND)
    .map(function(h,i){return '<th'+(i?'':' style="text-align:left"')+tipAttr(h)+'>'+h+'</th>';}).join('')+'</tr>';
  $('tabTitle').textContent = VIEW==='gate' ? 'Live backing and the mint trigger' : 'At wind-down, by price';
  $('tabWind').classList.toggle('on',VIEW==='wind');
  $('tabPath').classList.toggle('on',VIEW==='path');
  // the button has a title and a sub-label now, so relabel the title only;
  // setting textContent on the button itself would flatten both into one string
  { const t=$('tabSol').querySelector('b'); if(t) t.textContent=histName()+' history'; }
  $('srcSol').textContent=histName()+' history';
  $('tabSol').classList.toggle('on',VIEW==='sol');
  $('srcLaunch').classList.toggle('on',SOURCE==='launch');
  $('srcSol').classList.toggle('on',SOURCE==='sol');
  $('srcPath').classList.toggle('on',SOURCE==='path');
  $('feesOff').classList.toggle('on',!FEES);
  $('feesOnBtn').classList.toggle('on',FEES);
  $('detSimple').classList.toggle('on',DETAIL==='simple');
  $('detFull').classList.toggle('on',DETAIL==='full');
  $('detSimple').style.display=$('detFull').style.display=(VIEW==='wind')?'':'none';
  $('srcBar').style.display = (VIEW==='wind'||VIEW==='gate') ? 'flex' : 'none';
  $('pathWrap').style.display = VIEW==='path' ? 'block' : 'none';
  $('solWrap').style.display  = VIEW==='sol'  ? 'block' : 'none';
  $('tableWrap').style.display = (VIEW==='path'||VIEW==='sol') ? 'none' : 'block';
  if(VIEW==='path') $('tabTitle').textContent='Draw the price, watch the reserves follow';
  if(VIEW==='sol')  $('tabTitle').textContent='Your launch, run against '+histName()+'\u2019s real history';

  // One empty state for the whole section, rather than three views that each render a chart with
  // no range, a ladder of zeros or an empty note box. The tabs stay, so it still reads as a
  // section with three views waiting on a launch.
  const emptyBox=$('exploreEmpty');
  if(emptyBox) emptyBox.style.display = usable ? 'none' : 'block';
  if($('headRow')) $('headRow').style.display = usable ? '' : 'none';
  if(!usable){
    $('pathWrap').style.display='none';
    $('solWrap').style.display='none';
    $('tableWrap').style.display='none';
    $('srcBar').style.display='none';
    $('read').innerHTML='';
    renderEol(m,effState(m));
    return;
  }
  if(VIEW==='sol'){ $('tabTitle').textContent='Your launch, run against '+histName()+'\u2019s real history';
    SOL_START=+$('solStart').value;
    $('solStartV').textContent=stepLabel(SOL_START)+(HIST_KEY==='sol'
      ? ' · SOL $'+((WOP.length?WOP[SOL_START]:WSOL[SOL_START])||0).toFixed(2) : '');
    drawSol(m); renderEol(m,effState(m)); $('read').innerHTML=''; return; }
  if(VIEW==='path'){ $('tabTitle').textContent='Draw the price, watch the reserves follow';
    ['wk','vol','ft','fl'].forEach(function(id){const e=$(id+'v'); if(e)
      e.textContent = (id==='ft'||id==='fl') ? (+$(id).value/100).toFixed(2)+'%' : (+$(id).value)+(id==='vol'?'%':'');});
    drawPath(m); renderEol(m,effState(m)); $('read').innerHTML=''; return; }
  $('rows').innerHTML=rows;
  renderEol(m,ST);
  // Mints and redemptions placed on the table change the LAUNCH numbers only. Reading from a SOL run
  // or a drawn path, a click here used to add an event that changed the cards above but not this
  // table, so rows only take clicks on the Launch source; the other two place events on their chart.
  if(SOURCE!=='launch') [...$('rows').querySelectorAll('tr.pick')].forEach(function(tr){ tr.classList.remove('pick'); });
  [...$('rows').querySelectorAll('tr.pick')].forEach(function(tr){
    tr.onclick=function(ev){
      const p=+tr.dataset.p;
      const existing=tblEvAt(p);
      if(existing){ TBL_EV=TBL_EV.filter(function(e){return e!==existing;}); syncTbl(); run(); return; }
      openTblMenu(p,tr,ev);
    };
  });

  let cross=null;
  for(let i=0;i<LEVELS.length;i++){const f=LEVELS[i]; if(f>1) continue;
    const r=atPrice(m,f,ST); if(r.reachable&&r.vsMarket>=1){cross=f;break;}}

  if(VIEW==='gate'){
    const a0=atPrice(m,1,ST);
    const backPer=a0.liveRed, res0=Math.max(0,ST.treasury)+a0.y, cl0=ST.supply-a0.x;
    let firstOpen=null;
    for(let i=LEVELS.length-1;i>=0;i--){
      if(atPrice(m,LEVELS[i],ST).liveRatio < gate){ firstOpen=LEVELS[i]; break; } }
    $('read').innerHTML=
      '<b>This is the trigger view, and it deliberately counts less.</b> Live backing is what a token can '+
      'claim <b>today</b>: the treasury plus the pool\u2019s cash, over the tokens that can actually claim. '+
      'At the listing price that is '+money(res0)+' over '+num(cl0)+' claimants = <b>'+px(backPer)+
      ' per token</b>, after the '+(REDEEM_FEE*100).toFixed(2)+'% redemption fee. It moves with the price, because the pool\u2019s cash '+
      'side grows with the square root of the price and its token side shrinks.<br><br>'+
      'The escrow clawback and the vested-token burn are excluded on purpose, because both only happen if the team '+
      'fails, so they are recovery rather than backing. Counting them here would report the token as '+
      'better backed than it is and open the gate too late. The pool\u2019s cash is not in that category: a '+
      'holder redeems against it right now, without a vote.<br><br>'+
      '<b>The gate is open wherever the backing ratio sits below '+pc(gate)+'</b>, which is anywhere at or '+
      (firstOpen!==null?'above <b>'+px(firstOpen*m.p0)+'</b> ':'')+
      'The token is trading far enough above its backing that selling new supply brings in more cash than the '+
      'claim it creates. <b>Mint accretion</b> is the price divided by backing per token, so it is exactly '+
      'the inverse of the ratio: at 5x accretion, '+
      'every token minted adds five times its own claim to the reserves. That is the whole point of the '+
      'mechanism, and it is why the gate is shut when the ratio is high. Minting near or below backing '+
      'would dilute the people it is meant to protect.';
    return;
  }
  $('read').innerHTML=
    '<b>What this table is.</b> Every row is one market price, and what a holder would get if the '+
    'token wound down with the price sitting there. The highlighted row is the listing price. '+
    'Nothing here is a prediction: it is the same arithmetic run at a ladder of prices.<br><br>'+

    (ST.endPrice?'<b>This state came from a run that finished at '+px(ST.endPrice)+'.</b> Rows above '+
      'that price are levels the run never reached, so their pool figures assume the pool traded all '+
      'the way up and sold tokens into the buying. The treasury beside them is the one the run '+
      'actually produced, and no fees accrue on the extra move. '+
      '<b style="color:var(--bone)">The underlined row is where the run ended.</b><br><br>':'')+

    // Redemptions placed on the table were computed but never reported anywhere.
    (SOURCE==='launch'&&m.redLogT&&m.redLogT.length
      ? '<b style="color:#9878fd">Redemptions placed on the table</b> (marked R; click the row again to remove):<br>'+
        m.redLogT.map(function(x){
          return 'at '+px(x.price)+': '+num(x.tok)+' tokens redeemed for '+money(x.cash)+' ('+
                 px(x.cash/Math.max(1,x.tok))+' each), '+num(x.burnt)+' burnt including their share of the pool';
        }).join('<br>')+'<br><br>'
      : '')+
    '<b>Hover any column heading</b> for what it means.'+
    '<br><br><b>Why the listing row is under 100%.</b> Only the sale portion was ever paid for. Team, '+
    'investor and unallocated tokens put nothing into the reserves and still hold a claim, so the same money is spread '+
    'across more tokens than were bought. What closes the gap is burning supply that was never '+
    'purchased, and getting escrow back rather than spent.';
}

// Opening a view makes that view's state the one the numbers are measured from. This is the
// whole fix for v1's two-tab confusion: there is no second choice left to get out of step.
// Column meanings, on the column. Delegated, so it survives every re-render of the header.
const box=$('tipbox');
if(box){
  const onTip=function(ev){
    const th=ev.target.closest&&ev.target.closest('th[data-tip]');
    if(!th || !root.contains(th)){ box.style.display='none'; return; }
    box.innerHTML=th.getAttribute('data-tip');
    box.style.display='block';
    const r=th.getBoundingClientRect(), bw=box.offsetWidth, bh=box.offsetHeight;
    let x=r.left+r.width/2-bw/2, y=r.bottom+9;
    x=Math.max(10,Math.min(x,window.innerWidth-bw-10));
    if(y+bh>window.innerHeight-10) y=r.top-bh-9;
    box.style.left=x+'px'; box.style.top=y+'px';
  };
  const onScroll=function(){ box.style.display='none'; };
  document.addEventListener('mouseover', onTip);
  document.addEventListener('scroll', onScroll, {passive:true});
  cleanups.push(function(){
    document.removeEventListener('mouseover', onTip);
    document.removeEventListener('scroll', onScroll);
  });
}

$('tabPath').onclick=function(){ VIEW='path'; SOURCE='path'; run(); };
$('tabSol').onclick=function(){ VIEW='sol'; SOURCE='sol'; run(); };
$('srcLaunch').onclick=function(){ SOURCE='launch'; run(); };
$('srcSol').onclick=function(){ SOURCE='sol'; run(); };
$('srcPath').onclick=function(){ SOURCE='path'; run(); };
$('feesOff').onclick=function(){ FEES=false; run(); };
$('feesOnBtn').onclick=function(){ FEES=true; run(); };
$('detSimple').onclick=function(){ DETAIL='simple'; run(); };
$('detFull').onclick=function(){ DETAIL='full'; run(); };
$('tabWind').onclick=function(){ VIEW='wind'; run(); };
$('useMin').onclick=function(){
  const m=model();
  // Math.ceil on a float that is 4000000.0000001 gives 4000001. Shave the dust before rounding.
  if(m.feasible&&m.escrow>0){ $('rz').value=Math.ceil(m.escrow/m.denom - 1e-6); run(); }
};
// The two creator legs share one budget rather than having a cap each. A creator may well want
// 1.00% to the treasury and 0.50% to liquidity, so capping both at 0.85% would forbid a perfectly
// reasonable split. Instead the leg you just moved is the one that stops, at whatever room the
// other leaves under the 2.00% ceiling, fixed legs included. Tracked here because run() cannot
// otherwise tell which of the two moved; attached before the generic listeners so it wins the race.
let FEE_LAST='ft';
['ft','fl'].forEach(function(id){ const e=$(id); if(e) e.addEventListener('input',function(){ FEE_LAST=id; }); });

['sup','sle','es','rz','lp','tm','inv','uv','ud','sl','ms','gt','psh','mp','life','dv','dx','ds','wk','ft','fl','solStart',
 'erUp','erCliff','erOver','tvUp','tvCliff','tvOver']
  // guarded, so retiring a control from the markup can never silently break every other one:
  // a missing id used to throw here and abandon the rest of the list
  .forEach(function(id){ const e=$(id); if(!e) return;
    e.addEventListener('input',run); e.addEventListener('change',run); });
// ── event menu ──────────────────────────────────────────────────────────────────────────────
// Vesting presets. Each is [label, unlocked at listing %, cliff months, vest months]. They only
// write to the three controls, so a preset and a hand-set schedule are the same thing underneath.
// There is deliberately no 'No vesting' preset: team tokens always vest, so an all-at-listing
// schedule is not a thing a founder should be able to pick off a button.
const VEST_PRESETS=[['12 mo linear',0,0,12],['24 mo linear',0,0,24],
                    ['6 + 12',0,6,12],['6 + 18',0,6,18],['12 + 12',0,12,12],['12 + 24',0,12,24]];
(function(){
  const host=$('vestPresets'); if(!host) return;
  VEST_PRESETS.forEach(function(pr){
    const b=document.createElement('button');
    b.textContent=pr[0]; b.dataset.p=pr.slice(1).join(',');
    b.style.fontSize='11.5px'; b.style.padding='6px 10px';
    b.onclick=function(){ $('tvUp').value=pr[1]; $('tvCliff').value=pr[2]; $('tvOver').value=pr[3]; run(); };
    host.appendChild(b);
  });
})();
function syncVestPresets(){
  const now=[+$('tvUp').value,+$('tvCliff').value,+$('tvOver').value].join(',');
  [].forEach.call($('vestPresets').children,function(b){ b.classList.toggle('on',b.dataset.p===now); });
}

let EV_W=0, EV_KIND='';
function closeEvMenu(){ const mn=$('evMenu'); if(mn) mn.style.display='none'; };
// The event menu used to stay open until Cancel. Escape and a click anywhere outside it close it now.
const onGlobalKey = function(e){ if(e.key==='Escape') closeEvMenu(); };
const onGlobalDown = function(e){
  const mn=$('evMenu'); if(!mn||mn.style.display==='none') return;
  if(mn.contains(e.target)) return;
  // a click on a chart or a table row opens the menu again at the new spot, so leave those alone
  if(e.target.closest&&(e.target.closest('canvas')||e.target.closest('#rows'))) return;
  closeEvMenu();
};
document.addEventListener('keydown', onGlobalKey);
document.addEventListener('mousedown', onGlobalDown);
cleanups.push(function(){
  document.removeEventListener('keydown', onGlobalKey);
  document.removeEventListener('mousedown', onGlobalDown);
});
// Charts are drawn at the size they had when drawn. Resizing the window or turning a phone left them
// stretched until something else changed, so they redraw once the resize settles.
(function(){
  let t=null, lastW=window.innerWidth;
  const onResize=function(){
    if(window.innerWidth===lastW) return;          // a phone's address bar showing or hiding is not a resize worth redrawing
    lastW=window.innerWidth; clearTimeout(t); t=setTimeout(function(){ WALK_CACHE=null; run(); },150);
  };
  window.addEventListener('resize', onResize);
  cleanups.push(function(){ clearTimeout(t); window.removeEventListener('resize', onResize); });
})();
function openEvMenu(w,price,mx,my){
  const mn=$('evMenu'); if(!mn) return;
  EV_W=w; EV_KIND=''; TBL_MODE=false; SOL_MODE=false;
  $('evHead').textContent='Week '+w+'  \u00b7  '+px(price);
  $('evChoice').style.display='flex'; $('evForm').style.display='none';
  mn.style.display='block';
  const mw=mn.offsetWidth||230;
  mn.style.left=Math.max(4,Math.min(mx-mw/2,window.innerWidth-mw-8))+'px';
  mn.style.top=Math.max(4,Math.min(my-16,window.innerHeight-mn.offsetHeight-8))+'px';
};
function openSolMenu(w,price,mx,my){
  const mn=$('evMenu'); if(!mn) return;
  EV_W=w; EV_KIND=''; TBL_MODE=false; SOL_MODE=true;
  $('evHead').textContent=stepLabel(w)+'  \u00b7  '+px(price);
  $('evChoice').style.display='flex'; $('evForm').style.display='none';
  mn.style.display='block';
  const mw=mn.offsetWidth||230;
  mn.style.left=Math.max(4,Math.min(mx-mw/2,window.innerWidth-mw-8))+'px';
  mn.style.top=Math.max(4,Math.min(my-16,window.innerHeight-mn.offsetHeight-8))+'px';
};
function evPick(kind){
  EV_KIND=kind;
  const m=model();
  $('evChoice').style.display='none'; $('evForm').style.display='block';
  if(kind==='mint'){
    $('evLabel').textContent='Mint, as a % of supply (up to 25%)';
    $('evVal').value=(m.mintPct*100).toFixed(1);
    $('evHint').textContent='Sold at market plus the '+pc(m.prem)+' premium'+(MINT_WEEKS>1?', over '+MINT_WEEKS+' weeks':'')+'.';
  }else{
    $('evLabel').textContent='Redeem, in tokens';
    $('evVal').value=Math.round(m.S*0.01);
    $('evHint').textContent='Pro-rata share of the treasury and the pool. Their share of the pooled tokens burns with theirs, so nobody else\u2019s claim falls.';
  }
  $('evVal').focus(); $('evVal').select();
}
$('evMint').onclick=function(){ evPick('mint'); };
$('evRedeem').onclick=function(){ evPick('redeem'); };
$('evBack').onclick=function(){ $('evChoice').style.display='flex'; $('evForm').style.display='none'; };
$('evClose').onclick=function(){ closeEvMenu(); };
$('tblClear').onclick=function(){ TBL_EV=[]; syncTbl(); closeEvMenu(); run(); };
$('evAdd').onclick=function(){
  const v=+$('evVal').value;
  if(!(v>0)){ closeEvMenu(); return; }
  if(SOL_MODE){
    SOL_EV=SOL_EV.filter(function(e){ return e.w!==EV_W; });
    if(EV_KIND==='mint'){
      if(SOL_EV.filter(function(e){return e.type==='mint';}).length<MAX_MINTS)
        SOL_EV.push({w:EV_W,type:'mint',pct:Math.min(v,25)/100});
    } else SOL_EV.push({w:EV_W,type:'redeem',tok:v});
    syncSol(); closeEvMenu(); run(); return;
  }
  if(TBL_MODE){
    TBL_EV=TBL_EV.filter(function(e){ return Math.abs(e.price-TBL_PRICE)>1e-9; });
    if(EV_KIND==='mint'){
      if(TBL_EV.filter(function(e){return e.type==='mint';}).length<MAX_MINTS)
        TBL_EV.push({price:TBL_PRICE,type:'mint',pct:Math.min(v,25)/100});
    } else TBL_EV.push({price:TBL_PRICE,type:'redeem',tok:v});
    syncTbl(); closeEvMenu(); run(); return;
  }
  PATH_EV=PATH_EV.filter(function(e){ return e.w!==EV_W; });
  if(EV_KIND==='mint'){
    if(PATH_EV.filter(function(e){return e.type==='mint';}).length>=MAX_MINTS){ closeEvMenu(); return; }
    PATH_EV.push({w:EV_W,type:'mint',pct:Math.min(v,25)/100});
  } else {
    PATH_EV.push({w:EV_W,type:'redeem',tok:v});
  }
  syncEv(); closeEvMenu(); run();
};
$('evVal').addEventListener('keydown',function(e){ if(e.key==='Enter') $('evAdd').click(); });

run();

/* ─────────────────────────────────────────────────────────────────────
   Presentation only. Nothing below reads, writes or derives any model
   value: it copies text the page has already rendered, and remembers
   which disclosure panels were open.
   ───────────────────────────────────────────────────────────────────── */
(function(){
  "use strict";

  /* 2. Remember which advanced panels were left open, per browser.
     Wrapped because storage throws in some privacy contexts, and the page
     must work identically when it does. */
  var KEY = 'tm-calc-open-panels';
  var open = {};
  try { open = JSON.parse(localStorage.getItem(KEY) || '{}') || {}; } catch (e) { open = {}; }

  [].forEach.call(root.querySelectorAll('details.adv'), function(d, i){
    var id = 'adv' + i;
    // Deliberately NOT reopening what was left open. Everything in these panels is a
    // default somebody rarely changes, so the page should open quiet and let the reader
    // choose what to look at.
    d.addEventListener('toggle', function(){
      open[id] = d.open;
      try { localStorage.setItem(KEY, JSON.stringify(open)); } catch (e) {}
    });
  });

  /* 2b. The three panels in the right-hand column (Trading life, Release
     schedules, Reserve mint) are one accordion: opening any of them closes the
     other two, so the column never becomes a stack of open forms. Scoped to
     .ctlcol, so the "full breakdown" disclosure in the result panel keeps its
     own behaviour. */
  var col = root.querySelector('.ctlcol');
  var panels = col ? [].filter.call(col.children, function(el){
    return el.tagName === 'DETAILS' && el.classList.contains('adv');
  }) : [];
  panels.forEach(function(d){
    var onToggle = function(){
      if (!d.open) return;
      panels.forEach(function(other){ if (other !== d && other.open) other.open = false; });
    };
    d.addEventListener('toggle', onToggle);
    cleanups.push(function(){ d.removeEventListener('toggle', onToggle); });
  });

  /* 3. Long explanations fold behind the "?" disclosure this page already uses, so a
        screen of controls reads as controls instead of as an essay. The copy is moved,
        never shortened: open the "?" and it is there, word for word.
        Left inline: anything short enough to read at a glance, anything holding a
        control (the Use minimum button lives inside a hint), and anything already
        behind a disclosure. Nodes are moved rather than rebuilt, so ids survive and
        the hints that run() rewrites keep updating inside the fold. */
  var LONG = 110;
  [].forEach.call(root.querySelectorAll('.hint'), function(h){
    if (h.closest('details.why')) return;
    if (h.querySelector('button, input, select, a')) return;
    if (h.textContent.trim().length < LONG) return;
    var d = document.createElement('details');
    d.className = 'why';
    var s = document.createElement('summary');
    s.textContent = 'what this does';
    h.parentNode.insertBefore(d, h);
    d.appendChild(s);
    d.appendChild(h);
  });
})();

  return function cleanup() {
    for (const fn of cleanups) fn();
  };
}
