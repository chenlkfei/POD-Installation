import * as THREE from './three-validation.mjs';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const html=fs.readFileSync('dist/index.html','utf8'),data=html.slice(html.indexOf('const STEPS = ['),html.indexOf('const CONFIG=')),helpers=html.slice(html.indexOf('function box('),html.indexOf('function buildAnchors(')),materials=html.slice(html.indexOf(' const material=(color,roughness'),html.indexOf(' new ResizeObserver')),pipelineCode=html.slice(html.indexOf('function createPipelineSchedule('),html.indexOf('function moveCamera('));
const elements=new Map(),ctx={fillRect(){},fillText(){},createRadialGradient(){return{addColorStop(){}};}};
const element=()=>({dataset:{},style:{},classList:{toggle(){}},append(){},replaceChildren(){},setAttribute(){},getContext(){return ctx;},clientWidth:1000,clientHeight:700});
const scope={THREE,console,Math,Map,Set,document:{createElement:element},$:id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);},renderUI(){}};vm.createContext(scope);
vm.runInContext(data+`\nlet scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-12,12,9,-9,.1,120),unitBox=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,10),dummy=new THREE.Object3D(),M,installation=null,transition=null,pipeline=null,batches=new Map(),demoStarted=false,demoFinished=false,current=0,tourElapsed=0,completed=new Set();const selectables=[],racks=[],flowPaths=[];\n`+materials+'\n'+helpers+'\n'+pipelineCode+'\nbuildEnvironment();buildEquipment();initPipeline();startPipeline();this.t={getP:()=>pipeline,scene,racks,advancePipeline,renderPipeline,focusPipeline,stopPipeline,startPipeline};',scope);
const t=scope.t,P=t.getP();assert.equal(P.contexts.length,4);assert.equal(new Set(P.contexts.map(I=>I.hero)).size,4);assert.equal(P.reserved.filter(r=>r.visible).length,0);
assert.deepEqual(Array.from(P.contexts,I=>I.slot),[12,11,10,9]);
const completionOrder=[];
let waits=0,parallel=0,frames=0;const visited=P.contexts.map(()=>new Set());
while(!P.schedule.jobs.every(j=>j.done)&&P.schedule.time<500000){
 t.advancePipeline(400);t.renderPipeline();frames++;
 const S=P.schedule;
 for(const job of S.jobs)if(job.done&&!completionOrder.includes(P.contexts[job.index].slot))completionOrder.push(P.contexts[job.index].slot);
 assert.equal(elements.get('fix-detail').hidden,true,'Close-up visible in pipeline mode');
 for(const j of S.jobs){visited[j.index].add(j.stage);if(j.wait)waits++;}
 if(S.jobs.filter(j=>!j.done&&!j.wait).length>=3)parallel++;
 assert.ok(P.contexts.filter(I=>I.lift.visible).length===1,'Multiple lifts visible');
 assert.ok(P.contexts.filter(I=>I.wasteCart.visible).length<=1,'Multiple waste carts visible');
 if(S.owners.lift!==null)assert.ok([3,4].includes(S.jobs[S.owners.lift].stage));
 assert.equal(elements.get('viewport').dataset.cabinetCollision,'clear','Focused cabinet collision at '+S.time);
 for(const I of P.contexts){if(I.pipelineCollision!=='clear')console.log(JSON.stringify({time:S.time,slot:I.slot,jobs:S.jobs,pose:I.hero.position,safe:I.safeCabinet,others:t.racks.filter(r=>r.visible).map(r=>({id:r.userData.referenceId,p:r.position,yaw:r.rotation.y}))}));assert.equal(I.pipelineCollision,'clear','Cabinet '+I.slot+' blocked at '+S.time);}
 t.scene.updateMatrixWorld(true);
 for(const I of P.contexts.filter(I=>I.wasteCart.visible)){const cart=new THREE.Box3().setFromObject(I.wasteCart);for(const J of P.contexts)assert.ok(!cart.intersectsBox(new THREE.Box3().setFromObject(J.hero)),'Cart intersects cabinet at '+S.time);}
 const crew=P.contexts.flatMap((I,team)=>I.workers.filter(w=>w.visible).map(w=>({w,team})));
 for(let i=0;i<crew.length;i++)for(let j=i+1;j<crew.length;j++){const a=crew[i],b=crew[j];if(a.team===b.team||Math.abs(a.w.position.y-b.w.position.y)>1.65)continue;assert.ok(Math.hypot(a.w.position.x-b.w.position.x,a.w.position.z-b.w.position.z)>.65,'Cross-team overlap '+a.team+'/'+b.team+' at '+S.time);}
 for(let i=0;i<4;i++)for(let j=i+1;j<4;j++){const a=P.contexts[i].hero,b=P.contexts[j].hero;assert.ok(Math.hypot(a.position.x-b.position.x,a.position.z-b.position.z)>.60,'Cabinets overlap '+i+'/'+j+' at '+S.time);}
 if(frames%40===0){t.focusPipeline(frames/40%4|0);assert.equal(P.focus,frames/40%4|0);}
}
assert.ok(P.schedule.jobs.every(j=>j.done),'Schedule deadlock');assert.ok(waits>0&&parallel>0);
assert.deepEqual(completionOrder,[12,11,10,9]);
for(let i=0;i<4;i++){const I=P.contexts[i];assert.ok(Math.abs(I.hero.position.x-(-2.8+(3-i)*.615))<1e-8);assert.equal(I.hero.position.z,.5);assert.ok(I.bolts.every(b=>b.userData.installed));assert.ok(I.hoses.every(h=>h.visible));assert.ok(I.workers.every(w=>!w.visible));}
t.stopPipeline();assert.ok(P.roots.every(r=>!r.visible));assert.ok(P.reserved.every(r=>r.visible));t.startPipeline();assert.equal(P.schedule.time,0);assert.deepEqual(Array.from(P.schedule.jobs,j=>j.stage),[5,4,2,1]);
console.log('PASS:',frames,'sampled pipeline frames,',waits,'waiting states,',parallel,'frames with >=3 active cabinets; all 4 finish without resource deadlock.');
console.log('PASS: four independent cabinets, unique lift/cart ownership, focus switching, distinct final slots and restart/single-mode restoration.');
// 执行实际帧循环，必须一路运行到 renderer.render；仅测调度器会漏掉渲染前异常。
scope.refreshSeek=()=>{};scope.requestAnimationFrame=()=>{};scope.updateAnchors=()=>{};scope.toast=()=>{};
const animationCode=html.slice(html.indexOf('function animate(now){'),html.indexOf('function updateAnchors(){'));
vm.runInContext(`let renderDirty=true,autoRotate=false,ramp=null,playing=true,lastTime=0,playbackRate=2,frameRenders=0;const anchorMarkers=[],controls={update(){}},renderer={render(){frameRenders++;}};function setPlaying(value){playing=value;}\n`+animationCode+'\nthis.frameTest={animate,getRenders:()=>frameRenders,isPlaying:()=>playing};',scope);
const initialD=P.contexts[3].hero.position.clone(),initialLift=P.contexts[1].deck.position.y;
for(let i=0;i<120;i++)scope.frameTest.animate(1000+i*50);
assert.equal(scope.frameTest.getRenders(),120,'Frame loop failed before rendering');
assert.ok(P.contexts[3].hero.position.distanceTo(initialD)>.2,'Transport cabinet never moved');
assert.ok(P.contexts[1].deck.position.y>initialLift+.3,'Lift never moved');
t.advancePipeline(500000);scope.frameTest.animate(7100);assert.equal(scope.frameTest.isPlaying(),false);assert.equal(scope.frameTest.getRenders(),121);
const finishedTime=P.schedule.time;scope.frameTest.animate(7150);assert.equal(P.schedule.time,finishedTime);assert.equal(scope.frameTest.getRenders(),121);
console.log('PASS: actual animation loop renders every frame, cabinet and lift visibly change transforms, completion stops playback without throwing.');
