import assert from 'node:assert/strict';
import test from 'node:test';
import * as E from '../dist/engine.js';
import * as C from '../dist/career.js';
import {PLANES} from '../dist/data.js';
const clone=s=>JSON.parse(JSON.stringify(s));
function setup(){const s=E.createGame();s.created=123456;E.buyPlane(s,'atr42');const r=E.buyRoute(s,'SLC','DEN');E.schedulePlane(s,s.planes[0].id,[r.id]);E.initializeCareer(s);return s;}
function accept(s,type){const c=s.career.offers.find(x=>x.type===type);return E.acceptContract(s,c.id);}
function finish(s,c){for(let i=0;i<100&&c.completedAt===null;i++)E.advance(s,180);assert.notEqual(c.completedAt,null);}

test('Legacy progress migrates additively and earns bounded founding credits once',()=>{
 const s=setup();delete s.career;s.totals.flights=200;s.routes[0].flights=200;E.advance(s,5);delete s.career;
 const before=clone(s);assert.deepEqual(E.validateSave(clone(s)),before);E.initializeCareer(s);
 assert.equal(E.strategyCredits(s),3);assert.equal(E.routeMastery(s.routes[0]).level,3);
 for(const k of ['cash','planes','routes','airports','claims','upgrades','minute','totals','rivals'])assert.deepEqual(s[k],before[k],k);
 E.developSpecialization(s,'regional');E.initializeCareer(s);assert.equal(E.strategyCredits(s),2);
 const reloaded=E.validateSave(clone(s));assert.deepEqual(reloaded,s);assert.equal(reloaded.version,1);
});

test('The first commission pays once, persists, and turns flight activity into strategy',()=>{
 const s=setup(),c=accept(s,'dispatch');assert.equal(c.target,1);assert.throws(()=>E.claimContract(s,c.id));finish(s,c);
 const before=s.cash,rewards=s.totals.rewards;assert.equal(s.notifications.filter(n=>n.id===c.id+'-ready').length,1);
 E.claimContract(s,c.id);assert.equal(s.cash,before+c.reward);assert.equal(s.totals.rewards,rewards+c.reward);assert.equal(E.strategyCredits(s),1);assert.equal(s.career.completed,1);assert.equal(s.ledger[0].amount,c.reward);
 assert.throws(()=>E.claimContract(s,c.id));assert.equal(s.cash,before+c.reward);E.validateSave(clone(s));
});

test('Only departures after acceptance count, including flights from pre-update saves',()=>{
 const s=setup();E.advance(s,5);const old=clone(s.planes[0].flight);s.planes[0].auto=false;E.advance(s,10);const c=accept(s,'dispatch');
 E.advance(s,old.duration);assert.equal(c.progress,0);s.planes[0].auto=true;finish(s,c);assert.equal(c.progress,1);
 const legacy=setup();E.advance(legacy,5);delete legacy.planes[0].flight.careerFlight;legacy.planes[0].auto=false;const l=accept(legacy,'dispatch');E.advance(legacy,1000);assert.equal(l.progress,0);
});

test('Two active contracts, persistent offers, safe release and no instant reward farming',()=>{
 const s=setup(),a=accept(s,'dispatch'),b=accept(s,'shuttle');assert.throws(()=>accept(s,'premium'));const offers=clone(s.career.offers);E.initializeCareer(s);assert.deepEqual(s.career.offers,offers);
 E.abandonContract(s,a.id);assert.equal(s.career.active.length,1);assert.equal(s.career.earned,0);assert.throws(()=>E.claimContract(s,a.id));accept(s,'premium');
 finish(s,b);assert.throws(()=>E.abandonContract(s,b.id));assert.equal(s.career.active.length,2);E.validateSave(clone(s));
});

test('Contract conditions distinguish cabin, range, occupancy, efficiency, destination and profit',()=>{
 const r={id:'DEN-SLC',a:'SLC',b:'DEN'},c={type:'dispatch',acceptedAt:10,routeId:r.id};
 const e={km:700,profit:5000,load:.85,careerFlight:{departedAt:11,cabin:'standard',fuelPerSeat:.04}};
 assert(C.contractQualifies(c,r,e));assert(!C.contractQualifies(c,r,{...e,careerFlight:{...e.careerFlight,departedAt:10}}));assert(!C.contractQualifies(c,r,{...e,profit:-1}));
 assert(C.contractQualifies({...c,type:'shuttle'},r,e));assert(!C.contractQualifies({...c,type:'shuttle'},r,{...e,km:2001}));
 assert(!C.contractQualifies({...c,type:'premium'},r,e));assert(C.contractQualifies({...c,type:'premium'},r,{...e,careerFlight:{...e.careerFlight,cabin:'premium'}}));
 assert(C.contractQualifies({...c,type:'fullhouse'},r,e));assert(!C.contractQualifies({...c,type:'fullhouse'},r,{...e,load:.799}));
 assert(!C.contractQualifies({...c,type:'longhaul'},r,e));assert(C.contractQualifies({...c,type:'longhaul'},r,{...e,km:3000}));
 assert(C.contractQualifies({...c,type:'spotlight'},r,e));assert(!C.contractQualifies({...c,type:'spotlight',routeId:'LAS-SLC'},r,e));
 assert(C.contractQualifies({...c,type:'efficient'},r,e));assert(!C.contractQualifies({...c,type:'efficient'},r,{...e,careerFlight:{...e.careerFlight,fuelPerSeat:.046}}));
});

test('Network contracts count distinct endpoints, never repeated loops through one route',()=>{
 const s=setup();accept(s,'dispatch');const c=accept(s,'variety');E.advance(s,1440);assert.equal(c.progress,2);assert.equal(c.completedAt,null);
 const r=E.buyRoute(s,'SLC','LAS');s.planes[0].auto=false;E.advance(s,1000);E.schedulePlane(s,s.planes[0].id,[r.id]);finish(s,c);assert.equal(c.progress,3);assert.deepEqual(new Set(c.seen),new Set(['SLC','DEN','LAS']));
});

test('Regional, premium and precision developments change actual economics in their stated scope',()=>{
 const s=setup(),r=s.routes[0],p=s.planes[0],base=E.economics(s,r,p),far={a:'SLC',b:'JFK'},farBase=E.economics(s,far,p),premium=E.economics(s,r,{...p,cabin:'premium'}),rival=E.economics(s,r,p,{rivals:true});
 // A veteran's initial three credits can develop one branch twice or three branches once.
 s.career.founderCredits=3;s.career.earned=3;E.developSpecialization(s,'regional');assert.equal(E.economics(s,r,p).crew,Math.round(base.crew*.92));assert.equal(E.economics(s,far,p).crew,farBase.crew);
 E.developSpecialization(s,'premium');assert(E.economics(s,r,{...p,cabin:'premium'}).revenue>premium.revenue*1.07);assert.equal(E.economics(s,r,p).revenue,base.revenue);
 E.developSpecialization(s,'efficient');assert.equal(E.economics(s,r,p).fuel,Math.round(base.fuel*.96));assert.deepEqual(E.economics(s,r,p,{rivals:true}),rival);assert.throws(()=>E.developSpecialization(s,'regional'));
 s.career.completed=15;s.career.earned=18;for(const id of ['regional','premium','efficient']){E.developSpecialization(s,id);E.developSpecialization(s,id);}
 const all=E.economics(s,r,p);assert(Math.abs(all.duration-base.duration*.9*.96)<.00001);assert.equal(E.economics(s,r,{...p,cabin:'premium'}).seats,Math.floor(E.model(p.model).seats*.8));assert.equal(E.strategyCredits(s),0);assert.throws(()=>E.developSpecialization(s,'regional'));E.validateSave(clone(s));
});

test('Benefits apply on new departures and existing in-flight quotes are never rewritten',()=>{
 const s=setup();E.advance(s,5);const quote=clone(s.planes[0].flight);s.career.founderCredits=1;s.career.earned=1;E.developSpecialization(s,'efficient');E.advance(s,5);assert.deepEqual(s.planes[0].flight,quote);assert(E.economics(s,s.routes[0],s.planes[0]).fuel<quote.fuel);
});

test('Route mastery honors exact thresholds, actual flight payouts, notifications and reverse forecasts',()=>{
 const s=setup(),r=s.routes[0],p=s.planes[0],base=E.economics(s,r,p);r.flights=9;E.advance(s,base.duration+10);assert.equal(E.routeMastery(r).level,1);assert.equal(s.notifications.filter(n=>n.id==='mastery-'+r.id+'-1').length,1);
 assert(E.economics(s,{a:r.b,b:r.a},p).revenue>base.revenue);for(const [flights,bonus] of [[39,.02],[40,.04],[119,.04],[120,.06]]){r.flights=flights;assert.equal(E.routeMastery(r).bonus,bonus);}
});

test('Away simulation completes contracts without expiring or auto-claiming their rewards',()=>{
 const s=setup(),c=accept(s,'dispatch');E.advance(s,10080);assert.notEqual(c.completedAt,null);assert.equal(s.career.completed,0);assert.equal(s.career.earned,0);const loaded=E.validateSave(clone(s));E.advance(loaded,10080);assert.equal(loaded.career.active[0].completedAt,c.completedAt);assert.equal(loaded.notifications.filter(n=>n.id===c.id+'-ready').length,1);E.claimContract(loaded,c.id);assert.equal(loaded.career.completed,1);
});

test('Goals support upcoming aircraft without buying, unlocking or removing anything',()=>{
 const s=setup(),cash=s.cash,m=PLANES.find(p=>p.releaseDay>200);E.setAircraftGoal(s,m.id);assert.equal(s.career.goal,m.id);assert.equal(s.cash,cash);assert.equal(s.planes.length,1);assert.equal(E.modelStatus(s,m),'upcoming');assert.equal(E.validateSave(clone(s)).career.goal,m.id);E.setAircraftGoal(s,null);assert.equal(s.career.goal,null);assert.throws(()=>E.setAircraftGoal(s,'fake'));
});

test('Invalid or duplicate contracts, inflated credits and bad flight metadata are rejected',()=>{
 const edits=[s=>s.career.earned=999,s=>s.career.perks.regional=4,s=>s.career.offers[0].reward=-100,s=>s.career.offers[0].acceptedAt=50,s=>s.career.offers[0].progress=1,s=>s.career.offers.push(clone(s.career.offers[0])),s=>s.career.goal='fake',s=>{E.advance(s,1);s.planes[0].flight.careerFlight.fuelPerSeat=-1;}];
 for(const edit of edits){const s=setup();edit(s);assert.throws(()=>E.validateSave(s));}
});

test('Contract board remains feasible, varied and stable through many completions and reloads',()=>{
 const s=setup();s.cash=1e8;const types=new Set();for(let i=0;i<35;i++){
  const offer=s.career.offers[0],c=E.acceptContract(s,offer.id);types.add(c.type);
  // Complete a controlled fixture to exercise board replacement and save bookkeeping.
  c.progress=c.target;c.completedAt=s.minute;E.claimContract(s,c.id);assert.equal(s.career.offers.length,3);assert.equal(new Set(s.career.offers.map(x=>x.type)).size,3);E.validateSave(clone(s));
 }
 assert(types.size>=6);assert.equal(s.career.history.length,24);assert.equal(s.career.completed,35);assert.equal(E.strategyCredits(s),35);
 const copy=E.validateSave(clone(s));E.initializeCareer(copy);assert.deepEqual(copy,s);
});
