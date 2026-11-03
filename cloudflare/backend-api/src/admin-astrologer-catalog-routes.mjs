import { FirestoreFieldValue } from '../../../shared/backend-platform/firestore-admin-rest.mjs';

function sendError(res, error, fallback) {
  const status = Number(error?.httpStatus) || 500;
  return res.status(status).set('Cache-Control', 'no-store').json({
    success: false,
    error: status >= 500 ? fallback : String(error?.message || fallback),
    code: String(error?.code || 'ADMIN_ASTROLOGER_SETTINGS_FAILED')
  });
}
function uidOf(value, fallback='') { return String(value || fallback).trim(); }
function cleanLanguages(input) {
  const raw = Array.isArray(input) ? input : String(input || '').split(/[,;|]/);
  return [...new Set(raw.map(value => String(value || '').trim().replace(/\s+/g, ' ')).filter(Boolean))];
}
function centsValid(value) {
  return Number.isFinite(value) && Math.abs(value * 100 - Math.round(value * 100)) <= 1e-7;
}

export function registerAdminAstrologerCatalogRoutes({ app, firestore, identityService } = {}) {
  if (!app || typeof app.post !== 'function' ||
      !firestore || typeof firestore.runTransaction !== 'function' ||
      !identityService || typeof identityService.authenticateAuthorization !== 'function') {
    throw new TypeError('Astrologer catalog routes require Firestore transactions and Admin identity.');
  }

  async function requireAdmin(req) {
    const actor = await identityService.authenticateAuthorization(req.get('Authorization'));
    if (actor.isAdmin !== true && String(actor.role || '').toLowerCase() !== 'admin') {
      throw Object.assign(new Error('Admin access denied.'), { code: 'ADMIN_REQUIRED', httpStatus: 403 });
    }
    return actor;
  }

  app.post('/admin/astrologer-languages', async (req, res) => {
    try {
      const actor = await requireAdmin(req);
      const astrologerId = String(req.body?.astrologerId || '').trim();
      const languages = cleanLanguages(req.body?.languages);
      if (!astrologerId || astrologerId.length > 200 || astrologerId.includes('/')) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          success: false, error: 'A valid Astrologer profile ID is required.'
        });
      }
      if (!languages.length || languages.length > 12 ||
          languages.some(value => value.length > 40) || languages.join(', ').length > 240) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          success: false, error: 'Enter 1–12 spoken languages, each up to 40 characters.'
        });
      }

      const result = await firestore.runTransaction(async tx => {
        const selectedPath = 'smv_astrologers/' + astrologerId;
        const selectedSnapshot = await tx.getDocument(selectedPath);
        if (!selectedSnapshot.exists) {
          throw Object.assign(new Error('Astrologer profile not found.'), {
            code: 'ASTROLOGER_PROFILE_NOT_FOUND', httpStatus: 404
          });
        }
        const selected = selectedSnapshot.data || {};
        const uid = uidOf(selected.uid, selectedSnapshot.id);
        if (!uid || uid.length > 128 || uid.includes('/')) {
          throw Object.assign(new Error('This Astrologer profile has no valid linked login UID.'), {
            code: 'ASTROLOGER_PROFILE_UID_INVALID', httpStatus: 409
          });
        }
        const linked = await tx.query({
          collectionPath: 'smv_astrologers',
          filters: [{ field: 'uid', op: '==', value: uid }],
          limit: 25
        });
        const paths = new Set([selectedPath, 'smv_astrologers/' + uid]);
        for (const document of linked) {
          const recordUid = uidOf(document.data?.uid);
          if (!recordUid || recordUid === uid) paths.add('smv_astrologers/' + document.id);
        }
        const patch = {
          languages,
          spokenLanguages: languages,
          updatedAt: FirestoreFieldValue.serverTimestamp()
        };
        for (const path of paths) tx.set(path, patch, { merge: true });
        tx.set('smv_users/' + uid, patch, { merge: true });
        return { uid };
      });

      return res.set('Cache-Control', 'no-store').json({
        success: true, astrologerId, uid: result.uid, languages
      });
    } catch (error) {
      return sendError(res, error, 'Unable to save Astrologer languages. No partial changes were committed.');
    }
  });

  app.post('/admin/astrologer-pricing', async (req, res) => {
    try {
      const actor = await requireAdmin(req);
      const astrologerId = String(req.body?.astrologerId || '').trim();
      const body = req.body || {};
      const hasChat = Object.prototype.hasOwnProperty.call(body, 'pricePerQuestion');
      const hasCall = Object.prototype.hasOwnProperty.call(body, 'callPricePerMinute');
      const hasLiveChat = Object.prototype.hasOwnProperty.call(body, 'chatPricePerMinute');
      const chatPrice = Number(body.pricePerQuestion);
      const callPrice = Number(body.callPricePerMinute);
      const liveChatPrice = Number(body.chatPricePerMinute);

      if (!astrologerId || astrologerId.length > 200 || astrologerId.includes('/')) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          success: false, error: 'A valid Astrologer profile ID is required.'
        });
      }
      if (!hasChat && !hasCall && !hasLiveChat) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          success: false, error: 'Enter a Live Call or Live Chat per-minute price before saving.'
        });
      }
      if (hasChat && (!Number.isFinite(chatPrice) || chatPrice < 1 || chatPrice > 100000 || !centsValid(chatPrice))) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          success: false, error: 'Chat Price must be between ₹1 and ₹100000, with up to two decimal places.'
        });
      }
      if (hasCall && (!Number.isFinite(callPrice) || callPrice < 0 ||
          (callPrice !== 0 && callPrice < 1) || callPrice > 10000 || !centsValid(callPrice))) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          success: false, error: 'Live Call Price must be ₹0 (unset) or between ₹1 and ₹10000 per minute, with up to two decimal places.'
        });
      }
      if (hasLiveChat && (!Number.isFinite(liveChatPrice) || liveChatPrice < 0 ||
          (liveChatPrice !== 0 && liveChatPrice < 1) || liveChatPrice > 10000 || !centsValid(liveChatPrice))) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          success: false, error: 'Live Chat Price must be ₹0 (unset) or between ₹1 and ₹10000 per minute, with up to two decimal places.'
        });
      }

      const result = await firestore.runTransaction(async tx => {
        const selectedPath = 'smv_astrologers/' + astrologerId;
        const selectedSnapshot = await tx.getDocument(selectedPath);
        if (!selectedSnapshot.exists) {
          throw Object.assign(new Error('Astrologer profile not found. Refresh the profile list and try again.'), {
            code: 'ASTROLOGER_PROFILE_NOT_FOUND', httpStatus: 404
          });
        }
        const selected = selectedSnapshot.data || {};
        const uid = uidOf(selected.uid, selectedSnapshot.id);
        if (!uid || uid.length > 128 || uid.includes('/')) {
          throw Object.assign(new Error('This Astrologer profile has no valid linked login UID.'), {
            code: 'ASTROLOGER_PROFILE_UID_INVALID', httpStatus: 409
          });
        }
        if (!['approved', 'active'].includes(String(selected.status || '').toLowerCase())) {
          throw Object.assign(new Error('Prices can only be changed for an approved Astrologer.'), {
            code: 'ASTROLOGER_APPROVAL_REQUIRED', httpStatus: 409
          });
        }

        const byUid = await tx.query({
          collectionPath: 'smv_astrologers',
          filters: [{ field: 'uid', op: '==', value: uid }],
          limit: 100
        });
        const paths = new Set([selectedPath]);
        const canonicalPath = 'smv_astrologers/' + uid;
        if (uid !== selectedSnapshot.id) {
          const canonicalSnapshot = await tx.getDocument(canonicalPath);
          if (canonicalSnapshot.exists) paths.add(canonicalPath);
        } else {
          paths.add(canonicalPath);
        }
        for (const document of byUid) {
          const recordUid = uidOf(document.data?.uid);
          if (!recordUid || recordUid === uid) paths.add('smv_astrologers/' + document.id);
        }
        if (selected.publicId) {
          const byPublicId = await tx.query({
            collectionPath: 'smv_astrologers',
            filters: [{ field: 'publicId', op: '==', value: String(selected.publicId) }],
            limit: 100
          });
          for (const document of byPublicId) {
            const recordUid = uidOf(document.data?.uid);
            if ((!recordUid || recordUid === uid) &&
                String(document.data?.publicId || '') === String(selected.publicId)) {
              paths.add('smv_astrologers/' + document.id);
            }
          }
        }

        const patch = { updatedAt: FirestoreFieldValue.serverTimestamp() };
        if (hasChat) {
          patch.pricePerQuestion = Math.round(chatPrice * 100) / 100;
          patch.chatPriceUpdatedAt = FirestoreFieldValue.serverTimestamp();
          patch.chatPriceUpdatedBy = String(actor.uid || '');
        }
        if (hasCall) {
          if (callPrice === 0) {
            patch.callPricePerMinute = FirestoreFieldValue.delete();
            patch.pricePerMinute = FirestoreFieldValue.delete();
            patch.callRatePerMinute = FirestoreFieldValue.delete();
          } else {
            patch.callPricePerMinute = Math.round(callPrice * 100) / 100;
          }
          patch.callPriceUpdatedAt = FirestoreFieldValue.serverTimestamp();
          patch.callPriceUpdatedBy = String(actor.uid || '');
        }
        if (hasLiveChat) {
          if (liveChatPrice === 0) {
            patch.chatPricePerMinute = FirestoreFieldValue.delete();
            patch.liveChatPricePerMinute = FirestoreFieldValue.delete();
            patch.chatRatePerMinute = FirestoreFieldValue.delete();
          } else {
            patch.chatPricePerMinute = Math.round(liveChatPrice * 100) / 100;
          }
          patch.liveChatPriceUpdatedAt = FirestoreFieldValue.serverTimestamp();
          patch.liveChatPriceUpdatedBy = String(actor.uid || '');
        }
        for (const path of paths) tx.set(path, patch, { merge: true });
        return {
          uid,
          updatedProfiles: paths.size,
          selected
        };
      });

      return res.set('Cache-Control', 'no-store').json({
        success: true,
        astrologerId,
        uid: result.uid,
        updatedProfiles: result.updatedProfiles,
        pricePerQuestion: hasChat ? Math.round(chatPrice * 100) / 100 : Number(result.selected.pricePerQuestion || 0),
        callPricePerMinute: hasCall ? (callPrice === 0 ? null : Math.round(callPrice * 100) / 100) :
          (result.selected.callPricePerMinute ?? null),
        chatPricePerMinute: hasLiveChat ? (liveChatPrice === 0 ? null : Math.round(liveChatPrice * 100) / 100) :
          (result.selected.chatPricePerMinute ?? null)
      });
    } catch (error) {
      return sendError(res, error, 'Unable to save Astrologer pricing. The related profiles were not partially updated.');
    }
  });

  return Object.freeze({ paths: Object.freeze(['/admin/astrologer-languages', '/admin/astrologer-pricing']) });
}
