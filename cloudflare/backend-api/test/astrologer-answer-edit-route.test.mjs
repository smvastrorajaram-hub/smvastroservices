import test from 'node:test';
import assert from 'node:assert/strict';
import { registerAstrologerAnswerEditRoute } from '../src/astrologer-answer-edit-route.mjs';

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
function request(body) { return { body, get(name) { return String(name).toLowerCase()==='authorization'?'Bearer astro':''; } }; }
function fixture({docs={}}={}) {
  const writes=[];
  return {
    writes,
    async runTransaction(callback) {
      const tx={
        async getDocument(path){return docs[path]||{exists:false,data:null};},
        update(path,data){writes.push({type:'update',path,data});},
        create(path,data){writes.push({type:'create',path,data});}
      };
      return callback(tx);
    }
  };
}

test('Astrologer can reopen own eligible submitted answer and audit is atomic',async()=>{
 const app=harness(),firestore=fixture({docs:{
   'smv_questions/q1':{exists:true,data:{astrologerId:'astro-1',status:'answer_draft',answer:'An existing answer'}},
   'smv_settings/workflow':{exists:true,data:{allowWithoutAdminApproval:false}}
 }});
 registerAstrologerAnswerEditRoute({
   app,firestore,randomId:()=> 'audit-id',
   identityService:{async authenticateAuthorization(){return {uid:'astro-1'};}}
 });
 const res=response();
 await app.handlers.get('POST /astrologer/edit-answer')(request({questionId:'q1'}),res);
 assert.equal(res.statusCode,200);
 assert.deepEqual(res.body,{success:true,questionId:'q1',status:'admin_approved',astrologerEditMode:true});
 assert.equal(firestore.writes[0].type,'update');
 assert.equal(firestore.writes[0].data.astrologerAnswerStatus,'draft');
 assert.equal(firestore.writes[1].path,'smv_admin_audit/audit-id');
});

test('Astrologer cannot reopen another Astrologer question',async()=>{
 const app=harness(),firestore=fixture({docs:{
   'smv_questions/q1':{exists:true,data:{astrologerId:'other-astro',status:'answer_draft',answer:'Answer'}}
 }});
 registerAstrologerAnswerEditRoute({app,firestore,identityService:{async authenticateAuthorization(){return {uid:'astro-1'};}}});
 const res=response();
 await app.handlers.get('POST /astrologer/edit-answer')(request({questionId:'q1'}),res);
 assert.equal(res.statusCode,403);
 assert.equal(firestore.writes.length,0);
});

test('Final answer cannot be reopened after Customer viewed or commission credited',async()=>{
 for(const patch of [
   {customerAnswerViewedAt:{seconds:10}},
   {commissionStatus:'credited'}
 ]){
   const app=harness(),firestore=fixture({docs:{
     'smv_questions/q1':{exists:true,data:{
       astrologerId:'astro-1',status:'answered',adminApprovalBypassed:true,answer:'Final answer',...patch
     }},
     'smv_settings/workflow':{exists:true,data:{allowWithoutAdminApproval:true}}
   }});
   registerAstrologerAnswerEditRoute({app,firestore,identityService:{async authenticateAuthorization(){return {uid:'astro-1'};}}});
   const res=response();
   await app.handlers.get('POST /astrologer/edit-answer')(request({questionId:'q1'}),res);
   assert.equal(res.statusCode,409);
   assert.equal(firestore.writes.length,0);
 }
});

test('Open-workflow bypass can reopen only an unseen, uncredited answer',async()=>{
 const app=harness(),firestore=fixture({docs:{
   'smv_questions/q1':{exists:true,data:{astrologerId:'astro-1',status:'answered',adminApprovalBypassed:true,answer:'Draft answer'}},
   'smv_settings/workflow':{exists:true,data:{allowWithoutAdminApproval:true}}
 }});
 registerAstrologerAnswerEditRoute({app,firestore,identityService:{async authenticateAuthorization(){return {uid:'astro-1'};}}});
 const res=response();
 await app.handlers.get('POST /astrologer/edit-answer')(request({questionId:'q1'}),res);
 assert.equal(res.statusCode,200);
});
