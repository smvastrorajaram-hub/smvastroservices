/* Pages.dev-only origin isolation.
 * The .in Auth and Verify hosts are intentional external account-action services.
 * This module never rewrites auth.smvastroservices.in or verify.smvastroservices.in,
 * and exits immediately on every non-Pages.dev hostname.
 */
(function pagesDevHostIsolation(){
  'use strict';

  const hostname=String(window.location.hostname||'').toLowerCase();
  if(hostname!=='smvastroservices.pages.dev'&&!hostname.endsWith('.smvastroservices.pages.dev'))return;

  const origin=window.location.origin;
  const ROOT_HOSTS=new Set(['smvastroservices.in','www.smvastroservices.in']);
  const HOROSCOPE_HOST='horoscope.smvastroservices.in';
  const CALENDAR_HOST='calendar.smvastroservices.in';

  function pagesPath(url){
    const path=url.pathname||'/';
    const suffix=path==='/'?'':path;
    if(ROOT_HOSTS.has(url.hostname.toLowerCase()))return path;
    if(url.hostname.toLowerCase()===HOROSCOPE_HOST)return '/horoscope'+(suffix||'/');
    if(url.hostname.toLowerCase()===CALENDAR_HOST){
      if(path==='/')return '/horoscope/calendar/';
      if(path.startsWith('/assets/'))return '/horoscope'+path;
      if(path==='/index.html'||path==='/admin.html'||path==='/calendar-pwa.mjs'||path==='/rasi-palan-periods.mjs'){
        return '/horoscope/calendar'+path;
      }
      return '/horoscope'+path;
    }
    return null;
  }

  function rewriteUrl(value){
    const raw=String(value||'').trim();
    if(!raw)return value;
    let parsed;
    try{parsed=new URL(raw,window.location.href);}catch(_){return value;}
    if(parsed.protocol!=='https:'&&parsed.protocol!=='http:')return value;
    const mapped=pagesPath(parsed);
    if(mapped===null)return value;
    return origin+mapped+parsed.search+parsed.hash;
  }

  function rewriteSrcset(value){
    return String(value||'').split(',').map(candidate=>{
      const part=candidate.trim();
      if(!part)return part;
      const match=part.match(/^(\S+)(\s+.*)?$/);
      if(!match)return part;
      return rewriteUrl(match[1])+(match[2]||'');
    }).join(', ');
  }

  function rewriteStructuredData(script){
    if(script.dataset.smvPagesHostRewritten==='1')return;
    try{
      const data=JSON.parse(script.textContent||'null');
      let changed=false;
      const visit=value=>{
        if(Array.isArray(value))return value.map(visit);
        if(value&&typeof value==='object'){
          for(const key of Object.keys(value))value[key]=visit(value[key]);
          return value;
        }
        if(typeof value==='string'){
          const next=rewriteUrl(value);
          if(next!==value)changed=true;
          return next;
        }
        return value;
      };
      const next=visit(data);
      if(changed)script.textContent=JSON.stringify(next);
    }catch(_){}
    script.dataset.smvPagesHostRewritten='1';
  }

  const URL_ATTRIBUTES=['href','src','poster','action','data'];
  function rewriteElement(element){
    if(!element||element.nodeType!==1)return;
    if(element.matches?.('script[type="application/ld+json"]'))rewriteStructuredData(element);
    for(const attribute of URL_ATTRIBUTES){
      if(!element.hasAttribute(attribute))continue;
      const before=element.getAttribute(attribute);
      const after=rewriteUrl(before);
      if(after!==before){
        element.setAttribute(attribute,after);
        if(element.tagName==='A'){
          element.removeAttribute('target');
          element.rel='noopener';
        }
      }
    }
    if(element.hasAttribute('srcset')){
      const before=element.getAttribute('srcset');
      const after=rewriteSrcset(before);
      if(after!==before)element.setAttribute('srcset',after);
    }
    if(element.tagName==='META'&&element.hasAttribute('content')){
      const before=element.getAttribute('content');
      const after=rewriteUrl(before);
      if(after!==before)element.setAttribute('content',after);
    }
    if(element.childElementCount===0&&element.textContent){
      const before=element.textContent.trim();
      if(before==='www.smvastroservices.in')element.textContent='www.smvastroservices.pages.dev';
    }
  }

  function process(root){
    if(!root)return;
    if(root.nodeType===1)rewriteElement(root);
    root.querySelectorAll?.('*').forEach(rewriteElement);
  }

  process(document.documentElement);
  if(typeof MutationObserver==='function'&&document.documentElement){
    const observer=new MutationObserver(records=>{
      for(const record of records){
        if(record.type==='attributes')rewriteElement(record.target);
        for(const node of record.addedNodes||[])process(node);
      }
    });
    observer.observe(document.documentElement,{
      subtree:true,
      childList:true,
      attributes:true,
      attributeFilter:['href','src','poster','action','data','srcset','content']
    });
  }
})();
