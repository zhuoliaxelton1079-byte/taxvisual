import fs from 'fs';
const src = fs.readFileSync(process.argv[2], 'utf8');
function extract(name){
  const start = src.indexOf('function ' + name + '(');
  if (start < 0) throw new Error('not found: ' + name);
  let i = src.indexOf('{', start), depth = 0, j = i;
  for (; j < src.length; j++){
    if (src[j] === '{') depth++;
    else if (src[j] === '}' && --depth === 0) { j++; break; }
  }
  return src.slice(start, j);
}
const code = 'const MAX_PCT = 0.85;\n' + src.match(/const YEAR_RULES = [\s\S]*?;\n/)[0] +
  ['model','uncapped','curvePoints','marginalAt','lumpSumElection','lumpActive','taxableAt','curveAgi','explorationBreaks','inclusionStory','taxYearChoices','thresholdsFor'].map(extract).join('\n');
const { model, uncapped, curvePoints, lumpSumElection, taxableAt, curveAgi, explorationBreaks, inclusionStory, taxYearChoices, thresholdsFor } =
  new Function(code + '; return {model, uncapped, curvePoints, marginalAt, lumpSumElection, taxableAt, curveAgi, explorationBreaks, inclusionStory, taxYearChoices, thresholdsFor};')();

const S = [
  ['Joint A',  {benefits:12400, agi:36000, lo:32000, up:44000}, 5100,    0.4112903225806452],
  ['Joint B',  {benefits:16000, agi:12000, lo:32000, up:44000}, 0,       0],
  ['Joint C',  {benefits:24496, agi:59618, lo:32000, up:44000}, 20821.6, 0.85],
  ['Single A', {benefits:7200,  agi:16000, lo:25000, up:34000}, 0,       0],
  ['Single B', {benefits:7200,  agi:22000, lo:25000, up:34000}, 300,     0.041666666666666664],
  ['Single C', {benefits:7200,  agi:34000, lo:25000, up:34000}, 6120,    0.85],
];
let fail = 0;
console.log('scenario    taxable    expected    pct      expected   status');
for (const [name, base, expT, expP] of S){
  const r = model(base);
  const ok = Math.abs(r.taxable - expT) < 1e-6 && Math.abs(r.pct - expP) < 1e-12;
  if (!ok) fail++;
  console.log(name.padEnd(10), r.taxable.toFixed(2).padStart(10), expT.toFixed(2).padStart(11),
              r.pct.toFixed(5).padStart(9), expP.toFixed(5).padStart(10), ok ? '  PASS' : ' **FAIL**');
}

// The marker must sit exactly on the drawn line.
console.log('\nmarker sits on the drawn curve:');
for (const [name, base] of S){
  const r = model(base);
  const half = base.benefits/2, xMax = 200000;
  const pts = curvePoints(base.benefits, base.lo, base.up, xMax);
  let y = null;
  for (let k=0;k<pts.length-1;k++){
    const a=pts[k], z=pts[k+1];
    if (r.pi>=a.x && r.pi<=z.x && z.x>a.x){ y = a.y + (z.y-a.y)*(r.pi-a.x)/(z.x-a.x); break; }
  }
  const d = Math.abs(y - r.taxable);
  if (d > 1e-6) fail++;
  console.log('  ' + name.padEnd(10) + 'Δ ' + d.toExponential(1) + (d<1e-6 ? '  PASS' : ' **FAIL**'));
}

// Exploration boundaries must describe changes in the rule, not incidental chart knots.
console.log('\nexplorable pilot:');
function check(name, ok){ if (!ok) fail++; console.log('  '+name+'  '+(ok?'PASS':'**FAIL**')); }
function near(a,b){ return Math.abs(a-b)<1e-6; }
const jointBreaks=explorationBreaks(12400,32000,44000);
check('joint thresholds and fractional 85% cap',jointBreaks.length===3 &&
  [25800,37800,44000+12400-6000/.85-6200].every((v,k)=>near(jointBreaks[k].agi,v)));
const singleBreaks=explorationBreaks(7200,25000,34000);
check('small benefit includes the flat 50% plateau',singleBreaks.length===4 &&
  [21400,28600,30400,34000+7200-3600/.85-3600].every((v,k)=>near(singleBreaks[k].agi,v)));
check('zero benefits have no boundaries',explorationBreaks(0,25000,34000).length===0);
check('negative-domain lower threshold is hidden',explorationBreaks(60000,25000,34000)[0].agi===4000);
check('threshold exactly at zero is retained',explorationBreaks(50000,25000,34000)[0].agi===0);
const base={benefits:12400,agi:36000,lo:32000,up:44000};
check('first guided increase includes $500 more benefits',near(inclusionStory(base).extraBenefits,500));
check('increase crossing upper threshold includes $570, not local slope times $1000',
  near(inclusionStory({...base,agi:37000}).extraBenefits,570));
check('small-benefit plateau is explained',inclusionStory({benefits:7200,agi:29000,lo:25000,up:34000}).zone==='plateau');
const cap=jointBreaks[2].agi;
check('next dollar across fractional cap uses finite change',near(inclusionStory({...base,agi:cap-.25}).nextDollar,.2125));
check('at cap and at zero benefits avoid false marginal inclusion',inclusionStory({...base,agi:cap}).zone==='cap' &&
  inclusionStory({...base,benefits:0}).zone==='empty' && inclusionStory({...base,benefits:0}).nextDollar===0);
check('near input ceiling reports actual $500 increment',inclusionStory({...base,agi:119500}).increment===500);
check('at input ceiling has no next increment',inclusionStory({...base,agi:120000}).increment===0);
// Check every derived transition against the model on both sides, including tiny benefits.
let slopeChecks=true;
for(const [lo,up] of [[25000,34000],[32000,44000]]){
 for(const benefits of [0,.01,1,200,7200,9000,12400,18000,24496,50000,60000]){
  const breaks=explorationBreaks(benefits,lo,up);
  for(const point of breaks){
   const eps=Math.min(.0001,benefits/10000);
   const f=agi=>model({benefits,agi,lo,up}).taxable;
   const before=(f(point.agi)-f(point.agi-eps))/eps;
   const after=(f(point.agi+eps)-f(point.agi))/eps;
   if(Math.abs(before-point.before)>1e-4 || Math.abs(after-point.after)>1e-4) slopeChecks=false;
  }
 }
}
check('all derived transitions match independent model differences',slopeChecks);

// The visible year pair rolls forward, but unreviewed years cannot use another year's rules.
check('2026 exposes reviewed 2025 most-recent and 2026 upcoming',
  JSON.stringify(taxYearChoices(2026))===JSON.stringify([
    {year:2025,label:'most recent',reviewed:true},{year:2026,label:'upcoming',reviewed:true}]));
check('2027 exposes upcoming year as review pending',
  taxYearChoices(2027)[0].year===2026 && taxYearChoices(2027)[1].year===2027 && !taxYearChoices(2027)[1].reviewed);
check('2028 does not silently enable either unreviewed year',taxYearChoices(2028).every(y=>!y.reviewed));
let rejected=false;try{thresholdsFor(2027,'joint');}catch(error){rejected=error instanceof RangeError;}
check('unreviewed rules are rejected',rejected);
check('reviewed years use the enacted single and joint thresholds',[2025,2026].every(year=>{
  const j=thresholdsFor(year,'joint'),s=thresholdsFor(year,'single');
  return j.lo===32000 && j.up===44000 && s.lo===25000 && s.up===34000;
}));
check('both reviewed years reproduce the independent workbook scenarios',[2025,2026].every(year=>S.every(([,base,amount])=>{
  const limits=thresholdsFor(year,base.lo===32000?'joint':'single');
  return near(model({...base,...limits}).taxable,amount);
})));

// Section 86(b)(2) adjustments, separate-return thresholds and the 86(e) election.
console.log('\nadjustments, separate returns and lump sums:');
check('tax-exempt interest and add-backs enter provisional income dollar for dollar',
  near(model({...base,adj:3000}).pi,45200) && near(model({...base,adj:3000}).taxable,model({...base,agi:39000}).taxable));
check('adjustment shifts every boundary left by the same amount',
  explorationBreaks(12400,32000,44000,{adj:2500}).every((p,k)=>near(p.agi,jointBreaks[k].agi-2500)));
check('separate filers who lived apart use the $25,000 / $34,000 thresholds',
  [2025,2026].every(y=>{const t=thresholdsFor(y,'mfsApart');return t.lo===25000&&t.up===34000;}));
const together=thresholdsFor(2025,'mfsTogether');
check('separate filers who lived together have zero thresholds',together.lo===0&&together.up===0);
check('lived together: 85% of provisional income, capped at 85% of benefits',
  near(model({benefits:12000,agi:2000,lo:0,up:0}).taxable,.85*8000) &&
  near(model({benefits:12000,agi:40000,lo:0,up:0}).taxable,10200));
// Pub. 915-style check: $6,000 of a $20,000 benefit belongs to a prior year with
// $10,000 of benefits and $20,000 of other income, single thresholds.
const ls={benefits:20000,agi:30000,lo:25000,up:34000,lump:{portion:6000,priorBenefits:10000,priorIncome:20000}};
const e=lumpSumElection(ls);
check('election: this year without the prior-year portion',near(e.current,model({benefits:14000,agi:30000,lo:25000,up:34000}).taxable));
check('election: prior-year increase is the change in that prior year’s taxable benefits',
  near(e.increase,model({benefits:16000,agi:20000,lo:25000,up:34000}).taxable-model({benefits:10000,agi:20000,lo:25000,up:34000}).taxable));
check('election applies only when it lowers the result',
  near(e.normal,model(ls).taxable) && e.applies===(e.elected<e.normal) && near(taxableAt(ls),Math.min(e.normal,e.elected)));
check('election that would raise the amount is not made',
  (()=>{const x={...ls,lump:{portion:6000,priorBenefits:30000,priorIncome:90000}};const r=lumpSumElection(x);return !r.applies&&near(taxableAt(x),r.normal);})());
let curveOk=true;
for(const lump of [null,ls.lump,{portion:15000,priorBenefits:0,priorIncome:5000}]){
  const i={...ls,lump};const pts=curveAgi(i,120000);
  for(let x=-10000;x<=120000;x+=137.5){
    let y=null;for(let k=0;k<pts.length-1;k++){const a=pts[k],z=pts[k+1];if(x>=a.x&&x<=z.x){y=a.y+(z.y-a.y)*(x-a.x)/(z.x-a.x);break;}}
    if(y!==null&&Math.abs(y-taxableAt({...i,agi:x}))>1e-6) curveOk=false;
  }
}
check('drawn curve matches the model everywhere, with and without an election',curveOk);

console.log(fail === 0 ? '\nALL CHECKS PASS' : `\n${fail} FAILURE(S)`);
process.exit(fail ? 1 : 0);
