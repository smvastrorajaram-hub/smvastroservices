/* Search a single requested GeoNames shard away from the browser UI thread. */
import {normalizePlaceQuery, placeShardKeyFor, rankPlaceRows} from './place-search-core.mjs';

let manifest = null, manifestFlight = null;
const shardCache = new Map(), shardFlights = new Map();
const prefixCandidates = new Map(), resultCache = new Map();

async function getManifest() {
  if (manifest) return manifest;
  if (manifestFlight) return manifestFlight;
  manifestFlight = (async () => {
    const response = await fetch(new URL('./india-manifest.json', import.meta.url));
    if (!response.ok) throw new Error('Offline India place database unavailable');
    manifest = await response.json();
    return manifest;
  })();
  try { return await manifestFlight; }
  finally { manifestFlight = null; }
}
async function getShard(key) {
  if (shardCache.has(key)) return shardCache.get(key);
  if (shardFlights.has(key)) return shardFlights.get(key);
  const flight = (async () => {
    const data = await getManifest(), entry = data.shards?.[key];
    if (!entry) return [];
    const response = await fetch(new URL('./india/' + entry.file, import.meta.url));
    if (!response.ok) throw new Error('Offline India place shard unavailable');
    const rows = await response.json();
    shardCache.set(key, rows);
    return rows;
  })();
  shardFlights.set(key, flight);
  try { return await flight; }
  finally { shardFlights.delete(key); }
}
self.onmessage = async event => {
  const message = event.data || {}, id = message.id;
  try {
    const normalized = normalizePlaceQuery(message.query);
    if (normalized.length < 2) {
      self.postMessage({id, rows: []});
      return;
    }
    const limit = Math.max(1, Math.min(70, Number(message.limit) || 12));
    const language = String(message.language || 'en');
    const cacheKey = normalized + '|' + limit + '|' + language;
    if (resultCache.has(cacheKey)) {
      self.postMessage({id, rows: resultCache.get(cacheKey)});
      return;
    }
    const key = placeShardKeyFor(normalized), allRows = await getShard(key);
    const previous = prefixCandidates.get(key);
    const source = previous && normalized.startsWith(previous.query) &&
      normalized.length > previous.query.length ? previous.rows : allRows;
    const result = rankPlaceRows(source, normalized);
    prefixCandidates.set(key, {query: normalized, rows: result.candidates});
    const rows = result.ranked.slice(0, limit).map(item => item.row);
    resultCache.set(cacheKey, rows);
    if (resultCache.size > 80) resultCache.delete(resultCache.keys().next().value);
    self.postMessage({id, rows});
  } catch (error) {
    self.postMessage({id, error: String(error?.message || error || 'Location search failed')});
  }
};
