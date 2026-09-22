import {AIRPORTS, PLANES} from './data.js';

// Career progression is additive to version-one saves. Existing flights count
// toward route mastery; contracts only count departures after acceptance.
export const SPECIALIZATIONS = [
  {id:'regional', name:'Regional powerhouse', icon:'routes', description:'Make a close-knit network work harder.', steps:[
    {name:'Local crews', effect:'8% lower crew costs on routes up to 2,000 km.'},
    {name:'Community loyalty', effect:'15% more demand on routes up to 2,000 km.'},
    {name:'Express turns', effect:'10% faster round trips on routes up to 2,000 km.'}
  ]},
  {id:'premium', name:'Signature service', icon:'star', description:'Build an airline passengers will pay more to fly.', steps:[
    {name:'Signature cabins', effect:'8% more ticket revenue in premium cabins.'},
    {name:'Smarter interiors', effect:'Premium cabins retain 80% of standard seats, up from 73%.'},
    {name:'Corporate accounts', effect:'15% more demand for your premium flights.'}
  ]},
  {id:'efficient', name:'Precision operator', icon:'fuel', description:'Turn a lean fleet into a lasting advantage.', steps:[
    {name:'Fuel intelligence', effect:'4% lower fuel costs across your fleet.'},
    {name:'Predictive maintenance', effect:'10% lower flight maintenance costs.'},
    {name:'Network coordination', effect:'4% faster round trips across your fleet.'}
  ]}
];
export const CONTRACT_TYPES = [
  {id:'dispatch', title:'Prove your airline', client:'Aerovale Aviation Council', icon:'plane', verb:'profitable round trips', hint:'Assign a plane to a route with a positive profit forecast. Automatic departures do the rest.'},
  {id:'shuttle', title:'The regional shuttle', client:'Regional Business Alliance', icon:'routes', verb:'profitable short-haul trips', hint:'Fly profitable round trips on connections no longer than 2,000 km. Smaller aircraft and frequent departures work well.'},
  {id:'premium', title:'A first-class impression', client:'Executive Travel Group', icon:'star', verb:'profitable premium trips', hint:'Pause departures, finish the current flight, then choose a Premium cabin in Manage aircraft. Check its profit before resuming.'},
  {id:'variety', title:'Connect the dots', client:'Destination Partnership', icon:'globe', verb:'different airports served', hint:'Complete profitable round trips through different airports. Both endpoints count; rotating between routes broadens your reach.'},
  {id:'fullhouse', title:'Fill the cabin', client:'Travel Club Collective', icon:'rivals', verb:'full, profitable trips', hint:'Complete profitable flights with at least 80% of seats filled. Adjust ticket prices or match a smaller plane to demand.'},
  {id:'spotlight', title:'Destination spotlight', client:'City Tourism Board', icon:'building', verb:'profitable trips on this route', hint:'Focus departures on this connection. You can add another aircraft if you own a spare license.'},
  {id:'longhaul', title:'Beyond the horizon', client:'Global Trade Council', icon:'globe', verb:'profitable long-haul trips', hint:'Complete profitable round trips on connections of at least 3,000 km. Match aircraft range and capacity to the market.'},
  {id:'efficient', title:'Fly smarter', client:'Efficient Skies Initiative', icon:'fuel', verb:'efficient, profitable trips', hint:'Use a plane rated at 4.5 fuel units or less per 100 standard seat-km. Newer airframes can help; check the aircraft market.'}
];
const byModel = new Map(PLANES.map(p=>[p.id,p]));
export const contractType = id => CONTRACT_TYPES.find(c=>c.id===id);
export function createCareer(s) {
  const founderCredits = Math.min(3,Math.floor((s.totals?.flights||0)/25));
  return {version:1,sequence:0,offers:[],active:[],completed:0,earned:founderCredits,founderCredits,perks:{regional:0,premium:0,efficient:0},history:[],goal:null};
}
export function careerState(s) { return s.career || createCareer(s); }
export function strategyCredits(s) {
  const c=careerState(s);
  return c.earned-Object.values(c.perks).reduce((n,rank)=>n+rank*(rank+1)/2,0);
}
export function routeMastery(r) {
  const flights=Math.max(0,r?.flights||0), thresholds=[0,10,40,120];
  const level=flights>=120?3:flights>=40?2:flights>=10?1:0;
  return {level,flights,name:['New connection','Established','Trusted','Signature route'][level],bonus:level*.02,next:thresholds[level+1]||null,previous:thresholds[level]};
}
export function careerEffects(s,r,cabin,km) {
  const perks=s.career?.perks||{},regional=km<=2000, premium=cabin==='premium';
  const owned=s.routes.find(x=>x.id===r.id||[r.a,r.b].sort().join('-')===x.id);
  return {yield:(1+routeMastery(owned).bonus)*(premium&&perks.premium>=1?1.08:1),
    seats:premium&&perks.premium>=2?.8:.73,
    demand:(regional&&perks.regional>=2?1.15:1)*(premium&&perks.premium>=3?1.15:1),
    time:(regional&&perks.regional>=3?.9:1)*(perks.efficient>=3?.96:1),
    crew:regional&&perks.regional>=1?.92:1,
    fuel:perks.efficient>=1?.96:1,maintenance:perks.efficient>=2?.9:1};
}
function newOffer(s,c) {
  const used=new Set([...c.offers,...c.active].map(x=>x.type));
  const eligible=CONTRACT_TYPES.filter(t=>!used.has(t.id)&&(t.id!=='spotlight'||s.routes.length)&&(t.id!=='longhaul'||s.planes.some(p=>byModel.get(p.model).range>=3000)));
  // Initial offers teach three genuinely different ways to operate. Later
  // offers rotate by saved sequence, never by reload or the device clock.
  const initial=['dispatch','shuttle','premium'];
  const type=c.sequence<3?contractType(initial[c.sequence]):eligible[(c.sequence-3)%eligible.length];
  const id='commission-'+c.sequence++,tier=Math.min(3,Math.floor(c.completed/5));
  const counts={dispatch:c.completed===0?1:4+tier*2,shuttle:3+tier*2,premium:3+tier,variety:3+Math.min(3,tier),fullhouse:4+tier*2,spotlight:5+tier*2,longhaul:2+tier,efficient:4+tier*2};
  const seats=s.planes.reduce((n,p)=>n+byModel.get(p.model).seats,0);
  const reward=Math.round(Math.min(600000,Math.max(25000,22000+seats*110)*(type.id==='dispatch'?.9:type.id==='longhaul'?1.5:1.2))/1000)*1000;
  const route=type.id==='spotlight'?s.routes[(c.sequence-1)%s.routes.length]:null;
  return {id,type:type.id,target:counts[type.id],reward,routeId:route?.id||null,progress:0,seen:[],acceptedAt:null,completedAt:null};
}
export function initializeCareer(s) {
  s.career??=createCareer(s);
  while(s.career.offers.length<3)s.career.offers.push(newOffer(s,s.career));
  return s.career;
}
export function acceptContract(s,id) {
  const c=initializeCareer(s),offer=c.offers.find(x=>x.id===id);
  if(!offer)throw Error('This contract is no longer on the board.');
  if(c.active.length>=2)throw Error('Finish or release an active contract first. You can run two at a time.');
  offer.acceptedAt=s.minute;c.active.push(offer);c.offers=c.offers.filter(x=>x.id!==id);initializeCareer(s);
  return offer;
}
export function abandonContract(s,id) {
  const c=initializeCareer(s),contract=c.active.find(x=>x.id===id);
  if(!contract)throw Error('Choose an active contract.');
  if(contract.completedAt!==null)throw Error('This contract is complete. Collect its reward.');
  c.active=c.active.filter(x=>x.id!==id);
}
export function contractQualifies(c,r,e) {
  if(e.profit<=0||!e.careerFlight||e.careerFlight.departedAt<=c.acceptedAt)return false;
  switch(c.type){
    case 'shuttle':return e.km<=2000;
    case 'premium':return e.careerFlight.cabin==='premium';
    case 'fullhouse':return e.load>=.8;
    case 'spotlight':return r.id===c.routeId;
    case 'longhaul':return e.km>=3000;
    case 'efficient':return e.careerFlight.fuelPerSeat<=.045;
    default:return true;
  }
}
export function recordCareerFlight(s,r,e,notify) {
  if(!s.career)return;
  for(const c of s.career.active){
    if(c.completedAt!==null||!contractQualifies(c,r,e))continue;
    if(c.type==='variety'){c.seen=[...new Set([...c.seen,r.a,r.b])];c.progress=Math.min(c.target,c.seen.length);}
    else c.progress=Math.min(c.target,c.progress+1);
    if(c.progress>=c.target){c.completedAt=s.minute;notify(s,{id:c.id+'-ready',kind:'career',title:contractType(c.type).title+' complete',message:'Your commission and 1 strategy credit are ready. Collect them in Career to develop your airline.'});}
  }
  const current=routeMastery(r),before=routeMastery({...r,flights:r.flights-1});
  if(current.level>before.level)notify(s,{id:'mastery-'+r.id+'-'+current.level,kind:'career',title:r.id+' · '+current.name,message:`${current.flights} round trips flown. This route now earns ${Math.round(current.bonus*100)}% more ticket revenue on future departures. Your existing flights count toward mastery.`});
}
export function collectContract(s,id) {
  const c=initializeCareer(s),contract=c.active.find(x=>x.id===id);
  if(!contract||contract.completedAt===null)throw Error('Finish the contract before collecting its reward.');
  c.active=c.active.filter(x=>x.id!==id);c.completed++;c.earned++;
  c.history.unshift({...contract,claimedAt:s.minute});c.history=c.history.slice(0,24);
  return contract;
}
export function developSpecialization(s,id) {
  const c=initializeCareer(s),path=SPECIALIZATIONS.find(x=>x.id===id),rank=c.perks[id];
  if(!path)throw Error('Choose a specialization.');
  if(rank>=3)throw Error('This specialization is fully developed.');
  if(strategyCredits(s)<rank+1)throw Error(`This development needs ${rank+1} strategy credits. Complete contracts to earn more.`);
  c.perks[id]++;
  return path.steps[rank];
}
export function setAircraftGoal(s,id) {
  if(id!==null&&!byModel.has(id))throw Error('Choose an aircraft from the catalog.');
  initializeCareer(s).goal=id;
}
export function validateCareer(s) {
  const c=s.career;if(c===undefined)return;
  const integer=(v,min=0,max=1e9)=>Number.isInteger(v)&&v>=min&&v<=max;
  if(!c||c.version!==1||!integer(c.sequence)||!integer(c.completed)||!integer(c.earned)||!integer(c.founderCredits,0,3)||c.earned!==c.completed+c.founderCredits||!c.perks||Object.keys(c.perks).length!==3||SPECIALIZATIONS.some(p=>!integer(c.perks[p.id],0,3))||strategyCredits(s)<0||(c.goal!==null&&!byModel.has(c.goal)))throw Error('Invalid airline career.');
  const ids=new Set();
  for(const [field,limit] of [['offers',3],['active',2],['history',24]]){
    if(!Array.isArray(c[field])||c[field].length>limit)throw Error('Invalid contract board.');
    for(const x of c[field]){
      const seq=Number(x?.id?.slice(11));
      if(!x||!/^commission-\d+$/.test(x.id)||!integer(seq,0,c.sequence-1)||ids.has(x.id)||!contractType(x.type)||!integer(x.target,1,100)||!integer(x.reward,1000,600000)||!integer(x.progress,0,x.target)||!Array.isArray(x.seen)||x.seen.length>10||new Set(x.seen).size!==x.seen.length||x.seen.some(id=>!AIRPORTS.some(a=>a.id===id))||(x.routeId!==null&&!s.routes.some(r=>r.id===x.routeId))||(x.type==='spotlight'&&!x.routeId))throw Error('Invalid contract.');
      if(field==='offers'&&(x.acceptedAt!==null||x.completedAt!==null||x.progress!==0||x.seen.length))throw Error('Invalid contract offer.');
      if(field!=='offers'&&(!Number.isFinite(x.acceptedAt)||x.acceptedAt<0||x.acceptedAt>s.minute))throw Error('Invalid contract acceptance.');
      if(x.completedAt!==null&&(!Number.isFinite(x.completedAt)||x.completedAt<x.acceptedAt||x.completedAt>s.minute||x.progress!==x.target))throw Error('Invalid completed contract.');
      if(x.completedAt===null&&x.progress===x.target)throw Error('Invalid contract progress.');
      if(field==='history'&&(x.completedAt===null||!Number.isFinite(x.claimedAt)||x.claimedAt<x.completedAt||x.claimedAt>s.minute))throw Error('Invalid contract history.');
      ids.add(x.id);
    }
  }
  if(c.completed<c.history.length)throw Error('Invalid career history.');
  for(const p of s.planes){const f=p.flight?.careerFlight;if(f&&(!Number.isFinite(f.departedAt)||f.departedAt<0||f.departedAt>s.minute||!['standard','dense','premium'].includes(f.cabin)||!Number.isFinite(f.fuelPerSeat)||f.fuelPerSeat<=0))throw Error('Invalid career flight.');}
}
