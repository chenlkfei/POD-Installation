// Repeated transport only: hold on the top platform, then reset for the next cycle.
function rampFlowLength(){return RAMP.duration+2;}
function rampFlowPoints(){return [[0,'斜坡搬运'],[RAMP.duration*.72,'坡顶过渡'],[RAMP.duration,'到达坡顶 · 循环等待']];}
function renderRampFlow(seconds){
 const R=ramp;
 if(R.flowPhase!=='ramp'){R.flowPhase='ramp';document.body.classList.remove('ramp-install');rampCamera();}
 const p=Math.min(1,seconds/RAMP.duration);
 if(R.lastTransportTime!==seconds){poseRamp(p);R.lastTransportTime=seconds;}
 if(seconds>=RAMP.duration)$('action-label').textContent='已到达坡顶 · 即将重复搬运';
 updateRampNotes();
}

function demoLength(){
 if(ramp?.enabled)return rampFlowLength();
 if(pipeline?.enabled){if(!demoLength.pipeline){const S=createPipelineSchedule();while(!S.jobs.every(j=>j.done)&&S.time<600000)advancePipeline(40,S);demoLength.pipeline=S.time;}return demoLength.pipeline/1000;}
 return STEPS.reduce((n,s)=>n+s.duration,0)/1000;
}
function demoTime(){return ramp?.enabled?ramp.time:pipeline?.enabled?pipeline.schedule.time/1000:(STEPS.slice(0,current).reduce((n,s)=>n+s.duration,0)+tourElapsed)/1000;}
function refreshSeek(){if(typeof document==='undefined'||!document.getElementById)return;const slider=$('seek-time');if(!slider)return;const total=demoLength(),time=demoTime(),key=ramp?.enabled?'ramp':pipeline?.enabled?'pipeline':'single';
 const fmt=s=>String(Math.floor(s/60)).padStart(2,'0')+':'+String(Math.floor(s%60)).padStart(2,'0');slider.value=String(Math.round(time/total*1000));$('seek-clock').textContent=fmt(time)+' / '+fmt(total);
 if(refreshSeek.key!==key){refreshSeek.key=key;const points=key==='ramp'?rampFlowPoints():key==='pipeline'?[[0,'并行施工开始'],[total*.33,'流水线 · 前段'],[total*.66,'流水线 · 后段'],[total,'全部安装完成']]:STEPS.map((s,i)=>[STEPS.slice(0,i).reduce((n,v)=>n+v.duration,0)/1000,s.name]);$('jump-action').replaceChildren(...points.map(([value,label])=>{const option=document.createElement('option');option.value=value;option.textContent=label;return option;}));}
}
function seekDemo(seconds){if(!loaded)return;setPlaying(false);demoStarted=true;demoFinished=false;const t=THREE.MathUtils.clamp(seconds,0,demoLength());
 if(ramp?.enabled){ramp.time=t;renderRampFlow(t);}
 else if(pipeline?.enabled){startPipeline();advancePipeline(t*1000);pipeline.contexts.forEach(I=>{I.safeCabinet=null;I.collisionFrame=null;});renderPipeline();}
 else{let remaining=t*1000,stage=0;while(stage<7&&remaining>=STEPS[stage].duration){remaining-=STEPS[stage++].duration;}installation.safeCabinet=null;installation.collisionFrame=null;selectStep(stage,false,false);tourElapsed=remaining;applyInstallation(stage,remaining/STEPS[stage].duration);completed=new Set(Array.from({length:stage},(_,i)=>i));renderUI();}
 demoFinished=t>=demoLength();setPlaying(false);renderDirty=true;refreshSeek();
}

function animate(now){
 requestAnimationFrame(animate);if(document.hidden){lastTime=now;return;}const dt=Math.min((now-(lastTime||now))/1000,.05);lastTime=now;
 if(!playing&&!transition&&!autoRotate&&!renderDirty)return;renderDirty=false;
 if(ramp?.enabled){if(playing){ramp.time=(ramp.time+dt*playbackRate)%rampFlowLength();demoFinished=false;}else controls.update(dt);renderRampFlow(ramp.time);refreshSeek();renderer.render(ramp.scene,camera);return;}
 // 过渡时由缓动函数独立驱动镜头，避免 OrbitControls 阻尼叠加到推荐位置。
 if(transition&&!playing){const t=Math.max(0,Math.min(1,(now-transition.start)/CONFIG.cameraDuration)),ease=easeInOutCubic(t);camera.position.lerpVectors(transition.from,transition.to,ease);controls.target.lerpVectors(transition.fromTarget,transition.toTarget,ease);camera.lookAt(controls.target);camera.userData.span=THREE.MathUtils.lerp(transition.fromSpan,transition.toSpan,ease);camera.zoom=THREE.MathUtils.lerp(transition.fromZoom,1,ease);resize();if(t===1){transition=null;controls.autoRotate=autoRotate&&!playing;}}else if(!playing)controls.update(dt);
 if(playing&&pipeline?.enabled){advancePipeline(dt*1000*playbackRate);renderPipeline();if(pipeline.schedule.jobs.every(j=>j.done)){demoFinished=true;setPlaying(false);toast('四台机柜流水线施工已完成');}}
 else if(playing){
  tourElapsed+=dt*1000*playbackRate;
  if(tourElapsed>=STEPS[current].duration){applyInstallation(current,1);completed.add(current);const overflow=tourElapsed-STEPS[current].duration;if(current<STEPS.length-1){selectStep(current+1,false,false);tourElapsed=overflow;}else{tourElapsed=STEPS[current].duration;demoFinished=true;renderUI();setPlaying(false);toast('八道施工工序演示已完成');}}
  applyInstallation(current,Math.min(1,tourElapsed/STEPS[current].duration));
 }
 $('tour-progress').style.width=Math.min(100,tourElapsed/STEPS[current].duration*100)+'%';
 // 播放时保留开始演示时的相机位置、目标和缩放；不跟随或逐步切镜。

 const time=now/1000;for(const marker of anchorMarkers)marker.ring.quaternion.copy(camera.quaternion);
 // 锚点保持静态，仅让标记面朝相机；流体粒子保持原有流动效果。
 const flow=scene.userData.flow;if(flow){const arr=flow.geometry.attributes.position.array;flow.points.forEach((p,i)=>p.curve.getPointAt((time*p.speed+p.phase)%1).toArray(arr,i*3));flow.geometry.attributes.position.needsUpdate=true;}
 refreshSeek();updatePipelineLabels();updateAnchors();updateCabinetVisibility();renderer.render(scene,camera);renderFixingDetail();
}
function updateAnchors(){if(!labelsVisible)return;const w=$('viewport').clientWidth,h=$('viewport').clientHeight;const placed=[];anchors.sort((a,b)=>(b.step===current)-(a.step===current)).forEach(a=>{a.projected.copy(a.position);a.projected.y+=.32;a.projected.project(camera);const x=(a.projected.x*.5+.5)*w,y=(-a.projected.y*.5+.5)*h;const visible=a.projected.z>-1&&a.projected.z<1&&x>25&&x<w-25&&y>95&&y<h-96;a.el.style.display=visible?'':'none';if(!visible)return;let offset=0;for(const r of placed)if(Math.abs(x-r.x)<124&&Math.abs(y+offset-r.y)<35)offset-=36;const top=Math.max(100,y+offset);a.el.style.left=x+'px';a.el.style.top=top+'px';a.el.style.setProperty('--offset',Math.abs(offset)+'px');a.el.classList.toggle('faded',a.step!==current&&!!transition);placed.push({x,y:top});});}
