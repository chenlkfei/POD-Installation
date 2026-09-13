function buildAnchors(){
 STEPS.forEach((s,step)=>s.anchors.forEach((p,index)=>{const group=new THREE.Group();group.position.fromArray(p);group.visible=labelsVisible;scene.add(group);const color=s.risk==='高'?'#f34b46':'#4d7cc4';const dot=new THREE.Mesh(new THREE.SphereGeometry(.065,12,8),new THREE.MeshBasicMaterial({color}));group.add(dot);const ring=new THREE.Mesh(new THREE.RingGeometry(.1,.12,32),new THREE.MeshBasicMaterial({color,transparent:true,opacity:.65,side:THREE.DoubleSide,depthWrite:false}));group.add(ring);anchorMarkers.push({group,ring,step});const el=document.createElement('button');el.className='anchor '+(s.risk==='高'?'high':'')+(current===step?' selected':'');el.innerHTML=`<i>${String(step+1).padStart(2,'0')}</i><span>${index?(step===2?'包装清运':step===4?'9 号柜位':s.name):s.name}</span>`;el.setAttribute('aria-label',`工序 ${step+1} ${s.name}，${s.risk}风险`);el.onclick=()=>{setPlaying(false);demoStarted=true;selectStep(step);};el.onpointerenter=e=>showTooltip(e,step);el.onpointermove=positionTooltip;el.onpointerleave=()=>{$('tooltip').style.display='none';};el.onfocus=()=>{const r=el.getBoundingClientRect();showTooltip({clientX:r.x+r.width/2,clientY:r.y},step);};el.onblur=()=>{$('tooltip').style.display='none';};$('anchors').append(el);anchors.push({el,step,position:new THREE.Vector3(...p),projected:new THREE.Vector3()});}));
}
function showTooltip(e,step){const s=STEPS[step];$('tooltip').innerHTML=`<span class="badge ${riskClass(s)}">${s.risk}风险</span><strong>${s.name}</strong><p>${s.summary}</p><small>点击查看完整作业注意事项</small>`;$('tooltip').style.display='block';positionTooltip(e);}
function positionTooltip(e){const r=$('tooltip').getBoundingClientRect();const x=Math.max(8,Math.min(e.clientX+16,innerWidth-r.width-12));const y=e.clientY+r.height+20>innerHeight?e.clientY-r.height-14:e.clientY+18;$('tooltip').style.left=x+'px';$('tooltip').style.top=Math.max(8,y)+'px';}
// 元数据与模型分开登记，新增模型时可直接补充字段。
function registerModelInfo(){
 const I=installation,add=(object,name,fields)=>{object.userData.modelInfo={name,fields};if(!selectables.includes(object))selectables.push(object);};
 add(scene.userData.hotAisle,'封闭热通道模块',[['布置','两列机柜背面相对，分列热通道两侧'],['围护','透明顶板、两端玻璃门'],['地板','透明玻璃地板，预留软管穿板孔'],['二次侧主管','地板下方 600 mm']]);
 for(const rack of racks)add(rack,(rack.userData.referenceId===9?'演示液冷机柜':'机柜')+' · '+rack.userData.referenceId+' 号',[['设备编号',String(rack.userData.referenceId).padStart(2,'0')],['尺寸（宽 × 高 × 深）','0.60 × 2.25 × 1.40 m'],['用途',rack.userData.referenceId===9?'安装流程演示主机柜':'机房固定设备']]);
 add(I.manifold,'机柜 Manifold',[['功能','供水 / 回水分配'],['接口','后侧左边底部 2 个，均朝向地面'],['连接方式','二次侧软管从下方接入']]);
 add(I.secondary,'二次侧供回水管路',[['布置','两列机柜之间'],['中心标高','静电地板完成面下 600 mm'],['管路数量','供水、回水各 1 路']]);
 add(I.jack,'机柜搬运地牛',[['用途','在散力板上搬运带包装机柜'],['协作人员','4 人']]);
 add(I.lift,'液压升降机',[['用途','将机柜抬升至机房静电地板高度'],['组成','台面、剪叉、液压支承'],['作业方式','人员在机房内接应']]);
 add(I.wasteCart,'包装搬运小车',[['停放位置','走廊转角前散力板上'],['用途','收集纸箱、薄膜及栈板'],['清运','到达垃圾清理点后退出场景']]);
 add(I.pallet,'运输栈板',[['材质','木质'],['移除时机','机柜推上升降机之后']]);
 add(I.innerFilm,'内层塑料薄膜',[['材质','青蓝色塑料薄膜'],['拆除方向','从下向上']]);
 I.panels.forEach((m,i)=>add(m,'外包装纸板 · '+['前','后','左','右','顶'][i]+'面',[['材质','纸箱'],['拆除方式',i===4?'向上取出':'向外拆开并放倒']]));
 I.boards.forEach((m,i)=>add(m,'散力板 · '+String(i+1).padStart(2,'0'),[['区域',m.userData.zone==='inside'?'机房内':'机房外走廊'],['铺设方向','长边平行搬运方向'],['用途','分散运输荷载']]));
 I.workers.forEach((m,i)=>add(m,'施工人员 · '+(i+1),[['角色','搬运及安装协作'],['防护装备','黄色安全帽'],['人员配置','搬运 4 人 / 落位后安装 2 人']]));
 I.hoses.forEach((m,i)=>add(m,i===0?'供水连接软管':'回水连接软管',[['连接对象','二次侧主管 ↔ Manifold 底部接口'],['接入方向','从下方竖直接入']]));
 I.wires.forEach((m,i)=>add(m,'电源线 · '+(i<3?'A':'B')+(i%3+1),[['回路',(i<3?'A':'B')+' 路'],['连接对象','机柜顶部工业连接器']]));
 I.bolts.forEach((m,i)=>add(m,'机柜固定螺丝 · '+(i+1),[['规格','M12'],['布置','前后短边各 2 颗'],['边距','中心距相邻两边各 50 mm']]));
 add(I.workPlatform,'接电作业平台',[['用途','协助连接顶部工业连接器']]);
 for(const object of selectables)if(!object.userData.modelInfo&&object.userData.step===6)add(object,'顶部工业连接器',[['用途','连接机柜电源线'],['回路配置','A / B 路各 3 个']]);
}
function modelOwner(object){while(object&&!object.userData.modelInfo)object=object.parent;return object;}

function openModelInfo(object){
 const info=object.userData.modelInfo;if(!info)return;
 setPlaying(false);transition=null;if(controls)controls.autoRotate=false;
 $('model-info-title').textContent=info.name;const fields=$('model-info-fields');fields.replaceChildren();
 const position=object.getWorldPosition(new THREE.Vector3());
 for(const [label,value] of [...info.fields,['场景位置 X / Y / Z',position.toArray().map(v=>v.toFixed(2)).join(' / ')+' m']]){const term=document.createElement('dt'),detail=document.createElement('dd');term.textContent=label;detail.textContent=value;fields.append(term,detail);}
 $('model-info').showModal();
}
function bindSceneInteraction(){
 const ray=new THREE.Raycaster(),mouse=new THREE.Vector2(),canvas=renderer.domElement;let down=null,pendingClick=null;
 const pick=e=>{const r=canvas.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);return ray.intersectObjects(selectables,true).find(hit=>modelVisible(hit.object));};
 canvas.addEventListener('pointerdown',e=>{down={x:e.clientX,y:e.clientY};});
 canvas.addEventListener('pointerup',e=>{if(ramp?.enabled)return;if(!down||Math.hypot(e.clientX-down.x,e.clientY-down.y)>5||e.button!==0)return;down=null;const hit=pick(e);if(!hit)return;clearTimeout(pendingClick);pendingClick=setTimeout(()=>{let object=hit.object;while(object&&object.userData.step===undefined)object=object.parent;if(object){let owner=hit.object;while(owner&&owner.userData.pipelineIndex===undefined)owner=owner.parent;if(pipeline?.enabled&&owner){focusPipeline(owner.userData.pipelineIndex);return;}setPlaying(false);demoStarted=true;selectStep(object.userData.step);}},500);});
 canvas.addEventListener('dblclick',e=>{if(ramp?.enabled)return;if(e.button!==0)return;e.preventDefault();clearTimeout(pendingClick);const hit=pick(e),object=hit&&modelOwner(hit.object);if(object)openModelInfo(object);});
 canvas.addEventListener('pointermove',e=>{if(e.buttons)return;canvas.style.cursor=pick(e)?'pointer':'grab';});
 $('close-model-info').onclick=()=>$('model-info').close();
 $('model-info').addEventListener('click',e=>{if(e.target!==$('model-info'))return;const r=e.target.getBoundingClientRect();if(e.clientX<r.left||e.clientX>r.right||e.clientY<r.top||e.clientY>r.bottom)e.target.close();});
 $('model-info').addEventListener('close',()=>{if(controls)controls.autoRotate=autoRotate&&!playing;});
}

function easeInOutCubic(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}
// 资源调度与模型动画分开：四台机柜共享一个门口工位、一台升降机和一辆清运车。
