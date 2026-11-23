const fs = require('fs');
const vm = require('vm');
const assert = require('assert/strict');
const el = (dataset = {}) => ({dataset, textContent:'', innerHTML:'', hidden:false, src:'', offsetLeft:10, offsetWidth:30, clientWidth:260, attrs:{}, listeners:{}, style:{}, classList:{values:new Set(),add(...a){a.forEach(x=>this.values.add(x));},remove(...a){a.forEach(x=>this.values.delete(x));},contains(x){return this.values.has(x);},toggle(x,on){if(on)this.add(x);else this.remove(x);}},setAttribute(k,v){this.attrs[k]=v;},addEventListener(k,fn){this.listeners[k]=fn;}});
const selectors = ['[data-picker]','[data-appose]','[data-ap-grid]','[data-ap-count]','.ap-tap','[data-chip-n-text]','[data-ap-random]','[data-random]','[data-random-label]','[data-relation]','[data-pose-status]','[data-chip-n]','[data-rel]','.seg'];
const nodes = Object.fromEntries(selectors.map(s=>[s,el()]));
const ns = ['1','2','3','4'].map(n=>el({n}));
const rs = ['friend','some','couple'].map(r=>el({r}));
const chips=rs.map(b=>el({chipR:b.dataset.r}));
ns.forEach(b=>b.parentNode=nodes['.seg']);rs.forEach(b=>b.parentNode=nodes['[data-rel]']);
function $(s){return nodes[s] || ns.find(b=>s===`[data-n="${b.dataset.n}"]`) || chips.find(b=>s===`[data-chip-r="${b.dataset.chipR}"]`);}
function $$(s,parent){if(s==='[data-n]')return ns;if(s==='[data-r]')return rs;if(s==='[data-chip-r]')return chips;if(s==='.ap-sheet li')return ns.map(b=>el({sn:b.dataset.n}));if(s==='button')return parent===nodes['.seg']?ns:rs;throw Error(s);}
const source=fs.readFileSync('js/main.js','utf8');
const block=source.slice(source.indexOf("  var picker = $('[data-picker]');"),source.indexOf('  // 9) 아카이빙'));
vm.runInNewContext(block,{$,$$,reduce:true,setTimeout,clearTimeout,Math});
const settle=()=>new Promise(r=>setTimeout(r,30));
(async()=>{
 ns[0].listeners.click();await settle();
 assert.equal(nodes['[data-relation]'].hidden,true);
 assert.equal(nodes['[data-chip-n-text]'].textContent,'1인');
 ns[3].listeners.click();rs[2].listeners.click();await settle();
 assert.equal(nodes['[data-relation]'].hidden,false);
 assert.equal(nodes['[data-chip-n-text]'].textContent,'2인');
 assert.match(nodes['[data-ap-grid]'].innerHTML,/couple-/);
 const pending=nodes['[data-random]'].listeners.click();ns[2].listeners.click();await pending;await settle();
 assert.equal(nodes['[data-appose]'].classList.contains('is-random'),false);
 assert.equal(nodes['[data-chip-n-text]'].textContent,'3인');
 await nodes['[data-random]'].listeners.click();
 assert.match(nodes['[data-ap-random]'].src,/p3-/);
 console.log('PASS pose state: relation visibility, rapid switching, cancelled random and selected feed');
})().catch(e=>{console.error(e);process.exitCode=1;});
