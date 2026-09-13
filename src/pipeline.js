function createPipelineSchedule(){return {time:0,liftReady:0,owners:{lift:1,corner:2,cart:2,install:0},lastLift:1,jobs:[5,4,2,1].map((stage,i)=>({index:i,stage,p:0,wait:'',done:false}))};}
function advancePipeline(ms,state=pipeline.schedule){
 let remaining=ms;while(remaining>0){const dt=Math.min(remaining,40);remaining-=dt;state.time+=dt;
  for(const job of state.jobs){if(job.done)continue;const id=job.index;job.wait='';
   if(job.stage===1&&job.p>=.15&&(state.owners.corner!==null||state.owners.cart!==null)){job.wait='等待拆包工位 / 清运车';continue;}
   if(job.stage===2){if(state.owners.corner!==null&&state.owners.corner!==id||state.owners.cart!==null&&state.owners.cart!==id){job.wait='等待拆包工位 / 清运车';continue;}state.owners.corner=id;state.owners.cart=id;}
   if(job.stage===3||job.stage===4){if(state.owners.lift!==null&&state.owners.lift!==id||state.time<state.liftReady){job.wait='等待升降机';continue;}state.owners.lift=id;state.lastLift=id;}
   if(job.stage>=5){if(state.owners.install!==null&&state.owners.install!==id){job.wait='等待安装组（2 人）';continue;}state.owners.install=id;}
   const limit=job.stage===1&&(state.owners.corner!==null||state.owners.cart!==null)?.15:1;job.p=Math.min(limit,job.p+dt/STEPS[job.stage].duration);
   if(job.p>=1-1e-9){
    if(job.stage===3){state.owners.corner=null;state.owners.cart=null;}
    if(job.stage===4){state.owners.lift=null;state.liftReady=state.time+4000;}
    if(job.stage===7){job.done=true;job.p=1;state.owners.install=null;}else{job.stage++;job.p=0;}
   }
  }
 }
}
function initPipeline(){
 const base=installation,mainScene=scene,baseFlow=scene.userData.flow,baseSelect=[...selectables],baseRacks=[...racks],basePaths=[...flowPaths],D=base.fixDetail;
 pipeline={enabled:false,labels:true,focus:0,base,contexts:[base],roots:[],schedule:createPipelineSchedule(),reserved:baseRacks.filter(r=>[10,11,12].includes(r.userData.referenceId))};
 base.pipelineFlow=baseFlow;
 for(let i=1;i<4;i++){
  const temp=new THREE.Scene();temp.environment=mainScene.environment;scene=temp;selectables.length=0;racks.length=0;flowPaths.length=0;buildEquipment(i*.615,9+i,false);const I=installation;I.fixDetail=D;I.pipelineFlow=temp.userData.flow;
  const root=new THREE.Group();root.name='pipeline-cabinet-'+i;root.visible=false;mainScene.add(root);
  const objects=new Set();for(const value of Object.values(I)){if(value?.isObject3D&&value.parent===temp)objects.add(value);if(Array.isArray(value))for(const item of value)if(item?.isObject3D&&item.parent===temp)objects.add(item);}
  for(const item of selectables)if(item.parent===temp)objects.add(item);objects.add(I.pipelineFlow.mesh);
  for(const item of objects){root.add(item);item.userData.pipelineIndex=i;}box(root,.60,.08,.24,MOTION.target[0]+i*.615,3.32,1.40,M.steel);
  I.hero.userData.modelInfo={name:String.fromCharCode(65+i)+' 柜 · '+(9+i)+' 号',fields:[['尺寸','0.60 × 2.25 × 1.40 m'],['作业模式','流水线并行施工']]};
  I.pipelineRoot=root;pipeline.roots.push(root);pipeline.contexts.push(I);
 }
 scene=mainScene;installation=base;scene.userData.flow=baseFlow;selectables.length=0;selectables.push(...baseSelect);racks.length=0;racks.push(...baseRacks);flowPaths.length=0;flowPaths.push(...basePaths);
 pipeline.contexts.reverse();pipeline.contexts.forEach((I,i)=>{if(I.pipelineRoot)I.pipelineRoot.traverse(o=>{if(o.userData.pipelineIndex!==undefined)o.userData.pipelineIndex=i;});I.hero.userData.modelInfo??={fields:[['尺寸','0.60 × 2.25 × 1.40 m']]};I.hero.userData.modelInfo.name=String.fromCharCode(65+i)+' 柜 · '+I.slot+' 号';I.hero.userData.pipelineIndex=i;I.workers.forEach(w=>w.userData.pipelineIndex=i);if(I!==base){racks.push(I.hero);selectables.push(I.hero,...I.workers,I.jack,I.lift,I.wasteCart,...I.hoses);}});
 const rows=$('pipeline-rows');rows.replaceChildren();pipeline.contexts.forEach((I,i)=>{const b=document.createElement('button');b.className='pipeline-row';b.id='pipeline-row-'+i;b.onclick=()=>focusPipeline(i);b.innerHTML='<strong>'+String.fromCharCode(65+i)+' 柜 · '+I.slot+' 号位</strong><span id="pipeline-status-'+i+'"></span><small id="pipeline-job-'+i+'"></small><div class="pipeline-meter"><i id="pipeline-progress-'+i+'"></i></div>';rows.append(b);const tag=document.createElement('button');tag.className='cabinet-tag';tag.id='pipeline-tag-'+i;tag.onclick=()=>focusPipeline(i);$('pipeline-labels').append(tag);});
}
function startPipeline(){
 pipeline.enabled=true;pipeline.schedule=createPipelineSchedule();pipeline.focus=0;pipeline.lastStage=-1;pipeline.contexts.forEach(I=>{I.safeCabinet=null;I.collisionFrame=null;});pipeline.roots.forEach(r=>r.visible=true);pipeline.reserved.forEach(r=>r.visible=false);$('pipeline-board').hidden=false;$('pipeline-mode').textContent='切回单柜';demoStarted=true;demoFinished=false;renderPipeline();
}
function stopPipeline(){if(!pipeline)return;pipeline.enabled=false;pipeline.roots.forEach(r=>r.visible=false);pipeline.reserved.forEach(r=>r.visible=true);installation=pipeline.base;scene.userData.flow=installation.pipelineFlow;$('pipeline-board').hidden=true;$('pipeline-mode').textContent='流水线模式';for(let i=0;i<4;i++)$('pipeline-tag-'+i).hidden=true;installation.lift.visible=true;installation.secondary.visible=true;installation.safeCabinet=null;installation.collisionFrame=null;}
function focusPipeline(index){if(!pipeline?.enabled)return;pipeline.focus=index;pipeline.lastStage=-1;renderPipeline();}
function resolvePipelineCrews(){
 const P=pipeline,people=[];
 for(const job of P.schedule.jobs){const I=P.contexts[job.index];I.workers.forEach((w,i)=>{if(w.visible){const q=I.collisionFrame.poses[i];people.push({w,q,I,job,r:.35+.32*Math.sqrt(q.kneel||0)});}});}
 // 单柜避碰之后再做跨作业组检测，蹲姿保留膝部操作空间。
 for(let pass=0;pass<70;pass++){
  for(let i=0;i<people.length;i++)for(let j=i+1;j<people.length;j++){const a=people[i],b=people[j];if(Math.abs(a.q.y-b.q.y)>1.65)continue;let dx=b.q.x-a.q.x,dz=b.q.z-a.q.z,d=Math.hypot(dx,dz),min=a.r+b.r+.025;if(d<min){if(d<.00001){dx=1;dz=0;d=1;}const delta=(min-Math.hypot(b.q.x-a.q.x,b.q.z-a.q.z))/2+.0001;a.q.x-=dx/d*delta;a.q.z-=dz/d*delta;b.q.x+=dx/d*delta;b.q.z+=dz/d*delta;}}
  for(const a of people)for(const obstacle of a.I.collisionFrame.obstacles)pushOut(a.q,obstacle,a.r);
 }
 for(const a of people){installation=a.I;const s=installationState(a.job.stage,a.job.p);poseWorker(a.w,a.q,a.I.collisionFrame.obstacles,s);}
}
function renderPipeline(){
 if(!pipeline?.enabled)return;const P=pipeline,S=P.schedule,order=[0,1,2,3].filter(i=>i!==P.focus).concat(P.focus),D=P.base.fixDetail;
 // 先设置各柜真实位置，使所有实例的避碰判断看到同一时刻的机柜。
 for(const job of S.jobs){installation=P.contexts[job.index];const s=installationState(job.stage,job.p);installation.hero.position.set(s.x,s.y,s.z);installation.hero.rotation.set(s.pitch,s.yaw,0);}
 for(const i of order){const job=S.jobs[i],I=P.contexts[i];installation=I;scene.userData.flow=I.pipelineFlow;I.fixDetail=null;applyInstallation(job.stage,job.p);I.pipelineCollision=$('viewport').dataset.cabinetCollision;I.fixDetail=D;
  I.boards.forEach(b=>b.visible=i===0);I.secondary.visible=i===0;I.lift.visible=i===S.lastLift;I.bridge.visible=i===S.owners.lift&&job.stage===4&&job.p>=.4;I.loadRamp.visible=i===S.owners.lift&&job.stage===3;I.wasteCart.visible=i===S.owners.cart&&I.wasteCart.visible;I.workPlatform.visible=i===S.owners.install&&job.stage===6;
  if(job.done||job.wait&&job.stage>=5)I.workers.forEach(w=>w.visible=false);
  if(job.wait&&job.stage===1)I.workers.forEach(w=>{w.userData.gait=0;});
  $('pipeline-status-'+i).textContent=job.done?'已完成':job.wait?'等待工位':'施工中';$('pipeline-job-'+i).textContent=job.done?'连接完成 · 待检验':job.wait||STEPS[job.stage].name+' · '+(job.stage>=5?'安装组 2 人':job.stage===2?'拆包组 4 人':'搬运组 4 人');$('pipeline-progress-'+i).style.width=((job.stage+job.p)/8*100)+'%';$('pipeline-row-'+i).classList.toggle('active',i===P.focus);
 }
 // 空闲升降机缓慢降回走廊高度，下降结束后才可交接。
 if(S.owners.lift===null&&S.time<S.liftReady){const I=P.contexts[S.lastLift],t=smooth(1-(S.liftReady-S.time)/4000),liftY=blend(MOTION.floorY,MOTION.liftLow,t);I.deck.position.y=liftY+.79;const height=I.deck.position.y-.055,spread=Math.sqrt(Math.max(.1,1.38*1.38-(height-.08)**2))/2;I.liftBeams.forEach(beam=>{const{x,reverse}=beam.userData;setBeam(beam,[x,.08,reverse?spread:-spread],[x,height,reverse?-spread:spread],.034);});}
 resolvePipelineCrews();installation=P.contexts[P.focus];scene.userData.flow=installation.pipelineFlow;const job=S.jobs[P.focus];current=job.stage;tourElapsed=job.p*STEPS[current].duration;completed=new Set(Array.from({length:job.done?8:job.stage},(_,i)=>i));
 if(P.lastStage!==current||P.lastFocus!==P.focus){renderUI();$('detail-location').textContent=STEPS[current].area.replace('9 号',String(P.contexts[P.focus].slot)+' 号');P.lastStage=current;P.lastFocus=P.focus;}
 if(job.wait)$('action-label').textContent=String.fromCharCode(65+P.focus)+' 柜 · '+job.wait;
 const name=id=>id===null?'空闲':String.fromCharCode(65+id)+' 柜';$('pipeline-resources').textContent='升降机：'+name(S.owners.lift)+' ｜ 清运车：'+name(S.owners.cart)+' ｜ 安装组：'+name(S.owners.install)+' ｜ 已完成 '+S.jobs.filter(j=>j.done).length+'/4 · 点柜号切换观察，点工序进入单柜';
 updatePipelineLabels();
}
function updatePipelineLabels(){if(!pipeline?.enabled)return;const w=$('viewport').clientWidth,h=$('viewport').clientHeight;pipeline.contexts.forEach((I,i)=>{const tag=$('pipeline-tag-'+i),job=pipeline.schedule.jobs[i],p=I.hero.position.clone().add(new THREE.Vector3(0,2.55,0)).project(camera);tag.hidden=!pipeline.labels||p.z<-1||p.z>1||Math.abs(p.x)>1||Math.abs(p.y)>1;tag.style.left=((p.x*.5+.5)*w)+'px';tag.style.top=((-p.y*.5+.5)*h)+'px';tag.textContent=String.fromCharCode(65+i)+' 柜（'+I.slot+'号） · '+(job.done?'已完成':job.wait?'等待':STEPS[job.stage].name);tag.classList.toggle('active',i===pipeline.focus);});}
function moveCamera(position,target,span=OVERVIEW.span){if(playing)return;controls.autoRotate=false;controls.enableDamping=false;controls.update();controls.enableDamping=true;transition={start:performance.now(),from:camera.position.clone(),fromTarget:controls.target.clone(),fromSpan:camera.userData.span,fromZoom:camera.zoom,to:new THREE.Vector3(...position),toTarget:new THREE.Vector3(...target),toSpan:span};}

// Alternate transport scene: positions are in metres; +X is uphill, +Z is rail side.
