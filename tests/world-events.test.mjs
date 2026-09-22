import assert from 'node:assert/strict';
import test from 'node:test';
import * as E from '../dist/engine.js';
import {AIRPORTS,PLANES} from '../dist/data.js';
import {WORLD_EVENT_TYPES} from '../dist/world-events.js';
const clone=s=>JSON.parse(JSON.stringify(s));
const setup=()=>{const s=E.createGame();s.created=123456;E.buyPlane(s,'atr42');return s;};
const days=(s,n)=>{for(let i=0;i<n;i++)E.advance(s,1440);};
const event=(type,startDay=5,airport='SLC')=>({id:'test-'+type,type,scope:WORLD_EVENT_TYPES.find(e=>e.id===type).scope,airport,region:E.ap(airport).region,startDay,endDay:startDay+E.eventDefinition(type).duration});

test('Events announce in advance, begin on schedule, expire and retain readable history',()=>{
 const s=setup();days(s,2);assert.equal(s.worldEvents.upcoming.length,1);const e=clone(s.worldEvents.upcoming[0]);assert.equal(e.type,'world-games');assert(e.startDay>E.gameDay(s));assert(s.notifications.some(n=>n.id===e.id+':announced'));
 days(s,3);assert.equal(E.activeWorldEvents(s)[0].id,e.id);assert(s.notifications.some(n=>n.id===e.id+':started'));
 days(s,7);assert(!E.activeWorldEvents(s).some(x=>x.id===e.id));assert(s.worldEvents.history.some(x=>x.id===e.id));assert.equal(s.notifications.filter(n=>n.id===e.id+':ended').length,1);
});

test('Destination events increase demand and actual revenue only on affected connections',()=>{
 const s=setup();s.minute=6*1440;const base=E.economics(s,{a:'SLC',b:'DEN'},{model:'atr42'}),other=E.economics(s,{a:'LAX',b:'PHX'},{model:'atr42'}),demand=E.routeDemand(s,'SLC','DEN');
 s.worldEvents.active=[event('world-games')];const boosted=E.economics(s,{a:'SLC',b:'DEN'},{model:'atr42'});assert(boosted.revenue>base.revenue*1.2);assert(boosted.profit>base.profit);assert(E.routeDemand(s,'SLC','DEN')>demand*1.6);assert.deepEqual(E.economics(s,{a:'LAX',b:'PHX'},{model:'atr42'}),other);
 assert.equal(E.economics(s,{a:'DEN',b:'SLC'},{model:'atr42'}).revenue,boosted.revenue);
});

test('Regional weather changes flight time; global fuel events change fuel cost, with bounded stacking',()=>{
 const s=setup();s.minute=6*1440;const base=E.economics(s,{a:'SLC',b:'DEN'},{model:'atr42'});
 s.worldEvents.active=[event('regional-storms')];assert(E.economics(s,{a:'SLC',b:'DEN'},{model:'atr42'}).duration>base.duration*1.17);assert.equal(E.worldEffects(s,'HND','SIN').time,1);
 s.worldEvents.active=[event('fuel-shock')];assert(E.economics(s,{a:'SLC',b:'DEN'},{model:'atr42'}).fuel>base.fuel*1.24);
 s.worldEvents.active=[event('fuel-relief')];assert(E.economics(s,{a:'SLC',b:'DEN'},{model:'atr42'}).fuel<base.fuel*.81);
 s.worldEvents.active=[event('fuel-shock'),{...event('fuel-shock'),id:'another'}];assert(E.marketConditions(s,'SLC','DEN').fuel<=1.55);
});

test('In-flight economics remain fixed when an event begins; the next departure benefits',()=>{
 const s=setup();s.minute=4*1440+1430;const r=E.buyRoute(s,'SLC','DEN'),p=s.planes[0];E.schedulePlane(s,p.id,[r.id]);s.worldEvents.upcoming=[event('world-games')];s.worldEvents.nextAnnouncementDay=20;
 E.advance(s,5);const flight=clone(p.flight);E.advance(s,10);assert.deepEqual(p.flight,flight);assert(E.activeWorldEvents(s).length);const newQuote=E.economics(s,r,p);assert(newQuote.revenue>flight.revenue);
});

test('Offline progression reports every airport and aircraft release once, with complete batch details',()=>{
 const s=setup();s.minute=7*1440;E.advance(s,7*1440);
 const airports=s.notifications.filter(n=>n.kind==='airports'),aircraft=s.notifications.filter(n=>n.kind==='aircraft');assert.equal(airports.length,1);assert.equal(aircraft.length,1);
 assert.deepEqual(airports[0].items,AIRPORTS.filter(a=>a.opensDay===10).map(a=>a.id));assert.deepEqual(aircraft[0].items,PLANES.filter(m=>m.releaseDay===8).map(m=>m.id));assert.equal(airports[0].read,false);
 const loaded=E.validateSave(clone(s));E.advance(loaded,5);assert.equal(loaded.notifications.filter(n=>n.id==='airports:10').length,1);assert.equal(loaded.notifications.filter(n=>n.id==='aircraft:8').length,1);
});

test('Notifications retain unread state across reload, support individual/all read and deduplicate',()=>{
 const s=setup();days(s,10);const n=s.notifications.find(n=>n.kind==='airports');E.markNotificationsRead(s,n.id);const loaded=E.validateSave(clone(s));assert.equal(loaded.notifications.find(x=>x.id===n.id).read,true);assert(E.unreadNotifications(loaded).length>0);
 const length=loaded.notifications.length;E.notify(loaded,n);assert.equal(loaded.notifications.length,length);E.markNotificationsRead(loaded);assert.equal(E.unreadNotifications(loaded).length,0);
});

test('Apex launches once with funding, warns first, and buys its first license with its own cash',()=>{
 const s=setup();days(s,14);assert.equal(s.rivals.length,5);assert.equal(E.newcomerInfo(s).status,'announced');assert(s.notifications.some(n=>n.id==='apex-announced'));
 days(s,4);const ai=s.rivals.find(ai=>ai.id==='apex');assert(ai);assert(ai.cash>=25000000);assert.equal(ai.routes.length,0);assert.equal(E.newcomerInfo(s).status,'arrived');
 E.advance(s,ai.nextExpansionAt-s.minute+1);assert(ai.bid);const bid=clone(ai.bid),cash=ai.cash,quote=E.aiRouteOpportunity(s,ai,bid.a,bid.b);E.advance(s,bid.at-s.minute+1);assert.equal(ai.routes.length,1);assert.equal(ai.cash,cash-quote.upfront);assert(ai.cash>=quote.reserve);assert(E.slots(s,bid.a,bid.b)<=5);
 const loaded=E.validateSave(clone(s));days(loaded,7);assert.equal(loaded.rivals.filter(ai=>ai.id==='apex').length,1);assert.equal(loaded.notifications.filter(n=>n.id==='apex-arrived').length,1);
});

test('Late legacy saves get a fresh event calendar without retroactive launches or loss of assets',()=>{
 const s=setup();delete s.worldEvents;delete s.notifications;s.minute=180*1440;const r=E.buyRoute(s,'SLC','DEN');E.schedulePlane(s,s.planes[0].id,[r.id]);s.speed=0;const before=clone(s);assert.deepEqual(E.validateSave(clone(s)),before);
 E.advance(s,1);assert.equal(s.worldEvents.epochDay,180);assert.equal(s.worldEvents.entrantDay,198);assert.equal(s.rivals.length,5);assert.equal(s.notifications.length,0);assert.equal(s.cash,before.cash);assert.deepEqual(s.routes,before.routes);assert.equal(s.planes[0].id,before.planes[0].id);
});

test('Calendar and notifications are deterministic across save/reload and continued simulation',()=>{
 const s=setup();days(s,13);const loaded=E.validateSave(clone(s));days(s,16);days(loaded,16);assert.deepEqual(clone(loaded),clone(s));
});

test('Invalid calendars, notifications and extra rival identities are rejected',()=>{
 for(const mutate of [s=>s.worldEvents.nextAnnouncementDay=-1,s=>s.worldEvents.active=[{...event('world-games'),endDay:500}],s=>s.notifications=[{id:'bad'}],s=>s.notifications=[{id:'x',kind:'airports',title:'x',message:'x',time:0,read:false,shown:false,items:['FAKE']}],s=>s.rivals.push({...s.rivals[0]}),s=>s.rivals.push({...s.rivals[0],id:'unknown'})]){const s=setup();mutate(s);assert.throws(()=>E.validateSave(s));}
});

test('Events do not run before the first aircraft, and long campaigns preserve five shared licenses',()=>{
 const paused=E.createGame();days(paused,25);assert.equal(paused.notifications.length,0);assert.equal(paused.rivals.length,5);
 const s=setup();days(s,90);assert.equal(s.rivals.length,6);assert(new Set([...s.worldEvents.history,...s.worldEvents.active,...s.worldEvents.upcoming].map(e=>e.type)).size>=4);
 const ids=new Set(s.rivals.flatMap(ai=>ai.routes.map(r=>r.id)));for(const id of ids){const [a,b]=id.split('-');assert(E.slots(s,a,b)<=5,id);}E.validateSave(clone(s));
});
