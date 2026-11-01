import test from 'node:test';
import assert from 'node:assert/strict';
import { registerLegacyQuizWriteRoutes, SMV_DEFAULT_ASTRO_QUIZ_25 } from '../src/legacy-quiz-write-routes.mjs';

function harness() {
  const handlers = new Map();
  return { handlers, post(path, handler) { handlers.set('POST ' + path, handler); } };
}
function response() {
  return {
    statusCode: 200, headers: {}, body: null,
    status(code) { this.statusCode = code; return this; },
    set(name, value) {
      if (typeof name === 'object') Object.assign(this.headers, name);
      else this.headers[name] = value;
      return this;
    },
    json(body) { this.body = body; return this; }
  };
}
function request(body={},headers={}) {
  return { body, get(name) {
    const key=String(name).toLowerCase();
    return key==='authorization' ? 'Bearer admin' : String(headers[key]||'');
  } };
}
function fixture({docs={},queries=[],queryByCollection={}}={}) {
  const writes=[],sets=[],deletes=[];
  return {
    writes,sets,deletes,
    async getDocument(path){return docs[path]||{exists:false,data:null};},
    async runQuery(options={}){return queryByCollection[options.collectionPath]||queries;},
    async setDocument(path,data,options){sets.push({path,data,options});},
    async deleteDocument(path){deletes.push(path);},
    async runTransaction(callback) {
      const tx={
        async getDocument(path){return docs[path]||{exists:false,data:null};},
        set(path,data,options){writes.push({type:'set',path,data,options});},
        create(path,data){writes.push({type:'create',path,data});}
      };
      return callback(tx);
    }
  };
}
const identityService={async authenticateAuthorization(){return {uid:'admin-1',role:'admin',isAdmin:true};}};
const validQuestion={
 questionTa:'லக்னம் என்றால் என்ன?',questionEn:'What is Lagna?',
 choicesTa:['A','B','C','D'],choicesEn:['A','B','C','D'],correctIndex:1,enabled:true,order:1
};

test('Admin quiz question save validates bilingual question and persists only the safe schema',async()=>{
 const app=harness(),firestore=fixture();
 registerLegacyQuizWriteRoutes({app,firestore,identityService});
 const res=response();
 await app.handlers.get('POST /admin/astrologer-quiz/questions')(request({...validQuestion,id:'question-1'}),res);
 assert.equal(res.statusCode,200);
 assert.equal(res.body.id,'question-1');
 assert.equal(firestore.sets[0].data.correctIndex,1);
 assert.equal(firestore.sets[0].data.updatedBy,'admin-1');
 assert.equal('webhookSecret' in firestore.sets[0].data,false);
});

test('Invalid quiz question or non-admin is rejected without persistence',async()=>{
 const app=harness(),firestore=fixture();
 registerLegacyQuizWriteRoutes({app,firestore,identityService});
 const invalid=response();
 await app.handlers.get('POST /admin/astrologer-quiz/questions')(request({...validQuestion,choicesEn:['one']}),invalid);
 assert.equal(invalid.statusCode,400);
 assert.equal(firestore.sets.length,0);

 const deniedApp=harness();
 registerLegacyQuizWriteRoutes({app:deniedApp,firestore,identityService:{async authenticateAuthorization(){return {uid:'customer',role:'customer'};}}});
 const denied=response();
 await deniedApp.handlers.get('POST /admin/astrologer-quiz/questions')(request(validQuestion),denied);
 assert.equal(denied.statusCode,403);
 assert.equal(firestore.sets.length,0);
});

test('Admin quiz question delete sanitizes ID and does not delete for empty ID',async()=>{
 const app=harness(),firestore=fixture();
 registerLegacyQuizWriteRoutes({app,firestore,identityService});
 const missing=response();
 await app.handlers.get('POST /admin/astrologer-quiz/questions/delete')(request({id:'!!!'}),missing);
 assert.equal(missing.statusCode,400);
 const deleted=response();
 await app.handlers.get('POST /admin/astrologer-quiz/questions/delete')(request({id:'question-1'}),deleted);
 assert.deepEqual(deleted.body,{success:true});
 assert.deepEqual(firestore.deletes,['smv_astrologer_quiz_questions/question-1']);
});

test('Quiz defaults protect non-empty manual bank and fill only missing default IDs',async()=>{
 assert.equal(SMV_DEFAULT_ASTRO_QUIZ_25.length,25);
 const app=harness(),firestore=fixture({queries:[{id:'manual',data:{questionEn:'Manual'}}],docs:{
   'smv_astrologer_quiz_questions/default_01':{exists:true,data:{isDefault:true}}
 }});
 registerLegacyQuizWriteRoutes({app,firestore,identityService});
 const protectedResult=response();
 await app.handlers.get('POST /admin/astrologer-quiz/load-defaults')(request({}),protectedResult);
 assert.equal(protectedResult.statusCode,409);
 assert.equal(firestore.writes.length,0);

 const fill=response();
 await app.handlers.get('POST /admin/astrologer-quiz/load-defaults')(request({fillMissing:true}),fill);
 assert.equal(fill.statusCode,200, JSON.stringify(fill.body));
 assert.equal(fill.body.total,25);
 assert.equal(fill.body.created,24);
 assert.equal(firestore.writes.filter(x=>x.type==='create').length,24);
});

test('Auto Approval settings validates form URL and preserves existing webhook secret',async()=>{
 const app=harness(),firestore=fixture({docs:{
   'smv_settings/astrologerAutoApproval':{exists:true,data:{webhookSecret:'existing-secret'}}
 }});
 registerLegacyQuizWriteRoutes({app,firestore,identityService});
 const invalid=response();
 await app.handlers.get('POST /admin/astrologer-auto-approval/settings')(request({enabled:true,formUrl:'http://invalid',passMark:20}),invalid);
 assert.equal(invalid.statusCode,400);
 assert.equal(firestore.writes.length,0);

 const valid=response();
 await app.handlers.get('POST /admin/astrologer-auto-approval/settings')(request({
   enabled:true,formUrl:'https://docs.google.com/forms/d/e/example/viewform',
   syncWebAppUrl:'https://script.google.com/macros/s/deployment/exec',passMark:18
 }),valid);
 assert.equal(valid.statusCode,200);
 assert.equal(valid.body.webhookSecret,'existing-secret');
 assert.equal(firestore.writes[0].data.webhookSecret,'existing-secret');
});


test('Google Form sync is Admin-only, calls only the configured Apps Script endpoint and never returns the secret',async()=>{
 const app=harness(),firestore=fixture({docs:{
  'smv_settings/astrologerAutoApproval':{exists:true,data:{
   syncWebAppUrl:'https://script.google.com/macros/s/deployment/exec',
   webhookSecret:'server-only-secret',
   formUrl:'https://docs.google.com/forms/d/e/example/viewform',
   passMark:18
  }}
 }});
 const calls=[];
 registerLegacyQuizWriteRoutes({app,firestore,identityService,fetchImpl:async(url,options)=>{
  calls.push({url,options});
  return {ok:true,status:200,text:async()=>JSON.stringify({
   success:true,formUrl:'https://docs.google.com/forms/d/e/example/viewform',
   enabledQuestions:25,passMark:18
  })};
 }});
 const res=response();
 await app.handlers.get('POST /admin/astrologer-quiz/sync-google-form')(request({}),res);
 assert.equal(res.statusCode,200);
 assert.equal(calls.length,1);
 assert.equal(calls[0].url,'https://script.google.com/macros/s/deployment/exec');
 assert.equal(calls[0].options.method,'POST');
 assert.deepEqual(JSON.parse(calls[0].options.body),{action:'sync_google_form',secret:'server-only-secret'});
 assert.equal(res.body.enabledQuestions,25);
 assert.equal(res.body.passMark,18);
 assert.equal(JSON.stringify(res.body).includes('server-only-secret'),false);
});

test('Google Form sync rejects an untrusted Apps Script URL without network access',async()=>{
 const app=harness(),firestore=fixture({docs:{
  'smv_settings/astrologerAutoApproval':{exists:true,data:{
   syncWebAppUrl:'https://attacker.example/collect',webhookSecret:'secret'
  }}
 }});
 let calls=0;
 registerLegacyQuizWriteRoutes({app,firestore,identityService,fetchImpl:async()=>{calls++;throw new Error('must not call');}});
 const res=response();
 await app.handlers.get('POST /admin/astrologer-quiz/sync-google-form')(request({}),res);
 assert.equal(res.statusCode,400);
 assert.equal(calls,0);
});

test('Google Form sync sanitizes provider failure and reports a bounded gateway error',async()=>{
 const app=harness(),firestore=fixture({docs:{
  'smv_settings/astrologerAutoApproval':{exists:true,data:{
   syncWebAppUrl:'https://script.google.com/macros/s/deployment/exec',webhookSecret:'secret'
  }}
 }});
 registerLegacyQuizWriteRoutes({app,firestore,identityService,fetchImpl:async()=>({
  ok:false,status:502,text:async()=>'provider unavailable'
 })});
 const res=response();
 await app.handlers.get('POST /admin/astrologer-quiz/sync-google-form')(request({}),res);
 assert.equal(res.statusCode,502);
 assert.match(res.body.error,/provider unavailable/);
});

test('Google Form webhook checks shared secret and refuses a stale quiz version before writing',async()=>{
 const app=harness(),firestore=fixture({
  docs:{'smv_settings/astrologerAutoApproval':{exists:true,data:{webhookSecret:'expected-secret',enabled:true,passMark:20}}},
  queryByCollection:{smv_astrologer_quiz_questions:Array.from({length:25},(_,i)=>({id:'q'+i,data:{enabled:true}}))}
 });
 registerLegacyQuizWriteRoutes({app,firestore,identityService});
 const denied=response();
 await app.handlers.get('POST /webhooks/google-form/astrologer-qualification')(
  request({email:'astro@example.com',score:22,maxScore:25,responseId:'r-1'},{'x-smv-quiz-secret':'wrong-secret'}),denied);
 assert.equal(denied.statusCode,401);
 const stale=response();
 await app.handlers.get('POST /webhooks/google-form/astrologer-qualification')(
  request({email:'astro@example.com',score:22,maxScore:24,responseId:'r-1'},{'x-smv-quiz-secret':'expected-secret'}),stale);
 assert.equal(stale.statusCode,400);
 assert.ok(stale.body.diagnostic.issues.includes('max_score_mismatch'));
 assert.equal(firestore.writes.length,0);
});

test('Google Form webhook atomically records a unique result, approves only an eligible Astrologer and adds one notification',async()=>{
 const app=harness(),firestore=fixture({
  docs:{
   'smv_settings/astrologerAutoApproval':{exists:true,data:{webhookSecret:'expected-secret',enabled:true,passMark:20}},
   'smv_users/astro-1':{exists:true,data:{uid:'astro-1',role:'astrologer',email:'astro@example.com',status:'pending'}},
   'smv_astrologers/astro-1':{exists:true,data:{uid:'astro-1',status:'pending'}}
  },
  queryByCollection:{
   smv_astrologer_quiz_questions:Array.from({length:25},(_,i)=>({id:'q'+i,data:{enabled:true}})),
   smv_users:[{id:'astro-1',data:{uid:'astro-1',role:'astrologer',email:'astro@example.com'}}]
  }
 });
 registerLegacyQuizWriteRoutes({app,firestore,identityService});
 const res=response();
 await app.handlers.get('POST /webhooks/google-form/astrologer-qualification')(
  request({email:'ASTRO@example.com',score:23,maxScore:25,responseId:'google/form/response-123'},{'x-smv-quiz-secret':'expected-secret'}),res);
 assert.equal(res.statusCode,200,JSON.stringify(res.body));
 assert.deepEqual(res.body,{success:true,passed:true,autoApproved:true,score:23,maxScore:25,passMark:20});
 const resultWrite=firestore.writes.find(x=>x.type==='create'&&x.path==='smv_astrologer_quiz_results/google_form_response-123');
 assert.ok(resultWrite);
 assert.equal(resultWrite.data.email,'astro@example.com');
 assert.equal(resultWrite.data.autoApproved,true);
 const profileWrite=firestore.writes.find(x=>x.type==='set'&&x.path==='smv_astrologers/astro-1');
 assert.equal(profileWrite.data.status,'approved');
 const userWrite=firestore.writes.find(x=>x.type==='set'&&x.path==='smv_users/astro-1');
 assert.equal(userWrite.data.status,'active');
 assert.equal(firestore.writes.filter(x=>x.path.startsWith('smv_notifications/')).length,1);
});

test('Google Form webhook handles duplicate delivery without writing a second result or notification',async()=>{
 const app=harness(),firestore=fixture({
  docs:{
   'smv_settings/astrologerAutoApproval':{exists:true,data:{webhookSecret:'expected-secret',enabled:true,passMark:20}},
   'smv_astrologer_quiz_results/response-1':{exists:true,data:{responseId:'response-1'}}
  },
  queryByCollection:{
   smv_astrologer_quiz_questions:Array.from({length:25},(_,i)=>({id:'q'+i,data:{enabled:true}})),
   smv_users:[{id:'astro-1',data:{uid:'astro-1',role:'astrologer',email:'astro@example.com'}}]
  }
 });
 registerLegacyQuizWriteRoutes({app,firestore,identityService});
 const res=response();
 await app.handlers.get('POST /webhooks/google-form/astrologer-qualification')(
  request({email:'astro@example.com',score:23,maxScore:25,responseId:'response-1'},{'x-smv-quiz-secret':'expected-secret'}),res);
 assert.equal(res.statusCode,200);
 assert.deepEqual(res.body,{success:true,duplicate:true});
 assert.equal(firestore.writes.length,0);
});
