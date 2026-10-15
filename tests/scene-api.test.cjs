const assert=require('node:assert/strict');const{test}=require('node:test');const ts=require('typescript');const Module=require('node:module');
require.extensions['.ts']=(mod,file)=>mod._compile(ts.transpileModule(require('node:fs').readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,esModuleInterop:true}}).outputText,file);
let response;const original=Module._load;Module._load=function(name,...args){if(name==='@tarojs/taro')return {request:async()=>response};return original.call(this,name,...args)};
const{listPublishedScenes,getPublishedScene}=require('../src/lib/scene-api.ts');Module._load=original;
test('server empty catalog stays empty',async()=>{response={statusCode:200,data:[]};assert.deepEqual(await listPublishedScenes(),[])});
test('official ids and audio are mapped independently from local data',async()=>{response={statusCode:200,data:[{id:8,title:'点餐',place:'香港',roleA:'A',roleB:'B',lines:[{speaker:'A',cantoneseText:'唔该',mandarinText:'谢谢',audioKey:'a0001.mp3'}]}]};const d=(await listPublishedScenes())[0];assert.equal(d.id,'official:8');assert.match(d.lines[0].audioUrl,/\/audio\/a0001.mp3$/)});
test('offline scene rejects details',async()=>{response={statusCode:404,data:{error:'场景已下架'}};await assert.rejects(getPublishedScene(8),/场景已下架/)});
