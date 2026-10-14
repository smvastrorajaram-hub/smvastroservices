(function(root,factory){
  if(typeof module==="object"&&module.exports) module.exports=factory();
  else root.SMVBookTransitsV312=factory();
})(typeof globalThis!=="undefined"?globalThis:this,function(){
  "use strict";
  var refs=[
    {bookId:"textbook",pdfPages:[326,327,328,329,330,331,332],sha256:"1cafa828f34764ed5e85816882df2e8f0bc014c5c57ccdb27169416e117fd4db",verification:"text-reviewed",referenceFrame:"natal-Moon"},
    {bookId:"kudumpa",pdfPages:[67,69],sha256:"5b52aac6cf3b7e8952764d88ad387ffce3a5dc7d6f439bd57d440e5259e3b6ee",verification:"text-reviewed",referenceFrame:"natal-Moon"}
  ];
  var names={Sun:"சூரியன்",Moon:"சந்திரன்",Mars:"செவ்வாய்",Mercury:"புதன்",Jupiter:"குரு",Venus:"சுக்கிரன்",Saturn:"சனி",Rahu:"ராகு",Ketu:"கேது"};
  var aliases={Jupiter:["Jupiter","குரு"],Saturn:["Saturn","சனி"]};
  var favorable={Jupiter:[2,5,7,9,11],Saturn:[3,6,11]};
  function date(s){
    if(typeof s!=="string"||!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
    var y=+s.slice(0,4),m=+s.slice(5,7),d=+s.slice(8,10);
    var days=[31,(y%4===0&&(y%100!==0||y%400===0))?29:28,31,30,31,30,31,31,30,31,30,31];
    return y>0&&m>=1&&m<=12&&d>=1&&d<=days[m-1]?s:null;
  }
  function sign(n){return Number.isInteger(n)&&n>=0&&n<=11;}
  function sourceRefs(){return refs.map(function(r){return Object.assign({},r,{pdfPages:r.pdfPages.slice()});});}
  function position(pos,planet){
    var seen=[],keys=aliases[planet];
    for(var i=0;i<keys.length;i++){
      if(pos&&Object.prototype.hasOwnProperty.call(pos,keys[i])){
        var p=pos[keys[i]];
        if(!p||!sign(p.sign)) return {reason:"invalid-position"};
        seen.push(p.sign);
      }
    }
    if(!seen.length) return {reason:"missing-position"};
    return seen.some(function(s){return s!==seen[0];})?{reason:"conflicting-position"}:{sign:seen[0]};
  }
  function evaluate(d1,timeline,validatedPeriods,context={}){
    var out={matched:[],insufficient:[]};
    function lack(reason,planet,observedOn){
      out.insufficient.push({reason:reason,planet:planet||null,observedOn:observedOn||null,text:{
        ta:"சந்திர ராசி, கோச்சார நிலை, தேதி மற்றும் நடக்கும் தசை–புத்தி தெளிவாக உறுதியாகாததால் நூல் விதிப்படி பலன் கூற இயலவில்லை.",
        en:"The natal Moon, observed transit, dates and active major/sub-period must be unambiguous before this rule can be applied."
      }});
    }
    var moon=d1&&d1.planets&&d1.planets.Moon&&d1.planets.Moon.sign;
    if(!sign(moon)){lack("invalid-natal-moon");return out;}
    var from=date(timeline&&timeline.referenceDate),to=date(timeline&&timeline.end);
    if(!from||!to||from>=to){lack("invalid-forecast-window");return out;}
    if(!Array.isArray(validatedPeriods)||!validatedPeriods.length){lack("missing-periods");return out;}
    var periods=validatedPeriods.filter(function(p){
      return p&&date(p.from)&&date(p.to)&&p.from<p.to&&typeof p.md==="string"&&p.md.trim()&&typeof p.ad==="string"&&p.ad.trim();
    });
    if(periods.length!==validatedPeriods.length){lack("invalid-period");return out;}
    var samples=timeline.transitYears;
    if(!Array.isArray(samples)||!samples.length){lack("missing-transits");return out;}
    var usable=[],evidence=Object.create(null),planets=["Jupiter","Saturn"];
    samples.forEach(function(s){
      var at=date(s&&s.date),a=date(s&&s.from),b=date(s&&s.to);
      if(!at||!a||!b||a>=b){lack("invalid-transit-date",null,s&&s.date);return;}
      if(at<from||at>=to||at<a||at>=b){lack("outside-window",null,at);return;}
      var active=periods.filter(function(p){return at>=p.from&&at<p.to;});
      if(active.length!==1){lack(active.length?"overlapping-periods":"missing-active-period",null,at);return;}
      planets.forEach(function(planet){
        var value=position(s.pos,planet),key=planet+"|"+at;
        var ev=evidence[key]||(evidence[key]={});
        if(value.reason){ev.invalid=true;lack(value.reason,planet,at);return;}
        if(ev.sign!==undefined&&ev.sign!==value.sign) ev.conflict=true;
        else ev.sign=value.sign;
        usable.push({planet:planet,date:at,sign:value.sign,sample:s,period:active[0],key:key});
      });
    });
    var done=Object.create(null);
    usable.forEach(function(c){
      if(done[c.key]) return;
      done[c.key]=true;
      if(evidence[c.key].conflict){lack("conflicting-position",c.planet,c.date);return;}
      if(evidence[c.key].invalid) return;
      var h=(c.sign-moon+12)%12+1,good=favorable[c.planet].indexOf(h)!==-1,p=c.period;
      var period={md:p.md,ad:p.ad};
      if(typeof p.pd==="string"&&p.pd.trim()) period.pd=p.pd;
      var ta=c.date+" அன்று சந்திரனிலிருந்து "+h+"-ஆம் வீட்டில் "+names[c.planet]+" செல்கிறார். "+
        (names[p.md]||p.md)+" மகாதசை–"+(names[p.ad]||p.ad)+" புத்தியில் "+
        (good?"முயற்சிகளை முன்னெடுக்கச் சாதகமான வாய்ப்புகள் அமையலாம்; பலன் முழு ஜாதகத்தையும் நடக்கும் தசை–புத்தியையும் சார்ந்தது.":"இது சாதக வீடுகள் பட்டியலில் இல்லை; இதனால் தீய பலன் உறுதியாகாது. வாய்ப்புகளை முழு ஜாதகத்துடனும் தசை–புத்தியுடனும் சேர்த்துப் பார்க்க வேண்டும்.");
      out.matched.push({planet:c.planet,observedOn:c.date,moonRelativeHouse:h,favorable:good,period:period,
        from:[from,c.sample.from,p.from].sort().pop(),to:[to,c.sample.to,p.to].sort()[0],
        text:{ta:ta,en:c.date+": "+c.planet+" is in house "+h+" from the natal Moon during "+p.md+"–"+p.ad+". "+
          (good?"This favorable placement may support opportunities; outcomes depend on the running periods and full chart.":"This house is not listed as favorable; it alone does not establish an adverse result. Assess opportunities with the running periods and full chart.")},
        sourceRefs:sourceRefs()});
    });
    return out;
  }
  return {evaluate:evaluate};
});
