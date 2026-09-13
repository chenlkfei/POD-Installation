import * as THREE from './three-validation.mjs';import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const html=fs.readFileSync('dist/index.html','utf8'),data=html.slice(html.indexOf('const STEPS = ['),html.indexOf('const CONFIG=')),helpers=html.slice(html.indexOf('function box('),html.indexOf('function buildAnchors(')),materials=html.slice(html.indexOf(' const material=(color,roughness'),html.indexOf(' new ResizeObserver')),pipelineCode=html.slice(html.indexOf('function createPipelineSchedule('),html.indexOf('function moveCamera(')),rampCode=html.slice(html.indexOf('const RAMP='),html.indexOf('function animate(now)'));
const elements=new Map();const canvasCtx={fillRect(){},fillText(){},createRadialGradient(){return{addColorStop(){}};}};
function element(){const o={className:'',dataset:{},style:{},children:[],value:'1620',clientWidth:1200,clientHeight:750,offsetWidth:95,setAttribute(k,v){this[k]=v;},append(...v){this.children.push(...v);},replaceChildren(...v){this.children=v;},getContext(){return canvasCtx;},getBoundingClientRect(){return{width:1200,height:750};}};o.classList={contains:n=>o.className.split(' ').includes(n),add(...n){o.className+=' '+n.join(' ');},remove(...n){o.className=o.className.split(' ').filter(v=>!n.includes(v)).join(' ');},toggle(n,v){if(v===undefined)v=!this.contains(n);v?this.add(n):this.remove(n);}};return o;}
const $=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
const scope={THREE,console,Math,Map,Set,$,requestAnimationFrame(){},document:{hidden:false,body:element(),createElement:element,createElementNS(ns){const o=element();o.namespaceURI=ns;return o;},getElementById:$},renderUI(){},toast(){},resize(){},updateAnchors(){}};vm.createContext(scope);
vm.runInContext(data+`let scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-12,12,9,-9,.1,120),unitBox=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,10),dummy=new THREE.Object3D(),M,installation=null,transition=null,pipeline=null,ramp=null,batches=new Map(),demoStarted=false,demoFinished=false,current=0,tourElapsed=0,completed=new Set(),loaded=true,renderDirty=true,playing=false,lastTime=0,autoRotate=false,playbackRate=2,frames=0;const selectables=[],racks=[],flowPaths=[],anchorMarkers=[],controls={target:new THREE.Vector3(),update(){}},renderer={render(){frames++;}};function setPlaying(v){playing=v;renderDirty=true;}function selectStep(i){current=i;tourElapsed=0;}\n`+materials+helpers+pipelineCode+rampCode+html.slice(html.indexOf('function animate(now){'),html.indexOf('function updateAnchors(){'))+`buildEnvironment();buildEquipment();initPipeline();startPipeline();buildRamp();initRampNotes();ramp.enabled=true;this.t={getR:()=>ramp,getI:()=>installation,getP:()=>pipeline,renderRampFlow,rampFlowLength,seekDemo,refreshSeek,animate,frames:()=>frames,dirty:()=>{renderDirty=true;},pause:()=>{playing=false;},play:()=>{playing=true;},setRamp:v=>ramp.enabled=v};`,scope);
const t=scope.t,R=t.getR(),total=t.rampFlowLength();
for(const time of[0,22,43.9,44,total,0,total]){t.seekDemo(time);assert.equal(R.flowPhase,'ramp');}
for(const [mass,count]of [[999,2],[1000,4],[1500,4],[1501,6],[1620,6],[500,2]]){
$('ramp-mass').value=String(mass);vm.runInContext('updateRampForceText()',scope);
assert.equal(R.pullCount,count);assert.equal(R.people.filter(p=>p.visible).length,count+4);
assert.equal(R.people.slice(0,3).filter(p=>p.visible).length,count/2);
assert.equal(R.people.slice(3,6).filter(p=>p.visible).length,count/2);
R.notes.filter(n=>n.person&&!n.person.visible).forEach(n=>assert.equal(n.el.hidden,true));
}
$('ramp-mass').value='1620';vm.runInContext('updateRampForceText()',scope);
t.seekDemo(total-.01);t.play();t.animate(1000);t.animate(1050);assert.ok(R.time<1);assert.equal(R.flowPhase,'ramp');
console.log('PASS: mass boundaries select symmetric 2/4/6 pullers and matching labels; ramp loops without entering installation.');
t.seekDemo(22);assert.equal(R.flowPhase,'ramp');assert.equal(R.layers.force,false);assert.ok(R.forceArrows.every(o=>!o.visible));R.layers.person=false;t.renderRampFlow(22);assert.ok(R.notes.filter(n=>n.el.classList.contains('person')).every(n=>n.el.hidden));
t.pause();t.dirty();t.animate(1000);const count=t.frames();for(let i=1;i<30;i++)t.animate(1000+i*16);assert.equal(t.frames(),count,'Paused idle frames still render');
assert.match(elements.get('seek-clock').textContent,/\d\d:\d\d/);
console.log('PASS: backward seeking, annotation layers and paused idle rendering.');
// Sample rendered body/hand vertices, not merely each worker's root or wrist target.
let penetration=0,worst=null;for(let i=0;i<=60;i++){
 t.seekDemo(i/60*43.9);R.scene.updateMatrixWorld(true);
 R.people.forEach((p,id)=>p.traverse(mesh=>{if(!mesh.isMesh)return;const pos=mesh.geometry.attributes.position;for(let k=0;k<pos.count;k+=3){const v=new THREE.Vector3().fromBufferAttribute(pos,k).applyMatrix4(mesh.matrixWorld);R.hero.worldToLocal(v);const depth=Math.min(.70-Math.abs(v.x),.30-Math.abs(v.z),v.y,2.25-v.y);if(depth>penetration){penetration=depth;worst={id,time:i/60*43.9,depth,mesh:mesh.name,part:Object.entries(p.userData).filter(([k,v])=>v===mesh).map(([k])=>k),arms:p.userData.arms.map(a=>Object.entries(a).filter(([k,v])=>v===mesh).map(([k])=>k)),v:v.toArray()};}}}));
}
assert.ok(penetration<.004,'Rendered crew penetrates cabinet '+JSON.stringify(worst));
console.log('PASS: sampled rendered body and finger geometry stays outside cabinet interior (4 mm contact tolerance).');

let planted=0;
for(let i=2;i<55;i++){t.seekDemo(i/60*43.9);R.scene.updateMatrixWorld(true);const before=R.people.map(p=>p.userData.legs.map(l=>({pos:l.foot.getWorldPosition(new THREE.Vector3()),u:((p.position.x/.32+(l.side===1?.5:0)+p.userData.index*.11)%1+1)%1})));
t.seekDemo(i/60*43.9+.002);R.scene.updateMatrixWorld(true);
R.people.forEach((p,j)=>p.userData.legs.forEach((l,k)=>{if(before[j][k].u<.59){assert.ok(before[j][k].pos.distanceTo(l.foot.getWorldPosition(new THREE.Vector3()))<1e-7,'stance foot slides');planted++;}}));}
assert.ok(planted>400);console.log('PASS: '+planted+' planted-foot samples remain fixed in world space.');

vm.runInContext("ramp.enabled=false;startPipeline();$('action-label').textContent='原流水线动作';switchTransport(true);seekDemo(rampFlowLength());switchTransport(false);",scope);
assert.equal(t.getP().enabled,true);assert.equal(elements.get('pipeline-board').hidden,false);assert.equal(elements.get('pipeline-mode').textContent,'切回单柜');assert.equal(elements.get('action-label').textContent,'原流水线动作');
console.log('PASS: ramp loop then returning restores pipeline board, mode and action text.');
