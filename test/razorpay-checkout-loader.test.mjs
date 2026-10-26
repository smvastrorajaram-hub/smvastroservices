import test from 'node:test';
import assert from 'node:assert/strict';
import { ensureRazorpayCheckout } from '../public/razorpay-checkout-loader.mjs';
function fakeWindow() {
 const scripts=[];
 const document={
  scripts,head:{appendChild(s){if(!scripts.includes(s))scripts.push(s);s.isConnected=true;}},
  createElement(tag){assert.equal(tag,'script');return{src:'',async:false,dataset:{},isConnected:false,listeners:new Map(),
   addEventListener(type,fn,opts={}){const list=this.listeners.get(type)||[];list.push({fn,once:opts.once===true});this.listeners.set(type,list);},
   removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)||[]).filter(x=>x.fn!==fn));},
   dispatch(type){for(const x of [...(this.listeners.get(type)||[])]){x.fn();if(x.once)this.removeEventListener(type,x.fn);}},
   remove(){this.isConnected=false;const i=scripts.indexOf(this);if(i>=0)scripts.splice(i,1);}};},
  querySelector(sel){if(sel==='script[data-smv-razorpay-checkout-loader]')return scripts.find(s=>s.dataset.smvRazorpayCheckoutLoader==='1')||null;
   if(sel.includes('script[src="')){const u=sel.slice('script[src="'.length,-2);return scripts.find(s=>s.src===u)||null;}return null;}
 };
 return{document,Razorpay:undefined};
}
test('returns immediately if Razorpay is already initialized',async()=>{const w=fakeWindow();w.Razorpay=function(){};assert.equal(await ensureRazorpayCheckout(w),w);assert.equal(w.document.scripts.length,0);});
test('deduplicates concurrent loads and resolves only after constructor availability',async()=>{const w=fakeWindow();const a=ensureRazorpayCheckout(w,{timeoutMs:100}),b=ensureRazorpayCheckout(w,{timeoutMs:100});assert.equal(a,b);assert.equal(w.document.scripts.length,1);const s=w.document.scripts[0];w.Razorpay=function(){};s.dispatch('load');assert.equal(await a,w);assert.equal(s.dataset.smvRazorpayCheckoutState,'loaded');});
test('cleans up script error and permits retry',async()=>{const w=fakeWindow(),a=ensureRazorpayCheckout(w,{timeoutMs:100});w.document.scripts[0].dispatch('error');await assert.rejects(a,/could not load/i);assert.equal(w.document.scripts.length,0);const b=ensureRazorpayCheckout(w,{timeoutMs:100}),s=w.document.scripts[0];w.Razorpay=function(){};s.dispatch('load');assert.equal(await b,w);});
test('cleans up timeout so a subsequent tap can retry',async()=>{const w=fakeWindow(),a=ensureRazorpayCheckout(w,{timeoutMs:20});await assert.rejects(a,/did not respond within 1 seconds/i);assert.equal(w.document.scripts.length,0);const b=ensureRazorpayCheckout(w,{timeoutMs:100}),s=w.document.scripts[0];w.Razorpay=function(){};s.dispatch('load');assert.equal(await b,w);});
