import test from 'node:test';
import assert from 'node:assert/strict';
import { canonicalUrl, coverageStart, findMetaCommentary, findSameEventFlags, isPharosHomepage, parseCandidates, reconcileDecisions, requestJson, splitReviewedOut } from './content-pipeline.js';

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
test('in-batch duplicates may cite the included item slug, but not their own', () => {
  const d = structuredClone(decisions);
  d[1].item.id = 'prnh-vault-launch';
  d[0] = { candidateId: candidates[0].id, action: 'exclude', reason: 'duplicate', duplicateOf: 'prnh-vault-launch' };
  assert.equal(reconcileDecisions(candidates, { decisions: d }, []).items.length, 2);
  d[0] = { candidateId: candidates[0].id, action: 'exclude', reason: 'duplicate', duplicateOf: candidates[0].id };
  assert.throws(() => reconcileDecisions(candidates, { decisions: d }, []), /Duplicate/);
  d[1].item.id = candidates[0].id; // a slug that collides with the excluded candidate's ID
  assert.throws(() => reconcileDecisions(candidates, { decisions: d }, []), /Duplicate/);
  d[1].item.id = 'prnh-vault-launch';
  d[0] = { candidateId: candidates[0].id, action: 'exclude', reason: 'duplicate', duplicateOf: 'unknown-slug' };
  assert.throws(() => reconcileDecisions(candidates, { decisions: d }, []), /Duplicate/);
});
test('the bare Pharos homepage is not a project website', () => {
  for (const u of ['https://www.pharos.xyz/', 'https://pharos.xyz', 'https://www.pharos.xyz/?utm_source=x']) assert.equal(isPharosHomepage(u), true);
  for (const u of ['https://www.pharos.xyz/realfi-alliance', 'https://pharosname.com/', 'not a url']) assert.equal(isPharosHomepage(u), false);
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
// Real titles from the PR #38 run and main.
const ecosystem = [{ id: 'prosper', name: 'Prosper' }, { id: 'r25', name: 'R25' }, { id: 'avalon-labs', name: 'Avalon Labs' }, { id: 'realfi-alliance', name: 'RealFi Alliance' }];
const news = (id, title, date) => ({ id, title, date });
const silo = news('pharos-chao-don-silofinance-de-phat-trien-thi-truong-cho-vay-biet-lap', 'Pharos Chào Đón SiloFinance Để Phát Triển Thị Trường Cho Vay Biệt Lập', '2026-10-03');
const prosper = news('prosperticker-ra-mat-thi-truong-hieu-suat-thanh-khoan', 'ProsperTicker Ra Mắt Thị Trường Hiệu Suất Thanh Khoản Trên Pharos', '2026-09-17');
const r25 = news('pharos-r25-hop-tac', 'Pharos Hợp Tác Với R25 Mở Rộng RealFi', '2026-10-05');
const flagPairs = (added, existing) => findSameEventFlags(added, existing, ecosystem).map(f => [f.id, f.duplicateOf]);

test('same-event check flags the same project from another source within ±3 days', () => {
  const siloSide = news('silofinance-cong-bo-tich-hop-pharos', 'SiloFinance Công Bố Tích Hợp Với Pharos', '2026-10-02');
  const [flag] = findSameEventFlags([siloSide], [silo], ecosystem);
  assert.deepEqual([flag.id, flag.duplicateOf, flag.date, flag.shared], [siloSide.id, silo.id, '2026-10-03', ['SiloFinance']]);
  const outlet = news('prosper-ra-mat-performance-markets', 'PROSPER Ra Mắt Khung Performance Markets Trên Pharos', '2026-09-17');
  assert.deepEqual(flagPairs([outlet], [prosper]), [[outlet.id, prosper.id]]);
});
test('same-event check flags duplicates within one batch', () => {
  const blog = news('pharos-ra-mat-season-of-ai-agent-arena', 'Pharos Ra Mắt Chương Trình Season of AI Với Agent Arena và 5.000 $PROS', '2026-10-05');
  const tweet = news('pharos-season-of-ai-28-thu-thach', 'Pharos Season of AI Khởi Động Với 28 Thử Thách', '2026-10-05');
  assert.deepEqual(flagPairs([blog, tweet], []), [[tweet.id, blog.id]]);
});
test('same-event check ignores distant dates, Pharos-only overlap and unrelated projects', () => {
  const later = news('prosperticker-ra-mat-genesis-vaults', 'ProsperTicker Ra Mắt Genesis Vaults', '2026-09-27');
  const pharosOnly = news('pharos-mo-quyen-truy-cap-cho-tac-nhan-ai', 'Pharos Mở Quyền Truy Cập Cho Tác Nhân AI Trên RealFi Network', '2026-10-03');
  const avalon = news('avalon-ra-mat-cho-vay-btc', 'Avalon Ra Mắt Cho Vay BTC Trên Pharos', '2026-10-05');
  assert.deepEqual(flagPairs([later, pharosOnly, avalon], [silo, prosper, r25]), []);
  // Generic finance words and unaccented Vietnamese are not subjects.
  const usdc = news('pharos-tich-hop-usdc-cctp', 'Pharos Mainnet Tích Hợp Chính Thức USDC Và CCTP', '2026-10-04');
  const goblin = news('goblin-private-credit-vault', 'Goblin Private Credit Vault Ra Mắt Với 16 Triệu USDC', '2026-10-05');
  assert.deepEqual(flagPairs([goblin], [usdc]), []);
  // An unparseable date is never treated as within the window.
  assert.deepEqual(flagPairs([{ ...silo, id: 'silo-bad-date', date: 'unknown' }], [silo]), []);
});
test('same-event check matches ecosystem projects by name or ID slug', () => {
  const byName = news('pharos-don-avalon', 'Avalon Labs Gia Nhập Hệ Sinh Thái', '2026-10-05');
  const bySlug = news('avalon-labs-mo-vault', 'Mở Vault Mới Cho Người Dùng', '2026-10-06');
  assert.deepEqual(findSameEventFlags([bySlug], [byName], ecosystem).map(f => f.shared), [['Avalon Labs']]);
});

test('exhausted X API failures remain errors', async () => {
  await assert.rejects(requestJson('https://api.x.ai/v1/responses', {}, { sleep: async () => {}, fetcher: async () => { throw new Error('network unavailable'); } }), /network unavailable/);
});

import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, copyFileSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';

test('full updater: missed launches, incomplete searches, dropped conversion, and recovery', () => {
  const root = mkdtempSync(join(tmpdir(), 'pharos-pipeline-'));
  try {
    mkdirSync(join(root, 'scripts')); mkdirSync(join(root, 'public/js'), { recursive: true });
    for (const name of ['update-pharos-content.js', 'content-pipeline.js']) copyFileSync(new URL(name, import.meta.url), join(root, 'scripts', name));
    symlinkSync(new URL('../node_modules', import.meta.url), join(root, 'node_modules'), 'dir');
    writeFileSync(join(root, 'package.json'), '{"type":"module"}');
    const baseline = `window.PharosData = {meta: {version: "1.0.0", lastUpdated: "2026-08-01", sources: [\n]}, news: [\n], ecosystem: [\n], techSpecs: {tps: "30000"}};`;
    writeFileSync(join(root, 'fixture.json'), JSON.stringify(candidates));
    writeFileSync(join(root, 'mock.mjs'), `
import fs from 'node:fs';
const NativeDate = Date;
globalThis.Date = class extends NativeDate { constructor(...args) { super(...(args.length ? args : ['2026-09-13T12:00:00Z'])); } static now() { return NativeDate.parse('2026-09-13T12:00:00Z'); } };
const fixtures = JSON.parse(fs.readFileSync(new URL('./fixture.json', import.meta.url)));
const mode = process.env.SCENARIO;
let emptied = 0;
globalThis.fetch = async (url, options = {}) => {
  if (String(url).includes('api.x.ai')) {
    const request = JSON.parse(options.body);
    if (mode === 'x-failure' && request.tools[0].allowed_x_handles?.[0] === 'pharos_eco') return {ok:false,status:401};
    const found = mode !== 'redirect' && request.tools[0].allowed_x_handles?.[0] === 'pharos_network' ? fixtures : [];
    return { ok:true, json:async () => ({status:'completed', output:[...({'no-search':[], 'other-tool':[{type:'custom_tool_call',name:'web_search',status:'completed'}], 'legacy-search':[{type:'x_search_call',status:'completed'}]}[mode] ?? [{type:'custom_tool_call',name:'x_keyword_search',status:'completed'}]), {type:'message',content:[{type:'output_text',text:JSON.stringify({candidates:found})}]}]}) };
  }
  if (String(url).includes('api.anthropic.com')) {
    const request = JSON.parse(options.body); const prompt = request.messages[0].content;
    const reply = (content, status = 200, stop_reason = 'end_turn') => new Response(JSON.stringify(status === 200
      ? {id:'msg_test',type:'message',role:'assistant',model:request.model,stop_reason,stop_details:stop_reason === 'refusal' ? {type:'refusal',category:'cyber'} : null,usage:{input_tokens:1,output_tokens:1},content}
      : {type:'error',error:{type:'authentication_error',message:'invalid x-api-key'}}), {status, headers:{'content-type':'application/json'}});
    const searched = request.tools ? [{type:'server_tool_use',id:'srvtoolu_test',name:mode === 'fetch-only' ? 'web_fetch' : 'web_search',input:{query:'pharos'}}] : [];
    // A paused tool loop is resumed with one assistant message holding every paused hop;
    // research evidence from an earlier hop still counts.
    if (mode === 'paused' && prompt.startsWith('Collect')) {
      if (request.messages.length > 2) return reply(null, 400);
      const hops = request.messages[1]?.content.length ?? 0;
      if (hops < 2) return reply(hops ? [{type:'text',text:'Still searching'}] : searched, 200, 'pause_turn');
      return reply([{type:'text',text:JSON.stringify({candidates:[]})}]);
    }
    if (mode === 'refusal' && prompt.startsWith('Collect')) return reply([], 200, 'refusal');
    if (mode === 'narration' && prompt.startsWith('Collect')) {
      return reply([{type:'text',text:'Searching {pharos} news'}, ...searched, {type:'web_search_tool_result',tool_use_id:'srvtoolu_test',content:[]}, {type:'text',text:JSON.stringify({candidates:[]})}]);
    }
    if (prompt.startsWith('Collect') && (mode === 'claude-empty' || (mode === 'claude-empty-once' && !emptied++))) return reply(searched);
    let text;
    if (prompt.startsWith('Collect')) text = JSON.stringify({candidates:mode === 'redirect' ? [...fixtures, {...fixtures[0],url:'https://vertexaisearch.cloud.google.com/grounding-api-redirect/broken'}] : []});
    else if (prompt.startsWith('Write Vietnamese')) {
      const items = JSON.parse(prompt.split('Candidates: ')[1].split('\\nPrevious')[0]);
      text = JSON.stringify({decisions: mode === 'drop' ? [] : items.map(c => ({candidateId:c.id,action:'include',item:{id:c.id,title:c.title,summary:c.summary,content:c.summary,link:c.url,date:c.date,category:'Thông Báo',source:'Official announcement'}}))});
    } else if (mode === 'eco-failure') return reply(null, 401);
    else if (mode === 'cap' || mode === 'cap-invalid') {
      text = prompt.startsWith('Convert') ? JSON.stringify({news:[],techSpecs:{},sources:[],ecosystem:Array.from({length:11},(_,i)=>({id:'project-'+i,name:'Project '+i,category:'DeFi',icon:'🌊',description:'Test project',tags:['DeFi'],website:(mode === 'cap-invalid' && i === 10) ? '' : 'https://example.org/'+i,status:'Active'}))}) : 'Eleven ecosystem projects found';
    } else text = 'NO NEW PARTNERS';
    return reply([...searched, {type:'text',text}]);
  }
  if (String(url).includes('grounding-api-redirect/broken')) throw new Error('temporary redirect failure');
  if (mode === 'dead-link' && String(url).includes('kucoin.com')) return {ok:false,status:404,url:String(url)};
  if (mode === 'unreachable-link' && String(url).includes('kucoin.com')) throw new Error('connection reset');
  return {ok:true,status:200,url:String(url)};
};
`);
    const run = mode => spawnSync(process.execPath, ['--import', './mock.mjs', 'scripts/update-pharos-content.js'], { cwd: root, encoding: 'utf8', env: { ...process.env, ANTHROPIC_API_KEY: 'fake-claude-test-secret', XAI_API_KEY: mode === 'missing-key' ? '' : 'fake-x-test-secret', CONTENT_LOOKBACK_DAYS: '28', GITHUB_STEP_SUMMARY: '', SCENARIO: mode } });
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
    for (const mode of ['claude-empty-once', 'claude-empty']) {
      writeFileSync(join(root, 'public/js/data.js'), baseline);
      rmSync(join(root, '.content-state'), { recursive:true, force:true });
      const result = run(mode);
      const recovers = mode === 'claude-empty-once';
      assert.equal(result.status, recovers ? 0 : 1, mode + result.stderr);
      assert.equal(summary().status, recovers ? 'completed_with_updates' : 'incomplete');
      assert.equal(summary().errors.some(e => e.reason === 'Claude returned empty content'), !recovers);
    }
    for (const mode of ['legacy-search', 'paused', 'fetch-only', 'narration']) {
      writeFileSync(join(root, 'public/js/data.js'), baseline);
      rmSync(join(root, '.content-state'), { recursive:true, force:true });
      const result = run(mode);
      assert.equal(result.status, 0, result.stderr);
      assert.equal(summary().status, 'completed_with_updates');
    }
    for (const mode of ['refusal']) {
      writeFileSync(join(root, 'public/js/data.js'), baseline);
      rmSync(join(root, '.content-state'), { recursive:true, force:true });
      assert.equal(run(mode).status, 1);
      assert.equal(summary().status, 'incomplete');
      assert.ok(summary().errors.some(e => e.reason === 'Claude declined the request: cyber'));
    }
    for (const mode of ['missing-key', 'no-search', 'other-tool']) {
      writeFileSync(join(root, 'public/js/data.js'), baseline);
      rmSync(join(root, '.content-state'), { recursive:true, force:true });
      assert.equal(run(mode).status, 1);
      assert.equal(summary().status, 'incomplete');
      assert.equal(state().lastCompletedDate, undefined);
      assert.equal(readFileSync(join(root, 'has-changes.txt'), 'utf8').trim(), 'false');
    }
    for (const mode of ['redirect', 'cap', 'cap-invalid', 'invalid-pending', 'invalid-news']) {
      writeFileSync(join(root, 'public/js/data.js'), mode === 'invalid-news' ? baseline.replace('news: [\n]', 'news: [\n{ id: "bad-news", link: "broken" }]') : baseline);
      rmSync(join(root, '.content-state'), { recursive:true, force:true });
      const invalid = {id:'bad-retained',url:'broken',title:'Keep this record'};
      if (mode === 'invalid-pending') {
        mkdirSync(join(root, '.content-state'));
        writeFileSync(join(root, '.content-state/state.json'), JSON.stringify({pending:[invalid]}));
      }
      const result = run(mode);
      const passes = mode === 'cap' || mode === 'cap-invalid';
      assert.equal(result.status, passes ? 0 : 1, mode + result.stderr);
      assert.equal(Boolean(state().lastCompletedDate), passes, mode);
      if (mode === 'invalid-pending') {
        assert.deepEqual(state().pending[0], invalid);
        assert.equal(state().pending.length, 4);
      } else assert.equal(state().pending.length, 3, mode);
      if (mode === 'redirect') assert.equal(summary().accepted.news, 3);
      if (mode === 'cap') assert.equal(summary().accepted.ecosystem, 10);
      if (mode === 'cap-invalid') {
        assert.ok(summary().decisions.some(d => d.candidate === 'project-10' && d.action === 'reject'));
        assert.equal(summary().accepted.ecosystem, 10);
      }
    }
    for (const mode of ['dead-link', 'unreachable-link']) {
      writeFileSync(join(root, 'public/js/data.js'), baseline);
      rmSync(join(root, '.content-state'), { recursive:true, force:true });
      const result = run(mode);
      const dead = mode === 'dead-link';
      // A 404 source is excluded and dropped from pending; a network failure stays fatal and is retried.
      assert.equal(result.status, dead ? 0 : 1, mode + result.stderr);
      assert.equal(summary().status, dead ? 'completed_with_updates' : 'incomplete');
      assert.equal(summary().accepted.news, 2, mode);
      assert.equal(state().pending.length, dead ? 2 : 3, mode);
      assert.equal(summary().decisions.some(d => d.action === 'exclude' && d.reason === 'dead_link' && d.candidateId === candidates[1].id), dead);
    }
    // A same-event match is surfaced for review, not dropped and not fatal.
    writeFileSync(join(root, 'public/js/data.js'), baseline.replace('news: [\n]', 'news: [\n{ id: "r25-ra-mat-prnh", title: "R25 Ra Mắt pRNH Vault", date: "2026-08-23", link: "https://example.org/prnh" }]'));
    rmSync(join(root, '.content-state'), { recursive:true, force:true });
    const flagged = run('success');
    assert.equal(flagged.status, 0, flagged.stderr);
    assert.equal(summary().accepted.news, 3);
    assert.ok(summary().decisions.some(d => d.action === 'flag' && d.newsId === candidates[1].id && d.duplicateOf === 'r25-ra-mat-prnh'));
    assert.match(readFileSync(join(root, 'pr-body.md'), 'utf8'), new RegExp(`Có thể trùng lặp[^]*\`${candidates[1].id}\` ↔ \`r25-ra-mat-prnh\` \\(2026-08-23, pRNH\\)`));
    assert.match(readFileSync(join(root, 'content-artifacts/summary.md'), 'utf8'), /Có thể trùng lặp/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

import { recoverState } from './restore-content-state.js';

test('artifact recovery searches later pages and skips missing, malformed or invalid state', () => {
  const entry = (id, branch = 'main') => ({ id, name: 'content-research-' + id, created_at: `2026-09-${String(id).padStart(2, '0')}T00:00:00Z`, workflow_run: {head_branch:branch,id} });
  const pages = [{artifacts:[entry(9,'other'),entry(8),entry(7),entry(6)]},{artifacts:[entry(5),entry(4)]}];
  const attempted = [];
  const raw = recoverState(pages, 'main', '8', id => {
    attempted.push(id);
    if (id === 7) throw new Error('missing state file');
    if (id === 6) return '{invalid JSON';
    if (id === 5) return '{}';
    return '{"pending":[]}';
  }, () => {});
  assert.deepEqual(attempted, [7,6,5,4]);
  assert.deepEqual(JSON.parse(raw), {pending:[]});
  assert.equal(recoverState(pages, 'main', '8', () => {throw new Error('unavailable');}, () => {}), null);
});
test('research meta-commentary in published copy is detected', () => {
  const cases = {
    'search-snippet': 'Prosper ra mắt khung Performance Markets, dựa trên đoạn trích bài đăng.',
    'no-full-text': 'Chi tiết sẽ được cập nhật vì chưa có toàn văn thông báo.',
    'trailing-caveat': 'Prosper ra mắt Performance Markets trên Pharos. Lưu ý: thông tin dựa trên nguồn hạn chế.',
    'source-gap': 'ProsperTicker gia nhập hệ sinh thái Pharos. Nguồn tin không cung cấp thêm chi tiết về phạm vi hợp tác.',
    'search-results': 'Theo kết quả tìm kiếm, dự án đã ra mắt mainnet.',
  };
  for (const [name, text] of Object.entries(cases)) assert.equal(findMetaCommentary(text), name, text);
  assert.equal(findMetaCommentary('Prosper ra mắt khung Performance Markets. Lưu ý: thông tin dựa trên đoạn trích tìm kiếm, chưa có toàn văn bài viết.') !== null, true);
  assert.equal(findMetaCommentary('Prosper ra mắt Performance Markets. Lưu ý: bài viết gốc chỉ nêu tên đối tác.'), 'trailing-caveat');
});
test('legitimate copy using "Lưu ý", "không cung cấp thêm" or "Snippet" is not rejected', () => {
  for (const text of [
    'Người dùng cần lưu ý: hạn chót đăng ký là ngày 30/10, sau đó cổng sẽ đóng.',
    'Pharos khuyến nghị người dùng Lưu ý bảo mật ví khi tham gia testnet.',
    'Mainnet Pharos chính thức ra mắt với hơn 50 đối tác.',
    'Pharos mở đăng ký airdrop. Lưu ý: hạn chót là 30/10.',
    'Pharos không cung cấp thêm phần thưởng cho ví bot.',
    'Dự án Snippet gia nhập Pharos.',
  ]) assert.equal(findMetaCommentary(text), null, text);
});

test('drops candidates a reviewer deleted from a merged batch, keeps unmerged and untagged ones', () => {
  const url = n => `https://x.com/a/status/${n}`;
  const pending = [
    { id: 'landed', url: url(1), proposedIn: 'w1' },
    { id: 'deleted', url: url(2), proposedIn: 'w1' },
    { id: 'unmerged', url: url(3), proposedIn: 'w2' },
    { id: 'untagged', url: url(4) },
  ];
  const { kept, removed } = splitReviewedOut(pending, new Set([url(1)]));
  assert.deepEqual(removed.map(c => c.id), ['deleted']);
  assert.deepEqual(kept.map(c => c.id), ['unmerged', 'untagged']);
  // A manual version bump on main proves nothing: with nothing landed, keep the batch.
  assert.deepEqual(splitReviewedOut(pending, new Set()).removed, []);
});
