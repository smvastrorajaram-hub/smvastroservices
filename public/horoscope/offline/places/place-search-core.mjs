/* Shared deterministic place-ranking logic for both the UI fallback and module Worker. */
export function normalizePlaceQuery(value) {
  return String(value || '').normalize('NFKD').toLowerCase()
    .replace(/\p{M}/gu, '').replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
}
export function placeShardKeyFor(normalizedQuery) {
  const first = normalizedQuery[0] || '';
  if (first >= 'a' && first <= 'z') return first;
  if (/[\u0B80-\u0BFF]/u.test(first)) return 'ta';
  return 'other';
}
const aliasCache = new WeakMap();
function rowAliases(row) {
  let aliases = aliasCache.get(row);
  if (!aliases) {
    aliases = (Array.isArray(row?.[8]) ? row[8] : [])
      .map(normalizePlaceQuery).filter(Boolean);
    aliasCache.set(row, aliases);
  }
  return aliases;
}
export function rankPlaceRows(rows, normalizedQuery) {
  const ranked = [], candidates = [];
  for (const row of rows || []) {
    let best = 99;
    for (const alias of rowAliases(row)) {
      if (alias === normalizedQuery) { best = 0; break; }
      if (alias.startsWith(normalizedQuery)) best = Math.min(best, 1);
      else if (alias.includes(' ' + normalizedQuery)) best = Math.min(best, 2);
      else if (alias.includes(normalizedQuery)) best = Math.min(best, 3);
    }
    if (best < 99) {
      ranked.push({ row, score: best });
      candidates.push(row);
    }
  }
  ranked.sort((a, b) =>
    a.score - b.score || Number(b.row[7] || 0) - Number(a.row[7] || 0) ||
    String(a.row[1]).localeCompare(String(b.row[1]))
  );
  return { ranked, candidates };
}
