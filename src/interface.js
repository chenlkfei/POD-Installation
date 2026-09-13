const CONFIG={pixelRatio:Math.min(window.devicePixelRatio,2),shadowSize:2048,cameraDuration:1400};
const $=id=>document.getElementById(id), svg=id=>`<svg><use href="#i-${id}"/></svg>`;
let current=0,playing=false,labelsVisible=false,autoRotate=false,completed=new Set(),tourElapsed=0,loaded=false,demoStarted=false,demoFinished=false,playbackRate=2;
let THREE,OrbitControls,RoomEnvironment,renderer,scene,camera,controls,transition=null,clock,lastTime=0;
let M,unitBox,cylinder,batches=new Map(),dummy;
const anchors=[],anchorMarkers=[],flowPaths=[],selectables=[],racks=[];
let installation=null;let pipeline=null;let ramp=null;let renderDirty=true;
const riskClass=s=>s.risk==='高'?'high':s.risk==='中'?'medium':'';
function renderUI(){
 $('steps').innerHTML=STEPS.map((s,i)=>`<li><button class="step ${i===current?'active':''} ${completed.has(i)?'done':''}" data-step="${i}" aria-current="${i===current?'step':'false'}"><span class="step-number mono">${completed.has(i)?'✓':String(i+1).padStart(2,'0')}</span><span><strong>${s.name}</strong><small>${s.en}</small></span><i class="risk-dot ${riskClass(s)}"></i></button></li>`).join('');
 const source=STEPS[current],slot=pipeline?.enabled?String(pipeline.contexts[pipeline.focus].slot):'9';const s={...source,desc:source.desc.replaceAll('9 号',slot+' 号'),params:source.params.map(([k,v])=>[k,v.replaceAll('9 号',slot+' 号')])};
 $('detail-content').innerHTML=`<div class="detail-kicker"><span class="mono">STEP ${String(current+1).padStart(2,'0')}</span><span class="badge ${riskClass(s)}">${s.risk}风险</span></div><h2>${s.name}</h2><p class="description">${s.desc}</p><h3 class="section-heading">${svg('grid')}关键参数</h3><div class="params">${s.params.map(([k,v])=>`<div class="param"><small>${k}</small><strong class="mono ${v.length>10?'long':''}">${v}</strong></div>`).join('')}</div><h3 class="section-heading">${svg('note')}作业注意事项 <span class="muted mono" style="margin-left:auto;font-weight:400;font-size:10px">${String(s.notes.length).padStart(2,'0')} ITEMS</span></h3><ol class="notes">${s.notes.map(([v,k])=>`<li class="${k?'critical':''}">${v}</li>`).join('')}</ol><p class="source">内容依据：参考图 2 及流程补充。图示参数为项目参考值；本页用于工序演示，执行前以获批施工方案和设备安装文件为准。</p>`;
 $('current-number').textContent=String(current+1).padStart(2,'0');$('detail-location').textContent=s.area;$('complete').textContent=completed.has(current)?'✓ 已完成 · 撤销':'标记已完成';$('completed-count').textContent=`${completed.size} / 8 已完成`;$('prev').disabled=current===0;$('next').disabled=current===STEPS.length-1;
 anchors.forEach(a=>a.el.classList.toggle('selected',a.step===current));
}
function toast(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').classList.remove('show'),2400);}
function selectStep(index,move=true,show=true){if(ramp?.enabled)return;if(pipeline?.enabled)stopPipeline();current=Math.max(0,Math.min(STEPS.length-1,index));tourElapsed=0;demoFinished=false;renderUI();$('detail-content').scrollTop=0;$('tooltip').style.display='none';if(show&&!playing)document.body.classList.remove('details-hidden');if(loaded){applyInstallation(current,0);if(move&&!playing){const step=STEPS[current];if([1,3,4].includes(current)){const focus=installation.hero.position.clone().add(new THREE.Vector3(0,1,0)),offset=new THREE.Vector3(...step.camera).sub(new THREE.Vector3(...step.target));moveCamera(focus.clone().add(offset).toArray(),focus.toArray(),step.span);}else moveCamera(step.camera,step.target,step.span);}}$('view-label').textContent=(playing?'FIXED VIEW · STEP ':'AXONOMETRIC · STEP ')+String(current+1).padStart(2,'0');}
function setPlaying(value){renderDirty=true;playing=value;$('play').innerHTML=svg(value?'pause':'play')+'<span>'+(value?'暂停演示':demoFinished?'重新演示':demoStarted?'继续演示':'施工演示')+'</span>';$('play').setAttribute('aria-label',value?'暂停施工演示':'播放施工演示');$('play').setAttribute('aria-pressed',String(value));if(controls){controls.autoRotate=value?false:autoRotate;controls.enabled=!value;}if(value){transition=null;document.body.classList.add('details-hidden');}$('home').disabled=value;$('rotate-toggle').disabled=value;$('view-label').textContent=(value?'FIXED VIEW · STEP ':'AXONOMETRIC · STEP ')+String(current+1).padStart(2,'0');}
function restartDemo(){if(!loaded)return;if(ramp?.enabled){ramp.time=0;renderRampFlow(0);demoFinished=false;demoStarted=true;setPlaying(true);return;}if(pipeline?.enabled){startPipeline();setPlaying(true);return;}completed.clear();demoStarted=true;demoFinished=false;selectStep(0,false,false);setPlaying(true);}
$('steps').addEventListener('click',e=>{const b=e.target.closest('[data-step]');if(b){setPlaying(false);demoStarted=true;selectStep(Number(b.dataset.step));}});
$('prev').onclick=()=>{setPlaying(false);demoStarted=true;selectStep(current-1);};$('next').onclick=()=>{setPlaying(false);demoStarted=true;selectStep(current+1);};
$('play').onclick=()=>{if(!loaded)return;if(playing)setPlaying(false);else if(!demoStarted||demoFinished)restartDemo();else setPlaying(true);};
$('restart').onclick=restartDemo;
$('pipeline-mode').onclick=()=>{if(!loaded)return;setPlaying(false);if(pipeline?.enabled){stopPipeline();selectStep(0,false);}else{startPipeline();setPlaying(true);}};
$('pipeline-labels-toggle').onclick=()=>{if(!pipeline)return;pipeline.labels=!pipeline.labels;$('pipeline-labels-toggle').setAttribute('aria-pressed',pipeline.labels);updatePipelineLabels();};
for(const kind of ['person','dimension','force'])$('layer-'+kind).onclick=()=>{if(!ramp)return;ramp.layers[kind]=!ramp.layers[kind];$('layer-'+kind).setAttribute('aria-pressed',ramp.layers[kind]);renderDirty=true;};
document.addEventListener('click',()=>{renderDirty=true;},true);document.addEventListener('input',()=>{renderDirty=true;},true);
$('seek-time').oninput=()=>seekDemo(Number($('seek-time').value)/1000*demoLength());
$('jump-action').onchange=()=>seekDemo(Number($('jump-action').value));
$('ramp-mass').oninput=()=>{if(ramp)updateRampForceText();};
$('ramp-notes-toggle').onclick=()=>{if(!ramp)return;ramp.annotationsVisible=!ramp.annotationsVisible;$('ramp-notes-toggle').setAttribute('aria-pressed',ramp.annotationsVisible);$('ramp-notes-toggle').textContent=ramp.annotationsVisible?'隐藏场景标注':'显示场景标注';};
$('method-ramp').onclick=()=>switchTransport(true);
$('method-lift').onclick=()=>switchTransport(false);
$('speed').onclick=()=>{playbackRate=playbackRate===1?1.5:playbackRate===1.5?2:1;$('speed').textContent=playbackRate+'×';};

$('complete').onclick=()=>{completed.has(current)?completed.delete(current):completed.add(current);renderUI();};
$('close-detail').onclick=()=>document.body.classList.add('details-hidden');$('restore').onclick=()=>document.body.classList.remove('details-hidden');
$('labels-toggle').onclick=()=>{labelsVisible=!labelsVisible;$('labels-toggle').setAttribute('aria-pressed',labelsVisible);$('anchors').style.display=labelsVisible?'':'none';$('tooltip').style.display='none';anchorMarkers.forEach(p=>p.group.visible=labelsVisible);};
$('rotate-toggle').onclick=()=>{autoRotate=!autoRotate;$('rotate-toggle').setAttribute('aria-pressed',autoRotate);if(controls)controls.autoRotate=autoRotate&&!transition&&!playing;};
$('home').onclick=()=>{if(ramp?.enabled){rampCamera();return;}if(loaded){moveCamera(OVERVIEW.position,OVERVIEW.target,OVERVIEW.span);$('view-label').textContent='AXONOMETRIC · OVERVIEW';}};
$('fullscreen').onclick=async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch{toast('当前窗口不支持全屏，请使用浏览器全屏功能');}};
document.addEventListener('keydown',e=>{if(/INPUT|TEXTAREA|SELECT/.test(e.target.tagName))return;if(e.key==='Escape')document.body.classList.add('details-hidden');if(e.key==='ArrowRight')selectStep(current+1);if(e.key==='ArrowLeft')selectStep(current-1);});
// 初始优先展示参考图完整构图；点击工序后展开详情。
document.body.classList.add('details-hidden');
renderUI();

try {
 [THREE,{OrbitControls},{RoomEnvironment}]=await Promise.all([import('three'),import('three/addons/controls/OrbitControls.js'),import('three/addons/environments/RoomEnvironment.js')]);
 setLoadProgress(25,'创建灯光、环境与材质');
 await new Promise(r=>requestAnimationFrame(r));
 initScene();buildEnvironment();setLoadProgress(46,'搭建机房与搬运通道');
 await new Promise(r=>requestAnimationFrame(r));
 buildEquipment();registerModelInfo();initFixingDetail();setLoadProgress(76,'布置编号机柜、搬运工位和散力板');
 await new Promise(r=>requestAnimationFrame(r));
 buildAnchors();bindSceneInteraction();applyInstallation(0,0);initPipeline();startPipeline();setLoadProgress(90,'准备工序标注与推荐视角');
 await renderer.compileAsync(scene,camera);
 renderer.render(scene,camera);renderer.shadowMap.autoUpdate=true;loaded=true;clearTimeout(window.loadWatchdog);setLoadProgress(100,'场景已就绪');$('system-status').textContent='演示场景就绪';
 setTimeout(()=>{$('loading').classList.add('loaded');$('loading').setAttribute('aria-hidden','true');},320);requestAnimationFrame(animate);
}catch(error){console.error(error);clearTimeout(window.loadWatchdog);showLoadError('请检查网络与浏览器 WebGL 支持。错误：'+error.message);}

// 共享几何体和材质；高频重复零件使用 InstancedMesh 合并渲染。
