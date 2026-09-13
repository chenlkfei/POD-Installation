function refinedWorkerGeometry(){
 if(refinedWorkerGeometry.cache)return refinedWorkerGeometry.cache;
 const combine=parts=>{const positions=[],normals=[];for(const [geometry,scale=[1,1,1],position=[0,0,0],rotation=null]of parts){const geo=geometry.index?geometry.toNonIndexed():geometry.clone();const q=new THREE.Quaternion();if(rotation)q.setFromEuler(new THREE.Euler(...rotation));geo.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position),q,new THREE.Vector3(...scale)));positions.push(...geo.attributes.position.array);normals.push(...geo.attributes.normal.array);geo.dispose();geometry.dispose();}const out=new THREE.BufferGeometry();out.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));out.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));out.computeBoundingSphere();return out;};
 const sphere=()=>new THREE.SphereGeometry(1,20,14),cube=()=>new THREE.BoxGeometry(1,1,1);
 const hand=grip=>{const pieces=[[sphere(),[.029,.027,.014],[0,0,0]]];for(let i=0;i<4;i++){const x=(i-1.5)*.013,l=[.026,.032,.030,.022][i];pieces.push([new THREE.CapsuleGeometry(.0055,l*.45,3,8),[1,1,1],[x,-.026-l*.25,grip?.007:0],grip?[.9,0,0]:null]);pieces.push([sphere(),[.0055,l*.24,.0055],[x,-.030-l*.45,grip?.017:.003]]);}pieces.push([new THREE.CapsuleGeometry(.007,.021,3,8),[1,1,1],[.03,-.006,grip?.01:0],[0,0,.6]]);return combine(pieces);};
 const torso=new THREE.LatheGeometry([[.14,.79],[.158,.88],[.16,.99],[.172,1.12],[.19,1.25],[.174,1.30],[.083,1.335]].map(([r,y])=>new THREE.Vector2(r,y)),28);torso.scale(1,1,.68);
 const footwear=combine([[sphere(),[.49,.60,.48],[0,.08,0]],[cube(),[.96,.24,.98],[0,-.38,0]],[sphere(),[.42,.71,.24],[0,.47,-.20]]]);
 const dome=new THREE.SphereGeometry(.126,28,18,0,Math.PI*2,0,Math.PI*.51);dome.scale(1,1,1.08);
 const rib=new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[0,1.585,.131],[0,1.68,.085],[0,1.718,0],[0,1.679,-.093],[0,1.585,-.137]].map(p=>new THREE.Vector3(...p))),24,.005,6,false);
 const straps=[];for(const side of[-1,1])straps.push([new THREE.TubeGeometry(new THREE.CatmullRomCurve3([[side*.091,1.58,-.025],[side*.082,1.44,.018],[side*.044,1.359,.056],[0,1.35,.063]].map(p=>new THREE.Vector3(...p))),16,.003,6,false)]);
 return refinedWorkerGeometry.cache={torso,sphere:sphere(),footwear,dome,rib,straps:combine(straps),openHand:hand(false),gripHand:hand(true),upper:new THREE.CylinderGeometry(1,.86,1,16,3),lower:new THREE.CylinderGeometry(1,.78,1,16,3)};
}
function createWorker(index){
 const g=new THREE.Group();g.name='construction-worker-'+(index+1);g.userData.refined=true;scene.add(g);const skeleton=new THREE.Group();g.add(skeleton);const G=refinedWorkerGeometry();
 const part=(parent,geometry,material,scale,position)=>{const o=new THREE.Mesh(geometry,material);if(scale)o.scale.set(...scale);if(position)o.position.set(...position);o.castShadow=true;parent.add(o);return o;};
 const ball=(parent,r,x,y,z,mat=M.worker)=>part(parent,G.sphere,mat,[r,r,r],[x,y,z]);
 part(skeleton,G.torso,M.worker);part(skeleton,G.sphere,M.worker,[.145,.098,.105],[0,.82,0]);rod(skeleton,[0,1.31,0],[0,1.43,0],.046,M.worker);
 const head=part(skeleton,G.sphere,M.worker,[.088,.141,.09],[0,1.463,.006]);head.name='blank-head';
 const helmet=part(skeleton,G.dome,M.helmet,null,[0,1.583,0]);helmet.name='yellow-safety-helmet';
 const brim=new THREE.Mesh(new THREE.CylinderGeometry(.148,.146,.013,32),M.helmet);brim.position.set(0,1.582,.009);brim.scale.z=1.12;skeleton.add(brim);part(skeleton,G.rib,M.helmet);part(skeleton,G.straps,M.worker);
 const legs=[],arms=[];
 for(const side of[-1,1]){
  const thigh=rod(g,[0,0,0],[0,1,0],.074,M.worker),shin=rod(g,[0,0,0],[0,1,0],.057,M.worker);thigh.geometry=G.upper;shin.geometry=G.lower;
  const knee=ball(g,.072,0,0,0),foot=part(g,G.footwear,M.worker,[.135,.09,.235],[0,0,0]);legs.push({side,thigh,shin,knee,foot});
  const upper=rod(g,[0,0,0],[0,1,0],.057,M.worker),fore=rod(g,[0,0,0],[0,1,0],.047,M.worker);upper.geometry=G.upper;fore.geometry=G.lower;
  const shoulder=ball(g,.071,0,0,0),joint=ball(g,.057,0,0,0),hand=part(g,G.openHand,M.worker),elbow=new THREE.Group();g.add(elbow);arms.push({side,upper,fore,shoulder,joint,hand,elbow});
 }
 g.userData={legs,arms,skeleton,index,segments:[],refined:true};return g;
}
function poseRefinedHands(worker,grip=false){const G=refinedWorkerGeometry();for(const arm of worker.userData.arms){arm.hand.geometry=grip?G.gripHand:G.openHand;arm.hand.scale.set(arm.side,1,1);const forward=arm.hand.position.clone().sub(arm.shoulder.position);if(forward.lengthSq()>.00001)arm.hand.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),forward.normalize());}}
function bentJoint(a,b,upper,lower,preference){
 const delta=b.clone().sub(a),d=Math.max(.001,delta.length()),axis=delta.divideScalar(d),along=(upper*upper-lower*lower+d*d)/(2*d),bend=preference.clone().addScaledVector(axis,-preference.dot(axis));
 if(bend.lengthSq()<.00001)bend.set(1,0,0).addScaledVector(axis,-axis.x);bend.normalize();return a.clone().addScaledVector(axis,along).addScaledVector(bend,Math.sqrt(Math.max(0,upper*upper-along*along)));
}
// OBB 平面碰撞，保留真实柜体朝向；半径覆盖人体肩宽、迈步与手掌厚度。
function rackColliders(s){return racks.filter(r=>modelVisible(r)).map(r=>({x:r.position.x,z:r.position.z,y:r.position.y,top:r.position.y+2.28,yaw:r.rotation.y,hx:r===installation.hero?(s.unpack<.99?.46:.325):.315,hz:r===installation.hero?(s.unpack<.99?.985:.895):.725}));}
function pushOut(point,obstacle,radius){
 if(point.y>obstacle.top+.01||point.y+1.70<obstacle.y)return false;
 const c=Math.cos(obstacle.yaw),s=Math.sin(obstacle.yaw),dx=point.x-obstacle.x,dz=point.z-obstacle.z,lx=dx*c-dz*s,lz=dx*s+dz*c;
 const qx=Math.max(-obstacle.hx,Math.min(obstacle.hx,lx)),qz=Math.max(-obstacle.hz,Math.min(obstacle.hz,lz));let nx=lx-qx,nz=lz-qz,d=Math.hypot(nx,nz),amount;
 if(d>=radius)return false;
 if(d<1e-8){const gapX=obstacle.hx-Math.abs(lx),gapZ=obstacle.hz-Math.abs(lz);if(gapX<gapZ){nx=lx>=0?1:-1;nz=0;amount=gapX+radius;}else{nx=0;nz=lz>=0?1:-1;amount=gapZ+radius;}}
 else{nx/=d;nz/=d;amount=radius-d;}
 point.x+=(nx*c+nz*s)*(amount+.0001);point.z+=(-nx*s+nz*c)*(amount+.0001);return true;
}
// Three lift-and-return strokes; driven by process time so pause/seek stay deterministic.
function filmLiftMotion(p){
 const q=clamp01((p-UNPACKING.film[0])/(UNPACKING.film[1]-UNPACKING.film[0])),cycles=3;
 const stroke=Math.min(cycles-1,Math.floor(q*cycles)),u=q*cycles-stroke;
 const lift=smooth(Math.min(1,u/.62)),returning=smooth((u-.62)/.38);
 return {hands:lift*(1-returning),removed:(stroke+lift)/cycles};
}
function ladderFoot(n){return {y:1.345*n/6,z:n===6?0:.24+(6-n)*.22};}
function ladderBody(progress){
 const u=clamp01(progress)*6,n=Math.min(5,Math.floor(u)),f=u-n,lo=ladderFoot(n),hi=ladderFoot(n+1);
 const t=(smooth(clamp01(f*2))+smooth(clamp01(f*2-1)))/2;
 return {y:blend(lo.y,hi.y,t),z:blend(lo.z,hi.z,t)};
}
function poseWorker(g,intent,obstacles,s){
 const {x,y,z,yaw,gait,push,reach,kneel=0}=intent;g.position.set(x,y,z);g.rotation.set(0,yaw,0);const data=g.userData,drop=kneel*.40;
 data.skeleton.position.y=-drop;data.skeleton.rotation.x=push?.055:kneel*.10;data.segments=[];
 const world=v=>v.clone().applyAxisAngle(new THREE.Vector3(0,1,0),yaw).add(g.position);
 const local=v=>v.clone().sub(g.position).applyAxisAngle(new THREE.Vector3(0,1,0),-yaw);
 const safeSegment=(a,b,r)=>{for(let j=0;j<=10;j++){const q=world(a.clone().lerp(b,j/10));for(const o of obstacles){if(q.y<o.y-r||q.y>o.top+r)continue;const test={x:q.x,y:q.y,z:q.z};if(pushOut(test,{...o,top:100},r))return false;}}return true;};
 for(const leg of data.legs){const swing=(intent.stair||s.stage===6&&data.index===1&&s.p>=.15&&s.p<=.94)?0:gait?Math.sin(gait+(leg.side===1?Math.PI:0)):0,hip=new THREE.Vector3(leg.side*.095,.83-drop,0),ankle=new THREE.Vector3(leg.side*.11,.10+Math.max(0,swing)*.045,swing*.105+kneel*.07),knee=bentJoint(hip,ankle,.41,.39,new THREE.Vector3(0,0,1));
  if(intent.stair){
   const {progress,origin}=intent.stair,u=clamp01(progress)*6,n=Math.min(5,Math.floor(u)),f=u-n;
   const lo=ladderFoot(n),hi=ladderFoot(n+1),move=smooth(f);
   // Alternate the moving foot; the other remains planted until the next tread.
   const first=leg.side===(n%2?1:-1),phase=clamp01(first?f*2:(f-.5)*2),a=smooth(phase);
   const point=new THREE.Vector3(origin.x-leg.side*.11,origin.y+blend(lo.y,hi.y,a)+.09+Math.sin(phase*Math.PI)*.08,origin.z+blend(lo.z,hi.z,a));
   if(progress>=1)point.set(origin.x-leg.side*.11,origin.y+1.435,origin.z);
   ankle.copy(local(point));knee.copy(bentJoint(hip,ankle,.41,.39,new THREE.Vector3(0,0,1)));
  }
  setBeam(leg.thigh,hip.toArray(),knee.toArray(),.074);setBeam(leg.shin,knee.toArray(),ankle.toArray(),.057);leg.knee.position.copy(knee);leg.foot.position.set(ankle.x,ankle.y-.055,ankle.z+.042);data.segments.push({a:world(hip),b:world(knee),r:.074},{a:world(knee),b:world(ankle),r:.057});
 }
 for(const arm of data.arms){const a=new THREE.Vector3(arm.side*.207,1.28-drop,0),rest=new THREE.Vector3(arm.side*.224,.78-drop,gait?Math.sin(gait+(arm.side===1?Math.PI:0))*.09:.045);let hand=rest.clone();
  if(s.stage===7&&kneel>.1){const q=clamp01(s.hoses-Math.min(1,Math.floor(s.hoses))),insert=smooth((q-.45)/.30),lock=Math.sin(q*45)*(q>.75?.025:0);hand.set(arm.side*.22+lock,.74-drop+insert*.06,.19+insert*.065);}
  else if(kneel>.1)hand.set(arm.side*.22,.74-drop,.20+Math.sin(s.p*90)*.025);
  else if(intent.stair)hand.set(arm.side*.30,1.05,.22);
  else if(reach&&s.stage===2){const lift=filmLiftMotion(s.p).hands;hand.set(arm.side*.21,1.04+.77*lift-drop,.22-.06*lift);}
  else if(reach)hand.set(arm.side*.21,1.83-drop,.16);
  else if(push){const shoulder=world(a),o=obstacles.find(o=>Math.abs(o.x-s.x)<.0001&&Math.abs(o.z-s.z)<.0001);if(o){const c=Math.cos(o.yaw),sn=Math.sin(o.yaw),dx=shoulder.x-o.x,dz=shoulder.z-o.z,lx=dx*c-dz*sn,lz=dx*sn+dz*c;const q={x:o.x+Math.max(-o.hx,Math.min(o.hx,lx))*c+Math.max(-o.hz,Math.min(o.hz,lz))*sn,y:shoulder.y,z:o.z-Math.max(-o.hx,Math.min(o.hx,lx))*sn+Math.max(-o.hz,Math.min(o.hz,lz))*c};pushOut(q,o,.065);const target=local(new THREE.Vector3(q.x,q.y,q.z));if(target.distanceTo(a)<.60)hand.copy(target);else hand.set(arm.side*.23,.99-drop,.25);}}
  const delta=hand.clone().sub(a);if(delta.length()>.585)hand.copy(a).add(delta.setLength(.585));
  let joint=bentJoint(a,hand,.30,.30,new THREE.Vector3(0,0,-1));
  if(!safeSegment(a,joint,.057)||!safeSegment(joint,hand,.054)){hand.copy(rest);joint=bentJoint(a,hand,.30,.30,new THREE.Vector3(0,0,1));}
  arm.shoulder.position.copy(a);arm.joint.position.copy(joint);arm.hand.position.copy(hand);setBeam(arm.upper,a.toArray(),joint.toArray(),.057);setBeam(arm.fore,joint.toArray(),hand.toArray(),.047);arm.elbow.position.copy(hand).add(new THREE.Vector3(0,.29,0));
  data.segments.push({a:world(a),b:world(joint),r:.057},{a:world(joint),b:world(hand),r:.054});
 }
 poseRefinedHands(g,!!reach||kneel>.1);
}
function resolveWorkers(intents,s,seconds){
 const I=installation,obstacles=rackColliders(s);if(s.stage>=3)obstacles.push({x:3,z:3.95,y:-.85,top:4,yaw:0,hx:.72,hz:.94,kind:'lift-exclusion'});const radius=.35+((s.stage===5||s.stage===7)?.32*Math.sqrt(smooth((s.p-(s.stage===7?.12:0))/.12)*(1-smooth((s.p-.94)/.06))):0),previous=I.collisionFrame,continuous=previous&&seconds>previous.time&&seconds-previous.time<.30;
 // 将一次位移拆成小步并沿障碍边界滑移，避免从柜体一侧直接跳到另一侧。
 const poses=intents.map((v,i)=>{const q={...v};if(continuous){const old=previous.poses[i],steps=Math.max(1,Math.ceil(Math.hypot(q.x-old.x,q.z-old.z)/.055)),position={x:old.x,y:q.y,z:old.z};for(let k=1;k<=steps;k++){const tx=blend(old.x,q.x,k/steps),tz=blend(old.z,q.z,k/steps),dx=tx-position.x,dz=tz-position.z,len=Math.hypot(dx,dz),amount=Math.min(1,.09/(len||1));position.x+=dx*amount;position.z+=dz*amount;for(let pass=0;pass<5;pass++)for(const o of obstacles)pushOut(position,o,radius);}q.x=position.x;q.z=position.z;}return q;});
 for(let pass=0;pass<30;pass++){
  for(const q of poses)for(const o of obstacles)pushOut(q,o,radius);
  for(let i=0;i<poses.length;i++)for(let j=i+1;j<poses.length;j++){if(!I.workers[i].visible||!I.workers[j].visible)continue;const a=poses[i],b=poses[j];if(Math.abs(a.y-b.y)>1.65)continue;let dx=b.x-a.x,dz=b.z-a.z,d=Math.hypot(dx,dz);if(d<radius*2+.025){if(d<.0001){dx=i%2?1:0;dz=i%2?0:1;d=1;}const correction=(radius*2+.026-Math.hypot(b.x-a.x,b.z-a.z))/2;a.x-=dx/d*correction;a.z-=dz/d*correction;b.x+=dx/d*correction;b.z+=dz/d*correction;}}
 }
 for(let i=0;i<poses.length;i++){const q=poses[i];if(continuous){const distance=Math.hypot(q.x-previous.poses[i].x,q.z-previous.poses[i].z);I.workers[i].userData.stride=(I.workers[i].userData.stride||0)+distance*15;q.gait=distance>.00005?I.workers[i].userData.stride:0;}poseWorker(I.workers[i],q,obstacles,s);}
 I.collisionFrame={time:seconds,poses:poses.map(p=>({...p})),obstacles};
}
// 仅第 8 步视角过渡结束后启用：只淡化遮挡主角的其他机柜。
// 人员、工具、外包装、CDU 和机房环境不参与透明处理。
function updateCabinetVisibility(){
 const I=installation;if(!I)return;
 // Pipeline is an overview of all cabinets: never ghost a completed neighbouring cabinet.
 if(typeof pipeline!=='undefined'&&pipeline?.enabled){
  for(const context of pipeline.contexts)for(const item of context.occlusion||[]){
   if(!item.faded)continue;
   for(const entry of item.original||[]){entry.m.material=entry.material;entry.m.castShadow=entry.shadow;entry.m.renderOrder=entry.order;}
   item.faded=false;
  }
  $('viewport').dataset.transparentOccluders='0';return;
 }
 if(I.hero.userData.step!==7||transition){
  for(const item of I.occlusion||[]){if(!item.faded)continue;for(const entry of item.original||[]){entry.m.material=entry.material;entry.m.castShadow=entry.shadow;entry.m.renderOrder=entry.order;}item.faded=false;}
  $('viewport').dataset.transparentOccluders='0';return;
 }
 scene.updateMatrixWorld(true);camera.updateMatrixWorld(true);
 if(!I.occlusion){I.occlusion=[];
  for(const root of racks){if(root===I.hero||root.userData.referenceId===1)continue;const meshes=[];root.traverse(o=>{if(o.isMesh)meshes.push(o);});I.occlusion.push({root,meshes,box:new THREE.Box3().setFromObject(root),faded:false,original:null});}
 }
 const project=box=>{const r={minX:Infinity,maxX:-Infinity,minY:Infinity,maxY:-Infinity,minZ:Infinity,maxZ:-Infinity};for(const x of[box.min.x,box.max.x])for(const y of[box.min.y,box.max.y])for(const z of[box.min.z,box.max.z]){const p=new THREE.Vector3(x,y,z).project(camera);r.minX=Math.min(r.minX,p.x);r.maxX=Math.max(r.maxX,p.x);r.minY=Math.min(r.minY,p.y);r.maxY=Math.max(r.maxY,p.y);r.minZ=Math.min(r.minZ,p.z);r.maxZ=Math.max(r.maxZ,p.z);}return r;};
 const heroBox=new THREE.Box3().setFromObject(I.hero),target=project(heroBox);let count=0;
 // 用可见柜面上的射线确认前后关系，避免把未挡住主角的其他机柜透明化。
 const sightLines=[],ray=new THREE.Raycaster(),visible=o=>{while(o){if(!o.visible)return false;o=o.parent;}return true;};
 for(let ix=0;ix<5;ix++)for(let iy=0;iy<9;iy++){const uv=new THREE.Vector2(blend(target.minX,target.maxX,(ix+.5)/5),blend(target.minY,target.maxY,(iy+.5)/9));ray.setFromCamera(uv,camera);const hit=ray.intersectObject(I.hero,true).find(h=>visible(h.object));if(hit)sightLines.push({ray:ray.ray.clone(),distance:hit.distance});}
 for(const item of I.occlusion){const r=project(item.box),overlap=item.root.visible&&item.box.max.y>heroBox.min.y+.06&&r.minZ<target.maxZ-.0001&&r.maxX>target.minX&&r.minX<target.maxX&&r.maxY>target.minY&&r.minY<target.maxY;
  const fade=overlap&&sightLines.some(line=>{ray.ray.copy(line.ray);ray.far=line.distance-.012;return ray.intersectObject(item.root,true).some(h=>visible(h.object));});
  if(fade)count++;
  if(fade!==item.faded||fade){if(!item.original)item.original=item.meshes.map(m=>({m,material:m.material,shadow:m.castShadow,order:m.renderOrder,ghost:Array.isArray(m.material)?m.material.map(v=>v.clone()):m.material.clone()}));for(const entry of item.original){entry.m.material=fade?entry.ghost:entry.material;entry.m.castShadow=fade?false:entry.shadow;entry.m.renderOrder=fade?20:entry.order;if(fade)for(const mat of(Array.isArray(entry.ghost)?entry.ghost:[entry.ghost])){mat.transparent=true;mat.opacity=.045;mat.depthWrite=false;if(!mat.userData.ghostReady){mat.needsUpdate=true;mat.userData.ghostReady=true;}}}item.faded=fade;}
 }
 $('viewport').dataset.transparentOccluders=String(count);
}

function setBeam(mesh,a,b,r=.034){const v1=new THREE.Vector3(...a),v2=new THREE.Vector3(...b),delta=v2.clone().sub(v1);mesh.position.copy(v1).add(v2).multiplyScalar(.5);mesh.scale.set(r,delta.length(),r);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());}
// 机柜本体使用 OBB 分离轴检测，扫掠途中遇到已安装柜体则停在最后安全位置。
function protectCabinet(s){
 const I=installation,toObb=(x,z,yaw,hx,hz,ox=0,oz=0)=>{const c=Math.cos(yaw),sn=Math.sin(yaw);return{x:x+ox*c+oz*sn,z:z-ox*sn+oz*c,hx,hz,axes:[[c,-sn],[sn,c]]};};
 const overlaps=(a,b)=>[...a.axes,...b.axes].every(axis=>{const extent=o=>o.hx*Math.abs(axis[0]*o.axes[0][0]+axis[1]*o.axes[0][1])+o.hz*Math.abs(axis[0]*o.axes[1][0]+axis[1]*o.axes[1][1]);return Math.abs((a.x-b.x)*axis[0]+(a.z-b.z)*axis[1])<extent(a)+extent(b)-.0003;});
 const collides=p=>{const moving=toObb(p.x,p.z,p.yaw,p.unpack<.99?.455:.30425,p.unpack<.99?.98:.795,-.00425,p.unpack<.99?0:-.080);return racks.some(r=>r!==I.hero&&modelVisible(r)&&p.y<r.position.y+2.27&&p.y+2.27>r.position.y&&overlaps(moving,toObb(r.position.x,r.position.z,r.rotation.y,.30425,.740,-.00425,0)));};
 let safe=I.safeCabinet;const distance=safe?Math.hypot(s.x-safe.x,s.z-safe.z):Infinity;
 if(safe&&safe.stage===s.stage&&s.p>=safe.p&&s.p-safe.p<.06&&distance<1){const steps=Math.max(1,Math.ceil(distance/.035),Math.ceil(Math.abs(s.yaw-safe.yaw)/.035));for(let j=1;j<=steps;j++){const candidate={...s,x:blend(safe.x,s.x,j/steps),z:blend(safe.z,s.z,j/steps),yaw:blend(safe.yaw,s.yaw,j/steps),y:blend(safe.y,s.y,j/steps)};if(typeof pipeline!=='undefined'&&pipeline?.enabled&&s.stage===4)Object.assign(candidate,installationState(4,blend(safe.p,s.p,j/steps)));if(collides(candidate)){Object.assign(s,{x:I.safeCabinet.x,z:I.safeCabinet.z,y:I.safeCabinet.y,yaw:I.safeCabinet.yaw});$('viewport').dataset.cabinetCollision='blocked';return;}I.safeCabinet=candidate;}}
 else if(collides(s)){if(safe)Object.assign(s,{x:safe.x,z:safe.z,y:safe.y,yaw:safe.yaw});$('viewport').dataset.cabinetCollision='blocked';return;}
 I.safeCabinet={...s};$('viewport').dataset.cabinetCollision='clear';
}
// 机柜到达拆包点后小车才进场；装车后驶向垃圾点，到站连同货物隐藏。
function wasteCartState(s){
 const entering=s.stage===2,q=entering?smooth((s.p-WASTE_CART.enter[0])/(WASTE_CART.enter[1]-WASTE_CART.enter[0])):s.stage<2?0:1;
 const entry=typeof pipeline!=='undefined'&&pipeline?.enabled?[[-1,10.1],[-2,10.1],[-2,8.425]]:WASTE_CART.entry;
 const haul=typeof pipeline!=='undefined'&&pipeline?.enabled?[[-2,8.425],[-2,10.1],[-1,10.1]]:MOTION.waste;
 const at=entering||s.stage<2?routeSample(entry,q):routeSample(haul,s.waste);
 // 停车和起步朝向一致，避免满载后突然转向。
 if(s.stage===2||s.stage<2)at.yaw=Math.PI/2;
 return {...at,y:blend(MOTION.roadY-.03,-.79,smooth((at.z-9.15)/.45)),visible:s.stage>=2&&(s.stage<3||s.stage===3&&s.p<1),removed:s.stage>3||s.stage===3&&s.p>=1};
}
// 按纸板旋转后的完整厚度及覆盖范围计算落地高度，避免板边切入散力板。
function cartonClearance(panel,position,quaternion){
 const e=new THREE.Matrix4().makeRotationFromQuaternion(quaternion).elements,half=panel.scale.clone().multiplyScalar(.5);
 const hx=Math.abs(e[0])*half.x+Math.abs(e[4])*half.y+Math.abs(e[8])*half.z;
 const hy=Math.abs(e[1])*half.x+Math.abs(e[5])*half.y+Math.abs(e[9])*half.z;
 const hz=Math.abs(e[2])*half.x+Math.abs(e[6])*half.y+Math.abs(e[10])*half.z;
 let surface=-.86;
 for(const board of installation.boards){const {base,size}=board.userData,c=Math.abs(Math.cos(board.rotation.y)),s=Math.abs(Math.sin(board.rotation.y)),bx=(size[0]*c+size[2]*s)/2,bz=(size[0]*s+size[2]*c)/2;
  if(Math.abs(position.x-base[0])<=hx+bx+.003&&Math.abs(position.z-base[2])<=hz+bz+.003)surface=Math.max(surface,base[1]+size[1]/2);
 }
 return Math.max(position.y,surface+hy+.006);
}
function animateUnpacking(s,waste){
 const I=installation,stage=s.stage,p=s.p,progress=range=>stage<2?0:stage>2?1:smooth((p-range[0])/(range[1]-range[0])),collect=progress(UNPACKING.collect),film=stage<2?0:stage>2?1:filmLiftMotion(p).removed,pallet=stage<3?0:stage>3?1:smooth((p-UNPACKING.pallet[0])/(UNPACKING.pallet[1]-UNPACKING.pallet[0]));
 const closedQ=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),s.yaw),cartQ=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),waste.yaw);
 const cargo=(x,y,z)=>new THREE.Vector3(x,y,z).applyQuaternion(cartQ).add(new THREE.Vector3(waste.x,waste.y,waste.z));
 I.panels.forEach((panel,i)=>{
  const initial=panel.userData.local.clone().applyQuaternion(closedQ).add(I.hero.position),lay=new THREE.Vector3(...UNPACKING.layPositions[i]);
  // 四侧先平移脱开柜体，前面板抬过升降工装；顶盖只从上方取出。
  const t=progress(i===4?UNPACKING.top:[UNPACKING.sides[0]+i*.012,UNPACKING.sides[1]+i*.004]);
  const horizontalQ=new THREE.Quaternion().setFromEuler(new THREE.Euler(i<2?(i===0?Math.PI/2:-Math.PI/2):0,0,i===2?Math.PI/2:i===3?-Math.PI/2:0));
  lay.y=cartonClearance(panel,lay,horizontalQ);
  if(t<.30){panel.position.copy(initial);panel.position.y+=smooth(t/.30)*(i===4?.64:i===1?.75:.12);if(i<4){const direction=new THREE.Vector3(i===2?-1:i===3?1:0,0,i===0?1:i===1?-1:0);panel.position.addScaledVector(direction,smooth(t/.30)*.20);}panel.quaternion.copy(closedQ);}
  else{const u=smooth((t-.30)/.70),lifted=initial.clone().add(new THREE.Vector3(i===2?-.20:i===3?.20:0,i===4?.64:i===1?.75:.12,i===0?.20:i===1?-.20:0));panel.position.lerpVectors(lifted,lay,u);if(i===1)panel.position.y+=Math.sin(u*Math.PI)*1.0;panel.quaternion.copy(closedQ).slerp(horizontalQ,u);}
  const stack=cargo(0,.54+i*.041,0),qStack=cartQ.clone().multiply(horizontalQ);
  if(collect>0){
   // 平放的纸板沿柜外通道绕行装车，不能横穿机柜或翻转穿过人员。
   const detour=i===2?[[lay.x,lay.z],[.55,11.8]]:[[lay.x,lay.z],[6.6,lay.z],[6.6,11.8]];const paths=Array.from({length:5},()=>[...detour,[WASTE_CART.park[0],11.8],[waste.x,waste.z]]);
   const walk=routeSample(paths[i],clamp01((collect-.18)/.64)),carryY=Math.max(lay.y,stack.y)+.65;
   panel.position.set(walk.x,collect<.18?blend(lay.y,carryY,smooth(collect/.18)):collect>.82?blend(carryY,stack.y,smooth((collect-.82)/.18)):carryY,walk.z);panel.quaternion.copy(horizontalQ).slerp(qStack,smooth((collect-.82)/.18));
  }if(stage>=2)panel.position.y=cartonClearance(panel,panel.position,panel.quaternion);panel.visible=!waste.removed;
 });
 // 薄膜顶缘固定、底缘逐渐上升；卷边随揭膜高度上移，随后揉成一束装车。
 I.innerFilm.quaternion.copy(closedQ);I.innerFilm.scale.set(1,Math.max(.001,1-film),1);I.innerFilm.position.copy(I.hero.position).add(new THREE.Vector3(0,2.32*film,0));I.innerFilm.visible=film<1;
 I.filmRoll.quaternion.copy(closedQ);I.filmRoll.position.copy(I.hero.position).add(new THREE.Vector3(0,2.32*film,0));I.filmRoll.visible=stage===2&&film>0&&film<1;
 I.filmBundle.visible=film>=1&&!waste.removed;const bundleLift=stage===2?smooth((p-.65)/.03):1;I.filmBundle.position.copy(I.hero.position).add(new THREE.Vector3(.12,2.48,0));I.filmBundle.position.lerp(new THREE.Vector3(6.60,-.70,9.20),bundleLift);I.filmBundle.position.lerp(cargo(0,.84,.1),collect);I.filmBundle.quaternion.copy(cartQ);
 // 木栈板从机柜下方撤出，再进入同一辆清运车。
 const under=stage<2?I.hero.position.clone().add(new THREE.Vector3(0,-UNPACKING.palletHeight,0)):new THREE.Vector3(3,stage===2?s.y-UNPACKING.palletHeight:MOTION.roadY,MOTION.unpackZ);
 I.pallet.position.copy(under);I.pallet.quaternion.copy(stage<2?closedQ:new THREE.Quaternion());
 if(pallet>0){const dest=cargo(0,1.01,0),walk=routeSample([[3,MOTION.unpackZ],[3,10.8],[WASTE_CART.park[0],10.8],[waste.x,waste.z]],clamp01((pallet-.18)/.64));I.pallet.position.set(walk.x,pallet<.18?blend(MOTION.roadY,-.10,smooth(pallet/.18)):pallet>.82?blend(-.10,dest.y,smooth((pallet-.82)/.18)):-.10,walk.z);I.pallet.quaternion.slerp(cartQ,smooth((pallet-.82)/.18));}
 I.pallet.visible=!waste.removed;
 I.unpackSupports.visible=false;
 $('viewport').dataset.packagingPhase=stage<2?'wrapped':stage===2?(p<.46?'carton':p<.68?'film':'collect'):stage===3?(p<.60?'push-off-pallet':p<.90?'pallet':'haul'):'removed';
 $('viewport').dataset.filmRemoval=film.toFixed(3);
}

function applyInstallation(stage,p){
 if(!installation)return;const I=installation,s=installationState(stage,p),seconds=(STEPS.slice(0,stage).reduce((n,v)=>n+v.duration,0)+p*STEPS[stage].duration)/1000;
 protectCabinet(s);
 I.hero.position.set(s.x,s.y,s.z);I.hero.rotation.set(s.pitch,s.yaw,0);I.hero.userData.step=stage;
 I.boards.forEach((board,i)=>{const f=stage>0?1:clamp01(p*(I.boards.length+2)-i),{base,size}=board.userData;board.visible=f>0;board.scale.set(...size);board.position.y=base[1]+(1-smooth(f))*.18;});
 I.deck.position.y=s.liftY+.79;const height=I.deck.position.y-.055,spread=Math.sqrt(Math.max(.1,1.38*1.38-(height-.08)**2))/2;
 I.liftBeams.forEach(beam=>{const{x,reverse}=beam.userData;setBeam(beam,[x,.08,reverse?spread:-spread],[x,height,reverse?-spread:spread]);});setBeam(I.piston,[0,.08,.54],[0,height,-.30],.035);
 I.bridge.visible=stage>4||stage===4&&p>=.40;I.loadRamp.visible=stage<=3;
 const jackRetreat=stage===2?smooth((p-.06)/.08):stage>2?1:0;const park=routeSample([[3,MOTION.unpackZ],[3,11.9],[8,11.9]],jackRetreat);I.jack.position.set(stage>=2?park.x:s.x,MOTION.roadY,stage>=2?park.z:s.z);I.jack.rotation.y=stage>=2?park.yaw:s.yaw;I.jack.visible=stage<4;I.palletRamp.visible=stage===3&&p<.70;
 const waste=wasteCartState(s);I.wasteCart.position.set(waste.x,waste.y,waste.z);I.wasteCart.rotation.y=waste.yaw;I.wasteCart.visible=waste.visible;$('viewport').dataset.wasteCart=waste.removed?'removed':stage<2?'waiting':stage===2&&p<.12?'entering':s.waste>0?'hauling':'parked';
 animateUnpacking(s,waste);
 const rearOffsets=[[0,1.45],[-.78,.30],[.78,.30],[-.78,-.72]],intents=[];
 I.workers.forEach((worker,i)=>{
  worker.visible=stage!==0&&(stage<5||i<2);
  let local=rearOffsets[i],x=s.x+local[0]*Math.cos(s.yaw)+local[1]*Math.sin(s.yaw),z=s.z-local[0]*Math.sin(s.yaw)+local[1]*Math.cos(s.yaw),y=stage>=5?MOTION.floorY:MOTION.roadY,yaw=s.yaw+Math.PI,gait=s.walking?seconds*7:0,push=stage===1||stage===3||stage===4&&p>.4,reach=false;
  if(stage===0){const at=routeSample(MOTION.transport,clamp01(p+(i-1.5)*.055));x=at.x+(i%2?.60:-.60);z=at.z+.2;yaw=at.yaw;gait=p>0&&p<1?seconds*6:0;push=true;}
  if(stage===2){const end=UNPACK_CREW[i],paths=[[[x,z],[3,9.75],end],[[x,z],[1.95,z],end],[[x,z],[4.35,z],end],[[x,z],[1,z],end]],walk=routeSample(paths[i],smooth(p/.12));x=walk.x;z=walk.z;yaw=Math.atan2(s.x-x,s.z-z);gait=p<.12?seconds*7:0;push=p<.90;reach=p>.46&&p<.65;}
  if(stage===3){
   const offset=[[0,1.35],[-.82,.65],[.82,.65],[-.82,1.50]][i],start=.34+i*.025;
   const gather=smooth(p/.15);x=blend(UNPACK_CREW[i][0],s.x+offset[0],gather);z=blend(UNPACK_CREW[i][1],s.z+offset[1],gather);yaw=Math.PI;y=MOTION.roadY;push=p<start;
   if(p>=start){const initial=installationState(3,start),end=RECEIVING[i],path=[[initial.x+offset[0],initial.z+offset[1]],[initial.x+offset[0],7.5+i*.15],[1.35,7.5+i*.15],[1.35,4.6],[1.6,3],[end[0],2.65],[end[0],end[1]]],walk=routeSample(path,smooth((p-start)/(1-start)));x=walk.x;z=walk.z;y=x<1.95&&z>3?blend(MOTION.roadY,MOTION.floorY,clamp01((4.6-z)/1.6)):z<=3?MOTION.floorY:MOTION.roadY;yaw=walk.yaw+Math.PI;gait=p<1?seconds*7:0;}
  }
  if(stage===4){
   const wait=RECEIVING[i];x=wait[0];z=wait[1];y=MOTION.floorY;yaw=0;push=false;gait=0;
   if(p>.60&&s.z<3){const t=smooth((3-s.z)/.7),lx=local[0],lz=local[1],q=smooth((p-.60)/.40);x=blend(x,s.x+lx*Math.cos(s.yaw)+lz*Math.sin(s.yaw),t);z=blend(z,s.z-lx*Math.sin(s.yaw)+lz*Math.cos(s.yaw),t);push=true;gait=seconds*7;yaw=s.yaw+Math.PI;
    if(q>.78){const end=[[-3.55,1.0],[-3.55,1.90],[-2.95,1.90],[-2.27,1.90]][i],t=smooth((q-.78)/.22);x=blend(x,end[0]+(I.pipelineOffset||0),t);z=blend(z,end[1],t);yaw=Math.atan2(s.x-x,s.z-z);}}
  }
  if(stage>=5){const end=[[-3.55,1.0],[-3.55,1.90],[-2.95,1.90],[-2.27,1.90]][i];x=end[0];z=end[1];yaw=Math.atan2(s.x-x,s.z-z);push=stage===5;gait=0;if(stage===5&&i<2){worker.rotation.z=0;}if(stage===6&&i===1){const t=clamp01((p-.15)/.15)*(1-clamp01((p-.84)/.10));const climbing=p<.30||p>.84,body=ladderBody(t);x=climbing?-2.95:p>.82?blend(-2.32,-2.95,smooth((p-.82)/.02)):blend(-2.95,-2.32,s.cables/6);z=1.76+body.z;y=MOTION.floorY+body.y;yaw=Math.PI;reach=p>=.30&&p<=.82;if(p<.15||p>.94){const q=p<.15?smooth(p/.15):1-smooth((p-.94)/.06),walk=routeSample([end,[-3.55,3.32],[-2.95,3.32]],q);x=walk.x;z=walk.z;y=MOTION.floorY;gait=seconds*7;yaw=walk.yaw+(p<.15?Math.PI:0);}}if(stage===7&&i<2){const walk=routeSample([end,[-3.86,end[1]],[-3.86,-.43-i*.82]],smooth(p/.12));x=walk.x;z=walk.z;yaw=p<.12?walk.yaw+Math.PI:0;gait=p<.12?seconds*7:0;push=p>=.12;}}
  if(stage>=5){x+=I.pipelineOffset||0;if(stage!==6)yaw=Math.atan2(s.x-x,s.z-z);}
  intents.push({x,y,z,yaw,gait,push,reach,stair:stage===6&&i===1&&p>=.15&&p<=.94&&(p<.30||p>.84)?{progress:clamp01((p-.15)/.15)*(1-clamp01((p-.84)/.10)),origin:{x:-2.95+(I.pipelineOffset||0),y:MOTION.floorY,z:1.76}}:null,kneel:(stage===5||stage===7)&&i<2?smooth((p-(stage===7?.12:0))/.12)*(1-smooth((p-.94)/.06)):0});
 });
 resolveWorkers(intents,s,seconds);
 updateFixing(s);
 I.wrench.visible=stage===5&&p<1;I.wrench.rotation.z=stage===5?Math.sin(seconds*5)*.6:0;
 I.workPlatform.visible=stage>=6;I.workPlatform.position.set((I.pipelineOffset||0)+(stage===6?blend(blend(-.5,-2.65,smooth(p/.15)),-.5,smooth((p-.94)/.06)):-.5),MOTION.floorY,1.76);
 I.wires.forEach((wire,i)=>{const amount=clamp01(s.cables-i);wire.visible=amount>0;wire.geometry.setDrawRange(0,Math.floor(wire.userData.indexCount*amount/6)*6);I.plugs[i].material=amount===1?M.ground:M.steel;});
 updatePipeConnection(s);scene.userData.flow.mesh.visible=s.hoses>=2;
 const actions=[['沿路线逐块铺板 · 柜位前停止','散力板已铺设至柜位前'],['4 名施工人员使用地牛搬运带包装机柜','地牛在转角转向后停稳'],[p<.10?'地牛降下带栈板机柜并退出':p<.24?'向上移走纸箱顶盖，拆开四侧纸板':p<.46?'前后左右四面向外拆除并放倒':p<.68?'青蓝色内膜从下往上揭除并收卷':p<.90?'纸箱与薄膜装车，栈板留在柜底':'拆包完成，等待推柜上升降机后清运栈板','转角处拆包完成 · 栈板原位保留'],[p<.60?'从转角处推柜离开栈板，经坡板送上升降机':p<.90?'机柜已上平台，人员进入机房接应；栈板装车':'纸箱、薄膜与栈板一并清运','机柜已上平台 · 人员在机房内接应'],[p<.12?'机房内人员等待，升降平台保持无人':p<.40?'液压剪叉展开，机柜升至静电地板高度':p<.60?'平台对接，人员在机房内接应':'4 名施工人员推行机柜至 9 号柜位','机柜已到达 9 号柜位'],[I.fixingAction,'2 人完成调平 · 前后各 2 颗 M12 已固定'],['逐根连接顶部工业连接器 · '+Math.floor(s.cables)+' / 6 根','6 / 6 根已连接 · 未送电'],['连接二次侧供回液至 Manifold · '+Math.floor(s.hoses)+' / 2 路','供液 / 回液已连接 · 待检验']];
 const action=actions[stage][p>=1?1:0];if(I.lastAction!==action){$('action-label').textContent=action;I.lastAction=action;}$('action-counter').textContent=String(stage+1).padStart(2,'0')+' / 08';
 // 暴露语义化的演示进度，便于无障碍技术读取与状态验证。
 $('viewport').dataset.installationStage=String(stage+1);$('viewport').dataset.connectedCables=String(Math.floor(s.cables));$('viewport').dataset.connectedHoses=String(Math.floor(s.hoses));$('viewport').dataset.collisionProtection='active';
}

