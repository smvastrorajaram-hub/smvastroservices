const loading=document.getElementById('liveReceiptLoading');
const sessionId=String(new URLSearchParams(location.search).get('session')||'').trim();
const RECEIPT_TTL_MS=5*60*1000;
const isReceiptHtml=value=>typeof value==='string'&&/^\s*<html[\s>]/i.test(value);
const showError=message=>{
  if(loading)loading.innerHTML='<h1>SMV ASTRO Receipt</h1><p>'+message+'</p><p>Return to the Dashboard and open the ended Live Session again.</p>';
};
if(!/^[A-Za-z0-9_-]{1,180}$/.test(sessionId)){
  showError('The Live Session receipt link is invalid or incomplete.');
}else{
  const key='smv_live_receipt_'+sessionId;
  let receipt='';
  try{
    receipt=sessionStorage.getItem(key)||'';
    sessionStorage.removeItem(key);
  }catch(error){
    receipt='';
  }
  // A separate WebView/tab may not inherit sessionStorage. Use only this
  // receipt-scoped, time-limited fallback; never clear origin-wide storage.
  if(!isReceiptHtml(receipt)){
    try{
      const raw=localStorage.getItem(key)||'';
      localStorage.removeItem(key);
      const saved=JSON.parse(raw);
      const age=Date.now()-Number(saved?.createdAtMs);
      if(Number.isFinite(age)&&age>=0&&age<=RECEIPT_TTL_MS&&isReceiptHtml(saved?.html)){
        receipt=saved.html;
      }
    }catch(error){
      receipt='';
    }
  }else{
    try{localStorage.removeItem(key);}catch(error){}
  }
  if(!isReceiptHtml(receipt)){
    showError('The receipt data is unavailable or has expired. Return to the Dashboard and open the ended Live Session again.');
  }else{
    history.replaceState(null,'',location.pathname);
    document.open();
    document.write(receipt);
    document.close();
  }
}
