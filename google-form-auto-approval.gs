/*
SMV ASTRO — 25 Question Astrologer Qualification Google Form
1) Open script.google.com -> New project.
2) Set BACKEND_WEBHOOK_URL to your deployed backend URL + /webhooks/google-form/astrologer-qualification
3) Copy Webhook Secret from Admin Dashboard into WEBHOOK_SECRET.
4) Run createSmvAstrologerQualificationForm() once and authorize.
5) Copy the printed Published Form URL into Admin Dashboard.
The function creates the quiz and an installable on-submit trigger automatically.
*/
const BACKEND_WEBHOOK_URL = 'https://smv-astro-1fco.onrender.com/webhooks/google-form/astrologer-qualification';
const WEBHOOK_SECRET = 'ebe04d3714367b0907b363ce0ebe4472110029e331bd42a3e9d7b7be0a36aa6a';

const FORM_ID_PROPERTY = 'SMV_ASTRO_QUIZ_FORM_ID';

function createSmvAstrologerQualificationForm(){
  return syncSmvAstrologerQualificationForm();
}
function syncSmvAstrologerQualificationForm(){
  const cfg=smvFetchQuizConfig_(),questions=cfg.questions||[];
  if(!questions.length)throw new Error('No enabled qualification questions found in Admin Question Manager.');
  if(Number(cfg.passMark)>questions.length)throw new Error('Pass Mark cannot be greater than the number of enabled questions.');
  const props=PropertiesService.getScriptProperties();let form,id=props.getProperty(FORM_ID_PROPERTY);
  try{form=id?FormApp.openById(id):null;}catch(_){form=null;}
  if(!form){form=FormApp.create('SMV ASTRO — Astrologer Qualification Test');props.setProperty(FORM_ID_PROPERTY,form.getId());}
  form.setTitle('SMV ASTRO — Astrologer Qualification Test');
  form.setDescription('Vedic Astrology / Jyotisha qualification test. Enter the same email used for your SMV ASTRO astrologer registration.');
  form.setIsQuiz(true);form.setShuffleQuestions(true);
  form.getItems().forEach(item=>form.deleteItem(item));
  form.addTextItem().setTitle('Registered Email').setRequired(true);
  questions.forEach((q,n)=>{
    const title=(n+1)+'. '+q.questionTa+' / '+q.questionEn;
    const item=form.addMultipleChoiceItem().setTitle(title).setRequired(true).setPoints(1);
    const opts=[0,1,2,3].map(i=>(q.choicesTa[i]+' / '+q.choicesEn[i]));
    item.setChoices(opts.map((x,i)=>item.createChoice(x,i===Number(q.correctIndex))));
  });
  ScriptApp.getProjectTriggers().filter(t=>t.getHandlerFunction()==='onSmvQualificationSubmit').forEach(t=>ScriptApp.deleteTrigger(t));
  ScriptApp.newTrigger('onSmvQualificationSubmit').forForm(form).onFormSubmit().create();
  Logger.log('EDIT URL: '+form.getEditUrl());
  Logger.log('PUBLISHED FORM URL: '+form.getPublishedUrl());
  Logger.log('ENABLED QUESTIONS: '+questions.length+' | PASS MARK: '+cfg.passMark);
  return form.getPublishedUrl();
}
function onSmvQualificationSubmit(e){
  const response=e.response, items=response.getGradableItemResponses();
  let score=0; items.forEach(r=>{const s=r.getScore();if(typeof s==='number')score+=s;});
  const all=response.getItemResponses();
  const email=String(all[0].getResponse()||'').trim().toLowerCase();
  // Production: total only the actual gradable quiz item points.
  // Registered Email is a non-gradable text item, so it is excluded automatically.
  const maxScore=items.reduce((total,itemResponse)=>{
    const item=itemResponse.getItem();
    if(item.getType()!==FormApp.ItemType.MULTIPLE_CHOICE)return total;
    return total+item.asMultipleChoiceItem().getPoints();
  },0);
  const payload={email:email,score:score,maxScore:maxScore,responseId:response.getId(),submittedAt:new Date().toISOString()};
  const r=UrlFetchApp.fetch(BACKEND_WEBHOOK_URL,{method:'post',contentType:'application/json',headers:{'x-smv-quiz-secret':WEBHOOK_SECRET},payload:JSON.stringify(payload),muteHttpExceptions:true});
  console.log(r.getResponseCode(),r.getContentText());
}

function doPost(e){
  try{
    const body=JSON.parse((e&&e.postData&&e.postData.contents)||'{}');
    if(String(body.secret||'')!==String(WEBHOOK_SECRET||''))return smvJson_({success:false,error:'Invalid sync secret.'});
    if(body.action!=='sync_google_form')return smvJson_({success:false,error:'Unknown action.'});
    const formUrl=syncSmvAstrologerQualificationForm();
    const cfg=smvFetchQuizConfig_();
    return smvJson_({success:true,formUrl:formUrl,enabledQuestions:(cfg.questions||[]).length,passMark:Number(cfg.passMark||0)});
  }catch(err){return smvJson_({success:false,error:String(err&&err.message||err)});}
}
function smvJson_(obj){
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
function smvFetchQuizConfig_(){
  const configUrl=BACKEND_WEBHOOK_URL.replace('/webhooks/google-form/astrologer-qualification','/google-form/astrologer-quiz-config');
  const rr=UrlFetchApp.fetch(configUrl,{headers:{'x-smv-quiz-secret':WEBHOOK_SECRET},muteHttpExceptions:true});
  if(rr.getResponseCode()!==200)throw new Error('Question Bank fetch failed: '+rr.getContentText());
  return JSON.parse(rr.getContentText());
}
