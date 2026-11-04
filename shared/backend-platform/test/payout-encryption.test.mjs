import test from 'node:test';
import assert from 'node:assert/strict';
import { webcrypto } from 'node:crypto';
import { encryptPayoutSnapshot, decryptPayoutSnapshot, validatePayoutEncryptionConfiguration } from '../payout-encryption.mjs';

const KEY=Buffer.from('01234567890123456789012345678901').toString('base64');

test('AES-256-GCM payout snapshots round-trip without placing bank fields in plaintext columns',async()=>{
  const payload={
    withdrawalDocId:'withdrawal-1',withdrawalId:'SMV-WD-withdrawal-1',
    bankName:'State Bank',accountName:'Astrologer',accountNumber:'123456789',
    ifsc:'SBIN0001234',upi:'astro@upi'
  };
  const encrypted=await encryptPayoutSnapshot({
    payload,withdrawalId:'withdrawal-1',payoutEncryptionKey:KEY,
    payoutKeyVersion:'v1',sourceProjectId:'smv-astro',
    nowMs:1793786400000,cryptoImpl:webcrypto
  });
  assert.equal(encrypted.algorithm,'AES-256-GCM');
  assert.equal(encrypted.keyVersion,'v1');
  assert.equal(encrypted.nonceHex.length,24);
  assert.equal(encrypted.authTagHex.length,32);
  assert.ok(!JSON.stringify(encrypted).includes(payload.accountNumber));
  assert.ok(!JSON.stringify(encrypted).includes(payload.bankName));
  assert.equal(validatePayoutEncryptionConfiguration({payoutEncryptionKey:KEY,payoutKeyVersion:'v1'}),true);
  assert.equal(validatePayoutEncryptionConfiguration({payoutEncryptionKey:'invalid',payoutKeyVersion:'v1'}),false);
  const restored=await decryptPayoutSnapshot({
    record:{
      withdrawal_id:encrypted.withdrawalId,algorithm:encrypted.algorithm,
      key_version:encrypted.keyVersion,nonce_hex:encrypted.nonceHex,
      ciphertext_hex:encrypted.ciphertextHex,auth_tag_hex:encrypted.authTagHex,
      source_payload_sha256:encrypted.sourcePayloadSha256
    },
    payoutEncryptionKey:KEY,sourceProjectId:'smv-astro',cryptoImpl:webcrypto
  });
  assert.deepEqual(restored,payload);
});

test('payout ciphertext cannot be decrypted under a different Firebase source project or key version context',async()=>{
  const encrypted=await encryptPayoutSnapshot({
    payload:{accountNumber:'123456789'},withdrawalId:'withdrawal-2',
    payoutEncryptionKey:KEY,payoutKeyVersion:'v1',sourceProjectId:'smv-astro',
    cryptoImpl:webcrypto
  });
  const record={
    withdrawal_id:encrypted.withdrawalId,algorithm:encrypted.algorithm,
    key_version:encrypted.keyVersion,nonce_hex:encrypted.nonceHex,
    ciphertext_hex:encrypted.ciphertextHex,auth_tag_hex:encrypted.authTagHex
  };
  await assert.rejects(()=>decryptPayoutSnapshot({
    record,payoutEncryptionKey:KEY,sourceProjectId:'smv-astro-staging',cryptoImpl:webcrypto
  }));
  await assert.rejects(()=>decryptPayoutSnapshot({
    record,payoutEncryptionKey:Buffer.alloc(32,7).toString('base64'),
    sourceProjectId:'smv-astro',cryptoImpl:webcrypto
  }));
});

test('invalid payout keys and key versions fail closed',async()=>{
  await assert.rejects(()=>encryptPayoutSnapshot({
    payload:{accountNumber:'123'},withdrawalId:'withdrawal-3',
    payoutEncryptionKey:'not-a-32-byte-key',payoutKeyVersion:'v1',
    sourceProjectId:'smv-astro',cryptoImpl:webcrypto
  }));
  await assert.rejects(()=>encryptPayoutSnapshot({
    payload:{accountNumber:'123'},withdrawalId:'withdrawal-3',
    payoutEncryptionKey:KEY,payoutKeyVersion:'contains spaces',
    sourceProjectId:'smv-astro',cryptoImpl:webcrypto
  }));
});
