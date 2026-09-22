// Fictional campaign events. Dates and impacts are gameplay, not real-world forecasts.
export const WORLD_EVENT_TYPES=[
 {id:'world-games',name:'World Games',kind:'travel',scope:'city',duration:7,notice:3,demand:1.7,yield:1.22,fuel:1,time:1,icon:'trophy',description:'Supporters and teams fill flights into the host city.',effect:'Passenger demand +70% · Market fares +22%'},
 {id:'culture-festival',name:'Festival of Lights',kind:'travel',scope:'city',duration:5,notice:2,demand:1.5,yield:1.16,fuel:1,time:1,icon:'star',description:'A major cultural festival puts a new destination in the spotlight.',effect:'Passenger demand +50% · Market fares +16%'},
 {id:'business-summit',name:'Global Business Summit',kind:'travel',scope:'city',duration:4,notice:2,demand:1.35,yield:1.18,fuel:1,time:1,icon:'building',description:'Delegates arrive for a week of business and trade.',effect:'Passenger demand +35% · Market fares +18%'},
 {id:'holiday-wave',name:'Holiday Travel Wave',kind:'travel',scope:'region',duration:6,notice:2,demand:1.3,yield:1.12,fuel:1,time:1,icon:'globe',description:'Holidaymakers create a temporary rush across the region.',effect:'Passenger demand +30% · Market fares +12%'},
 {id:'fuel-shock',name:'Fuel Supply Squeeze',kind:'disruption',scope:'global',duration:4,notice:1,demand:1,yield:1,fuel:1.25,time:1,icon:'fuel',description:'A supply shortage raises operating costs. Efficient aircraft gain an edge.',effect:'Fuel costs +25%'},
 {id:'fuel-relief',name:'Fuel Market Relief',kind:'opportunity',scope:'global',duration:5,notice:1,demand:1,yield:1,fuel:.8,time:1,icon:'fuel',description:'Extra supply lowers fuel costs for a limited window.',effect:'Fuel costs −20%'},
 {id:'regional-storms',name:'Regional Storm Front',kind:'disruption',scope:'region',duration:4,notice:2,demand:.9,yield:1,fuel:1,time:1.18,icon:'clock',description:'Weather slows rotations and softens demand on affected connections.',effect:'Round-trip time +18% · Passenger demand −10%'}
];
export const MARKET_ENTRANT={id:'apex',name:'Apex Airways',color:'#9b83dd',initial:'A',style:'Capital-backed expansion',base:'DXB',cash:25000000,routes:[]};
export const createWorldCalendar=day=>({version:1,epochDay:day,sequence:0,nextAnnouncementDay:day+2,active:[],upcoming:[],history:[],entrantDay:day+18,entrantAnnounced:false,entrantBudget:null});
