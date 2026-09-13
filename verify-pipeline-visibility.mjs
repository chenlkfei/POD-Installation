import * as THREE from './three-validation.mjs';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const html=fs.readFileSync('dist/index.html','utf8'),data=html.slice(html.indexOf('const STEPS = ['),html.indexOf('const CONFIG=')),helpers=html.slice(html.indexOf('function box('),html.indexOf('function buildAnchors(')),materials=html.slice(html.indexOf(' const material=(color,roughness'),html.indexOf(' new ResizeObserver')),pipelineCode=html.slice(html.indexOf('function createPipelineSchedule('),html.indexOf('function moveCamera('));
const elements=new Map(),ctx={fillRect(){},fillText(){},createRadialGradient(){return{addColorStop(){}};}};
const element=()=>({dataset:{},style:{},classList:{toggle(){}},append(){},replaceChildren(){},setAttribute(){},getContext(){return ctx;},clientWidth:1000,clientHeight:700});
const scope={THREE,console,Math,Map,Set,document:{createElement:element},$:id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);},renderUI(){}};vm.createContext(scope);
vm.runInContext(data+`\nlet scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-12,12,9,-9,.1,120),unitBox=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,10),dummy=new THREE.Object3D(),M,installation=null,transition=null,pipeline=null,batches=new Map(),demoStarted=false,demoFinished=false,current=0,tourElapsed=0,completed=new Set();const selectables=[],racks=[],flowPaths=[];\n`+materials+'\n'+helpers+'\n'+pipelineCode+'\nbuildEnvironment();buildEquipment();initPipeline();startPipeline();this.t={getP:()=>pipeline,scene,racks,advancePipeline,renderPipeline,focusPipeline,stopPipeline,startPipeline};',scope);

const P=scope.t.getP();scope.t.advancePipeline(500000);scope.t.renderPipeline();
vm.runInContext("camera.position.set(-12,1.2,.5);camera.lookAt(0,1.2,.5);camera.updateMatrixWorld(true);installation=pipeline.contexts[0];pipeline.enabled=false;updateCabinetVisibility();",scope);
const cabinet11=P.contexts.find(I=>I.slot===11).hero;
let ghostCount=0;cabinet11.traverse(o=>{if(o.isMesh&&o.material.opacity===.045)ghostCount++;});
assert.ok(ghostCount>0,'Failed to reproduce 11 cabinet ghosting with the single-cabinet visibility rule');
vm.runInContext("pipeline.enabled=true;updateCabinetVisibility();",scope);
for(const I of P.contexts){let o=I.hero;while(o){assert.ok(o.visible,'Completed cabinet hidden: '+I.slot);o=o.parent;}I.hero.traverse(m=>{if(m.isMesh)assert.notEqual(m.material.opacity,.045,'Ghost material remained: '+I.slot);});}
for(let focus=0;focus<4;focus++){scope.t.focusPipeline(focus);vm.runInContext('updateCabinetVisibility()',scope);assert.equal(elements.get('viewport').dataset.transparentOccluders,'0');}
console.log('PASS: reproduced cabinet 11 ghosting; pipeline restores all four cabinets and disables ghosting for every focus.');
