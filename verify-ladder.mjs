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

const t=scope.test,I=t.installation;
for(let i=150;i<=940;i+=2){
 const p=i/1000;t.applyInstallation(6,p);t.scene.updateMatrixWorld(true);
 const surfaces=[];I.workPlatform.traverse(m=>{if(m.isMesh&&m.geometry.type==='BoxGeometry')surfaces.push(new THREE.Box3().setFromObject(m));});
 const feet=I.workers[1].userData.legs.map(l=>new THREE.Box3().setFromObject(l.foot));
 const supported=feet.map(b=>{const c=b.getCenter(new THREE.Vector3());return Math.abs(b.min.y-.025)<.016||surfaces.some(s=>c.x>=s.min.x&&c.x<=s.max.x&&c.z>=s.min.z&&c.z<=s.max.z&&Math.abs(b.min.y-s.max.y)<.016);});
 assert.ok(supported.some(Boolean),'No planted foot at '+p+' '+JSON.stringify(feet.map(b=>b.min.toArray())));
 if(p>=.30&&p<=.82)assert.ok(supported.every(Boolean),'Connecting off deck at '+p);
}
console.log('PASS: sampled ascent/descent always has a supported foot; both feet supported throughout connecting.');

for(let i=0;i<=1000;i+=5){t.applyInstallation(6,i/1000);assert.ok(I.workers[1].position.z>=1.4,'Installer entered cabinet/aisle side at '+i);}
console.log('PASS: installer stays on the exterior ladder side for the entire power-connection stage.');
