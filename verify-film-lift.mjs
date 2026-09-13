import * as THREE from './three-validation.mjs';
import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const html=fs.readFileSync('dist/index.html','utf8');
const data=html.slice(html.indexOf('const STEPS = ['),html.indexOf('const CONFIG='));
const helpers=html.slice(html.indexOf('function box('),html.indexOf('function buildAnchors('));
const materials=html.slice(html.indexOf(' const material=(color,roughness'),html.indexOf(' new ResizeObserver'));
const elements=new Map();
const ctx={fillRect(){},fillText(){},createRadialGradient(){return {addColorStop(){}};}};
const scope={THREE,console,Math,Map,Set,document:{createElement(){return {width:512,height:128,getContext(){return ctx;}};}},$:id=>{if(!elements.has(id))elements.set(id,{dataset:{},style:{}});return elements.get(id);}};
vm.createContext(scope);
vm.runInContext(data+'\nlet scene=new THREE.Scene(),camera=new THREE.OrthographicCamera(-12,12,9,-9,.1,120),unitBox=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,10),dummy=new THREE.Object3D(),M,installation=null,transition=null,batches=new Map();const selectables=[],racks=[],flowPaths=[];\n'+materials+'\n'+helpers+'\nbuildEnvironment();buildEquipment();this.test={scene,camera,installation,STEPS,installationState,applyInstallation,routeSample,orthogonalSample,MOTION,racks,pushOut,updateCabinetVisibility,setTransition:value=>transition=value};',scope);

const t=scope.test,h=t.installation.workers.map(()=>[]);let previous=0;
for(let i=1;i<190;i++){const p=.46+i/1000;t.applyInstallation(2,p);
t.installation.workers.forEach((w,k)=>h[k].push(w.userData.arms[0].hand.position.y));
const removed=Number(elements.get('viewport').dataset.filmRemoval);assert.ok(removed>=previous);previous=removed;}
h.forEach((heights,k)=>{assert.ok(Math.max(...heights)-Math.min(...heights)>.65,'Insufficient lifting range '+k);let peaks=0;for(let i=1;i<heights.length-1;i++)if(heights[i]>heights[i-1]&&heights[i]>=heights[i+1])peaks++;assert.ok(peaks>=3,'Missing repeated raises '+k);});
t.applyInstallation(2,.65);assert.equal(t.installation.innerFilm.visible,false);
console.log('PASS: all four workers repeat three upward lifts, with >65 cm hand travel; film removal remains monotonic and completes.');
