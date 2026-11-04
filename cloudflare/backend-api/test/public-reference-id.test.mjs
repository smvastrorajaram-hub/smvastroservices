import test from 'node:test';
import assert from 'node:assert/strict';
import { createNumericReference, createUniqueNumericReference } from '../../../shared/backend-platform/public-reference-id.mjs';

function sequenceCrypto(values) {
  let index = 0;
  return {
    getRandomValues(buffer) {
      buffer[0] = values[Math.min(index, values.length - 1)] ?? 0;
      index += 1;
      return buffer;
    }
  };
}

test('numeric public references use the requested lowercase prefix and exactly six digits', () => {
  const reference = createNumericReference('smvwt', sequenceCrypto([0]));
  assert.equal(reference, 'smvwt-100000');
  assert.match(createNumericReference('smvpt', sequenceCrypto([899999])), /^smvpt-\d{6}$/);
  assert.throws(() => createNumericReference('SMV-PAY'), /lowercase reference prefix/);
});

test('numeric public references retry collisions before returning an unused ID', async () => {
  const reference = await createUniqueNumericReference({
    prefix: 'smvpy',
    cryptoImpl: sequenceCrypto([0, 1]),
    exists: async candidate => candidate === 'smvpy-100000'
  });
  assert.equal(reference, 'smvpy-100001');
});

test('numeric public reference allocation fails closed without a secure random source', async () => {
  await assert.rejects(
    () => createUniqueNumericReference({ prefix: 'smvpt', exists: async () => false, cryptoImpl: {} }),
    /Web Crypto secure random values are required/
  );
});
