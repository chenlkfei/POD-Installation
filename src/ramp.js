const RAMP={length:.8/Math.sin(8*Math.PI/180),width:2.2,rise:.8,angle:8*Math.PI/180,duration:44,start:1.55,end:.8/Math.tan(8*Math.PI/180)+1.08,
 pullOffsets:[1.45,2.40,3.35],camera:[-9.4,7.65,10.3],target:[4.7,.85,.3],span:8.3};
function rampFloor(x){return THREE.MathUtils.clamp(x/Math.sqrt(RAMP.length**2-RAMP.rise**2),0,1)*RAMP.rise;}
function rampCamera(){transition=null;camera.position.fromArray(RAMP.camera);controls.target.fromArray(RAMP.target);camera.zoom=1;camera.userData.span=RAMP.span;camera.lookAt(controls.target);controls.update();resize();}
function switchTransport(enabled){
 if(!loaded||!!ramp?.enabled===enabled)return;setPlaying(false);
 if(enabled){const savedAction=$('action-label').textContent;if(!ramp)buildRamp();ramp.saved={position:camera.position.clone(),target:controls.target.clone(),span:camera.userData.span,zoom:camera.zoom,action:savedAction,started:demoStarted,finished:demoFinished,rotate:autoRotate,pipelineEnabled:!!pipeline?.enabled,current,tourElapsed};ramp.enabled=true;if(!ramp.notes)initRampNotes();ramp.time=0;ramp.flowPhase=null;ramp.lastRoomTime=null;ramp.lastTransportTime=null;transition=null;autoRotate=false;controls.autoRotate=false;demoStarted=true;demoFinished=false;document.body.classList.add('ramp-mode','details-hidden');$('ramp-summary').hidden=false;rampCamera();poseRamp(0);setPlaying(true);}
 else{ramp.enabled=false;document.body.classList.remove('ramp-install');if(ramp.saved.pipelineEnabled&&pipeline){pipeline.enabled=true;$('pipeline-board').hidden=false;$('pipeline-mode').textContent='切回单柜';pipeline.roots.forEach(r=>r.visible=true);pipeline.reserved.forEach(r=>r.visible=false);}current=ramp.saved.current;tourElapsed=ramp.saved.tourElapsed;document.body.classList.remove('ramp-mode');$('ramp-summary').hidden=true;camera.position.copy(ramp.saved.position);controls.target.copy(ramp.saved.target);camera.userData.span=ramp.saved.span;camera.zoom=ramp.saved.zoom;camera.lookAt(controls.target);controls.update();resize();demoFinished=false;renderUI();if(pipeline?.enabled)renderPipeline();else applyInstallation(current,tourElapsed/STEPS[current].duration);document.getElementById("action-label").textContent=ramp.saved.action;demoStarted=ramp.saved.started;demoFinished=ramp.saved.finished;autoRotate=ramp.saved.rotate;setPlaying(false);}
 $('method-ramp').setAttribute('aria-pressed',enabled);$('method-lift').setAttribute('aria-pressed',!enabled);$('tooltip').style.display='none';
}
function buildRamp(){
 const S=new THREE.Scene();S.background=new THREE.Color('#edf0ef');S.environment=scene.environment;S.environmentIntensity=.35;
 S.add(new THREE.HemisphereLight('#ffffff','#aca99f',1.35));const sun=new THREE.DirectionalLight('#fff9ef',1.6);sun.position.set(1,12,8);sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);Object.assign(sun.shadow.camera,{left:-15,right:15,top:10,bottom:-10,near:1,far:40});sun.shadow.normalBias=.018;S.add(sun);
 const mat=c=>new THREE.MeshStandardMaterial({color:c,roughness:.78});const white=mat('#f3f4f2'),steel=mat('#969b9b'),plate=mat('#827d72'),wall=mat('#bdbdb6'),band=mat('#414746');
 const L=RAMP.rise/Math.tan(RAMP.angle),angle=RAMP.angle;
 box(S,3,.12,2.2,-1.5,-.06,0,wall);const deck=box(S,RAMP.length,.06,2.2,L/2,RAMP.rise/2-.03*Math.cos(angle),0,plate);deck.rotation.z=angle;
 box(S,5.35,RAMP.rise,4.6,L+2.675,RAMP.rise/2,.9,wall);
 // Instanced steel tread pattern, aligned to the actual incline.
 const textureGroup=new THREE.Group();textureGroup.position.set(L/2,RAMP.rise/2,0);textureGroup.rotation.z=angle;S.add(textureGroup);
 const tread=new THREE.InstancedMesh(unitBox,steel,1050);let n=0;const d=new THREE.Object3D();for(let i=0;i<105;i++)for(let j=0;j<10;j++){d.position.set(-RAMP.length/2+.04+i*(RAMP.length-.08)/104,.004,-.97+j*.213);d.rotation.set(0,(i+j)%2?.45:-.45,0);d.scale.set(.044,.004,.013);d.updateMatrix();tread.setMatrixAt(n++,d.matrix);}tread.receiveShadow=true;textureGroup.add(tread);
 box(S,L+.2,2.8,.12,L/2,1.25,-1.19,wall);
 for(let x=0;x<=L+.1;x+=.87){rod(S,[x,rampFloor(x),1.15],[x,rampFloor(x)+1.02,1.15],.024,steel);}
 for(const y of[.45,1.02])rod(S,[0,y,1.15],[L,RAMP.rise+y,1.15],.022,steel);
 // Platform barrier continues clear of the crew's landing space.
 for(const x of[L,L+1.6,L+3.2,L+5.2])rod(S,[x,RAMP.rise,3.2],[x,RAMP.rise+1.05,3.2],.022,steel);
 rod(S,[L,RAMP.rise+1.05,3.2],[L+5.2,RAMP.rise+1.05,3.2],.025,steel);
 for(let x=L;x<L+5.2;x+=.6)for(let z=-1;z<3.1;z+=.6)box(S,.592,.012,.592,x+.3,RAMP.rise+.006,z+.3,mat('#d6d9d6'));
 // 坡顶平台保持空旷：按用户标注移除三台背景机柜。
 for(const y of[2.25,2.5])rod(S,[-.5,y,-1.09],[L+4,y,-1.09],.038,steel);
 for(let x=.3;x<L+3;x+=1.8){box(S,1.1,.11,.19,x,2.38,-.98,white);box(S,1,.024,.12,x,2.32,-.97,new THREE.MeshBasicMaterial({color:'#fffce9'}));}
 box(S,.09,2.5,.13,-.06,1.25,-1.05,steel);box(S,.09,2.5,.13,-.06,1.25,1.05,steel);box(S,.09,.1,2.23,-.06,2.45,0,steel);
 const hero=new THREE.Group();S.add(hero);box(hero,1.4,2.25,.6,0,1.125,0,white);
 for(const x of[-.68,.68])for(const z of[-.28,.28])box(hero,.036,2.25,.036,x,1.125,z,white);
 const wheels=[];for(const x of[-.60,.60])for(const z of[-.24,.24]){const w=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.032,16),band);w.rotation.x=Math.PI/2;S.add(w);const fork=rod(S,[0,0,0],[0,1,0],.012,steel);wheels.push({mesh:w,fork,x,z});}
 // One continuous rectangular webbing path: two horizontal wraps, then two free tails.
 const belt=new THREE.Group();S.add(belt);const pieces=[];for(let i=0;i<9;i++)pieces.push(box(belt,1,.062,.009,0,0,0,band));
 const tails=[box(S,1,.065,.009,0,0,0,band),box(S,1,.065,.009,0,0,0,band)];
 const people=[];for(let i=0;i<10;i++){const person=createWorker(i);S.add(person);person.traverse(o=>{if(o.isMesh)o.material=o.material===M.helmet?M.helmet:white;});people.push(person);}
 ramp={scene:S,hero,wheels,people,pieces,tails,time:0,enabled:false,pullCount:6,handTargets:[]};poseRamp(0);
}
function rampStrip(mesh,a,b){const v=new THREE.Vector3(...b).sub(new THREE.Vector3(...a));mesh.position.fromArray(a).addScaledVector(v,.5);mesh.scale.set(v.length(),.065,.009);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(1,0,0),v.normalize());}
// World-space hand targets are solved explicitly; hands cannot drift away from the strap/frame.
function poseRampPerson(g,x,z,yaw,targets,phase,role){
 const y=rampFloor(x);g.position.set(x,y,z);g.rotation.set(0,yaw,0);const D=g.userData,drop=role==='pull'?.15:.07;
 D.skeleton.position.set(0,-drop,role==='pull'?-.045:role==='push'?.015:0);D.skeleton.rotation.x=role==='pull'?-.07:role==='push'?.065:0;
 const toLocal=v=>v.clone().sub(g.position).applyAxisAngle(new THREE.Vector3(0,1,0),-yaw);
 for(const leg of D.legs){const cycle=x/.32+(leg.side===1?.5:0)+D.index*.11,step=Math.floor(cycle),u=cycle-step,swing=Math.max(0,(u-.6)/.4),advance=swing*swing*(3-2*swing);const world=new THREE.Vector3(g.position.x,0,g.position.z).add(new THREE.Vector3(leg.side*.11,0,0).applyAxisAngle(new THREE.Vector3(0,1,0),yaw));world.x+=(step+advance-cycle+.3)*.32;const ankle=toLocal(world);ankle.y=rampFloor(world.x)-y+.09+Math.sin(swing*Math.PI)*.055;const hip=new THREE.Vector3(leg.side*.095,.83-drop,0),knee=bentJoint(hip,ankle,.41,.39,new THREE.Vector3(0,0,1));setBeam(leg.thigh,hip.toArray(),knee.toArray(),.074);setBeam(leg.shin,knee.toArray(),ankle.toArray(),.057);leg.knee.position.copy(knee);leg.foot.position.set(ankle.x,ankle.y-.045,ankle.z+.035);}
 D.arms.forEach((arm,i)=>{const shoulder=new THREE.Vector3(arm.side*.207,1.28-drop,role==='pull'?-.045:.015),hand=toLocal(targets[i]);const elbow=bentJoint(shoulder,hand,.30,.30,new THREE.Vector3(arm.side*.5,-1,0));arm.shoulder.position.copy(shoulder);arm.joint.position.copy(elbow);arm.hand.position.copy(hand);arm.hand.scale.set(1,.7,role==='pull'?1:1.2);setBeam(arm.upper,shoulder.toArray(),elbow.toArray(),.057);setBeam(arm.fore,elbow.toArray(),hand.clone().add(new THREE.Vector3(0,0,role==='pull'?0:-.05)).toArray(),.047);});
 poseRefinedHands(g,role==='pull');
 // Open palms remain parallel to the contacted cabinet frame.
 if(role!=='pull')for(const arm of D.arms)arm.hand.quaternion.identity();
}
function poseRamp(p){
 const R=ramp,x=THREE.MathUtils.lerp(RAMP.start,RAMP.end,p*p*(3-2*p)),base=rampFloor(x+.6)+.05;R.hero.position.set(x,base,0);R.hero.rotation.set(0,0,0);
 R.wheels.forEach(w=>{const y=rampFloor(x+w.x);w.mesh.position.set(x+w.x,y+.025,w.z);w.mesh.rotation.y=-p*200;setBeam(w.fork,[x+w.x,y+.025,w.z],[x+w.x,base+.015,w.z],.012);});
 const y=base+.87,points=[[x+.706,y,-.309],[x-.706,y,-.309],[x-.706,y,.309],[x+.706,y,.309],[x+.714,y,.317],[x-.714,y,.317],[x-.714,y,-.317],[x+.714,y,-.317],[x+.714,y,.325],[x+.706,y,.325]];
 R.pieces.forEach((m,i)=>rampStrip(m,points[i],points[i+1]));
 const tailStart=x+.706,tailEnd=x+RAMP.pullOffsets[(R.pullCount||6)/2-1]+.11;
 const tailY=q=>y+(rampFloor(q)-rampFloor(tailStart));
 // The two ends stay parallel and unbranched; all six grips lie on these lines.
 for(let side=0;side<2;side++){const sign=side?1:-1,z=sign*.317;rampStrip(R.tails[side],[tailStart,y,z],[tailEnd,tailY(tailEnd),z]);}
 R.handTargets=[];const phase=p*70;
 for(let i=0;i<6;i++){R.people[i].visible=i%3<(R.pullCount||6)/2;const sign=i<3?-1:1,px=x+RAMP.pullOffsets[i%3],z=sign*.56;const targets=[-.08,.08].map(dx=>new THREE.Vector3(px+dx,THREE.MathUtils.lerp(y,tailY(tailEnd),(px+dx-tailStart)/(tailEnd-tailStart)),sign*.317));poseRampPerson(R.people[i],px,z,-Math.PI/2,targets,phase,'pull');R.handTargets.push(targets);}
 for(let i=0;i<2;i++){const sign=i?1:-1,targets=[-.15,.15].map(dx=>new THREE.Vector3(x+dx,base+1.13,sign*.322));poseRampPerson(R.people[6+i],x,sign*.78,sign===1?Math.PI:0,targets,phase,'steady');R.handTargets.push(targets);}
 for(let i=0;i<2;i++){const sign=i?1:-1,targets=[.055,-.055].map(dz=>new THREE.Vector3(x-.723,base+1.12,sign*.245+dz));poseRampPerson(R.people[8+i],x-1.04,sign*.49,Math.PI/2,targets,phase,'push');R.handTargets.push(targets);}
 if(typeof document!=='undefined'){$('tour-progress').style.width=p*100+'%';$('action-label').textContent=p<.92?(R.pullCount||6)+' 人倒退牵引 · 2 人侧扶 · 2 人后推':p<1?'坡顶接应 · 机柜进入静电地板平台':'机柜已通过斜坡进入机房';$('action-counter').textContent=Math.round(p*100)+'%';}
}


// Labels use projected world anchors, keeping construction positions independent of label layout.
function initRampNotes(){
 const R=ramp,host=$('ramp-overlay');host.replaceChildren();R.annotationsVisible=true;R.layers={person:true,dimension:true,force:false};R.notes=[];
 const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');host.append(svg);R.noteSvg=svg;
 const add=(text,kind,point,dx=0,dy=-20)=>{const el=document.createElement('span');el.className='ramp-note '+kind;el.textContent=text;host.append(el);const line=document.createElementNS(svg.namespaceURI,'line');line.setAttribute('stroke',kind==='force'?'#b96755':'#6f999d');line.setAttribute('stroke-width','1');svg.append(line);R.notes.push({el,line,point,dx,dy});};
 R.people.forEach((person,i)=>{add(i<6?'牵引':i<8?'侧付':'后推','person',()=>person.localToWorld(new THREE.Vector3(0,1.8,0)),i<3?-30:i<6?38:i===6?-60:45,i<6?-28:20);R.notes.at(-1).person=person;});
 add('机柜搬运重量 1620 kg','mass',()=>R.hero.position.clone().add(new THREE.Vector3(0,2.4,0)),0,-35);R.massNote=R.notes.at(-1);
 add('净宽 2.20 m','dimension',()=>new THREE.Vector3(.3,rampFloor(.3)+.05,0),-25,30);
 add('坡长 5.75 m · θ = 8° / 14.05%','dimension',()=>new THREE.Vector3(2.6,rampFloor(2.6),1.16),0,38);
 add('高差 0.80 m','dimension',()=>new THREE.Vector3(RAMP.rise/Math.tan(RAMP.angle),RAMP.rise/2,1.15),40,35);
 add('长边 1.40 m 沿坡向','dimension',()=>R.hero.position.clone().add(new THREE.Vector3(0,.12,.36)),65,40);
 add('中部绑带 · 人员站位演示','dimension',()=>R.hero.position.clone().add(new THREE.Vector3(.70,.87,0)),65,65);
 R.forceGroup=new THREE.Group();R.scene.add(R.forceGroup);const theta=RAMP.angle;
 const defs=[['重力 G = mg',[0,-1,0],0xd56a55],['支持力 N',[-Math.sin(theta),Math.cos(theta),0],0x38a697],['牵引 + 推力',[Math.cos(theta),Math.sin(theta),0],0x407db5],['滚动阻力',[ -Math.cos(theta),-Math.sin(theta),0],0xb68b3f]];
 R.forceArrows=defs.map(([name,direction,color],i)=>{const arrow=new THREE.ArrowHelper(new THREE.Vector3(...direction),new THREE.Vector3(),i===3?.55:.95,color,.13,.065);R.forceGroup.add(arrow);add(name,'force',()=>arrow.position.clone().addScaledVector(new THREE.Vector3(...direction),i===3?.55:.95),i===2?38:i===3?-45:45,i===0?15:-14);return arrow;});
 // Dimension lines include both edges of the actual 2.2 m deck.
 const dimensionMaterial=new THREE.LineBasicMaterial({color:'#348889'});
 const pts=[[.3,rampFloor(.3)+.018,-1.1],[.3,rampFloor(.3)+.018,1.1]];
 R.forceGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts.map(p=>new THREE.Vector3(...p))),dimensionMaterial));
 for(const z of[-1.1,1.1])R.forceGroup.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(.18,rampFloor(.3)+.02,z),new THREE.Vector3(.42,rampFloor(.3)+.02,z)]),dimensionMaterial));
 updateRampForceText();
}
function updateRampForceText(){
 const mass=Number($('ramp-mass').value),theta=RAMP.angle,valid=Number.isFinite(mass)&&mass>0&&mass<=100000;
 if(ramp?.massNote)ramp.massNote.el.textContent=valid?'机柜搬运重量 '+mass.toLocaleString()+' kg':'机柜搬运重量：待确认';
 if(!valid){$('ramp-force-values').textContent='机柜重量待确认；受力箭头仅表示方向。';return;}
 // User-defined staffing tiers; 1000 and 1500 kg both belong to the middle tier.
 ramp.pullCount=mass<1000?2:mass<=1500?4:6;
 $('ramp-crew-title').textContent='人工斜坡搬运 · '+(ramp.pullCount+4)+' 人协同';
 $('ramp-crew-summary').textContent=ramp.pullCount+' 人倒退牵引（左右各 '+ramp.pullCount/2+' 人） · 2 人侧扶 · 2 人后推';
 ramp.lastTransportTime=null;renderDirty=true;if(ramp.enabled){poseRamp(Math.min(1,ramp.time/RAMP.duration));updateRampNotes();}
 const G=mass*9.81/1000,Fg=G*Math.sin(theta),N=G*Math.cos(theta),force=mu=>(Fg+mu*N).toFixed(2);
 $('ramp-force-values').innerHTML='<b>受力要点</b><br>重力：'+G.toFixed(2)+' kN<br>沿坡下滑分力：<b>'+Fg.toFixed(2)+' kN</b><br>匀速上坡合力：<b>'+force(.02)+'–'+force(.15)+' kN</b><br><small>牵引＋推动合力；滚阻系数 0.02–0.15。</small><hr style="border:0;border-top:1px solid #dde4e6">低位牵引建议：200–400 mm<br><small>简化估算，待实测校核；中部绑带仅示意握持。</small>';
}
function updateRampNotes(){
 const R=ramp;if(!R.notes)return;const host=$('ramp-overlay');host.hidden=!R.annotationsVisible;R.forceGroup.visible=R.annotationsVisible;if(!R.annotationsVisible)return;
 const x=R.hero.position.x;R.forceArrows.forEach(a=>a.position.set(x,R.hero.position.y+1.04,1.58));
 // Force diagram is a separate schematic beside the cabinet, not an assumed centre of gravity.
 const onSlope=x+.6<RAMP.rise/Math.tan(RAMP.angle);R.forceArrows.forEach(a=>a.visible=onSlope&&R.layers.force);
 R.forceGroup.children.filter(o=>o.isLine).forEach(o=>o.visible=R.layers.dimension);
 camera.updateMatrixWorld();R.scene.updateMatrixWorld(true);const w=$('viewport').clientWidth,h=$('viewport').clientHeight,rects=[];
 R.notes.forEach(n=>{const kind=n.el.classList.contains('force')?'force':n.el.classList.contains('person')?'person':'dimension';if(n.person&&!n.person.visible||!R.layers[kind]||kind==='force'&&!onSlope){n.el.hidden=true;n.line.style.display='none';return;}const p=n.point().clone().project(camera),ax=(p.x*.5+.5)*w,ay=(-p.y*.5+.5)*h;
 const visible=p.z>-1&&p.z<1&&ax>0&&ax<w&&ay>0&&ay<h;n.el.hidden=!visible;n.line.style.display=visible?'':'none';if(!visible)return;
 const width=n.el.offsetWidth||110;let lx=Math.max(width/2+8,Math.min(w-width/2-8,ax+n.dx)),ly=Math.max(100,Math.min(h-115,ay+n.dy));
 for(let attempt=0;attempt<15&&rects.some(r=>Math.abs(lx-r.x)<(width+r.width)/2+5&&Math.abs(ly-r.y)<23);attempt++)ly=Math.max(75,ly-25);
 rects.push({x:lx,y:ly,width});n.el.style.left=lx+'px';n.el.style.top=ly+'px';n.line.setAttribute('x1',ax);n.line.setAttribute('y1',ay);n.line.setAttribute('x2',lx);n.line.setAttribute('y2',ly);
 });
}


// All playback modes support deterministic seeking; backward seeking resets collision history.

