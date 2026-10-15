/* SMV ASTRO V303 — independent, offline, inspectable traditional strength model.
 * Distances 15/8/3 degrees are USER-REQUESTED MODEL BANDS, not a quotation
 * or an empirically validated probability scale. Never diagnosis or gender prediction.
 * READS existing Swiss-derived longitude/sign data; no network/database access.
 */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root)root.SMVD1StrengthV303=api;})(typeof window!=='undefined'?window:globalThis,function(){'use strict';
 const KEYS=['Sun','Moon','Mars','Mercury','Jupiter','Venus','Saturn','Rahu','Ketu'];
 const ASPECT={Sun:[7],Moon:[7],Mars:[4,7,8],Mercury:[7],Jupiter:[5,7,9],Venus:[7],Saturn:[3,7,10]};
 const COMBUST={Moon:12,Mars:17,Mercury:14,Jupiter:11,Venus:10,Saturn:15};
 const FRIENDS={Sun:['Moon','Mars','Jupiter'],Moon:['Sun','Mercury'],Mars:['Sun','Moon','Jupiter'],Mercury:['Sun','Venus'],Jupiter:['Sun','Moon','Mars'],Venus:['Mercury','Saturn'],Saturn:['Mercury','Venus']};
 const ENEMIES={Sun:['Venus','Saturn'],Moon:[],Mars:['Mercury'],Mercury:['Moon'],Jupiter:['Mercury','Venus'],Venus:['Sun','Moon'],Saturn:['Sun','Moon','Mars']};
 const SIGN_LORDS=['Mars','Venus','Mercury','Moon','Sun','Mercury','Venus','Mars','Jupiter','Saturn','Saturn','Jupiter'];
 function naturalDignity(k,p){if(!p||!SIGN_LORDS[p.sign]||!FRIENDS[k])return 'neutral';
  if(EXALTED[k]===p.sign)return 'exalted';if((OWNS[k]||[]).includes(p.sign))return 'own';
  if(({Sun:6,Moon:7,Mars:3,Mercury:11,Jupiter:9,Venus:5,Saturn:0})[k]===p.sign)return 'debilitated';
  const host=SIGN_LORDS[p.sign];return FRIENDS[k].includes(host)?'friend':ENEMIES[k].includes(host)?'enemy':'neutral';}
 const KARAKA={children:['Jupiter'],wealth:['Jupiter'],marriage:['Venus'],home:['Moon','Venus'],profession:['Sun','Saturn','Mercury','Jupiter'],health:['Sun'],learning:['Jupiter','Mercury']};
 const EXALTED={Sun:0,Moon:1,Mars:9,Mercury:5,Jupiter:3,Venus:11,Saturn:6};
 const OWNS={Sun:[4],Moon:[3],Mars:[0,7],Mercury:[2,5],Jupiter:[8,11],Venus:[1,6],Saturn:[9,10]};
 const clamp=(v,a=0,b=1)=>Math.max(a,Math.min(b,v));
 const mod=x=>((x%360)+360)%360;
 const angle=(a,b)=>{if(!Number.isFinite(a)||!Number.isFinite(b))return null;let d=Math.abs(mod(a)-mod(b));return Math.min(d,360-d);};
 const lon=p=>p&&Number.isFinite(p.longitude)?mod(p.longitude):null;
 const band=d=>d===null?'unknown':d<=3?'within-3':d<=8?'within-8':d<=15?'within-15':'beyond-15';
 const weight=d=>d===null?0.40:d<=3?1:d<=8?0.76:d<=15?0.44:0.09;
 function phase(d){const sun=lon(d?.planets?.Sun),moon=lon(d?.planets?.Moon);if(sun===null||moon===null)return null;
  const separation=mod(moon-sun),light=clamp((1-Math.cos(separation*Math.PI/180))/2);return {separation,light,brightFifthWindow:separation>=48&&separation<=240,waxing:separation<180,
   phaseClass:separation>=48&&separation<=240?'strong-window':'weak-window',
   tithiIndex:Math.min(30,Math.floor(separation/12)+1)};}
 function navamsaSign(p){const L=lon(p);if(L===null)return null;const sign=Math.floor(L/30),degree=L%30,part=Math.min(8,Math.floor(degree/(30/9)));
  const kind=sign%3,start=kind===0?sign:kind===1?(sign+8)%12:(sign+4)%12;return (start+part)%12;}
 function vargottama(p){return p&&navamsaSign(p)===p.sign&&navamsaSign(p)!==null;}
 function digBalaHouse(k){return {Jupiter:1,Mercury:1,Moon:4,Venus:4,Saturn:7,Sun:10,Mars:10}[k]??null;}
 function proximity(d,k1,k2){const a=d?.planets?.[k1],b=d?.planets?.[k2],dist=angle(lon(a),lon(b));return {a:k1,b:k2,degrees:dist,band:band(dist),weight:weight(dist),sameSign:!!a&&!!b&&a.sign===b.sign};}
 function conjunction(d,a,b){const p=proximity(d,a,b);return p.sameSign?p:{...p,weight:0};}
 function aspect(d,from,to){const a=d?.planets?.[from],b=d?.planets?.[to];if(!a||!b)return null;
  const step=((b.house-a.house+12)%12)+1;if(!(ASPECT[from]||[]).includes(step))return null;
  const delta=angle(lon(b),lon(a)===null?null:mod(lon(a)+(step-1)*30));return {from,to,step,degrees:delta,band:band(delta),weight:weight(delta)};}
 function combust(d,k){if(k==='Sun'||!COMBUST[k])return {combust:false,orb:null,near:false,relief:[]};const p=d?.planets?.[k],sun=d?.planets?.Sun;if(!p||!sun)return {combust:false,orb:null,near:false,relief:[]};
  const orb=angle(lon(p),lon(sun)),limit=k==='Venus'&&p.retrograde?8:k==='Mercury'&&p.retrograde?12:COMBUST[k],isCombust=orb!==null&&orb<=limit,relief=[];
  if(vargottama(p))relief.push('vargottama');if(p.house===digBalaHouse(k))relief.push('directional-house');
  const lordName=d.houses?.[p.house-1]?.lord,owner=d?.planets?.[lordName];if(owner?.house===p.house)relief.push('dispositor-present');
  return {combust:isCombust,orb,limit,near:orb!==null&&orb<=3,relief};}
 function nodes(d,k){if(!['Rahu','Ketu'].includes(k))throw Error('Node required');const p=d.planets[k],signLord=d.houses?.[p.house-1]?.lord;const co=(d.houses?.[p.house-1]?.occupants||[]).filter(x=>x!==k),asps=KEYS.filter(x=>x!==k&&x!=='Rahu'&&x!=='Ketu'&&aspect(d,x,k)),kendra=KEYS.filter(x=>x!==k&&d.planets[x]&&[1,4,7,10].includes(((d.planets[x].house-p.house+12)%12)+1));
  // Nakshatra ruler is recorded by the older V301 reader, but ranks after the sign lord,
  // conjunction, direct aspects and Kendra links in Adithya Guruji's node hierarchy.
  const E=(typeof globalThis!=='undefined'&&globalThis.SMVD1V301Evidence)?.starOf;const star=E?E(d,k)?.lord:null;
  return {key:k,house:p.house,signLord,conjunctions:co.map(x=>conjunction(d,k,x)),aspects:asps.map(x=>aspect(d,x,k)),kendra,starLord:star,hierarchy:['sign-lord','close-conjunction','direct-aspect','kendra-contacts','star-lord'],starsLast:true};}
 function eclipse(d){const sc=proximity(d,'Sun','Moon'),out=[];for(const k of ['Rahu','Ketu']){const so=proximity(d,'Sun',k),mo=proximity(d,'Moon',k);
  // A node-close Sun/Moon alone is NOT a solar/lunar eclipse: syzygy is necessary.
  if(so.degrees!==null&&so.degrees<=15&&sc.degrees!==null&&sc.degrees<=12)out.push({kind:'solar-configuration',node:k,orb:so.degrees});
  if(mo.degrees!==null&&mo.degrees<=15&&sc.degrees!==null&&Math.abs(sc.degrees-180)<=12)out.push({kind:'lunar-configuration',node:k,orb:mo.degrees});
 }return out;}
 function assess(d,k){const p=d?.planets?.[k];if(!p)return null;const partners=[],aspectedBy=[];for(const x of KEYS){if(x===k||!d.planets[x])continue;if(d.planets[x].house===p.house)partners.push(conjunction(d,k,x));const a=aspect(d,x,k);if(a)aspectedBy.push(a);}
  const dignity=naturalDignity(k,p);let support=dignity==='exalted'?0.88:dignity==='own'?0.82:dignity==='friend'?0.64:dignity==='enemy'?0.43:dignity==='debilitated'?0.22:0.55;
  if(p.retrograde)support+=0.07; // prominence, NOT universal beneficence or exaltation
  if(vargottama(p))support+=0.09;if(p.house===digBalaHouse(k))support+=0.07;
  const burning=combust(d,k);if(burning.combust)support-=0.13*(burning.relief.length?0.45:1);
  const moon=phase(d);if(k==='Moon'&&moon)support=0.7*support+0.3*moon.light;
  let stress=0,benefit=0;for(const c of partners.concat(aspectedBy)){if(!c.weight)continue;const other=c.a===k?c.b:c.from||c.b;if(other==='Rahu')stress+=0.43*c.weight;else if(other==='Ketu'){if(['Sun','Moon'].includes(k))stress+=0.32*c.weight;else if(['Mars','Saturn'].includes(k))benefit+=0.12*c.weight;else benefit+=0.09*c.weight;}
   else if(['Saturn','Mars','Sun'].includes(other))stress+=0.15*c.weight;else if(['Jupiter','Venus'].includes(other))benefit+=0.17*c.weight;else if(other==='Moon'&&moon)benefit+=0.12*moon.light*c.weight;
  }
  const score=clamp(support+benefit-stress);return {planet:k,score,dignity,retrograde:!!p.retrograde,combust:burning,vargottama:vargottama(p),directional:p.house===digBalaHouse(k),partners,aspectedBy,moonPhase:k==='Moon'?moon:undefined,stress:clamp(stress),support:clamp(benefit)};
 }
 function matter(d,key){const defs={children:{house:5,karaka:'Jupiter'},wealth:{house:2,karaka:'Jupiter'},marriage:{house:7,karaka:'Venus'},home:{house:4,karaka:'Moon'},profession:{house:10,karaka:'Sun'},learning:{house:5,karaka:'Mercury'},health:{house:1,karaka:'Sun'}};
  const f=defs[key];if(!f)throw Error('Unknown matter');const h=d.houses[f.house-1],p=d.planets[h.lord],c=d.planets[f.karaka];if(!p||!c)return null;
  const lord=assess(d,h.lord),karaka=assess(d,f.karaka),occupied=h.occupants.map(x=>assess(d,x)),incoming=h.aspects.map(x=>assess(d,x));
  const source=0.3*(lord?.score||0)+0.3*(karaka?.score||0)+0.16*clamp((occupied.reduce((s,x)=>s+(x?.score||0),0)/(occupied.length||1)))+0.12*clamp((incoming.reduce((s,x)=>s+(x?.score||0),0)/(incoming.length||1)))+0.12;
  return {key,house:f.house,houseLord:h.lord,karaka:f.karaka,lord,karakaStatus:karaka,occupants:occupied,incoming,score:clamp(source),blockedCompletely:false};
 }
 return Object.freeze({angle,band,weight,phase,navamsaSign,vargottama,combust,proximity,conjunction,aspect,assess,matter,nodes,eclipse,KARAKA,version:'303-evidence-degree-bands-user-model'});
});
