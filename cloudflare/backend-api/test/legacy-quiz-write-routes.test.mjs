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
function request(body={}) {
  return { body, get(name) { return String(name).toLowerCase()==='authorization' ? 'Bearer admin' : ''; } };
}
function fixture({docs={},queries=[]}={}) {
  const writes=[],sets=[],deletes=[];
  return {
    writes,sets,deletes,
    async getDocument(path){return docs[path]||{exists:false,data:null};},
    async runQuery(){return queries;},
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
