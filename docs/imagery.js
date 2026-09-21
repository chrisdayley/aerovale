import airportPhotos from './airport-photos.js';
export const regionalArt={'North America':'north-america','South America':'south-america','Europe':'europe','Asia':'asia','Africa':'africa','Oceania':'oceania'};
export function airportImage(a){return airportPhotos[a.id]?.src||'assets/airports/'+(regionalArt[a.region]||'north-america')+'.webp';}
export function airportCredit(a){return airportPhotos[a.id]||{alt:a.region+' airport concept illustration',label:'Airport concept art'};}
