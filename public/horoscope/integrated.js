/* SMV ASTRO V311: four-stage judgement/timing/narrative/remedies pipeline.
 * Captures locked V307 before replacing its public prediction interface.
 * It does NOT trigger ephemeris, Firebase, API, listeners, DOM mutation or rerender.
 * Caller supplies the *existing* single-load chart and Swiss 15-year timeline.
 */
(function(root,factory){'use strict';const previous=root.SMVD1IntegratedV303;const api=factory(root,previous);if(typeof module==='object'&&module.exports)module.exports=api;if(root?.SMVLifePredictionD1?.toD1&&previous?.build)root.SMVD1IntegratedV303=api;
})(typeof window!=='undefined'?window:globalThis,function(g,old){'use strict';
const get=()=>[g.SMVD311Judgement,g.SMVD311Timing,g.SMVD311Narrative,g.SMVD311Remedies];
const encode=t=>String(t??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const HEAD_TA=['தனித்தன்மை, குணநலன்கள் மற்றும் உடல் வளர்ச்சி','குடும்பம், பேச்சு மற்றும் செல்வப் பாதுகாப்பு','முயற்சி, திறமை மற்றும் உடன்பிறப்புகள்','தாய், வீடு, நிலம் மற்றும் மனநிம்மதி','அறிவு, கல்வி, படைப்பாற்றல் மற்றும் புத்திரம்','போட்டி, பணிப்பழக்கம் மற்றும் உடல்நல ஒழுங்கு','திருமணம், உடன்பாடு மற்றும் இணைந்து செயல்படுதல்','பாதுகாப்பு, எதிர்பாராத மாற்றம் மற்றும் ஆராய்ச்சி','தந்தை, குரு, உயர் கல்வி மற்றும் பாக்கியம்','தொழில், கடமை மற்றும் சமூகப் பொறுப்பு','வருமானம், நண்பர்கள் மற்றும் இலக்கு நிறைவேற்றம்','செலவு, உறக்கம், அந்நியத் தொடர்பு மற்றும் ஓய்வு'];
const HEAD_EN=['Identity and personal character','Family finances and communication','Initiative, skills and siblings','Home and family support','Learning, creativity and children','Work routines and competition','Partnership and cooperation','Security and restructuring','Mentors and higher learning','Career and responsibilities','Income and networks','Expenses, distance and recovery'];
function build(chart,lang='ta',context={},timeline=null,options=null){const [J,T,N,R]=get();const ta=lang!=='en';if(!J?.read||!T?.timeline||!N?.natal||!R?.select||!g.SMVLifePredictionD1?.toD1)throw new Error('V311 four prediction modules and D1 normalizer required');
 const source=chart?.chart||chart,dates=timeline||chart?.timeline||null,birth=dates?.birth||source?.birthDate||source?.birth?.date||chart?.birth||'',asof=dates?.referenceDate||source?.calculatedAt?.slice(0,10)||null;
 const d=g.SMVLifePredictionD1.toD1(chart),age=asof?T.ageAt(birth,asof):null;const full=chart?.advanced||chart?.vargas?chart:{...chart,advanced:source?.advanced};
 const starContext=J.starEvidence?J.starEvidence(d,chart):null;
 const claims=Array.from({length:12},(_,i)=>J.read(d,full,i+1,age));if(claims.some(x=>!x))throw Error('V311 requires valid twelve-house D1');
 const timing=T.timeline(d,claims,dates,birth),synthesis=J.synthesize(claims,timing,age),overview=N.lifeOverview?N.lifeOverview(synthesis,starContext,lang):N.summary(synthesis,lang),used=new Set(),usedBooks=new Set(),seenClassical=new Set(),bookRules=g.SMVBookRulesV312?.evaluate(d,claims,timing.all,{age,birth,referenceDate:asof})||null,bookTransits=g.SMVBookTransitsV312?.evaluate(d,dates,timing.all)||null,topics=claims.map((c,i)=>{
  const decision=J.decide(c),natal=N.lifeNatal?N.lifeNatal(c,lang,starContext,seenClassical):N.natal(c,lang,seenClassical),best=(timing.perHouse[c.house]||[]).slice(0,3),periods=best.map(x=>({from:x.period.from,to:x.period.to,md:x.period.md,ad:x.period.ad,pd:x.period.pd,house:c.house,text:N.lifePeriod?N.lifePeriod(x,c,lang,starContext):N.period(x,c,lang)})).filter(x=>x.text);const practical=R.select(c,lang,used,best,starContext).filter(x=>!['tradition-optional','tradition-sign-choice'].includes(x.kind));
  const sourced=g.SMVBookRemediesV312?.select(c,d,best,lang,usedBooks,{allowTraditions:context.allowTraditions,includeReflection:true})||[];
  sourced.forEach(x=>usedBooks.add(x.dedupKey));const remedies=[...practical,...sourced];
  const matches=bookRules?.perHouse?.[c.house]?.matched||[];
  const natalMatches=matches.filter(x=>!x.period&&!x.qualificationOnly&&!(c.ageUnder18&&/career|income|savings/.test(x.ruleId)));
  const specific=natalMatches.filter(x=>!['lord-dignity-support','own-lord-direct-support','natural-benefic-support'].includes(x.ruleId));
  const selected=specific.slice(0,2);
  const bookParagraphs=selected.map(x=>x.text[ta?'ta':'en']);
  for(const p of periods){const activation=matches.find(x=>x.period&&x.period.from===p.from&&x.period.to===p.to&&x.period.md===p.md&&x.period.ad===p.ad&&x.independentRulers);
   if(activation)p.text+=' '+activation.text[ta?'ta':'en'];
  }
  const bookSourceRefs=[...selected.flatMap(x=>x.sourceRefs),...matches.filter(x=>x.period&&periods.some(p=>p.from===x.period.from&&p.to===x.period.to)).flatMap(x=>x.sourceRefs),...sourced.flatMap(x=>x.sourceRefs)];

  // Translate measured natal evidence into subject-specific lived outcomes.
  // Kept separate from astronomical calculation and the manual A/B rule layer.
  const derived=g.SMVPredictionOutcomes?.houseResult?.(d,c,starContext,lang,age)||{paragraphs:[],evidence:[],aspects:[]};
  for(const period of periods){const win=best.find(x=>x.period.from===period.from&&x.period.to===period.to);
   const extra=g.SMVPredictionOutcomes?.extendPeriod?.(win,c,starContext,lang);
   if(extra)period.text+=' '+extra;
  }
  return {number:i+1,title:(ta?HEAD_TA:HEAD_EN)[i],paragraphs:[...natal,...derived.paragraphs,...bookParagraphs],bookSourceRefs,periods,remedies:remedies.map(x=>x.text),remedyDetails:remedies,evidence:{additionalLifeOutcomes:derived.evidence,calculatedAspects:derived.aspects,decision:decision?{outcome:ta?decision.leadTA:decision.leadEN,linkedDomain:ta?decision.linkTA:decision.linkEN,sourceKeys:decision.sourceKeys,hasContradiction:decision.hasContradiction}:null,house:c.house,lord:c.lord,lordHouse:c.location,conclusion:c.conclusion,support:c.positive,opposition:c.negative,substituteDivision:c.division,divisionEvidence:c.divisionEvidence,classicalRules:c.classical,nakshatra:starContext?.houses?.[c.house]||null,linkedOtherLordships:c.otherLordships,periods:best.map(x=>({from:x.period.from,to:x.period.to,md:x.period.md,ad:x.period.ad,pd:x.period.pd,links:x.links,transit:x.transit?.observedOn||null}))}};
 });
 const pdChronology=(timing.pdChronology||[]).map(w=>({from:w.period.from,to:w.period.to,md:w.period.md,ad:w.period.ad,pd:w.period.pd,house:w.house,source:w.period.source,approximate:!!w.period.approximateDayBoundaries,thirdRulerEvidence:w.thirdRulerWitness?.map(z=>({planet:z.planet,relation:z.relation,delta:z.delta,house:z.planetHouse}))||[],text:N.lifePD?N.lifePD(w,lang,starContext):(typeof N.pratyantar==='function'?N.pratyantar(w,lang):'')})).filter(x=>x.text);
 const windowGroups=T.groupYears(timing.years);
 const annual=windowGroups.filter(x=>x.kind==='event').map((item,i)=>({year:+item.from.slice(0,4),from:item.from,to:item.to,text:N.lifeYear?N.lifeYear(item,lang,starContext):N.year(item,lang),focusHouse:item.focusHouse,period:item.period?{md:item.period.md,ad:item.period.ad,pd:item.period.pd}:null,converged:true,transit:item.transit?.planet||null,sourceSignature:item.signature,mergedYears:item.years,recurrences:item.recurrences||[]}));
 const uncoveredWindows=windowGroups.filter(x=>x.kind==='insufficient').map(x=>({from:x.from,to:x.to,years:x.years}));
 const seenChronology=new Set();const chrono=timing.chronology.map(x=>({from:x.period.from,to:x.period.to,md:x.period.md,ad:x.period.ad,pd:x.period.pd,house:x.mainHouse,text:N.lifePeriod?N.lifePeriod({...x,links:x.evidence},x.mainClaim,lang,starContext):N.period({...x,links:x.evidence},x.mainClaim,lang,{seen:seenChronology})})).filter(x=>x.text);
 const originalReport={topics,overview,annual,bookTransits,bookRules,chronology:chrono,pdChronology,lang:ta?'ta':'en',birth,ageAtReport:age,engine:'311-classical-traceable-20261013',timeline:dates?{from:dates.referenceDate,to:dates.end,years:dates.meta?.forecastHorizonYears||timing.years.length,complete:!!(dates.meta?.forecastHorizonYears===15&&dates.meta?.samplesChecked>0&&timing.years.length===15&&timing.all.length>0)}:null,
 v311:{status:'ready',architecture:'natal classical links + varga corroboration + verified MD/AD and sampled transit + natal-linked remedies',chartFacts:{lagna:d.lagna,lords:claims.map(x=>[x.house,x.lord,x.location])},judgements:claims,synthesis,starContext,meta:timing.meta,hasSwissTransitNotes:annual.some(x=>!!x.transit),annualEvidenceWindows:annual.length,uncoveredWindows,hasActualPD:timing.meta.pdAvailable,hasCalculatedPD:timing.meta.calculatedPDRanges>0,scope:'existing Swiss chart and cached upstream Swiss 15-year transit; interpreted using traditional heuristic rules; not a certainty or empirical forecast'}};
 // Sections I–IX facts are READ ONLY. Rule conditions use calculated D1,
 // measured stellar links, supplied MD/AD/PD and sampled transit; never recalc.
 const E=g.SMVPredictionRules;
 const base=originalReport;
 const result=options?.rawPredictionReport===true?base:(E?.applyToReport?E.applyToReport(base,chart,d,starContext,dates):base);
 return result;
}
function sourceDetails(refs,ta){const sources=g.SMVBookSourcesV312?.unique(refs)||[];if(!sources.length)return '';return '<details class="smv-book-sources"><summary>'+(ta?'நூல் ஆதாரம்':'Book references')+'</summary><ul>'+sources.map(x=>'<li><a target="_blank" rel="noopener noreferrer" data-book-sha="'+encode(x.sha256)+'" href="'+encode(x.url)+'">'+encode(x.title)+' — PDF '+x.pdfPages.join(', ')+'</a>'+(x.referenceFrame?' <small>'+encode(x.referenceFrame)+'</small>':'')+'</li>').join('')+'</ul></details>';}
function html(r){if(r?.v311?.status!=='ready')return old?.html?.(r)||'';
 const ta=r.lang==='ta';
 const editorButton=()=>''; // No per-report editor controls; results remain prediction-only.
 // Keep substantial new outcomes and dates; print a recurring explanatory
 // sentence once across the entire report, never dozens of times in every PD.
 // Only identical sentences are removed; no paragraph count or time window is
 // reduced merely to reach a page target.
 let seenMeaning=new Set();
 const resetProse=()=>{seenMeaning=new Set();};
 const freshProse=value=>{
  const chunks=String(value||'').match(/[^.!?।]+(?:[.!?।]+|$)/gu)||[];
  const fresh=[];
  for(const raw of chunks){
   const sentence=raw.trim(),norm=sentence.normalize('NFC').replace(/\s+/g,' ').trim();
   if(!norm)continue;
   // A short heading or standalone date is not a repeatable life assertion.
   if(norm.length>=45){if(seenMeaning.has(norm))continue;seenMeaning.add(norm);}
   fresh.push(sentence);
  }
  return fresh.join(' ');
 };
 const uniqueParagraph=value=>String(value??'').split(/\n\s*\n/g).map(block=>{const prose=freshProse(block);return prose?`<p class=\"smv-d1-life-paragraph\">${encode(prose)}</p>`:'';}).join('');
 // A period shown in the global chronological chapter must not be printed
 // again under the same house. Distinct subtopics retain their own windows.
 const periodIdentity=x=>[x.from,x.to,x.md,x.ad,x.pd||'',x.house].join('|');
 const chronologyKeys=new Set((r.chronology||[]).map(periodIdentity));
 const periodBlock=x=>{
  const rows=(x.periods||[]).filter(p=>!chronologyKeys.has(periodIdentity(p)));
  return rows.length?`<h4>${ta?'இந்தப் பாவத்திற்கான தனிப்பட்ட தசை–புக்திக் காலங்கள்':'Relevant major/sub-period windows for this house'}</h4>${rows.map(p=>{const txt=freshProse(p.text);return txt?`<p class="smv-d1-life-paragraph" data-md="${encode(p.md)}" data-ad="${encode(p.ad)}">${encode(txt)}</p>`:'';}).join('')}`:'';
 };
 const lines=r.topics.map(x=>{resetProse();return `<section class="smv-d1-life-topic smv-v303-house" data-d1-topic="${x.number}"><h3>${x.number}. ${encode(x.title)}</h3>${editorButton('house-'+x.number)}${x.paragraphs.map(uniqueParagraph).join('')}${periodBlock(x)}${x.remedies?.length?`<h4>${ta?'பொருத்தமான வழிமுறைகள் மற்றும் விருப்பப் பரிகாரம்':'Practical support and optional traditions'}</h4>${x.remedies.map(p=>{const t=freshProse(p);return t?`<p class="smv-v311-remedy">${encode(t)}</p>`:'';}).join('')}`:''}${sourceDetails(x.bookSourceRefs,ta)}</section>`;}).join('');
 resetProse();
const chron=r.chronology.length?`<section class="smv-v311-periods"><h2>${ta?'தசை–புக்தி அடிப்படையிலான முக்கிய காலங்கள்':'Major and sub-period life themes'}</h2>${r.chronology.map(y=>editorButton(g.SMVPredictionRules?.anchor?.('period',y)||'')+uniqueParagraph(y.text)).join('')}</section>`:'';
resetProse();
const pdBlock=r.pdChronology?.length?`<section class="smv-v311-pd" data-smv-pd-provenance="calculated-from-complete-ad"><h2>${ta?'பிரத்யந்தர தசை — கணிக்கப்பட்ட உட்காலப் பலன்கள்':'Computed pratyantara sub-periods'}</h2>${r.pdChronology.map(y=>{const e=editorButton(g.SMVPredictionRules?.anchor?.('pd',y)||'');const t=freshProse(y.text);return t?e+`<p class="smv-d1-life-paragraph" data-pd="${encode(y.pd)}">${encode(t)}</p>`:'';}).join('')}</section>`:'';
resetProse();
const annual=r.annual.length?`<section class="smv-v311-years"><h2>${ta?'அடுத்த 15 ஆண்டுகளில் ஒருங்கிணைந்த ஆதாரம் கிடைத்த காலங்கள்':'Evidence-backed windows in the next 15 years'}</h2>${r.annual.map(y=>{const e=editorButton(g.SMVPredictionRules?.anchor?.('annual',y)||'');const t=freshProse(y.text);return t?e+`<p class="smv-d1-life-paragraph" data-year="${y.year}">${encode(t)}</p>`:'';}).join('')}</section>`:'';
const bookTransitBlock=r.bookTransits?.matched?.length?'<section class="smv-book-transits"><h2>'+(ta?'சந்திர ராசியிலிருந்து கோச்சார நிலை':'Transits relative to the natal Moon')+'</h2>'+r.bookTransits.matched.map(x=>uniqueParagraph(x.text[ta?'ta':'en'])+sourceDetails(x.sourceRefs,ta)).join('')+'</section>':'';
const missing=(r.v311?.uncoveredWindows||[]);const noEvidence=missing.length?`<p class="smv-v311-no-event-filler">${ta?'போதுமான தசை–கோச்சார ஒத்த ஆதாரம் இல்லாத காலங்கள்: ':'Windows without independent dasha–transit corroboration: '}${missing.map(x=>encode(x.from)+' – '+encode(x.to)).join(', ')}. ${ta?'இந்த இடைவெளிகளுக்காகக் கற்பனையான ஆண்டு நிகழ்வுகள் எழுதப்படவில்லை.':'No distinct annual event has been invented for these intervals.'}</p>`:'';
return `<section class="smv-d1-life-reading smv-v303-integrated smv-v307-events smv-v311-judgement" data-smv-d1-life="1" data-smv-integrated="12" data-smv-15-year-ready="${r.timeline?.complete?'1':'0'}" lang="${encode(r.lang)}"><h2>${ta?'முழு வாழ்க்கைப் பலன்கள்':'Complete Life Predictions'}</h2><p class="smv-v303-intro">${ta?'குணநலன்கள், குடும்பம், கல்வி, வேலை, பணம் மற்றும் காலத்திற்கேற்ப மாறும் பொறுப்புகள் ஜாதகத் தொடர்புகளுடன் விளக்கப்படுகின்றன.':'The report first reconciles supportive and challenging natal factors, then combines available divisional, period and computed transit readings. Sample dates are not guaranteed event dates.'}</p>${r.overview?.length?`<section class="smv-v311-overview"><h2>${ta?'ஜாதகத்தின் மைய வாழ்க்கைப் போக்கு':'Integrated life reading'}</h2>${editorButton('overview')}${r.overview.map(uniqueParagraph).join('')}</section>`:''}${lines}${chron}${pdBlock}${annual}${bookTransitBlock}${noEvidence}</section>`;}
return Object.freeze({build,html,version:'312-book-sourced-personalization',previous:old});
});
