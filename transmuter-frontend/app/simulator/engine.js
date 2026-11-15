/* eslint-disable */
// Value calculator runtime, ported from the standalone prototype.
// It renders into the host node and returns a cleanup for document listeners.
export function mountValueCalculator(root) {
  const cleanups = [];
  const $ = (id) => root.querySelector("#" + id);

const TREAS_MIN=0.10;
const REDEEM_FEE=0.005;   // ordinary redemption: 0.35% retained + 0.15% revenue
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
    const r=solWalk(m); const last=r.rows[r.rows.length-1];
    // months is what lets step 3 read the release schedules at the right moment. A null means
    // the state has no point in time, so the flat wind-down assumptions apply instead.
    if(last) return {supply:last.supply,k:last.k,treasury:last.treasury,endPrice:last.p,
                     months:r.rows.length/WPM,
                     label:histName()+' history to '+(WLABEL[last.w]||''),mints:r.log.length};
  }
  if(SOURCE==='path' && typeof walkPath==='function'){
    const r=walkPath(m); const last=r.rows[r.rows.length-1];
    if(last) return {supply:last.supply,k:last.k,treasury:last.treasury,endPrice:last.p,
                     months:r.rows.length/WPM,
                     label:'drawn path, week '+last.t,mints:r.log.length};
  }
  return {supply:m.supply,k:m.k,treasury:m.treasury, months:null,
          label:'launch parameters'+(m.feesOn&&m.lifeM?' + '+m.lifeM+' mo of trading':'')
                +(m.feesOn?'':', no trading accrued'),mints:m.mintLog.length};
}    // 'wind' = recovery at wind-down, 'gate' = live backing and the mint trigger

const HEAD_WIND=['Price','&Delta;','LP tok','%sup','LP cash','+ treas','= pot','\u2212 fees',
                 '+ escrow','payout','burnt','left','redeem live','redeem EOL','vs list','vs mkt'];
// The simple view drops the waterfall and shows what actually decides anything: what is behind the
// token, how much of the supply burns, and what a holder ends up with.
const HEAD_SIMPLE=['Price','&Delta;','total reserve','burnt','%sup burnt','backing ratio',
                   'reserve / tok','payout / tok','vs list','vs mkt'];   // superseded by headSimple()
// Two-row header: backing ratio and redemption each split into Live and EOL side by side.
const COLTIP={"total reserve": "Everything holders share at that price: the treasury, plus the pool’s cash, less the wind-down fee and slippage, plus whatever escrow comes back.", "burnt": "Tokens that stop existing at wind-down: the pool’s own tokens plus the team’s unvested allocation. <b>Investor tokens never burn.</b>", "%sup burnt": "That burn as a share of the supply standing at this price.", "backing ratio": "The redemption value measured against that row’s own market price. <b>live</b> is redeeming today. <b>EOL</b> is a full wind-down.", "redemption / tok": "The payout per token, spread across only the tokens that survive the burn. <b>live</b> has no burn, no escrow back and no wind-down fee, because none of that has happened yet. <b>EOL</b> is the wind-down.", "vs list": "The payout compared to the listing price, so what a sale buyer gets back.", "vs mkt": "The payout compared to that row’s own price. Above 1.00x, buying there and redeeming is a profit anyone can take.", "LP tok": "Tokens the pool holds at that price.", "%sup": "Those pool tokens as a share of supply.", "LP cash": "Dollars the pool holds, which grows with the <b>square root</b> of price: 100x the price is only 10x the cash.", "+ treas": "The treasury, which does not move with price at all.", "= pot": "The pool’s cash and the treasury added together.", "− fees": "The wind-down fee and conversion slippage taken off the pot.", "+ escrow": "Added after the fee, because the clawback returns as its own USDC leg that the fee never touches.", "payout": "What is left to share among the tokens that survive.", "left": "Everyone still holding a claim after the burn.", "redeem live": "What a holder gets redeeming today: no burn, no escrow back, no wind-down fee.", "redeem EOL": "What a holder gets in a full wind-down.", "market cap": "That row’s price times the supply standing there.", "reserves": "Treasury plus the pool’s cash: what a token can claim today.", "claimants": "Supply less the pool’s own tokens, which never claim anything.", "backing / tok": "Reserves over claimants, after the redemption fee.", "ratio": "That claim measured against the market price. The gate opens when it is low.", "gate": "Whether a reserve mint can fire at this price.", "accretion": "Price divided by backing per token, the exact inverse of the ratio. At 5x, every minted token adds five times its own claim to the reserves."};
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
  const a=Math.abs(n);
  if(a>=1e6) return '$'+(a/1e6).toFixed(2)+'M';
  if(a>=1e5) return '$'+(a/1e3).toFixed(0)+'k';     // $100k+, whole thousands reads fine
  if(a>=1e4) return '$'+(a/1e3).toFixed(1)+'k';     // $10k to $100k, one decimal
  return '$'+Math.round(a).toLocaleString('en-GB'); // under $10k, exact
};
const num=n=>Math.round(n).toLocaleString('en-GB');
const pc=n=>(n*100).toFixed(1)+'%';
function px(v){
  if(!isFinite(v)) return '·';
  if(v===0) return '$0';
  if(v<0) return '-'+px(-v);
  if(v>=1000) return '$'+Math.round(v).toLocaleString('en-GB');
  if(v>=1)    return '$'+v.toFixed(2);
  // below a dollar, add decimals rather than switching to exponent notation - $0.0062 reads,
  // $6.2e-3 does not.
  var d = v>=0.01 ? 4 : (v>=0.0001 ? 6 : 8);
  return '$'+v.toFixed(d).replace(/(\.\d*?[1-9])0+$/,'$1').replace(/\.0+$/,'');
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
  const S=+$('sup').value||1;
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
  // whatever the initial release did not pay out is what comes back
  const udPct=1-Math.min(1,Math.max(0,+$('erUp').value/100));

  // The launchpad's solver: minimum raise that still leaves the treasury minimum standing.
  const denom=1-(lpPct+TREAS_MIN)/salePct;
  const minRaise = denom>0 ? (escrow>0?escrow/denom:(lpPct+TREAS_MIN)*0) : Infinity;
  const feasible = denom>0;

  const mcp=raise/salePct;
  // A zero or tiny raise must not poison every downstream figure with NaN. The verdict panel already
  // tells the user the launch is infeasible; the numbers just need to stay finite while it does.
  const p0=Math.max(mcp/S, 1e-12);
  // Allocations are shares of the ORIGINAL supply, so they stay fixed token counts. A reserve mint
  // adds supply on top: it never dilutes the pool's position or changes what burns.
  const lpTok=lpPct*S, lpCash=lpPct*mcp, k=lpTok*lpCash;
  const treasury0=raise-lpCash-escrow;         // the remainder at finalize, before any mint
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
    treasury=(1-f)*Math.max(0,treasury)+f*pot*0.0035;
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
  const meetsMin = treasury >= TREAS_MIN*mcp - 1e-6;

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
          mintPct,pSh,prem,mintTok,mintCash,mintLog,treasury0,
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
  const fees=gross-gross*(1-m.fee)*(1-m.slip);
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
  if(!PATH || PATH_N!==n){ PATH=buildShape(SHAPES['Steady climb'],n,m.p0); PATH_N=n; PATH_EV=[]; syncEv(); }
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
  // The reserve asset gains backing on its own, so the treasury grows even with no trading at all.
  const wkGrow=Math.pow(1+m.apy, 1/52);

  let supply=m.S, treasury=m.treasury0, k=m.k0;
  const redLog=[];
  const mintSet=mintSchedule(PATH_MINTS);
  // size each mint by its own setting, falling back to the Reserve mint default
  const mintPctAt={}; PATH_EV.forEach(function(e){ if(e.type==='mint') mintPctAt[e.w]=e.pct; });
  const redeemAt={};  PATH_EV.forEach(function(e){ if(e.type==='redeem') redeemAt[e.w]=(redeemAt[e.w]||0)+e.tok; });
  const RETAIN=0.0035;   // of the 0.50% redemption fee, this much stays in the treasury
  const rows=[], log=[];

  for(let t=0;t<n;t++){
    const p=path[t];

    // trading activity for the week
    treasury*=wkGrow;                      // cSOL is worth more SOL than it was last week
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
    const pot=gross*(1-m.fee)*(1-m.slip)+backAt(t);
    // What a holder is actually paid for redeeming right now: treasury plus the pool's cash, over the
    // tokens that can claim, less the ordinary fee. Pool tokens are not claimants.
    const claimLive=supply-poolTok;
    const livePer=claimLive>0?((Math.max(0,treasury)+poolCash)/claimLive)*(1-REDEEM_FEE):0;
    rows.push({t,p,supply,treasury,k,poolTok,poolCash,surviving,reachable,floorP,redFloorNow,
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
    const c=document.createElement('button'); c.textContent='Clear mints';
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
  const flTxt='Live redemption value, '+px(rows[0].redFloorNow)+' at launch. Redeemable any time, no vote needed';
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
    ? ' <b style="color:var(--down)">'+(outHi+outLo)+' week'+((outHi+outLo)>1?'s':'')+' off '
      +(outHi&&outLo?'both ends':(outHi?'the top':'the bottom'))+' of this range. Press Fit to drawing</b>'
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
  line('backPer','#9878fd');
  line('per','#e2c066');
  g2.font='10px Inter,sans-serif';
  g2.fillStyle='#e2c066';  g2.fillText('wind-down per token',PAD.l+4,H2-8);
  g2.fillStyle='#9878fd';  g2.fillText('redemption \u00b7 live',PAD.l+150,H2-8);
  g2.fillStyle='rgba(246,244,236,.45)'; g2.fillText('market price',PAD.l+310,H2-8);

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

  let note='<b>The shaded band is the live redemption value</b>, what a holder is paid for redeeming '+
    'right then, with no vote and no wind-down. It starts at '+px(rows[0].redFloorNow)+' '+
    'because the treasury and the pool are both claimable from day one. '+
    'Below it, anyone can buy and redeem for a profit, so the '+
    'token does not trade there. <b>The chart lets you draw down to about half that line</b>, which is the '+
    'only way it gets there in practice: the reserve asset itself collapsing.<br><br>'+
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
             'share of the pool goes with them. Every remaining holder\u2019s claim per token is unchanged.';
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

// SOL price path, USD. Mar 2020 to 13 Nov 2026, 81 points.
// Point zero is SOL's PUBLIC SALE price of $0.22, the CoinList auction of 24 March 2020, not a
// market close. Every later point is a real monthly close, cross-checked against a second
// independent source; each overlapping month agreed to within about 1%.
// The sale price belongs at week zero because that is what this model's week zero IS: a launch
// priced by its own sale. Keeping it means a run configured to list at $0.22 reproduces SOL's
// actual dollar path, peaking near $238 and ending near $83, which is the result anyone
// checking the numbers against a SOL chart will expect to see. Starting at the first traded
// price instead made that same setup top out near $65 and silently understate every run.
// The jump from $0.22 to $0.69 in the first month is real: distribution was 10 April 2020 and
// sale buyers opened roughly 3.1x up.
// The series this replaced was hand-approximated and ran 15% or more off the real close in 20
// of its 77 months, worst through 2026, where it showed a rally to 132 in March that never
// happened.
// The final entry is the 13 Nov 2026 close ($78.26 one source, $78.10 the other), so the series runs to the present; it is a month in
// progress, not a month-end, and goes stale as the live price moves.
// Pre-2021 months rest on one source only, SOL being barely traded then.
const SOLDATA=[["Mar20",0.22],["Apr20",0.69],["May20",0.57],["Jun20",0.86],["Jul20",1.54],["Aug20",4.78],["Sep20",2.9],["Oct20",1.54],["Nov20",1.97],["Dec20",1.51],["Jan21",4.26],["Feb21",13.09],["Mar21",19.46],["Apr21",42.96],["May21",32.82],["Jun21",35.56],["Jul21",36.83],["Aug21",108.48],["Sep21",141.07],["Oct21",202.42],["Nov21",208.67],["Dec21",170.3],["Jan22",99.74],["Feb22",99.52],["Mar22",122.66],["Apr22",85.1],["May22",45.77],["Jun22",33.59],["Jul22",42.4],["Aug22",31.47],["Sep22",33.21],["Oct22",32.61],["Nov22",14.12],["Dec22",9.96],["Jan23",23.95],["Feb23",21.92],["Mar23",21.17],["Apr23",22.83],["May23",20.82],["Jun23",18.9],["Jul23",23.72],["Aug23",19.74],["Sep23",21.4],["Oct23",38.52],["Nov23",59.24],["Dec23",101.51],["Jan24",97.03],["Feb24",125.71],["Mar24",202.87],["Apr24",126.96],["May24",165.64],["Jun24",146.49],["Jul24",171.83],["Aug24",135.37],["Sep24",152.62],["Oct24",168.43],["Nov24",237.74],["Dec24",189.26],["Jan25",231.64],["Feb25",148.03],["Mar25",124.69],["Apr25",147.64],["May25",156.64],["Jun25",154.74],["Jul25",172.42],["Aug25",200.86],["Sep25",208.74],["Oct25",187.21],["Nov25",133.56],["Dec25",124.48],["Jan26",105.44],["Feb26",84.37],["Mar26",83.11],["Apr26",83.02],["May26",82.3],["Jun26",73.52],["Jul26",72.79],["Aug26",103.0],["Sep26",118.0],["Oct26",95.35],["Nov26",78.18]];

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
// Each path follows PRICE. BONK, PEPE and SHIB have fixed supply with float equal to total,
// so their market cap series IS their price series; DOGE inflates, so it uses price directly.
// Volume is always measured against market cap. Source: Coin Metrics community data.
const HIST={
  bonk:{name:"BONK",span:"Oct23 to May26",weeks:138,w:[["Oct23",1.0,0.0477],["Oct23",0.8953,0.08395],["Oct23",0.9035,0.08345],["Oct23",1.9953,0.20262],["Oct23",3.3159,0.1438],["Nov23",6.8772,0.17445],["Nov23",12.012,0.15546],["Nov23",22.0429,0.16746],["Nov23",27.2563,0.0473],["Dec23",57.8957,0.12022],["Dec23",113.7599,0.27935],["Dec23",135.3291,0.24318],["Dec23",106.5054,0.19912],["Dec23",82.9943,0.12071],["Jan24",93.477,0.29096],["Jan24",86.9563,0.10284],["Jan24",74.7579,0.07894],["Jan24",73.6538,0.0624],["Feb24",73.0052,0.08797],["Feb24",88.118,0.09467],["Feb24",82.6536,0.05691],["Feb24",133.1805,0.25092],["Mar24",224.256,0.36179],["Mar24",217.6145,0.1937],["Mar24",169.3234,0.11443],["Mar24",190.0693,0.09439],["Mar24",172.7941,0.05498],["Apr24",152.8815,0.06967],["Apr24",113.2543,0.07188],["Apr24",174.2504,0.18974],["Apr24",183.4885,0.15428],["May24",175.8572,0.08751],["May24",175.5273,0.1041],["May24",232.8569,0.20022],["May24",262.356,0.15536],["Jun24",227.6445,0.117],["Jun24",193.623,0.10048],["Jun24",158.7881,0.08219],["Jun24",162.3957,0.08911],["Jun24",168.5646,0.12515],["Jul24",175.1191,0.12467],["Jul24",213.1312,0.12561],["Jul24",220.4924,0.09731],["Jul24",189.4953,0.07334],["Aug24",152.3365,0.12607],["Aug24",144.0453,0.05667],["Aug24",146.1936,0.06072],["Aug24",142.3164,0.04895],["Sep24",125.6542,0.04911],["Sep24",130.2475,0.04572],["Sep24",131.1277,0.04867],["Sep24",152.5081,0.0883],["Sep24",168.3019,0.16441],["Oct24",160.8848,0.07555],["Oct24",175.0737,0.09357],["Oct24",171.0294,0.07067],["Oct24",157.103,0.05189],["Nov24",157.6242,0.09043],["Nov24",279.6085,0.38761],["Nov24",402.3105,0.30969],["Nov24",369.2295,0.12863],["Dec24",361.9479,0.11683],["Dec24",324.2681,0.10216],["Dec24",277.5999,0.12651],["Dec24",267.8131,0.06434],["Dec24",268.6077,0.06018],["Jan25",254.1426,0.05413],["Jan25",246.8606,0.08181],["Jan25",261.6752,0.17761],["Jan25",207.7299,0.08049],["Feb25",152.3148,0.09894],["Feb25",150.9995,0.05739],["Feb25",137.07,0.04438],["Feb25",116.7246,0.06431],["Mar25",107.1242,0.07763],["Mar25",89.2166,0.06422],["Mar25",96.7948,0.06699],["Mar25",112.8415,0.0792],["Mar25",96.4678,0.07127],["Apr25",94.3407,0.08295],["Apr25",103.3222,0.06287],["Apr25",131.8159,0.12562],["Apr25",161.4666,0.10981],["May25",161.0009,0.10878],["May25",181.9896,0.12652],["May25",177.1056,0.10927],["May25",162.1549,0.08234],["Jun25",136.1038,0.07003],["Jun25",137.1688,0.07968],["Jun25",120.1392,0.06164],["Jun25",115.7502,0.06539],["Jun25",136.0953,0.11198],["Jul25",193.4654,0.30924],["Jul25",270.4948,0.31067],["Jul25",294.0748,0.23514],["Jul25",242.5081,0.19154],["Aug25",219.9385,0.10372],["Aug25",215.6289,0.15347],["Aug25",192.8091,0.08168],["Aug25",182.8685,0.1052],["Aug25",174.0465,0.08352],["Sep25",202.2652,0.12538],["Sep25",205.9994,0.10155],["Sep25",171.5611,0.07833],["Sep25",170.6088,0.0984],["Oct25",154.6945,0.17735],["Oct25",129.1408,0.12631],["Oct25",124.2187,0.08077],["Oct25",122.1102,0.07968],["Nov25",110.0011,0.08332],["Nov25",109.1492,0.0575],["Nov25",88.3763,0.06864],["Nov25",88.2066,0.05488],["Nov25",85.8639,0.0457],["Dec25",86.1203,0.05725],["Dec25",76.2489,0.05135],["Dec25",72.4614,0.02759],["Dec25",78.44,0.04534],["Jan26",109.6962,0.15588],["Jan26",103.4238,0.06666],["Jan26",88.4406,0.04131],["Jan26",80.2625,0.04609],["Feb26",65.1051,0.0796],["Feb26",60.5724,0.04169],["Feb26",61.6479,0.03228],["Feb26",58.3148,0.03932],["Mar26",57.6388,0.03511],["Mar26",57.4837,0.03667],["Mar26",59.7813,0.0599],["Mar26",57.1847,0.03141],["Mar26",55.5584,0.02447],["Apr26",56.636,0.03682],["Apr26",58.9297,0.04835],["Apr26",59.9673,0.03322],["Apr26",60.2385,0.02404],["May26",64.8403,0.04502],["May26",67.5258,0.03866],["May26",58.5364,0.02309]]},
  pepe:{name:"PEPE",span:"Aug23 to May26",weeks:145,w:[["Aug23",1.0,0.11799],["Aug23",0.8061,0.22434],["Aug23",0.7231,0.0989],["Sep23",0.6642,0.09809],["Sep23",0.5942,0.08264],["Sep23",0.6269,0.15063],["Sep23",0.6926,0.15061],["Oct23",0.6239,0.08852],["Oct23",0.589,0.11024],["Oct23",0.75,0.33136],["Oct23",1.0714,0.26311],["Nov23",1.0353,0.16822],["Nov23",1.1363,0.26152],["Nov23",1.0287,0.14179],["Nov23",1.0015,0.09684],["Nov23",1.1735,0.27828],["Dec23",1.3599,0.19794],["Dec23",1.2159,0.12903],["Dec23",1.2873,0.17755],["Dec23",1.1995,0.11803],["Jan24",1.098,0.14702],["Jan24",1.1314,0.14771],["Jan24",1.0015,0.09188],["Jan24",0.9452,0.09693],["Feb24",0.835,0.10811],["Feb24",0.9621,0.15514],["Feb24",1.0925,0.16374],["Feb24",1.6448,0.51506],["Feb24",4.8883,0.80224],["Mar24",7.7387,0.38779],["Mar24",7.283,0.41114],["Mar24",7.058,0.19631],["Mar24",7.1151,0.19781],["Apr24",6.4619,0.12357],["Apr24",5.1029,0.30754],["Apr24",5.692,0.25304],["Apr24",6.5809,0.22327],["May24",7.4256,0.21637],["May24",8.4761,0.25087],["May24",10.0452,0.20704],["May24",13.963,0.2186],["May24",13.3445,0.15104],["Jun24",11.7231,0.14912],["Jun24",10.5304,0.13162],["Jun24",10.5684,0.11385],["Jun24",10.4225,0.08225],["Jul24",8.2643,0.18692],["Jul24",9.2204,0.17557],["Jul24",11.1507,0.13578],["Jul24",10.588,0.09661],["Aug24",7.6531,0.26115],["Aug24",7.5237,0.14572],["Aug24",6.8723,0.12369],["Aug24",7.758,0.1457],["Aug24",6.8228,0.0918],["Sep24",6.4613,0.09965],["Sep24",6.818,0.0877],["Sep24",7.5096,0.12793],["Sep24",9.379,0.2121],["Oct24",8.5912,0.15973],["Oct24",9.1406,0.14179],["Oct24",9.3092,0.09311],["Oct24",8.5139,0.09695],["Oct24",7.9692,0.11656],["Nov24",12.0993,0.41115],["Nov24",18.8853,0.36557],["Nov24",18.1098,0.20454],["Nov24",18.9035,0.17281],["Dec24",22.0653,0.29647],["Dec24",20.9558,0.11065],["Dec24",16.4356,0.1687],["Dec24",16.8237,0.10373],["Jan25",18.3436,0.08847],["Jan25",16.1136,0.07644],["Jan25",15.5766,0.16751],["Jan25",12.5355,0.11859],["Jan25",10.5335,0.20311],["Feb25",8.643,0.13888],["Feb25",8.8833,0.10052],["Feb25",8.0911,0.12637],["Feb25",6.9984,0.16151],["Mar25",5.9051,0.1668],["Mar25",6.4396,0.16596],["Mar25",6.971,0.12369],["Mar25",6.8021,0.13918],["Apr25",6.0654,0.20158],["Apr25",6.4797,0.13011],["Apr25",7.1464,0.11861],["Apr25",8.1312,0.11024],["May25",7.5299,0.08944],["May25",12.0692,0.28497],["May25",11.8865,0.18715],["May25",12.7593,0.18315],["May25",11.0797,0.14836],["Jun25",10.8099,0.14211],["Jun25",9.8848,0.14512],["Jun25",8.7885,0.13046],["Jun25",8.7595,0.08719],["Jul25",9.2013,0.1027],["Jul25",11.4212,0.18358],["Jul25",12.3585,0.16832],["Jul25",11.0428,0.09678],["Jul25",9.5284,0.07711],["Aug25",10.8149,0.10959],["Aug25",9.8505,0.08588],["Aug25",9.6189,0.10087],["Aug25",8.917,0.06169],["Sep25",9.0971,0.05706],["Sep25",10.2647,0.10759],["Sep25",9.3888,0.06935],["Sep25",8.5319,0.05886],["Oct25",9.0,0.07756],["Oct25",6.8765,0.15405],["Oct25",6.2522,0.08346],["Oct25",6.4747,0.05979],["Oct25",5.6488,0.08605],["Nov25",5.4217,0.06304],["Nov25",4.4923,0.09044],["Nov25",3.9968,0.10778],["Nov25",4.1548,0.08015],["Dec25",4.2207,0.0864],["Dec25",3.8411,0.07055],["Dec25",3.6217,0.06502],["Dec25",3.7075,0.03527],["Jan26",5.782,0.18661],["Jan26",5.5221,0.10456],["Jan26",5.0183,0.07715],["Jan26",4.5117,0.05887],["Jan26",3.9339,0.09817],["Feb26",3.3845,0.1028],["Feb26",3.8809,0.10341],["Feb26",3.7359,0.07009],["Feb26",3.2849,0.10587],["Mar26",3.0184,0.08311],["Mar26",3.217,0.12991],["Mar26",3.1216,0.07429],["Mar26",3.0365,0.06011],["Apr26",3.1474,0.08166],["Apr26",3.2872,0.07972],["Apr26",3.4773,0.11416],["Apr26",3.5195,0.07261],["Apr26",3.6423,0.07136],["May26",3.8585,0.06687],["May26",3.4447,0.04311],["May26",3.3557,0.04153]]},
  shib:{name:"SHIB",span:"May21 to May26",weeks:262,w:[["May21",1.0,0.2631],["May21",0.7266,0.16647],["May21",0.7314,0.10619],["Jun21",0.5869,0.07966],["Jun21",0.6316,0.13075],["Jun21",0.5718,0.11471],["Jun21",0.6912,0.07794],["Jul21",0.6795,0.05022],["Jul21",0.5857,0.03395],["Jul21",0.5249,0.03645],["Jul21",0.5165,0.03427],["Aug21",0.5304,0.04021],["Aug21",0.6346,0.08178],["Aug21",0.6869,0.07065],["Aug21",0.6218,0.03609],["Aug21",0.5792,0.03205],["Sep21",0.5673,0.09694],["Sep21",0.6066,0.11235],["Sep21",0.6026,0.06704],["Sep21",0.5956,0.03202],["Oct21",1.6872,0.67011],["Oct21",2.2573,0.20707],["Oct21",2.3683,0.11529],["Oct21",5.0251,0.44508],["Oct21",5.595,0.20427],["Nov21",4.8671,0.09593],["Nov21",4.4078,0.08623],["Nov21",3.7037,0.10012],["Nov21",3.8079,0.12596],["Dec21",3.2186,0.05531],["Dec21",3.0045,0.04234],["Dec21",3.1269,0.0541],["Dec21",3.1869,0.03832],["Jan22",2.8066,0.03539],["Jan22",2.6598,0.04474],["Jan22",2.3748,0.05175],["Jan22",1.9321,0.06539],["Jan22",1.9359,0.02808],["Feb22",2.7484,0.10202],["Feb22",2.6567,0.05104],["Feb22",2.2273,0.06798],["Feb22",2.2592,0.04295],["Mar22",2.0651,0.02617],["Mar22",2.0179,0.03111],["Mar22",2.1553,0.03757],["Mar22",2.3839,0.05924],["Apr22",2.29,0.03524],["Apr22",2.293,0.0628],["Apr22",2.2306,0.02414],["Apr22",2.06,0.03511],["May22",1.8531,0.03343],["May22",1.2536,0.12269],["May22",1.0857,0.03276],["May22",1.0156,0.02856],["May22",1.0217,0.02974],["Jun22",0.9822,0.02135],["Jun22",0.794,0.04702],["Jun22",0.9619,0.07026],["Jun22",1.0037,0.03857],["Jul22",1.0452,0.02735],["Jul22",1.0307,0.02286],["Jul22",1.1379,0.03926],["Jul22",1.111,0.02934],["Jul22",1.1521,0.02352],["Aug22",1.1948,0.02375],["Aug22",1.4192,0.08355],["Aug22",1.2661,0.02937],["Aug22",1.182,0.01818],["Sep22",1.2192,0.03265],["Sep22",1.1807,0.02549],["Sep22",1.048,0.02896],["Sep22",1.0791,0.01943],["Oct22",1.0857,0.01588],["Oct22",1.0032,0.01906],["Oct22",0.9777,0.01312],["Oct22",1.0557,0.06146],["Oct22",1.186,0.06769],["Nov22",0.9967,0.05194],["Nov22",0.8816,0.01851],["Nov22",0.8612,0.01677],["Nov22",0.8928,0.01582],["Dec22",0.8973,0.01096],["Dec22",0.8505,0.01487],["Dec22",0.8072,0.01561],["Dec22",0.7885,0.00965],["Jan23",0.8032,0.01324],["Jan23",0.9091,0.03905],["Jan23",1.0878,0.05561],["Jan23",1.1345,0.02481],["Jan23",1.2037,0.04903],["Feb23",1.3079,0.04528],["Feb23",1.2581,0.03255],["Feb23",1.2598,0.02821],["Feb23",1.1644,0.0169],["Mar23",1.0378,0.02899],["Mar23",1.0514,0.03413],["Mar23",1.0384,0.02199],["Mar23",1.0352,0.0179],["Apr23",1.0695,0.0226],["Apr23",1.0794,0.01554],["Apr23",1.0608,0.02205],["Apr23",0.9957,0.00991],["Apr23",0.9629,0.01073],["May23",0.8664,0.01412],["May23",0.8478,0.00859],["May23",0.8362,0.01051],["May23",0.8358,0.00911],["Jun23",0.7665,0.01792],["Jun23",0.6532,0.01226],["Jun23",0.7312,0.02228],["Jun23",0.7303,0.01406],["Jul23",0.7293,0.01338],["Jul23",0.7518,0.01836],["Jul23",0.7535,0.01119],["Jul23",0.7721,0.01498],["Jul23",0.8337,0.03112],["Aug23",0.9479,0.04222],["Aug23",0.8969,0.04269],["Aug23",0.7888,0.01919],["Aug23",0.7815,0.0135],["Sep23",0.7378,0.00825],["Sep23",0.7064,0.0097],["Sep23",0.7105,0.00926],["Sep23",0.7058,0.00764],["Oct23",0.7053,0.00882],["Oct23",0.6711,0.00857],["Oct23",0.6724,0.01027],["Oct23",0.7377,0.02317],["Oct23",0.7658,0.01591],["Nov23",0.8143,0.03183],["Nov23",0.8362,0.02642],["Nov23",0.7994,0.01586],["Nov23",0.8055,0.01502],["Dec23",0.9321,0.0465],["Dec23",0.9738,0.03041],["Dec23",1.016,0.02887],["Dec23",1.033,0.0165],["Dec23",0.976,0.01767],["Jan24",0.9391,0.02332],["Jan24",0.9206,0.01322],["Jan24",0.8717,0.01172],["Jan24",0.8773,0.00935],["Feb24",0.8817,0.0101],["Feb24",0.9358,0.0161],["Feb24",0.9359,0.01653],["Feb24",1.3052,0.12461],["Mar24",3.1576,0.26122],["Mar24",3.0118,0.08365],["Mar24",2.6225,0.07629],["Mar24",2.9107,0.05551],["Mar24",2.688,0.02918],["Apr24",2.5733,0.037],["Apr24",2.2329,0.04071],["Apr24",2.509,0.03601],["Apr24",2.2958,0.03496],["May24",2.2492,0.01984],["May24",2.3277,0.02909],["May24",2.4175,0.0269],["May24",2.4993,0.03673],["Jun24",2.3756,0.02449],["Jun24",2.1092,0.03107],["Jun24",1.8035,0.02027],["Jun24",1.6702,0.01497],["Jun24",1.5908,0.01999],["Jul24",1.5818,0.01942],["Jul24",1.7725,0.03634],["Jul24",1.6604,0.01837],["Jul24",1.5284,0.01329],["Aug24",1.3212,0.02926],["Aug24",1.31,0.01126],["Aug24",1.3741,0.01257],["Aug24",1.3753,0.01309],["Sep24",1.2776,0.01035],["Sep24",1.3099,0.00879],["Sep24",1.341,0.0119],["Sep24",1.6274,0.04153],["Sep24",1.6656,0.03714],["Oct24",1.6891,0.02315],["Oct24",1.7847,0.02683],["Oct24",1.7249,0.01588],["Oct24",1.7413,0.02213],["Nov24",1.7872,0.03403],["Nov24",2.4866,0.16519],["Nov24",2.4103,0.06253],["Nov24",2.4775,0.04269],["Dec24",2.9813,0.10714],["Dec24",2.7629,0.04748],["Dec24",2.3707,0.03695],["Dec24",2.1518,0.01735],["Dec24",2.1691,0.01599],["Jan25",2.1589,0.01775],["Jan25",2.1582,0.02481],["Jan25",1.9612,0.03165],["Jan25",1.7932,0.01701],["Feb25",1.5142,0.03729],["Feb25",1.5695,0.01613],["Feb25",1.503,0.01076],["Feb25",1.3777,0.01844],["Mar25",1.2969,0.02061],["Mar25",1.1791,0.01801],["Mar25",1.2424,0.0124],["Mar25",1.3052,0.01769],["Mar25",1.1946,0.01504],["Apr25",1.1297,0.02033],["Apr25",1.1622,0.00986],["Apr25",1.2977,0.01503],["Apr25",1.2967,0.01135],["May25",1.3428,0.01944],["May25",1.4839,0.02807],["May25",1.4255,0.01919],["May25",1.3448,0.01539],["Jun25",1.2347,0.01057],["Jun25",1.2214,0.01354],["Jun25",1.1203,0.00973],["Jun25",1.1007,0.01145],["Jun25",1.122,0.00882],["Jul25",1.2107,0.01555],["Jul25",1.3654,0.0268],["Jul25",1.4111,0.02438],["Jul25",1.242,0.015],["Aug25",1.2314,0.01233],["Aug25",1.2829,0.01735],["Aug25",1.2383,0.01368],["Aug25",1.2079,0.01479],["Aug25",1.1899,0.01007],["Sep25",1.2825,0.0174],["Sep25",1.2809,0.01254],["Sep25",1.1688,0.01258],["Sep25",1.1882,0.01056],["Oct25",1.131,0.02177],["Oct25",1.004,0.01749],["Oct25",0.9791,0.00976],["Oct25",0.9847,0.01057],["Nov25",0.918,0.01429],["Nov25",0.9223,0.01003],["Nov25",0.8133,0.01329],["Nov25",0.8243,0.00963],["Nov25",0.8204,0.01064],["Dec25",0.821,0.00847],["Dec25",0.7378,0.00996],["Dec25",0.6967,0.00741],["Dec25",0.7227,0.01003],["Jan26",0.8611,0.01666],["Jan26",0.8294,0.00838],["Jan26",0.768,0.00771],["Jan26",0.7215,0.01102],["Feb26",0.6245,0.02196],["Feb26",0.6025,0.01255],["Feb26",0.6214,0.01029],["Feb26",0.5793,0.01135],["Mar26",0.5326,0.01255],["Mar26",0.5511,0.01346],["Mar26",0.577,0.01435],["Mar26",0.5763,0.01067],["Mar26",0.5736,0.00824],["Apr26",0.5771,0.00943],["Apr26",0.5839,0.01043],["Apr26",0.5896,0.00658],["Apr26",0.6005,0.0092],["May26",0.6113,0.01002],["May26",0.6123,0.01076],["May26",0.5549,0.00736]]},
  doge:{name:"DOGE",span:"Jan14 to May26",weeks:644,w:[["Jan14",1.0,0.0],["Jan14",0.834,1e-05],["Feb14",0.8006,2e-05],["Feb14",0.8273,2e-05],["Feb14",0.6442,2e-05],["Feb14",0.6112,3e-05],["Mar14",0.5068,5e-05],["Mar14",0.4703,2e-05],["Mar14",0.3867,3e-05],["Mar14",0.3007,5e-05],["Apr14",0.2639,4e-05],["Apr14",0.2717,5e-05],["Apr14",0.3489,4e-05],["Apr14",0.2896,7e-05],["May14",0.2742,4e-05],["May14",0.2664,4e-05],["May14",0.261,5e-05],["May14",0.2326,0.00013],["May14",0.2168,6e-05],["Jun14",0.2142,7e-05],["Jun14",0.2104,6e-05],["Jun14",0.1856,5e-05],["Jun14",0.154,6e-05],["Jul14",0.1395,7e-05],["Jul14",0.1497,5e-05],["Jul14",0.1399,4e-05],["Jul14",0.1201,3e-05],["Jul14",0.1144,4e-05],["Aug14",0.093,0.00021],["Aug14",0.0725,6e-05],["Aug14",0.0737,7e-05],["Aug14",0.076,0.00017],["Sep14",0.1045,0.00098],["Sep14",0.1575,0.00046],["Sep14",0.1748,0.00031],["Sep14",0.2273,0.00028],["Oct14",0.173,0.00024],["Oct14",0.1601,0.0002],["Oct14",0.1394,0.00028],["Oct14",0.1403,0.00029],["Oct14",0.1253,0.00027],["Nov14",0.126,0.00035],["Nov14",0.1303,0.00025],["Nov14",0.1311,0.00037],["Nov14",0.1389,0.0005],["Dec14",0.128,0.00054],["Dec14",0.11,0.00044],["Dec14",0.1101,0.00042],["Dec14",0.1057,0.00038],["Jan15",0.0983,0.00038],["Jan15",0.0872,0.00048],["Jan15",0.0821,0.00066],["Jan15",0.0913,0.00047],["Jan15",0.0823,0.00051],["Feb15",0.0814,0.0003],["Feb15",0.0833,0.00021],["Feb15",0.0826,0.00025],["Feb15",0.0839,0.00037],["Mar15",0.0816,0.00034],["Mar15",0.0805,0.0003],["Mar15",0.0754,0.00035],["Mar15",0.0733,0.00023],["Apr15",0.072,0.00024],["Apr15",0.0638,0.00023],["Apr15",0.0616,0.00021],["Apr15",0.0591,0.00031],["Apr15",0.0536,0.00031],["May15",0.0546,0.00034],["May15",0.0683,0.00025],["May15",0.0828,0.00038],["May15",0.0927,0.00063],["Jun15",0.0888,0.00027],["Jun15",0.0978,0.00038],["Jun15",0.1126,0.00043],["Jun15",0.1098,0.00038],["Jul15",0.1094,0.00037],["Jul15",0.1134,0.00053],["Jul15",0.1022,0.00028],["Jul15",0.1077,0.00021],["Jul15",0.103,0.00023],["Aug15",0.0951,0.00023],["Aug15",0.0841,0.00028],["Aug15",0.0791,0.00023],["Aug15",0.0744,0.0002],["Sep15",0.0738,0.00028],["Sep15",0.0719,0.00019],["Sep15",0.0722,0.00034],["Sep15",0.0702,0.00032],["Oct15",0.0694,0.00024],["Oct15",0.0685,0.00027],["Oct15",0.0678,0.00037],["Oct15",0.0669,0.00036],["Oct15",0.0795,0.00087],["Nov15",0.0752,0.00084],["Nov15",0.0743,0.00047],["Nov15",0.0739,0.00043],["Nov15",0.0736,0.00086],["Dec15",0.0731,0.00179],["Dec15",0.0777,0.00184],["Dec15",0.0779,0.00189],["Dec15",0.0789,0.00199],["Dec15",0.0785,0.00102],["Jan16",0.0968,0.00365],["Jan16",0.0895,0.00146],["Jan16",0.1385,0.00749],["Jan16",0.1606,0.00954],["Feb16",0.1658,0.00368],["Feb16",0.1642,0.00277],["Feb16",0.1616,0.00104],["Feb16",0.1449,0.00138],["Mar16",0.1302,0.00182],["Mar16",0.1362,0.00247],["Mar16",0.1236,0.00185],["Mar16",0.128,0.00666],["Mar16",0.1275,0.00269],["Apr16",0.1242,0.00316],["Apr16",0.132,0.00145],["Apr16",0.1318,0.00127],["Apr16",0.1316,0.00097],["May16",0.1285,0.00094],["May16",0.1332,0.00137],["May16",0.1289,0.00089],["May16",0.1301,0.0016],["Jun16",0.137,0.00085],["Jun16",0.1612,0.00265],["Jun16",0.18,0.00243],["Jun16",0.1669,0.00175],["Jun16",0.1699,0.00148],["Jul16",0.1562,0.00149],["Jul16",0.1482,0.00151],["Jul16",0.139,0.00334],["Jul16",0.1299,0.00148],["Aug16",0.1369,0.01095],["Aug16",0.1409,0.00718],["Aug16",0.1344,0.00563],["Aug16",0.1301,0.00256],["Sep16",0.1303,0.00267],["Sep16",0.1326,0.00159],["Sep16",0.1365,0.00704],["Sep16",0.1312,0.0026],["Sep16",0.1331,0.00193],["Oct16",0.1313,0.00309],["Oct16",0.1284,0.00106],["Oct16",0.126,0.00093],["Oct16",0.1269,0.00217],["Nov16",0.1312,0.00241],["Nov16",0.1279,0.00163],["Nov16",0.1246,0.00083],["Nov16",0.1244,0.0005],["Dec16",0.123,0.00085],["Dec16",0.1254,0.00109],["Dec16",0.1253,0.00103],["Dec16",0.1312,0.00242],["Dec16",0.1302,0.00226],["Jan17",0.1286,0.004],["Jan17",0.1223,0.00152],["Jan17",0.1202,0.00107],["Jan17",0.1205,0.00173],["Feb17",0.1213,0.0014],["Feb17",0.1196,0.00174],["Feb17",0.1201,0.00205],["Feb17",0.1189,0.00133],["Mar17",0.1213,0.00195],["Mar17",0.1284,0.0061],["Mar17",0.131,0.0064],["Mar17",0.1531,0.01719],["Mar17",0.2296,0.0394],["Apr17",0.2358,0.01601],["Apr17",0.2533,0.01268],["Apr17",0.2862,0.01224],["Apr17",0.3969,0.03235],["May17",0.6471,0.06454],["May17",0.6727,0.03034],["May17",1.4465,0.10588],["May17",1.464,0.05036],["Jun17",1.8761,0.05118],["Jun17",1.8654,0.02237],["Jun17",1.744,0.01158],["Jun17",1.5898,0.0144],["Jun17",1.438,0.00912],["Jul17",1.2479,0.01422],["Jul17",0.9198,0.01181],["Jul17",1.1045,0.00781],["Jul17",1.0063,0.009],["Aug17",1.0986,0.00725],["Aug17",1.0375,0.00979],["Aug17",0.9677,0.00901],["Aug17",1.055,0.01179],["Aug17",1.2354,0.02059],["Sep17",0.9452,0.01186],["Sep17",0.5246,0.03949],["Sep17",0.5579,0.026],["Sep17",0.6157,0.01634],["Oct17",0.5812,0.01101],["Oct17",0.6142,0.02368],["Oct17",0.5986,0.01548],["Oct17",0.6225,0.00867],["Nov17",0.6728,0.0125],["Nov17",0.6932,0.01481],["Nov17",0.8188,0.01234],["Nov17",1.1806,0.0229],["Nov17",1.3208,0.01315],["Dec17",1.6564,0.01965],["Dec17",3.1069,0.0401],["Dec17",4.6844,0.04589],["Dec17",5.0727,0.02007],["Jan18",7.7172,0.04346],["Jan18",5.8735,0.02293],["Jan18",4.2153,0.01386],["Jan18",3.9477,0.00827],["Feb18",2.5352,0.01657],["Feb18",3.0575,0.0116],["Feb18",3.9494,0.01816],["Feb18",3.5825,0.00682],["Mar18",2.9574,0.00851],["Mar18",2.2699,0.00606],["Mar18",1.9823,0.0064],["Mar18",1.9262,0.00396],["Mar18",1.595,0.00406],["Apr18",1.6626,0.0054],["Apr18",2.583,0.01069],["Apr18",3.2283,0.01046],["Apr18",3.1106,0.00655],["May18",2.9769,0.00884],["May18",2.5677,0.00527],["May18",2.3441,0.00386],["May18",1.9502,0.00335],["May18",2.0548,0.00396],["Jun18",1.8897,0.00389],["Jun18",1.6842,0.00291],["Jun18",1.4769,0.00395],["Jun18",1.4549,0.00359],["Jul18",1.4656,0.00264],["Jul18",1.5677,0.00867],["Jul18",2.0524,0.00913],["Jul18",1.8837,0.00456],["Aug18",1.6056,0.004],["Aug18",1.3748,0.00482],["Aug18",1.3817,0.0039],["Aug18",1.4326,0.00439],["Aug18",2.8569,0.0817],["Sep18",3.3955,0.04306],["Sep18",3.5563,0.02385],["Sep18",3.3154,0.01181],["Sep18",3.3681,0.00883],["Oct18",3.2168,0.00763],["Oct18",2.877,0.01129],["Oct18",2.4829,0.01264],["Oct18",2.2469,0.01226],["Nov18",2.1348,0.00896],["Nov18",1.7651,0.01495],["Nov18",1.4528,0.02137],["Nov18",1.2621,0.01355],["Nov18",1.2523,0.0077],["Dec18",1.1892,0.00708],["Dec18",1.3074,0.01294],["Dec18",1.4284,0.01131],["Dec18",1.3529,0.00875],["Jan19",1.3017,0.01089],["Jan19",1.2044,0.00578],["Jan19",1.1845,0.00873],["Jan19",1.1266,0.00834],["Jan19",1.0707,0.00729],["Feb19",1.0761,0.00856],["Feb19",1.135,0.01254],["Feb19",1.1445,0.01021],["Feb19",1.1156,0.00978],["Mar19",1.128,0.0126],["Mar19",1.1734,0.01749],["Mar19",1.1643,0.02415],["Mar19",1.3784,0.08074],["Apr19",1.8881,0.12433],["Apr19",1.6167,0.03005],["Apr19",1.6018,0.03029],["Apr19",1.4149,0.0174],["May19",1.4789,0.02107],["May19",1.6001,0.03725],["May19",1.7305,0.03539],["May19",1.7714,0.02619],["May19",1.8406,0.04032],["Jun19",1.7542,0.01964],["Jun19",1.7798,0.02306],["Jun19",1.8849,0.03414],["Jun19",1.8891,0.04494],["Jul19",2.0052,0.08086],["Jul19",1.758,0.02998],["Jul19",1.7211,0.01875],["Jul19",1.637,0.01431],["Aug19",1.6863,0.02297],["Aug19",1.6493,0.01307],["Aug19",1.541,0.0132],["Aug19",1.5031,0.01038],["Aug19",1.427,0.00855],["Sep19",1.4069,0.00641],["Sep19",1.4345,0.00953],["Sep19",1.4251,0.01029],["Sep19",1.3068,0.01284],["Oct19",1.3343,0.00703],["Oct19",1.3904,0.01926],["Oct19",1.5148,0.02534],["Oct19",1.494,0.0178],["Oct19",1.4828,0.00645],["Nov19",1.5675,0.01586],["Nov19",1.4834,0.00729],["Nov19",1.3286,0.01015],["Nov19",1.3027,0.00961],["Dec19",1.2538,0.00582],["Dec19",1.198,0.00872],["Dec19",1.1662,0.00601],["Dec19",1.1586,0.0049],["Jan20",1.1894,0.00704],["Jan20",1.278,0.00936],["Jan20",1.3831,0.0066],["Jan20",1.3248,0.00561],["Jan20",1.4088,0.01089],["Feb20",1.7216,0.03799],["Feb20",1.6437,0.01908],["Feb20",1.4731,0.0107],["Feb20",1.3504,0.00869],["Mar20",1.3362,0.00889],["Mar20",0.9449,0.02537],["Mar20",1.0336,0.33554],["Mar20",1.0479,0.28286],["Apr20",1.1076,0.27035],["Apr20",1.1296,0.26502],["Apr20",1.1635,0.25613],["Apr20",1.3066,0.23855],["Apr20",1.4368,0.16124],["May20",1.4624,0.01145],["May20",1.462,0.0068],["May20",1.4484,0.00918],["May20",1.4749,0.00968],["Jun20",1.4873,0.00773],["Jun20",1.437,0.00804],["Jun20",1.4205,0.00608],["Jun20",1.3452,0.00539],["Jul20",1.6209,0.10992],["Jul20",2.0481,0.13249],["Jul20",1.8717,0.07557],["Jul20",1.8623,0.03694],["Jul20",1.9769,0.05086],["Aug20",1.9965,0.0333],["Aug20",2.035,0.03436],["Aug20",1.9524,0.03187],["Aug20",1.8741,0.05394],["Sep20",1.624,0.03156],["Sep20",1.6158,0.01926],["Sep20",1.5625,0.02036],["Sep20",1.5403,0.01695],["Oct20",1.5017,0.02028],["Oct20",1.5323,0.01445],["Oct20",1.499,0.01261],["Oct20",1.5284,0.02149],["Oct20",1.4737,0.01218],["Nov20",1.5669,0.02103],["Nov20",1.6435,0.02127],["Nov20",1.992,0.06577],["Nov20",1.9465,0.03072],["Dec20",1.911,0.01358],["Dec20",1.8537,0.01216],["Dec20",2.4164,0.12516],["Dec20",2.6321,0.04384],["Dec20",5.0058,0.34174],["Jan21",5.3511,0.09207],["Jan21",5.3142,0.05393],["Jan21",4.7921,0.02785],["Jan21",20.5303,0.87292],["Feb21",37.7933,0.45691],["Feb21",35.103,0.15798],["Feb21",31.4756,0.18918],["Feb21",28.9257,0.07401],["Mar21",31.132,0.07659],["Mar21",33.3235,0.065],["Mar21",32.3723,0.04023],["Mar21",30.8768,0.03129],["Apr21",34.2005,0.14939],["Apr21",45.0497,0.29414],["Apr21",181.973,0.59724],["Apr21",156.508,0.24083],["Apr21",251.9431,0.23227],["May21",317.1368,0.28008],["May21",278.189,0.18528],["May21",203.6153,0.12265],["May21",195.5033,0.07425],["Jun21",207.6418,0.06864],["Jun21",184.1272,0.02675],["Jun21",145.6068,0.10414],["Jun21",146.2176,0.08264],["Jul21",137.7027,0.02887],["Jul21",120.4429,0.03171],["Jul21",103.6704,0.05363],["Jul21",114.776,0.05405],["Jul21",117.5181,0.02763],["Aug21",138.5951,0.0895],["Aug21",173.6537,0.10921],["Aug21",179.1963,0.0498],["Aug21",162.6437,0.03212],["Sep21",166.5732,0.05675],["Sep21",140.4903,0.02499],["Sep21",130.5475,0.03365],["Sep21",118.7543,0.02197],["Sep21",132.8753,0.05102],["Oct21",135.8603,0.03252],["Oct21",139.0352,0.04366],["Oct21",145.8655,0.06528],["Oct21",160.4581,0.12135],["Nov21",153.2235,0.04268],["Nov21",146.2028,0.02907],["Nov21",130.0147,0.02705],["Nov21",121.4669,0.03542],["Dec21",106.7269,0.04968],["Dec21",99.0987,0.05748],["Dec21",98.5199,0.0233],["Dec21",105.5327,0.02558],["Dec21",97.6859,0.01651],["Jan22",88.4275,0.02786],["Jan22",100.1942,0.06087],["Jan22",82.0655,0.04776],["Jan22",81.2031,0.01535],["Feb22",87.9787,0.02611],["Feb22",85.3761,0.02327],["Feb22",77.6736,0.01879],["Feb22",74.2514,0.02764],["Mar22",70.2028,0.01404],["Mar22",66.0461,0.0139],["Mar22",69.9517,0.01525],["Mar22",80.6199,0.03572],["Mar22",84.7303,0.0675],["Apr22",81.8315,0.04502],["Apr22",82.05,0.02991],["Apr22",80.0866,0.06608],["Apr22",76.3105,0.03165],["May22",66.3401,0.05257],["May22",50.532,0.04164],["May22",48.6025,0.01369],["May22",47.6595,0.02949],["Jun22",46.7591,0.01567],["Jun22",37.7803,0.04129],["Jun22",33.9199,0.04394],["Jun22",39.5619,0.0334],["Jun22",38.676,0.01876],["Jul22",37.8958,0.01494],["Jul22",37.8512,0.02496],["Jul22",38.3054,0.01607],["Jul22",39.3282,0.02285],["Aug22",39.9194,0.01819],["Aug22",44.5694,0.04773],["Aug22",40.0613,0.02773],["Aug22",36.5911,0.01915],["Sep22",35.589,0.01604],["Sep22",36.0518,0.02129],["Sep22",34.0028,0.0167],["Sep22",35.3635,0.02919],["Sep22",35.6646,0.02208],["Oct22",35.3224,0.01321],["Oct22",34.0995,0.0132],["Oct22",35.6645,0.02493],["Oct22",65.4349,0.29649],["Nov22",62.4921,0.12854],["Nov22",49.7126,0.08021],["Nov22",46.5236,0.02788],["Nov22",54.6266,0.06665],["Dec22",57.9956,0.03774],["Dec22",53.8216,0.02461],["Dec22",44.2743,0.0288],["Dec22",43.3666,0.02286],["Dec22",40.6753,0.01973],["Jan23",42.848,0.02522],["Jan23",48.1788,0.04135],["Jan23",49.4137,0.03187],["Jan23",51.7634,0.04024],["Feb23",53.047,0.03093],["Feb23",47.8832,0.03118],["Feb23",50.0281,0.0284],["Feb23",47.0542,0.0163],["Mar23",43.3151,0.01607],["Mar23",40.0629,0.02825],["Mar23",42.8022,0.02779],["Mar23",43.056,0.02066],["Mar23",49.0832,0.07584],["Apr23",48.165,0.03434],["Apr23",51.7215,0.04148],["Apr23",45.9716,0.03511],["Apr23",46.0267,0.01347],["May23",43.7528,0.01523],["May23",41.8047,0.01191],["May23",41.9372,0.00844],["May23",41.6104,0.00836],["Jun23",40.63,0.01269],["Jun23",36.5667,0.01923],["Jun23",36.1257,0.01218],["Jun23",37.862,0.01607],["Jun23",38.7447,0.02332],["Jul23",37.621,0.0099],["Jul23",40.2382,0.03394],["Jul23",42.7864,0.05166],["Jul23",44.6927,0.02201],["Aug23",42.8434,0.01947],["Aug23",42.4311,0.01876],["Aug23",36.2833,0.0214],["Aug23",36.8419,0.0133],["Aug23",36.6151,0.01357],["Sep23",35.7603,0.01158],["Sep23",35.8465,0.01006],["Sep23",35.1395,0.00778],["Sep23",35.7175,0.00955],["Oct23",34.6465,0.00768],["Oct23",34.0115,0.00905],["Oct23",36.5056,0.02203],["Oct23",39.8775,0.0293],["Nov23",41.2728,0.02838],["Nov23",43.4571,0.04629],["Nov23",45.325,0.05996],["Nov23",45.4031,0.02554],["Nov23",51.0043,0.04872],["Dec23",56.119,0.04721],["Dec23",53.8375,0.02624],["Dec23",53.9124,0.0242],["Dec23",51.6269,0.02206],["Jan24",46.8363,0.03224],["Jan24",46.7777,0.02145],["Jan24",46.6995,0.03048],["Jan24",45.8196,0.01762],["Feb24",45.4367,0.01126],["Feb24",47.1592,0.01918],["Feb24",49.4326,0.02786],["Feb24",53.1235,0.04941],["Feb24",86.4262,0.16748],["Mar24",97.8419,0.08283],["Mar24",87.2545,0.09902],["Mar24",98.2703,0.08373],["Mar24",116.6445,0.08717],["Apr24",109.769,0.05487],["Apr24",94.6978,0.09104],["Apr24",90.5575,0.04677],["Apr24",82.3589,0.03516],["May24",86.3998,0.04733],["May24",84.724,0.03546],["May24",91.2026,0.03405],["May24",95.4153,0.03998],["May24",92.0646,0.01836],["Jun24",84.7652,0.02836],["Jun24",75.9608,0.0266],["Jun24",70.9475,0.02092],["Jun24",70.9936,0.01488],["Jul24",61.9061,0.03532],["Jul24",66.9986,0.02278],["Jul24",75.3594,0.03176],["Jul24",73.8606,0.0273],["Aug24",60.0424,0.04896],["Aug24",60.3624,0.02369],["Aug24",58.7947,0.01871],["Aug24",61.3227,0.02271],["Aug24",57.0236,0.01659],["Sep24",56.7785,0.01967],["Sep24",59.4115,0.01766],["Sep24",61.9848,0.02048],["Sep24",67.5733,0.04007],["Oct24",62.4822,0.0217],["Oct24",65.7581,0.02828],["Oct24",80.3692,0.0449],["Oct24",87.2185,0.04663],["Oct24",95.1735,0.08963],["Nov24",166.1357,0.21515],["Nov24",214.7522,0.11585],["Nov24",233.8096,0.11693],["Nov24",243.0507,0.08251],["Dec24",247.6313,0.09714],["Dec24",228.1855,0.0433],["Dec24",186.1679,0.08149],["Dec24",182.1384,0.02571],["Jan25",211.8796,0.04638],["Jan25",198.5186,0.03728],["Jan25",216.8382,0.08458],["Jan25",195.1256,0.03119],["Jan25",167.6234,0.06391],["Feb25",145.4271,0.02739],["Feb25",150.9837,0.02444],["Feb25",132.4499,0.03452],["Feb25",119.8985,0.04555],["Mar25",102.9764,0.04213],["Mar25",98.8135,0.02761],["Mar25",102.3022,0.02657],["Mar25",99.655,0.03298],["Apr25",90.648,0.04944],["Apr25",91.4511,0.02429],["Apr25",93.9755,0.02367],["Apr25",102.9808,0.03265],["May25",100.6992,0.01896],["May25",130.5852,0.05791],["May25",129.3258,0.04171],["May25",131.0505,0.03512],["May25",112.9656,0.02848],["Jun25",107.4326,0.02687],["Jun25",101.2557,0.02622],["Jun25",93.1559,0.0257],["Jun25",94.3382,0.01641],["Jul25",98.049,0.02386],["Jul25",115.1923,0.04464],["Jul25",144.1344,0.08353],["Jul25",132.8525,0.04519],["Jul25",116.5945,0.03567],["Aug25",134.2767,0.04622],["Aug25",129.4554,0.05452],["Aug25",129.3239,0.04821],["Aug25",124.5388,0.02992],["Sep25",132.053,0.03501],["Sep25",158.0307,0.06337],["Sep25",147.4854,0.04167],["Sep25",134.8679,0.03533],["Oct25",147.7237,0.04439],["Oct25",119.4707,0.09024],["Oct25",110.5216,0.04659],["Oct25",113.7424,0.03209],["Oct25",101.9265,0.04353],["Nov25",100.3915,0.03472],["Nov25",91.4681,0.0449],["Nov25",85.2482,0.04368],["Nov25",85.0111,0.02734],["Dec25",82.2491,0.02756],["Dec25",77.1989,0.0258],["Dec25",74.6985,0.02392],["Dec25",70.497,0.02003],["Jan26",83.1383,0.04087],["Jan26",81.6328,0.02674],["Jan26",76.3809,0.02718],["Jan26",71.2263,0.02045],["Jan26",62.407,0.04609],["Feb26",54.5257,0.04656],["Feb26",57.8537,0.03126],["Feb26",55.7659,0.0242],["Feb26",54.2764,0.03948],["Mar26",52.8681,0.03127],["Mar26",56.1647,0.03505],["Mar26",53.9897,0.02214],["Mar26",52.5307,0.02133],["Apr26",53.0167,0.01929],["Apr26",53.6814,0.02095],["Apr26",55.3757,0.02606],["Apr26",57.1821,0.02669],["Apr26",63.3043,0.02631],["May26",63.5884,0.02443],["May26",62.3938,0.02517],["May26",59.7486,0.02044]]},
};

const MONTHS3=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const WPM=52/12;
// WSOL holds whatever the active history is, as a SCALE-FREE multiple. solWalk only ever reads it
// as WSOL[w]/WSOL[start], so SOL's dollar prices and a memecoin's price multiples both work.
// WVM is that asset's real weekly volume as a share of ITS market cap, applied to YOURS.
let WSOL=[], WLABEL=[], WVM=[];
let HIST_KEY='sol';                 // which history drives the run
let USE_REAL_VOL=true;              // use the asset's own volume rather than the flat slider
function buildHistory(key){
  WSOL=[]; WLABEL=[]; WVM=[];
  if(key==='sol'){
    // SOL's series is monthly and gets interpolated to weekly, exactly as before. Unchanged.
    for(let m=0;m<SOLDATA.length-1;m++){
      const a=SOLDATA[m][1], b=SOLDATA[m+1][1], n=Math.round(WPM);
      for(let w=0;w<n;w++){ WSOL.push(a+(b-a)*(w/n)); WLABEL.push(SOLDATA[m][0]); WVM.push(null); }
    }
    WSOL.push(SOLDATA[SOLDATA.length-1][1]); WLABEL.push(SOLDATA[SOLDATA.length-1][0]); WVM.push(null);
  } else {
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
  SOL_START = keep ? Math.max(0,Math.min(keep.start, Math.max(0,NW-8))) : 0;
  const sl=$('solStart'); if(sl){ sl.max=Math.max(1,NW-8); sl.value=SOL_START; }
  run();
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
    p=0.5*p+0.5*(((Math.max(0,tre)+pc)*(1-fee)*(1-slip)+back)/surv);
  }
  return p;
}

function solWalk(m){
  const startW=Math.min(SOL_START,NW-2);
  const lifeW=Math.min(NW-startW, Math.round(m.lifeM*WPM)||NW-startW);
  const sol0=WSOL[startW];
  const dv=m.dv, feeT=m.feeT, feeL=m.feeL, mintPct=m.mintPct, pSh=m.pSh, prem=m.prem;
  // Neither the escrow clawback nor the vested-token burn is a constant any more: escrow falls
  // as the team draws its runway, and the burn falls as the team's tokens vest.
  // NB: these take WEEKS SINCE LAUNCH, not the index `w` into the price history. Passing `w`
  // made a launch late in the series behave as though years had already run.
  const backAt=function(sinceLaunch){ return m.clawableAt(sinceLaunch/WPM); };
  const burnAt=function(sinceLaunch){ return m.vestBurnAt(sinceLaunch/WPM); };
  const mintSet=mintSchedule(SOL_MINTS);
  // size each mint by its own setting, falling back to the Reserve mint default
  const mintPctAt={}; SOL_EV.forEach(function(e){ if(e.type==='mint') mintPctAt[e.w]=e.pct; });
  const redeemAt={};  SOL_EV.forEach(function(e){ if(e.type==='redeem') redeemAt[e.w]=(redeemAt[e.w]||0)+e.tok; });
  const RETAIN=0.0035;   // of the 0.50% redemption fee, this much stays in the treasury
  const redLog=[];
  const wkGrow=Math.pow(1+m.apy, 1/52);   // the reserve asset's own backing growth, per week

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
    const mcap=provisional*supply, weekVol=dvw*mcap*7;
    volSum+=weekVol; feeTsum+=feeT*weekVol; feeLsum+=feeL*weekVol; dexSum+=m.dexYield*weekVol;
    mcSum+=mcap; mcMax=Math.max(mcMax,mcap);
    treasury*=wkGrow;                      // cSOL is worth more SOL than it was last week
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
      const sellPx=provisional*(1+prem), paid=toPublic*sellPx, pairCash=toLP*provisional;
      if(toLP>0){ const pt1=Math.sqrt(k/provisional), pc1=Math.sqrt(k*provisional);
                  k=(pt1+toLP)*(pc1+pairCash); }
      supply+=tok; treasury+=paid-pairCash;
      const first=SOL_MINTS.indexOf(w)>=0;          // log once, on the week it was placed
      if(first) log.push({w,price:provisional,sellPx,tok,toLP,toPublic,paid,pairCash,ratioBefore});
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
    const grossE=Math.max(0,treasury)+pc;
    const eolPer=surv>0?(grossE*(1-m.fee)*(1-m.slip)+backAt(i))/surv:null;
    rows.push({i,w,sol:WSOL[w],raw,p,tethered,supply,treasury,k,poolTok:pt,poolCash:pc,
               surviving:surv, backPer:livePer, eolPer:eolPer,
               red:settleNow, ratio:mcap>0?Math.max(0,treasury)/mcap:0});
  }
  return {rows,log,redLog,startW,lifeW,sol0,
          volSum,feeTsum,feeLsum,dexSum,mcAvg:rows.length?mcSum/rows.length:0,mcMax};
}

function drawSol(m){
  const res=solWalk(m), rows=res.rows, n=rows.length;
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
    : SOLDATA[0][0]+' to '+SOLDATA[SOLDATA.length-1][0]+' \u00b7 '+NW+' weeks \u00b7 flat volume from Trading life';
  if(false){
  }
  $('solStart').max=Math.max(1,NW-8);

  const dpr=window.devicePixelRatio||1, W=cv.clientWidth, H=cv.clientHeight;
  cv.width=W*dpr; cv.height=H*dpr;
  const g=cv.getContext('2d'); g.setTransform(dpr,0,0,dpr,0,0); g.clearRect(0,0,W,H);
  const PAD={l:66,r:14,t:14,b:26};
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

  // the redemption floor, shaded
  g.beginPath();
  rows.forEach(function(r,i){ const y=Y(r.red); i?g.lineTo(X(i),y):g.moveTo(X(i),y); });
  g.lineTo(X(n-1),H-PAD.b); g.lineTo(X(0),H-PAD.b); g.closePath();
  g.fillStyle='rgba(242,186,117,.11)'; g.fill();
  g.strokeStyle='#f2ba75'; g.lineWidth=1.5; g.setLineDash([4,3]); g.beginPath();
  rows.forEach(function(r,i){ const y=Y(r.red); i?g.lineTo(X(i),y):g.moveTo(X(i),y); });
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

  g.fillStyle='#8f8a81';
  g.fillText(WLABEL[res.startW]||'start',PAD.l,H-8);
  g.fillText(WLABEL[res.startW+n-1]||'end',W-PAD.r-52,H-8);
  g.fillStyle='#f4d98f'; g.fillText('token',PAD.l+70,H-8);
  g.fillStyle='#f2ba75'; g.fillText('live redemption',PAD.l+120,H-8);
  g.fillStyle='rgba(246,244,236,.35)'; g.fillText(histName()+'-implied, unfloored',PAD.l+240,H-8);

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
  [['eolPer','#e2c066'],['backPer','#9878fd']].forEach(function(s){
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
  g2.fillStyle='#e2c066'; g2.fillText('redemption \u00b7 EOL',PAD.l+4,H2-8);
  g2.fillStyle='#9878fd'; g2.fillText('redemption \u00b7 live',PAD.l+140,H2-8);

  const last=rows[n-1], peak=rows.reduce(function(a,b){return b.p>a.p?b:a;});
  const teth=rows.filter(function(r){return r.tethered;}).length;
  $('solSum').innerHTML=
    '<div class="s"><div class="k">Launched</div><div class="v">'+(WLABEL[res.startW]||'-')+'</div><div class="n">'+(HIST_KEY==='sol'?'SOL $'+res.sol0.toFixed(2):histName())+' · listing '+px(m.p0)+'</div></div>'+
    '<div class="s"><div class="k">Peak</div><div class="v">'+px(peak.p)+'</div><div class="n">'+(peak.p/m.p0).toFixed(1)+'x listing · '+(WLABEL[peak.w]||'')+'</div></div>'+
    '<div class="s"><div class="k">Ends</div><div class="v">'+px(last.p)+'</div><div class="n">'+(WLABEL[last.w]||'')+' · '+(last.p/m.p0).toFixed(2)+'x'+
      // The Lifetime setting can stop the run before the history runs out. Never let that happen
      // silently: a chart that stops early reads as bad data rather than as a setting.
      (NW-res.startW>n ? '<br><span style="color:var(--gold)">cut at '+m.lifeM+' mo by Lifetime \u00b7 '+
        (NW-res.startW-n)+' more weeks exist</span>' : '')+'</div></div>'+
    '<div class="s"><div class="k">Reserves</div><div class="v">'+money(Math.max(0,last.treasury)+last.poolCash)+'</div><div class="n">'+money(Math.max(0,last.treasury))+' treasury \u00b7 '+money(last.poolCash)+' pool cash</div></div>'+
    '<div class="s lecard"><div class="k">Redemption \u00b7 live</div><div class="v">'+px(last.backPer)+'</div><div class="n">treasury plus your share of the pool</div></div>'+
    '<div class="s lecard lend"><div class="k">Redemption \u00b7 EOL</div><div class="v">'+(last.eolPer!==null?px(last.eolPer):'\u00b7')+'</div><div class="n">'+(last.eolPer!==null?pc(last.eolPer/m.p0)+' of listing, at wind-down':'unreachable')+'</div></div>'+
    '<div class="s"><div class="k">Weeks at redemption</div><div class="v">'+teth+'</div><div class="n">of '+n+' · '+pc(teth/n)+'</div></div>';

  const days=Math.round(n*7);
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
    (m.apy>0?'plus '+(m.apy*100).toFixed(1)+'%/yr of cSOL backing growth, compounded weekly<br>':'')+
    // Escrow is part of what a wind-down returns until the team draws it, so say what it is
    // doing over this run rather than leaving the reader to infer it from the redemption line.
    (m.escrow>0 ? 'escrow: <b>'+money(m.clawableAt(0))+'</b> clawable at launch &rarr; '+
       money(m.clawableAt(n/WPM))+' by the end'+
       (m.erUp>=1 ? ' (drawn in full at listing)'
                  : ' ('+(m.erUp*100).toFixed(0)+'% drawn at listing'+
                    (m.erCliff>0?', '+m.erCliff+' mo cliff':'')+
                    (m.erOver>0?', rest over '+m.erOver+' mo':'')+')')+'<br>' : '')+
    'treasury '+money(m.treasury0)+' &rarr; '+money(last.treasury)+
    (res.log.length?' (fees '+money(res.feeTsum)+' + mints '+money(last.treasury-m.treasury0-res.feeTsum)+')':'')+
    '</div>';
  note+=(SOL_PRICE_MODE==='price'
    ? '<b>'+histName()+' drives the price.</b> The token follows '+histName()+' move for move, so any minted supply lifts '+
      'market cap on top. How much new supply really presses on price cannot be known, so this makes no '+
      'guess at it.'
    : '<b>'+histName()+' drives the market cap.</b> Minted supply is divided into the same market cap, so the price '+
      'falls as supply rises. The buyers\u2019 cash still lands in the treasury.')+
    '<br><br>';
  note+='<b>The token tracks '+histName()+' from the week you launch</b>, and every week it pays fees into the '+
    'treasury and the pool. <b style="color:var(--up)">It cannot trade below that line</b>. That is '+
    'the price at which the market equals redemption, and any lower is free money for an arbitrageur who '+
    'buys and redeems. The earlier simulator let the price fall through it.';
  if(teth) note+=' On this run the token sat at that level for <b>'+teth+' of '+n+' weeks</b>, which is what '+
    'a backed token looks like in a drawdown: it stops falling where the assets are.';
  if(res.log.length){
    note+='<br><br><b>Mints:</b><br>'+res.log.map(function(x,i){
      return 'M'+(i+1)+' '+(WLABEL[x.w]||('week '+x.w))+' at '+px(x.price)+': '+num(x.tok)+' tokens'+
        (x.toLP>0?' ('+num(x.toPublic)+' sold, '+num(x.toLP)+' paired)':'')+', '+money(x.paid)+
        ' in, backing ratio '+pc(x.ratioBefore);
    }).join('<br>');
  }
  if(res.redLog.length){
    note+='<br><br><b>Redemptions:</b><br>'+res.redLog.map(function(x,i){
      return 'R'+(i+1)+' '+(WLABEL[x.w]||('week '+x.w))+' at '+px(x.price)+': '+num(x.tok)+
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
  const burn=m.vestBurnAt(st.i/WPM), back=m.clawableAt(st.i/WPM);
  const surv=st.supply-x-burn;
  const pot=(Math.max(0,st.treasury)+y)*(1-m.fee)*(1-m.slip)+back;
  return { price:price, poolTok:x, poolCash:y, treasury:Math.max(0,st.treasury),
           burn:burn, back:back, surv:surv, pot:pot, per:surv>0?pot/surv:0 };
}

// Where the market meets the END-OF-LIFE redemption value. Solving p = pot(p)/surv(p) with
// u = sqrt(p) turns into a quadratic, so this is exact rather than iterated. Note this is NOT
// the row's own `red`, which is the LIVE floor and excludes the clawback and the burn.
function eolSettlePrice(m,st){
  const F=(1-m.fee)*(1-m.slip);
  const burn=m.vestBurnAt(st.i/WPM), B=m.clawableAt(st.i/WPM);
  const N=st.supply-burn, T=Math.max(0,st.treasury), k=st.k;
  if(N<=0||k<=0) return null;
  const u=(Math.sqrt(k)*(1+F)+Math.sqrt(k*(1+F)*(1+F)+4*N*(T*F+B)))/(2*N);
  return u*u;
}

// What a holder gets redeeming TODAY at `price`: a pro-rata share of the treasury and the
// pool's cash, with pool-held tokens out of the claimant count. No escrow comes back, no team
// tokens burn, and the wind-down fee does not apply, because none of that has happened.
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
    '<div style="font-size:12px;margin-bottom:1px"><b>Week '+(st.i+1)+' of '+R.rows.length+
      ' \u00b7 '+label+assetPx+'</b></div>'+
    '<div style="font-size:10.5px;color:var(--muted);margin-bottom:9px">market price '+px(st.p)+
      '</div>'+
    '<div style="display:flex;gap:16px">'+
      col('Redeem today',here,'var(--bone)')+
      col('If it winds down',settle,'var(--gold-lt)')+
    '</div>'+
    // Two forces pull opposite ways and either can win, so name both rather than guess which
    // one decided it. Holding adds the escrow clawback and the unvested-team burn. Against that,
    // the wind-down happens at the settle price, not today's, and the pool's cash moves with it.
    '<div style="margin-top:9px;font-size:10.5px;color:var(--muted);line-height:1.45">'+
      'Holding adds <b>'+money(settle.back)+'</b> of escrow and burns <b>'+
      num(Math.round(settle.burn))+'</b> unvested team tokens, but settles at '+px(sp)+
      ', not today\u2019s '+px(st.p)+'. '+
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
    p=0.5*p+0.5*(((Math.max(0,st.treasury)+pc)*(1-m.fee)*(1-m.slip)+wa.back)/surv);
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
  const pot=gross*(1-m.fee)*(1-m.slip)+wa.back;
  const per=surv>0?pot/surv:0;
  const ok=surv>0;

  $('eolSrc').innerHTML='measured from <b style="color:var(--gold-lt)">'+ST.label+'</b>';
  $('eolSum').innerHTML=
    '<div class="s"><div class="k">Settles at</div><div class="v">'+(ok?px(sp):'·')+'</div><div class="n">where the market meets redemption</div></div>'+
    '<div class="s"><div class="k">Holder receives</div><div class="v">'+(ok?px(per):'·')+'</div><div class="n">per surviving token, net of the fee and '+(+$('sl').value)+'% conversion</div></div>'+
    '<div class="s"><div class="k">vs listing</div><div class="v">'+(ok?pc(per/m.p0):'·')+'</div><div class="n">listing was '+px(m.p0)+'</div></div>'+
    '<div class="s"><div class="k">Distributed</div><div class="v">'+(ok?money(pot):'·')+'</div><div class="n">'+money(Math.max(0,ST.treasury))+' treasury + '+money(poolCash)+' pool cash</div></div>'+
    '<div class="s"><div class="k">Burnt</div><div class="v">'+(ok?num(burnt):'·')+'</div><div class="n">'+num(poolTok)+' pool + '+num(wa.burn)+' unvested team'+
      (wa.timed?' at '+ST.months.toFixed(0)+' mo':'')+'</div></div>'+
    '<div class="s"><div class="k">Surviving</div><div class="v">'+(ok?num(surv):'·')+'</div><div class="n">'+(ok?pc(surv/ST.supply)+' of supply':'pool exceeds supply')+'</div></div>'+
    '<div class="s"><div class="k">Escrow returned</div><div class="v">'+money(wa.back)+'</div><div class="n">'+
      (wa.timed?'still clawable at '+ST.months.toFixed(0)+' mo':'untaxed, its own leg')+'</div></div>';

  $('eolNote').innerHTML = ok
    ? '<b>This is the one number the whole page is about.</b> A wind-down does not happen at today\u2019s price. '+
      'The moment redemption opens, anyone can buy below it and redeem, or sell above it, so the price '+
      'converges on <b>'+px(sp)+'</b> and every holder is paid <b>'+px(per)+'</b> from there. '+
      'Where the market happens to be when the vote passes changes how far it travels, not where it lands. '+
      '<span style="color:var(--muted2)">Every payout figure on this page is net of the end-of-life fee and '+
      (+$('sl').value)+'% conversion slippage on turning reserves into cash.</span>'
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
        ' Whatever is still undrawn is redeemable.';
    }
    else e=(eu>0?(eu*100).toFixed(0)+'% drawn at listing, the rest drawn evenly to month '+eD+'.'
                :'Drawn evenly from listing to month '+eD+'.')+
           ' Whatever is still undrawn is redeemable.';
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

  // The two creator legs are what reaches reserves. Transmuter's 0.15% and the DAO's 0.05% are
  // fixed, never receive any of the extra, and leave the token, so the holder's total is legs+0.20%.
  if($('feeBad')) $('feeBad').textContent = FEE_CLAMPED
    ? 'Held at the 2.00% ceiling. Lower the other leg to give this one more room.' : '';
  if($('feeTot')) $('feeTot').textContent=((+$('ft').value + +$('fl').value)/100 + 0.30).toFixed(2)+'%';

  $('ftv').textContent=(+$('ft').value/100).toFixed(2)+'%';
  $('flv').textContent=(+$('fl').value/100).toFixed(2)+'%';
  $('gtv').textContent=(+$('gt').value)+'%';
  const m=model();

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
    '<div class="orow"><span class="k">Treasury · the remainder</span><span class="v">'+money(m.treasury0)+'  <span style="opacity:.5">'+pc(m.mcp>0?m.treasury0/m.mcp:0)+' of MCP</span></span></div>';
  $('verdict').className='verdict '+(m.feasible&&m.meetsMin?'ok':'no');

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
    vd='<b>Impossible at any raise.</b> Liquidity at '+pc(m.lpPct)+' plus the '+pc(TREAS_MIN)+
       ' treasury minimum needs '+pc(m.lpPct+TREAS_MIN)+' of market cap, but a '+pc(m.salePct)+
       ' sale only brings in '+pc(m.salePct)+'. Raise the sale share or cut liquidity.';
  } else if(!m.meetsMin){
    const need=m.escrow>0?m.escrow/m.denom:0;
    vd='<b>Treasury below its '+pc(TREAS_MIN)+' minimum.</b> This launch would be rejected. '+
       (m.escrow>0?'Minimum raise here is <b>'+money(need)+'</b>, '+money(need-m.raise)+' more than you have set.'
                  :'With no escrow ask, liquidity alone is taking more than the sale can fund.');
  } else {
    const need=m.escrow>0?m.escrow/m.denom:(m.lpCash+TREAS_MIN*m.mcp);
    const over=m.raise-need;
    vd='A well backed launch. Minimum raise <b>'+money(need)+'</b>'+
       (over>0.5?'. The <b>'+money(over)+'</b> above it splits '+money(m.lpPct*over/m.salePct)+
                 ' into deeper liquidity and '+money(over-m.lpPct*over/m.salePct)+' into treasury.':'.')+
       '<br><b>Because only '+pc(m.salePct)+' of supply is sold</b>, every sold token funds backing for '+
       (1/m.salePct).toFixed(2)+' tokens. Liquidity and the treasury minimum together take '+
       pc((m.lpPct+TREAS_MIN)/m.salePct)+' of the raise before the team sees anything.';
  }
  $('verdict').innerHTML=vd;

  LIVE_FLOOR=liveFloor(m.S,m.k0,m.treasury0,m.p0);   // binding level, used by the cards below
  // "Recovery at listing" and "buyer break-even" are launch-time questions: what somebody who
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
      'It is <b>'+flatPer+'</b> per token, paid pro rata from reserves, '+
      'net of the end-of-life fee and 0.5% conversion slippage.';
  $('heroGrid').innerHTML = (m.raise<=0 || !configOK) ? '' :
    '<div class="hg vio"><div class="k">Redeemable now</div><div class="v">'+
      pc(LIVE_FLOOR/Math.max(m.p0,1e-12))+'</div><div class="n">'+px(LIVE_FLOOR)+
      ' per token, from the first block, no vote</div></div>'+
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
    '<div class="s lecard lend"><div class="k">Redeemable now</div><div class="v">'+pc(LIVE_FLOOR/Math.max(m.p0,1e-12))+'</div><div class="n">'+px(LIVE_FLOOR)+' per token, redeemable from the first block</div></div>'+
    '<div class="s"><div class="k">Buyer break-even</div><div class="v">'+flatPc+'</div><div class="n">what a sale buyer gets back</div></div>';

  if(!m.mintLog.length){
    $('mintState').innerHTML='<div class="hint" style="margin-top:0">No mints. '
      +'<b style="color:var(--gold-lt)">Click any row in the table below</b> to add one at that price. '
      +'Click it again to remove. Up to '+MAX_MINTS+', executed in the order you add them.</div>';
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
          'would land in the pool. At a '+pc(m.prem)+' premium the same buyer pays less '+
          (slip>m.prem?'':'more ')+'and the cash goes to the treasury instead.'
        : 'A purchase this size cannot clear the pool at all, which is the point: the mint is the only '+
          'route to that size.')+
      ' It also stops the mint being sniped at the market price.';
  })();

  // The structural bottom note is out for now. A better line would be the point where selling stops
  // being worth it, which is where the market price drops under the EOL redemption figure.

  var MINT_ROW_PRICES=[];
  const gate=+$('gt').value/100;
  const ST=effState(m);
  let srcTxt='&middot; '+ST.label+' &middot; treasury <b style="color:var(--gold-lt)">'+money(ST.treasury)
    +'</b> &middot; supply '+num(ST.supply)+' &middot; pool '+(ST.k/m.k0).toFixed(2)+'x'
    +(ST.mints?' &middot; '+ST.mints+' mint'+(ST.mints>1?'s':''):'');
  // v1 warned here that a run existed which the tables were not reading. The state now follows
  // whatever was last run, so that condition cannot arise and the warning is gone with it.
  $('srcNote').innerHTML=srcTxt;
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
      const backPer=r.liveRed;          // treasury plus pool cash, over claimants, less the 0.50% fee
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
    const mi=mintSequence().findIndex(function(q){return Math.abs(q-r.price)<1e-9;});
    const isMint=mi>=0;
    if(DETAIL==='simple'){
      // one reserve figure instead of the four-step waterfall, and the burn as a single number
      const mcapAt=r.price*ST.supply;
      const ratio=mcapAt>0&&r.reachable?r.pot/mcapAt:0;   // that reserve against the market cap
      rows+='<tr data-p="'+r.price+'" class="pick '+(isMint?'mintrow ':'')+(isEnd?'endrow ':'')
        +(f===1?'launch':(f>1?'up':''))+(r.reachable?'':' dead')+'">'+
        '<td class="p">'+(isMint?'<b style="color:var(--up)">M'+(mi+1)+'</b> ':'')
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
      '<td class="p">'+(isMint?'<b style="color:var(--up)">M'+(mi+1)+'</b> ':'')
        +(isEnd?'<b style="color:var(--bone)">ended </b>':'')+px(r.price)+'</td>'+
      '<td style="'+(f>1?'color:var(--up)':(f===1?'color:var(--gold);letter-spacing:.1em':''))+'">'
        +(f===1?'LISTING':(f>1?'+'+pc(f-1):'−'+pc(1-f)))+'</td>'+
      '<td>'+(r.reachable?num(r.x):'·')+'</td>'+
      '<td>'+(r.reachable?pc(r.x/ST.supply):'·')+'</td>'+
      '<td>'+(r.reachable?money(r.y):'·')+'</td>'+
      '<td>'+money(Math.max(0,ST.treasury))+'</td>'+
      '<td class="p">'+(r.reachable?money(r.gross):'·')+'</td>'+
      '<td style="color:var(--down)">'+(r.reachable?'−'+money(r.fees).slice(1):'·')+'</td>'+
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
  if(VIEW==='sol'){ $('tabTitle').textContent='Your launch, run against '+histName()+'\u2019s real history';
    SOL_START=+$('solStart').value;
    $('solStartV').textContent=(WLABEL[SOL_START]||'')+(HIST_KEY==='sol'
      ? ' · SOL $'+(WSOL[SOL_START]||0).toFixed(2) : '');
    drawSol(m); renderEol(m,effState(m)); $('read').innerHTML=''; return; }
  if(VIEW==='path'){ $('tabTitle').textContent='Draw the price, watch the reserves follow';
    ['wk','vol','ft','fl'].forEach(function(id){const e=$(id+'v'); if(e)
      e.textContent = (id==='ft'||id==='fl') ? (+$(id).value/100).toFixed(2)+'%' : (+$(id).value)+(id==='vol'?'%':'');});
    drawPath(m); renderEol(m,effState(m)); $('read').innerHTML=''; return; }
  $('rows').innerHTML=rows;
  renderEol(m,ST);
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
      ' per token</b>, after the 0.50% redemption fee. It moves with the price, because the pool\u2019s cash '+
      'leg grows with the square root of the price and its token leg shrinks.<br><br>'+
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

    '<b>Hover any column heading</b> for what it means.'+
    '<br><br><b>Why the listing row is under 100%.</b> Only the sale portion was ever paid for. Team, '+
    'investor and unallocated tokens cost nothing and still hold a claim, so the same money is spread '+
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
  $('evHead').textContent=(WLABEL[w]||('week '+w))+'  \u00b7  '+px(price);
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
    $('evLabel').textContent='Mint, as a % of supply';
    $('evVal').value=(m.mintPct*100).toFixed(1);
    $('evHint').textContent='Sold at market plus the '+pc(m.prem)+' premium'+(MINT_WEEKS>1?', over '+MINT_WEEKS+' weeks':'')+'.';
  }else{
    $('evLabel').textContent='Redeem, in tokens';
    $('evVal').value=Math.round(m.S*0.01);
    $('evHint').textContent='Pro-rata share of the treasury and the pool. Their share of the pooled tokens burns with theirs, so nobody else\u2019s claim moves.';
  }
  $('evVal').focus(); $('evVal').select();
}
$('evMint').onclick=function(){ evPick('mint'); };
$('evRedeem').onclick=function(){ evPick('redeem'); };
$('evBack').onclick=function(){ $('evChoice').style.display='flex'; $('evForm').style.display='none'; };
$('evClose').onclick=function(){ closeEvMenu(); };
$('evAdd').onclick=function(){
  const v=+$('evVal').value;
  if(!(v>0)){ closeEvMenu(); return; }
  if(SOL_MODE){
    SOL_EV=SOL_EV.filter(function(e){ return e.w!==EV_W; });
    if(EV_KIND==='mint'){
      if(SOL_EV.filter(function(e){return e.type==='mint';}).length<MAX_MINTS)
        SOL_EV.push({w:EV_W,type:'mint',pct:Math.min(v,100)/100});
    } else SOL_EV.push({w:EV_W,type:'redeem',tok:v});
    syncSol(); closeEvMenu(); run(); return;
  }
  if(TBL_MODE){
    TBL_EV=TBL_EV.filter(function(e){ return Math.abs(e.price-TBL_PRICE)>1e-9; });
    if(EV_KIND==='mint'){
      if(TBL_EV.filter(function(e){return e.type==='mint';}).length<MAX_MINTS)
        TBL_EV.push({price:TBL_PRICE,type:'mint',pct:Math.min(v,100)/100});
    } else TBL_EV.push({price:TBL_PRICE,type:'redeem',tok:v});
    syncTbl(); closeEvMenu(); run(); return;
  }
  PATH_EV=PATH_EV.filter(function(e){ return e.w!==EV_W; });
  if(EV_KIND==='mint'){
    if(PATH_EV.filter(function(e){return e.type==='mint';}).length>=MAX_MINTS){ closeEvMenu(); return; }
    PATH_EV.push({w:EV_W,type:'mint',pct:Math.min(v,100)/100});
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
