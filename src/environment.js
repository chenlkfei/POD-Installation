function initScene(){
 scene=new THREE.Scene();scene.background=new THREE.Color('#ffffff');
 camera=new THREE.OrthographicCamera(-10,10,8,-8,.1,120);camera.position.fromArray(OVERVIEW.position);camera.userData.span=OVERVIEW.span;
 renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,powerPreference:'high-performance'});renderer.setPixelRatio(CONFIG.pixelRatio);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.04;renderer.outputColorSpace=THREE.SRGBColorSpace;
 renderer.domElement.setAttribute('aria-label','可旋转与缩放的液冷机柜三维场景');renderer.domElement.setAttribute('role','img');$('viewport').prepend(renderer.domElement);
 const pmrem=new THREE.PMREMGenerator(renderer),room=new RoomEnvironment();scene.environment=pmrem.fromScene(room,.04).texture;scene.environmentIntensity=.28;room.dispose();pmrem.dispose();
 controls=new OrbitControls(camera,renderer.domElement);controls.target.fromArray(OVERVIEW.target);controls.addEventListener('change',()=>{renderDirty=true;});controls.enableDamping=true;controls.dampingFactor=.07;controls.minDistance=3;controls.maxDistance=70;controls.minZoom=.45;controls.maxZoom=3.5;controls.maxPolarAngle=Math.PI*.49;controls.autoRotate=autoRotate;controls.autoRotateSpeed=.12;controls.update();
 controls.addEventListener('start',()=>{transition=null;controls.autoRotate=false;if(playing)setPlaying(false);$('tooltip').style.display='none';});controls.addEventListener('end',()=>{controls.autoRotate=autoRotate&&!playing;});
 // 参考图使用中性白光和低对比度漫反射，不使用彩色补光。
 scene.add(new THREE.HemisphereLight('#ffffff','#b9b9b6',1.9));
 const sun=new THREE.DirectionalLight('#ffffff',2.3);sun.position.set(8,15,7);sun.castShadow=true;sun.shadow.mapSize.set(CONFIG.shadowSize,CONFIG.shadowSize);Object.assign(sun.shadow.camera,{left:-16,right:16,top:16,bottom:-16,near:1,far:60});sun.shadow.normalBias=.02;sun.shadow.bias=-.0001;sun.shadow.radius=4;scene.add(sun);
 const fill=new THREE.DirectionalLight('#ffffff',.24);fill.position.set(-5,8,-8);scene.add(fill);
 unitBox=new THREE.BoxGeometry(1,1,1);cylinder=new THREE.CylinderGeometry(1,1,1,10);dummy=new THREE.Object3D();
 const material=(color,roughness=.86)=>new THREE.MeshStandardMaterial({color,metalness:0,roughness});
 M={body:material('#d7d9d8'),front:material('#eeeFef'),side:material('#9fa2a1'),top:material('#bfc3c3'),pale:material('#d5e4ed'),paleTop:material('#c2d7e5'),floor:material('#fafbf9'),base:material('#e6e9e7'),road:material('#aeafac'),steel:material('#9b9d99'),black:material('#454946'),orange:material('#f39943'),board:material('#fff0a1'),interiorBoard:material('#946747'),worker:material('#b7b9b8'),helmet:material('#f4c525'),packing:material('#e7b688'),packingTop:material('#f2c698'),wood:material('#ba9061'),film:new THREE.MeshStandardMaterial({color:'#26adc4',roughness:.34,metalness:0,transparent:true,opacity:.66,depthWrite:false,side:THREE.DoubleSide}),landing:material('#d7c1a9'),blue:material('#457cca'),supply:material('#719dcc'),return:material('#efba94'),white:material('#ffffff'),ground:material('#a6aa70'),cyan:material('#a1c4d3'),led:material('#b4c3bd')};

 new ResizeObserver(resize).observe($('viewport'));resize();
 renderer.domElement.addEventListener('webglcontextlost',e=>{e.preventDefault();setPlaying(false);$('loading').classList.remove('loaded');showLoadError('三维图形上下文已丢失，请关闭占用较高的页面后重新加载。');});
}
function resize(){renderDirty=true;if(!renderer)return;const r=$('viewport').getBoundingClientRect();renderer.setSize(r.width,r.height);const aspect=r.width/r.height,span=camera.userData.span||OVERVIEW.span;camera.left=-span*aspect/2;camera.right=span*aspect/2;camera.top=span/2;camera.bottom=-span/2;if(aspect<.85){camera.left=-span*.85/2;camera.right=span*.85/2;camera.top=span*.85/aspect/2;camera.bottom=-camera.top;}camera.updateProjectionMatrix();}
function box(parent,w,h,d,x,y,z,mat,cast=true){const mesh=new THREE.Mesh(unitBox,mat);mesh.scale.set(w,h,d);mesh.position.set(x,y,z);mesh.castShadow=cast;mesh.receiveShadow=true;parent.add(mesh);return mesh;}
function rod(parent,a,b,r,mat){const v1=new THREE.Vector3(...a),v2=new THREE.Vector3(...b),delta=v2.clone().sub(v1),mesh=new THREE.Mesh(cylinder,mat);mesh.scale.set(r,delta.length(),r);mesh.position.copy(v1).add(v2).multiplyScalar(.5);mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize());mesh.castShadow=true;parent.add(mesh);return mesh;}
function batchBox(w,h,d,x,y,z,mat){if(!batches.has(mat))batches.set(mat,[]);dummy.position.set(x,y,z);dummy.rotation.set(0,0,0);dummy.scale.set(w,h,d);dummy.updateMatrix();batches.get(mat).push(dummy.matrix.clone());}
function flushBatches(){for(const[mat,matrices]of batches){const mesh=new THREE.InstancedMesh(unitBox,mat,matrices.length);matrices.forEach((m,i)=>mesh.setMatrixAt(i,m));mesh.castShadow=false;mesh.receiveShadow=true;scene.add(mesh);}batches.clear();}
function pipe(parent,points,radius,mat,flow=false){const curve=new THREE.CatmullRomCurve3(points.map(p=>new THREE.Vector3(...p)),false,'centripetal');const mesh=new THREE.Mesh(new THREE.TubeGeometry(curve,Math.max(12,points.length*8),radius,8,false),mat);mesh.castShadow=true;parent.add(mesh);if(flow)flowPaths.push(curve);return mesh;}
function textLabel(text,x,y,z,width=1.5,color='#a2bac8',floor=false){const c=document.createElement('canvas');c.width=512;c.height=128;const ctx=c.getContext('2d');ctx.fillStyle=color;ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='500 40px "Segoe UI", "Microsoft YaHei", sans-serif';ctx.fillText(text,256,64);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;const m=new THREE.Mesh(new THREE.PlaneGeometry(width,width/4),new THREE.MeshBasicMaterial({map:t,transparent:true,depthWrite:false,side:THREE.DoubleSide}));m.position.set(x,y,z);if(floor)m.rotation.x=-Math.PI/2;scene.add(m);return m;}
// 模型是依据参考图片建立的空间示意，不添加图片中不存在的机房围墙、灯带或桥架。
function modelVisible(object){for(let node=object;node;node=node.parent)if(!node.visible)return false;return true;}
function buildEnvironment(){
 // 白色高地台：x[-4.8,4]、z[-4,3]，前侧厚实立面。
 // 地台分块形成真实管沟，玻璃下方不保留遮挡管路的实体地板。
 const A=HOT_AISLE,slab=(x0,x1,z0,z1)=>{const m=box(scene,x1-x0,.82,z1-z0,(x0+x1)/2,-.41,(z0+z1)/2,M.base);m.name='raised-floor-solid';};
 slab(-4.8,A.x0,-4,3);slab(A.x1,4,-4,3);slab(A.x0,A.x1,-4,A.z0);slab(A.x0,A.x1,A.z1,3);
 const floor=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),M.floor,16*12*4);floor.name='antistatic-floor';let n=0;
 const tile=(x0,x1,z0,z1)=>{if(x1-x0<.001||z1-z0<.001)return;dummy.position.set((x0+x1)/2,.009,(z0+z1)/2);dummy.rotation.set(0,0,0);dummy.scale.set(x1-x0,.014,z1-z0);dummy.updateMatrix();floor.setMatrixAt(n++,dummy.matrix);};
 for(let x=0;x<16;x++)for(let z=0;z<12;z++){const cx=-4.525+x*.55,cz=-3.725+z*.55,x0=cx-.2745,x1=cx+.2745,z0=cz-.2745,z1=cz+.2745;
  if(x1<=A.x0||x0>=A.x1||z1<=A.z0||z0>=A.z1)tile(x0,x1,z0,z1);
  else{tile(x0,Math.min(x1,A.x0),z0,z1);tile(Math.max(x0,A.x1),x1,z0,z1);tile(Math.max(x0,A.x0),Math.min(x1,A.x1),z0,Math.min(z1,A.z0));tile(Math.max(x0,A.x0),Math.min(x1,A.x1),Math.max(z0,A.z1),z1);}
 }floor.count=n;floor.receiveShadow=true;scene.add(floor);
 buildHotAisle();
 box(scene,8.8,.016,.4,-.4,.008,2.8,M.floor);
 // 右侧纵向运输通道和底部横向走廊。两者与白地台分离，保持原图留白。
 const corridorTurn=box(scene,1.60,.055,4.65,3,-.8175,5.325,M.road);corridorTurn.name="cabinet-route-turn";
 const corridorStraight=box(scene,9.80,.055,1.55,-1.1,-.8175,8.425,M.road);corridorStraight.name="cabinet-route-straight";
 // 地台上的棕色过渡铺板及边缘短坡道。
 // 室内铺板由搬运轨迹生成，避免与整片过渡板重叠。
 // 此处由可升降平台完成高差转换，不再使用固定斜坡。

 // 机柜落位区旁的细条形地板格栅。
 // 已删除参考截图红圈内的地板格栅。
 // 参考图中门洞只保留两根立柱，不画横梁或隔墙。
 for(const x of[2.0,4.0])box(scene,.065,2.8,.10,x,1.4,3.0,M.steel);
 // 灰色独立垃圾通道及投放区，包装清运沿此路线移动。
 // 不再建立额外的垃圾通道地面。
 
 

 
 // 机房内不放置箭头和地面文字；保留室外垃圾通道方向箭头。
 
 
 

 
 // 左侧供回液槽：淡橙/淡蓝管路落入白色支撑槽，避免高饱和发光效果。
 // 白色背景接收柔和投影；接触阴影用径向透明纹理辅助，材质不描边。
 box(scene,200,.04,200,0,-.88,0,M.white,false);
 contactShadow(-.4,-.850,-.5,10.6,8.7,.12);
}
function buildHotAisle(){
 const A=HOT_AISLE,g=new THREE.Group();g.name='enclosed-hot-aisle';scene.add(g);scene.userData.hotAisle=g;
 const glass=new THREE.MeshStandardMaterial({color:'#bee1e6',roughness:.14,metalness:.05,transparent:true,opacity:.19,depthWrite:false,side:THREE.DoubleSide});
 const cover=glass.clone();cover.opacity=.075;
 // 玻璃地板标高与静电地板齐平；靠机柜端预留软管穿板服务带。
 for(let i=0;i<7;i++){const w=(A.x1-A.x0)/7,x=A.x0+(i+.5)*w;
  const pane=box(g,w-.014,.025,A.z1-A.z0-.20,x,COOLING.floor-.0125,(A.z0+A.z1-.20)/2,glass,false);pane.name='transparent-glass-floor';
  box(g,.012,.025,A.z1-A.z0-.20,A.x0+i*w,COOLING.floor-.0125,(A.z0+A.z1-.20)/2,M.steel,false);
 }
 for(const z of[A.z0,A.z1-.20])box(g,A.x1-A.x0,.025,.018,(A.x0+A.x1)/2,COOLING.floor-.0125,z,M.steel,false);
 // 服务带玻璃在两个接管坐标留孔，软管不穿过实体玻璃。
 const cuts=[A.x0,...Array.from({length:4},(_,i)=>[-3.07+i*.615,-2.97+i*.615,-2.95+i*.615,-2.85+i*.615]).flat(),A.x1];for(let i=0;i<cuts.length-1;i+=2)box(g,cuts[i+1]-cuts[i]-.008,.025,.182,(cuts[i]+cuts[i+1])/2,COOLING.floor-.0125,A.z1-.10,glass,false);
 box(g,A.x1-A.x0,.025,A.z1-A.z0,(A.x0+A.x1)/2,A.bottom-.0125,(A.z0+A.z1)/2,M.side,false).name='pipe-trench-bottom';
 // 两端透明门、顶部透明封板及框架；两侧由机柜背面界定热通道。
 for(const x of[-3.20,1.27]){
  for(const z of[A.z0+.02,A.z1-.02])box(g,.034,A.roof,.034,x,A.roof/2,z,M.steel);
  box(g,.034,.034,A.z1-A.z0,x,A.roof,(A.z0+A.z1)/2,M.steel);
  for(const z of[-1.115,-.505]){box(g,.012,2.27,.565,x,1.16,z,cover,false).name='hot-aisle-glass-door';rod(g,[x-.025,.96,z],[x-.025,1.16,z],.01,M.steel);}
 }
 for(const z of[A.z0,A.z1]){box(g,4.47,.035,.035,-.965,A.roof,z,M.steel);box(g,4.47,.11,.012,-.965,2.305,z,cover,false);}
 box(g,4.47,.012,A.z1-A.z0,-.965,A.roof+.012,(A.z0+A.z1)/2,cover,false).name='hot-aisle-glass-roof';
}
function groundArrow(x,y,z,length,angle=0){
 const shape=new THREE.Shape();shape.moveTo(-length/2,-.08);shape.lineTo(length*.20,-.08);shape.lineTo(length*.20,-.22);shape.lineTo(length/2,0);shape.lineTo(length*.20,.22);shape.lineTo(length*.20,.08);shape.lineTo(-length/2,.08);shape.closePath();
 const mesh=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:'#407dcb',side:THREE.DoubleSide}));mesh.rotation.x=-Math.PI/2;mesh.rotation.z=angle;mesh.position.set(x,y,z);scene.add(mesh);
}
function curvedArrow(x,y,z,r,rotation){
 const g=new THREE.Group();g.position.set(x,y,z);g.rotation.y=rotation;scene.add(g);
 const points=[];for(let i=0;i<=16;i++){const a=-1.2+i/16*1.9;points.push(new THREE.Vector3(Math.cos(a)*r,0,Math.sin(a)*r));}
 const left=[],right=[];for(let i=0;i<points.length;i++){const a=-1.2+i/16*1.9;left.push(new THREE.Vector3(Math.cos(a)*(r-.045),0,Math.sin(a)*(r-.045)));right.push(new THREE.Vector3(Math.cos(a)*(r+.045),0,Math.sin(a)*(r+.045)));}
 const positions=[];for(let i=0;i<16;i++){[left[i],right[i],left[i+1],right[i],right[i+1],left[i+1]].forEach(v=>positions.push(...v));}const p=points[16],dir=new THREE.Vector3(-Math.sin(.7),0,Math.cos(.7));positions.push(...p.clone().addScaledVector(dir,.19),...left[16].clone().add(new THREE.Vector3(-.1,0,-.06)),...right[16].clone().add(new THREE.Vector3(.1,0,.06)));
 const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.computeVertexNormals();g.add(new THREE.Mesh(geo,new THREE.MeshBasicMaterial({color:'#5384c4',side:THREE.DoubleSide})));
}
function contactShadow(x,y,z,width,depth,opacity=.17){
 const canvas=document.createElement('canvas');canvas.width=128;canvas.height=128;const ctx=canvas.getContext('2d'),gradient=ctx.createRadialGradient(64,64,10,64,64,64);gradient.addColorStop(0,'rgba(58,65,64,'+opacity+')');gradient.addColorStop(.5,'rgba(58,65,64,'+(opacity*.65)+')');gradient.addColorStop(1,'rgba(58,65,64,0)');ctx.fillStyle=gradient;ctx.fillRect(0,0,128,128);
 const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,depth),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(canvas),transparent:true,depthWrite:false}));mesh.rotation.x=-Math.PI/2;mesh.position.set(x,y,z);scene.add(mesh);
}
function makeRack(x,z,id,type='compute',y=0,clickStep=6){
 const g=new THREE.Group();g.position.set(x,y,z);g.userData.step=clickStep;g.userData.referenceId=id;scene.add(g);selectables.push(g);racks.push(g);
 // 与参考图一致：完整封闭的柜门、窄拼缝、平整顶面，不显示服务器抽屉与发光边框。
 const pale=type==='power';box(g,.6,2.17,1.4,0,1.165,0,pale?M.pale:M.body);
 box(g,.590,2.146,.012,0,1.164,.706,pale?M.pale:M.front);
 box(g,.009,2.165,1.394,-.304,1.164,0,pale?M.pale:M.side);
 box(g,.6,.012,1.4,0,2.252,0,pale?M.paleTop:M.top);
 // 隐藏在柜底和柜后的小型脚座/接口保留设备含义，不改变参考图的简洁轮廓。
 if(id!==9)for(const dx of[-.22,.22])for(const dz of[-.53,.53])box(g,.065,.035,.065,dx,.02,dz,M.steel);
 if(type==='cdu'){for(const dx of[-.15,.15])pipe(g,[[dx,.16,-.72],[dx,1.85,-.72]],.019,dx<0?M.supply:M.return);}
 if(id){const label=textLabel(String(id),x,y+2.267,z,.43,pale?'#273746':'#ff2929',true);label.rotation.z=-Math.PI/2;g.attach(label);}
 if(id!==9)contactShadow(x,y+.003,z,.95,1.73,.15);
 return g;
}
// 连续施工引擎：所有阶段共享同一台机柜；纯状态采样允许暂停、继续与直接跳步。
function clamp01(v){return Math.max(0,Math.min(1,v));}
function smooth(v){v=clamp01(v);return v*v*(3-2*v);}
function blend(a,b,t){return a+(b-a)*t;}
function routeSample(points,p){
 points=points.filter((point,i)=>i===0||Math.hypot(point[0]-points[i-1][0],point[1]-points[i-1][1])>1e-8);
 if(points.length===1)return{x:points[0][0],z:points[0][1],yaw:0};
 const lengths=points.slice(1).map((v,i)=>Math.hypot(v[0]-points[i][0],v[1]-points[i][1]));const total=lengths.reduce((a,b)=>a+b,0);let distance=clamp01(p)*total;
 for(let i=0;i<lengths.length;i++){if(distance<=lengths[i]||i===lengths.length-1){const a=points[i],b=points[i+1],t=clamp01(distance/lengths[i]);let dx=b[0]-a[0],dz=b[1]-a[1];const size=Math.hypot(dx,dz);dx/=size;dz/=size;if(i<lengths.length-1&&t>.72){const c=points[i+2],nx=c[0]-b[0],nz=c[1]-b[1],ns=Math.hypot(nx,nz),f=smooth((t-.72)/.28);dx=blend(dx,nx/ns,f);dz=blend(dz,nz/ns,f);}return{x:blend(a[0],b[0],t),z:blend(a[1],b[1],t),yaw:Math.atan2(-dx,-dz)};}distance-=lengths[i];}
}
function orthogonalSample(points,p){
 const parts=[];for(let i=0;i<points.length-1;i++){const a=points[i],b=points[i+1],yaw=Math.atan2(a[0]-b[0],a[1]-b[1]);parts.push({a,b,yaw,length:Math.hypot(b[0]-a[0],b[1]-a[1])});if(i<points.length-2){const c=points[i+2],next=Math.atan2(b[0]-c[0],b[1]-c[1]);parts.push({a:b,b,yaw,next,length:1.15});}}
 let d=clamp01(p)*parts.reduce((n,v)=>n+v.length,0);for(const part of parts){if(d<=part.length||part===parts.at(-1)){const t=clamp01(d/part.length),delta=part.next===undefined?0:Math.atan2(Math.sin(part.next-part.yaw),Math.cos(part.next-part.yaw));return {x:blend(part.a[0],part.b[0],t),z:blend(part.a[1],part.b[1],t),yaw:part.yaw+delta*smooth(t)};}d-=part.length;}
}
