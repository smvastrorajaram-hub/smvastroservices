'use strict';

const QUOTA_ERROR_CODES = new Set(['8', 'resource-exhausted', 'resource_exhausted', 'resource exhausted']);

function isFirestoreQuotaError(error) {
  const rawCode = String(error?.code ?? error?.status ?? error?.statusCode ?? '').trim().toLowerCase();
  if (QUOTA_ERROR_CODES.has(rawCode) || /(?:^|[/\s])resource[-_\s]exhausted(?:$|[/\s])/.test(rawCode)) return true;
  const message = String(error?.message || error?.details || '');
  return /(?:quota(?:\s+has)?\s+(?:been\s+)?exceeded|resource[_\s-]+exhausted|rate\s+limit\s+exceeded)/i.test(message);
}

/**
 * Tries only the explicitly supplied data sources, in their supplied order.
 * Callers must pass only verified replicas plus the authoritative source for
 * the exact same record set. Non-quota errors are never hidden or rerouted.
 * This helper is for reads only; never use it to retry financial writes.
 */
async function readWithQuotaFallback({ candidates, read, logger = console, label = 'Firestore read' } = {}) {
  if (typeof read !== 'function') throw new TypeError('readWithQuotaFallback requires a read(db, candidate) function.');
  if (!Array.isArray(candidates) || candidates.length === 0) {
    throw new TypeError('readWithQuotaFallback requires at least one explicitly approved database candidate.');
  }

  const visitedDatabases = new Set();
  const attemptedSources = [];
  let lastQuotaError = null;
  let usableCandidates = 0;

  for (let index = 0; index < candidates.length; index += 1) {
    const candidate = candidates[index] || {};
    if (!candidate.db || visitedDatabases.has(candidate.db)) continue;
    visitedDatabases.add(candidate.db);
    usableCandidates += 1;
    const source = String(candidate.id || candidate.projectId || ('candidate-' + (index + 1)));

    try {
      const value = await read(candidate.db, candidate);
      return {
        value,
        source,
        usedFallback: attemptedSources.length > 0,
        attemptedSources: [...attemptedSources, source]
      };
    } catch (error) {
      if (!isFirestoreQuotaError(error)) throw error;
      lastQuotaError = error;
      attemptedSources.push(source);
      logger?.warn?.('[Firestore quota routing] ' + label + ' hit quota in ' + source + '; trying the next explicitly approved source.');
      if (typeof candidate.onQuota === 'function') {
        try {
          await candidate.onQuota(error);
        } catch (sideEffectError) {
          logger?.warn?.('[Firestore quota routing] Could not record quota fallback for ' + label + ' at ' + source + ':', sideEffectError?.message || sideEffectError);
        }
      }
    }
  }

  if (!usableCandidates) throw new TypeError('readWithQuotaFallback did not receive any unique usable Firestore database candidates.');
  if (lastQuotaError) {
    try {
      lastQuotaError.quotaRoutingSources = [...attemptedSources];
    } catch (_) {}
    throw lastQuotaError;
  }
  throw new Error('No Firestore database candidate was available for ' + label + '.');
}

module.exports = { isFirestoreQuotaError, readWithQuotaFallback };
