import * as THREE from './three-validation.mjs';
import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const html=fs.readFileSync('dist/index.html','utf8');
const helpers=html.slice(html.indexOf('function box('),html.indexOf('function buildAnchors('));
const materials=html.slice(html.indexOf(' const material=(color,roughness'),html.indexOf(' new ResizeObserver'));
const code=html.slice(html.indexOf('const RAMP='),html.indexOf('function animate(now)'));
const scope={THREE,console};vm.createContext(scope);
vm.runInContext('let scene=new THREE.Scene(),ramp=null,unitBox=new THREE.BoxGeometry(1,1,1),cylinder=new THREE.CylinderGeometry(1,1,1,10),M;'+materials+helpers+code+';buildRamp();this.t={ramp,poseRamp,rampFloor,RAMP};',scope);
const {ramp,poseRamp,rampFloor,RAMP}=scope.t;
assert.equal(RAMP.rise,.8);assert.ok(Math.abs(Math.asin(RAMP.rise/RAMP.length)*180/Math.PI-8)<1e-10);
assert.ok(ramp.people.every(p=>p.userData.refined&&p.getObjectByName('blank-head')&&p.getObjectByName('yellow-safety-helmet')));
assert.equal(ramp.people.length,10);assert.equal(ramp.tails.length,2);assert.equal(scenePeople(ramp.scene),10);
function scenePeople(s){let n=0;s.traverse(o=>{if(o.name.startsWith('construction-worker-'))n++;});return n;}
for(let i=0;i<=200;i++){
 poseRamp(i/200);ramp.scene.updateMatrixWorld(true);const cx=ramp.hero.position.x;
 assert.equal(ramp.hero.rotation.z,0);
 ramp.people.forEach((person,k)=>{
  assert.equal(person.userData.arms.length,2);assert.equal(person.userData.legs.length,2);
  if(k<6){assert.ok(person.position.x>cx+.7);assert.equal(person.rotation.y,-Math.PI/2);}
  else if(k<8){assert.equal(person.position.x,cx);assert.ok(Math.abs(person.position.z)>.6);}
  else {assert.ok(person.position.x<cx-.7);assert.equal(person.rotation.y,Math.PI/2);}
  person.userData.arms.forEach((a,j)=>{
   assert.ok(a.hand.getWorldPosition(new THREE.Vector3()).distanceTo(ramp.handTargets[k][j])<1e-7,'hand contact lost');
   const reach=a.hand.position.distanceTo(a.shoulder.position);assert.ok(reach<=.605,`arm stretched ${k} at ${i}: ${reach}`);
  });
  // 默认镜头采用用户截图的较低角度，允许机柜造成自然遮挡；不改动人员站位。
  for(let j=k+1;j<10;j++)assert.ok(person.position.distanceTo(ramp.people[j].position)>.68,'overlapping crew');
 });
 ramp.wheels.forEach(w=>assert.ok(Math.abs(w.mesh.position.y-.025-rampFloor(w.mesh.position.x))<1e-9));
}
console.log('PASS: 201 ramp states; exactly 10 workers, 6/2/2 formation, correct facing, hand contact, arm reach, clear body spacing, upright cabinet and four wheels touching incline.');

// Full-flow frame and seek coverage now lives in verify-review.mjs.
