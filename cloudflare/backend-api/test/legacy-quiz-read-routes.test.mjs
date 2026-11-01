import test from 'node:test';
import assert from 'node:assert/strict';
import { registerLegacyQuizReadRoutes } from '../src/legacy-quiz-read-routes.mjs';

function harness() {
  const handlers = new Map();
  return { handlers, get(path, handler) { handlers.set('GET ' + path, handler); } };
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
function request({token='Bearer valid-token',secret=''}={}) {
  return { query: secret ? {secret} : {}, get(name) {
    const key=String(name).toLowerCase();
    if(key==='authorization')return token;
    if(key==='x-smv-quiz-secret')return '';
    return '';
  }};
}
function fixture({docs={},queries={}}={}) {
  const calls=[];
  return {
    calls,
    async getDocument(path){calls.push({type:'get',path});return docs[path]||{exists:false,data:null};},
    async runQuery(options){calls.push({type:'query',options});return queries[options.collectionPath]||[];}
  };
}

test('Google Form quiz config requires secret and never returns the stored secret', async()=>{
 const app=harness(), firestore=fixture({
   docs:{'smv_settings/astrologerAutoApproval':{exists:true,data:{webhookSecret:'long-private-secret',passMark:17}}}
 },queries:{smv_astrologer_quiz_questions:[
   {id:'q2',data:{enabled:true,order:2}},{id:'q1',data:{enabled:true,order:1}}
 ]});
 registerLegacyQuizReadRoutes({app,firestore,identityService:{async authenticateAuthorization(){throw new Error('not used');}}});
 const denied=response();
 await app.handlers.get('GET /google-form/astrologer-quiz-config')(request(),denied);
 assert.equal(denied.statusCode,401);
 const allowed=response();
 await app.handlers.get('GET /google-form/astrologer-quiz-config')(request({secret:'long-private-secret'}),allowed);
 assert.equal(allowed.statusCode,200);
 assert.equal(allowed.body.passMark,17);
 assert.deepEqual(allowed.body.questions.map(q=>q.id),['q1','q2']);
 assert.equal(JSON.stringify(allowed.body).includes('long-private-secret'),false);
});

test('Astrologer qualification config is scoped to its own profile and omits webhook secret', async()=>{
 const app=harness(), firestore=fixture({docs:{
   'smv_users/astro-1':{exists:true,data:{role:'astrologer',status:'active'}},
   'smv_settings/astrologerAutoApproval':{exists:true,data:{enabled:true,formUrl:'https://docs.google.com/forms/d/e/test/viewform',passMark:18,webhookSecret:'never-return'}},
   'smv_astrologers/astro-1':{exists:true,data:{status:'approved',quizStatus:'passed',quizScore:20,quizMaxScore:25}}
 }});
 registerLegacyQuizReadRoutes({app,firestore,identityService:{async authenticateAuthorization(){return {uid:'astro-1',role:'astrologer'};}}});
 const res=response();
 await app.handlers.get('GET /astrologer/qualification-config')(request(),res);
 assert.equal(res.statusCode,200);
 assert.equal(res.body.status,'approved');
 assert.equal(res.body.quizScore,20);
 assert.equal(JSON.stringify(res.body).includes('never-return'),false);
});

test('qualification config rejects non-Astrologer account', async()=>{
 const app=harness(), firestore=fixture({docs:{'smv_users/customer-1':{exists:true,data:{role:'customer'}}}});
 registerLegacyQuizReadRoutes({app,firestore,identityService:{async authenticateAuthorization(){return {uid:'customer-1',role:'customer'};}}});
 const res=response();
 await app.handlers.get('GET /astrologer/qualification-config')(request(),res);
 assert.equal(res.statusCode,403);
});

test('Admin quiz questions and question dashboard require verified Admin', async()=>{
 const app=harness(), firestore=fixture();
 registerLegacyQuizReadRoutes({app,firestore,identityService:{async authenticateAuthorization(){return {uid:'customer-1',role:'customer'};}}});
 for(const path of ['/admin/astrologer-quiz/questions','/admin/questions-data']){
   const res=response();
   await app.handlers.get('GET '+path)(request(),res);
   assert.equal(res.statusCode,403);
 }
 assert.equal(firestore.calls.length,0);
});

test('Admin question dashboard returns exact question, approved astrologer and settings sections', async()=>{
 const app=harness(), firestore=fixture({
   docs:{
     'smv_settings/commission':{exists:true,data:{astroPercent:25}},
     'smv_settings/workflow':{exists:true,data:{allowWithoutAdminApproval:true}}
   },
   queries:{
     smv_questions:[{id:'q1',data:{createdAt:new Date('2026-01-01')}}],
     smv_astrologers:[{id:'astro-1',data:{status:'approved'}}]
   }
 });
 registerLegacyQuizReadRoutes({app,firestore,identityService:{async authenticateAuthorization(){return {uid:'admin-1',role:'admin',isAdmin:true};}}});
 const res=response();
 await app.handlers.get('GET /admin/questions-data')(request(),res);
 assert.equal(res.statusCode,200);
 assert.equal(res.body.questions[0].id,'q1');
 assert.equal(res.body.astrologers[0].id,'astro-1');
 assert.deepEqual(res.body.settings,{commission:{astroPercent:25},workflow:{allowWithoutAdminApproval:true}});
});
