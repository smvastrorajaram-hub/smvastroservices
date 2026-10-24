// Public SMV CALENDAR Rasi Palan period anchors.
// All dates are date-only values interpreted at UTC noon to avoid timezone rollover.
export function sundayOf(dateString) {
  const d = new Date(String(dateString).slice(0, 10) + 'T12:00:00Z');
  d.setUTCDate(d.getUTCDate() - d.getUTCDay());
  return d.toISOString().slice(0, 10);
}

export function currentWeek(dateString) {
  const anchor = new Date(String(dateString).slice(0, 10) + 'T12:00:00Z');
  const weekday = anchor.getUTCDay();
  let start, end;
  if (weekday === 0) {
    // Sunday starts the next weekly window; include the following Sunday as requested.
    start = new Date(anchor);
    end = new Date(anchor);
    end.setUTCDate(end.getUTCDate() + 7);
  } else {
    // Through Saturday, show the previous Saturday to the current/upcoming Saturday.
    end = new Date(anchor);
    end.setUTCDate(end.getUTCDate() + ((6 - weekday + 7) % 7));
    start = new Date(end);
    start.setUTCDate(start.getUTCDate() - 7);
  }
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

export function periodReference(period, dateString) {
  const d = String(dateString).slice(0, 10);
  if (period === 'weekly') {
    const range = currentWeek(d);
    return { date: range.start, key: range.start, start: range.start, end: range.end };
  }
  if (period === 'monthly') {
    const yearMonth = d.slice(0, 7);
    const monthEnd = new Date(Date.UTC(Number(d.slice(0, 4)), Number(d.slice(5, 7)), 0, 12))
      .toISOString().slice(0, 10);
    return { date: yearMonth + '-01', key: yearMonth, start: yearMonth + '-01', end: monthEnd };
  }
  return { date: d, key: d, start: d, end: d };
}
