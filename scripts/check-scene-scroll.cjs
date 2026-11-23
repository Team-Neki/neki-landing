// Scroll controller tests with deterministic input, clock and geometry.
const vm = require('node:vm');
const fs = require('node:fs');
const assert = require('node:assert/strict');
function setup() {
  const events={},frames=new Map(),timers=new Map(),classes=new Set();let serial=0;
  const reduced={matches:false,addEventListener:(k,fn)=>events.reduce=fn};
  const wide={matches:true};
  const ctx={scrollY:5100,innerHeight:1000,performance:{now:()=>100},Math,
    matchMedia:q=>q.includes('reduced')?reduced:wide,
    addEventListener:(k,fn)=>events[k]=fn,
    setTimeout:fn=>{timers.set(++serial,fn);return serial;},clearTimeout:id=>timers.delete(id),
    requestAnimationFrame:fn=>{frames.set(++serial,fn);return serial;},cancelAnimationFrame:id=>frames.delete(id),
    scrollTo:({top})=>{ctx.scrollY=top;},
    document:{hidden:false,documentElement:{scrollHeight:15000,classList:{add:k=>classes.add(k),remove:k=>classes.delete(k)}},
      addEventListener:(k,fn)=>events[k]=fn,
      querySelector:s=>s==='[data-pose-story]'?{offsetHeight:3800,getBoundingClientRect:()=>({top:4000-ctx.scrollY})}:null}
  };
  vm.runInNewContext(fs.readFileSync('js/scene-scroll.js','utf8'),ctx);
  function idle(){const todo=[...timers.values()];timers.clear();todo.forEach(fn=>fn());}
  function finish(){const todo=[...frames.values()];frames.clear();todo.forEach(fn=>fn(500));}
  function wheel(){events.wheel({deltaY:40,deltaX:0});}
  return {ctx,events,frames,classes,reduced,wide,idle,finish,wheel};
}
let t=setup();t.wheel();t.ctx.scrollY=5140;t.events.scroll();t.idle();
assert.ok(t.classes.has('is-scene-snapping'));t.finish();
assert.ok(Math.abs(t.ctx.scrollY-5204)<1); // pose .43
// Leaving an anchor should not be dragged back repeatedly.
t.wheel();t.ctx.scrollY=5250;t.events.scroll();t.idle();assert.equal(t.frames.size,0);
t=setup();t.ctx.scrollY=5400;t.wheel();t.ctx.scrollY=5420;t.events.scroll();t.idle();assert.equal(t.frames.size,0); // outside radius
// A large gesture may skip intermediate stops and settle by the next one.
t=setup();t.wheel();t.ctx.scrollY=5700;t.events.scroll();t.idle();t.finish();assert.ok(Math.abs(t.ctx.scrollY-5736)<1);
t=setup();t.reduced.matches=true;t.wheel();t.ctx.scrollY=5140;t.events.scroll();t.idle();assert.equal(t.frames.size,0);
t=setup();t.wheel();t.ctx.scrollY=5140;t.events.scroll();t.idle();t.events.pointerdown({pointerType:'mouse'});assert.equal(t.frames.size,0);assert.equal(t.classes.size,0);
t=setup();t.wheel();t.idle();assert.equal(t.frames.size,0); // no actual scroll
// Hash navigation and reading regions must remain free.
t=setup();t.wheel();t.ctx.scrollY=5140;t.events.hashchange();t.idle();assert.equal(t.frames.size,0);
t=setup();t.ctx.scrollY=10000;t.wheel();t.ctx.scrollY=10080;t.events.scroll();t.idle();assert.equal(t.frames.size,0);
t=setup();t.events.wheel({deltaY:5,deltaX:50});t.ctx.scrollY=5140;t.events.scroll();t.idle();assert.equal(t.frames.size,0);
console.log('PASS scene stops: proximity, skip, no repeated pullback, reduced motion, cancellation, free regions');
