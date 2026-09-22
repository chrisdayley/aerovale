import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {AIRPORTS,PLANES} from '../dist/data.js';
import {airportImage,airportCredit} from '../dist/imagery.js';
const root=path.resolve('dist');
test('all 400 catalog entries resolve to 100 real, non-empty base-airframe assets',()=>{
 const unique=new Set();
 for(const p of PLANES){const name=p.id.replace(/-g[234]$/,'');unique.add(name);const image=fs.readFileSync(path.join(root,'assets/planes',name+'.webp'));assert.equal(image.toString('ascii',0,4),'RIFF');assert.equal(image.toString('ascii',8,12),'WEBP');assert.ok(image.length>5000,p.id);}
 assert.equal(unique.size,100);
});
test('all 600 destinations have an image and distinguish exact photos from concept art',()=>{
 let photos=0;
 for(const airport of AIRPORTS){assert.ok(fs.existsSync(path.join(root,airportImage(airport))),airport.id);const credit=airportCredit(airport);assert.ok(credit.alt);assert.ok(credit.label);if(credit.source){photos++;assert.ok(credit.author&&credit.license&&credit.licenseUrl);}else assert.equal(credit.label,'Airport concept art');}
 assert.equal(photos,8);
});
test('service worker installs every runtime asset, keeps other games caches, and handles offline navigation',async()=>{
 const source=fs.readFileSync(path.join(root,'sw.js'),'utf8'),currentCache=source.match(/const CACHE='([^']+)'/)[1];
 const handlers={},stored=new Map(),deleted=[];let offline=false;let claimed=false;
 const cache={addAll:async urls=>{for(const url of urls){const file=url==='./'?'index.html':url.slice(2);assert.ok(fs.existsSync(path.join(root,file)),url);stored.set(new URL(url,'https://example.test/aerovale/').href,new Response(fs.readFileSync(path.join(root,file))));}},match:async req=>stored.get(new URL(typeof req==='string'?req:req.url,'https://example.test/aerovale/').href),put:async(req,res)=>stored.set(req.url,res)};
 const context={URL,Response,self:{location:{origin:'https://example.test'},addEventListener:(n,fn)=>handlers[n]=fn,skipWaiting:async()=>{},clients:{claim:async()=>{claimed=true}}},caches:{open:async()=>cache,keys:async()=>['aerovale-old','other-game-cache',currentCache],delete:async k=>deleted.push(k)},fetch:async()=>{if(offline)throw Error('offline');return new Response('online');}};
 vm.runInNewContext(source,context);
 let pending;handlers.install({waitUntil:p=>pending=p});await pending;
 for(const file of fs.readdirSync(path.join(root,'assets/planes')))assert.ok(stored.has('https://example.test/aerovale/assets/planes/'+file));
 handlers.activate({waitUntil:p=>pending=p});await pending;assert.deepEqual(deleted,['aerovale-old']);assert.ok(claimed);
 offline=true;handlers.fetch({request:{method:'GET',url:'https://example.test/aerovale/unknown',mode:'navigate'},respondWith:p=>pending=p});assert.match(await(await pending).text(),/Aerovale/);
 handlers.fetch({request:{method:'GET',url:'https://example.test/aerovale/assets/planes/a388.webp',mode:'cors'},respondWith:p=>pending=p});assert.ok((await(await pending).arrayBuffer()).byteLength>5000);
});
