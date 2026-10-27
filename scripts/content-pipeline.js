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

/** Detect the bare Pharos homepage, which is not a project's own website. */
export function isPharosHomepage(value) {
  try {
    const url = new URL(canonicalUrl(value));
    return ['pharos.xyz', 'www.pharos.xyz'].includes(url.hostname) && url.pathname === '/';
  } catch { return false; }
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

/** Compare "x.y.z" versions; unparseable versions compare as older. */
function versionAtLeast(version, target) {
  const parse = v => /^(\d+)\.(\d+)\.(\d+)$/.exec(v || '')?.slice(1).map(Number);
  const a = parse(version), b = parse(target);
  if (!a || !b) return false;
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] > b[i];
  return true;
}

/**
 * Split pending candidates into kept and removed-in-review. A candidate tagged
 * with the content version of the PR that proposed it, still pending once main
 * has reached that version, was deleted by the reviewer before merge: without
 * this it would be re-proposed every week.
 */
export function splitReviewedOut(pending, mainVersion) {
  const kept = [], removed = [];
  for (const c of pending) (c?.proposedVersion && versionAtLeast(mainVersion, c.proposedVersion) ? removed : kept).push(c);
  return { kept, removed };
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
  const included = payload.decisions.filter(d => d?.action === 'include');
  const includedIds = new Set(included.map(d => d.candidateId));
  // Models often cite the included item's slug rather than its candidate ID; map it back.
  const includedBySlug = new Map(included.filter(d => typeof d.item?.id === 'string').map(d => [d.item.id, d.candidateId]));
  for (const d of payload.decisions) {
    if (!d || !expected.has(d.candidateId) || seen.has(d.candidateId)) throw new Error('Unknown or repeated candidate decision');
    seen.add(d.candidateId);
    const c = expected.get(d.candidateId);
    if (d.action === 'include') {
      if (!d.item || canonicalUrl(d.item.link) !== c.url || d.item.date !== c.date) throw new Error('Conversion changed candidate source or date');
      items.push(d.item);
    } else if (d.action === 'exclude') {
      if (d.reason === 'duplicate') {
        const target = expected.has(d.duplicateOf) ? d.duplicateOf : (includedBySlug.get(d.duplicateOf) ?? d.duplicateOf);
        if (!existingIds.has(d.duplicateOf) && !(target !== d.candidateId && includedIds.has(target))) throw new Error('Duplicate exclusion must identify existing news or an included candidate');
      } else if (d.reason !== 'out_of_scope' || typeof d.explanation !== 'string' || !d.explanation.trim()) throw new Error('Exclusion requires an explicit supported reason');
    } else throw new Error('Invalid candidate action');
  }
  if (seen.size !== expected.size) throw new Error('Conversion silently omitted candidates');
  return { items, decisions: payload.decisions };
}

// Words that recur across unrelated Pharos news (English, plus unaccented
// Vietnamese words that would otherwise pass the brand heuristic below).
const GENERIC_WORDS = new Set(`pharos network realfi rwa ai defi cefi l1 l2 evm testnet mainnet devnet web3 crypto blockchain
onchain chain token tokens pros vault vaults agent agents native ecosystem foundation alliance protocol finance labs
launch launches live update updates weekly week recap news official partner partners partnership market markets
yield lending staking bridge wallet program campaign event summit community developer developers build builder builders
sinh minh kinh gian giai trong thanh tranh nhanh chung tham khai cung hang tinh chinh nhan quan thong trien
khong nhung trinh hoat dong mang thuc dung phat chuong truong nguoi trang truy giao doanh trung
usd usdc usdt btc eth credit prime private exchange global energy beta airdrop snapshot node full cross series
space center connect korea japan`.split(/\s+/));

const compact = s => s.toLowerCase().replace(/[^a-z0-9]/g, '');
const escapeRe = s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Distinctive subjects of a news item, as compact key → display label. */
function subjects(item, ecosystem) {
  const title = String(item.title ?? '');
  const slug = `-${item.id ?? ''}-`;
  const keys = new Map();
  for (const e of ecosystem) {
    if (typeof e?.name !== 'string' || e.name.split(/\s+/).every(w => GENERIC_WORDS.has(compact(w)))) continue;
    const byName = new RegExp(`(^|[^\\p{L}\\p{N}])${escapeRe(e.name)}($|[^\\p{L}\\p{N}])`, 'iu').test(title);
    if (byName || (typeof e.id === 'string' && slug.includes(`-${e.id}-`))) keys.set(compact(e.name), e.name);
  }
  // Vietnamese titles are Title Case, so "capitalized" alone means nothing; keep only
  // brand-shaped words: CamelCase, letters+digits, ACRONYMS, $TICKERS, or long ASCII names.
  for (const raw of title.split(/[\s,.:;!?()[\]"“”‘’'/&–—-]+/)) {
    const w = raw.replace(/^\$/, '');
    const key = compact(w);
    if (key.length < 2 || GENERIC_WORDS.has(key) || !/^[A-Za-z0-9+]+$/.test(w)) continue;
    if (raw.startsWith('$') || /[a-z][A-Z]/.test(w) || (/\d/.test(w) && /[a-z]/i.test(w)) ||
      /^[A-Z]{2,}\+?$/.test(w) || /^[A-Z][a-z]{3,}$/.test(w)) keys.set(key, keys.get(key) ?? w);
  }
  return keys;
}

// "Silo" ~ "SiloFinance", "Prosper" ~ "ProsperTicker"; short keys must match exactly.
const sameSubject = (a, b) => a === b || (Math.min(a.length, b.length) >= 4 && (a.startsWith(b) || b.startsWith(a)));

/**
 * Flag new news items that name the same distinctive project/subject as an existing
 * item, or an earlier item in the same batch, dated within ±windowDays. Flags are
 * advisory: a partnership and a later launch can legitimately share both.
 */
export function findSameEventFlags(newItems, existingItems, ecosystem = [], windowDays = 3) {
  const keyed = items => items.map(item => ({ item, keys: subjects(item, ecosystem) }));
  const existing = keyed(existingItems);
  const added = keyed(newItems);
  const flags = [];
  added.forEach(({ item, keys }, i) => {
    for (const other of [...existing, ...added.slice(0, i)]) {
      // Written as !(<=) so an unparseable date (NaN) is skipped, not treated as in-window.
      if (!(Math.abs(Date.parse(item.date) - Date.parse(other.item.date)) <= windowDays * 86400000)) continue;
      const shared = [...keys].filter(([k]) => [...other.keys.keys()].some(o => sameSubject(k, o))).map(([, label]) => label);
      if (shared.length) flags.push({ id: item.id, duplicateOf: other.item.id, date: other.item.date, shared,
        reason: `Same subject (${shared.join(', ')}) within ±${windowDays} days` });
    }
  });
  return flags;
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

// Research-process meta-commentary that must never reach published copy. news.js
// renders summary/content verbatim, so each pattern below is a known leak shape.
const META_COMMENTARY = [
  // "dựa trên đoạn trích tìm kiếm": admits the copy came from a search snippet.
  ['search-snippet', /đoạn trích/iu],
  // "chưa có toàn văn bài viết": admits the full article was not read.
  ['no-full-text', /chưa có toàn văn/iu],
  // A trailing "Lưu ý: …" sentence about the source is the model's caveat slot.
  // A trailing notice about the event itself ("Lưu ý: hạn chót là 30/10.") is fine.
  ['trailing-caveat', /(?:^|[.!?]\s+)lưu ý\s*:[^.!?]*\b(?:nguồn|thông tin|bài viết|toàn văn|tìm kiếm)[^.!?]*[.!?]?\s*$/iu],
  // "Nguồn tin không cung cấp thêm chi tiết": comments on source coverage. Anchored
  // on "nguồn" so "Pharos không cung cấp thêm phần thưởng" stays publishable.
  ['source-gap', /nguồn(?: tin)? không cung cấp thêm/iu],
  // "theo kết quả tìm kiếm": cites the search step rather than the publisher.
  ['search-results', /theo kết quả tìm kiếm/iu],
];

/** Return the name of the first meta-commentary pattern a published text matches, or null. */
export function findMetaCommentary(text) {
  if (typeof text !== 'string') return null;
  return META_COMMENTARY.find(([, re]) => re.test(text))?.[0] ?? null;
}
