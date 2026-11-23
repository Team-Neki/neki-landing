// Geometry/state checks only. Visual continuity still needs browser review.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
function style() { return { setProperty(k,v){ this[k]=v; }, removeProperty(k){ delete this[k]; } }; }
const flags = new Set();
const app = {style:style(),classList:{add:k=>flags.add(k),remove:k=>flags.delete(k)}};
const source = {top:400,left:500,width:250,height:541};
const target = {top:1200,left:100,width:290,height:628};
const flow = {style:style(),getBoundingClientRect:()=>source};
const slot = {getBoundingClientRect:()=>target};
const visual = {clientHeight:780};
const listeners = {};
const mq = {matches:true,addEventListener:(event,fn)=>listeners.mq=fn};
const root = {style:style()};
const sourceCode = fs.readFileSync('js/main.js','utf8');
const start = sourceCode.indexOf("  var poseSlot = $('[data-pose-slot]');");
const end = sourceCode.indexOf('  // 9) 아카이빙',start);
vm.runInNewContext(sourceCode.slice(start,end),{
  $:selector=>selector==='[data-pose-slot]'?slot:selector==='[data-stage="map"]'?visual:null,app,flow,root,reduce:false,wideMQ:mq,innerHeight:900,
  getComputedStyle:()=>({paddingTop:'150',top:'100'}),
  addEventListener:(event,fn)=>listeners[event]=fn,requestAnimationFrame:fn=>fn(),Math,parseFloat
});
assert.equal(flags.has('is-handoff'),false);
source.top=-300;target.top=500;listeners.scroll();
assert.equal(flags.has('is-handoff'),true);
assert.equal(flow.style.opacity,'0');
assert.ok(parseFloat(app.style.width)>250 && parseFloat(app.style.width)<290);
assert.ok(Number(app.style['--map-cover'])>=0 && Number(app.style['--map-cover'])<=1);
source.top=-800;target.top=0;listeners.scroll();
assert.equal(flags.has('is-handoff'),false);
assert.equal(app.style.width,undefined);
source.top=-300;target.top=500;listeners.scroll();
assert.equal(flags.has('is-handoff'),true);
mq.matches=false;listeners.mq();
assert.equal(flags.has('is-handoff'),false);
assert.equal(flow.style.opacity,undefined);
assert.equal(root.style['--pose-handoff'],undefined);
console.log('PASS map→pose: takeover, interpolated geometry, release, rewind, mobile cleanup');
