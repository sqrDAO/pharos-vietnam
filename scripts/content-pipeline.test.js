import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalUrl, coverageStart, parseCandidates, reconcileDecisions, requestJson } from './content-pipeline.js';

const candidates = parseCandidates({ candidates: [
  { title: 'NGI+ launch', summary: 'Asseto brings NGI+ to Pharos', date: '2026-08-18', url: 'https://x.com/pharos_network/status/2089547853781967127' },
  { title: 'pRNH launch', summary: 'R25 vault launches', date: '2026-08-24', url: 'https://www.kucoin.com/news/flash/pharos-launches-prnh-vault-with-r25-offering-on-chain-access-to-u-s-high-yield-corporate-bonds' },
  { title: 'BTC lending launch', summary: 'Avalon lending goes live', date: '2026-08-26', url: 'https://x.com/pharos_network/status/2092623064928555105' },
] }, '2026-08-16', '2026-09-06');
const decisions = candidates.map(c => ({ candidateId: c.id, action: 'include', item: { id: c.id, link: c.url, date: c.date } }));

test('all three missed launches survive accounting even with an existing Avalon partnership', () => {
  assert.equal(reconcileDecisions(candidates, { decisions }, [{ id: 'avalon-partnership' }]).items.length, 3);
});
test('empty or partial conversion is an error, not no updates', () => {
  for (const d of [[], decisions.slice(0, 2)]) assert.throws(() => reconcileDecisions(candidates, { decisions: d }, []), /omitted/);
});
test('duplicates need a traceable target and exclusions need a reason', () => {
  assert.throws(() => reconcileDecisions(candidates, { decisions: [{ candidateId: candidates[0].id, action: 'exclude', reason: 'duplicate' }, ...decisions.slice(1)] }, []), /Duplicate/);
  const d = [{ candidateId: candidates[0].id, action: 'exclude', reason: 'duplicate', duplicateOf: 'existing-ngi-launch' }, ...decisions.slice(1)];
  assert.equal(reconcileDecisions(candidates, { decisions: d }, [{ id: 'existing-ngi-launch' }]).items.length, 2);
});
test('source and date cannot be changed by conversion', () => {
  const d = structuredClone(decisions); d[0].item.date = '2026-09-01';
  assert.throws(() => reconcileDecisions(candidates, { decisions: d }, []), /source or date/);
});
test('X tracking links deduplicate by post ID URL', () => {
  assert.equal(canonicalUrl('https://twitter.com/pharos_network/status/123?s=20'), canonicalUrl('https://x.com/pharos_network/status/123'));
});
test('failed coverage survives beyond the normal window; invalid windows fail', () => {
  assert.equal(coverageStart('2026-08-01', '2026-09-13', 28), '2026-07-25');
  assert.equal(coverageStart(undefined, '2026-09-13', 28), '2026-08-16');
  assert.throws(() => coverageStart(undefined, '2026-09-13', 0));
});
test('malformed research and impossible dates fail instead of claiming no updates', () => {
  assert.throws(() => parseCandidates({}, '2026-08-01', '2026-09-13'));
  assert.throws(() => parseCandidates({ candidates: [{ ...candidates[0], date: '2026-02-30' }] }, '2026-01-01', '2026-09-13'));
});
test('transient provider failures retry; authentication failures do not', async () => {
  let calls = 0;
  const result = await requestJson('https://example.org', {}, { sleep: async () => {}, fetcher: async () => ++calls < 3 ? { ok: false, status: 503 } : { ok: true, json: async () => ({ ok: true }) } });
  assert.equal(calls, 3); assert.equal(result.ok, true);
  calls = 0;
  await assert.rejects(requestJson('https://example.org', {}, { sleep: async () => {}, fetcher: async () => { calls++; return { ok: false, status: 401 }; } }), /401/);
  assert.equal(calls, 1);
});
test('exhausted X API failures remain errors', async () => {
  await assert.rejects(requestJson('https://api.x.ai/v1/responses', {}, { sleep: async () => {}, fetcher: async () => { throw new Error('network unavailable'); } }), /network unavailable/);
});

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('full updater: missed launches, incomplete searches, dropped conversion, and recovery', () => {
  const root = mkdtempSync(join(tmpdir(), 'pharos-pipeline-'));
  try {
    mkdirSync(join(root, 'scripts')); mkdirSync(join(root, 'public/js'), { recursive: true });
    for (const name of ['update-pharos-content.js', 'content-pipeline.js']) copyFileSync(new URL(name, import.meta.url), join(root, 'scripts', name));
    writeFileSync(join(root, 'package.json'), '{"type":"module"}');
    const baseline = `window.PharosData = {meta: {version: "1.0.0", lastUpdated: "2026-08-01", sources: [\n]}, news: [\n], ecosystem: [\n], techSpecs: {tps: "30000"}};`;
    writeFileSync(join(root, 'fixture.json'), JSON.stringify(candidates));
    writeFileSync(join(root, 'mock.mjs'), `
import fs from 'node:fs';
const NativeDate = Date;
globalThis.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : ['2026-09-13T12:00:00Z'])); } static now() { return NativeDate.parse('2026-09-13T12:00:00Z'); } };
const fixtures = JSON.parse(fs.readFileSync(new URL('./fixture.json', import.meta.url)));
const mode = process.env.SCENARIO;
globalThis.fetch = async (url, options = {}) => {
  if (String(url).includes('api.x.ai')) {
    const request = JSON.parse(options.body);
    if (mode === 'x-failure' && request.tools[0].allowed_x_handles?.[0] === 'pharos_eco') return {ok:false,status:401};
    const found = request.tools[0].allowed_x_handles?.[0] === 'pharos_network' ? fixtures : [];
    return { ok:true, json:async () => ({status:'completed', output:[...(mode === 'no-search' ? [] : [{type:'x_search_call',status:'completed'}]), {type:'message',content:[{type:'output_text',text:JSON.stringify({candidates:found})}]}]}) };
  }
  if (String(url).includes('googleapis.com')) {
    const request = JSON.parse(options.body); const prompt = request.contents[0].parts[0].text;
    let text;
    if (prompt.startsWith('Collect')) text = JSON.stringify({candidates:[]});
    else if (prompt.startsWith('Write Vietnamese')) {
      const items = JSON.parse(prompt.split('Candidates: ')[1].split('\\nPrevious')[0]);
      text = JSON.stringify({decisions: mode === 'drop' ? [] : items.map(c => ({candidateId:c.id,action:'include',item:{id:c.id,title:c.title,summary:c.summary,content:c.summary,link:c.url,date:c.date,category:'Thông Báo',source:'Official announcement'}}))});
    } else if (mode === 'eco-failure') return {ok:false,status:401};
    else text = 'NO NEW PARTNERS';
    return {ok:true,json:async () => ({candidates:[{finishReason:'STOP',groundingMetadata:{webSearchQueries:['pharos']},content:{parts:[{text}]}}]})};
  }
  return {ok:true,status:200,url:String(url)};
};
`);
    const run = mode => spawnSync(process.execPath, ['--import', './mock.mjs', 'scripts/update-pharos-content.js'], { cwd: root, encoding: 'utf8', env: { ...process.env, GEMINI_API_KEY: 'fake-gemini-test-secret', XAI_API_KEY: mode === 'missing-key' ? '' : 'fake-x-test-secret', CONTENT_LOOKBACK_DAYS: '28', GITHUB_STEP_SUMMARY: '', SCENARIO: mode } });
    const state = () => JSON.parse(readFileSync(join(root, '.content-state/state.json')));
    const summary = () => JSON.parse(readFileSync(join(root, 'content-artifacts/summary.json')));
    for (const mode of ['drop', 'x-failure', 'eco-failure', 'success']) {
      writeFileSync(join(root, 'public/js/data.js'), baseline);
      rmSync(join(root, '.content-state'), { recursive:true, force:true });
      const result = run(mode);
      assert.equal(result.status, mode === 'success' ? 0 : 1, result.stderr);
      assert.equal(state().pending.length, 3, mode);
      assert.equal(summary().status, mode === 'success' ? 'completed_with_updates' : 'incomplete');
      assert.equal(Boolean(state().lastCompletedDate), mode === 'success');
      assert.equal(readFileSync(join(root, 'has-changes.txt'), 'utf8').trim(), mode === 'drop' ? 'false' : 'true');
      const recovered = run('success');
      assert.equal(recovered.status, 0, recovered.stderr);
      assert.equal(summary().status, mode === 'drop' ? 'completed_with_updates' : 'completed_no_updates');
      assert.equal(state().pending.length, mode === 'drop' ? 3 : 0);
    }
    for (const mode of ['missing-key', 'no-search']) {
      writeFileSync(join(root, 'public/js/data.js'), baseline);
      rmSync(join(root, '.content-state'), { recursive:true, force:true });
      assert.equal(run(mode).status, 1);
      assert.equal(summary().status, 'incomplete');
      assert.equal(state().lastCompletedDate, undefined);
      assert.equal(readFileSync(join(root, 'has-changes.txt'), 'utf8').trim(), 'false');
    }
  } finally { rmSync(root, { recursive: true, force: true }); }
});
