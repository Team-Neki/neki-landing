// State-only regression checks; this does not render a browser.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
function element(dataset = {}) {
  return {dataset, textContent:'', innerHTML:'', hidden:false, src:'', inert:false,
    offsetWidth:260, clientWidth:260, isConnected:true, attrs:{}, listeners:{},
    style:{setProperty(k,v){this[k]=v;},removeProperty(k){delete this[k];}},
    classList:{values:new Set(),add(...a){a.forEach(x=>this.values.add(x));},remove(...a){a.forEach(x=>this.values.delete(x));},contains(x){return this.values.has(x);},toggle(x,on){on?this.add(x):this.remove(x);}},
    setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.listeners[k]=fn;},focus(){this.focused=true;},closest(){return null;},contains(){return true;},setPointerCapture(){}};
}
const nodes=Object.fromEntries(['[data-picker]','[data-appose]','[data-ap-grid]','[data-ap-count]','[data-chip-n-text]','[data-ap-random]','[data-random]','[data-pose-swipe]','[data-pose-back]','.ap-feed','.ap-random','[data-pose-hint]','[data-rel]','[data-chip-n]','.seg'].map(k=>[k,element()]));
const ns=['1','2','3','4'].map(n=>element({n}));
const rs=['friend','some','couple'].map(r=>element({r}));
const chips=rs.map(b=>element({chipR:b.dataset.r}));
ns.forEach(b=>b.parentNode=nodes['.seg']);rs.forEach(b=>b.parentNode=nodes['[data-rel]']);
function $(s){return nodes[s] || ns.find(b=>s===`[data-n="${b.dataset.n}"]`) || rs.find(b=>s===`[data-r="${b.dataset.r}"]`);}
function $$(s,parent){if(s==='[data-n]')return ns;if(s==='[data-r]')return rs;if(s==='[data-chip-r]')return chips;if(s==='button')return parent===nodes['.seg']?ns:rs;throw Error(s);}
let failImage=false;
class ImageStub {decode(){return failImage?Promise.reject(Error('offline')):Promise.resolve();}}
const source=fs.readFileSync('js/main.js','utf8');
vm.runInNewContext(source.slice(source.indexOf("  var picker = $('[data-picker]');"),source.indexOf('  // 9) 아카이빙')),{$,$$,reduce:true,Image:ImageStub,Math,setTimeout,syncPoseStory:null,advancePoseStory:null});
const settle=()=>new Promise(resolve=>setTimeout(resolve,0));
(async()=>{
  assert.equal(nodes['.ap-random'].inert,true);
  nodes['[data-random]'].listeners.click();await settle();
  assert.match(nodes['[data-ap-random]'].src,/friend-/);
  nodes['[data-pose-back]'].listeners.click();
  ns[0].listeners.click();
  assert.equal(nodes['[data-rel]'].hidden,true);
  assert.match(nodes['[data-ap-grid]'].innerHTML,/data-pose-card="solo-/);
  rs[2].listeners.click();
  assert.equal(nodes['[data-rel]'].hidden,false);
  const card=element({poseCard:'couple-3'});card.closest=()=>nodes['.ap-feed'];
  nodes['[data-ap-grid]'].listeners.click({target:{closest:()=>card}});await settle();
  assert.match(nodes['[data-ap-random]'].src,/couple-3.webp$/);
  assert.equal(nodes['.ap-feed'].inert,true);
  assert.equal(nodes['[data-pose-swipe]'].focused,true);
  nodes['[data-pose-swipe]'].listeners.keydown({key:'ArrowRight',preventDefault(){}});await settle();
  assert.match(nodes['[data-ap-random]'].src,/couple-4.webp$/);
  const swipe=nodes['[data-pose-swipe]'];
  swipe.listeners.pointerdown({isPrimary:true,button:0,clientX:100,clientY:100,pointerId:1});
  swipe.listeners.pointermove({clientX:20,clientY:100,pointerId:1});
  swipe.listeners.pointerup({pointerId:1});await settle();
  assert.match(nodes['[data-ap-random]'].src,/couple-5.webp$/);
  nodes['[data-random]'].listeners.click();ns[2].listeners.click();await settle();
  assert.equal(nodes['[data-appose]'].classList.contains('is-random'),false);
  assert.equal(nodes['[data-chip-n-text]'].textContent,'3인');
  failImage=true;nodes['[data-random]'].listeners.click();await settle();
  assert.match(nodes['[data-pose-hint]'].textContent,/불러오지 못/);
  failImage=false;nodes['[data-random]'].listeners.click();await settle();
  nodes['[data-pose-back]'].listeners.click();
  assert.equal(nodes['.ap-feed'].inert,false);
  console.log('PASS pose: direct selection, keyboard, swipe, cancellation, loading failure, back navigation');
})().catch(error=>{console.error(error);process.exitCode=1;});
