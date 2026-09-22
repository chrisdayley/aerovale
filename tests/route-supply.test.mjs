import assert from 'node:assert/strict';
import test from 'node:test';
import * as E from '../dist/engine.js';
const setup=()=>{const s=E.createGame();s.cash=1e7;E.buyPlane(s,'e175');return s;};
const rivalLicense=(a,b,model='atr42')=>({id:E.key(a,b),a,b,model,progress:0,leased:true,acquiredDay:0});

test('Five licenses are shared across both directions and every airline; other connections retain their own supply',()=>{
 const s=setup(),price=E.licensePrice('SLC','DFW'),cash=s.cash;
 for(let i=0;i<4;i++)s.rivals[i].routes.push(rivalLicense('DFW','SLC'));
 assert.equal(E.remainingLicenses(s,'SLC','DFW'),1);
 E.buyRoute(s,'SLC','DFW');assert.equal(s.cash,cash-price);
 assert.equal(E.remainingLicenses(s,'DFW','SLC'),0);assert.equal(E.remainingLicenses(s,'SLC','PHX'),5);
 const before=JSON.stringify(s);assert.throws(()=>E.buyRoute(s,'DFW','SLC',true),/Sold out/);assert.equal(JSON.stringify(s),before);
});

test('An airline can buy all five slots; cash, historical route data and one aircraft per slot stay consistent',()=>{
 const s=setup(),p1=s.planes[0],p2=E.buyPlane(s,'atr42'),p3=E.buyPlane(s,'atr42'),r=E.buyRoute(s,'SLC','DEN');
 E.schedulePlane(s,p1.id,[r.id],'premium');E.advance(s,30);const activeFlight=structuredClone(p1.flight),basePaid=r.paid;
 assert.throws(()=>E.assignPlaneToRoute(s,r.id,p2.id),/licenses/);
 E.buyRoute(s,'DEN','SLC');assert.equal(s.routes.length,1);assert.equal(r.licenses,2);assert.equal(r.paid,basePaid*2);assert.deepEqual(p1.flight,activeFlight);
 E.assignPlaneToRoute(s,r.id,p2.id);assert.throws(()=>E.assignPlaneToRoute(s,r.id,p3.id),/licenses/);
 for(let i=0;i<3;i++)E.buyRoute(s,'SLC','DEN');assert.equal(E.airlineLicenses(s),5);
 assert.equal(E.remainingLicenses(s,'SLC','DEN'),0);assert.throws(()=>E.buyRoute(s,'SLC','DEN'),/Sold out/);
 p2.auto=false;E.advance(s,1440);E.sellPlane(s,p2.id);assert.equal(E.remainingLicenses(s,'SLC','DEN'),0);
});

test('Old version-one save loads without changing purchases, active flights, cash, objectives or airport ownership',()=>{
 const s=setup(),r=E.buyRoute(s,'SLC','DEN');r.paid*=1.8;E.schedulePlane(s,s.planes[0].id,[r.id],'dense');E.buyAirport(s,'DEN');E.claimQuest(s,'first_plane');E.advance(s,20);
 assert.equal(r.licenses,undefined);const before=JSON.parse(JSON.stringify(s)),restored=E.validateSave(structuredClone(before));assert.deepEqual(restored,before);assert.equal(E.routeLicenseCount(restored.routes[0]),1);
 const expanded=E.buyRoute(restored,'SLC','DEN');assert.equal(expanded.licenses,2);assert.deepEqual(restored.planes,before.planes);assert.deepEqual(restored.claims,before.claims);assert.deepEqual(restored.airports,before.airports);E.validateSave(JSON.parse(JSON.stringify(restored)));
 assert.throws(()=>E.validateSave({...restored,routes:[{...expanded,licenses:6}]}),/Invalid route/);
});

test('Rivals choose profitable, affordable aircraft and keep an operating reserve',()=>{
 const s=setup();for(const ai of s.rivals){const choice=E.chooseAIRoute(s,ai);assert(choice);assert(choice.daily>=1500);assert(choice.upfront+choice.reserve<=ai.cash);assert(E.model(choice.model).range>=E.distance(choice.a,choice.b));assert(choice.upfront/choice.daily<=120);}
 const ai=s.rivals[0];ai.cash=0;assert.equal(E.chooseAIRoute(s,ai),null);
 ai.cash=1e8;assert.equal(E.aiRouteOpportunity(s,ai,'SLC','DEN',[E.model('a388')]),null);
});

test('Rivals can defend profitable connections and subtract damage to their existing earnings',()=>{
 const s=setup(),ai=s.rivals[0];ai.cash=1e7;const first=E.aiRouteOpportunity(s,ai,'DEN','PHX');assert(first);
 ai.routes.push(rivalLicense('DEN','PHX',first.model));const next=E.aiRouteOpportunity(s,ai,'DEN','PHX');assert(next);assert(next.cannibalization>0);assert(next.daily<first.daily);assert.equal(next.strategy,'Defend a profitable connection');
 for(let i=E.slots(s,'DEN','PHX');i<5;i++)ai.routes.push(rivalLicense('DEN','PHX'));assert.equal(E.aiRouteOpportunity(s,ai,'PHX','DEN'),null);
});

test('An announced rival bid is cancelled when the player purchases the last slot',()=>{
 const s=setup(),ai=s.rivals[0];ai.routes=[];for(let i=0;i<4;i++)E.buyRoute(s,'SLC','PHX');
 s.aiBid={rival:ai.id,a:'SLC',b:'PHX',at:s.minute+1,model:'atr42',expectedDaily:50000};const cash=ai.cash;E.buyRoute(s,'SLC','PHX');E.advance(s,2);
 assert.equal(ai.cash,cash);assert.equal(ai.routes.length,0);assert.equal(s.aiBid,null);assert(s.log.some(l=>l.text.includes('all 5 licenses are owned')));assert.equal(E.slots(s,'SLC','PHX'),5);
});

test('An affordable, profitable bid can acquire the fifth slot and never a sixth',()=>{
 const s=setup(),ai=s.rivals[0];ai.cash=1e7;for(let i=0;i<4;i++)s.rivals[i+1].routes.push(rivalLicense('DEN','PHX'));
 assert(E.aiRouteOpportunity(s,ai,'DEN','PHX'));s.aiBid={rival:ai.id,a:'DEN',b:'PHX',at:s.minute+1};E.advance(s,2);assert.equal(E.slots(s,'DEN','PHX'),5);
 s.aiBid={rival:ai.id,a:'PHX',b:'DEN',at:s.minute+1};E.advance(s,2);assert.equal(E.slots(s,'DEN','PHX'),5);
});

test('Long-term rival expansion respects finite supply and produces visible strategic plans',()=>{
 const s=setup();for(let day=0;day<15;day++)E.advance(s,1440);const connections=new Set([...s.routes,...s.rivals.flatMap(ai=>ai.routes)].map(r=>r.id));
 for(const id of connections){const [a,b]=id.split('-');assert(E.slots(s,a,b)<=5,id);}
 assert(s.rivals.some(ai=>ai.routes.length>2));assert(s.log.some(l=>/profitable/.test(l.text)));E.validateSave(JSON.parse(JSON.stringify(s)));
});

test('Rivals modernize only when the extra operating profit justifies aircraft cost',()=>{
 const s=E.createGame();s.minute=180*1440;const ai=s.rivals[0];ai.cash=1e8;
 const r={...rivalLicense('SLC','DEN','q400'),leased:true};ai.routes=[r];const choice=E.aiAircraftUpgrade(s,ai,r);assert(choice);assert.equal(choice.model,'q400-g2');assert(choice.gain>1500);assert(choice.cost/choice.gain<=90);
 r.model='a220';assert.equal(E.aiAircraftUpgrade(s,ai,r),null);r.model='q400';ai.cash=0;assert.equal(E.aiAircraftUpgrade(s,ai,r),null);
});

test('Rival personalities choose different markets and cannot instantly stack a connection',()=>{
 const s=setup(),choices=s.rivals.map(ai=>({ai,c:E.chooseAIRoute(s,ai)}));assert.equal(new Set(choices.map(x=>E.key(x.c.a,x.c.b))).size,5);
 const regional=choices[0].c,international=choices[1].c,pacific=choices[3].c;assert(E.distance(regional.a,regional.b)<=3000);assert(E.distance(international.a,international.b)>=3000);assert([pacific.a,pacific.b].some(id=>['Asia','Oceania'].includes(E.ap(id).region)));
 for(const ai of s.rivals){const delay=E.aiDecisionDelay(s,ai);assert(delay>=720&&delay<=2880);}
 const ai=s.rivals[0],r={...rivalLicense('DEN','PHX'),acquiredDay:E.gameDay(s)};ai.routes.push(r);assert.equal(E.aiCanExpandConnection(s,ai,'DEN','PHX'),false);s.minute=9*1440;assert.equal(E.aiCanExpandConnection(s,ai,'DEN','PHX'),true);ai.routes.push({...r,acquiredDay:9});s.minute=30*1440;assert.equal(E.aiCanExpandConnection(s,ai,'DEN','PHX'),false);
});

test('Limited scouting varies sensible choices instead of repeating one perfect target',()=>{
 const s=setup(),ai=s.rivals[0],picks=new Set();for(let turn=0;turn<12;turn++){s.aiTurn=turn;const c=E.chooseAIRoute(s,ai);assert(c&&c.daily>0);picks.add(E.key(c.a,c.b));const restored=E.validateSave(JSON.parse(JSON.stringify(s)));assert.deepEqual(E.chooseAIRoute(restored,restored.rivals[0]),c);}assert(picks.size>=3);
});
