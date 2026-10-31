import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectMessageText } from '../../../shared/backend-platform/chat-moderation.mjs';

test('Live Chat blocks English profanity and simple punctuation/spacing evasions',()=>{
  for(const value of ['fuck you','f.u.c.k','b i t c h','you are a bastard']) {
    assert.equal(inspectMessageText(value).reason,'abusive_language',value);
  }
});

test('Live Chat blocks the legacy Tamil and Tanglish abuse lists',()=>{
  for(const value of ['தேவடியா','புண்டை','thevidiya','p.u.n.d.a.i','ommala']) {
    assert.equal(inspectMessageText(value).reason,'abusive_language',value);
  }
});

test('Live Chat blocks Hindi/Hinglish abuse while preserving ordinary whole words',()=>{
  for(const value of ['मादरचोद','चूतिया','madarchod','bhosdike']) {
    assert.equal(inspectMessageText(value).reason,'abusive_language',value);
  }
  for(const value of ['assistant','classic','class is open','hello from Madurai','வணக்கம்']) {
    assert.equal(inspectMessageText(value).allowed,true,value);
  }
});

test('empty Live Chat message is rejected explicitly',()=>{
  assert.equal(inspectMessageText('   ').reason,'empty');
});
