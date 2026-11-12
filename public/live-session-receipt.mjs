const loading=document.getElementById('liveReceiptLoading');
const sessionId=String(new URLSearchParams(location.search).get('session')||'').trim();
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
  if(!/^\s*<html[\s>]/i.test(receipt)){
    showError('The receipt data is no longer available in this app tab.');
  }else{
    history.replaceState(null,'',location.pathname);
    document.open();
    document.write(receipt);
    document.close();
  }
}
