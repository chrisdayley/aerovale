import assert from 'node:assert/strict';
import test from 'node:test';
import * as E from '../dist/engine.js';
const setup=()=>{const s=E.createGame();E.buyPlane(s,'atr42');return s;};
const clone=s=>JSON.parse(JSON.stringify(s));
const oldSave=()=>{const s=setup();s.minute=20*1440;for(const ai of s.rivals){ai.routes.push(...clone(ai.routes));ai.cash=1e7;for(const key of ['nextExpansionAt','expansionTurn','expansionStatus','bid'])delete ai[key];}return s;};

test('Every airline expands past four with distinct, bounded pacing',()=>{
 const s=setup();for(let day=0;day<20;day++)E.advance(s,1440);
 const counts=s.rivals.map(ai=>ai.routes.length);assert(counts.every(n=>n>4&&n<=16),String(counts));assert(new Set(counts).size>=3);assert(counts[2]>counts[1]);
 const connections=new Set(s.rivals.flatMap(ai=>ai.routes.map(r=>r.id)));for(const id of connections){const [a,b]=id.split('-');assert(E.slots(s,a,b)<=5);}
});

test('A patient airline cannot block the other airlines from planning or buying',()=>{
 const s=setup(),solstice=s.rivals[1],nimbus=s.rivals[2];
 solstice.bid={rival:solstice.id,a:'LHR',b:'DOH',at:s.minute+48*60};nimbus.nextExpansionAt=s.minute;
 E.advance(s,1);assert(nimbus.bid);assert(nimbus.bid.at<solstice.bid.at);assert(E.rivalPlans(s).length>=2);
 E.advance(s,nimbus.bid.at-s.minute+1);assert.equal(nimbus.routes.length,3);assert(solstice.bid);assert.equal(solstice.routes.length,2);
});

test('Old saves with four licenses per rival resume gradually without replacing player progress',()=>{
 const s=oldSave();const route=E.buyRoute(s,'SLC','DEN');E.schedulePlane(s,s.planes[0].id,[route.id]);E.claimQuest(s,'first_plane');
 const before=clone(s);assert.deepEqual(E.validateSave(clone(s)),before);
 E.advance(s,1);assert(s.rivals.every(ai=>ai.routes.length===4&&!ai.bid));assert.deepEqual(s.routes,before.routes);assert.equal(s.cash,before.cash);assert.deepEqual(s.claims,before.claims);assert.equal(s.planes[0].id,before.planes[0].id);
 E.advance(s,6*1440);assert(s.rivals.every(ai=>ai.routes.length>4));assert(s.rivals.every(ai=>ai.routes.length<=8));E.validateSave(clone(s));
});

test('A legacy announced purchase retains its target and deadline while other rivals resume',()=>{
 const s=oldSave(),ai=s.rivals[0];s.aiBid={rival:ai.id,a:'DEN',b:'PHX',at:s.minute+48*60,strategy:'Defend a profitable connection'};
 const announced=clone(s.aiBid);assert.deepEqual(E.rivalPlans(s),[announced]);E.advance(s,1);assert.equal(s.aiBid,null);assert.deepEqual(ai.bid,announced);
 E.advance(s,24*60);assert(E.rivalPlans(s).length>=2);assert.equal(ai.routes.length,4);assert.deepEqual(ai.bid,announced);
 E.advance(s,24*60);assert.equal(ai.routes.length,5);assert.equal(ai.bid,null);
});

test('Simultaneous bids recheck supply and only one buys the final license',()=>{
 const s=setup(),first=s.rivals[0],second=s.rivals[2];
 for(let i=0;i<4;i++)s.rivals[4].routes.push({id:'DEN-PHX',a:'DEN',b:'PHX',model:'atr42',progress:0});
 for(const ai of [first,second]){ai.cash=1e7;ai.bid={rival:ai.id,a:'DEN',b:'PHX',at:s.minute+1};}
 const n1=first.routes.length,n2=second.routes.length;E.advance(s,2);
 assert.equal(E.slots(s,'DEN','PHX'),5);assert.equal(first.routes.length,n1+1);assert.equal(second.routes.length,n2);assert.equal(first.bid,null);assert.equal(second.bid,null);assert(s.log.some(l=>l.text.includes('all 5 licenses are owned')));
});

test('A rival with no affordable opportunity waits and retries without free money or free licenses',()=>{
 const s=setup(),ai=s.rivals[0];ai.routes=[];ai.cash=0;ai.nextExpansionAt=s.minute;
 E.advance(s,1);assert.equal(ai.expansionStatus,'watching');assert.equal(ai.bid,null);assert.equal(ai.cash,0);assert(ai.nextExpansionAt>s.minute);
 const retry=ai.nextExpansionAt;ai.cash=650000;E.advance(s,retry-s.minute-1);assert.equal(ai.bid,null);E.advance(s,2);assert(ai.bid);assert.equal(ai.routes.length,0);
});

test('Save and reload retain independent decisions and countdowns exactly',()=>{
 const s=setup();E.advance(s,2200);assert(E.rivalPlans(s).length>=3);const restored=E.validateSave(clone(s));assert.deepEqual(restored,clone(s));
 E.advance(s,6*1440);E.advance(restored,6*1440);assert.deepEqual(clone(s),clone(restored));
});

test('Malformed independent schedules or bids cannot enter the simulation',()=>{
 for(const change of [{nextExpansionAt:NaN},{nextExpansionAt:-1},{expansionTurn:1.5},{expansionStatus:'bogus'},{bid:{rival:'nimbus',a:'DEN',b:'PHX',at:500}},{bid:{rival:'meridian',a:'DEN',b:'DEN',at:500}}]){
  const s=setup();Object.assign(s.rivals[0],change);assert.throws(()=>E.validateSave(s),/Invalid rival (schedule|plan)/);
 }
});
