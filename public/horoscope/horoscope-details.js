
document.addEventListener('DOMContentLoaded', function(){
  /*
   * V25 CRITICAL FIX:
   * The previous Bhava-header MutationObserver changed textContent inside
   * its own observed subtree. That generated another mutation, which called
   * the observer again indefinitely and could freeze the browser/Acode.
   *
   * No observer is needed. The English result is translated after generation,
   * so we safely apply the final labels after the result exists.
   */
  const fixBhavaHeaders=()=>{
    const root=document.getElementById('englishHoroscopeResult');
    if(!root) return;
    const table=root.querySelector('.bhava-table');
    if(table && table.tHead){
      const names=['House','Start','Middle','End','Rasi','Planets'];
      const cells=table.tHead.rows[0]?.cells||[];
      names.forEach((n,i)=>{
        if(cells[i] && cells[i].textContent !== n) cells[i].textContent=n;
      });
    }
    const h=[...root.querySelectorAll('h3')].find(x=>(x.textContent||'').includes('Bhava'));
    if(h && h.textContent !== 'Bhava Table') h.textContent='Bhava Chart';
  };
  window.__smvFixEnglishBhavaHeaders=fixBhavaHeaders;
});


/* English-only presentation fix:
   Rahu/Ketu are always shown as Retrograde in Planetary Positions and
   Sarvatobhadra Chakra, matching the requested traditional presentation.
   No MutationObserver is used, so this cannot create a render loop/freeze. */
(function(){
  const isNodePlanet=(v)=>{
    const q=String(v??'').trim().toLowerCase();
    return q==='rahu'||q==='ketu'||q==='ராகு'||q==='கேது';
  };
  window.__smvForceEnglishRahuRetrograde=function(root){
    if(!root)return;
    root.querySelectorAll('tr').forEach(tr=>{
      const cells=[...tr.children];
      if(!cells.length || !isNodePlanet(cells[0]?.textContent)) return;
      cells.forEach(td=>{
        const q=(td.textContent||'').trim();
        if(/^(Direct|Retrograde|வக்கிரம்|வக்ரம்|நேர்கதி)$/i.test(q)){
          td.textContent='Retrograde';
        }
      });
    });
    root.querySelectorAll('.transit-planet').forEach(card=>{
      const b=card.querySelector('b');
      if(!b || !isNodePlanet(b.textContent))return;
      card.querySelectorAll('span').forEach(sp=>{
        if(/^(Direct|Retrograde|வக்கிரம்|வக்ரம்|நேர்கதி)$/i.test((sp.textContent||'').trim()))
          sp.textContent='Retrograde';
      });
    });
  };
})();


(function(){
  const DEITY={
    Sun:["Shiva","Rama"], Moon:["Parvati / Gauri","Krishna"],
    Mars:["Subramanya / Kartikeya","Narasimha"], Mercury:["Vishnu","Buddha"],
    Jupiter:["Guru / Samba Shiva","Vamana"], Venus:["Lakshmi","Parashurama"],
    Saturn:["Narayana","Kurma"], Rahu:["Durga","Varaha"], Ketu:["Ganesha","Matsya"]
  };
  const SIGNS=["Aries","Taurus","Gemini","Cancer","Leo","Virgo","Libra","Scorpio","Sagittarius","Capricorn","Aquarius","Pisces"];
  const LORD={Aries:"Mars",Taurus:"Venus",Gemini:"Mercury",Cancer:"Moon",Leo:"Sun",Virgo:"Mercury",Libra:"Venus",Scorpio:"Mars",Sagittarius:"Jupiter",Capricorn:"Saturn",Aquarius:"Saturn",Pisces:"Jupiter"};
  const PMAP={சூரியன்:"Sun",சந்திரன்:"Moon",செவ்வாய்:"Mars",புதன்:"Mercury",குரு:"Jupiter",சுக்கிரன்:"Venus",சனி:"Saturn",ராகு:"Rahu",கேது:"Ketu",
              Sun:"Sun",Moon:"Moon",Mars:"Mars",Mercury:"Mercury",Jupiter:"Jupiter",Venus:"Venus",Saturn:"Saturn",Rahu:"Rahu",Ketu:"Ketu"};
  const RMAP={மேஷம்:"Aries",ரிஷபம்:"Taurus",மிதுனம்:"Gemini",கடகம்:"Cancer",சிம்மம்:"Leo",கன்னி:"Virgo",துலாம்:"Libra",விருச்சிகம்:"Scorpio",தனுசு:"Sagittarius",மகரம்:"Capricorn",கும்பம்:"Aquarius",மீனம்:"Pisces"};

  const norm=x=>String(x??"").trim();
  const esc=x=>String(x??"—").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
  const pkey=x=>PMAP[norm(x)]||norm(x);
  const skey=x=>RMAP[norm(x)]||norm(x);
  const sidx=x=>SIGNS.findIndex(s=>s.toLowerCase()===skey(x).toLowerCase());
  const nth=(s,n)=>{const i=sidx(s);return i<0?"":SIGNS[(i+n-1)%12]};

  function longitudeOf(obj){
    const x=Number(obj?.longitude ?? obj?.lon ?? obj?.degreeLongitude);
    if(Number.isFinite(x)) return ((x%360)+360)%360;
    const si=sidx(obj?.rasi ?? obj?.sign);
    const d=Number(obj?.degreeInSign ?? obj?.degree);
    if(si>=0 && Number.isFinite(d)) return si*30+((d%30)+30)%30;
    return NaN;
  }

  // Classical BPHS D20 / Vimsamsa:
  // 20 divisions of 1°30′. Movable signs count from Aries,
  // fixed signs from Sagittarius, dual/common signs from Leo.
  function d20FromLongitude(lon){
    if(!Number.isFinite(lon)) return null;
    lon=((lon%360)+360)%360;
    const natalIndex=Math.floor(lon/30);
    const deg=lon%30;
    const segment=Math.min(19,Math.floor(deg/1.5)); // 0..19
    const movable=[0,3,6,9].includes(natalIndex);
    const fixed=[1,4,7,10].includes(natalIndex);
    const start=movable?0:(fixed?8:4);
    const d20Index=(start+segment)%12;
    return {
      natalSign:SIGNS[natalIndex], segment:segment+1,
      sign:SIGNS[d20Index], signIndex:d20Index,
      degreeInNatalSign:deg
    };
  }

  function d9SignOf(data,planet){
    planet=pkey(planet);
    const ps=Array.isArray(data?.planets)?data.planets:[];
    const p=ps.find(x=>pkey(x?.name)===planet);
    const direct=skey(p?.navamsa?.rasi ?? p?.navamsa?.sign ?? p?.d9?.rasi ?? p?.d9?.sign);
    if(sidx(direct)>=0)return direct;
    const pools=[data?.navamsa?.planets,data?.navamsa,data?.d9?.planets,data?.d9];
    for(const pool of pools){
      if(Array.isArray(pool)){
        const r=pool.find(x=>pkey(x?.planet??x?.name)===planet);
        const sg=skey(r?.rasi??r?.sign);
        if(sidx(sg)>=0)return sg;
      }
    }
    return "";
  }

  function karakaPlanet(data,key){
    const arr=Array.isArray(data?.phase2?.charaKarakas)?data.phase2.charaKarakas:
              Array.isArray(data?.charaKarakas)?data.charaKarakas:[];
    const target=key.toLowerCase().replace(/\s/g,"");
    const r=arr.find(x=>norm(x?.karaka).toLowerCase().replace(/\s/g,"").includes(target));
    return pkey(r?.planet);
  }

  function d20Chart(data){
    const planets=(Array.isArray(data?.planets)?data.planets:[]).map(p=>{
      const planet=pkey(p?.name);
      const d20=d20FromLongitude(longitudeOf(p));
      const score=Number(p?.strength3?.totalVirupa);
      return d20?{planet,d20,score:Number.isFinite(score)?score:null}:null;
    }).filter(Boolean);

    let lagnaObj=data?.lagna||data?.ascendant||data?.asc||data?.rasiLagna;
    let lagnaLon=longitudeOf(lagnaObj);
    if(!Number.isFinite(lagnaLon)){
      const special=Array.isArray(data?.phase1?.specialLagnas?.items)?data.phase1.specialLagnas.items:[];
      const l=special.find(x=>/^(lagna|ascendant)$/i.test(norm(x?.name)));
      lagnaLon=longitudeOf(l);
    }
    const lagna=d20FromLongitude(lagnaLon);
    return {lagna,planets};
  }

  function houseSign(lagnaSign,house){
    const i=sidx(lagnaSign); return i<0?"":SIGNS[(i+house-1)%12];
  }

  function resolveD20House(data,chart,house){
    if(!chart?.lagna)return null;
    const sign=houseSign(chart.lagna.sign,house);
    const occ=chart.planets.filter(x=>x.d20.sign===sign);
    let chosen=null, mode="";
    if(occ.length){
      const withScore=occ.filter(x=>Number.isFinite(x.score));
      if(withScore.length) chosen=[...withScore].sort((a,b)=>b.score-a.score)[0];
      else chosen=occ[0];
      mode=occ.length>1?"occupant-highest-shadbala":"occupant";
    }else{
      chosen={planet:LORD[sign],d20:{sign},score:null};
      mode="sign-lord";
    }
    return {sign,occupants:occ,chosen,mode};
  }

  function deityPair(planet){
    return DEITY[pkey(planet)]||["—","—"];
  }

  function row(type,basis,planet,sign,path,lang){
    const map=deityPair(planet);
    const indicator=[planet,sign].filter(Boolean).join(" / ")||"—";
    return `<tr><td><b>${esc(type)}</b></td><td>${esc(basis)}</td><td>${esc(indicator)}</td><td>${esc(map[0])}</td><td>${esc(map[1])}</td><td>${esc(path)}</td></tr>`;
  }

  function render(part,lang,dataArg){
    if(!part)return;
    const data=dataArg||window.__smvDeitiesData||{};
    const ta=lang==="ta";
    const d20=d20Chart(data);

    const d20Label=x=>ta?({
      Aries:"மேஷம்",Taurus:"ரிஷபம்",Gemini:"மிதுனம்",Cancer:"கடகம்",Leo:"சிம்மம்",Virgo:"கன்னி",
      Libra:"துலாம்",Scorpio:"விருச்சிகம்",Sagittarius:"தனுசு",Capricorn:"மகரம்",Aquarius:"கும்பம்",Pisces:"மீனம்"
    }[x]||x):x;

    const d20Result=(house,typeEn,typeTa,basisEn,basisTa)=>{
      const r=resolveD20House(data,d20,house);
      if(!r){
        return `<tr><td><b>${ta?typeTa:typeEn}</b></td><td>${ta?basisTa:basisEn}</td><td>—</td><td>—</td><td>—</td><td>${ta?"D20 Lagna கணக்கிட தேவையான exact Lagna longitude கிடைக்கவில்லை.":"Exact Lagna longitude required for D20 Lagna was unavailable."}</td></tr>`;
      }
      const pl=r.chosen?.planet||"";
      const pair=deityPair(pl);
      const occ=r.occupants.map(x=>x.planet).join(", ");
      const why=r.mode==="sign-lord"
        ? (ta?`${house}ஆம் D20 வீடு ${d20Label(r.sign)} காலியாக உள்ளது → அதன் அதிபதி ${pl} எடுத்துக்கொள்ளப்பட்டது.`:`D20 house ${house} (${r.sign}) is empty → its sign lord ${pl} is used.`)
        : (r.mode==="occupant-highest-shadbala"
          ? (ta?`${house}ஆம் D20 வீடு ${d20Label(r.sign)}-ல் ${occ}; பல கிரகங்களில் existing Shadbala அதிகமான ${pl} தேர்வு செய்யப்பட்டது.`:`D20 house ${house} (${r.sign}) contains ${occ}; ${pl} is selected by highest available existing Shadbala among the occupants.`)
          : (ta?`${house}ஆம் D20 வீடு ${d20Label(r.sign)}-ல் ${pl} உள்ளது; occupant முன்னுரிமை.`:`D20 house ${house} (${r.sign}) contains ${pl}; occupant takes priority.`));
      return `<tr><td><b>${ta?typeTa:typeEn}</b></td><td>${ta?basisTa:basisEn}</td><td>${esc(pl+" / "+d20Label(r.sign))}</td><td>${esc(pair[0])}</td><td>${esc(pair[1])}</td><td>${esc((ta?`D20 Lagna ${d20Label(d20.lagna.sign)}. `:`D20 Lagna ${d20.lagna.sign}. `)+why)}</td></tr>`;
    };

    const phase2=data?.phase2||{};
    const ka=skey(phase2?.karakamsha||data?.karakamsha||"");
    const ak=karakaPlanet(data,"atmakaraka")||karakaPlanet(data,"ak");
    const amk=karakaPlanet(data,"amatya")||karakaPlanet(data,"amk");
    const bk=karakaPlanet(data,"bhratru")||karakaPlanet(data,"bhratri")||karakaPlanet(data,"bk");

    const ishtaSign=ka?nth(ka,12):"";
    const dharmaSign=ka?nth(ka,9):"";
    const ishtaPlanet=ishtaSign?LORD[ishtaSign]:"";
    const dharmaPlanet=dharmaSign?LORD[dharmaSign]:"";

    const amkD9=d9SignOf(data,amk);
    const palanaSign=amkD9?nth(amkD9,6):"";
    const palanaPlanet=palanaSign?LORD[palanaSign]:"";
    const bkD9=d9SignOf(data,bk);

    const rows=[
      d20Result(2,"Kula Devata","குல தெய்வம்","D20 → 2nd house → strongest graha / lord","D20 → 2ஆம் வீடு → வலுவான கிரகம் / அதிபதி"),
      d20Result(4,"Grama Devata","கிராம தெய்வம்","D20 → 4th house → strongest influence","D20 → 4ஆம் வீடு → வலுவான தாக்கம்"),
      row(ta?"இஷ்ட தெய்வம்":"Ishta Devata",ta?"ஆத்மகாரக → D9 காரகாம்சம் → 12ஆம் வீடு":"Atmakaraka → D9 Karakamsha → 12th house",ishtaPlanet,ishtaSign,ka?(ta?`ஆத்மகாரக ${ak||"—"}; காரகாம்சம் ${d20Label(ka)} → 12ஆம் ராசி ${d20Label(ishtaSign)} → தற்போதைய engine-ல் occupant/aspect data தெளிவாக இல்லாததால் ராசி அதிபதி ${ishtaPlanet} பயன்படுத்தப்பட்டது.`:`Atmakaraka ${ak||"—"}; Karakamsha ${ka} → 12th sign ${ishtaSign} → current engine does not expose a reliable occupant/aspect resolver here, so sign lord ${ishtaPlanet} is used.`):(ta?"காரகாம்ச data கிடைக்கவில்லை.":"Karakamsha data unavailable."),lang),
      row(ta?"தர்ம தெய்வம்":"Dharma Devata",ta?"ஆத்மகாரக → D9 காரகாம்சம் → 9ஆம் வீடு":"Atmakaraka → D9 Karakamsha → 9th house",dharmaPlanet,dharmaSign,ka?(ta?`காரகாம்சம் ${d20Label(ka)} → 9ஆம் ராசி ${d20Label(dharmaSign)} → ராசி அதிபதி ${dharmaPlanet}.`:`Karakamsha ${ka} → 9th sign ${dharmaSign} → sign lord ${dharmaPlanet}.`):(ta?"காரகாம்ச data கிடைக்கவில்லை.":"Karakamsha data unavailable."),lang),
      row(ta?"பாலன தெய்வம்":"Palana Devata",ta?"அமாத்யகாரக → D9 → அதிலிருந்து 6ஆம் வீடு":"Amatyakaraka → D9 → 6th from Amatyakaraka",palanaPlanet,palanaSign,amkD9?(ta?`${amk} D9-ல் ${d20Label(amkD9)} → 6ஆம் ராசி ${d20Label(palanaSign)} → அதிபதி ${palanaPlanet}.`:`${amk} in D9 ${amkD9} → 6th sign ${palanaSign} → lord ${palanaPlanet}.`):(ta?"அமாத்யகாரக D9 placement data கிடைக்கவில்லை.":"Amatyakaraka D9 placement unavailable."),lang),
      `<tr><td><b>${ta?"குரு தெய்வம்":"Guru Devata"}</b></td><td>${ta?"பிராத்ரிகாரக → நவாம்ச ராசி + BK தாக்கங்கள்":"Bhratrikaraka → Navamsa sign + BK influences"}</td><td>${esc([bk,bkD9?d20Label(bkD9):""].filter(Boolean).join(" / ")||"—")}</td><td>${ta?"BK/Navamsa அடிப்படையிலான குரு சுட்டு":"BK/Navamsa-based Guru indication"}</td><td>—</td><td>${bkD9?esc((ta?`${bk} D9-ல் ${d20Label(bkD9)}; Guru Devata-க்கு Primary Deity mapping கட்டாயப்படுத்தப்படவில்லை.`:`${bk} is in ${bkD9} in D9; Primary Deity mapping is intentionally not forced for Guru Devata.`)):esc(ta?"BK Navamsa data கிடைக்கவில்லை.":"BK Navamsa data unavailable.")}</td></tr>`,
      d20Result(5,"Upasana Devata Indication","உபாசனா தெய்வ சுட்டு","D20 → 5th house devotional indication","D20 → 5ஆம் வீடு devotional indication")
    ].join("");

    const h=ta?["தெய்வ வகை","கணக்கீட்டு அடிப்படை","சுட்டும் கிரகம் / ராசி","முதன்மை தெய்வம்","தசாவதார வடிவம்","கணக்கீட்டு பாதை"]:["Deity Type","Calculation Basis","Indicator Planet / Sign","Primary Deity","Dashavatara Form","Calculation Path"];
    const d20Summary=d20.lagna?`<div class="smv-d20-summary"><b>${ta?"D20 / விம்சாம்ச லக்னம்":"D20 / Vimsamsa Lagna"}:</b> ${esc(d20Label(d20.lagna.sign))} <span class="small">(${ta?"1°30′ division; movable→Aries, fixed→Sagittarius, dual→Leo":"1°30′ divisions; movable→Aries, fixed→Sagittarius, dual→Leo"})</span></div>`:"";
    (part.__smvContent||part).innerHTML=`<div class="smv-fixed-text-section smv-deities-v92">${d20Summary}<div class="adv-table-wrap"><table class="smv-ref-table smv-deities-table"><thead><tr>${h.map(x=>`<th>${x}</th>`).join("")}</tr></thead><tbody>${rows}</tbody></table></div></div>`;
  }

  window.__smvRenderDeitiesV91=render;
  window.__smvRenderDeitiesV92=render;
})();


(function(){
  function markDesktopSite(){
    /* Android Chrome's Desktop Site normally removes "Android" from its UA.
       Do not mark ordinary mobile Chrome as desktop. */
    var ua=navigator.userAgent||'';
    var isAndroid=/Android/i.test(ua);
    var uaDataMobile = navigator.userAgentData && typeof navigator.userAgentData.mobile === 'boolean' ? navigator.userAgentData.mobile : null;
    var isDesktopUA = (uaDataMobile === false) || (!isAndroid && /Chrome|CriOS|Firefox|Safari|Edg/i.test(ua));
    if(isDesktopUA){
      document.documentElement.classList.add('smv-desktop-site');
    }
  }
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',markDesktopSite);
  else markDesktopSite();
})();
