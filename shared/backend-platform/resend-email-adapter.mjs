export function createResendEmailClient({apiKey='',from='',fetchImpl=globalThis.fetch}={}){
  const secret=String(apiKey||'').trim();
  const sender=String(from||'').trim();
  if(typeof fetchImpl!=='function')throw new TypeError('Resend email client requires fetch.');
  if(!secret||!sender)throw new TypeError('Resend API key and sender address are required.');
  async function send({to,subject,text,html,replyTo,idempotencyKey}={}){
    const recipients=(Array.isArray(to)?to:[to]).map(value=>String(value||'').trim()).filter(Boolean);
    if(!recipients.length||recipients.length>50)throw Object.assign(new Error('Email recipient list is invalid.'),{code:'EMAIL_RECIPIENTS_INVALID',httpStatus:400});
    if(!String(subject||'').trim()||(!String(text||'').trim()&&!String(html||'').trim()))throw Object.assign(new Error('Email subject and content are required.'),{code:'EMAIL_CONTENT_INVALID',httpStatus:400});
    const headers={'Authorization':'Bearer '+secret,'Content-Type':'application/json','Accept':'application/json'};
    const key=String(idempotencyKey||'').trim();
    if(key){
      if(key.length>256)throw Object.assign(new Error('Email idempotency key is too long.'),{code:'EMAIL_IDEMPOTENCY_KEY_INVALID',httpStatus:400});
      headers['Idempotency-Key']=key;
    }
    let response;
    try{
      response=await fetchImpl('https://api.resend.com/emails',{
        method:'POST',headers,
        body:JSON.stringify({
          from:sender,to:recipients,subject:String(subject),
          ...(text?{text:String(text)}:{}),
          ...(html?{html:String(html)}:{}),
          ...(replyTo?{reply_to:String(replyTo)}:{})
        })
      });
    }catch{
      throw Object.assign(new Error('Email provider is unavailable.'),{code:'EMAIL_PROVIDER_UNAVAILABLE',httpStatus:502});
    }
    const result=await response.json().catch(()=>({}));
    if(!response.ok||!result?.id){
      const status=response.status===401||response.status===403?503:502;
      throw Object.assign(new Error('Email provider rejected the send request.'),{
        code:'EMAIL_PROVIDER_REJECTED',httpStatus:status,providerStatus:Number(response.status)||0
      });
    }
    return Object.freeze({id:String(result.id)});
  }
  return Object.freeze({send});
}
