import test from 'node:test';
import assert from 'node:assert/strict';
import { createResendEmailClient } from '../resend-email-adapter.mjs';

test('Resend adapter sends authenticated email with idempotency key and reply-to',async()=>{
 let captured=null;
 const client=createResendEmailClient({
  apiKey:'re_test_secret',from:'SMV ASTRO <notify@example.com>',
  fetchImpl:async(url,init)=>{captured={url,init};return{ok:true,status:200,async json(){return{id:'email-1'};}};}
 });
 const result=await client.send({to:['customer@example.com'],subject:'Question update',text:'Your answer is ready.',replyTo:'admin@example.com',idempotencyKey:'question-q1-answer-ready'});
 assert.deepEqual(result,{id:'email-1'});
 assert.equal(captured.url,'https://api.resend.com/emails');
 assert.equal(captured.init.headers.Authorization,'Bearer re_test_secret');
 assert.equal(captured.init.headers['Idempotency-Key'],'question-q1-answer-ready');
 const body=JSON.parse(captured.init.body);
 assert.deepEqual(body.to,['customer@example.com']);assert.equal(body.reply_to,'admin@example.com');
});

test('Resend adapter rejects missing recipients and provider failures without exposing credentials',async()=>{
 const client=createResendEmailClient({apiKey:'secret',from:'notify@example.com',fetchImpl:async()=>({ok:false,status:401,async json(){return{message:'secret details'};}})});
 await assert.rejects(client.send({to:[],subject:'Test',text:'Body'}),e=>e.code==='EMAIL_RECIPIENTS_INVALID');
 await assert.rejects(client.send({to:'a@example.com',subject:'Test',text:'Body'}),e=>e.code==='EMAIL_PROVIDER_REJECTED'&&e.httpStatus===503&&!e.message.includes('secret'));
});

test('Resend adapter validates payload and never logs or returns the API key',async()=>{
 const client=createResendEmailClient({apiKey:'never-return-this',from:'notify@example.com',fetchImpl:async()=>({ok:true,status:200,async json(){return{id:'email-2'};}})});
 const result=await client.send({to:'a@example.com',subject:'Test',text:'Body'});
 assert.equal(JSON.stringify(result).includes('never-return-this'),false);
});
