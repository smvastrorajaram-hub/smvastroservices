import { FirestoreFieldValue } from '../../../shared/backend-platform/firestore-admin-rest.mjs';

function sendError(res, error, fallback) {
  const status = Number(error?.httpStatus) || 500;
  return res.status(status).set('Cache-Control', 'no-store').json({
    ok: false,
    error: status >= 500 ? fallback : String(error?.message || fallback),
    code: String(error?.code || 'APPOINTMENT_BOOKING_FAILED')
  });
}

function indiaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  }).formatToParts(date).reduce((result, part) => {
    result[part.type] = part.value;
    return result;
  }, {});
  return parts.day + parts.month + parts.year;
}

function validBirthDate(value, nowMs) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(value + 'T00:00:00Z');
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return false;
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit'
  }).format(new Date(nowMs));
  return value <= today;
}

function validZone(value) {
  if (!value) return true;
  try {
    new Intl.DateTimeFormat('en', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

function parseCoordinates(latitudeRaw, longitudeRaw) {
  if (Boolean(latitudeRaw) !== Boolean(longitudeRaw)) return null;
  if (!latitudeRaw && !longitudeRaw) return { latitude: null, longitude: null };
  const latitude = Number(latitudeRaw);
  const longitude = Number(longitudeRaw);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 ||
      !Number.isFinite(longitude) || longitude < -180 || longitude > 180) return null;
  return { latitude, longitude };
}

function validId(value) {
  const id = String(value || '').trim();
  return id.length > 0 && id.length <= 200 && !id.includes('/') ? id : '';
}

function validPerMinute(value) {
  const rate = Number(value);
  return Number.isFinite(rate) && rate > 0 && rate <= 10000 &&
    Math.abs(rate * 100 - Math.round(rate * 100)) <= 1e-7 ? Math.round(rate * 100) / 100 : null;
}

export function registerAppointmentBookingRoute({
  app,
  firestore,
  identityService,
  now = Date.now,
  randomId = () => globalThis.crypto.randomUUID()
} = {}) {
  if (!app || typeof app.post !== 'function' ||
      !firestore || typeof firestore.runTransaction !== 'function' ||
      !identityService || typeof identityService.authenticateAuthorization !== 'function') {
    throw new TypeError('Appointment booking requires Firestore transactions and Firebase identity.');
  }

  app.post('/appointment-booking', async (req, res) => {
    try {
      const user = await identityService.authenticateAuthorization(req.get('Authorization'));
      const uid = String(user.uid || '').trim();
      const body = req.body || {};
      const name = String(body.name || '').trim();
      const email = String(user.email || body.email || '').trim();
      const mobile = String(body.mobile || '').trim();
      const type = String(body.type || '').trim();
      const preferredDate = String(body.preferredDate || '').trim();
      const preferredTime = String(body.preferredTime || '').trim();
      const notes = String(body.notes || '').trim();
      const question = String(body.question || '').trim();
      const astrologerId = validId(body.astrologerId);
      const hasAstrologerId = Boolean(String(body.astrologerId || '').trim());
      const scheduledMinutes = Number(body.scheduledMinutes || 5);
      const birthDate = String(body.birthDate || '').trim();
      const birthTime = String(body.birthTime || '').trim();
      const birthPlace = String(body.birthPlace || '').trim();
      const birthLatitudeRaw = String(body.birthLatitude || '').trim();
      const birthLongitudeRaw = String(body.birthLongitude || '').trim();
      const birthTimezone = String(body.birthTimezone || '').trim();
      const currentTime = now();

      if (!uid) {
        return res.status(401).set('Cache-Control', 'no-store').json({ error: 'Sign-in is required.' });
      }
      if (!name || (!hasAstrologerId && (!email || !mobile)) ||
          !type || !preferredDate || !preferredTime) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          error: 'Please fill all required appointment fields.'
        });
      }
      if (hasAstrologerId && !astrologerId) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          error: 'A valid Astrologer ID is required.'
        });
      }
      if (!['Chat Consultation', 'Call Consultation'].includes(type)) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          error: 'Please choose Chat or Call consultation.'
        });
      }
      if (name.length > 100 || email.length > 160 || (!hasAstrologerId && mobile.length > 20) ||
          notes.length > 2000 || question.length > 4000) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          error: 'One or more fields are too long.'
        });
      }
      if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).set('Cache-Control', 'no-store').json({ error: 'Please enter a valid email address.' });
      }

      const dateParts = preferredDate.split('-').map(Number);
      const timeParts = preferredTime.split(':').map(Number);
      const validDateShape = /^\d{4}-\d{2}-\d{2}$/.test(preferredDate) &&
        dateParts.length === 3 &&
        (() => {
          const date = new Date(Date.UTC(dateParts[0], dateParts[1] - 1, dateParts[2]));
          return date.getUTCFullYear() === dateParts[0] &&
            date.getUTCMonth() === dateParts[1] - 1 && date.getUTCDate() === dateParts[2];
        })();
      const validTimeShape = /^(?:[01]\d|2[0-3]):[0-5]\d$/.test(preferredTime) && timeParts.length === 2;
      const scheduleEpoch = Date.parse(preferredDate + 'T' + preferredTime + ':00+05:30');
      if (!validDateShape || !validTimeShape || !Number.isFinite(scheduleEpoch) || scheduleEpoch <= currentTime) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          error: 'Choose a valid future scheduled date and time.'
        });
      }

      const hasCustomerBooking = Boolean(astrologerId);
      let callBooking = {};
      if (hasCustomerBooking) {
        if (!Number.isSafeInteger(scheduledMinutes) || scheduledMinutes < 1 || scheduledMinutes > 1440) {
          return res.status(400).set('Cache-Control', 'no-store').json({
            error: 'Choose a session duration from 1 to 1440 minutes.'
          });
        }
        if (!validBirthDate(birthDate, currentTime)) {
          return res.status(400).set('Cache-Control', 'no-store').json({
            error: 'Enter a valid Date of Birth that is not in the future.'
          });
        }
        if (!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) {
          return res.status(400).set('Cache-Control', 'no-store').json({ error: 'Enter a valid Time of Birth.' });
        }
        if (!birthPlace || birthPlace.length > 200) {
          return res.status(400).set('Cache-Control', 'no-store').json({
            error: 'Enter your Birth Place (up to 200 characters).'
          });
        }
        const coordinates = parseCoordinates(birthLatitudeRaw, birthLongitudeRaw);
        if (!coordinates) {
          return res.status(400).set('Cache-Control', 'no-store').json({
            error: 'Birth Place coordinates are invalid. Select the place from search again.'
          });
        }
        if (!validZone(birthTimezone)) {
          return res.status(400).set('Cache-Control', 'no-store').json({
            error: 'Birth Place time zone is invalid. Select the place from search again.'
          });
        }

        const [customerSnapshot, astroSnapshot] = await Promise.all([
          firestore.getDocument('smv_users/' + uid),
          firestore.getDocument('smv_astrologers/' + astrologerId)
        ]);
        const customer = customerSnapshot.data || {};
        const astro = astroSnapshot.data || {};
        if (!customerSnapshot.exists || String(customer.role || '').toLowerCase() !== 'customer') {
          return res.status(403).set('Cache-Control', 'no-store').json({
            error: 'Please sign in with a Customer account to book a call.'
          });
        }
        if (!astroSnapshot.exists) {
          return res.status(404).set('Cache-Control', 'no-store').json({
            error: 'The selected Astrologer profile was not found.'
          });
        }
        if (!['approved', 'active'].includes(String(astro.status || '').toLowerCase())) {
          return res.status(409).set('Cache-Control', 'no-store').json({
            error: 'This Astrologer is not currently approved for bookings.'
          });
        }
        const chatMode = type === 'Chat Consultation';
        if (chatMode ? astro.liveChatEnabled !== true : astro.liveCallEnabled !== true) {
          return res.status(409).set('Cache-Control', 'no-store').json({
            error: 'This Astrologer has not enabled ' + (chatMode ? 'Live Chat' : 'Live Call') + '.'
          });
        }
        const candidates = chatMode
          ? [astro.chatPricePerMinute, astro.liveChatPricePerMinute, astro.chatRatePerMinute]
          : [astro.callPricePerMinute, astro.pricePerMinute, astro.callRatePerMinute];
        const pricePerMinute = candidates.map(validPerMinute).find(value => value !== null);
        if (!pricePerMinute) {
          return res.status(409).set('Cache-Control', 'no-store').json({
            error: 'This Astrologer does not have a configured ' + (chatMode ? 'Chat' : 'Call') + ' Price per minute yet.'
          });
        }
        callBooking = {
          astrologerId: astroSnapshot.id,
          astrologerUid: String(astro.uid || astroSnapshot.id),
          astrologerName: String(astro.name || 'Astrologer'),
          pricePerMinute,
          priceUnit: 'per_minute',
          bookingKind: chatMode ? 'scheduled_chat_request' : 'scheduled_call_request',
          ...(chatMode
            ? { chatPricePerMinute: pricePerMinute, ...(question ? { question } : {}) }
            : { callPricePerMinute: pricePerMinute }),
          birthDetails: {
            birthDate, birthTime, birthPlace,
            birthLatitude: coordinates.latitude,
            birthLongitude: coordinates.longitude,
            birthTimezone
          }
        };
      } else if (!email || !mobile) {
        return res.status(400).set('Cache-Control', 'no-store').json({
          error: 'Please provide your email and mobile number.'
        });
      }

      const bookingDateKey = indiaDateKey(new Date(currentTime));
      const counterPath = 'smv_counters/booking_' + bookingDateKey;
      const appointmentId = String(randomId()).replace(/[^A-Za-z0-9_-]/g, '').slice(0, 100);
      if (!appointmentId) {
        return res.status(500).set('Cache-Control', 'no-store').json({ error: 'Unable to create a booking ID.' });
      }
      const booking = await firestore.runTransaction(async tx => {
        const [counterSnapshot, customerSnapshot] = await Promise.all([
          tx.getDocument(counterPath),
          tx.getDocument('smv_users/' + uid)
        ]);
        if (!customerSnapshot.exists || String(customerSnapshot.data?.role || '').toLowerCase() !== 'customer') {
          throw Object.assign(new Error('Customer profile changed. Please sign in again.'), {
            code: 'CUSTOMER_PROFILE_CHANGED', httpStatus: 409
          });
        }
        const previous = Number(counterSnapshot.data?.lastNumber || 0);
        if (!Number.isSafeInteger(previous) || previous < 0 || previous >= 99999999) {
          throw Object.assign(new Error('Daily booking number is unavailable.'), {
            code: 'BOOKING_COUNTER_INVALID', httpStatus: 503
          });
        }
        const next = previous + 1;
        const bookingId = 'SMV-BKG-' + bookingDateKey + '-' + String(next).padStart(2, '0');
        const timestamp = FirestoreFieldValue.serverTimestamp();
        const data = {
          bookingId,
          customerUid: uid,
          customerEmail: user.email || email,
          name,
          ...(hasCustomerBooking ? {} : { email, mobile }),
          type,
          ...callBooking,
          preferredDate,
          preferredTime,
          scheduledMinutes: hasCustomerBooking ? scheduledMinutes : null,
          notes,
          question: hasCustomerBooking && type === 'Chat Consultation' ? question : '',
          status: 'new',
          paymentStatus: hasCustomerBooking ? 'not_started' : 'not_required',
          bookingStatus: 'requested',
          createdAt: timestamp,
          source: 'website-appointment-form',
          updatedAt: timestamp
        };
        tx.set(counterPath, { lastNumber: next, dateKey: bookingDateKey, updatedAt: timestamp }, { merge: true });
        tx.create('smv_appointments/' + appointmentId, data);
        return { bookingId, appointmentId, data };
      });
      return res.set('Cache-Control', 'no-store').json({
        ok: true,
        bookingId: booking.bookingId,
        appointmentId: booking.appointmentId,
        status: 'new',
        bookingStatus: 'requested'
      });
    } catch (error) {
      return sendError(res, error, 'Unable to create booking right now.');
    }
  });

  return Object.freeze({ path: '/appointment-booking' });
}
