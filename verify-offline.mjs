import fs from 'node:fs';import vm from 'node:vm';import assert from 'node:assert/strict';
const html=fs.readFileSync('液冷机柜安装工序数字孪生-连续施工演示版.html','utf8');
assert.equal(html,fs.readFileSync('液冷机柜安装工序数字孪生.html','utf8'));
const imports=JSON.parse(html.match(/<script type="importmap">([\s\S]*?)<\/script>/)[1]).imports;
const modules=new Map(Object.entries(imports).map(([key,url])=>{assert.ok(url.startsWith('data:text/javascript;base64,'));return[key,new vm.SourceTextModule(Buffer.from(url.split(',')[1],'base64').toString(),{identifier:key})];}));
const app=new vm.SourceTextModule(html.match(/<script type="module">([\s\S]*?)<\/script>/)[1]);
await app.link(spec=>{assert.ok(modules.has(spec),'Unbundled import '+spec);return modules.get(spec);});
assert.equal(app.status,'linked');console.log('PASS: offline HTML files identical; all module dependencies embedded and linked without network.');
