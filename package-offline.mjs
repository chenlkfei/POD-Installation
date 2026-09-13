import fs from 'node:fs';import path from 'node:path';import vm from 'node:vm';
// Single maintained source, concatenated without changing the original shared script scope.
const names=JSON.parse(fs.readFileSync('src/manifest.json','utf8'));
const script=names.map(name=>fs.readFileSync(path.join('src',name),'utf8')).join('');
new vm.SourceTextModule(script);
let html=fs.readFileSync('src/page.html','utf8').replace('<!-- APPLICATION_SCRIPT -->',script);
fs.writeFileSync('dist/index.html',html);
const imports={'three':'vendor/three.module.js','three/addons/controls/OrbitControls.js':'vendor/OrbitControls.js','three/addons/environments/RoomEnvironment.js':'vendor/RoomEnvironment.js'};
for(const key of Object.keys(imports))imports[key]='data:text/javascript;base64,'+fs.readFileSync(imports[key]).toString('base64');
const offline=html.replace(/<script type="importmap">[\s\S]*?<\/script>/,'<script type="importmap">'+JSON.stringify({imports})+'</script>');
for(const filename of ['液冷机柜安装工序数字孪生-连续施工演示版.html','液冷机柜安装工序数字孪生.html'])fs.writeFileSync(filename,offline);
console.log('Built online development preview and self-contained offline HTML.');
