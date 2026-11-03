import {
  safePaise,
  safeMinutes,
  walletError
} from './wallet-domain.mjs';

export const LIVE_MAX_SESSION_MINUTES = 1440;
export const LIVE_RING_TIMEOUT_MS = 2 * 60_000;
export const LIVE_CALL_CONNECT_TIMEOUT_MS = 45_000;
export const LIVE_CHAT_CONNECT_TIMEOUT_MS = 5 * 60_000;
export const LIVE_PREPARATION_DURATION_MS = 3 * 60_000;
export const LIVE_BOOKING_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000;
export const LIVE_DISCONNECT_GRACE_MS = 20_000;

export function parseRupeesToPaise(value) {
  const raw=String(value??'').trim();
  if(!raw||!/^\d{1,9}(?:\.\d{1,2})?$/.test(raw)) return null;
  const amount=Number(raw);
  const paise=Math.round(amount*100);
  return Number.isSafeInteger(paise)&&paise>=0?paise:null;
}

export function billableMinutesForElapsedMs(elapsedMs,maximumMinutes) {
  const elapsed=Number(elapsedMs),maximum=Number(maximumMinutes);
  if(!Number.isFinite(elapsed)||elapsed<0||!Number.isSafeInteger(maximum)||maximum<1||maximum>LIVE_MAX_SESSION_MINUTES) return null;
  if(elapsed===0) return 0;
  return Math.min(maximum,Math.max(1,Math.ceil(elapsed/60_000)));
}

export function calculateLiveSessionCharge({elapsedMs,ratePerMinutePaise,maximumMinutes,freeMinutes=0}={}) {
  const rate=Number(ratePerMinutePaise);
  const minutes=billableMinutesForElapsedMs(elapsedMs,maximumMinutes);
  const free=Number(freeMinutes);
  if(minutes===null||!Number.isSafeInteger(rate)||rate<100||rate>1_000_000||
     !Number.isSafeInteger(free)||free<0||free>LIVE_MAX_SESSION_MINUTES) return null;
  const freeMinutesUsed=Math.min(minutes,free);
  const paidMinutes=minutes-freeMinutesUsed;
  const amountPaise=paidMinutes*rate;
  if(!Number.isSafeInteger(amountPaise)) return null;
  return {
    elapsedMs:Math.floor(Number(elapsedMs)),
    billableMinutes:paidMinutes,
    totalBillableMinutes:minutes,
    freeMinutesUsed,
    amountPaise
  };
}

export function reserveLiveWallet({wallet,minutes,ratePerMinutePaise}={}) {
  const length=Number(minutes),rate=Number(ratePerMinutePaise);
  if(!Number.isSafeInteger(length)||length<1||length>LIVE_MAX_SESSION_MINUTES||
     !Number.isSafeInteger(rate)||rate<100||rate>1_000_000) {
    throw walletError('LIVE_PRICE_INVALID','Session duration or Astrologer per-minute rate is invalid.',400);
  }
  const bonusAvailable=safeMinutes(wallet?.bonusMinutesBalance);
  const reservedBonusMinutes=Math.min(length,bonusAvailable);
  const cashMinutes=length-reservedBonusMinutes;
  const reservedAmountPaise=cashMinutes*rate;
  const available=safePaise(wallet?.availableBalancePaise);
  if(!Number.isSafeInteger(reservedAmountPaise)||available<reservedAmountPaise) {
    throw walletError('WALLET_INSUFFICIENT_BALANCE','Insufficient Wallet balance for the selected duration.',409,{
      availableBalancePaise:available,
      requiredBalancePaise:Number.isSafeInteger(reservedAmountPaise)?reservedAmountPaise:0,
      shortfallPaise:Number.isSafeInteger(reservedAmountPaise)?Math.max(0,reservedAmountPaise-available):0
    });
  }
  const reserved=safePaise(wallet?.reservedBalancePaise);
  const reservedBonus=safeMinutes(wallet?.reservedBonusMinutes);
  if(!Number.isSafeInteger(reserved+reservedAmountPaise)||!Number.isSafeInteger(reservedBonus+reservedBonusMinutes)||
     reserved+reservedAmountPaise>Number.MAX_SAFE_INTEGER||reservedBonus+reservedBonusMinutes>1_000_000) {
    throw walletError('WALLET_BALANCE_OVERFLOW','Wallet reserve exceeds the supported balance range.');
  }
  return {
    reservedAmountPaise,
    reservedBonusMinutes,
    availableBalanceAfterPaise:available-reservedAmountPaise,
    reservedBalanceAfterPaise:reserved+reservedAmountPaise,
    bonusMinutesBalanceAfter:bonusAvailable-reservedBonusMinutes,
    reservedBonusMinutesAfter:reservedBonus+reservedBonusMinutes
  };
}

export function splitLiveCommission(grossAmountPaise,commission) {
  const gross=Number(grossAmountPaise);
  const hasAstroPercent=commission?.astroPercent!==null&&commission?.astroPercent!==undefined&&String(commission.astroPercent).trim()!=='';
  const hasAdminPercent=commission?.adminPercent!==null&&commission?.adminPercent!==undefined&&String(commission.adminPercent).trim()!=='';
  if(!hasAstroPercent&&!hasAdminPercent) {
    throw walletError('LIVE_COMMISSION_NOT_CONFIGURED','Admin Live commission settings are not configured.');
  }
  const astroPercent=hasAstroPercent?Number(commission.astroPercent):100-Number(commission.adminPercent);
  const adminPercent=hasAdminPercent?Number(commission.adminPercent):100-Number(commission.astroPercent);
  if(!Number.isSafeInteger(gross)||gross<0||
     !Number.isFinite(astroPercent)||!Number.isFinite(adminPercent)||
     astroPercent<0||astroPercent>100||adminPercent<0||adminPercent>100||
     Math.abs(astroPercent+adminPercent-100)>0.001) {
    throw walletError('LIVE_COMMISSION_INVALID','Live commission settings are invalid.');
  }
  const astrologerAmountPaise=Math.round(gross*astroPercent/100);
  return {
    astroPercent,adminPercent,
    astrologerAmountPaise,
    adminAmountPaise:gross-astrologerAmountPaise
  };
}

export function commissionFromPayload(payload={}) {
  if(!payload||typeof payload!=='object'||Array.isArray(payload)) {
    throw walletError('LIVE_COMMISSION_NOT_CONFIGURED','Admin Live commission settings are not configured.');
  }
  const hasAstroPercent=payload.astroPercent!==null&&payload.astroPercent!==undefined&&String(payload.astroPercent).trim()!=='';
  const hasAdminPercent=payload.adminPercent!==null&&payload.adminPercent!==undefined&&String(payload.adminPercent).trim()!=='';
  if(!hasAstroPercent&&!hasAdminPercent) {
    throw walletError('LIVE_COMMISSION_NOT_CONFIGURED','Admin Live commission settings are not configured.');
  }
  const candidate={
    astroPercent:hasAstroPercent?Number(payload.astroPercent):100-Number(payload.adminPercent),
    adminPercent:hasAdminPercent?Number(payload.adminPercent):100-Number(payload.astroPercent)
  };
  splitLiveCommission(0,candidate);
  return candidate;
}

export function astrologerAvailabilityStatus(profile={},activeSessionCount=0) {
  if(Number(activeSessionCount)>0) return 'busy';
  return profile.liveCallEnabled===true||profile.liveChatEnabled===true?'online':'offline';
}

export function astrologerRatePaise(profile={},mode='') {
  const kind=String(mode).trim().toLowerCase();
  if(!['call','chat'].includes(kind)) return null;
  const fields=kind==='call'
    ? ['callPricePerMinute','pricePerMinute','callRatePerMinute']
    : ['chatPricePerMinute','liveChatPricePerMinute','chatRatePerMinute'];
  for(const field of fields) {
    if(profile[field]===null||profile[field]===undefined||String(profile[field]).trim()==='') continue;
    const result=parseRupeesToPaise(profile[field]);
    if(result!==null&&result>=100&&result<=1_000_000) return result;
  }
  return null;
}

export function validateLiveBirthDetails(input={},nowMs=Date.now()) {
  const d=input&&typeof input==='object'?input:{};
  const birthDate=String(d.birthDate||'').trim();
  const birthTime=String(d.birthTime||'').trim();
  const birthPlace=String(d.birthPlace||'').trim();
  if(!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)||
     !Number.isFinite(Date.parse(birthDate+'T00:00:00Z'))||
     new Date(Date.parse(birthDate+'T00:00:00Z')).toISOString().slice(0,10)!==birthDate) {
    throw walletError('LIVE_BIRTH_DATE_INVALID','Enter a valid Customer Date of Birth.',400);
  }
  const indiaToday=new Intl.DateTimeFormat('en-CA',{
    timeZone:'Asia/Kolkata',year:'numeric',month:'2-digit',day:'2-digit'
  }).format(new Date(nowMs));
  if(birthDate>indiaToday) throw walletError('LIVE_BIRTH_DATE_FUTURE','Date of Birth cannot be in the future.',400);
  if(!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(birthTime)) {
    throw walletError('LIVE_BIRTH_TIME_INVALID','Enter a valid Customer Time of Birth.',400);
  }
  if(birthPlace.length<2||birthPlace.length>200) {
    throw walletError('LIVE_BIRTH_PLACE_INVALID','Enter a Customer Birth Place (2–200 characters).',400);
  }
  const latRaw=String(d.birthLatitude??'').trim(),lonRaw=String(d.birthLongitude??'').trim();
  let birthLatitude=null,birthLongitude=null;
  if(latRaw||lonRaw) {
    birthLatitude=Number(latRaw);birthLongitude=Number(lonRaw);
    if(!latRaw||!lonRaw||!Number.isFinite(birthLatitude)||!Number.isFinite(birthLongitude)||
       birthLatitude< -90||birthLatitude>90||birthLongitude< -180||birthLongitude>180) {
      throw walletError('LIVE_BIRTH_COORDINATES_INVALID','Birth Place coordinates are invalid.',400);
    }
  }
  return {
    birthDate,birthTime,birthPlace,birthLatitude,birthLongitude,
    birthTimezone:String(d.birthTimezone||'').trim().slice(0,100)
  };
}

export function scheduledAppointmentStartAtMs(appointment={}) {
  const date=String(appointment.preferredDate||''),time=String(appointment.preferredTime||'');
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||!/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(time)) return 0;
  const [year,month,day]=date.split('-').map(Number);
  const [hour,minute]=time.split(':').map(Number);
  const utc=Date.UTC(year,month-1,day,hour,minute);
  const check=new Date(utc);
  if(check.getUTCFullYear()!==year||check.getUTCMonth()!==month-1||check.getUTCDate()!==day) return 0;
  return utc-330*60*1000;
}

export function scheduledAppointmentStatusForEndedSession(session={}) {
  if(Number(session.startedAtMs||session.startedAt||0)>0) return 'completed';
  const reason=String(session.endReason||'').trim().toLowerCase();
  if(['rejected','rejected_by_astrologer'].includes(reason)) return 'rejected';
  if(['connection_failed','no_answer','missed_by_astrologer','scheduled_connection_timeout'].includes(reason)) return 'missed_by_astrologer';
  return 'cancelled';
}

export function calculateLiveSettlement({session,nowMs=Date.now()}={}) {
  const s=session||{};
  const startedAt=Number(s.startedAtMs??s.startedAt??0);
  const elapsedMs=startedAt>0?Math.max(0,Number(nowMs)-startedAt):0;
  const reservedBonusMinutes=safeMinutes(s.reservedBonusMinutes);
  const pricing=calculateLiveSessionCharge({
    elapsedMs,
    ratePerMinutePaise:safePaise(s.ratePerMinutePaise),
    maximumMinutes:Number(s.minutes||1),
    freeMinutes:startedAt>0?reservedBonusMinutes:0
  });
  if(!pricing) throw walletError('LIVE_BILLING_CALCULATION_FAILED','Unable to calculate the Live Session charge safely.',500);
  const reservedAmountPaise=safePaise(s.reservedAmountPaise);
  const chargedAmountPaise=Math.min(reservedAmountPaise,pricing.amountPaise);
  const releasedAmountPaise=reservedAmountPaise-chargedAmountPaise;
  const bonusMinutesReleased=reservedBonusMinutes-pricing.freeMinutesUsed;
  // A zero-charge termination (for example, no answer or a failed connection)
  // only releases the reservation; it must not be blocked by missing commission
  // settings because no earnings are being allocated.
  const commission=chargedAmountPaise===0
    ? {astroPercent:0,adminPercent:0,astrologerAmountPaise:0,adminAmountPaise:0}
    : splitLiveCommission(chargedAmountPaise,{
      astroPercent:s.astrologerCommissionPercent,
      adminPercent:s.adminCommissionPercent
    });
  return {
    elapsedMs:Math.floor(elapsedMs),
    billableMinutes:pricing.billableMinutes,
    totalBillableMinutes:pricing.totalBillableMinutes,
    freeMinutesUsed:pricing.freeMinutesUsed,
    reservedAmountPaise,
    chargedAmountPaise,
    releasedAmountPaise,
    reservedBonusMinutes,
    bonusMinutesReleased,
    ...commission
  };
}

export function mapLiveSessionRow(row) {
  if(!row) return null;
  let payload={};
  try { payload=JSON.parse(String(row.payload_json||'{}')); } catch {}
  return {
    ...payload,
    id:String(row.session_id),
    customerUid:String(row.customer_uid),
    astrologerUid:String(row.astrologer_uid),
    mode:String(row.mode),
    state:String(row.state),
    appointmentId:String(row.appointment_id||payload.appointmentId||''),
    reservedAmountPaise:safePaise(row.reserved_amount_paise),
    reservedBonusMinutes:safeMinutes(row.reserved_bonus_minutes),
    actualChargePaise:safePaise(row.actual_charge_paise),
    startedAtMs:Number(row.started_at_ms||payload.startedAtMs||0),
    endedAtMs:Number(row.ended_at_ms||payload.endedAtMs||0),
    createdAtMs:Number(row.created_at_ms||0),
    updatedAtMs:Number(row.updated_at_ms||0)
  };
}

export function mapLiveBookingRow(row) {
  if(!row) return null;
  let payload={};
  try { payload=JSON.parse(String(row.payload_json||'{}')); } catch {}
  return {
    ...payload,
    id:String(row.booking_id),
    bookingId:String(row.booking_id),
    customerUid:String(row.customer_uid),
    astrologerUid:String(row.astrologer_uid),
    mode:String(row.mode),
    status:String(row.status),
    walletReservationState:String(row.wallet_reservation_state||'none'),
    reservedAmountPaise:safePaise(row.reserved_amount_paise),
    reservedBonusMinutes:safeMinutes(row.reserved_bonus_minutes),
    expiresAtMs:Number(row.expires_at_ms||0),
    createdAtMs:Number(row.created_at_ms||0),
    updatedAtMs:Number(row.updated_at_ms||0)
  };
}
