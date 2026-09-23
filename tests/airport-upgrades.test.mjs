import assert from 'node:assert/strict';
import test from 'node:test';
import * as E from '../dist/engine.js';
const clone=s=>JSON.parse(JSON.stringify(s));
const close=(a,b)=>assert(Math.abs(a-b)<.001,`${a} != ${b}`);
function setup(){const s=E.createGame();s.created=123456;s.cash=1e8;E.buyPlane(s,'atr42');E.buyRoute(s,'SLC','DEN');E.buyAirport(s,'SLC');return s;}

test('Legacy airports load at their existing income and base level without mutating saves',()=>{
 const s=setup(),before=clone(s);assert.deepEqual(E.validateSave(clone(s)),before);assert.equal(s.airportDevelopments,undefined);assert.equal(E.airportStage(s,'SLC').levels,0);assert.equal(E.airportShare(s,'SLC'),.03);assert.equal(E.airportBaselineIncome(s,'SLC'),E.ap('SLC').demand*47000*.03);assert.deepEqual(s,before);
});
test('Each owned airport supports nine finite upgrades with recorded costs and asset value',()=>{
 const s=setup(),cash=s.cash,worth=E.netWorth(s);let spent=0;
 for(const path of E.AIRPORT_DEVELOPMENTS)for(let i=0;i<3;i++){const cost=E.airportUpgradeCost(s,'SLC',path.id);spent+=cost;E.upgradeAirport(s,'SLC',path.id);assert.equal(E.airportDevelopment(s,'SLC')[path.id],i+1);assert.equal(s.ledger[0].amount,-cost);}
 assert.equal(s.cash,cash-spent);assert.equal(E.airportAssetValue(s,'SLC'),E.ap('SLC').price+spent);close(E.netWorth(s),worth);assert.equal(E.airportStage(s,'SLC').name,'Flagship hub');assert.equal(E.airportStage(s,'SLC').levels,9);
 for(const path of E.AIRPORT_DEVELOPMENTS){assert.equal(E.airportUpgradeCost(s,'SLC',path.id),null);assert.throws(()=>E.upgradeAirport(s,'SLC',path.id));}E.validateSave(clone(s));
});
test('Ownership, funds, valid airport and development type are enforced without partial spending',()=>{
 const s=setup();for(const [id,type] of [['DEN','terminal'],['fake','ground'],['SLC','fake']]){const before=clone(s);assert.throws(()=>E.upgradeAirport(s,id,type));assert.deepEqual(s,before);}
 s.cash=E.airportUpgradeCost(s,'SLC','terminal')-1;const before=clone(s);assert.throws(()=>E.upgradeAirport(s,'SLC','terminal'));assert.deepEqual(s,before);
});
test('Terminal investment grows local carrier income and demand without changing license supply',()=>{
 const s=setup(),demand=E.routeDemand(s,'SLC','DEN'),other=E.routeDemand(s,'LAX','PHX'),base=E.airportBaselineIncome(s,'SLC'),slots=E.remainingLicenses(s,'SLC','DEN');
 E.upgradeAirport(s,'SLC','terminal');close(E.airportBaselineIncome(s,'SLC'),base*1.2);assert(Math.abs(E.routeDemand(s,'SLC','DEN')-demand*1.05)<2);assert.equal(E.routeDemand(s,'LAX','PHX'),other);assert.equal(E.remainingLicenses(s,'SLC','DEN'),slots);
 E.buyAirport(s,'DEN');E.upgradeAirport(s,'DEN','terminal');assert.equal(E.airportDemandFactor(s,'SLC','DEN'),1.1);
});
test('Retail revenue share is local and stacks with the existing airline retail partnership',()=>{
 const s=setup();E.upgradeAirport(s,'SLC','retail');close(E.airportShare(s,'SLC'),.035);assert.equal(E.airportShare(s,'DEN'),.03);assert.equal(E.airportShare(s),.03);E.buyUpgrade(s,'terminal');close(E.airportShare(s,'SLC'),.045);assert.equal(E.airportShare(s,'DEN'),.04);
 const before=s.totals.airport;E.advance(s,60);close(s.totals.airport-before,E.airportBaselineIncome(s,'SLC')/24);
});
test('Ground services shorten only ground time on affected player and rival flights',()=>{
 const s=setup(),r=s.routes[0],p=s.planes[0],base=E.economics(s,r,p),other=E.economics(s,{a:'LAX',b:'PHX'},p),ai=E.economics(s,r,p,{rivals:true});
 E.upgradeAirport(s,'SLC','ground');const faster=E.economics(s,r,p);close(base.duration-faster.duration,36*.08);assert(faster.crew<base.crew);close(ai.duration-E.economics(s,r,p,{rivals:true}).duration,36*.08);assert.deepEqual(E.economics(s,{a:'LAX',b:'PHX'},p),other);
 E.buyAirport(s,'DEN');for(const id of ['SLC','DEN'])while(E.airportDevelopment(s,id).ground<3)E.upgradeAirport(s,id,'ground');close(E.airportGroundFactor(s,'SLC','DEN'),.52);assert(E.economics(s,r,p).duration>0);
});
test('Airport improvements keep existing flight quotes fixed and benefit subsequent departures',()=>{
 const s=setup(),p=s.planes[0];E.schedulePlane(s,p.id,[s.routes[0].id]);E.advance(s,5);const quote=clone(p.flight);E.upgradeAirport(s,'SLC','ground');E.upgradeAirport(s,'SLC','terminal');E.advance(s,5);assert.deepEqual(p.flight,quote);assert(E.economics(s,s.routes[0],p).duration<quote.duration);
});
test('Income previews are pure and agree with the actual upgraded state',()=>{
 const s=setup();E.schedulePlane(s,s.planes[0].id,[s.routes[0].id]);for(const type of ['terminal','retail','ground']){const before=clone(s),preview=E.airportUpgradePreview(s,'SLC',type);assert.deepEqual(s,before);E.upgradeAirport(s,'SLC',type);assert.equal(E.airportDaily(s,'SLC'),preview.nextIncome);assert.equal(E.airportShare(s,'SLC'),preview.nextShare);}
});
test('Actual player and rival arrivals pay the upgraded airport share',()=>{
 const s=setup();E.buyAirport(s,'DEN');E.schedulePlane(s,s.planes[0].id,[s.routes[0].id]);E.advance(s,1);s.planes[0].progress=s.planes[0].flight.duration-1;s.planes[0].auto=false;
 const ai=s.rivals[0],route=ai.routes.find(r=>r.a==='DEN'||r.b==='DEN');route.flight=E.economics(s,route,{model:route.model},{rivals:true});route.progress=route.flight.duration-1;
 const control=clone(s),playerRevenue=s.planes[0].flight.revenue,aiRevenue=route.flight.revenue;E.upgradeAirport(s,'DEN','retail');const upgradedStart=s.totals.airport,controlStart=control.totals.airport;
 E.advance(s,1);E.advance(control,1);
 const expected=E.ap('DEN').demand*47000*.005/1440+[playerRevenue,aiRevenue].reduce((n,rev)=>n+Math.round(rev/2*.035)-Math.round(rev/2*.03),0);
 close((s.totals.airport-upgradedStart)-(control.totals.airport-controlStart),expected);
});
test('Developments and income survive reload and away progress; malformed records are rejected',()=>{
 const s=setup();E.upgradeAirport(s,'SLC','terminal');E.upgradeAirport(s,'SLC','retail');E.upgradeAirport(s,'SLC','ground');const loaded=E.validateSave(clone(s));E.advance(s,10080);E.advance(loaded,10080);assert.deepEqual(s,loaded);
 for(const change of [x=>x.airportDevelopments.SLC.terminal=4,x=>x.airportDevelopments.SLC.retail=-1,x=>x.airportDevelopments.SLC.ground=.5,x=>x.airportDevelopments.SLC.invested=0,x=>x.airportDevelopments.DEN=clone(x.airportDevelopments.SLC),x=>x.airportDevelopments=[]]){const invalid=clone(s);change(invalid);assert.throws(()=>E.validateSave(invalid));}
});
