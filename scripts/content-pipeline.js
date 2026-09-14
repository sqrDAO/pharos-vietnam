import { createHash } from 'node:crypto';

/** Normalize source URLs for deduplication; reject non-HTTP URLs. */
export function canonicalUrl(value) {
  const url = new URL(value);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Expected an HTTP source URL');
  if (['twitter.com', 'www.twitter.com', 'www.x.com'].includes(url.hostname)) url.hostname = 'x.com';
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (key.startsWith('utm_') || ['ref_src', 's', 't'].includes(key)) url.searchParams.delete(key);
  }
  return url.toString().replace(/\/$/, '');
}

/** Accept only real calendar dates in YYYY-MM-DD form. */
function validDate(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
}

/** Choose a backfill start that preserves incomplete coverage and overlap. */
export function coverageStart(lastCompleted, today, lookback) {
  const days = Number(lookback);
  if (!Number.isInteger(days) || days < 14 || days > 365) throw new Error('CONTENT_LOOKBACK_DAYS must be an integer from 14 to 365');
  if (!validDate(today) || (lastCompleted && (!validDate(lastCompleted) || lastCompleted > today))) throw new Error('Invalid coverage date');
  const baseline = Date.parse(today) - days * 86400000;
  // Keep a seven-day overlap, and never skip an incomplete interval.
  return new Date(lastCompleted ? Math.min(baseline, Date.parse(lastCompleted) - 7 * 86400000) : baseline).toISOString().slice(0, 10);
}

/** Validate dated research candidates and assign stable IDs from their URLs. */
export function parseCandidates(payload, from, to) {
  if (!payload || !Array.isArray(payload.candidates)) throw new Error('Research must return a candidates array');
  return payload.candidates.map(c => {
    if (!c || !validDate(c.date) || c.date < from || c.date > to ||
      ![c.title, c.summary].every(v => typeof v === 'string' && v.trim())) throw new Error('Invalid or out-of-window research candidate');
    const url = canonicalUrl(c.url);
    const parsed = new URL(url);
    if (parsed.hostname === 'x.com' && !/^\/[^/]+\/status\/\d+$/.test(parsed.pathname)) throw new Error('X candidates require a post URL');
    if (parsed.hostname === 'vertexaisearch.cloud.google.com') throw new Error('Resolve grounding URLs before candidate conversion');
    return { id: createHash('sha256').update(url).digest('hex').slice(0, 20), url, date: c.date, title: c.title, summary: c.summary };
  });
}

/** Require one traceable decision per candidate without changing source or date. */
export function reconcileDecisions(candidates, payload, existing) {
  if (!payload || !Array.isArray(payload.decisions)) throw new Error('Missing candidate decisions');
  const expected = new Map(candidates.map(c => [c.id, c]));
  const seen = new Set();
  const items = [];
  const existingIds = new Set(existing.map(n => n.id));
  const includedIds = new Set(payload.decisions.filter(d => d?.action === 'include').map(d => d.candidateId));
  for (const d of payload.decisions) {
    if (!d || !expected.has(d.candidateId) || seen.has(d.candidateId)) throw new Error('Unknown or repeated candidate decision');
    seen.add(d.candidateId);
    const c = expected.get(d.candidateId);
    if (d.action === 'include') {
      if (!d.item || canonicalUrl(d.item.link) !== c.url || d.item.date !== c.date) throw new Error('Conversion changed candidate source or date');
      items.push(d.item);
    } else if (d.action === 'exclude') {
      if (d.reason === 'duplicate') {
        if (!existingIds.has(d.duplicateOf) && !(d.duplicateOf !== d.candidateId && includedIds.has(d.duplicateOf))) throw new Error('Duplicate exclusion must identify existing news or an included candidate');
      } else if (d.reason !== 'out_of_scope' || typeof d.explanation !== 'string' || !d.explanation.trim()) throw new Error('Exclusion requires an explicit supported reason');
    } else throw new Error('Invalid candidate action');
  }
  if (seen.size !== expected.size) throw new Error('Conversion silently omitted candidates');
  return { items, decisions: payload.decisions };
}

/** Retry transient provider failures up to three times with a per-attempt timeout. */
export async function requestJson(url, options, { fetcher = fetch, sleep = ms => new Promise(r => setTimeout(r, ms)), timeout = 120000 } = {}) {
  for (let attempt = 0; attempt < 3; attempt++) {
    let retry = true;
    try {
      const response = await fetcher(url, { ...options, signal: AbortSignal.timeout(timeout) });
      if (!response.ok) {
        retry = response.status === 429 || response.status >= 500;
        // Avoid echoing upstream bodies that could contain credentials.
        throw new Error(`Provider HTTP ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      if (!retry || attempt === 2) throw error;
      await sleep(1000 * 2 ** attempt);
    }
  }
}
