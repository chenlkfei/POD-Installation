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
const t=scope.test;
assert.equal(t.STEPS.length,8);assert.equal(t.installation.workers.length,4);assert.equal(t.installation.wires.length,6);assert.equal(t.installation.hoses.length,2);assert.equal(t.racks.length,14);assert.ok(!t.racks.some(r=>r.userData.referenceId===1));
const hero=t.installation.hero;assert.equal(t.racks.filter(r=>r.userData.referenceId===9).length,1);
for(let stage=0;stage<8;stage++){
 for(let frame=0;frame<=120;frame++){
  const p=frame/120;t.applyInstallation(stage,p);t.scene.updateMatrixWorld(true);
  assert.strictEqual(t.installation.hero,hero);
  assert.ok(t.installation.workers.every((w,i)=>w.visible===(stage!==0&&(stage<5||i<2))),'Incorrect crew size');
  assert.equal(elements.get('viewport').dataset.cabinetCollision,'clear',`Cabinet sweep stopped at ${stage}/${p}`);
  t.scene.traverse(o=>{assert.ok(o.position.toArray().every(Number.isFinite),o.name+' invalid position');assert.ok(o.quaternion.toArray().every(Number.isFinite),'invalid quaternion');});
  const {poses,obstacles}=t.installation.collisionFrame;
  for(let i=0;i<4;i++){
   if(!t.installation.workers[i].visible)continue;
   const a=poses[i];for(const o of obstacles){const point={...a};assert.ok(!t.pushOut(point,o,.308),`Worker ${i} body hits cabinet at stage ${stage} phase ${p}`);}
   for(let j=i+1;j<4;j++)if(t.installation.workers[j].visible&&Math.abs(a.y-poses[j].y)<1.65)assert.ok(Math.hypot(a.x-poses[j].x,a.z-poses[j].z)>.70,`Workers ${i}/${j} overlap at ${stage}/${p}`);
   for(const segment of t.installation.workers[i].userData.segments){for(let k=0;k<=8;k++){const point=segment.a.clone().lerp(segment.b,k/8);for(const o of obstacles){if(point.y<o.y-segment.r||point.y>o.top+segment.r)continue;assert.ok(!t.pushOut({x:point.x,y:point.y,z:point.z},o,segment.r*.92),`Worker ${i} limb intersects at ${stage}/${p} point ${JSON.stringify(point)} obstacle ${JSON.stringify(o)} pose ${JSON.stringify(a)} segment ${JSON.stringify(segment)}`);}}}
  }
  if(stage===4){const movingBox=new THREE.Box3().setFromObject(hero);for(const rack of t.racks){if(rack===hero)continue;const other=new THREE.Box3().setFromObject(rack);assert.ok(!movingBox.intersectsBox(other),'Moving rack intersects fixed rack '+rack.userData.referenceId+' at phase '+p);}}
 }
 if(stage<7){const a=t.installationState(stage,1),b=t.installationState(stage+1,0);for(const field of ['x','y','z','yaw','liftY','unpack','waste','cables','hoses'])assert.ok(Math.abs(a[field]-b[field])<1e-8,`Stage ${stage+1} boundary discontinuity ${field}: ${a[field]} -> ${b[field]}`);}
}
const lifted=t.installationState(4,.40);assert.ok(Math.abs(lifted.y-t.MOTION.floorY)<1e-10);assert.equal(lifted.z,3.95);assert.ok(Math.abs(lifted.liftY-t.MOTION.floorY)<1e-10);
assert.equal(t.installationState(1,1).z,8.2);assert.equal(t.installationState(1,1).yaw,0);
for(const b of t.installation.boards.filter(b=>b.userData.zone==='inside')){t.scene.updateMatrixWorld(true);const footprint=new THREE.Box3().setFromObject(b);assert.ok(footprint.min.z>1.21,'Board enters reserved rack footprint');}
const end=t.installationState(7,1);assert.equal(end.x,-2.8);assert.equal(end.z,.5);assert.equal(end.cables,6);assert.equal(end.hoses,2);
assert.ok(t.installation.wires.every(m=>m.geometry.drawRange.count===m.geometry.index.count));assert.ok(t.installation.hoses.every(m=>m.geometry.drawRange.count===m.geometry.index.count));
// 暂停后相同时间再次采样，不应漂移或重建机柜。
t.applyInstallation(1,.45);const paused=hero.position.clone();t.applyInstallation(1,.45);assert.ok(paused.equals(hero.position));
// 散力板必须连续覆盖全部路线：采样每一点，应落入某块铺板轮廓。
t.applyInstallation(1,0);for(const [zone,route] of [['outside',t.MOTION.transport],['inside',t.MOTION.inside]])for(let k=0;k<=600;k++){const p=t.routeSample(route,k/600);if(zone==='inside'&&(p.z>3||p.z<1.60))continue;assert.ok(t.installation.boards.some(b=>{if(b.userData.zone!==zone)return false;const v=new THREE.Vector3(p.x-b.position.x,0,p.z-b.position.z).applyAxisAngle(new THREE.Vector3(0,1,0),-b.rotation.y);return Math.abs(v.x)<=b.scale.x/2+.004&&Math.abs(v.z)<=b.scale.z/2+.004;}),zone+' board route gap');}
for(const b of t.installation.boards){assert.ok(b.scale.z>=b.scale.x,'Board long edge perpendicular to travel');assert.ok(Math.abs(Math.sin(b.rotation.y*2))<1e-8,'Diagonal board');if(b.userData.zone==='inside')assert.equal(b.material.color.getHexString(),'946747');}
// 第 8 步、镜头切换结束后，仅其他机柜可以透明；退回早期步骤时完整恢复。
const otherModels=[...t.installation.workers,t.installation.jack,t.installation.lift,t.installation.wasteCart,t.installation.workPlatform,...t.installation.panels];
const protectedMaterials=[];for(const root of otherModels)root.traverse(m=>{if(m.isMesh)protectedMaterials.push({m,material:m.material});});
let fadedViews=0;
for(const stage of[0,1,2,3,4,5,6,7]){
 t.applyInstallation(stage,.75);
 for(let angle=0;angle<Math.PI*2;angle+=Math.PI/6){
  t.camera.position.set(hero.position.x+Math.sin(angle)*15,8,hero.position.z+Math.cos(angle)*15);t.camera.lookAt(hero.position.clone().add(new THREE.Vector3(0,1,0)));t.camera.updateProjectionMatrix();t.updateCabinetVisibility();
  const faded=(t.installation.occlusion||[]).filter(v=>v.faded);
  if(stage<7)assert.equal(faded.length,0,'Early-stage transparency');else fadedViews+=faded.length>0?1:0;
  for(const item of faded){assert.ok(t.racks.includes(item.root)&&item.root!==hero&&item.root.userData.referenceId!==1);for(const m of item.meshes)assert.ok((Array.isArray(m.material)?m.material:[m.material]).every(v=>v.transparent&&v.opacity<.1&&!v.depthWrite));}
  for(const {m,material} of protectedMaterials)assert.strictEqual(m.material,material,'Person, tool, packaging or CDU material changed');
  assert.equal(hero.children[0].material.opacity,1);
 }
}
assert.ok(fadedViews>0,'No occluding cabinets detected in stage 8');
t.setTransition({start:0});t.updateCabinetVisibility();assert.ok(t.installation.occlusion.every(v=>!v.faded),'Transparency during camera transition');
for(const item of t.installation.occlusion)for(const entry of item.original||[])assert.strictEqual(entry.m.material,entry.material,'Material not restored during transition');
t.setTransition(null);t.updateCabinetVisibility();
for(let stage=6;stage>=0;stage--){t.applyInstallation(stage,0);t.updateCabinetVisibility();assert.equal(elements.get('viewport').dataset.transparentOccluders,'0');for(const item of t.installation.occlusion){assert.equal(item.faded,false);for(const entry of item.original||[])assert.strictEqual(entry.m.material,entry.material);}}
console.log('PASS: transparency restricted to other cabinets in step 8 after camera transition; all protected models unchanged; earlier steps restore original materials.');
// 双层包装拆解顺序，以及阶段切换时包装材料的实际位置连续性。
const I=t.installation;
t.applyInstallation(1,1);const palletBefore=I.pallet.position.clone();t.applyInstallation(2,0);assert.ok(palletBefore.distanceTo(I.pallet.position)<1e-8,'Pallet jumps when unpacking starts');
assert.ok(I.innerFilm.visible&&I.innerFilm.scale.y===1);assert.equal(I.panels.length,5);
t.applyInstallation(2,.14);assert.ok(I.panels[4].position.y>hero.position.y+2.395,'Top lid must first move upward');
t.applyInstallation(2,.45);assert.equal(I.innerFilm.scale.y,1,'Film removed before carton sides laid down');
for(let i=0;i<4;i++){const normal=new THREE.Vector3(i<2?0:1,0,i<2?1:0).applyQuaternion(I.panels[i].quaternion);assert.ok(Math.abs(normal.y)>.999,'Carton side is not laid flat');}
const laid=I.panels.map(m=>m.position.clone());let lastBottom=-Infinity;
for(const p of[.46,.50,.54,.58,.62]){t.applyInstallation(2,p);assert.ok(I.innerFilm.position.y>=lastBottom,'Film bottom moved downward');lastBottom=I.innerFilm.position.y;assert.ok(Math.abs(I.innerFilm.position.y+2.32*I.innerFilm.scale.y-(hero.position.y+2.32))<1e-8,'Film top should remain fixed while peeling');for(let i=0;i<5;i++)assert.ok(I.panels[i].position.distanceTo(laid[i])<1e-8,'Cardboard collected before inner film removal');}
t.applyInstallation(2,.67);assert.equal(I.innerFilm.visible,false);assert.equal(I.filmBundle.visible,true);assert.equal(t.installationState(2,.67).waste,0,'Waste cart left before packing collection');
t.applyInstallation(2,1);assert.equal(I.pallet.position.z,t.MOTION.unpackZ);assert.equal(I.pallet.position.x,3);assert.ok(I.filmBundle.position.distanceTo(I.wasteCart.position)<1.5);assert.ok(I.panels.every(m=>m.position.distanceTo(I.wasteCart.position)<1.5));
for(let sample=0;sample<=80;sample++){t.applyInstallation(2,.77+.08*sample/80);t.scene.updateMatrixWorld(true);const rackBox=new THREE.Box3().setFromObject(hero);for(const material of I.panels)assert.ok(!rackBox.intersectsBox(new THREE.Box3().setFromObject(material)),'Collected packing crosses the cabinet');}
t.applyInstallation(2,1);const cargo=[...I.panels,I.pallet,I.filmBundle].map(m=>({m,position:m.position.clone()}));t.applyInstallation(3,0);for(const item of cargo)assert.ok(item.position.distanceTo(item.m.position)<1e-8,'Packaging teleported at next-stage boundary');
for(const p of[0,.2,.4,.59,.6,.7]){t.applyInstallation(3,p);assert.equal(I.pallet.position.x,3);assert.equal(I.pallet.position.z,8.2);assert.equal(t.installationState(3,p).waste,0);}
t.applyInstallation(3,.6);assert.equal(hero.position.z,3.95,'Pallet recovery started before rack loaded');
t.applyInstallation(3,.89);assert.ok(I.pallet.position.distanceTo(I.wasteCart.position)<1.5,'Pallet not collected after rack loading');
t.applyInstallation(3,1);for(const w of I.workers){assert.ok(w.position.z<3,'Worker did not enter room');assert.ok(Math.abs(w.position.y-t.MOTION.floorY)<1e-8,'Worker not on room floor');}
// 已拆下的纸板、栈板运动不得切入机柜；升降阶段所有人员留在平台外。
for(let k=0;k<=100;k++){t.applyInstallation(3,.72+.28*k/100);t.scene.updateMatrixWorld(true);assert.ok(!new THREE.Box3().setFromObject(I.pallet).intersectsBox(new THREE.Box3().setFromObject(hero)),'Pallet crosses loaded rack');}
console.log('PASS: no workers in step 1; indoor boards stop before rack footprint; unpack at turned corridor corner; pallet waits for lift loading; workers receive from room side.');
console.log('PASS: five carton faces separate and lay flat before bottom-up film peel; pallet, carton and film are collected and hauled together without boundary jumps.');
console.log('PASS: 8 stages / 968 sampled scene states / one persistent moving rack / four articulated workers.');
console.log('PASS: all stage boundaries continuous, lift aligns before exit, 6 power cables and 2 manifold hoses connect.');
console.log('PASS: pause deterministic, board coverage continuous, no invalid model transforms.');
// 固定流程必须严格按承重脚落地、调平、M12 紧固顺序完成。
t.applyInstallation(5,0);t.scene.updateMatrixWorld(true);
const footStart=I.feet.map(f=>f.userData.nut.rotation.y);
assert.equal(I.bolts.filter(b=>b.visible).length,0);
t.applyInstallation(5,.32);t.scene.updateMatrixWorld(true);
for(let i=0;i<4;i++){
 const d=I.feet[i].userData;
 assert.equal(d.lower,1);assert.ok(d.nut.rotation.y>footStart[i]);
 const center=d.pad.getWorldPosition(new THREE.Vector3());
 assert.ok(Math.abs(center.y-.008*Math.cos(hero.rotation.x)-.016)<1e-8,'Foot not contacting floor');
}
assert.ok(hero.rotation.x>0,'Missing leveling adjustment');
t.applyInstallation(5,.68);t.scene.updateMatrixWorld(true);
assert.equal(hero.rotation.x,0);assert.equal(hero.rotation.z,0);
assert.equal(elements.get('viewport').dataset.levelHorizontal,'0.000');
assert.equal(elements.get('viewport').dataset.levelVertical,'90.000');
assert.equal(I.bolts.filter(b=>b.visible).length,0,'Bolts installed before leveling');
for(let i=0;i<4;i++){
 t.applyInstallation(5,.70+i*.075+.015);
 assert.equal(I.bolts.filter(b=>b.visible).length,i+1,'Incorrect sequential bolt installation');
 assert.ok(I.bolts[i].userData.screw.position.y>0);
}
t.applyInstallation(5,1);t.scene.updateMatrixWorld(true);
assert.equal(I.bolts.filter(b=>b.userData.installed).length,4);
assert.equal(I.bolts.filter(b=>b.position.z>hero.position.z).length,2);
assert.equal(I.bolts.filter(b=>b.position.z<hero.position.z).length,2);
for(const b of I.bolts){assert.equal(b.userData.shaft.geometry.parameters.radiusTop,.006);assert.equal(b.userData.screw.position.y,0);assert.ok(Math.abs(Math.abs(b.position.z-hero.position.z)-.65)<1e-8);}
for(const f of I.feet){assert.ok(Math.abs(new THREE.Box3().setFromObject(f.userData.pad).min.y-.016)<1e-8);}
for(const stage of[5,6,7]){t.applyInstallation(stage,.5);assert.equal(I.workers.filter(w=>w.visible).length,2);}
t.applyInstallation(6,.5);assert.ok(I.workers[1].visible&&I.workers[1].position.y>1,'Electrical installer was hidden');
console.log('PASS: two installers after placement; four rotating feet contact floor; level converges to 0°/90° before four sequential M12 anchors, two per short edge.');
console.log('Demo duration:',t.STEPS.reduce((n,s)=>n+s.duration,0)/1000,'seconds');
t.applyInstallation(7,1);t.scene.updateMatrixWorld(true);
assert.equal(I.manifold.children.filter(o=>o.name.endsWith('downward-port')).length,2);
assert.equal(I.caps.length,2);
for(const [i,name] of ['secondary-supply-main','secondary-return-main'].entries()){
 const main=I.secondary.getObjectByName(name),center=main.getWorldPosition(new THREE.Vector3());
 assert.ok(Math.abs(center.y-.016+.60)<1e-9,'Main center not 60 cm below floor');
 assert.ok(center.z> -1.42&&center.z<-.2,'Main is outside inter-row aisle');
 const hose=I.hoses[i],curve=hose.geometry.parameters.path,port=new THREE.Vector3(...hose.userData.port);
 assert.ok(curve.getPoint(1).distanceTo(port)<1e-9,'Hose misses manifold bottom port');
 assert.ok(curve.getTangent(1).dot(new THREE.Vector3(0,1,0))>.999,'Hose does not enter upward');
 const connector=I.manifold.getObjectByName(i===0?'supply-downward-port':'return-downward-port');
 assert.equal(connector.userData.direction[1],-1);
 assert.ok(Math.abs(connector.getWorldPosition(new THREE.Vector3()).y-.22)<1e-8);
}
console.log('PASS: device 1 removed; two downward bottom manifold ports; two inter-row mains at floor + 600 mm; hoses enter ports from below.');
for(const stage of[0,1]){t.applyInstallation(stage,1);assert.equal(I.wasteCart.visible,false,'Waste cart entered before cabinet arrived');}
t.applyInstallation(2,0);assert.equal(I.wasteCart.visible,true);assert.equal(I.wasteCart.position.x,-6);
t.applyInstallation(2,.12);t.scene.updateMatrixWorld(true);assert.equal(I.wasteCart.position.x,-2);assert.equal(I.wasteCart.position.z,8.425);
const parked=I.wasteCart.position.clone(),parkedQ=I.wasteCart.quaternion.clone();
const cartBox=new THREE.Box3().setFromObject(I.wasteCart);assert.ok(cartBox.min.z>=7.725&&cartBox.max.z<=9.125,'Parked cart outside corridor boards');
for(const stage of[2,3]){t.applyInstallation(stage,stage===2?1:.89);assert.ok(I.wasteCart.position.distanceTo(parked)<1e-8);assert.ok(I.wasteCart.quaternion.angleTo(parkedQ)<1e-8);}
for(let frame=0;frame<=120;frame++){
 t.applyInstallation(2,frame/120);t.scene.updateMatrixWorld(true);
 assert.ok(!new THREE.Box3().setFromObject(I.wasteCart).intersectsBox(new THREE.Box3().setFromObject(hero)),'Entering cart intersects cabinet');
}
t.applyInstallation(3,.99);assert.equal(I.wasteCart.visible,true);
for(const stage of[3,4,5,6,7]){t.applyInstallation(stage,1);assert.equal(I.wasteCart.visible,false);for(const item of[...I.panels,I.pallet,I.filmBundle])assert.equal(item.visible,false,'Waste cargo left visible at garbage point');}
assert.equal(I.wasteCart.position.x,-1);assert.equal(I.wasteCart.position.z,10.1);
console.log('PASS: cart enters after arrival, parks on pre-corner boards, waits for pallet loading and hides with cargo at garbage point.');
// 模型信息登记与可见性过滤；新增双击功能不应选到已经隐藏的模型。
const infoCode=html.slice(html.indexOf('function registerModelInfo(){'),html.indexOf('function bindSceneInteraction(){'));
vm.runInContext(infoCode+'\nregisterModelInfo();this.infoTest={modelOwner,modelVisible};',scope);
assert.equal(scope.infoTest.modelOwner(I.hero.children[0]),I.hero);
assert.match(I.hero.userData.modelInfo.name,/9/);
assert.ok(I.manifold.userData.modelInfo.fields.some(([k,v])=>v.includes('2 个')));
assert.ok(I.secondary.userData.modelInfo.fields.some(([k,v])=>v.includes('600 mm')));
assert.equal(scope.infoTest.modelVisible(I.wasteCart.children[0]),false);
t.applyInstallation(2,.5);assert.equal(scope.infoTest.modelVisible(I.wasteCart.children[0]),true);
const roads=[];t.scene.traverse(m=>{if(m.isMesh&&m.material.color?.getHexString()==='aeafac')roads.push(m);});
assert.equal(roads.length,2,'Extra corridor floor remains');
assert.deepEqual(roads.map(m=>m.name).sort(),['cabinet-route-straight','cabinet-route-turn']);
assert.ok(html.includes("canvas.addEventListener('dblclick'"));
assert.ok(html.includes('clearTimeout(pendingClick);const hit=pick(e)'));
assert.ok(html.includes("$('model-info').showModal()"));
console.log('PASS: model metadata registered, hidden models excluded from picking; only two L-route corridor floor meshes remain.');
// 玻璃地板下必须是真实空腔，不能仅把透明材质覆盖在不透明地台上。
t.applyInstallation(7,1);t.scene.updateMatrixWorld(true);
const aisle=t.scene.userData.hotAisle;assert.ok(aisle);
const panes=aisle.children.filter(m=>m.name==='transparent-glass-floor');assert.equal(panes.length,7);
for(const pane of panes){assert.ok(pane.material.transparent&&pane.material.opacity<.3);assert.ok(Math.abs(new THREE.Box3().setFromObject(pane).max.y-.016)<1e-8);}
assert.equal(aisle.children.filter(m=>m.name==='hot-aisle-glass-door').length,4);
assert.ok(aisle.getObjectByName('hot-aisle-glass-roof'));
const solid=t.scene.children.filter(m=>m.name==='raised-floor-solid');assert.equal(solid.length,4);
const ray=new THREE.Raycaster(new THREE.Vector3(-1.8,1,-1.1),new THREE.Vector3(0,-1,0));
assert.equal(ray.intersectObjects(solid).length,0,'Opaque slab obstructs glass floor');
const tiles=t.scene.getObjectByName('antistatic-floor');assert.equal(ray.intersectObject(tiles).length,0,'Opaque tiles obstruct glass floor');
for(const name of['secondary-supply-main','secondary-return-main']){const pipe=I.secondary.getObjectByName(name),bounds=new THREE.Box3().setFromObject(pipe);assert.ok(bounds.max.y<-.5&&bounds.min.y>-.8);for(const slab of solid)assert.ok(!bounds.intersectsBox(new THREE.Box3().setFromObject(slab)));}
for(const rack of t.racks.filter(r=>r.position.z<0))assert.ok(Math.abs(rack.rotation.y-Math.PI)<1e-8,'Back row does not face away from hot aisle');
for(const hose of I.hoses){const curve=hose.geometry.parameters.path;for(let i=0;i<1000;i++){const pt=curve.getPoint(i/999);if(Math.abs(pt.y-.0035)<.015){for(const pane of aisle.children.filter(m=>m.isMesh&&m.material.transparent&&m.position.y<.03)){const bounds=new THREE.Box3().setFromObject(pane);assert.ok(!bounds.containsPoint(pt),'Hose crosses solid glass instead of service opening');}}}}
assert.ok(!html.includes('box(scene,.67,.018,.83,1.64'));
console.log('PASS: grille removed; enclosed hot aisle with glass floor over real trench; secondary mains at floor - 600 mm and hoses pass through service openings.');
// 使用真实 Three 几何/相机核对特写同步，渲染器替身仅跳过 GPU 创建。
scope.THREE={...THREE,WebGLRenderer:class {constructor(){this.domElement={};}setPixelRatio(){}setSize(){}render(){}}};
scope.devicePixelRatio=1;elements.get('fix-view')?.append;
scope.$('fix-view').append=()=>{};
vm.runInContext('initFixingDetail();',scope);
const D=I.fixDetail;assert.equal(D.feet.length,4);assert.equal(D.bolts.length,4);
for(const stage of[0,1,2,3,4,6]){t.applyInstallation(stage,.5);assert.equal(elements.get('fix-detail').hidden,true);}
const mainCamera=t.camera.position.clone();
for(const p of[0,.10,.22,.32,.48,.68,.71,.74,.76,.86,.94,1]){
 t.applyInstallation(5,p);assert.equal(elements.get('fix-detail').hidden,false);
 assert.ok(t.camera.position.equals(mainCamera),'Detail changed main camera');
 for(let i=0;i<4;i++){assert.ok(D.feet[i].children[0].position.equals(I.feet[i].children[0].position));assert.ok(D.bolts[i].children[1].position.equals(I.bolts[i].children[1].position));}
 D.scene.traverse(o=>assert.ok(o.position.toArray().every(Number.isFinite),'Invalid detail transform'));
}
assert.ok(D.rings.every(r=>r.visible));assert.equal(elements.get('fix-horizontal').textContent,'0.000°');assert.equal(elements.get('fix-vertical').textContent,'90.000°');
assert.equal(elements.get('fix-phase-2').dataset.state,'done');assert.equal(D.wrench.visible,false);
t.applyInstallation(5,.745);assert.equal(D.wrench.visible,true,'Wrench missing during tightening');
console.log('PASS: fixing detail uses synchronized foot/bolt geometry, contact rings, two gauges, sequential insertion/tightening and a separate camera.');
t.applyInstallation(5,1);t.scene.updateMatrixWorld(true);
for(const bolt of I.bolts){
 assert.ok(Math.abs(.3-Math.abs(bolt.position.x-hero.position.x)-.05)<1e-9,'Side edge distance is not 50 mm');
 assert.ok(Math.abs(.7-Math.abs(bolt.position.z-hero.position.z)-.05)<1e-9,'Front/rear edge distance is not 50 mm');
 const bounds=new THREE.Box3().setFromObject(bolt);
 assert.ok(bounds.min.x>=hero.position.x-.3-1e-8&&bounds.max.x<=hero.position.x+.3+1e-8);
 assert.ok(bounds.min.z>=hero.position.z-.7-1e-8&&bounds.max.z<=hero.position.z+.7+1e-8);
}
console.log('PASS: all four M12 assemblies inside cabinet footprint; centers inset 50 mm from both adjacent edges.');
assert.ok(html.includes('labelsVisible=false'));assert.ok(html.includes('playbackRate=2;'));assert.ok(html.includes('id="labels-toggle" aria-pressed="false"'));assert.ok(html.includes('group.visible=labelsVisible'));
t.applyInstallation(7,1);t.scene.updateMatrixWorld(true);
for(const hose of I.hoses)assert.ok(hose.userData.port[0]<hero.position.x,'Manifold not on left');
assert.ok(Math.abs(I.hoses[0].userData.port[0]-I.hoses[1].userData.port[0])>.09);
for(const q of[0,.1,.30,.55,.80,1]){
 t.applyInstallation(7,.12+q*.40);
 assert.equal(elements.get('fix-detail').hidden,false);assert.equal(elements.get('fix-gauges').hidden,true);assert.equal(D.pipeActive,true);
 assert.equal(I.caps[0].visible,q<.18);assert.equal(I.hoses[0].visible,q>=.18);
 if(q>.18&&q<.75){const end=I.hoses[0].geometry.parameters.path.getPoint(1);assert.ok(end.y<I.hoses[0].userData.port[1]);}
 D.pipeScene.traverse(o=>assert.ok(o.position.toArray().every(Number.isFinite)));
}
t.applyInstallation(7,1);assert.ok(D.pipePorts.every(p=>p.ring.visible));assert.ok(D.pipeHands.every(p=>!p.visible));
for(const hose of I.hoses){assert.ok(hose.userData.coupler.visible);assert.ok(hose.geometry.parameters.path.getPoint(1).distanceTo(new THREE.Vector3(...hose.userData.port))<1e-8);}
console.log('PASS: default 2x and labels off; left-side manifold pair; synchronized cap removal, alignment, insertion, locking, worker motion and pipe close-up.');
// 拆开、放倒、揭膜等待及收集阶段，纸板完整包围盒均不得切入任何散力板。
for(const stage of[2,3])for(let frame=0;frame<=240;frame++){
 t.applyInstallation(stage,frame/240);t.scene.updateMatrixWorld(true);
 for(const panel of I.panels){if(!panel.visible)continue;const paper=new THREE.Box3().setFromObject(panel);for(const board of I.boards){const floor=new THREE.Box3().setFromObject(board);assert.ok(!paper.intersectsBox(floor),'Carton intersects board at '+stage+'/'+frame+' panel '+panel.userData.index);}}
}
t.applyInstallation(2,.5);t.scene.updateMatrixWorld(true);
const rearBottom=new THREE.Box3().setFromObject(I.panels[1]).min.y;
assert.ok(rearBottom>=-.7385+.0059,'Laid carton missing board clearance');
console.log('PASS: all five carton panels clear load-spreading boards during rotation, flat placement and collection.');
