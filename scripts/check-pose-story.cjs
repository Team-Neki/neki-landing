// DOM doubles verify scroll state/geometry, not visual rendering.
const fs = require('node:fs');
const vm = require('node:vm');
const assert = require('node:assert/strict');
const code = fs.readFileSync('js/main.js', 'utf8');
const fragment = code.slice(code.indexOf("  var poseStory = $('[data-pose-story]');"), code.indexOf('  // 9) 아카이빙'));
function node() {
  return {style:{setProperty(k,v){this[k]=v;}},classList:{values:new Set(),toggle(k,on){on?this.values.add(k):this.values.delete(k);}},attrs:{},listeners:{},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.listeners[k]=fn;},setPointerCapture(){}};
}
for (const [W,H,reduce] of [[1440,900,false],[390,844,false],[375,667,false],[390,844,true]]) {
  const stage=node();stage.clientWidth=W;stage.clientHeight=H;stage.getBoundingClientRect=()=>({left:0,top:0});
  let progress=0;
  const story=node();story.offsetHeight=H*3.8;story.getBoundingClientRect=()=>({top:-progress*(story.offsetHeight-H)});
  const deck=node(), title=node(), caption=node(), copy=node(), picker=node(), app=node();
  const cuts=Array.from({length:4},()=>{const n=node();n.img=node();return n;});
  const slots={'[data-pose-story]':story,'.pose-story-stage':stage,'[data-pose-deck]':deck,'[data-pose-title]':title,'[data-pose-caption]':caption,'.feature__copy':copy,'.pose-story-heading':{getBoundingClientRect:()=>({bottom:W<1024?270:240})}};
  const events={};let advanced=0, selectedRelation='';
  const labels=['friend','couple','some'].map(rel=>{const n=node();n.dataset={storyRelation:rel};return n;});
  vm.runInNewContext(fragment,{
    $:(s,n)=>s==='img'?n.img:slots[s],$$:s=>s==='[data-story-relation]'?labels:cuts,app,picker,poseSlot:{getBoundingClientRect:()=>({left:W*.15,top:H*.25,width:W<1024?220:290})},
    reduce,requestAnimationFrame:fn=>fn(),addEventListener:(event,fn)=>events[event]=fn,
    setPoseStoryRelation:r=>selectedRelation=r,syncPoseStory:null,advancePoseStory:()=>advanced++,Image:class {decode(){return Promise.resolve();}},Math,Promise
  });
  if(!reduce) { assert.equal(picker.inert,true);assert.equal(deck.attrs['aria-hidden'],'true'); }
  if(!reduce) for(const phase of [.08,.1,.16,.3,.6,.8,.88,.90,.94,1]) {
    progress=phase;events.scroll();
    const intro=Number(stage.style['--story-copy']);
    const heading=Number(stage.style['--story-heading']);
    assert.ok(!(intro>.01 && heading>.01), 'intro and relationship heading overlap');
    if(phase>=.39 && phase<=.8) for(const cut of cuts) {
      const y=Number(cut.style.transform.match(/px,([\d.]+)px/)[1]);
      assert.ok(y>= (W<1024?270:240)+24, 'photo overlaps heading');
    }
  }
  progress=.60;events.scroll();
  assert.equal(selectedRelation,reduce?'friend':'couple');
  if(!reduce) {
    assert.equal(stage.style['--relation-couple'],'1.000');
    progress=.8;events.scroll();
    assert.equal(selectedRelation,'some');
    assert.equal(stage.style['--relation-some'],'1.000');
  }
  for(const cut of cuts) {
    assert.ok(Number.isFinite(parseFloat(cut.style.width)));
    assert.ok(!cut.style.transform.includes('NaN'));
  }
  progress=1;events.scroll();
  assert.equal(picker.inert,false);
  assert.equal(deck.tabIndex,0);
  assert.equal(app.inert,true);
  deck.listeners.keydown({key:'ArrowRight',preventDefault(){}});assert.equal(advanced,1);
  if(W<1024) {
    const last=cuts[3], y=Number(last.style.transform.match(/px,([\d.]+)px/)[1]);
    assert.ok(y+parseFloat(last.style.height)<H-230, 'photo overlaps mobile controls');
  }
  if(!reduce) {progress=0;events.scroll();assert.equal(picker.inert,true);assert.equal(app.inert,false);assert.equal(selectedRelation,'friend');}
  console.log(`PASS story ${W}x${H}${reduce?' reduced motion':''}: geometry, interaction gate, rewind`);
}
for (const relation of ['friend','couple','ssum']) for (let i=1;i<=4;i++) assert.ok(fs.existsSync(`img/cast/${relation}-1-${i}.webp`));

const html = fs.readFileSync('index.html', 'utf8');
const poseHtml = html.slice(html.indexOf('id="pose"'), html.indexOf('id="archive"'));
assert.ok(!poseHtml.includes('class="feature__copy reveal"'), 'generic reveal overrides story opacity');
