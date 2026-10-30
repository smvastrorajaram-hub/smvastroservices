'use strict';

const crypto = require('node:crypto');
const zlib = require('node:zlib');

const SMV_ANDROID_PACKAGE = 'in.smvastroservices.smvastro';
const SMV_RELEASE_CERT_SHA256 = '7A3BE159218A38083986DEC117C0BD281B3EF42BDA65F2BB7B8C9946B5293401';
const MAX_APK_BYTES = 100 * 1024 * 1024;

function readLength8(buffer, offset) {
  const first = buffer[offset];
  if (first & 0x80) return { length: ((first & 0x7f) << 8) | buffer[offset + 1], next: offset + 2 };
  return { length: first, next: offset + 1 };
}

function readLength16(buffer, offset) {
  const first = buffer.readUInt16LE(offset);
  if (first & 0x8000) return { length: ((first & 0x7fff) << 16) | buffer.readUInt16LE(offset + 2), next: offset + 4 };
  return { length: first, next: offset + 2 };
}

function parseStringPool(buffer, chunkOffset, chunkSize, headerSize) {
  if (chunkSize < 28) throw new Error('APK AndroidManifest.xml contains a malformed string pool.');
  const stringCount = buffer.readUInt32LE(chunkOffset + 8);
  const flags = buffer.readUInt32LE(chunkOffset + 16);
  const stringsStart = buffer.readUInt32LE(chunkOffset + 20);
  if (stringCount > 100000 || headerSize + stringCount * 4 > chunkSize || stringsStart >= chunkSize) {
    throw new Error('APK AndroidManifest.xml contains an invalid string pool.');
  }
  const utf8 = (flags & 0x100) !== 0;
  const cache = new Map();
  return function getString(index) {
    if (index === 0xffffffff || index < 0 || index >= stringCount) return null;
    if (cache.has(index)) return cache.get(index);
    const relative = buffer.readUInt32LE(chunkOffset + headerSize + index * 4);
    let cursor = chunkOffset + stringsStart + relative;
    let value;
    if (utf8) {
      const charLength = readLength8(buffer, cursor); cursor = charLength.next;
      const byteLength = readLength8(buffer, cursor); cursor = byteLength.next;
      if (cursor + byteLength.length > chunkOffset + chunkSize) throw new Error('APK manifest string exceeds its string pool.');
      value = buffer.toString('utf8', cursor, cursor + byteLength.length);
    } else {
      const charLength = readLength16(buffer, cursor); cursor = charLength.next;
      const byteLength = charLength.length * 2;
      if (cursor + byteLength > chunkOffset + chunkSize) throw new Error('APK manifest string exceeds its string pool.');
      value = buffer.toString('utf16le', cursor, cursor + byteLength);
    }
    cache.set(index, value);
    return value;
  };
}

function parseAndroidBinaryManifest(manifest) {
  if (!Buffer.isBuffer(manifest) || manifest.length < 8 || manifest.readUInt16LE(0) !== 0x0003) {
    throw new Error('The APK does not contain a valid Android binary manifest.');
  }
  const totalSize = manifest.readUInt32LE(4);
  if (totalSize > manifest.length || totalSize < 8) throw new Error('The APK Android manifest size is invalid.');
  let offset = manifest.readUInt16LE(2);
  let getString = null;
  while (offset + 8 <= totalSize) {
    const type = manifest.readUInt16LE(offset);
    const headerSize = manifest.readUInt16LE(offset + 2);
    const chunkSize = manifest.readUInt32LE(offset + 4);
    if (headerSize < 8 || chunkSize < headerSize || offset + chunkSize > totalSize) throw new Error('The APK Android manifest contains an invalid chunk.');
    if (type === 0x0001) {
      getString = parseStringPool(manifest, offset, chunkSize, headerSize);
    } else if (type === 0x0102 && getString) {
      const extensionOffset = offset + headerSize;
      if (extensionOffset + 20 > offset + chunkSize) throw new Error('The APK manifest start element is truncated.');
      const elementName = getString(manifest.readUInt32LE(extensionOffset + 4));
      if (elementName === 'manifest') {
        const attributeStart = manifest.readUInt16LE(extensionOffset + 8);
        const attributeSize = manifest.readUInt16LE(extensionOffset + 10);
        const attributeCount = manifest.readUInt16LE(extensionOffset + 12);
        if (attributeSize < 20 || attributeCount > 256) throw new Error('The APK manifest attributes are invalid.');
        const firstAttribute = extensionOffset + attributeStart;
        const attrs = {};
        for (let i = 0; i < attributeCount; i++) {
          const at = firstAttribute + i * attributeSize;
          if (at + 20 > offset + chunkSize) throw new Error('The APK manifest attribute list is truncated.');
          const name = getString(manifest.readUInt32LE(at + 4));
          const rawValue = manifest.readUInt32LE(at + 8);
          const dataType = manifest[at + 15];
          const data = manifest.readUInt32LE(at + 16);
          if (!name) continue;
          if (name === 'package' || name === 'versionName') {
            attrs[name] = getString(rawValue !== 0xffffffff ? rawValue : (dataType === 0x03 ? data : 0xffffffff));
          } else if (name === 'versionCode') {
            attrs[name] = dataType === 0x10 || dataType === 0x11 ? data : Number(getString(rawValue));
          }
        }
        const result = { packageName: attrs.package || '', versionName: attrs.versionName || '', versionCode: Number(attrs.versionCode) };
        if (!result.packageName || !result.versionName || !Number.isSafeInteger(result.versionCode) || result.versionCode < 1) {
          throw new Error('The APK manifest is missing its package or version metadata.');
        }
        return result;
      }
    }
    offset += chunkSize;
  }
  throw new Error('The APK Android manifest does not contain a manifest root element.');
}

function readZipEntry(buffer, expectedName) {
  const min = Math.max(0, buffer.length - 65557);
  let eocd = -1;
  for (let i = buffer.length - 22; i >= min; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('The uploaded APK is not a valid ZIP archive.');
  const entries = buffer.readUInt16LE(eocd + 10);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (entries > 20000 || centralOffset >= eocd) throw new Error('The uploaded APK ZIP directory is invalid.');
  let offset = centralOffset;
  for (let i = 0; i < entries; i++) {
    if (offset + 46 > eocd || buffer.readUInt32LE(offset) !== 0x02014b50) throw new Error('The uploaded APK ZIP directory is malformed.');
    const method = buffer.readUInt16LE(offset + 10);
    const compressedSize = buffer.readUInt32LE(offset + 20);
    const uncompressedSize = buffer.readUInt32LE(offset + 24);
    const nameLength = buffer.readUInt16LE(offset + 28);
    const extraLength = buffer.readUInt16LE(offset + 30);
    const commentLength = buffer.readUInt16LE(offset + 32);
    const localOffset = buffer.readUInt32LE(offset + 42);
    const name = buffer.toString('utf8', offset + 46, offset + 46 + nameLength);
    if (name === expectedName) {
      if (uncompressedSize > 2 * 1024 * 1024 || localOffset + 30 > buffer.length || buffer.readUInt32LE(localOffset) !== 0x04034b50) {
        throw new Error('The APK manifest entry is invalid or too large.');
      }
      const localNameLength = buffer.readUInt16LE(localOffset + 26);
      const localExtraLength = buffer.readUInt16LE(localOffset + 28);
      const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
      const end = dataOffset + compressedSize;
      if (end > buffer.length) throw new Error('The APK manifest data is truncated.');
      const compressed = buffer.subarray(dataOffset, end);
      let result;
      if (method === 0) result = Buffer.from(compressed);
      else if (method === 8) result = zlib.inflateRawSync(compressed, { maxOutputLength: 2 * 1024 * 1024 });
      else throw new Error('The APK manifest uses an unsupported ZIP compression method.');
      if (result.length !== uncompressedSize) throw new Error('The APK manifest size does not match its ZIP metadata.');
      return result;
    }
    offset += 46 + nameLength + extraLength + commentLength;
  }
  return null;
}

function getApkV2CertificateFingerprint(buffer) {
  const min = Math.max(0, buffer.length - 65557);
  let eocd = -1;
  for (let i = buffer.length - 22; i >= min; i--) {
    if (buffer.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('APK signing information is missing.');
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  if (centralOffset < 24 || buffer.toString('ascii', centralOffset - 16, centralOffset) !== 'APK Sig Block 42') {
    throw new Error('The APK is not signed with the required Android APK Signature Scheme v2.');
  }
  const blockSize = Number(buffer.readBigUInt64LE(centralOffset - 24));
  const blockStart = centralOffset - blockSize - 8;
  if (!Number.isSafeInteger(blockSize) || blockStart < 8 || buffer.readBigUInt64LE(blockStart) !== BigInt(blockSize)) {
    throw new Error('The APK signature block is malformed.');
  }
  let offset = blockStart + 8;
  const pairEnd = centralOffset - 24;
  let signerData = null;
  while (offset < pairEnd) {
    if (offset + 12 > pairEnd) throw new Error('The APK signature pair is truncated.');
    const pairLength = Number(buffer.readBigUInt64LE(offset)); offset += 8;
    const id = buffer.readUInt32LE(offset); offset += 4;
    if (!Number.isSafeInteger(pairLength) || pairLength < 4 || offset + pairLength - 4 > pairEnd) throw new Error('The APK signature pair size is invalid.');
    if (id === 0x7109871a) { signerData = buffer.subarray(offset, offset + pairLength - 4); break; }
    offset += pairLength - 4;
  }
  if (!signerData) throw new Error('The APK does not contain a v2 signature block.');
  const readLp = (buf, cursor) => {
    if (cursor + 4 > buf.length) throw new Error('The APK signing certificate data is truncated.');
    const length = buf.readUInt32LE(cursor); const start = cursor + 4; const end = start + length;
    if (end > buf.length) throw new Error('The APK signing certificate length is invalid.');
    return { value: buf.subarray(start, end), next: end };
  };
  const signers = readLp(signerData, 0).value;
  const signer = readLp(signers, 0).value;
  const signedData = readLp(signer, 0).value;
  let cursor = readLp(signedData, 0).next;
  const certificates = readLp(signedData, cursor).value;
  const cert = readLp(certificates, 0).value;
  return crypto.createHash('sha256').update(cert).digest('hex').toUpperCase();
}

function inspectSmvAndroidApk(buffer, options = {}) {
  if (!Buffer.isBuffer(buffer) || buffer.length < 1024 || buffer.length > MAX_APK_BYTES) {
    throw new Error('Upload a valid SMV ASTRO APK between 1 KB and 100 MB.');
  }
  const manifest = readZipEntry(buffer, 'AndroidManifest.xml');
  if (!manifest) throw new Error('The uploaded file does not contain AndroidManifest.xml.');
  const metadata = parseAndroidBinaryManifest(manifest);
  if (metadata.packageName !== SMV_ANDROID_PACKAGE) throw new Error('This APK is not the SMV ASTRO Production app.');
  const match = /^v([1-9][0-9]*)\.([0-9]{1,3})$/.exec(metadata.versionName);
  if (!match) throw new Error('The APK versionName must use the ordered vMAJOR.MINOR format (for example, v1.0).');
  const expectedVersionCode = Number(match[1]) * 1000 + Number(match[2]);
  if (!Number.isSafeInteger(expectedVersionCode) || expectedVersionCode !== metadata.versionCode) {
    throw new Error('The APK versionCode does not match the permanent SMV ASTRO version sequence.');
  }
  const fingerprint = getApkV2CertificateFingerprint(buffer);
  const expectedFingerprint = String(options.expectedCertificateFingerprint || SMV_RELEASE_CERT_SHA256).replace(/[^A-Fa-f0-9]/g, '').toUpperCase();
  if (fingerprint !== expectedFingerprint) throw new Error('The APK signing certificate does not match the permanent SMV ASTRO Release key.');
  return { ...metadata, certificateSha256: fingerprint, size: buffer.length, sha256: crypto.createHash('sha256').update(buffer).digest('hex') };
}

module.exports = {
  SMV_ANDROID_PACKAGE,
  SMV_RELEASE_CERT_SHA256,
  MAX_APK_BYTES,
  parseAndroidBinaryManifest,
  getApkV2CertificateFingerprint,
  inspectSmvAndroidApk
};
