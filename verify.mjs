import fs from 'node:fs';
import vm from 'node:vm';
const html=fs.readFileSync('dist/index.html','utf8');
const scripts=[...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/g)];
for(const [i,m] of scripts.entries()){
 if(m[1].includes('importmap')) {JSON.parse(m[2]);continue;}
 if(m[1].includes('module')) new vm.SourceTextModule(m[2]);
 else new vm.Script(m[2]);
 console.log('Script',i,'syntax valid');
}
console.log('HTML bytes',Buffer.byteLength(html));
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(x=>x[1]);
if(new Set(ids).size!==ids.length)throw new Error('Duplicate HTML ids');
console.log('Unique IDs:',ids.length);
