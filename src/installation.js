function installationState(stage,p){
 p=clamp01(p);const start=routeSample(MOTION.transport,0),door=routeSample(MOTION.transport,1),s={stage,p,x:start.x,z:start.z,y:MOTION.jackY+UNPACKING.palletHeight,yaw:start.yaw,liftY:MOTION.liftLow,unpack:0,waste:0,pitch:0,fix:0,cables:0,hoses:0,walking:false};
 if(stage===1){Object.assign(s,orthogonalSample(MOTION.transport,smooth(p)));s.walking=p>0&&p<1;}
 if(stage===2){Object.assign(s,door);s.y=blend(MOTION.jackY,MOTION.roadY,smooth(p/.08))+UNPACKING.palletHeight;s.unpack=smooth((p-.19)/.24);s.waste=0;}
 if(stage===3){s.x=3;s.z=blend(MOTION.unpackZ,3.95,smooth(p/.60));const surface=z=>MOTION.roadY+(MOTION.liftLow-MOTION.roadY)*clamp01((5.48-z)/.62)+UNPACKING.palletHeight*clamp01((z-6.35)/.88),front=surface(s.z-.54),rear=surface(s.z+.54);s.y=(front+rear)/2;s.pitch=-Math.atan2(rear-front,1.08);s.yaw=0;s.unpack=1;s.waste=smooth((p-.90)/.10);s.walking=p>0&&p<.60;}
 if(stage===4){s.x=3;s.z=3.95;s.yaw=0;s.liftY=blend(MOTION.liftLow,MOTION.floorY,smooth((p-.12)/.28));s.y=s.liftY;s.unpack=1;s.waste=1;if(p>.60){Object.assign(s,((typeof pipeline!=='undefined'&&pipeline?.enabled)?orthogonalSample:routeSample)(MOTION.inside.map((point,i)=>i>=3?[point[0]+(installation?.pipelineOffset||0),point[1]]:point),smooth((p-.60)/.40)));s.y=MOTION.floorY;s.walking=p<1;}}
 if(stage>=5){s.x=MOTION.target[0]+(installation?.pipelineOffset||0);s.z=MOTION.target[1];s.y=MOTION.floorY;s.yaw=0;s.liftY=MOTION.floorY;s.unpack=1;s.waste=1;s.fix=stage===5?smooth(p):1;if(stage===5)s.pitch=THREE.MathUtils.degToRad(FIXING.tilt)*smooth(p/.10)*(1-smooth((p-FIXING.feetEnd)/(FIXING.levelEnd-FIXING.feetEnd)));}
 if(stage>=6)s.cables=stage===6?clamp01((p-.30)/.50)*6:6;
 if(stage===7)s.hoses=clamp01((p-.12)/.80)*2;
 return s;
}
// 三段固定动画：先承重，再校平，最后逐颗插入并旋紧螺丝。
function updateFixing(s){
 const I=installation,p=s.stage<5?0:s.stage>5?1:s.p;
 const level=smooth((p-FIXING.feetEnd)/(FIXING.levelEnd-FIXING.feetEnd));
 I.feet.forEach((foot,i)=>{const d=foot.userData,q=smooth((p-i*.075)/.065),contact=(FIXING.ground-s.y+d.dz*Math.sin(s.pitch))/Math.cos(s.pitch)+.008;
 d.lower=q;d.pad.position.y=blend(.053,contact,q);d.pad.rotation.y=q*Math.PI*8+smooth(level*4-i)*Math.PI*2;
 setBeam(d.shaft,[0,d.pad.position.y+.008,0],[0,.105,0],.009);
 d.nut.position.y=d.pad.position.y+.032;d.nut.rotation.y=d.pad.rotation.y;
 });
 let count=0;I.bolts.forEach((bolt,i)=>{const q=clamp01((p-FIXING.boltStart-i*.075)/.075);bolt.visible=s.stage>=5&&p>=FIXING.boltStart+i*.075;bolt.userData.screw.position.y=(1-smooth(q/.40))*.16;bolt.userData.screw.rotation.y=smooth((q-.40)/.45)*Math.PI*10;bolt.userData.installed=q>=1-1e-8;if(bolt.userData.installed)count++;});
 I.level.visible=s.stage===5&&p>=FIXING.feetEnd;I.level.position.copy(I.hero.position).add(new THREE.Vector3(0,2.31,.2));I.level.rotation.x=s.pitch;I.levelBubble.position.x=(1-level)*.03;
 const angle=Math.abs(THREE.MathUtils.radToDeg(s.pitch));
 I.fixingAction=p<FIXING.feetEnd?'1 / 3 · 四角承重地脚旋转着地':p<FIXING.boltStart?'2 / 3 · 调平 · 水平 '+angle.toFixed(3)+'° / 垂直 '+(90-angle).toFixed(3)+'°':'3 / 3 · 前后短边安装 M12 · '+count+' / 4 颗';
 Object.assign($('viewport').dataset,{activeWorkers:String(s.stage===0?0:s.stage<5?4:2),fixingPhase:p<FIXING.feetEnd?'feet':p<FIXING.boltStart?'level':'bolts',levelHorizontal:angle.toFixed(3),levelVertical:(90-angle).toFixed(3),installedM12:String(count)});
 updateFixingHUD(s,level,count);if(I.fixDetail)syncFixingDetail(s,level); 
}
// 特写使用真实地脚和螺丝的几何及同步姿态；剖去柜体外壳以露出操作细节。
function updateFixingHUD(s,level,count){
 const p=s.p,phase=p<FIXING.feetEnd?0:p<FIXING.boltStart?1:2,active=Math.min(3,Math.floor(Math.max(0,p-FIXING.boltStart)/.075)),angle=Math.abs(THREE.MathUtils.radToDeg(s.pitch));
 $('fix-detail').hidden=(typeof pipeline!=='undefined'&&pipeline?.enabled)||s.stage!==5&&s.stage!==7;
 if(s.stage===7)return;
 $('fix-gauges').hidden=false;$('fix-phase-0').textContent='① 地脚着地';$('fix-phase-1').textContent='② 调平';$('fix-phase-2').textContent='③ 螺丝固定';
 $('fix-horizontal').textContent=angle.toFixed(3)+'°';$('fix-vertical').textContent=(90-angle).toFixed(3)+'°';
 $('fix-h-bubble').style.left=(50+angle/FIXING.tilt*34)+'%';$('fix-v-bubble').style.left=(50-angle/FIXING.tilt*34)+'%';
 for(let i=0;i<3;i++)$('fix-phase-'+i).dataset.state=p>=1||i<phase?'done':i===phase?'active':'pending';
 const names=['前左','前右','后左','后右'],foot=Math.min(3,Math.floor(p/.075)),q=clamp01((p-FIXING.boltStart-active*.075)/.075);
 $('fix-title').textContent=phase===2?(active<2?'前侧':'后侧')+' M12 紧固特写':'四角承重脚 · 剖视特写';
 $('fix-action').textContent=p>=1?'固定完成 · 4 / 4 颗已紧固':phase===0?(p>.305?'四角已着地 · 准备校平':names[foot]+'地脚旋转下降 · 绿色圈表示已接地'):phase===1?(p>=FIXING.levelEnd?'水平仪已居中 · 准备紧固':'逐脚微调高度 · 双水平仪气泡逐渐居中'):(names[active]+' M12 · '+(q<.15?'对孔':q<.40?'插入':q<.85?'扳手旋紧':'紧固确认')+' · '+count+' / 4 颗');
}
function initFixingDetail(){
 const I=installation,detailScene=new THREE.Scene();detailScene.background=new THREE.Color('#f4f7f8');detailScene.environment=scene.environment;
 detailScene.add(new THREE.HemisphereLight(0xffffff,0x7c878c,3));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-2,4,3);detailScene.add(light);
 const viewCamera=new THREE.PerspectiveCamera(38,1,.005,20),viewRenderer=new THREE.WebGLRenderer({antialias:true,alpha:false});viewRenderer.setPixelRatio(Math.min(devicePixelRatio,1.5));viewRenderer.toneMapping=THREE.ACESFilmicToneMapping;viewRenderer.outputColorSpace=THREE.SRGBColorSpace;$('fix-view').append(viewRenderer.domElement);
 const footGroup=new THREE.Group();detailScene.add(footGroup);const feet=I.feet.map(f=>{const clone=f.clone(true);clone.traverse(m=>{if(m.isMesh)m.material=m.material.clone();});footGroup.add(clone);return clone;});
 // 半透明底框仅提供柜底方位，避免完整柜壳遮住脚盘和工具。
 const frameMat=new THREE.MeshStandardMaterial({color:'#bcc6ca',transparent:true,opacity:.22,depthWrite:false,roughness:.7});box(footGroup,.60,.025,1.40,0,.105,0,frameMat,false);
 box(detailScene,1.2,.008,2.1,0,-.004,0,new THREE.MeshStandardMaterial({color:'#e6ebeb',roughness:.9}),false);
 const bolts=I.bolts.map(b=>{const clone=b.clone(true);clone.traverse(m=>{if(m.isMesh)m.material=m.material.clone();});detailScene.add(clone);return clone;});
 const rings=I.feet.map(f=>{const m=new THREE.Mesh(new THREE.RingGeometry(.055,.065,32),new THREE.MeshBasicMaterial({color:'#20ad7a',side:THREE.DoubleSide}));m.rotation.x=-Math.PI/2;m.position.set(f.position.x,.001,f.position.z);detailScene.add(m);return m;});
 const wrench=new THREE.Group();detailScene.add(wrench);box(wrench,.012,.012,.16,0,.006,.075,M.steel,false);const socket=new THREE.Mesh(new THREE.CylinderGeometry(.016,.016,.018,6),M.steel);socket.position.y=.008;wrench.add(socket);
 I.fixDetail={scene:detailScene,camera:viewCamera,renderer:viewRenderer,footGroup,feet,bolts,rings,wrench,lastWidth:0,lastHeight:0};
}
function syncFixingDetail(s,level){
 const I=installation,D=I.fixDetail,p=s.p,phase=p<FIXING.feetEnd?0:p<FIXING.boltStart?1:2,active=phase===2?Math.min(3,Math.floor(Math.max(0,p-FIXING.boltStart)/.075)):Math.min(3,Math.floor(p/.075));
 D.pipeActive=false;D.footGroup.position.set(0,s.y-FIXING.ground,0);D.footGroup.rotation.x=s.pitch;
 const sync=(source,target,highlight)=>{target.position.copy(source.position);target.quaternion.copy(source.quaternion);target.scale.copy(source.scale);target.visible=source.visible;if(target.isMesh){target.material.color.set(highlight?'#efa437':source.material.color);}
  for(let i=0;i<source.children.length;i++)sync(source.children[i],target.children[i],highlight);};
 I.feet.forEach((f,i)=>{sync(f,D.feet[i],phase<2&&i===(phase===0?active:Math.min(3,Math.floor(level*4)))&&p<FIXING.levelEnd);D.rings[i].visible=f.userData.lower>=.999;});
 I.bolts.forEach((b,i)=>{sync(b,D.bolts[i],phase===2&&i===active&&p<1);D.bolts[i].position.set(b.position.x-s.x,b.position.y-FIXING.ground,b.position.z-s.z);});
 const q=clamp01((p-FIXING.boltStart-active*.075)/.075);D.wrench.visible=phase===2&&q>=.40&&q<.85;
 if(phase===2){const b=D.bolts[active];D.wrench.position.set(b.position.x,.035,b.position.z);D.wrench.rotation.y=Math.sin(q*70)*.6;const sign=active<2?1:-1;D.camera.position.set(b.position.x+.28,.26,b.position.z+sign*.43);D.camera.lookAt(b.position.x,.065,b.position.z);}
 else{D.camera.position.set(.95,.68,1.58);D.camera.lookAt(0,.035,0);}
}
function renderFixingDetail(){const D=installation?.fixDetail;if(!D||$('fix-detail').hidden)return;const w=$('fix-view').clientWidth,h=$('fix-view').clientHeight;if(w<1||h<1)return;if(w!==D.lastWidth||h!==D.lastHeight){D.renderer.setSize(w,h,false);D.camera.aspect=w/h;D.camera.updateProjectionMatrix();D.lastWidth=w;D.lastHeight=h;}D.renderer.render(D.pipeActive?D.pipeScene:D.scene,D.camera);}
// 连管分为取帽、对准、轴向插入和旋转锁定；主场景与特写共用进度。
function pipeConnectionPose(amount){const q=clamp01(amount);return{q,align:smooth((q-.18)/.27),insert:smooth((q-.45)/.30),lock:smooth((q-.75)/.20),uncap:smooth(q/.18)};}
function updatePipeConnection(s){
 const I=installation;
 I.hoses.forEach((hose,i)=>{const pose=pipeConnectionPose(s.hoses-i),{q,align,insert,uncap}=pose,cap=I.caps[i];
  cap.position.copy(cap.userData.rest);cap.position.y-=uncap*.055;cap.position.x-=uncap*.06;cap.visible=q<.18;
  hose.visible=q>=.18;
  if(!hose.userData.coupler){const coupler=new THREE.Mesh(new THREE.CylinderGeometry(.037,.037,.035,6),M.steel);(I.pipelineRoot||scene).add(coupler);hose.userData.coupler=coupler;}
  const coupler=hose.userData.coupler;coupler.visible=hose.visible;coupler.position.fromArray(hose.userData.port);coupler.position.x-=.055*(1-align);coupler.position.y-=.0175+.075*(1-insert);coupler.rotation.y=pose.lock*Math.PI/2;
  if(hose.userData.lastQ!==q){const points=hose.userData.basePoints.map(p=>p.clone()),offset=new THREE.Vector3(-.055*(1-align),-.075*(1-insert),0);points.at(-1).add(offset);points.at(-2).add(offset);
   const curve=new THREE.CatmullRomCurve3(points,false,'centripetal'),old=hose.geometry;hose.geometry=new THREE.TubeGeometry(curve,48,.024,8,false);old.dispose();hose.geometry.setDrawRange(0,hose.geometry.index.count);hose.userData.lastQ=q;
  }
 });
 if(s.stage!==7)return;
 const index=Math.min(1,Math.floor(s.hoses)),P=pipeConnectionPose(s.hoses-index),phase=P.q<.18?0:P.q<.75?1:2;
 $('fix-gauges').hidden=true;$('fix-title').textContent=(index===0?'供水':'回水')+'接口 · 后侧左边特写';
 ['① 取下防尘帽','② 对准并插入','③ 锁定确认'].forEach((name,i)=>{const el=$('fix-phase-'+i);el.textContent=name;el.dataset.state=s.p>=1||i<phase?'done':i===phase?'active':'pending';});
 $('fix-action').textContent=s.p>=1?'供水 / 回水连接完成 · 2 / 2 路':(P.q<.18?'向下取帽':P.q<.45?'托住软管，对准接口':P.q<.75?'向上插入快接头':'旋转锁紧并确认')+' · '+Math.floor(s.hoses)+' / 2 路';
 if(I.fixDetail)syncPipeDetail(s,index,P);
}
function syncPipeDetail(s,index,P){
 const I=installation,D=I.fixDetail;D.pipeActive=true;
 if(!D.pipeScene){const g=D.pipeScene=new THREE.Scene();g.background=new THREE.Color('#f4f7f8');g.environment=scene.environment;g.add(new THREE.HemisphereLight(0xffffff,0x77838a,3));const light=new THREE.DirectionalLight(0xffffff,3);light.position.set(-1,2,2);g.add(light);
  D.pipePorts=COOLING.portXs.map((x,i)=>{const group=new THREE.Group();group.position.x=x;g.add(group);rod(group,[0,.16,0],[0,.50,0],.026,i===0?M.supply:M.return);rod(group,[0,.16,0],[0,.23,0],.035,M.steel);
   const cap=rod(group,[0,.146,0],[0,.16,0],.037,M.board);
   const tip=new THREE.Group();group.add(tip);rod(tip,[0,-.16,0],[0,0,0],.024,i===0?M.supply:M.return);const collar=new THREE.Mesh(new THREE.CylinderGeometry(.039,.039,.035,6),M.steel);collar.position.y=-.0175;tip.add(collar);
   const ring=new THREE.Mesh(new THREE.TorusGeometry(.043,.003,8,24),new THREE.MeshBasicMaterial({color:'#20ad7a'}));ring.rotation.x=Math.PI/2;ring.position.y=.145;group.add(ring);
   return {group,cap,tip,collar,ring};
  });
  // 两只灰色手分别扶住接口和托举软管，手指随插接和锁紧同步运动。
  D.pipeHands=[-1,1].map(side=>{const hand=new THREE.Group();g.add(hand);box(hand,.045,.024,.064,0,0,0,M.worker,false);for(let j=0;j<3;j++)rod(hand,[-.015+j*.014,0,-.035],[-.015+j*.014,-.014,-.055],.006,M.worker);rod(hand,[side*.025,0,0],[side*.035,-.015,-.02],.008,M.worker);rod(hand,[0,0,.03],[side*.08,.02,.12],.018,M.worker);return hand;});
 }
 D.pipePorts.forEach((part,i)=>{const p=pipeConnectionPose(s.hoses-i);part.cap.position.set(-p.uncap*.06,.153-p.uncap*.055,0);part.cap.visible=p.q<.18;part.tip.visible=p.q>=.18;part.tip.position.set(-.055*(1-p.align),.16-.075*(1-p.insert),0);part.collar.rotation.y=p.lock*Math.PI/2;part.ring.visible=p.q>=.95;});
 const x=COOLING.portXs[index],tip=D.pipePorts[index].tip;
 D.pipeHands[0].position.set(x-.046,.20,.028);D.pipeHands[1].position.set(x+tip.position.x+.036,P.q<.18?.153-P.uncap*.055:tip.position.y-.05,.036);D.pipeHands[1].rotation.y=P.lock*Math.PI/2;D.pipeHands.forEach(hand=>hand.visible=s.p<.98);
 D.camera.position.set(-.57,.40,.65);D.camera.lookAt(-.16,.19,0);
}
function buildEquipment(offset=0,slot=9,shared=true){
 const targetX=MOTION.target[0]+offset;
 // 9 号柜位空置，直到施工主角真正被推入；不使用静态机柜替身。
 for(const r of RACK_LAYOUT){if(shared&&r.id!==9){const rack=makeRack(r.x,r.z,r.id,r.type,0,r.type==='cdu'?7:r.type==='power'?6:5);if(r.z<0)rack.rotation.y=Math.PI;}}
 installation={pipelineOffset:offset,slot,boards:[],workers:[],panels:[],feet:[],bolts:[],wires:[],plugs:[],hoses:[],caps:[],liftBeams:[],lastAction:''};
 const I=installation;const targetMat=new THREE.MeshBasicMaterial({color:'#6698be',transparent:true,opacity:.7});
 for(const dx of[-.33,.33])box(scene,.014,.009,1.46,targetX+dx,.032,.5,targetMat,false);for(const dz of[-.73,.73])box(scene,.67,.009,.014,targetX,.032,.5+dz,targetMat,false);
 
 // 散力板长轴沿直线路段，拐角以正交矩形拼接，不使用斜板。
 // [区域, x 起点, x 终点, z 起点, z 终点, 行进轴]；矩形互不重叠。
 const boardRuns=[['outside',-5.9,3.7,7.725,9.125,'x'],['outside',2.3,3.7,4.42,7.725,'z'],['inside',2.3,3.7,1.40,3.00,'z'],['inside',-3.50,2.3,1.60,3.00,'x']];
 for(const [zone,x0,x1,z0,z1,axis] of boardRuns){const length=axis==='x'?x1-x0:z1-z0,width=axis==='x'?z1-z0:x1-x0,count=Math.max(1,Math.floor(length/1.55)),long=length/count;
  for(let i=0;i<count;i++){const x=axis==='x'?x0+(i+.5)*long:(x0+x1)/2,z=axis==='z'?z0+(i+.5)*long:(z0+z1)/2,thickness=zone==='inside'?.012:.035,y=zone==='inside'?.019:-.756;
   const board=box(scene,width-.006,thickness,long-.006,x,y,z,zone==='inside'?M.interiorBoard:M.board);board.rotation.y=axis==='x'?Math.PI/2:0;board.userData={zone,base:[x,y,z],size:[width-.006,thickness,long-.006],axis};I.boards.push(board);
  }
 }
 // 实际移动机柜：使用同一个 Group，配有脚轮、调平脚及后置 Manifold。
 I.hero=makeRack(-5,8.425,9,'compute',MOTION.jackY+UNPACKING.palletHeight,1);I.hero.name='moving-installation-rack-'+slot;I.hero.userData.referenceId=slot;if(slot!==9){for(const child of [...I.hero.children])if(child.geometry?.type==='PlaneGeometry')I.hero.remove(child);const label=textLabel(String(slot),I.hero.position.x,I.hero.position.y+2.267,I.hero.position.z,.43,'#ff2929',true);label.rotation.z=-Math.PI/2;I.hero.attach(label);}
 for(const dx of[-.22,.22])for(const dz of[-.54,.54]){const caster=new THREE.Mesh(new THREE.CylinderGeometry(.045,.045,.035,12),M.steel);caster.rotation.z=Math.PI/2;caster.position.set(dx,.045,dz);I.hero.add(caster);}
 // 四角独立承重脚：圆形脚盘、螺杆和旋转调节螺母。
 for(const [dx,dz] of FIXING.points){const foot=new THREE.Group();foot.position.set(dx,0,dz);I.hero.add(foot);
 const pad=new THREE.Mesh(new THREE.CylinderGeometry(.049,.054,.016,20),M.steel);foot.add(pad);
 const shaft=rod(foot,[0,.06,0],[0,.105,0],.009,M.steel);
 const nut=new THREE.Mesh(new THREE.CylinderGeometry(.023,.023,.019,6),M.steel);foot.add(nut);
 const mark=box(nut,.006,.004,.018,.014,.011,0,M.black);
 foot.userData={pad,shaft,nut,dz,lower:0};I.feet.push(foot);}
 // 封闭的供回水立管，每根仅在最底端设置一个向下快接，不再设置侧向支口。
 I.manifold=new THREE.Group();I.manifold.name='two-port-downward-manifold';I.hero.add(I.manifold);
 for(const [i,dx] of COOLING.portXs.entries()){
  const mat=i===0?M.supply:M.return;
  rod(I.manifold,[dx,.23,COOLING.portZ],[dx,2.02,COOLING.portZ],.026,mat);
  for(const y of[.40,1.10,1.85])box(I.manifold,.074,.022,.055,dx,y,-.727,M.steel);
  const connector=rod(I.manifold,[dx,COOLING.portY,COOLING.portZ],[dx,.23,COOLING.portZ],.035,M.steel);connector.name=i===0?'supply-downward-port':'return-downward-port';connector.userData.direction=[0,-1,0];
  const cap=rod(I.manifold,[dx,COOLING.portY-.014,COOLING.portZ],[dx,COOLING.portY,COOLING.portZ],.037,M.board);cap.userData.rest=cap.position.clone();I.caps.push(cap);
 }
 // 独立五面纸箱；向外拆开后分别平放，最后统一装车。
 const specs=[[.87,2.38,.035,0,1.19,.96],[.87,2.38,.035,0,1.19,-.96],[.035,2.38,1.92,-.435,1.19,0],[.035,2.38,1.92,.435,1.19,0],[.905,.035,1.955,0,2.395,0]];
 specs.forEach((a,i)=>{const panel=box(scene,...a.slice(0,3),0,0,0,i===4?M.packingTop:M.packing);panel.userData.local=new THREE.Vector3(...a.slice(3));panel.userData.index=i;I.panels.push(panel);});
 // 木栈板、青蓝色内膜和揭膜卷边，均为独立实物，收尾时一起清运。
 I.pallet=new THREE.Group();I.pallet.name='wooden-shipping-pallet';scene.add(I.pallet);
 for(const z of[-.74,0,.74])box(I.pallet,.96,.07,.105,0,.045,z,M.wood);
 for(let i=0;i<6;i++)box(I.pallet,.96,.028,.29,0,.106,-.81+i*.324,M.wood);
 for(const x of[-.39,.39])box(I.pallet,.13,.021,1.94,x,.012,0,M.wood);
 I.innerFilm=new THREE.Group();I.innerFilm.name='cyan-inner-plastic-film';scene.add(I.innerFilm);
 const wrap=box(I.innerFilm,.77,2.32,1.83,0,1.16,-.045,M.film,false);wrap.name='plastic-film-sleeve';
 const crease=new THREE.MeshBasicMaterial({color:'#b2edf0',transparent:true,opacity:.6,depthWrite:false});
 for(let i=0;i<8;i++){const y=.14+i*.28;rod(I.innerFilm,[-.389,y,.874],[.389,y+.028,.874],.004,crease);rod(I.innerFilm,[-.389,y,-.964],[-.389,y+.024,.874],.004,crease);}
 I.filmRoll=new THREE.Group();I.filmRoll.name='peeled-film-roll';scene.add(I.filmRoll);
 for(const [a,b]of[[[-.39,0,.875],[.39,0,.875]],[[-.39,0,-.965],[.39,0,-.965]],[[-.39,0,-.965],[-.39,0,.875]],[[.39,0,-.965],[.39,0,.875]]])rod(I.filmRoll,a,b,.032,M.film);
 I.filmBundle=new THREE.Group();scene.add(I.filmBundle);I.filmBundle.name='collected-cyan-film';
 for(let i=0;i<5;i++){const crumple=new THREE.Mesh(new THREE.IcosahedronGeometry(.14,1),M.film);crumple.scale.set(1.3,.5,.8);crumple.position.set((i-2)*.11,.015*(i%2),.035*Math.sin(i*2));I.filmBundle.add(crumple);}
 // 栈板撤出期间使用低位支承工装，避免机柜悬空。
 I.unpackSupports=new THREE.Group();scene.add(I.unpackSupports);
 for(const dx of[-.31,.31])for(const dz of[-.58,.58])box(I.unpackSupports,.10,.12,.17,dx,.06,dz,M.steel);
 // 两侧拆包装临时落板区，与纸箱拆卸方向对应。
 // 拆包区保留动画位置，删除额外扩展地面。
 I.palletRamp=box(scene,.95,.025,.88,3,MOTION.roadY+.055,6.81,M.wood);I.palletRamp.rotation.x=-.135;
 I.jack=new THREE.Group();scene.add(I.jack);I.jack.userData.step=1;selectables.push(I.jack);
 for(const dx of[-.20,.20])box(I.jack,.13,.085,1.48,dx,.145,-.08,M.orange);
 box(I.jack,.61,.17,.40,0,.14,.74,M.orange);rod(I.jack,[0,.19,.86],[0,1.02,1.22],.035,M.steel);rod(I.jack,[-.22,1.02,1.22],[.22,1.02,1.22],.034,M.black);
 for(const dx of[-.25,.25])for(const dz of[-.62,.76]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.065,.065,.055,12),M.black);wheel.rotation.z=Math.PI/2;wheel.position.set(dx,.066,dz);I.jack.add(wheel);}
 I.wasteCart=new THREE.Group();scene.add(I.wasteCart);box(I.wasteCart,1.12,.09,1.48,0,.29,0,M.steel);for(const dx of[-.46,.46])for(const dz of[-.58,.58]){const wheel=new THREE.Mesh(new THREE.CylinderGeometry(.10,.10,.065,12),M.black);wheel.rotation.z=Math.PI/2;wheel.position.set(dx,.13,dz);I.wasteCart.add(wheel);}for(const dx of[-.46,.46])rod(I.wasteCart,[dx,.32,.66],[dx,1.0,.66],.02,M.steel);rod(I.wasteCart,[-.46,1,.66],[.46,1,.66],.025,M.steel);
 // 液压升降机：固定底座、可动台面、随高度伸展的剪叉和活塞。
 I.lift=new THREE.Group();I.lift.position.set(3,-.79,3.95);I.lift.userData.step=3;scene.add(I.lift);selectables.push(I.lift);box(I.lift,1.40,.09,1.84,0,.045,0,M.steel);
 I.deck=new THREE.Group();I.lift.add(I.deck);box(I.deck,1.40,.07,1.84,0,-.051,0,M.orange);box(I.deck,1.28,.016,1.77,0,-.008,0,M.steel);
 for(const x of[-.65,.65]){for(const z of[-.76,.76])rod(I.deck,[x,.02,z],[x,.70,z],.023,M.orange);rod(I.deck,[x,.70,-.8],[x,.70,.8],.032,M.orange);}
 for(const x of[-.46,.46])for(const reverse of[false,true]){const beam=rod(I.lift,[x,.08,-.6],[x,.2,.6],.034,M.orange);beam.userData={x,reverse};I.liftBeams.push(beam);}
 I.piston=rod(I.lift,[0,.1,.52],[0,.2,-.3],.036,M.steel);
 // 接载坡板与楼内对接板，在对应动作时出现。
 I.loadRamp=box(scene,1.28,.025,.62,3,-.680,5.17,M.steel);I.loadRamp.rotation.x=.215;
 I.bridge=box(scene,1.30,.024,.20,3,.013,3.015,M.steel);I.bridge.visible=false;
 for(let i=0;i<4;i++)box(scene,.62,(i+1)*.20,.30,1.6,-.79+(i+1)*.10,4.3-i*.3,M.base);
 box(scene,.66,.07,.45,1.6,-.01,3.15,M.base);
 for(let i=0;i<4;i++)I.workers.push(createWorker(i));
 I.wrench=new THREE.Group();I.workers[0].userData.arms[1].elbow.add(I.wrench);I.wrench.position.set(0,-.29,0);box(I.wrench,.025,.18,.025,0,-.035,0,M.steel);box(I.wrench,.075,.03,.025,0,-.13,0,M.steel);
 // 前后短边各两颗 M12 螺丝；安装位置独立于承重脚。
 for(const [dx,dz] of FIXING.boltPoints){const bolt=new THREE.Group();bolt.position.set(targetX+dx,FIXING.ground,MOTION.target[1]+dz);scene.add(bolt);
 const plate=box(bolt,.10,.012,.10,0,.006,0,M.steel);
 const screw=new THREE.Group();bolt.add(screw);
 const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.006,.006,.045,12),M.steel);shaft.position.y=-.0075;screw.add(shaft);
 const washer=new THREE.Mesh(new THREE.CylinderGeometry(.019,.019,.003,16),M.steel);washer.position.y=.0135;screw.add(washer);
 const head=new THREE.Mesh(new THREE.CylinderGeometry(.011,.011,.013,6),M.steel);head.position.y=.0215;screw.add(head);
 bolt.userData={screw,shaft,plate,installed:false};I.bolts.push(bolt);}
 I.level=new THREE.Group();box(I.level,.45,.05,.07,0,0,0,M.orange);box(I.level,.10,.03,.075,0,.03,0,M.pale);
 I.levelBubble=box(I.level,.018,.016,.078,0,.038,0,M.ground);scene.add(I.level);
 // 顶部连接器明确分为 A/B 各三路；每根电缆独立生长到对应插座。
 box(scene,.60,.08,.24,targetX,3.32,1.40,M.steel);
 for(const x of[-3.48,-2.12])rod(scene,[x,3.35,1.40],[x,3.85,1.40],.012,M.steel);
 const cableMaterials=[new THREE.MeshStandardMaterial({color:'#46515b',roughness:.65}),new THREE.MeshStandardMaterial({color:'#668cba',roughness:.65})];
 for(let i=0;i<6;i++){const x=targetX+(i-2.5)*.09,group=i<3?0:1,name=(i<3?'A':'B')+(i%3+1);const socket=rod(scene,[x,3.16,1.40],[x,3.31,1.40],.035,cableMaterials[group]);socket.userData.step=6;selectables.push(socket);const cap=rod(scene,[x,3.11,1.40],[x,3.17,1.40],.025,M.steel);I.plugs.push(cap);textLabel(name,x,3.39,1.54,.18,group?'#567cac':'#505b61');
  const wire=pipe(scene,[[targetX+(i-2.5)*.084,2.27,.37],[targetX+(i-2.5)*.105,2.63,.60],[x,2.82,1.14],[x,3.14,1.40]],.019,cableMaterials[group]);wire.userData.indexCount=wire.geometry.index.count;I.wires.push(wire);
 }
 // 带护栏的作业平台供顶部插接演示使用。
 I.workPlatform=new THREE.Group();scene.add(I.workPlatform);box(I.workPlatform,1.1,.09,.85,0,1.30,0,M.steel);for(const x of[-.46,.46]){for(const z of[-.34,.34])rod(I.workPlatform,[x,.05,z],[x,2.40,z],.022,M.steel);rod(I.workPlatform,[x,2.40,-.34],[x,2.40,.34],.023,M.orange);}
 // Six broad treads connect the floor to the working deck.
 for(let n=1;n<6;n++){const z=.24+(6-n)*.22,y=1.345*n/6;box(I.workPlatform,.74,.055,.30,-.30,y-.0275,z,M.steel);}
 for(const x of[-.67,.07]){rod(I.workPlatform,[x,.08,1.56],[x,1.32,0],.025,M.steel);rod(I.workPlatform,[x,.95,1.56],[x,2.27,0],.022,M.orange);}

 // 两列之间的二次侧供回水主管，以地板完成面为标高基准。
 I.secondary=new THREE.Group();I.secondary.name='secondary-pipes-600mm';scene.add(I.secondary);I.secondary.userData.heightAboveFloor=COOLING.height;
 const mainY=COOLING.floor+COOLING.height;
 for(const [i,mat] of[[0,M.supply],[1,M.return]]){
  const z=COOLING.lanes[i],dx=COOLING.portXs[i],x=targetX+dx,port=[x,MOTION.floorY+COOLING.portY,MOTION.target[1]+COOLING.portZ];
  const main=rod(I.secondary,[COOLING.xStart,mainY,z],[COOLING.xEnd,mainY,z],.036,mat);main.name=i===0?'secondary-supply-main':'secondary-return-main';
  rod(I.secondary,[COOLING.xStart,mainY,z],[COOLING.xStart+.06,mainY,z],.044,M.steel);
  rod(I.secondary,[x,mainY,z],[x,mainY+.075,z],.038,M.steel);
  // 软管末端沿 +Y 插入向下的接口；末段保持竖直，避免从侧面穿入立管。
  const hose=pipe(scene,[[x,mainY+.075,z],[x,mainY+.18,z],[x,-.22,port[2]-.12],[x,-.09,port[2]],[x,.115,port[2]],port],.024,mat,true);
  hose.name=i===0?'secondary-supply-hose':'secondary-return-hose';hose.userData.port=port;hose.userData.basePoints=hose.geometry.parameters.path.points.map(p=>p.clone());hose.userData.indexCount=hose.geometry.index.count;I.hoses.push(hose);
 }
 for(const x of[-3.28,-1.35,.9]){for(const z of[-1.20,-.76]){box(I.secondary,.10,.016,.10,x,HOT_AISLE.bottom+.008,z,M.steel);rod(I.secondary,[x,HOT_AISLE.bottom+.016,z],[x,mainY-.045,z],.015,M.steel);}box(I.secondary,.046,.032,.54,x,mainY-.055,-.98,M.steel);}
 const points=[];flowPaths.slice(-2).forEach((curve,i)=>{for(let j=0;j<8;j++)points.push({curve,phase:j/8,speed:.11,index:i});});const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(new Float32Array(points.length*3),3));const mesh=new THREE.Points(geo,new THREE.PointsMaterial({color:'#8eaebc',size:.035,transparent:true,opacity:.75,depthWrite:false}));scene.add(mesh);scene.userData.flow={points,geometry:geo,mesh};
}
// 灰色白模人物：肩、肘、髋、膝及踝独立驱动；足底保持在当前支撑面。

// Approved blank-face worker. Shared geometry keeps all crews economical to draw.
